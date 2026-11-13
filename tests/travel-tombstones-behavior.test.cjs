'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','nexus-travel.js'),'utf8');

async function harness(){
 const sent=[],timers=[],events=new Map(),data={
  linkConnections:[{id:'pair',sourceApp:'garage',scopes:['trip_context']}],
  events:[{id:'trip-one',tripType:'travel',returnDate:'2027-02-02',
   start:'2027-02-01T10:00:00',title:'Séjour test'}],
  travelGarageHubOutbox:[],travelGarageOutbox:[]
 };
 const context={
  console,Date,Promise,TextEncoder,Uint8Array,crypto:require('node:crypto').webcrypto,
  navigator:{onLine:true},confirm:()=>true,
  setTimeout:fn=>{timers.push(fn);return timers.length},
  clearTimeout:()=>{},
  document:{addEventListener:(key,fn)=>events.set(key,fn),visibilityState:'visible'},
  window:{
   addEventListener:(key,fn)=>events.set(key,fn),
   NexusLinkCore:{},
   LinkHubBus:{publish:async message=>{sent.push(structuredClone(message));return {accepted:true}}}
  }
 };
 vm.createContext(context);vm.runInContext(source,context);
 context.window.NexusTravel.attach({state:()=>data,persist:async()=>{},render:()=>{},
   toast:()=>{},modal:()=>{},escape:x=>x});
 async function tick(expected){
  for(let round=0;round<35;round++){
   while(timers.length){await timers.shift()()}
   if(sent.length>=expected)return;
   await new Promise(resolve=>setImmediate(resolve));
  }
  throw Error('Missing publication '+expected+'; actual '+sent.length);
 }
 function flush(id='*'){context.window.NexusTravel.scheduleAutoGarage(id)}
 return {data,sent,flush,tick,ctx:context};
}

test('Nexus publishes stable cancellation after deletion and restores at new revision',async()=>{
 const h=await harness();
 h.flush();await h.tick(1);
 assert.equal(h.sent[0].revision,1);
 assert.equal(h.sent[0].payload.deleted,undefined);
 h.data.events=[];
 h.flush('trip-one');await h.tick(2);
 assert.equal(h.sent[1].revision,2);
 assert.equal(h.sent[1].payload.deleted,true);
 assert.equal(h.sent[1].entityId,h.sent[0].entityId);
 h.flush();await h.tick(2);
 assert.equal(h.sent.length,2,'reconnection must not republish an unchanged tombstone');
 h.data.events=[{id:'trip-one',tripType:'travel',returnDate:'2027-02-02',
   start:'2027-02-01T10:00:00',title:'Séjour restauré'}];
 h.flush();await h.tick(3);
 assert.equal(h.sent[2].revision,3);
 assert.equal(h.sent[2].payload.deleted,undefined);
});

test('offline deletions are held locally and caught up after reconnect',async()=>{
 const h=await harness();
 h.flush();await h.tick(1);
 h.data.events=[];
 h.ctx.navigator.onLine=false;
 h.flush('trip-one');
 await h.tick(1);
 assert.equal(h.sent.length,1,'offline must not claim a delivered tombstone');
 h.ctx.navigator.onLine=true;
 h.flush();
 await h.tick(2);
 assert.equal(h.sent[1].payload.deleted,true);
});
