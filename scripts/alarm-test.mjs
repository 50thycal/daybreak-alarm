// End-to-end test of the 15-second test alarm in a real browser, with real timers and audio.
//   npm i --no-save playwright && npx playwright install chromium
//   BASE_URL=https://daybreak-alarm.vercel.app/ npm run test:alarm
//   HEADED=1 npm run test:alarm      # watch and hear it in a visible window
// Each scenario uses a fresh throwaway profile; it never touches your own browser data.
import {createRequire} from 'node:module';
import {join} from 'node:path';
const require=createRequire(join(process.cwd(),'package.json'));
let chromium;try{({chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'));}catch{console.error('Playwright is not installed. Run: npm i --no-save playwright && npx playwright install chromium');process.exit(2);}
const BASE=new URL(process.env.BASE_URL||'https://daybreak-alarm.vercel.app/').href;
const local=['localhost','127.0.0.1'].includes(new URL(BASE).hostname),headed=process.env.HEADED==='1';
const results=[];const check=(name,ok,detail='')=>{results.push({name,ok:!!ok});console.log((ok?'PASS':'FAIL')+'  '+name+(detail?'  — '+detail:''));};
const store=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('daybreak.v1')));
const audio=p=>p.evaluate(()=>(window.__audios||[]).map(a=>({paused:a.paused,t:a.currentTime,src:a.currentSrc.split('/').pop()})));
const playing=list=>list.some(a=>!a.paused&&a.t>0&&a.src.endsWith('.wav'));

async function scenario(name,setup,finish){
  console.log(`\n— ${name}`);
  const browser=await chromium.launch({headless:!headed,args:local?['--ignore-certificate-errors']:[]});
  const ctx=await browser.newContext({ignoreHTTPSErrors:local,viewport:{width:430,height:900}});
  await ctx.addInitScript(()=>{window.__audios=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__audios.push(this);return play.call(this);};});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
    await page.goto(BASE+'#routine');await page.waitForSelector('[data-builtin="simple"]');await setup(page);
    await page.goto(BASE+'#tonight');await page.waitForSelector('#test-alarm');
    const clicked=Date.now();await page.click('#test-alarm');
    await page.waitForSelector('#armed-countdown');const armed=(await store(page)).armed;
    check('Armed as a test about 15 s out',armed?.test===true&&Math.abs(armed.at-clicked-15000)<1500,`${((armed.at-clicked)/1000).toFixed(1)} s`);
    await page.waitForTimeout(1500);check('Countdown is visible and ticking',/^0:1[0-4]$/.test(await page.innerText('#armed-countdown')),await page.innerText('#armed-countdown'));
    await page.waitForTimeout(Math.max(0,armed.at-Date.now()-2000));
    check('Silent and not ringing 2 s before',!(await store(page)).active&&!playing(await audio(page)));
    await page.waitForSelector('#quiet-button',{timeout:8000});const rang=Date.now();
    check('Rang on schedule',rang>=armed.at-100&&rang-armed.at<1500,`${((rang-clicked)/1000).toFixed(1)} s after tapping test, ${rang-armed.at} ms after target`);
    await page.waitForTimeout(1200);const sound=(await audio(page)).at(-1);
    check('Alarm sound is playing',playing(await audio(page)),sound?`${sound.src}, ${sound.t.toFixed(1)} s in`:'no audio element');
    check('Labelled as a test alarm',(await page.innerText('.eyebrow')).includes('TEST ALARM'));
    if(headed)await page.waitForTimeout(5000);
    await page.click('#quiet-button');await page.waitForTimeout(300);
    check('Quiet silences the sound immediately',!playing(await audio(page)));
    await finish(page);
    await page.waitForFunction(()=>document.querySelector('main h1')?.innerText.includes('made room for morning'),null,{timeout:30000}).catch(()=>{});
    const record=(await store(page)).records[0];
    check('Routine completes and is saved as a test',record?.state==='complete'&&record?.test===true,`${record?.mode}/${record?.state}`);
    await page.goto(BASE+'#insights');await page.waitForSelector('.summary-strip');
    check('Kept out of real-morning trends',(await page.locator('.stat .number').first().innerText())==='0'&&(await page.locator('.record .tag').first().innerText())==='Test');
    check('No page errors',errors.length===0,errors.join(' | '));
  }catch(e){check(`${name} ran to the end`,false,e.message.split('\n')[0]);}
  finally{await browser.close();}
}

await scenario('Simple alarm: ring, then Quiet dismisses',async p=>{await p.click('[data-builtin="simple"]');},async()=>{});
await scenario('Gentle + game: ring, Quiet, math mission, complete',async p=>{
  await p.click('[data-builtin="game"]');await p.selectOption('#setting-gameType','math');
  await p.locator('#setting-gameSeconds').fill('10');await p.locator('#setting-gameSeconds').dispatchEvent('change');
  if(await p.locator('input.switch[data-config="checkin"]').isChecked())await p.locator('input.switch[data-config="checkin"]').click();
},async p=>{
  const started=Date.now();let answered=0;
  while(Date.now()-started<30000&&!(await p.innerText('main h1')).includes('made room for morning')){
    const expr=p.locator('#math-expression');const m=(await expr.count())?(await expr.innerText()).match(/(\d+) \+ (\d+)/):null;
    if(!m){await p.waitForTimeout(200);continue;}
    if(answered===2)await p.waitForTimeout(Math.max(0,10500-(Date.now()-started)));
    await p.fill('#math-answer',String(+m[1]+ +m[2]));await p.click('#math-form button');answered++;await p.waitForTimeout(150);
  }
  check('Math mission solved',answered>=3,`${answered} answers`);
});

const failed=results.filter(r=>!r.ok).length;console.log(`\n${results.length-failed}/${results.length} checks passed`);process.exit(failed?1:0);
