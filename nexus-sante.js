(function nexusHealth(){
'use strict';
const ORIGIN="https://sante-app.q9pfwtztsc.workers.dev/";
const PREF="nexus_sante_link_v1";
let api=null,busy=false,timer=null;
const CORE=()=>window.SanteLinkCore;
const state=()=>api?.state?.()||{};
const esc=s=>api?.escape?.(s)??String(s??"");
const svg=s=>api?.svg?.(s)||"";
const pair=()=>state().linkConnections?.find(v=>v.sourceApp==="sante")||null;
const opt=()=>{try{return {...{autoEvents:false},...JSON.parse(localStorage.getItem(PREF)||"{}")};}catch{return {autoEvents:false};}};
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
 return {day:v.day,total:v.total,done:v.done,remaining:v.total-v.done,activeCount:Math.min(100,Math.max(0,Number(v.activeCount)||0)),items,sharedAt:v.sharedAt||new Date().toISOString()};
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
 const head=`<header class="nxp-widget-heading"><div><span class="nxp-kicker">SANTÉ · AUJOURD’HUI</span><h2>Mes traitements</h2></div>${svg("check")}</header>`;
 if(!p)return `<section class="nxp-widget nxsh-widget">${head}<p class="nxp-muted">Retrouve ici l'avancement de tes prises, synchronisé depuis Santé après ton autorisation.</p><button class="nxp-small-action" data-action="sante-open-settings">Connecter Santé</button></section>`;
 if(!d)return `<section class="nxp-widget nxsh-widget">${head}<p class="nxp-muted">Connexion créée. Ouvre Santé → ⚙️ → Nexus LINK, colle le code puis synchronise.</p><button class="nxp-small-action" data-action="sante-receive">Recevoir le suivi</button></section>`;
 if(d.day!==day())return `<section class="nxp-widget nxsh-widget">${head}<p class="nxp-muted">Dernier suivi reçu le ${esc(d.day)}. Pour les prises du jour, ouvre Santé puis synchronise.</p><button class="nxp-small-action" data-action="sante-receive">Actualiser</button></section>`;
 const percent=d.total?Math.round(d.done/d.total*100):0;
 return `<section class="nxp-widget nxsh-widget">${head}
  <div class="nxsh-progress"><strong>${d.done}<span> / ${d.total}</span></strong><small>prises confirmées aujourd’hui</small></div>
  <div class="nxp-budget-track"><i style="width:${percent}%"></i></div>
  ${d.items.slice(0,5).map(v=>`<div class="nxsh-dose"><span>${esc(v.time)}</span><strong>${esc(v.name||"Traitement")}</strong><small class="${v.done?"is-done":""}">${v.done?"✓ Pris":"À confirmer"}</small></div>`).join("")}
  <p class="nxp-hint">Mise à jour depuis Santé · ${esc(new Date(d.sharedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}))}. Les confirmations se font dans Santé.</p>
  <button class="nxp-small-action" data-action="sante-receive">Rafraîchir</button>
  <a class="nxp-small-action" href="${ORIGIN}" target="_blank" rel="noopener noreferrer">Ouvrir Santé</a>
 </section>`;
}
function settingsCard(){
 const p=pair(),calendar=state().santeCalendars?.[0],prefs=opt(),d=state().santeDaily?.[0];
 return `<section class="preferences-panel nxsh-settings"><div class="pref-heading">${svg("shield")}<div><h2>Santé ↔ Nexus</h2><p>Suivi de tes prises dans Pulse, notifications d’agenda pilotées par Nexus.</p></div></div>
 ${!p?`<div class="info-strip">🔐 Avec ton accord, Nexus stockera localement le résumé des prises et les rendez-vous importés. Ses données IndexedDB ne sont pas chiffrées au repos. Les échanges transitent chiffrés par un relais distinct.</div>
 <div class="form-actions"><button type="button" class="btn btn-soft btn-small" data-action="sante-create">Créer la connexion privée</button></div>`:
 `<div class="info-strip">Connexion active. Seules deux permissions sont accordées : progression des prises et calendrier Santé. Les documents, diagnostics et journaux ne sont pas transférés.</div>
 <label class="field"><span>Code de jumelage à coller dans Santé → ⚙️ → Nexus LINK</span><textarea id="nxsh-code" rows="3" readonly style="width:100%;overflow-wrap:anywhere">${esc(CORE().invitation(p))}</textarea></label>
 <div class="form-actions">
 <button class="btn btn-soft btn-small" data-action="sante-copy">Copier le code</button>
 <button class="btn btn-soft btn-small" data-action="sante-receive">Recevoir</button>
 <button class="btn btn-danger btn-small" data-action="sante-revoke">Révoquer et effacer</button></div>
 <div class="settings-option"><div><strong>Agenda et notifications Santé</strong><p>${calendar?`${calendar.events.length} événements reçus`:"Aucun rendez-vous reçu"} · Les prises de traitement restent notifiées par Santé.</p></div>
 <button class="btn btn-soft btn-small" data-action="sante-toggle-auto">${prefs.autoEvents?"Import automatique activé":"Activer l'import auto"}</button></div>
 <div class="form-actions"><button class="btn btn-neutral btn-small" data-action="sante-import">Importer ou mettre à jour l’Agenda</button></div>
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
function safeEvent(e){return !e.userEdited&&e.title===e.syncedTitle&&e.start===e.syncedStart&&String(e.location||"")===String(e.syncedLocation||"");}
function reconcile(){
 const cal=state().santeCalendars?.[0];if(!cal)return {changed:0,conflicts:0};
 let changed=0,conflicts=0;
 for(const item of cal.events){
  const sourceId=item.kind+":"+item.id;
  const old=state().events.find(e=>e.originApp==="sante"&&e.originSourceId===sourceId);
  if(item.deleted){
   if(old){if(safeEvent(old)){state().events=state().events.filter(x=>x!==old);changed++;}else conflicts++;}continue;
  }
  const now=new Date().toISOString();
  if(old){
   if(!safeEvent(old)){conflicts++;continue;}
   if(old.sourceRevision>=cal.revision)continue;
   Object.assign(old,{title:item.title,start:item.start,location:item.location,updatedAt:now,
    sourceRevision:cal.revision,syncedTitle:item.title,syncedStart:item.start,syncedLocation:item.location});
   changed++;
  }else{
   state().events.push({id:crypto.randomUUID(),originApp:"sante",originSourceId:sourceId,originPairId:pair()?.id,sourceRevision:cal.revision,
    title:item.title,start:item.start,location:item.location,details:"Importé depuis Santé · notifications gérées par Nexus",
    reminderMinutes:item.kind==="vaccine"?[10080,1440]:[1440,60],personId:"",projectId:"",noteId:null,createdAt:now,updatedAt:now,
    syncedTitle:item.title,syncedStart:item.start,syncedLocation:item.location});
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
 if(kind==="sante-import")return importCalendar();
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
function init(){
 if(pair())receive().catch(()=>{});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&pair())receive().catch(()=>{});});
}
function attach(adapter){api=adapter;}
window.NexusSanteBridge=Object.freeze({attach,init,widget:healthWidget,settingsCard,receive,act,validDaily,validCalendar});
})();