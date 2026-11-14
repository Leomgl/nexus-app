/* Synced from Leomgl/link-app PR #5: do not edit independently. */
/**
 * LINK Notifications — application-side SDK for Nexus and future PWAs.
 * The server derives appId from a Hub identity; the caller never sends it.
 * The caller persists its journal locally AFTER each server acknowledgement.
 * No push subscription, scheduler, timer, or business plaintext is created.
 */
const URLS=new Set([
 "https://link-notifications-staging.q9pfwtztsc.workers.dev",
 "https://link-app.q9pfwtztsc.workers.dev"
]);
const SCHEMA="link.notification.command.v1";
const ID=/^[a-f0-9]{32,64}$/;
const CATEGORIES=new Set(["reminder","appointment","deadline","routine","gaming","generic"]);
const own=(x,keys)=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 Object.keys(x).every(k=>keys.includes(k));
const fail=code=>Object.assign(new Error(code),{code});
const iso=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const validate=entry=>{
 if(!own(entry,["id","dueAt","category"])||
    typeof entry.id!=="string"||!ID.test(entry.id)||
    !iso(entry.dueAt)||!CATEGORIES.has(entry.category))
  throw fail("INVALID_DESIRED_NOTIFICATION");
 return entry;
};
function checkJournal(journal){
 if(!journal||typeof journal!=="object"||Array.isArray(journal)||
    Object.keys(journal).length>4096)throw fail("INVALID_NOTIFICATION_JOURNAL");
 for(const [id,r] of Object.entries(journal)){
  if(!ID.test(id)||!r||!own(r,["id","dueAt","category","revision","status"])||
   (r.id!==undefined&&r.id!==id)||
   !Number.isInteger(r.revision)||r.revision<1||r.revision>1000000||
   !["pending","cancelled"].includes(r.status)||!iso(r.dueAt)||
   !CATEGORIES.has(r.category))throw fail("INVALID_NOTIFICATION_JOURNAL");
 }
}
/** From the Nexus V0.21.3 local job builder. Never serialize contexts. */
export function nexusNotificationsFromLegacyJobs({jobs,contexts={},now=new Date().toISOString()}){
 if(!Array.isArray(jobs)||jobs.length>600||!contexts||typeof contexts!=="object"||
    Array.isArray(contexts)||!iso(now))throw fail("INVALID_NEXUS_JOBS");
 const start=Date.parse(now),end=start+90*86400000,items=[],seen=new Set();
 for(const job of jobs){
  if(!job||typeof job!=="object"||!ID.test(job.id)||
     !Number.isSafeInteger(job.fireAt)||job.fireAt<0||
     !["task","event"].includes(job.kind))throw fail("INVALID_NEXUS_JOB");
  const ts=job.fireAt*1000;
  if(ts<start-5*60000||ts>end)continue;
  if(seen.has(job.id))throw fail("DUPLICATE_NEXUS_JOB");
  seen.add(job.id);
  // Read only the category of the local context. Titles, people, amounts,
  // locations and full context objects never enter the outbound envelope.
  const context=contexts["nexus-"+job.id.slice(0,16)];
  const kind=context?.kind;
  const category=job.kind==="event"?"appointment":
   kind==="budget"?"deadline":"reminder";
  items.push(Object.freeze({id:job.id,dueAt:new Date(ts).toISOString(),category}));
 }
 return items;
}
/**
 * Returns exact single-intent commands, with locally computed revisions.
 * Do not prune cancelled IDs by arbitrary TTL; late offline messages exist.
 * Edits/deletions do not reschedule all reminders.
 */
export function planAppNotificationDeltas({previous={},desired=[],completeSnapshot=false,now=new Date().toISOString()}){
 checkJournal(previous);
 if(!Array.isArray(desired)||desired.length>600||!iso(now)||typeof completeSnapshot!=="boolean"||
    (completeSnapshot&&desired.length>64)||
    (completeSnapshot&&Object.keys(previous).filter(id=>previous[id].status==="pending").length>64))
  throw fail("INVALID_NOTIFICATION_DELTA_INPUT");
 const proposed=new Map();
 for(const raw of desired){
  const e=validate(raw);
  if(proposed.has(e.id))throw fail("DUPLICATE_DESIRED_NOTIFICATION");
  if(Date.parse(e.dueAt)<Date.parse(now)-300000||
     Date.parse(e.dueAt)>Date.parse(now)+90*86400000)
   throw fail("INTENT_OUT_OF_WINDOW");
  proposed.set(e.id,e);
 }
 const changes=[];
 for(const e of proposed.values()){
  const old=previous[e.id];
  if(old?.status==="cancelled")throw fail("OCCURRENCE_TERMINAL");
  if(old&&old.dueAt===e.dueAt&&old.category===e.category)continue;
  const revision=(old?.revision||0)+1;
  if(revision>1000000)throw fail("REVISION_EXHAUSTED");
  changes.push(Object.freeze({operation:"upsert",
   item:{...e,revision},journalEntry:{...e,revision,status:"pending"}}));
 }
 if(completeSnapshot)for(const [id,old] of Object.entries(previous)){
  if(old.status==="pending"&&!proposed.has(id)){
   if(old.revision===1000000)throw fail("REVISION_EXHAUSTED");
   const revision=old.revision+1;
   changes.push(Object.freeze({operation:"cancel",item:{id,revision},
    journalEntry:{...old,revision,status:"cancelled"}}));
  }
 }
 if(changes.length>1200)throw fail("TOO_MANY_NOTIFICATION_CHANGES");
 return changes;
}
export function applyAppNotificationAcknowledgement(journal,change){
 checkJournal(journal);
 if(!change||!["upsert","cancel"].includes(change.operation)||
    !change.item||!change.journalEntry)throw fail("INVALID_NOTIFICATION_ACK");
 const id=change.item.id;
 if(!ID.test(id)||change.journalEntry.revision!==change.item.revision)
  throw fail("INVALID_NOTIFICATION_ACK");
 return {...journal,[id]:change.journalEntry};
}
/**
 * Staging credentials must be separately enrolled: never reuse the live LINK
 * Hub credential against the isolated staging Worker.
 */
export function createLinkNotificationClient({
 endpoint,credentialProvider,capabilityProvider,fetchImpl=fetch
}={}){
 if(!URLS.has(endpoint)||typeof fetchImpl!=="function"||
    (!credentialProvider&&!capabilityProvider)||
    (credentialProvider&&typeof credentialProvider!=="function")||
    (capabilityProvider&&typeof capabilityProvider!=="function")||
    (capabilityProvider&&endpoint!=="https://link-app.q9pfwtztsc.workers.dev"))
  throw fail("INVALID_CLIENT_CONFIG");
 let capability=null,expiresAt=0;
 async function request(path,token,body){
  const response=await fetchImpl(endpoint+path,{
   method:"POST",cache:"no-store",headers:{"Authorization":"Bearer "+token,
    ...(body?{"Content-Type":"application/json"}:{})},
   ...(body?{body:JSON.stringify(body)}:{})
  });
  const value=await response.json().catch(()=>({error:"INVALID_LINK_RESPONSE"}));
  if(!response.ok)throw fail(value.error||"LINK_NOTIFICATION_REQUEST_FAILED");
  return value;
 }
 async function getCapability(){
  if(capability&&Date.now()<expiresAt-10000)return capability;
  let value;
  if(capabilityProvider){
   // Live Nexus delegates just the short-lived notification capability to
   // its existing Hub adapter, never the underlying long-lived Hub token.
   value=await capabilityProvider();
  }else{
   const credential=await credentialProvider();
   if(typeof credential!=="string"||!/^[a-f0-9]{64}$/i.test(credential))
    throw fail("NOTIFICATION_HUB_NOT_ENROLLED");
   value=await request("/api/v2/notifications/capability",credential);
  }
  if(value.schema!=="link.notification.capability.v1"||
     typeof value.token!=="string"||!Number.isFinite(Date.parse(value.expiresAt)))
   throw fail("INVALID_CAPABILITY_RESPONSE");
  capability=value.token;expiresAt=Date.parse(value.expiresAt);
  return capability;
 }
 return Object.freeze({
  async submit(change){
   if(!change||!["upsert","cancel"].includes(change.operation)||
      !change.item||typeof change.item!=="object")
    throw fail("INVALID_NOTIFICATION_CHANGE");
   const token=await getCapability();
   const body={schema:SCHEMA,operation:change.operation,items:[change.item]};
   return request("/api/v2/notifications/intents",token,body);
  },
  async flush({changes,onAck}){
   if(!Array.isArray(changes)||changes.length>1200||typeof onAck!=="function")
    throw fail("INVALID_NOTIFICATION_FLUSH");
   let applied=0;
   for(const change of changes){
    await this.submit(change);
    // The host MUST commit journalEntry durably before advancing to the next
    // operation; network failures are retried by the host, never silently ACKed.
    await onAck(change);
    applied++;
   }
   return {applied};
  }
 });
}