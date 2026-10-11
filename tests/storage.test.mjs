import test from 'node:test';import assert from 'node:assert/strict';
import {emptyStore,saveStore,loadStore,importStore} from '../src/storage.js';
test('storage round trip retains records and selected settings',()=>{const mock={value:null,getItem(){return this.value;},setItem(k,v){this.value=v;}};const s=emptyStore();s.config.qr=true;saveStore(s,mock);assert.equal(loadStore(mock).config.qr,true);});
test('corrupt persisted data is surfaced instead of silently destroyed',()=>assert.throws(()=>loadStore({getItem:()=>'{bad'})));
test('imports never arm alarms or resume an old session',()=>{const s=emptyStore();s.armed={at:1};s.active={id:'old'};const result=importStore(JSON.stringify(s));assert.equal(result.armed,null);assert.equal(result.active,null);});
test('import rejects unrelated file shapes',()=>assert.throws(()=>importStore('{"version":1}')));
test('import rejects malformed timestamps and state rather than breaking exports',()=>{const s=emptyStore();s.records=[{id:'x',startedAt:'bad',scheduledAt:0,state:'complete',mode:'browser',config:{},events:[]}];assert.throws(()=>importStore(JSON.stringify(s)));});
