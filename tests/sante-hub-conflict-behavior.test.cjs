'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','nexus-sante.js'),'utf8');
const uuid='12345678-1234-4234-8234-123456789abc';
const calendar=(revision,{title='Contrôle test',deleted=false}={})=>({
 type:'sante.calendar.v1',sourceApp:'sante',revision,
 events:[{id:uuid,kind:'appointment',title:deleted?'':title,
 start:'2027-03-12T09:00:00.000Z',location:'Cabinet test',deleted}]
});
async function rig({failPersist=false}={}){
 const data={events:[],santeCalendars:[],santeDaily:[],linkConnections:[{id:'pair',sourceApp:'sante'}],
  santeHealthTombstones:[],santeNexusRevision:1};
 let shouldFail=failPersist,persistCalls=0;
 const inbox=[],acks=[],errors=[],conflicts=[];
 const context={
  console,Date,Promise,TextEncoder,Uint8Array,crypto:require('node:crypto').webcrypto,
  navigator:{onLine:true},confirm:()=>true,localStorage:{getItem:()=>JSON.stringify({autoEvents:true,sendMedical:false})},
  setTimeout:()=>0,clearTimeout:()=>{},
  document:{addEventListener:()=>{},visibilityState:'visible',hidden:false},
  window:{addEventListener:()=>{},SanteLinkCore:{},
   LinkHubBus:{receive:async({contractId,persist})=>{
    if(contractId==='sante-summary-nexus')return {acknowledged:0,failed:0};
    let acknowledged=0,failed=0;
    for(const record of inbox.splice(0)){
     try{
      const result=await persist(record);
      if(!result?.durable||result.status!=='persisted')throw Error('ACK_BEFORE_DURABLE');
      acks.push(record.revision);acknowledged++;
     }catch(e){errors.push(String(e.message||e));failed++}
    }
    return {acknowledged,failed};
   }}
  }
 };
 vm.createContext(context);vm.runInContext(source,context);
 context.window.NexusSanteBridge.attach({
  state:()=>data,persist:async()=>{persistCalls++;if(shouldFail)throw Error('STORAGE_FAILED')},
  verify:async(type,_,rev)=>type==='calendar'&&data.santeCalendars?.[0]?.sourceRevision===rev,
  safeRender:()=>{},toast:()=>{},escape:x=>x,svg:()=>'',render:()=>{}
 });
 return {data,inbox,acks,errors,
  setFail:v=>{shouldFail=v},persistCount:()=>persistCalls,
  receive:async(payload)=>{
   inbox.push({payload,revision:payload.revision});
   return context.window.NexusSanteBridge.receiveHub({quiet:true});
  }
 };
}
test('Santé calendar creates one event then preserves a locally edited appointment on conflict',async()=>{
 const h=await rig();
 await h.receive(calendar(1));
 assert.deepEqual(h.acks,[1]);
 assert.equal(h.data.events.length,1);
 const e=h.data.events[0];
 assert.equal(e.title,'Contrôle test');
 e.title='Modification locale Nexus';e.userEdited=true;
 await h.receive(calendar(2,{title:'Modification simultanée Santé'}));
 assert.deepEqual(h.acks,[1,2]);
 assert.equal(h.data.events.length,1,'no duplicate during divergent edits');
 assert.equal(e.title,'Modification locale Nexus','local changes must not be overwritten');
 assert.equal(e.healthConflict,true);
 await h.receive(calendar(3,{deleted:true}));
 assert.equal(h.data.events.length,1,'remote deletion cannot destroy a locally edited record');
 assert.equal(e.healthConflict,true);
});
test('Santé tombstone removes an unchanged imported appointment',async()=>{
 const h=await rig();
 await h.receive(calendar(1));
 assert.equal(h.data.events.length,1);
 await h.receive(calendar(2,{deleted:true}));
 assert.equal(h.data.events.length,0);
 assert.deepEqual(h.acks,[1,2]);
 await h.receive(calendar(1));
 assert.equal(h.data.events.length,0,'old revision must not resurrect deleted record');
 assert.equal(h.data.santeCalendars[0].sourceRevision,2);
});
test('failed persistence prevents ACK and restores calendar and local events',async()=>{
 const h=await rig({failPersist:true});
 await h.receive(calendar(1));
 assert.deepEqual(h.acks,[]);
 assert.equal(h.data.events.length,0,'in-memory reconciliation must roll back on disk failure');
 assert.equal(h.data.santeCalendars.length,0);
 assert.ok(h.errors.includes('STORAGE_FAILED'));
 h.setFail(false);
 await h.receive(calendar(1));
 assert.deepEqual(h.acks,[1]);
 assert.equal(h.data.events.length,1);
});
test('same revision with contradictory payload is rejected without ACK',async()=>{
 const h=await rig();
 await h.receive(calendar(1));
 await h.receive(calendar(1,{title:'Données incompatibles'}));
 assert.deepEqual(h.acks,[1]);
 assert.ok(h.errors.includes('RÉVISION_CALENDRIER_CONTRADICTOIRE'));
 assert.equal(h.data.events[0].title,'Contrôle test');
});
