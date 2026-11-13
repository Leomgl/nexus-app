'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','nexus-sante.js'),'utf8');
const uuid='12345678-1234-4234-8234-123456789abc';
const appt=(id=uuid)=>({
 id,title:'TEST LINK — Santé',start:'2026-12-20T14:00:00',location:'Cabinet test',
 originApp:'sante',originSourceId:'appointment:'+id,healthSync:true,healthSyncId:id,
 syncedTitle:'TEST LINK — Santé',syncedStart:'2026-12-20T11:30:00',
 syncedLocation:'Cabinet test',userEdited:true
});
const dataFor=(events=[appt()],rev=2)=>({
 events,linkConnections:[{id:'pair-1',sourceApp:'sante',scopes:['health_calendar']}],
 santeNexusRevision:rev,santeHealthTombstones:[],santeCalendars:[],santeDaily:[],
 santeHubCalendarOutbox:null
});
function rig({events=[appt()],revision=2,presealed=[],failAll=false,delayPersist=false}={}){
 const data=dataFor(events,revision),sent=[],stored=new Map(),attempts=[],toasts=[];
 for(const e of presealed)stored.set(e.entityId+'|'+e.revision,JSON.stringify(e.payload));
 const ctx={
  console,Date,Promise,TextEncoder,Uint8Array,crypto:require('node:crypto').webcrypto,
  confirm:()=>true,navigator:{onLine:true},localStorage:{getItem:()=>JSON.stringify({sendMedical:true,autoEvents:true})},
  setTimeout:()=>0,clearTimeout:()=>{},
  document:{addEventListener:()=>{},visibilityState:'visible',hidden:false},
  window:{addEventListener:()=>{},SanteLinkCore:{},
   LinkHubBus:{publish:async msg=>{
    const key=msg.entityId+'|'+msg.revision,body=JSON.stringify(msg.payload);
    attempts.push({entityId:msg.entityId,revision:msg.revision,payload:msg.payload});
    if(failAll||(stored.has(key)&&stored.get(key)!==body))
     throw Error('MÊME_RÉVISION_DONNÉES_DIFFÉRENTES');
    stored.set(key,body);sent.push(msg);return {accepted:true};
   }}
  }
 };
 vm.createContext(ctx);vm.runInContext(source,ctx);
 ctx.window.NexusSanteBridge.attach({
  state:()=>data,toast:msg=>toasts.push(msg),persist:async()=>{
   if(delayPersist)await new Promise(resolve=>setImmediate(resolve))
  },render:()=>{},escape:x=>x,svg:()=>{}
 });
 return {data,sent,attempts,stored,toasts,
  send:()=>ctx.window.NexusSanteBridge.sendHubCalendar({interactive:false,quiet:true})
 };
}
test('local Hub outbox revision collision advances without overwriting sealed data',async()=>{
 const old={entityId:'nexus:calendar:0',revision:2,
  payload:{type:'nexus.calendar.v1',sourceApp:'nexus',revision:2,page:0,pages:1,
   events:[{id:uuid,title:'TEST LINK — Santé',start:'2026-12-20T11:30:00Z',
    location:'Cabinet test',deleted:false}],sharedAt:'2026-11-13T16:00:00.000Z'}};
 const h=rig({presealed:[old]});
 assert.equal(await h.send(),true);
 assert.deepEqual(h.attempts.map(x=>x.revision),[2,3]);
 assert.equal(h.data.santeHubCalendarOutbox.revision,3);
 assert.ok(h.data.santeHubCalendarOutbox.deliveredAt);
 assert.equal(h.sent.length,1);
 assert.equal(h.sent[0].payload.events[0].start,new Date('2026-12-20T14:00:00').toISOString());
 assert.equal(h.stored.get('nexus:calendar:0|2'),JSON.stringify(old.payload),'old sealed record remains untouched');
 assert.equal(await h.send(),true);
 assert.equal(h.sent.length,1,'unchanged data must not publish again');
});
test('collision on a later page restarts all pages under a coherent new revision',async()=>{
 const events=Array.from({length:13},(_,i)=>appt('12345678-1234-4234-8234-'+String(i).padStart(12,'0')));
 const h=rig({events,revision:1,presealed:[{entityId:'nexus:calendar:1',revision:1,
  payload:{type:'old',events:[]}}]});
 assert.equal(await h.send(),true);
 assert.deepEqual(h.attempts.map(x=>[x.entityId,x.revision]),[
  ['nexus:calendar:0',1],['nexus:calendar:1',1],
  ['nexus:calendar:0',2],['nexus:calendar:1',2]]);
 assert.equal(h.data.santeHubCalendarOutbox.revision,2);
 assert.equal(h.sent.filter(x=>x.revision===2).length,2);
 assert.equal(h.sent.filter(x=>x.revision===2).every(x=>x.payload.pages===2),true);
});
test('simultaneous explicit and automatic sends are serialized',async()=>{
 const h=rig({delayPersist:true});
 const results=await Promise.all([h.send(),h.send(),h.send()]);
 assert.deepEqual(results,[true,true,true]);
 assert.equal(h.attempts.length,1,'only one immutable envelope should be published');
 assert.equal(h.data.santeHubCalendarOutbox.revision,2);
});
test('unbounded revision collisions never invent successful publication',async()=>{
 const h=rig({failAll:true});
 await assert.rejects(h.send(),/MÊME_RÉVISION_DONNÉES_DIFFÉRENTES/);
 assert.equal(h.sent.length,0);
 assert.equal(h.attempts.length,17,'bounded after first attempt plus 16 revisions');
 assert.ok(h.data.santeHubCalendarOutbox.pending);
 assert.equal(h.data.santeHubCalendarOutbox.deliveredAt,undefined);
});
