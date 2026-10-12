import test from 'node:test';import assert from 'node:assert/strict';
import {emptyStore,saveStore,loadStore,importStore} from '../src/storage.js';
test('storage round trip retains records and selected settings',()=>{const mock={value:null,getItem(){return this.value;},setItem(k,v){this.value=v;}};const s=emptyStore();s.config.qr=true;saveStore(s,mock);assert.equal(loadStore(mock).config.qr,true);});
test('corrupt persisted data is surfaced instead of silently destroyed',()=>assert.throws(()=>loadStore({getItem:()=>'{bad'})));
test('imports never arm alarms or resume an old session',()=>{const s=emptyStore();s.armed={at:1};s.active={id:'old'};const result=importStore(JSON.stringify(s));assert.equal(result.armed,null);assert.equal(result.active,null);});
test('import keeps a genuine test flag and drops malformed ones',()=>{const s=emptyStore();const base={startedAt:1,scheduledAt:1,events:[],config:{},mode:'browser',state:'complete'};s.records=[{...base,id:'a',test:true},{...base,id:'b',test:'yes'},{...base,id:'c'}];const r=importStore(JSON.stringify(s)).records;assert.equal(r[0].test,true);assert.equal(r[1].test,undefined);assert.equal(r[2].test,undefined);});
test('import rejects unrelated file shapes',()=>assert.throws(()=>importStore('{"version":1}')));
test('import rejects malformed timestamps and state rather than breaking exports',()=>{const s=emptyStore();s.records=[{id:'x',startedAt:'bad',scheduledAt:0,state:'complete',mode:'browser',config:{},events:[]}];assert.throws(()=>importStore(JSON.stringify(s)));});
