import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";

const audit=fs.readFileSync(new URL("../link-audit.js",import.meta.url),"utf8");
const incoming=fs.readFileSync(new URL("../link-import.js",import.meta.url),"utf8");
const seed=Buffer.alloc(32,7).toString("base64url");
function boot(){
 const pairId="11111111-1111-4111-8111-111111111111";
 const state={
  linkConnections:[{id:pairId,sourceApp:"gaming",seed,scopes:["installed_summary"]}],
  linkInbox:[{id:"PRIVATE-ID",pairId,sourceKey:"a".repeat(64),revision:2,status:"accepted",
    payload:{title:"PRIVATE-TITLE",priceCents:4550},createdAt:new Date().toISOString()}]
 };
 let content="",mutations=0;
 const window={};
 const context={window,crypto:webcrypto,TextEncoder,btoa,atob,Date,
  navigator:{clipboard:{writeText:async()=>{}}},document:{getElementById(){return {addEventListener(){}}}},console};
 vm.runInNewContext(audit,context);
 vm.runInNewContext(incoming,context);
 window.NexusGamingImport.attach({state:()=>state,escape:x=>x,
  modal:(_,html)=>{content=html;},toast(){},render(){mutations++},persist(){mutations++;},verify:async()=>true});
 return {api:window.NexusGamingImport,state,content:()=>content,mutations:()=>mutations};
}
test("Nexus audit uses persisted inbox source key but exports no raw key or payload",async()=>{
 const t=boot(),before=JSON.stringify(t.state),r=await t.api.auditSnapshot();
 assert.equal(r.total,1);assert.equal(r.events[0].revision,2);
 for(const privateVal of [seed,"a".repeat(64),"PRIVATE-ID","PRIVATE-TITLE","sourceKey","pairId","priceCents"])
  assert.ok(!JSON.stringify(r).includes(privateVal),"leaked "+privateVal);
 assert.equal(JSON.stringify(t.state),before);
 assert.equal(t.mutations(),0);
});
test("Nexus audit action opens optional fragment without a server request",async()=>{
 const t=boot();await t.api.auditPanel();
 assert.match(t.content(),/#audit=LDA1\./);
 assert.doesNotMatch(t.content(),/PRIVATE-TITLE/);
 assert.equal(t.mutations(),0);
});
