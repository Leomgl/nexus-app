/* Synced from Leomgl/link-app PR #5: do not edit independently. */
/**
 * LINK notification bridge for an individual business entity in any PWA.
 *
 * Source entity data (title/notes/person/location/amount) never leaves the
 * application. A per-install secret HMACs entity + rule + recurrence keys.
 * This bridge only calculates deltas. The host owns durable persistence,
 * opt-in, enrollment and the actual credential.
 */
import {
 validateNotificationSchedule,resolveNotificationSchedule
} from "./notification-schedule-config.mjs";
import {
 planAppNotificationDeltas,applyAppNotificationAcknowledgement
} from "./notification-client-sdk.mjs";

export const ENTITY_STATE_SCHEMA="link.notification.entity-state.v1";
const HEX=/^[a-f0-9]{64}$/i;
const isDictionary=v=>v!==null&&typeof v==="object"&&!Array.isArray(v)&&
 Object.getPrototypeOf(v)===Object.prototype;
const own=(v,keys)=>isDictionary(v)&&Object.keys(v).every(k=>keys.includes(k));
const fail=code=>Object.assign(new Error(code),{code});
const subtle=()=>globalThis.crypto?.subtle;
const toHex=buf=>[...new Uint8Array(buf)].map(n=>n.toString(16).padStart(2,"0")).join("");
export const emptyEntityNotificationState=()=>({
 schema:ENTITY_STATE_SCHEMA,epochs:{},ids:{},journal:{}
});

/**
 * 32 random bytes must be stored durably ONCE in the app's IndexedDB,
 * never on LINK or as part of an exported notification intent.
 */
export function newNotificationIdentitySecret(){
 if(!globalThis.crypto?.getRandomValues)throw fail("WEB_CRYPTO_UNAVAILABLE");
 return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
export async function opaqueNotificationId({
 secret,appId,entityId,ruleId,epoch,occurrenceId="single"
}={}){
 if(!HEX.test(secret||"")||!["nexus","sante","gaming","rituel","garage","vestiaire"].includes(appId)||
  typeof entityId!=="string"||!entityId||entityId.length>256||
  typeof ruleId!=="string"||!ruleId||ruleId.length>64||
  typeof epoch!=="string"||!epoch||epoch.length>64||
  typeof occurrenceId!=="string"||!occurrenceId||occurrenceId.length>128)
  throw fail("INVALID_NOTIFICATION_IDENTITY");
 const key=await subtle().importKey("raw",Uint8Array.from(secret.match(/../g),x=>parseInt(x,16)),
  {name:"HMAC",hash:"SHA-256"},false,["sign"]);
 // UTF8 JSON tuple avoids collisions between concatenated / special field values.
 const raw=new TextEncoder().encode(JSON.stringify([appId,entityId,ruleId,epoch,occurrenceId]));
 return toHex(await subtle().sign("HMAC",key,raw));
}
function validState(state){
 if(!own(state,["schema","epochs","ids","journal"])||state.schema!==ENTITY_STATE_SCHEMA||
    !isDictionary(state.epochs)||!isDictionary(state.ids)||!isDictionary(state.journal)||
    Object.keys(state.epochs).length>128||Object.keys(state.ids).length>64||
    Object.keys(state.journal).length>64)
  throw fail("INVALID_ENTITY_NOTIFICATION_STATE");
 return state;
}
/**
 * Never plan a complete snapshot across all the app's notifications:
 * completeSnapshot=true applies ONLY to the <=5 alert slots for this
 * single entity/recurrence. This avoids an expensive full-app D1 scan.
 *
 * "epochs" are retained after cancels. Cancelled opaque IDs are terminal;
 * if a user toggles notifications back on, mint a new epoch for only the
 * affected rule, rather than trying to resurrect a cancelled ID.
 *
 * Return state BEFORE network calls: persist it first. Then persist each ACK
 * via applyEntityNotificationAck. Crash/offline retries reuse the same IDs.
 */
export async function planEntityNotifications({
 secret,appId,entityId,occurrenceId="single",schedule,eventAt=null,
 category,previous=emptyEntityNotificationState(),
 now=new Date().toISOString()
}={}){
 const state=validState(previous),config=validateNotificationSchedule(schedule);
 if(!["reminder","appointment","deadline","routine","gaming","generic"].includes(category))
  throw fail("INVALID_ENTITY_NOTIFICATION_CATEGORY");
 if(!HEX.test(secret||""))throw fail("INVALID_NOTIFICATION_IDENTITY");
 const epochs={...state.epochs},ids={...state.ids},journal={...state.journal};
 const resolved=resolveNotificationSchedule(config,{eventAt,now});
 const desired=[];
 for(const rule of resolved){
  let epoch=epochs[rule.ruleId]||crypto.randomUUID();
  let id=await opaqueNotificationId({secret,appId,entityId,ruleId:rule.ruleId,epoch,occurrenceId});
  if(journal[id]?.status==="cancelled"){
   epoch=crypto.randomUUID();
   id=await opaqueNotificationId({secret,appId,entityId,ruleId:rule.ruleId,epoch,occurrenceId});
  }
  epochs[rule.ruleId]=epoch;
  ids[id]=rule.ruleId;
  desired.push({id,dueAt:rule.dueAt,category});
 }
 // Never prune an UNACKNOWLEDGED item. After a confirmed cancel, the ACK
 // rotates that rule's epoch and drops its local entry; server retains tombstone.
 const changes=planAppNotificationDeltas({previous:journal,desired,completeSnapshot:true,now});
 return {state:{schema:ENTITY_STATE_SCHEMA,epochs,ids,journal},changes};
}
export function applyEntityNotificationAck(state,change){
 validState(state);
 const journal=applyAppNotificationAcknowledgement(state.journal,change);
 if(change.operation!=="cancel")return {...state,journal};
 const id=change.item.id;
 const ruleId=state.ids[id],epochs={...state.epochs},ids={...state.ids};
 // The server keeps its cancellation tombstone. Rotate the epoch before
 // forgetting the locally cancelled ID, so a later re-enable is a NEW
 // occurrence and cannot resurrect an old delivered/cancelled notification.
 if(ruleId){
  epochs[ruleId]=crypto.randomUUID();
  delete ids[id];
 }
 delete journal[id];
 return {...state,epochs,ids,journal};
}
