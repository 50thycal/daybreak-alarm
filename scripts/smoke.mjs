// Browser smoke test for a running Daybreak site (production, preview, or local).
//   npm i --no-save playwright && npx playwright install chromium
//   BASE_URL=https://daybreak-alarm.vercel.app/ npm run smoke
// Uses throwaway browser profiles; never touches your own browser data.
import {createRequire} from 'node:module';
import {writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(join(process.cwd(),'package.json'));
let chromium;try{({chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'));}catch{console.error('Playwright is not installed. Run: npm i --no-save playwright && npx playwright install chromium');process.exit(2);}
const QRCode=require('qrcode');
const BASE=new URL(process.env.BASE_URL||'https://daybreak-alarm.vercel.app/').href;
const local=['localhost','127.0.0.1'].includes(new URL(BASE).hostname),secure=BASE.startsWith('https:');
const out=mkdtempSync(join(tmpdir(),'daybreak-smoke-'));
const results=[];const check=(name,ok,detail='')=>{results.push({name,ok:!!ok,detail});console.log((ok?'PASS':'FAIL')+'  '+name+(detail?'  — '+detail:''));};
const init=()=>{window.__audios=[];window.__csp=[];const orig=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__audios.push(this);return orig.call(this);};document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI));};
const audioState=p=>p.evaluate(()=>window.__audios.map(a=>({paused:a.paused,t:a.currentTime,src:a.currentSrc,err:a.error?.code??null})));
const playing=s=>s.some(a=>!a.paused&&a.t>0&&/\.wav$/.test(a.src));
const wire=(page,errors)=>{page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});};
const store=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('daybreak.v1')));
const h1=p=>p.locator('main h1').first().innerText();

// ---------- Phase 1: desktop UI, sound preview, settings, practice math mission, insights ----------
const args=local?['--ignore-certificate-errors']:[];
let browser=await chromium.launch({args});
let ctx=await browser.newContext({ignoreHTTPSErrors:local,viewport:{width:1280,height:900}});
await ctx.addInitScript(init);
let page=await ctx.newPage();const errors=[];wire(page,errors);
const wavResponses=[];page.on('response',r=>{if(r.url().endsWith('.wav'))wavResponses.push(r.status());});
await page.goto(BASE);await page.waitForSelector('#arm-button');
check('Tonight renders',(await h1(page)).includes('Make room for morning'),await h1(page));
check('Sleep dial rendered',await page.locator('#dial-host svg').count()===1);
for(const tab of ['routine','insights','tonight']){await page.click(`.bottom-nav a[data-tab="${tab}"]`);await page.waitForTimeout(150);check(`Tab ${tab} renders`,(await page.locator('main h1').count())>0,await h1(page));}
// Sleep dial: drag the arc to move both times together; a handle still moves one time
const toMin=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;},span=c=>(toMin(c.wakeTime)-toMin(c.bedtime)+1440)%1440;
const dialPoint=async minute=>{const r=await page.locator('.dial').boundingBox(),a=minute/1440*2*Math.PI-Math.PI/2,k=r.width/340;return [r.x+r.width/2+126*k*Math.cos(a),r.y+r.height/2+126*k*Math.sin(a)];};
const dragAlong=async(from,to)=>{const steps=24;await page.mouse.move(...await dialPoint(from));await page.mouse.down();for(let i=1;i<=steps;i++)await page.mouse.move(...await dialPoint(from+(to-from)*i/steps));await page.mouse.up();await page.waitForTimeout(150);};
let before=(await store(page)).config;const mid=toMin(before.bedtime)+span(before)/2;
await dragAlong(mid,mid-300);let after=(await store(page)).config;
check('Dragging the arc across midnight moves both times together',(toMin(after.bedtime)-toMin(before.bedtime)+1440)%1440===1140&&(toMin(after.wakeTime)-toMin(before.wakeTime)+1440)%1440===1140&&span(after)===span(before),`${before.bedtime}–${before.wakeTime} → ${after.bedtime}–${after.wakeTime}`);
check('Time inputs follow the arc drag',(await page.inputValue('#bedtime'))===after.bedtime&&(await page.inputValue('#wake-time'))===after.wakeTime);
before=after;await dragAlong(toMin(before.bedtime)+span(before)/2,toMin(before.bedtime)+span(before)/2+120);after=(await store(page)).config;
check('Dragging the arc forward shifts the window later',(toMin(after.bedtime)-toMin(before.bedtime)+1440)%1440===120&&span(after)===span(before),`${before.bedtime}–${before.wakeTime} → ${after.bedtime}–${after.wakeTime}`);
before=after;await dragAlong(toMin(before.wakeTime),toMin(before.wakeTime)+60);after=(await store(page)).config;
check('Wake handle still changes only wake time',after.bedtime===before.bedtime&&span(after)===span(before)+60,`${before.wakeTime} → ${after.wakeTime}`);
await page.click('#about-button');check('About dialog opens',await page.locator('#modal[open]').count()===1);await page.click('.dialog-close');

// Sound preview (real user gesture, default autoplay policy)
await page.click('.bottom-nav a[data-tab="routine"]');await page.waitForSelector('[data-preview="piano"]');
await page.click('[data-preview="piano"]');await page.waitForTimeout(1500);
let st=await audioState(page);
check('Piano preview plays (currentTime advancing)',playing(st),JSON.stringify(st.at(-1)));
check('Preview toast shown',(await page.locator('#toast').innerText()).includes('8-second preview'));
check('Preview WAV fetched 200/206',wavResponses.length>0&&wavResponses.every(s=>s===200||s===206),JSON.stringify(wavResponses));
for(const s of ['birds','ocean','ambient','voice']){await page.click(`[data-preview="${s}"]`);await page.waitForTimeout(700);const a=(await audioState(page)).at(-1);check(`Preview ${s} plays`,!a.paused&&a.t>0&&a.src.endsWith(s+'.wav'),a.src.split('/').pop());}
await page.waitForTimeout(8500);st=await audioState(page);check('Preview auto-stops after 8 s',!playing(st));

// Independent feature settings
await page.click('[data-builtin="game"]');await page.waitForTimeout(150);
await page.selectOption('#setting-gameType','math');
await page.locator('#setting-gameSeconds').fill('10');await page.locator('#setting-gameSeconds').dispatchEvent('change');
await page.locator('input[data-config="difficulty"]').fill('3');await page.locator('input[data-config="difficulty"]').dispatchEvent('change');
if(await page.locator('input.switch[data-config="checkin"]').isChecked())await page.locator('input.switch[data-config="checkin"]').click();
if(!await page.locator('input.switch[data-config="followups"]').isChecked())await page.locator('input.switch[data-config="followups"]').click();
await page.reload();await page.waitForSelector('#setting-gameType');
let c=(await store(page)).config;
check('Settings persist across reload',c.gameType==='math'&&c.gameSeconds===10&&c.checkin===false,`gameType=${c.gameType} gameSeconds=${c.gameSeconds} checkin=${c.checkin}`);
check('Disabling check-in leaves game + follow-ups on',c.game===true&&c.followups===true&&c.checkin===false);
check('Toggle UI reflects stored state',(await page.locator('input.switch[data-config="checkin"]').isChecked())===false&&(await page.locator('input.switch[data-config="game"]').isChecked())===true);
// Custom preset save
await page.click('#save-preset');await page.fill('#preset-name','E2E math');await page.click('#confirm-preset');await page.waitForTimeout(200);
check('Custom preset saved',(await store(page)).presets.some(p=>p.config.name==='E2E math'));

// Practice session: ringing -> quiet -> math mission -> complete
await page.click('#practice-button');await page.waitForSelector('#quiet-button');await page.waitForTimeout(1200);
st=await audioState(page);check('Practice ringing: alarm audio playing',playing(st),JSON.stringify(st.at(-1)));
check('Practice labelled as excluded from trends',(await page.locator('.eyebrow').innerText()).includes('PRACTICE'));
await page.click('#quiet-button');await page.waitForSelector('#math-expression');await page.waitForTimeout(300);
st=await audioState(page);check('Quiet stops audio immediately',!playing(st));
check('Mission countdown visible',/\d+:\d\d/.test(await page.locator('#countdown').innerText()));
// wrong answer first
await page.fill('#math-answer','999');await page.click('#math-form button');
check('Wrong answer gives retry hint',(await page.locator('#game-hint').innerText()).includes('Not quite'));
let answered=0;const t0=Date.now();
while(Date.now()-t0<40000){
  if((await h1(page)).includes('made room for morning'))break;
  const expr=page.locator('#math-expression');if(!(await expr.count())){await page.waitForTimeout(200);continue;}
  const m=(await expr.innerText()).match(/(\d+) \+ (\d+)/);if(!m){await page.waitForTimeout(100);continue;}
  if(answered===2)await page.waitForTimeout(Math.max(0,10500-(Date.now()-t0))); // satisfy 10 s engagement on the last answer
  await page.fill('#math-answer',String(+m[1]+ +m[2]));await page.click('#math-form button');answered++;await page.waitForTimeout(150);
}
check('Math mission completes routine',(await h1(page)).includes('made room for morning'),`${answered} answers, ${Math.round((Date.now()-t0)/1000)} s`);
let rec=(await store(page)).records[0];
check('Practice record stored as complete/practice',rec?.mode==='practice'&&rec?.state==='complete',`${rec?.mode}/${rec?.state}`);
await page.goto(BASE+'#insights');await page.waitForSelector('.summary-strip');
const nums=await page.locator('.stat .number').allInnerTexts();
check('Insights: 0 real mornings, practice excluded',nums[0]==='0'&&nums[2]==='0',JSON.stringify(nums));
check('Journal lists the practice entry',(await page.locator('.record .tag.practice').count())===1);

// Export JSON / CSV
for(const id of ['export-json','export-csv']){const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#'+id)]);check(`${id} downloads`,!!(await dl.path()),dl.suggestedFilename());}

// PWA: service worker + offline reload
await page.goto(BASE);await page.waitForSelector('#arm-button');
const sw=!secure?'skipped (service worker needs https)':await page.evaluate(async()=>{try{const r=await Promise.race([navigator.serviceWorker.ready,new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),8000))]);return r.active?.state||'none';}catch(e){return 'error: '+e.message;}});
check('Service worker active',sw==='activated'||!secure,sw);
if(sw==='activated'){await page.waitForTimeout(1500);await ctx.setOffline(true);await page.reload();await page.waitForSelector('#arm-button',{timeout:8000}).catch(()=>{});check('Offline reload renders UI',(await page.locator('#arm-button').count())===1);await ctx.setOffline(false);}
const csp=await page.evaluate(()=>window.__csp);
check('No CSP violations',csp.length===0,csp.join('; '));
check('No page/console errors',errors.length===0,errors.join(' | '));
const token=c.qrToken;const storageState=await ctx.storageState();
await browser.close();

// ---------- Phase 2: mobile layout ----------
browser=await chromium.launch({args});
ctx=await browser.newContext({ignoreHTTPSErrors:local,viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
page=await ctx.newPage();
for(const tab of ['tonight','routine','insights']){await page.goto(BASE+'#'+tab);await page.waitForTimeout(400);const w=await page.evaluate(()=>document.documentElement.scrollWidth);check(`Mobile ${tab}: no horizontal overflow`,w<=390,`scrollWidth=${w}`);await page.screenshot({path:`${out}/mobile-${tab}.png`,fullPage:false});}
await browser.close();

// ---------- Phase 3: out-of-bed QR mission via fake camera ----------
const qr=QRCode.create('daybreak:'+token,{errorCorrectionLevel:'M'});const n=qr.modules.size,W=640,H=480,scale=Math.floor(380/(n+8)),off=[(W-(n+8)*scale)/2|0,(H-(n+8)*scale)/2|0];
const Y=Buffer.alloc(W*H,235);for(let r=0;r<n;r++)for(let col=0;col<n;col++)if(qr.modules.get(r,col))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)Y[(off[1]+(r+4)*scale+dy)*W+off[0]+(col+4)*scale+dx]=16;
const UV=Buffer.alloc(W*H/4,128);const frames=[];for(let i=0;i<30;i++)frames.push(Buffer.from('FRAME\n'),Y,UV,UV);
writeFileSync(`${out}/qr.y4m`,Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\n`),...frames]));
browser=await chromium.launch({args:[...args,'--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-video-capture=${out}/qr.y4m`]});
ctx=await browser.newContext({ignoreHTTPSErrors:local,viewport:{width:1280,height:900},storageState,permissions:['camera']});
await ctx.addInitScript(init);page=await ctx.newPage();const errors3=[];wire(page,errors3);
await page.goto(BASE+'#routine');await page.waitForSelector('[data-builtin="qr"]');await page.click('[data-builtin="qr"]');await page.waitForTimeout(200);
if(await page.locator('input.switch[data-config="checkin"]').isChecked())await page.locator('input.switch[data-config="checkin"]').click();
c=(await store(page)).config;check('Out-of-bed preset: QR on, game off, token kept',c.qr&&!c.game&&c.qrToken===token);
await page.click('#show-qr');await page.waitForSelector('#modal[open] img');
check('QR code image generated',(await page.locator('#modal img').first().getAttribute('src')).startsWith('data:image/png'));
await page.click('.dialog-close');
await page.click('#practice-button');await page.waitForSelector('#quiet-button');await page.click('#quiet-button');
await page.waitForSelector('#scan-qr');await page.click('#scan-qr');
await page.waitForFunction(()=>document.querySelector('main h1')?.innerText.includes('made room for morning'),null,{timeout:15000}).catch(()=>{});
check('Camera scan of saved QR completes mission',(await h1(page)).includes('made room for morning'),await h1(page));
check('Phase 3: no page/console errors',errors3.length===0,errors3.join(' | '));
await browser.close();

writeFileSync(`${out}/results.json`,JSON.stringify(results,null,1));console.log(`Screenshots and results: ${out}`);
const failed=results.filter(r=>!r.ok);console.log(`\n${results.length-failed.length}/${results.length} checks passed`);process.exit(failed.length?1:0);
