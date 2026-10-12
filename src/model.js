export const defaults = Object.freeze({
  name: 'A gentler morning', bedtime: '23:00', wakeTime: '07:00', days: [0,1,2,3,4,5,6],
  sound: 'piano', ramp: true, rampSeconds: 45, volume: 65,
  quietSeconds: 90, game: true, gameType: 'memory', difficulty: 3, gameSeconds: 30,
  qr: false, qrLabel: 'Bathroom mirror', qrToken: '',
  followups: true, followupSeconds: 120, repeatLimit: 3,
  checkin: true, checkinSeconds: 180, checkinQr: false,
  snooze: false, snoozeSeconds: 300, snoozeLimit: 1,
  feedback: true, sleepContext: true,
});
const ranges = {rampSeconds:[10,180],volume:[10,100],quietSeconds:[15,300],difficulty:[2,5],gameSeconds:[10,90],followupSeconds:[30,600],repeatLimit:[1,5],checkinSeconds:[30,900],snoozeSeconds:[60,900],snoozeLimit:[1,3]};
export function normalize(input = {}) {
  const value = {...structuredClone(defaults), ...input};
  for (const [key,[min,max]] of Object.entries(ranges)) value[key] = Math.max(min, Math.min(max, Math.round(Number(value[key]) || defaults[key])));
  value.gameSeconds=Math.min(value.gameSeconds,value.quietSeconds-5);
  for (const key of ['ramp','game','qr','followups','checkin','checkinQr','snooze','feedback','sleepContext']) value[key] = typeof value[key] === 'boolean' ? value[key] : defaults[key];
  for (const key of ['bedtime','wakeTime']) if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value[key])) value[key] = defaults[key];
  value.days = Array.isArray(value.days) ? [...new Set(value.days.filter(d=>Number.isInteger(d)&&d>=0&&d<=6))] : [...defaults.days];
  value.name = String(value.name || defaults.name).slice(0,60);
  value.qrLabel = String(value.qrLabel || defaults.qrLabel).slice(0,60);
  value.qrToken = /^[a-zA-Z0-9-]{8,80}$/.test(value.qrToken) ? value.qrToken : '';
  if (!['piano','birds','ocean','ambient','voice'].includes(value.sound)) value.sound='piano';
  if (!['memory','math','path'].includes(value.gameType)) value.gameType='memory';
  return value;
}
export function nextWake(config, now = new Date()) {
  const [h,m]=config.wakeTime.split(':').map(Number);
  for(let i=0;i<8;i++) {
    const date=new Date(now); date.setDate(date.getDate()+i); date.setHours(h,m,0,0);
    if(date>now && config.days.includes(date.getDay())) return date;
  }
  return null;
}
export function sleepMinutes(config) {
  const minutes=t=>t.split(':').reduce((h,m)=>Number(h)*60+Number(m));
  return (minutes(config.wakeTime)-minutes(config.bedtime)+1440)%1440;
}
export function shiftWindow(config, deltaMinutes) {
  const shift=t=>{const [h,m]=t.split(':').map(Number),total=((h*60+m+Math.round(deltaMinutes))%1440+1440)%1440;return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;};
  return {...config, bedtime:shift(config.bedtime), wakeTime:shift(config.wakeTime)};
}
export function routineKey(config) {
  const {name,bedtime,wakeTime,days,qrLabel,qrToken,feedback,sleepContext,...treatment}=normalize(config);
  return JSON.stringify(treatment);
}
export function createSession(config, at=Date.now(), mode='practice') {
  return {id:globalThis.crypto.randomUUID(), config:normalize(config), mode,
    scheduledAt:at, startedAt:at, state:'ringing', deadline:null, snoozes:0, followups:0,
    missions:[], events:[{type:'ring',at}], feedback:null};
}
// Pure transition functions keep the web and native lifecycle reviewable and testable.
export function transition(session, action, at=Date.now()) {
  const s=structuredClone(session), c=s.config;
  const event=type=>s.events.push({type,at});
  const finish=()=>{s.state='complete';s.deadline=null;s.completedAt=at;event('complete');};
  const mission=()=>{
    s.missions=[...(c.game?['game']:[]),...(c.qr?['qr']:[])];
    s.gameStartedAt=at;
    s.state=s.missions.length?'mission':'quiet'; s.deadline=at+c.quietSeconds*1000;
    if(!s.missions.length) afterMissions();
  };
  const afterMissions=()=>{
    if(c.checkin){s.state='waiting-checkin';s.deadline=at+c.checkinSeconds*1000;event('checkin-scheduled');}
    else finish();
  };
  if(['complete','skipped','expired'].includes(s.state)) return s;
  if(action==='skip'){s.state='skipped';s.deadline=null;s.completedAt=at;event('skip');return s;}
  if(action==='quiet' && s.state==='ringing'){event('quiet');mission();}
  else if(action==='mission' && s.state==='mission'){
    if(s.missions[0]==='game' && at-s.gameStartedAt<c.gameSeconds*1000){event('game-round-complete');return s;}
    event(s.missions.shift()+'-complete');if(!s.missions.length)afterMissions();
  }
  else if(action==='snooze' && s.state==='ringing' && c.snooze && s.snoozes<c.snoozeLimit){
    s.snoozes++;s.state='snoozed';s.deadline=at+c.snoozeSeconds*1000;event('snooze');
  }
  else if(action==='checkin' && s.state==='checkin'){event('checkin-confirmed');finish();}
  else if(action==='tick' && s.deadline!==null && at>=s.deadline){
    if(s.state==='waiting-checkin'){s.state='checkin';s.deadline=at+c.quietSeconds*1000;event('checkin-due');}
    else if(s.state==='snoozed'){s.state='ringing';s.deadline=null;event('ring');}
    else if(['mission','checkin','quiet'].includes(s.state)){
      event('window-missed');
      if(c.followups && s.followups<c.repeatLimit){s.state='waiting-followup';s.deadline=at+c.followupSeconds*1000;}
      else {s.state='expired';s.deadline=null;s.completedAt=at;event('expired');}
    }
    else if(s.state==='waiting-followup'){s.followups++;s.state='ringing';s.deadline=null;event('followup');}
  }
  return s;
}
export const countsTowardTrends = record => record.mode!=='practice' && !record.test;
export function compareRoutines(records) {
  const groups=new Map();
  for(const r of records.filter(countsTowardTrends)) {
    const key=routineKey(r.config);if(!groups.has(key))groups.set(key,{name:r.config.name,sound:r.config.sound,total:0,reported:0,stayed:0,elapsed:[],pleasant:[]});
    const g=groups.get(key);g.total++;
    if(typeof r.feedback?.stayedUp==='boolean'){g.reported++;if(r.feedback.stayedUp)g.stayed++;}
    if(r.state==='complete')g.elapsed.push((r.completedAt-r.startedAt)/1000);
    if(r.feedback?.pleasant)g.pleasant.push(r.feedback.pleasant);
  }
  return [...groups.values()].map(g=>({...g,meanSeconds:g.elapsed.length?Math.round(g.elapsed.reduce((a,b)=>a+b,0)/g.elapsed.length):null}));
}
