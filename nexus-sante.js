(function nexusHealth(){
'use strict';
const ORIGIN="https://sante-app.q9pfwtztsc.workers.dev/";
const PREF="nexus_sante_link_v1";
let api=null,busy=false,timer=null,hubTimer=null,hubAutoBusy=false,hubLifecycleBound=false,lastHubSync=0;
const CORE=()=>window.SanteLinkCore;
const state=()=>api?.state?.()||{};
const esc=s=>api?.escape?.(s)??String(s??"");
const svg=s=>api?.svg?.(s)||"";
const pair=()=>state().linkConnections?.find(v=>v.sourceApp==="sante")||null;
const opt=()=>{try{return {...{autoEvents:false,sendMedical:false},...JSON.parse(localStorage.getItem(PREF)||"{}")};}catch{return {autoEvents:false,sendMedical:false};}};
const setOpt=x=>{try{localStorage.setItem(PREF,JSON.stringify(x));}catch{}};
const day=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
function validDaily(v){
 if(!v||v.type!=="sante.daily.v1"||v.sourceApp!=="sante"||!/^\d{4}-\d{2}-\d{2}$/.test(v.day)||!Number.isSafeInteger(v.total)||v.total<0||v.total>200||
    !Number.isSafeInteger(v.done)||v.done<0||v.done>v.total||!Array.isArray(v.items)||v.items.length>80)return null;
 const items=[];
 for(const row of v.items){
  if(typeof row?.id!=="string"||row.id.length>100||typeof row.time!=="string"||!/^\d\d:\d\d$/.test(row.time)||typeof row.done!=="boolean"||
     typeof row.name!=="string"||row.name.length>110)return null;
  items.push({id:row.id,name:row.name,time:row.time,done:row.done});
 }
 let hydration=null;
 if(v.hydration!==undefined){
  const h=v.hydration;
  if(!h||h.day!==v.day||!Number.isInteger(h.fluidMl)||h.fluidMl<0||h.fluidMl>400000||
   !Number.isInteger(h.waterMl)||h.waterMl<0||h.waterMl>h.fluidMl||
   !Number.isFinite(h.caffeineMg)||h.caffeineMg<0||h.caffeineMg>40000||
   !Number.isInteger(h.entries)||h.entries<0||h.entries>20000||
   !Number.isInteger(h.targetMl)||h.targetMl<250||h.targetMl>6000)return null;
  hydration={day:h.day,fluidMl:h.fluidMl,waterMl:h.waterMl,caffeineMg:h.caffeineMg,entries:h.entries,targetMl:h.targetMl};
 }
 return {day:v.day,total:v.total,done:v.done,remaining:v.total-v.done,activeCount:Math.min(100,Math.max(0,Number(v.activeCount)||0)),items,hydration,sharedAt:v.sharedAt||new Date().toISOString()};
}
function validCalendar(v){
 if(!v||v.type!=="sante.calendar.v1"||v.sourceApp!=="sante"||!Array.isArray(v.events)||v.events.length>48||!Number.isSafeInteger(v.revision))return null;
 const ids=new Set(),events=[];
 for(const e of v.events){
  if(typeof e?.id!=="string"||!/^[0-9a-f-]{36}$/i.test(e.id)||ids.has(e.id)||!["appointment","vaccine"].includes(e.kind)||
     typeof e.title!=="string"||e.title.length>140||!Number.isFinite(Date.parse(e.start))||
     typeof e.location!=="string"||e.location.length>200||typeof e.deleted!=="boolean")return null;
  ids.add(e.id);events.push({id:e.id,kind:e.kind,title:e.title,start:e.start,location:e.location,deleted:e.deleted});
 }
 return {revision:v.revision,events,sharedAt:v.sharedAt||new Date().toISOString()};
}
function healthWidget(){
 const d=state().santeDaily?.[0],p=pair();
 const head=`<header class="nxp-widget-heading"><div><span class="nxp-kicker">SANTÉ · AUJOURD’HUI</span><h2>Santé au quotidien</h2></div>${svg("check")}</header>`;
 if(!p)return `<section class="nxp-widget nxsh-widget">${head}<p class="nxp-muted">Retrouve ici l'avancement de tes prises, synchronisé depuis Santé après ton autorisation.</p><button class="nxp-small-action" data-action="sante-open-settings">Connecter Santé</button></section>`;
 if(!d)return `<section class="nxp-widget nxsh-widget">${head}<p class="nxp-muted">Connexion créée. Ouvre Santé → ⚙️ → Nexus LINK, colle le code puis synchronise.</p><button class="nxp-small-action" data-action="sante-receive">Recevoir le suivi</button></section>`;
 if(d.day!==day())return `<section class="nxp-widget nxsh-widget">${head}<p class="nxp-muted">Dernier suivi reçu le ${esc(d.day)}. Pour les prises du jour, ouvre Santé puis synchronise.</p><button class="nxp-small-action" data-action="sante-receive">Actualiser</button></section>`;
 const percent=d.total?Math.round(d.done/d.total*100):0;
 return `<section class="nxp-widget nxsh-widget">${head}
  <div class="nxsh-progress"><strong>${d.done}<span> / ${d.total}</span></strong><small>prises confirmées aujourd’hui</small></div>
  <div class="nxp-budget-track"><i style="width:${percent}%"></i></div>
  ${d.items.slice(0,5).map(v=>`<div class="nxsh-dose"><span>${esc(v.time)}</span><strong>${esc(v.name||"Traitement")}</strong><small class="${v.done?"is-done":""}">${v.done?"✓ Pris":"À confirmer"}</small></div>`).join("")}
  ${d.hydration?`<div class="nxsh-hydration"><div class="nxsh-hydro-head"><b>💧 Boissons du jour</b><span>${d.hydration.fluidMl} / ${d.hydration.targetMl} ml</span></div><div class="nxp-budget-track"><i style="width:${Math.min(100,Math.round(100*d.hydration.fluidMl/d.hydration.targetMl))}%"></i></div><small>Eau : ${d.hydration.waterMl} ml · Caféine estimée : ${Math.round(d.hydration.caffeineMg)} mg</small></div>`:""}
  <p class="nxp-hint">Mise à jour depuis Santé · ${esc(new Date(d.sharedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}))}. Les confirmations se font dans Santé.</p>
  <button class="nxp-small-action" data-action="sante-receive">Rafraîchir</button>
  <a class="nxp-small-action" href="${ORIGIN}" target="_blank" rel="noopener noreferrer">Ouvrir Santé</a>
 </section>`;
}
function settingsCard(){
 const p=pair(),calendar=state().santeCalendars?.[0],prefs=opt(),d=state().santeDaily?.[0];
 return `<section class="preferences-panel nxsh-settings"><div class="pref-heading">${svg("shield")}<div><h2>Santé ↔ Nexus</h2><p>Suivi de tes prises dans Pulse et, sur autorisation depuis Santé, résumé des boissons. Notifications d’agenda pilotées par Nexus.</p></div></div>
 ${!p?`<div class="info-strip">🔐 Avec ton accord, Nexus stockera localement le résumé des prises et les rendez-vous importés. Ses données IndexedDB ne sont pas chiffrées au repos. Les échanges transitent chiffrés par un relais distinct.</div>
 <div class="form-actions"><button type="button" class="btn btn-soft btn-small" data-action="sante-create">Créer la connexion privée</button></div>`:
 `<div class="info-strip">Connexion active : progression des prises et calendrier Santé. Le résumé agrégé des boissons est envoyé uniquement après activation explicite dans Santé. Les journaux, bilans, documents et diagnostics ne sont pas transférés.</div>
 <label class="field"><span>Code de jumelage à coller dans Santé → ⚙️ → Nexus LINK</span><textarea id="nxsh-code" rows="3" readonly style="width:100%;overflow-wrap:anywhere">${esc(CORE().invitation(p))}</textarea></label>
 <div class="form-actions">
 <button class="btn btn-soft btn-small" data-action="sante-copy">Copier le code</button>
 <button class="btn btn-soft btn-small" data-action="sante-receive">Recevoir</button>
 <button class="btn btn-soft btn-small" data-action="sante-hub-receive">Recevoir via LINK</button>
 <button class="btn btn-danger btn-small" data-action="sante-revoke">Révoquer et effacer</button></div>
 <div class="settings-option"><div><strong>Agenda et notifications Santé</strong><p>${calendar?`${calendar.events.length} événements reçus`:"Aucun rendez-vous reçu"} · Les prises de traitement restent notifiées par Santé.</p></div>
 <button class="btn btn-soft btn-small" data-action="sante-toggle-auto">${prefs.autoEvents?"Import automatique activé":"Activer l'import auto"}</button></div>
 <div class="form-actions"><button class="btn btn-neutral btn-small" data-action="sante-import">Importer ou mettre à jour l’Agenda</button></div>
 <div class="settings-option"><div><strong>Agenda médical ↔ Santé</strong><p>Synchronise dans les deux sens les rendez-vous cochés « Médical », ainsi que les rendez-vous médicaux reconnaissables par leur titre. Le transfert est chiffré, sans notes cliniques. ${state().events.filter(e=>medical(e)).length} rendez-vous détecté(s).</p></div><button class="btn btn-soft btn-small" data-action="sante-toggle-send">${prefs.sendMedical?"Arrêter l’envoi vers Santé":"Activer la synchronisation ↔"}</button></div>
 <div class="form-actions"><button class="btn btn-neutral btn-small" data-action="sante-send">Envoyer l’agenda vers Santé</button></div>
 <div class="form-actions"><button class="btn btn-neutral btn-small" data-action="sante-hub-send">Envoyer l’agenda via LINK</button></div>
 <p class="pref-hint">Pour les modifications simultanées, le rendez-vous local est préservé et signalé, jamais écrasé automatiquement. Santé reçoit les modifications quand elle est ouverte et son coffre déverrouillé.</p>
 <p class="pref-hint">Une importation ne remplace pas les rendez-vous saisis manuellement sans provenance. En cas de modification locale d'un RDV importé, une divergence est conservée pour examen au lieu de l’écraser.</p>
 <p class="pref-hint">Dernier suivi : ${d?esc(d.day):"jamais"}. Synchronisation lorsque Santé publie et que Nexus reçoit ; pas en temps réel lorsque les apps sont fermées.</p>`}
 <p class="pref-hint"><a href="${ORIGIN}" target="_blank" rel="noopener noreferrer">Ouvrir Santé</a> · La fiche médicale complète ne quitte pas Santé.</p></section>`;
}
async function create(){
 if(pair()||busy)return;
 if(!confirm("Autoriser Nexus à recevoir un résumé de tes traitements et des rendez-vous Santé ? Ces données seront enregistrées en local dans Nexus, dont le stockage n'est pas chiffré au repos."))return;
 busy=true;
 try{const p=await CORE().createPair("sante",["dose_summary","health_calendar"]);state().linkConnections.push(p);await api.persist();api.render();api.toast("Connexion créée : copie le code dans Santé.");}
 catch(e){api.toast("Jumelage impossible : "+(e.message||"Erreur réseau"));}
 finally{busy=false;}
}

const MEDICAL_RE=/médecin|docteur|dentiste|h[oô]pital|consultation|kin[eé]|ost[eé]o|radiolog|prise de sang|vaccin|psycholog|psychiatr|dermatol|cardiolog|ophtalmo|scanner|irm\b|laboratoire|gyn[eé]c|chirurg|infirmi|rendez-vous m[eé]dical|rdv m[eé]dical|\bpsy\b/i;
const medical=e=>!(e?.originApp==="sante"&&e?.originSourceId?.startsWith("vaccine:"))&&(e?.healthSync===true||(e?.healthSync!==false&&(e?.originApp==="sante"&&e?.originSourceId?.startsWith("appointment:")||MEDICAL_RE.test(String(e?.title||"")))));
const isoStart=s=>{const d=new Date(s);return Number.isFinite(d.getTime())?d.toISOString():null;};
const localStart=s=>{const d=new Date(s);if(!Number.isFinite(d.getTime()))return "";return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")+"T"+[String(d.getHours()).padStart(2,"0"),String(d.getMinutes()).padStart(2,"0")].join(":")+":00";};
const keyOf=e=>e?.healthSyncId||(e?.originApp==="sante"&&e.originSourceId?.startsWith("appointment:")?e.originSourceId.slice(12):e?.id);
const same=(e,v)=>e.title===v.title&&isoStart(e.start)===isoStart(v.start)&&String(e.location||"")===String(v.location||"");
const safeEvent=e=>!e.userEdited&&e.title===e.syncedTitle&&isoStart(e.start)===isoStart(e.syncedStart)&&String(e.location||"")===String(e.syncedLocation||"");
function recordBase(e){return e.syncedTitle!==undefined?{title:e.syncedTitle,start:isoStart(e.syncedStart),location:e.syncedLocation||"",deleted:false}:null;}
let sendTimer=null,sending=false;
function markChange(previous,current){
 if(!medical(previous)&&!medical(current))return;
 const d=state();
 d.santeNexusRevision=Math.min(1000000,Math.max(0,Number(d.santeNexusRevision)||0)+1);
 d.santeHealthTombstones=Array.isArray(d.santeHealthTombstones)?d.santeHealthTombstones:[];
 if(medical(current))d.santeHealthTombstones=d.santeHealthTombstones.filter(t=>t.id!==keyOf(current));
 if(previous&&current&&!same(previous,current))current.userEdited=Boolean(previous.syncedTitle!==undefined);
 queueSend();
}
function markDeleted(e){
 if(!medical(e))return;
 const d=state(),id=keyOf(e);
 if(!/^[0-9a-f-]{36}$/i.test(id||""))return;
 d.santeHealthTombstones=Array.isArray(d.santeHealthTombstones)?d.santeHealthTombstones:[];
 d.santeHealthTombstones=d.santeHealthTombstones.filter(t=>t.id!==id);
 d.santeHealthTombstones.push({id,deletedAt:new Date().toISOString(),base:recordBase(e)});
 d.santeHealthTombstones=d.santeHealthTombstones.slice(-80);
 d.santeNexusRevision=Math.min(1000000,Math.max(0,Number(d.santeNexusRevision)||0)+1);
 queueSend();
}
function markRestored(e){if(!medical(e))return;const d=state();d.santeHealthTombstones=(d.santeHealthTombstones||[]).filter(t=>t.id!==keyOf(e));d.santeNexusRevision=Math.min(1000000,Math.max(0,Number(d.santeNexusRevision)||0)+1);queueSend();}
function outgoing(){
 const current=state().events.filter(e=>medical(e)&&!!isoStart(e.start)&&/^[0-9a-f-]{36}$/i.test(keyOf(e)||"")).map(e=>({
  id:keyOf(e),title:String(e.title).slice(0,140),start:isoStart(e.start),location:String(e.location||"").slice(0,180),
  deleted:false,...(recordBase(e)?{base:recordBase(e)}:{})
 }));
 const deleted=(state().santeHealthTombstones||[]).filter(t=>/^[0-9a-f-]{36}$/i.test(t.id||"")).map(t=>({
  id:t.id,title:"",start:t.deletedAt,location:"",deleted:true,...(t.base?{base:t.base}:{})
 }));
 const unique=new Map([...current,...deleted].map(v=>[v.id,v]));
 return [...unique.values()].slice(0,96);
}
function queueSend(){clearTimeout(sendTimer);if(pair()&&opt().sendMedical)sendTimer=setTimeout(()=>{sendTimer=null;scheduleHubSync(true);},1700);}
async function sendCalendar(){
 const p=pair();if(!p||!opt().sendMedical||sending)return false;
 sending=true;
 try{
  const events=outgoing(),revision=Math.max(1,Number(state().santeNexusRevision)||1),pages=Math.max(1,Math.ceil(events.length/12));
  for(let page=0;page<pages;page++)await CORE().publish(p,{
   entityId:"nexus:calendar:"+page,revision,scope:"health_calendar",
   payload:{type:"nexus.calendar.v1",sourceApp:"nexus",revision,page,pages,events:events.slice(page*12,(page+1)*12),sharedAt:new Date().toISOString()}
  });
  return true;
 }catch(e){api?.toast?.("Envoi Agenda → Santé indisponible : "+(e.message||"Connexion")) ;return false;}
 finally{sending=false;}
}
function reconcile(){
 const cal=state().santeCalendars?.[0];if(!cal)return {changed:0,conflicts:0};
 let changed=0,conflicts=0;
 for(const item of cal.events){
  const sourceId=item.kind+":"+item.id;
  const old=state().events.find(e=>e.originApp==="sante"&&e.originSourceId===sourceId)||
   (item.kind==="appointment"?state().events.find(e=>medical(e)&&(keyOf(e)===item.id||(!e.healthSyncId&&same(e,item)))):null);
  if(item.deleted){
   if(old&&item.kind==="appointment"&&!safeEvent(old)&&!same(old,item)){old.healthConflict=true;conflicts++;continue;}
   if(old){state().events=state().events.filter(x=>x!==old);changed++;}
   continue;
  }
  const now=new Date().toISOString(),start=localStart(item.start);
  if(!start)continue;
  if(old){
   if(old.sourceRevision>cal.revision)continue;
   if(old.userEdited||old.syncedTitle!==undefined&&!safeEvent(old)){
    if(!same(old,item)){
     // Same upstream baseline means our local edit is still awaiting upload; a changed upstream is a conflict.
     const remoteUnchanged=old.syncedTitle===item.title&&isoStart(old.syncedStart)===isoStart(item.start)&&String(old.syncedLocation||"")===item.location;
     if(!remoteUnchanged){old.healthConflict=true;conflicts++;}
     continue;
    }
   }
   Object.assign(old,{title:item.title,start,location:item.location,updatedAt:now,
    healthSync:item.kind==="appointment",healthSyncId:item.id,healthConflict:false,userEdited:false,
    sourceRevision:cal.revision,syncedTitle:item.title,syncedStart:start,syncedLocation:item.location});
   changed++;
  }else{
   state().events.push({id:crypto.randomUUID(),originApp:"sante",originSourceId:sourceId,originPairId:pair()?.id,sourceRevision:cal.revision,
    healthSync:item.kind==="appointment",healthSyncId:item.id,healthConflict:false,userEdited:false,
    title:item.title,start,location:item.location,details:"Importé depuis Santé · notifications gérées par Nexus",
    reminderMinutes:item.kind==="vaccine"?[10080,1440]:[1440,60],personId:"",projectId:"",noteId:null,createdAt:now,updatedAt:now,
    syncedTitle:item.title,syncedStart:start,syncedLocation:item.location});
   changed++;
  }
 }
 return {changed,conflicts};
}
async function receive(){
 const p=pair();if(!p||busy)return false;
 busy=true;let total=0,conflicts=0;
 try{
  const list=await CORE().inbox(p);
  for(const message of list){
   if(message.invalid||!Number.isSafeInteger(message.revision)||message.revision<1)continue;
   if(message.scope==="dose_summary"){
    const d=validDaily(message.payload);if(!d)continue;
    state().santeDaily=[{...d,sourceRevision:message.revision,pairId:p.id}];
    await api.persist();
    if(await api.verify("daily",p.id,message.revision)){await CORE().acknowledge(p,message.id);total++;}
   }else if(message.scope==="health_calendar"){
    const d=validCalendar(message.payload);if(!d)continue;
    if((state().santeCalendars?.[0]?.sourceRevision||0)>message.revision){await CORE().acknowledge(p,message.id);continue;}
    state().santeCalendars=[{...d,pairId:p.id,sourceRevision:message.revision}];
    if(opt().autoEvents){const count=reconcile();conflicts+=count.conflicts;}
    await api.persist();
    if(await api.verify("calendar",p.id,message.revision)){await CORE().acknowledge(p,message.id);total++;}
   }
  }
  if(total)api.safeRender?.();api.toast(total?`${total} information(s) Santé reçue(s)${conflicts?` · ${conflicts} divergence(s) à examiner`:""}`:"Santé : rien de nouveau à recevoir.");
  return true;
 }catch(e){api.toast("Santé LINK indisponible : "+(e.message||"Erreur réseau"));return false;}
 finally{busy=false;}
}
async function receiveHub({quiet=false}={}){
 const p=pair();
 if(!p||!window.LinkHubBus)throw Error("Configure le jumelage privé Santé/Nexus avant LINK.");
 let imported=0,conflicts=0;
 const daily=await window.LinkHubBus.receive({pair:p,from:"sante",
  contractId:"sante-summary-nexus",scopes:["dose_summary"],limit:30,
  persist:async ({payload,revision})=>{
   const parsed=validDaily(payload);
   if(!parsed)throw Error("RÉSUMÉ_SANTÉ_NON_VALIDÉ");
   const prev=state().santeDaily?.[0];
   if(prev?.sourceRevision>revision)return {durable:true,status:"persisted"};
   if(prev?.sourceRevision===revision&&JSON.stringify({...prev,sourceRevision:undefined,pairId:undefined})!==
     JSON.stringify({...parsed,sourceRevision:undefined,pairId:undefined}))
    throw Error("RÉVISION_RÉSUMÉ_CONTRADICTOIRE");
   state().santeDaily=[{...parsed,sourceRevision:revision,pairId:p.id}];
   try{
    await api.persist();
    if(!await api.verify("daily",p.id,revision))throw Error("RÉSUMÉ_NON_PERSISTÉ");
   }catch(e){state().santeDaily=prev?[prev]:[];throw e}
   imported++;
   return {durable:true,status:"persisted"};
  }});
 const calendar=await window.LinkHubBus.receive({pair:p,from:"sante",
  contractId:"sante-calendar-nexus",scopes:["health_calendar"],limit:30,
  persist:async ({payload,revision})=>{
   const parsed=validCalendar(payload);
   if(!parsed||parsed.revision!==revision)throw Error("CALENDRIER_SANTÉ_NON_VALIDÉ");
   const prev=state().santeCalendars?.[0];
   if(prev?.sourceRevision>revision)return {durable:true,status:"persisted"};
   if(prev?.sourceRevision===revision&&
    JSON.stringify(prev.events)!==JSON.stringify(parsed.events))
    throw Error("RÉVISION_CALENDRIER_CONTRADICTOIRE");
   state().santeCalendars=[{...parsed,pairId:p.id,sourceRevision:revision}];
   const originalEvents=(state().events||[]).slice().map(x=>({...x}));
   let result={changed:0,conflicts:0};
   try{
    if(opt().autoEvents){result=reconcile();conflicts+=result.conflicts}
    await api.persist();
    if(!await api.verify("calendar",p.id,revision))throw Error("CALENDRIER_NON_PERSISTÉ");
   }catch(e){
    state().santeCalendars=prev?[prev]:[];state().events=originalEvents;throw e;
   }
   imported++;return {durable:true,status:"persisted"};
  }});
 if(!quiet)api.toast("LINK : "+(daily.acknowledged+calendar.acknowledged)+" message(s) Santé confirmés"+
  (conflicts?" · "+conflicts+" divergence(s) conservée(s)":"")+
  (daily.failed+calendar.failed?" · reprises nécessaires":"")+".");
 if(imported>0)api.safeRender?.();
 return {daily,calendar,imported,conflicts};
}
async function sendHubCalendar({interactive=true,quiet=false}={}){
 const p=pair();
 if(!p||!window.LinkHubBus||!opt().sendMedical)
  throw Error("Active d’abord le partage d’agenda Santé dans Nexus.");
 if(interactive&&!confirm("Envoyer à Santé via LINK uniquement tes rendez-vous médicaux chiffrés, sans notes ni pièces jointes ?"))return false;
 const events=outgoing(),pages=Math.max(1,Math.ceil(events.length/12));
 if(pages>8)throw Error("Trop de rendez-vous pour cette liaison.");
 const digest=[...new Uint8Array(await crypto.subtle.digest("SHA-256",
  new TextEncoder().encode(JSON.stringify(events))))]
  .map(v=>v.toString(16).padStart(2,"0")).join("");
 let ledger=state().santeHubCalendarOutbox;
 if(ledger?.fingerprint===digest&&ledger?.deliveredAt){if(!quiet)api.toast("Calendrier LINK déjà à jour.");return true}
 const fresh=!ledger?.pending||ledger?.pending.fingerprint!==digest;
 const pending=fresh?{
  fingerprint:digest,revision:Math.max(1,Number(state().santeNexusRevision)||1,
   Number(ledger?.revision||0)+1),
  pages,nextIndex:0,sharedAt:new Date().toISOString(),events
 }:ledger.pending;
 if(!Number.isSafeInteger(pending.revision)||pending.revision>1000000)
  throw Error("Limite des révisions atteinte.");
 if(fresh){
  state().santeHubCalendarOutbox={fingerprint:digest,revision:pending.revision,pending};
  await api.persist();
 }
 for(let page=pending.nextIndex;page<pending.pages;page++){
  await window.LinkHubBus.publish({pair:p,from:"nexus",to:"sante",
   contractId:"sante-calendar-nexus",scope:"health_calendar",revision:pending.revision,
   entityId:"nexus:calendar:"+page,schemaVersion:"nexus.calendar.v1",
   payload:{type:"nexus.calendar.v1",sourceApp:"nexus",revision:pending.revision,
    page,pages:pending.pages,events:pending.events.slice(page*12,(page+1)*12),
    sharedAt:pending.sharedAt}});
  state().santeHubCalendarOutbox={fingerprint:digest,revision:pending.revision,
   pending:{...pending,nextIndex:page+1}};
  await api.persist();
 }
 state().santeHubCalendarOutbox={fingerprint:digest,revision:pending.revision,
  deliveredAt:new Date().toISOString()};
 await api.persist();
 if(!quiet)api.toast("Calendrier chiffré envoyé à LINK.");
 return true;
}
async function importCalendar(){
 if(!pair())return;
 const cal=state().santeCalendars?.[0];if(!cal){api.toast("Reçois d’abord un calendrier depuis Santé.");return;}
 if(!confirm("Importer ou actualiser les rendez-vous Santé dans Agenda Nexus ? Nexus gérera leurs rappels iPhone."))return;
 const result=reconcile();await api.persist();api.render();api.toast(`${result.changed} rendez-vous actualisé(s)${result.conflicts?` ; ${result.conflicts} divergence(s) conservée(s)`:""}.`);
}
async function revoke(){
 const p=pair();if(!p||busy)return;
 if(!confirm("Révoquer le lien Santé, supprimer le suivi reçu et les événements Nexus importés depuis Santé ? Cela peut aussi annuler leurs notifications."))return;
 busy=true;try{await CORE().revoke(p);state().linkConnections=state().linkConnections.filter(x=>x.id!==p.id);state().santeDaily=[];state().santeCalendars=[];state().events=state().events.filter(x=>!(x.originApp==="sante"&&x.originPairId===p.id));await api.persist();api.render();api.toast("Liaison Santé révoquée.");}
 catch(e){api.toast("Révocation impossible : "+(e.message||"Erreur réseau"));}
 finally{busy=false;}
}
async function act(kind){
 if(kind==="sante-open-settings"){api.openSettings?.();return true;}
 if(kind==="sante-create")return create();
 if(kind==="sante-copy"){const input=document.getElementById("nxsh-code");if(!input)return true;try{await navigator.clipboard.writeText(input.value);api.toast("Code copié.");}catch{input.select();api.toast("Sélectionne le code pour le copier.");}return true;}
 if(kind==="sante-receive")return receive();
 if(kind==="sante-hub-receive"){try{await receiveHub()}catch(e){api.toast("LINK : "+String(e.message||e).slice(0,90))}return true;}
 if(kind==="sante-hub-send"){try{await sendHubCalendar()}catch(e){api.toast("LINK : "+String(e.message||e).slice(0,90))}return true;}
 if(kind==="sante-import")return importCalendar();
 if(kind==="sante-send"){await sendCalendar();api.toast("Envoi vers Santé effectué ou déjà en attente.");return true;}
 if(kind==="sante-toggle-send"){
  const prefs=opt();if(!prefs.sendMedical&&!confirm("Synchroniser les rendez-vous médicaux de Nexus vers le coffre Santé par NEXUS LINK chiffré ? Seuls intitulé, date, heure et lieu seront partagés ; jamais les notes."))return true;
  setOpt({...prefs,sendMedical:!prefs.sendMedical,autoEvents:!prefs.sendMedical?true:prefs.autoEvents});if(!prefs.sendMedical){state().santeNexusRevision=Math.max(1,Number(state().santeNexusRevision)||1);await api.persist();void sendCalendar();}api.render();return true;
 }
 if(kind==="sante-toggle-auto"){
  const prefs=opt();
  if(!prefs.autoEvents){
    if(!confirm("Autoriser les prochains rendez-vous Santé à rejoindre automatiquement l’Agenda Nexus, avec notifications iPhone selon ses réglages ?"))return true;
    const cal=state().santeCalendars?.[0];
    if(cal){const result=reconcile();await api.persist();api.toast(result.conflicts?result.conflicts+" divergence(s) conservée(s).":result.changed+" événement(s) synchronisé(s).");}
  }
  setOpt({...prefs,autoEvents:!prefs.autoEvents});api.render();return true;
 }
 if(kind==="sante-revoke")return revoke();
 return false;
}
async function runHubSync(force=false){
 if(!pair()||hubAutoBusy||typeof navigator!=="undefined"&&navigator.onLine===false)return;
 if(typeof document!=="undefined"&&document.visibilityState==="hidden")return;
 const now=Date.now();if(!force&&now-lastHubSync<30000)return;
 lastHubSync=now;hubAutoBusy=true;
 try{
  await receiveHub({quiet:true});
  if(opt().sendMedical)await sendHubCalendar({interactive:false,quiet:true});
 }catch(error){
  console.warn("NEXUS LINK Santé Hub différé",error?.message||error);
  try{await receive()}catch{}
  if(opt().sendMedical)try{await sendCalendar()}catch{}
 }finally{hubAutoBusy=false}
}
function scheduleHubSync(force=false){
 clearTimeout(hubTimer);hubTimer=setTimeout(()=>void runHubSync(force),750);
}
function init(){
 if(hubLifecycleBound)return;hubLifecycleBound=true;
 if(typeof window==="undefined"||typeof document==="undefined")return;
 window.addEventListener("online",()=>scheduleHubSync(true));
 window.addEventListener("focus",()=>scheduleHubSync(false));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden) scheduleHubSync(false);});
 if(pair())scheduleHubSync(true);
}
function attach(adapter){api=adapter;}
window.NexusSanteBridge=Object.freeze({attach,init,scheduleHubSync,runHubSync,widget:healthWidget,settingsCard,receive,receiveHub,act,validDaily,validCalendar,medical,markChange,markDeleted,markRestored,outgoing,sendCalendar,sendHubCalendar});
})();