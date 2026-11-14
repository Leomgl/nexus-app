/* Synced from Leomgl/link-app PR #5: do not edit independently. */
/**
 * LINK · Shared "Me notifier" schedule contract v1.
 * A source app renders/edits rules; only LINK delivers Web Push.
 * No business title, medical record, recipient or push endpoint is accepted.
 */
export const NOTIFICATION_SCHEDULE_SCHEMA="link.notification.schedule.v1";
export const NOTIFICATION_SCHEDULE_MAX_RULES=5;
export const NOTIFICATION_SCHEDULE_UNITS=Object.freeze(["days","hours","minutes"]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const MAX_UNITS=Object.freeze({days:90,hours:2160,minutes:129600});
const own=(x,keys)=>x&&typeof x==="object"&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const error=code=>Object.assign(new Error(code),{code});
const utc=s=>typeof s==="string"&&ISO.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
export const emptyNotificationSchedule=()=>({
 schema:NOTIFICATION_SCHEDULE_SCHEMA,enabled:false,rules:[]
});
/**
 * Rejects extra properties so other app payloads cannot piggyback personal
 * data into LINK's notification intentions.
 */
export function validateNotificationSchedule(value){
 if(!own(value,["schema","enabled","rules"])||
    value.schema!==NOTIFICATION_SCHEDULE_SCHEMA||
    typeof value.enabled!=="boolean"||!Array.isArray(value.rules)||
    value.rules.length>NOTIFICATION_SCHEDULE_MAX_RULES)
  throw error("INVALID_NOTIFICATION_SCHEDULE");
 const ids=new Set();
 const rules=value.rules.map(rule=>{
  if(!rule||typeof rule!=="object"||Array.isArray(rule)||
     typeof rule.id!=="string"||!UUID.test(rule.id)||
     ids.has(rule.id.toLowerCase()))
   throw error("INVALID_NOTIFICATION_RULE");
  ids.add(rule.id.toLowerCase());
  if(rule.kind==="relative"){
   if(!own(rule,["id","kind","unit","value"])||
      !Object.hasOwn(MAX_UNITS,rule.unit)||
      !Number.isInteger(rule.value)||rule.value<1||
      rule.value>MAX_UNITS[rule.unit])
    throw error("INVALID_RELATIVE_NOTIFICATION");
   return Object.freeze({...rule,id:rule.id.toLowerCase()});
  }
  if(rule.kind==="fixed"){
   if(!own(rule,["id","kind","at"])||!utc(rule.at))
    throw error("INVALID_FIXED_NOTIFICATION");
   return Object.freeze({...rule,id:rule.id.toLowerCase()});
  }
  throw error("INVALID_NOTIFICATION_RULE");
 });
 return Object.freeze({schema:NOTIFICATION_SCHEDULE_SCHEMA,
  enabled:value.enabled,rules:Object.freeze(rules)});
}
/**
 * Resolve the user's requested notifications into UTC instants on the
 * source PWA (not in the Worker). "Days" are LOCAL CALENDAR DAYS before
 * the event, preserving local wall-clock time through DST changes.
 * Hours/minutes represent elapsed time. Absolute dates never follow edits.
 * A source app MUST run this in the relevant event timezone. v1 uses the
 * user's device timezone; foreign-event zones need a dedicated adapter.
 *
 * Returns opaque rule references and timestamps ONLY, no subject/content.
 * The app must generate one stable occurrence ID from business entity ID +
 * rule.id + recurrence occurrence ID. NEVER include fireAt/eventAt in it.
 */
export function resolveNotificationSchedule(config,{
 eventAt=null,now=new Date().toISOString(),horizonDays=90
}={}){
 const s=validateNotificationSchedule(config);
 if(!utc(now)||!(eventAt===null||utc(eventAt))||
    !Number.isInteger(horizonDays)||horizonDays<1||horizonDays>90)
  throw error("INVALID_NOTIFICATION_SCHEDULE_CLOCK");
 if(!s.enabled)return [];
 const t0=Date.parse(now),latest=t0+horizonDays*86400000;
 const seen=new Set(),result=[];
 for(const rule of s.rules){
  let fire;
  if(rule.kind==="fixed")fire=new Date(rule.at);
  else {
   if(eventAt===null)throw error("RELATIVE_RULE_NEEDS_EVENT_DATE");
   fire=new Date(eventAt);
   if(rule.unit==="days")fire.setDate(fire.getDate()-rule.value);
   else fire=new Date(fire.getTime()-rule.value*(rule.unit==="hours"?3600000:60000));
  }
  const stamp=fire.getTime();
  if(!Number.isFinite(stamp))throw error("INVALID_NOTIFICATION_SCHEDULE_CLOCK");
  if(stamp<t0-300000||stamp>latest)continue;
  const dueAt=fire.toISOString();
  if(seen.has(dueAt))continue;
  seen.add(dueAt);
  result.push(Object.freeze({ruleId:rule.id,kind:rule.kind,dueAt}));
 }
 return result.sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
}
