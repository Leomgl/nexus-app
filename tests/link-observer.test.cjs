const test=require("node:test"),assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs");
const source=fs.readFileSync("link-import.js","utf8");
function make({paired=true,rows=null}={}){
 const seed="SECRET_PRIVATE_PAIRING_SEED",id="SECRET_PRIVATE_PAIRING_ID",key="a".repeat(64);
 const saved=rows??[
  {id:"SECRET_MSG_1",pairId:id,sourceKey:key,revision:2,scope:"pass_deadline",
   payload:{type:"gaming.proposal.v1",title:"SECRET_GAME_NAME",priceCents:1234},status:"accepted",
   createdAt:"2026-11-12T21:15:00.000Z",updatedAt:"2026-11-12T21:16:00.000Z"},
  {id:"SECRET_MSG_2",pairId:id,sourceKey:"b".repeat(64),revision:1,scope:"pass_paid",
   payload:{title:"SECRET_EXPENSE",priceCents:3500},status:"pending",
   createdAt:"2026-11-12T21:17:00.000Z",updatedAt:"2026-11-12T21:17:00.000Z"}
 ];
 const data={
  linkConnections:paired?[{id,seed,sourceApp:"gaming",scopes:["pass_deadline","pass_paid"]}]:[],
  linkInbox:saved,transactions:[],events:[],tasks:[],purchases:[],notes:[],projects:[]
 };
 let rendered="",mutations=0;
 const api={state:()=>data,render(){mutations++},persist:async()=>{mutations++},
  toast(){},modal:(_title,html)=>{rendered=html},
  verify:async()=>true,escape:String,uid:()=>crypto.randomUUID(),today:()=>"",
 };
 const context={window:{},document:{getElementById(){return {addEventListener(){}}}},
  navigator:{clipboard:{writeText:async()=>{}}},TextEncoder,TextDecoder,btoa,atob,
  Date,console,crypto:globalThis.crypto};
 vm.runInNewContext(source,context,{filename:"link-import.js"});
 context.window.NexusGamingImport.attach(api);
 return {api:context.window.NexusGamingImport,data,rendered:()=>rendered,mutations:()=>mutations};
}
test("Nexus observer counts durable local Inbox statuses without exposing data",()=>{
 const t=make(),before=JSON.stringify(t.data);
 const r=t.api.observation();
 assert.equal(r.schema,"link.observation.nexus.v1");
 assert.equal(r.contractId,"gaming-nexus");
 assert.equal(r.paired,true);assert.equal(r.recorded,2);
 assert.equal(r.pending,1);assert.equal(r.accepted,1);assert.equal(r.rejected,0);
 assert.equal(r.scopeCount,2);
 assert.equal(r.lastRecordedAt,"2026-11-12T21:17:00.000Z");
 const serialized=JSON.stringify(r);
 for(const secret of ["SECRET","seed","pairId","sourceKey","priceCents","title","payload"])
  assert.ok(!serialized.includes(secret),"Leaked "+secret);
 assert.equal(JSON.stringify(t.data),before);
 assert.equal(t.mutations(),0);
});
test("Nexus observer has empty nonpaired state without borrowed rows",()=>{
 const t=make({paired:false});
 const r=t.api.observation();
 assert.equal(r.paired,false);assert.equal(r.recorded,0);
 assert.equal(r.scopeCount,0);assert.equal(r.pending,0);assert.equal(r.lastRecordedAt,null);
});
test("Nexus observer action presents fragment-only code and preserves legacy actions",()=>{
 const t=make(),before=JSON.stringify(t.data);
 assert.equal(t.api.act("link-observe",{dataset:{}}),true);
 const modal=t.rendered();
 assert.match(modal,/#nexus-observe=LDN1\./);
 assert.match(modal,/Copier le code/);
 for(const secret of ["SECRET_PRIVATE_PAIRING","SECRET_GAME_NAME","SECRET_EXPENSE"])
  assert.doesNotMatch(modal,new RegExp(secret));
 assert.equal(JSON.stringify(t.data),before);
 assert.equal(t.mutations(),0);
 assert.equal(typeof t.api.synchronize,"function");
 assert.equal(typeof t.api.approve,"function");
});
