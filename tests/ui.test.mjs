import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {JSDOM,VirtualConsole} from 'jsdom';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

async function setup(saved=null,native=false){
  const html=await readFile('dist/index.html','utf8'),bundle=await readFile('dist/app.js','utf8');
  const failures=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>failures.push(e.message));
  const dom=new JSDOM(html,{url:'https://daybreak.test',runScripts:'outside-only',virtualConsole:vc});
  const w=dom.window;w.structuredClone=structuredClone;
  Object.defineProperty(w.crypto,'randomUUID',{value:()=>webcrypto.randomUUID()});
  w.Audio=class{constructor(){this.volume=1;}play(){return Promise.resolve();}pause(){}};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  const interval=[];w.setInterval=fn=>{interval.push(fn);return interval.length;};w.clearInterval=()=>{};
  w.setTimeout=()=>1;w.clearTimeout=()=>{};
  if(saved)w.localStorage.setItem('daybreak.v1',JSON.stringify(saved));
  const messages=[];
  if(native)w.webkit={messageHandlers:{daybreak:{postMessage(body){messages.push(body);queueMicrotask(()=>w.daybreakNativeReply(body.id,{native:true},null));}}}};
  w.eval(bundle);
  const nav=tab=>{w.location.hash=tab;w.dispatchEvent(new w.HashChangeEvent('hashchange'));};
  const click=selector=>{const el=w.document.querySelector(selector);assert.ok(el,selector);el.click();};
  const data=()=>JSON.parse(w.localStorage.getItem('daybreak.v1'));
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  return {dom,w,failures,nav,click,data,interval,messages,settle};
}
test('all screens render, settings persist, and presets round-trip',async()=>{
  const h=await setup();assert.match(h.w.document.body.textContent,/Make room for morning/);
  h.nav('routine');h.click('[data-config="qr"]');assert.equal(h.data().config.qr,true);
  h.click('[data-builtin="simple"]');assert.equal(h.data().config.game,false);assert.equal(h.data().config.checkin,false);
  h.click('#save-preset');h.w.document.querySelector('#preset-name').value='My quiet morning';h.click('#confirm-preset');assert.equal(h.data().presets.length,1);
  h.nav('insights');assert.match(h.w.document.body.textContent,/No sample records/);assert.deepEqual(h.failures,[]);h.dom.window.close();
});
test('simple practice completes, stays excluded from insights, and accepts feedback',async()=>{
  const h=await setup();h.nav('routine');h.click('[data-builtin="simple"]');h.click('#practice-button');await h.settle();h.click('#quiet-button');
  assert.equal(h.data().active.state,'complete');assert.equal(h.data().records.length,1);h.click('#feedback-button');h.w.document.querySelector('#stayed').value='yes';h.w.document.querySelector('#feedback-form').dispatchEvent(new h.w.Event('submit',{cancelable:true}));assert.equal(h.data().records[0].feedback.stayedUp,true);
  h.click('#close-session');h.nav('insights');assert.match(h.w.document.body.textContent,/0\/0 reports/);assert.deepEqual(h.failures,[]);h.dom.window.close();
});
test('path game requires the correct ordered steps and then a delayed check-in',async()=>{
  const h=await setup();h.nav('routine');const type=h.w.document.querySelector('[data-config="gameType"]');type.value='path';type.dispatchEvent(new h.w.Event('change'));
  h.click('#practice-button');await h.settle();h.click('#quiet-button');
  h.click('[data-number="3"]');assert.equal(h.data().active.state,'mission');
  h.w.Date.now=()=>Date.now()+31000;
  for(let n=1;n<=6;n++)h.click(`[data-number="${n}"]`);
  assert.equal(h.data().active.state,'waiting-checkin');assert.equal(h.data().records.length,0);assert.deepEqual(h.failures,[]);h.dom.window.close();
});
test('range changes are included when practice starts without leaving the settings screen',async()=>{const h=await setup();h.nav('routine');const range=h.w.document.querySelector('[data-config="volume"]');range.value=35;range.dispatchEvent(new h.w.Event('input'));h.click('#practice-button');await h.settle();assert.equal(h.data().active.config.volume,35);h.dom.window.close();});
test('native stop interactions preserve counter, cancel only after completion, and deduplicate',async()=>{
  const h=await setup(null,true);await h.settle();const config=h.data().config;
  const event={type:'alarm',sessionId:webcrypto.randomUUID(),alarmID:webcrypto.randomUUID(),kind:'followup',ordinal:2,scheduledAt:Date.now()-10000,at:Date.now(),config:{...config,game:false,qr:false,checkin:false}};
  await h.w.daybreakNativeEvent(event);await h.settle();assert.equal(h.data().active.followups,2);assert.equal(h.data().active.state,'complete');assert.equal(h.data().records.length,1);
  await h.w.daybreakNativeEvent(event);assert.equal(h.data().records.length,1);
  assert.ok(h.messages.some(m=>m.action==='sync'&&m.state==='complete'));assert.deepEqual(h.failures,[]);h.dom.window.close();
});
test('QR generator and scanner interoperate with the exact private token',()=>{
  const value='daybreak:'+webcrypto.randomUUID(),qr=QRCode.create(value,{errorCorrectionLevel:'M'}),scale=8,margin=4,size=(qr.modules.size+margin*2)*scale;
  const pixels=new Uint8ClampedArray(size*size*4);pixels.fill(255);
  for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(qr.modules.get(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const i=(((y+margin)*scale+dy)*size+(x+margin)*scale+dx)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;}
  assert.equal(jsQR(pixels,size,size).data,value);
});
