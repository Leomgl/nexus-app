'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');

function moduleInstance(){
 global.window={};delete require.cache[require.resolve('../vestiaire-v021.js')];
 require('../vestiaire-v021.js');return global.window.NexusVestiaire;
}
test('V0.21 recognizes restaurant, work, sport and travel without external AI',()=>{
 const m=moduleInstance();
 assert.equal(m.context({title:'Restaurant ce soir avec des amis'}),'Restaurant');
 assert.equal(m.context({title:'Déjeuner au bistrot'}),'Restaurant');
 assert.equal(m.context({title:'Réunion client'}),'Travail');
 assert.equal(m.context({title:'Entraînement sport'}),'Sport');
 assert.equal(m.context({title:'Départ week-end'}),'Voyage');
 assert.equal(m.context({title:'Dentiste'}),null);
});
test('V0.21 recommends available season-appropriate outfits and never unavailable ones',()=>{
 const m=moduleInstance(),e={title:'Restaurant ce soir'};
 const looks=[
  {id:'winter',name:'Laine et veste',occasion:'Restaurant',style:'Old money',warmth:3,available:true},
  {id:'summer',name:'Lin léger',occasion:'Restaurant',style:'Smart casual',warmth:0,available:true},
  {id:'laundry',name:'Au lavage',occasion:'Restaurant',style:'Classique',warmth:3,available:false},
  {id:'sport',name:'Sport',occasion:'Sport',style:'Sport',warmth:1,available:true}
 ];
 assert.equal(m.recommend(e,looks,{feels:2,rain:80})[0].id,'winter');
 assert.equal(m.recommend(e,looks,{feels:30,rain:2})[0].id,'summer');
 assert.ok(m.recommend(e,looks).every(x=>x.id!=='laundry'));
 assert.deepEqual(m.recommend({title:'RDV dentiste'},looks),[]);
});
test('V0.21 rejects malformed, oversized and duplicate catalog payloads',()=>{
 const m=moduleInstance(),pair={id:'pair',sourceApp:'vestiaire',scopes:['outfit_catalog']};
 const valid={scope:'outfit_catalog',sourceKey:'abc',revision:2,
  payload:{type:'vestiaire.catalog.v1',sourceApp:'vestiaire',revision:2,sharedAt:'2026-11-11T17:00:00Z',
   looks:[{id:'look-1',name:'Smart',occasion:'Restaurant',style:'Old money',warmth:2,available:true}],total:1,omitted:0}};
 assert.equal(m.validCatalog(valid,pair).looks.length,1);
 assert.equal(m.validCatalog({...valid,revision:3},pair),null);
 assert.equal(m.validCatalog({...valid,scope:'pass_paid'},pair),null);
 assert.equal(m.validCatalog({...valid,payload:{...valid.payload,looks:[valid.payload.looks[0],valid.payload.looks[0]]}},pair),null);
 assert.equal(m.validCatalog({...valid,payload:{...valid.payload,looks:[{...valid.payload.looks[0],photo:'data:...'}]}},pair)?.looks[0].photo,undefined);
 assert.equal(m.validCatalog({...valid,payload:{...valid.payload,looks:[{...valid.payload.looks[0],available:'true'}]}},pair),null);
});
test('V0.21 receives a catalog once and acknowledges only after local verification',async()=>{
 const m=moduleInstance(),pair={id:'pair',sourceApp:'vestiaire',scopes:['outfit_catalog']};
 const d={linkConnections:[pair],vestiaireCatalogs:[],vestiaireSelections:[],events:[]};
 let calls=0,acks=0,verified=true;
 const message={id:'msg-1',scope:'outfit_catalog',sourceKey:'s',revision:1,payload:{type:'vestiaire.catalog.v1',sourceApp:'vestiaire',revision:1,looks:[{id:'look',name:'Look',occasion:'Restaurant',style:'Classique',available:true,warmth:2}]}};
 window.NexusLinkCore={inbox:async()=>[message],acknowledge:async()=>{acks++;}};
 m.attach({state:()=>d,persist:async()=>{calls++;},verify:async()=>verified,
  toast:()=>{},safeRender:()=>{},escape:x=>x,svg:()=>''});
 assert.equal((await m.receive(true)).received,1);
 assert.equal(d.vestiaireCatalogs[0].looks.length,1);
 assert.equal(acks,1);
 assert.ok(calls>=1);
 assert.equal((await m.receive(true)).received,0);
 verified=false;
 window.NexusLinkCore.inbox=async()=>[{...message,id:'msg-2',revision:2,payload:{...message.payload,revision:2}}];
 const old=d.vestiaireCatalogs[0].revision;
 await m.receive(true);
 assert.equal(d.vestiaireCatalogs[0].revision,old);
 assert.equal(acks,2,'failed verification must not acknowledge the new revision');
});
