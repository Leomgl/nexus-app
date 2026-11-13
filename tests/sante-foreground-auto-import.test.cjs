'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'..','nexus-sante.js'),'utf8');
const UUID='12345678-1234-4234-8234-123456789abc';
const deletedCalendar={type:'sante.calendar.v1',sourceApp:'sante',revision:4,events:[{
 id:UUID,kind:'appointment',title:'TEST LINK — Santé',start:'2026-12-20T14:00:00.000Z',
 location:'Cabinet test',deleted:true
}]};
const event=()=>({id:'nexus-event',originApp:'sante',originSourceId:'appointment:'+UUID,originPairId:'pair-1',
 healthSyncId:UUID,healthSync:true,title:'TEST LINK — Santé',start:'2026-12-20T14:00:00.000Z',
 location:'Cabinet test',syncedTitle:'TEST LINK — Santé',syncedStart:'2026-12-20T14:00:00.000Z',
 syncedLocation:'Cabinet test',userEdited:false});
function rig({autoEvents=true}={}){
 const data={events:[event()],linkConnections:[{id:'pair-1',sourceApp:'sante'}],
  santeCalendars:[],santeDaily:[],santeNexusRevision:1,santeHealthTombstones:[],trash:[]};
 const inbox=[],calls=[],winEvents={},docEvents={},timers=new Map();
 let clock=1000000,timerId=0,rendered=0,settings={autoEvents,sendMedical:false};
 class FakeDate extends Date{static now(){return clock}}
 const doc={hidden:false,visibilityState:'visible',addEventListener:(name,fn)=>{docEvents[name]=fn},
  getElementById:()=>null};
 const window={addEventListener:(name,fn)=>{winEvents[name]=fn},SanteLinkCore:{invitation:()=> 'NXS1.local'}};
 window.LinkHubBus={receive:async({contractId,persist})=>{
  calls.push(contractId);
  if(contractId==='sante-summary-nexus')return {matched:0,acknowledged:0,failed:0};
  let ack=0;
  for(const packet of inbox.splice(0)){
   const saved=await persist({payload:packet,revision:packet.revision});
   if(!saved?.durable)throw Error('PREMATURE_ACK');ack++;
  }
  return {matched:ack,acknowledged:ack,failed:0};
 }};
 const ctx={console,Date:FakeDate,Promise,TextEncoder,Uint8Array,crypto:webcrypto,
  window,document:doc,navigator:{onLine:true},confirm:()=>true,
  localStorage:{getItem:()=>JSON.stringify(settings),setItem:(_key,value)=>{settings=JSON.parse(value)}},
  setTimeout:(fn,_ms)=>{const id=++timerId;timers.set(id,fn);return id},
  clearTimeout:id=>{timers.delete(id)}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 window.NexusSanteBridge.attach({state:()=>data,persist:async()=>true,
  verify:async(type,id,revision)=>type==='calendar'&&id==='pair-1'&&data.santeCalendars?.[0]?.sourceRevision===revision,
  render:()=>{rendered++},safeRender:()=>{},uid:()=> 'trash-row',toast:()=>{},escape:x=>x,svg:()=>''});
 async function flush(){
  for(let round=0;round<8&&timers.size;round++){
   const scheduled=[...timers.values()];
   timers.clear();
   scheduled.forEach(fn=>fn());
   await new Promise(resolve=>setImmediate(resolve));
  }
  await new Promise(resolve=>setImmediate(resolve));
 }
 function backgroundReturn({seconds=2}={}){
  doc.hidden=true;doc.visibilityState='hidden';docEvents.visibilitychange?.();
  winEvents.blur?.();
  clock+=seconds*1000;
  doc.hidden=false;doc.visibilityState='visible';docEvents.visibilitychange?.();
  winEvents.focus?.();
 }
 return {data,inbox,calls,flush,backgroundReturn,winEvents,docEvents,clock:(delta=0)=>{clock+=delta},
  prefs:()=>settings,renderCount:()=>rendered,bridge:window.NexusSanteBridge};
}
test('even sub-second iOS app switches apply new Santé events with auto-import enabled',async()=>{
 const h=rig({autoEvents:true});
 h.bridge.init();await h.flush();
 assert.equal(h.calls.length,2);
 h.inbox.push(deletedCalendar);
 h.backgroundReturn({seconds:0.2});
 await h.flush();
 assert.equal(h.calls.length,4,'one foreground cycle uses one pair of Hub inbox reads');
 assert.equal(h.data.events.length,0,'authorized auto-import removes deleted appointment automatically');
 assert.equal(h.data.santeCalendars[0].sourceRevision,4);
});
test('focus and visibilitychange coalesce and do not create a polling loop',async()=>{
 const h=rig({autoEvents:true});
 h.bridge.init();await h.flush();
 h.winEvents.focus();await h.flush();
 assert.equal(h.calls.length,2,'plain focus remains throttled');
 h.backgroundReturn({seconds:0.2});await h.flush();
 assert.equal(h.calls.length,4,'both iOS events coalesce into one foreground pull');
 await h.flush();
 assert.equal(h.calls.length,4,'idle app never polls Link');
});
test('automatic calendar import remains explicit opt-in; settings explains manual mode and enabling applies cached deletion',async()=>{
 const h=rig({autoEvents:false});
 h.inbox.push(deletedCalendar);
 h.bridge.init();await h.flush();
 assert.equal(h.data.events.length,1,'without consent receipt is cached but not applied');
 assert.equal(h.data.santeCalendars[0].sourceRevision,4);
 assert.match(h.bridge.settingsCard(),/Mode manuel : les messages Santé sont reçus/);
 assert.equal(h.prefs().autoEvents,false,'opening app cannot silently grant auto import');
 await h.bridge.act('sante-toggle-auto');
 assert.equal(h.prefs().autoEvents,true);
 assert.equal(h.data.events.length,0,'existing cached deletion applies immediately after explicit consent');
 assert.match(h.bridge.settingsCard(),/Import automatique autorisé/);
});
