import { normalize } from './model.js';
const KEY='daybreak.v1';
const timestamp=value=>Number.isFinite(value)&&value>=0&&value<8640000000000000;
function records(input){
  if(input.length>10000)throw new Error('This export contains too many records.');
  return input.map(r=>{
    if(!r || typeof r.id!=='string' || r.id.length>100 || !timestamp(r.startedAt) || !timestamp(r.scheduledAt) || !Array.isArray(r.events) || r.events.length>20000 || !r.config || !['practice','browser','native'].includes(r.mode) || !['complete','skipped','expired'].includes(r.state))throw new Error('This export contains an invalid morning record.');
    if(r.completedAt!=null&&!timestamp(r.completedAt))throw new Error('This export contains an invalid completion timestamp.');
    for(const e of r.events)if(!e||typeof e.type!=='string'||!timestamp(e.at))throw new Error('This export contains an invalid event.');
    const f=r.feedback;
    return {...r,test:r.test===true||undefined,config:normalize(r.config),followups:Math.max(0,Math.min(5,Number(r.followups)||0)),snoozes:Math.max(0,Math.min(3,Number(r.snoozes)||0)),feedback:f?{at:timestamp(f.at)?f.at:Date.now(),stayedUp:typeof f.stayedUp==='boolean'?f.stayedUp:null,alertness:[1,2,3,4,5].includes(f.alertness)?f.alertness:null,pleasant:[1,2,3,4,5].includes(f.pleasant)?f.pleasant:null,bedtime:typeof f.bedtime==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(f.bedtime)?f.bedtime:null,interruptions:Number.isInteger(f.interruptions)&&f.interruptions>=0&&f.interruptions<=30?f.interruptions:null}:null};
  });
}
export const emptyStore=()=>({version:1,config:normalize(),presets:[],records:[],armed:null,active:null});
export function loadStore(storage=localStorage) {
  const raw=storage.getItem(KEY); if(!raw)return emptyStore();
  const data=JSON.parse(raw);
  if(data.version!==1 || !Array.isArray(data.records) || !Array.isArray(data.presets))throw new Error('Unrecognized saved data. Export or reset your browser storage before continuing.');
  return {...emptyStore(),...data,config:normalize(data.config)};
}
export function saveStore(data,storage=localStorage) { storage.setItem(KEY,JSON.stringify(data)); }
export function importStore(raw) {
  const parsed=JSON.parse(raw);
  if(parsed.version!==1||!Array.isArray(parsed.records)||!Array.isArray(parsed.presets)||parsed.records.length>10000)throw new Error('Choose a Daybreak JSON export.');
  return {...emptyStore(),config:normalize(parsed.config),presets:parsed.presets.slice(0,50).map(p=>({id:crypto.randomUUID(),config:normalize(p.config)})),records:records(parsed.records)};
}
