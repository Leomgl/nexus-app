'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
function travelModule(){
 const ctx={window:{},console};
 vm.runInNewContext(read('nexus-travel.js'),ctx,{filename:'nexus-travel.js'});
 return ctx.window.NexusTravel;
}
test('only explicit valid trips are eligible',()=>{
 const t=travelModule(),state={events:[
  {id:'trip',title:'Séjour',tripType:'travel',start:'2099-04-01T17:00:00',returnDate:'2099-04-03'},
  {id:'rdv',title:'Simple RDV',start:'2099-04-01T09:00:00'},
  {id:'broken',title:'Broken',tripType:'travel',start:'2099-04-02T10:00:00',returnDate:'2099-04-99'},
  {id:'long',title:'Too long',tripType:'travel',start:'2099-04-01T10:00:00',returnDate:'2099-08-01'}
 ],linkConnections:[],travelOutbox:[]};
 t.attach({state:()=>state,escape:x=>x,modal:()=>{},render:()=>{},persist:async()=>{},toast:()=>{}});
 assert.equal(t.range(state.events[0]).nights,2);
 assert.equal(t.range(state.events[1]),null);
 assert.equal(t.range(state.events[2]),null);
 assert.equal(t.range(state.events[3]),null);
 assert.deepEqual(Array.from(t.eligible(),x=>x.id),['trip']);
});
test('reverse trip scope uses separate RITUEL pairing and never Gaming',()=>{
 const bridge=read('bridge/worker.js'),connections=read('connections.js'),rituel=read('rituel-import.js');
 assert.match(bridge,/rituel:new Set\([^\n]*'trip_context'/);
 assert.match(connections,/!x\.scopes\?\.includes\('trip_context'\)/);
 assert.match(rituel,/!x\.scopes\?\.includes\('trip_context'\)/);
 assert.match(read('nexus-travel.js'),/createPair\('rituel',\['trip_context'\]\)/);
 assert.doesNotMatch(read('nexus-travel.js'),/pass_paid|installed_summary|gaming_event/);
});
