'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','nexus-sante.js'),'utf8');
const pair={id:'12345678-1234-4234-8234-123456789abc',seed:'private-existing-seed',sourceApp:'sante',scopes:['dose_summary','health_calendar']};
const oldOther={id:'garage-pair',sourceApp:'garage'};
const appointment={id:'event-local',originApp:'sante',originPairId:pair.id,originSourceId:'appointment:one',title:'TEST LINK — Santé',start:'2026-12-20T14:00:00'};
function rig({inputPair=pair,connected=true,canPersist=true,verifyOK=true,priorPairId=pair.id}={}){
 const data={linkConnections:[oldOther],events:[{...appointment,originPairId:priorPairId}],santeCalendars:[],santeDaily:[],santeNexusRevision:1,santeHealthTombstones:[]};
 const toasts=[],calls=[],input={value:'NXS1.private_local_code'},persisted=[];
 const ctx={console,Date,Promise,TextEncoder,Uint8Array,confirm:()=>true,
  localStorage:{getItem:()=>JSON.stringify({sendMedical:true,autoEvents:true})},
  navigator:{onLine:true},setTimeout:()=>0,clearTimeout:()=>{},
  document:{getElementById:id=>id==='nxsh-recover-code'?input:null,addEventListener:()=>{},visibilityState:'visible'},
  window:{addEventListener:()=>{},
   SanteLinkCore:{readInvite:value=>{calls.push('readInvite');assert.equal(value,'NXS1.private_local_code');return inputPair},
    status:async recovered=>{calls.push('status');return {connected}},
    createPair:()=>{throw Error('MUST_NOT_CREATE_PAIR')},
    invitation:()=> 'NXS1.private_local_code'},
  }};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 ctx.window.NexusSanteBridge.attach({state:()=>data,render:()=>{calls.push('render')},toast:x=>toasts.push(x),
  persist:async()=>{calls.push('persist');if(!canPersist)throw Error('STORAGE_FAILED');persisted.push(JSON.stringify(data.linkConnections))},
  verify:async (kind,id,seed)=>{calls.push('verify');return verifyOK&&kind==='pair'&&id===pair.id&&seed===pair.seed},
  svg:()=>'',escape:s=>s});
 return {data,toasts,calls,input,persisted,
  restore:()=>ctx.window.NexusSanteBridge.act('sante-recover'),
  card:()=>ctx.window.NexusSanteBridge.settingsCard()};
}
test('restore same Santé pairing and all unrelated pairings and events survive',async()=>{
 const h=rig();
 assert.match(h.card(),/Restaurer la liaison existante/);
 assert.equal(await h.restore(),true);
 assert.equal(h.data.linkConnections.length,2);
 assert.strictEqual(h.data.linkConnections[0],oldOther);
 assert.equal(h.data.linkConnections[1].id,pair.id);
 assert.equal(h.data.linkConnections[1].seed,pair.seed);
 assert.equal(h.data.events[0].start,'2026-12-20T14:00:00');
 assert.equal(h.input.value,'');
 assert.equal(h.persisted.length,1);
 assert.ok(h.calls.includes('verify'));
 assert.ok(!h.calls.includes('createPair'));
 assert.match(h.card(),/Agenda médical ↔ Santé/);
});
test('wrong existing pair id cannot hijack imported appointments',async()=>{
 const wrong={...pair,id:'98765432-1234-4234-8234-123456789abc'};
 const h=rig({inputPair:wrong});
 assert.equal(await h.restore(),false);
 assert.equal(h.data.linkConnections.length,1);
 assert.ok(!h.calls.includes('status'),'do not query server with conflicting pair');
 assert.match(h.toasts.join(' '),/ne correspond pas/);
});
test('invalid legacy channel status prevents local changes',async()=>{
 const h=rig({connected:false});
 assert.equal(await h.restore(),false);
 assert.equal(h.data.linkConnections.length,1);
 assert.equal(h.persisted.length,0);
});
test('persistence verification failure reverts old local pairing without false success',async()=>{
 const h=rig({verifyOK:false});
 assert.equal(await h.restore(),false);
 assert.equal(h.data.linkConnections.length,1);
 assert.strictEqual(h.data.linkConnections[0],oldOther);
 assert.equal(h.persisted.length,2,'restoration attempted then rollback saved');
 assert.match(h.toasts.join(' '),/n'a pas été enregistrée/);
});
