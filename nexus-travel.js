/* Explicit encrypted NEXUS -> RITUEL trip sharing. Standalone reverse pair. */
'use strict';
(()=>{
 let api=null,busy=false;
 const esc=s=>api?.escape?.(s)??String(s??''),short=(s,n=110)=>String(s??'').trim().slice(0,n);
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(new Date(d+'T12:00:00').getTime())&&new Date(d+'T12:00:00').toISOString().slice(0,10)===d;
 const range=e=>{
  const start=String(e?.start||'').slice(0,10),end=String(e?.returnDate||'');
  if(e?.tripType!=='travel'||!valid(start)||!valid(end)||end<start)return null;
  const nights=Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000);
  return nights>=0&&nights<=45?{start,end,nights}:null;
 };
 const data=()=>api?.state?.()||{};
 const pair=()=>data().linkConnections?.find(p=>p.sourceApp==='rituel'&&p.scopes?.length===1&&p.scopes[0]==='trip_context')||null;
 const pairGarage=()=>data().linkConnections?.find(p=>p.sourceApp==='garage'&&p.scopes?.length===1&&p.scopes[0]==='trip_context')||null;
 const garageOutbox=()=>{if(!Array.isArray(data().travelGarageOutbox))data().travelGarageOutbox=[];return data().travelGarageOutbox;};
 const upcoming=()=>Array.isArray(data().events)?data().events.filter(e=>range(e)&&range(e).end>=today()).sort((a,b)=>a.start.localeCompare(b.start)).slice(0,30):[];
 const outbox=()=>{if(!Array.isArray(data().travelOutbox))data().travelOutbox=[];return data().travelOutbox;};
 async function fingerprint(x){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x))));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
 function settingsCard(){
  if(!api)return '';
  return '<section class="preferences-panel nx-connections-panel"><div class="pref-heading"><span aria-hidden="true">🧳</span><div><h2>Voyages → RITUEL & GARAGE</h2><p>Choisis les séjours à transmettre à une trousse Rituel ou un ensemble Garage, séparément des autres imports.</p></div></div>'+
   '<div class="settings-option"><div><strong>'+(pair()?'Connexion voyage disponible':'Connexion voyage indépendante')+
   '</strong><p>'+upcoming().length+' séjour(s) identifiés dans l’agenda.</p></div><button class="btn btn-soft btn-small" data-action="nexus-trip-open">Gérer</button></div></section>';
 }
 function show(){
  if(!api)return;
  const p=pair(),pg=pairGarage(),trips=upcoming(),code=p?window.NexusLinkCore.invitation(p):'',garageCode=pg?window.NexusLinkCore.invitation(pg):'';
  const rows=trips.map(e=>{const d=range(e);return `<div class="nx-link-scope" style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div><strong>${esc(short(e.title))}</strong><small>${d.start} → ${d.end} · ${d.nights} nuit(s)</small></div><button type="button" class="btn btn-soft btn-small" data-action="nexus-trip-send" data-id="${esc(e.id)}" ${p?'':'disabled'}>Rituel</button><button type="button" class="btn btn-soft btn-small" data-action="nexus-trip-send-garage" data-id="${esc(e.id)}" ${pg?'':'disabled'}>Garage</button><button type="button" class="btn btn-soft btn-small" data-action="nexus-trip-hub-garage" data-id="${esc(e.id)}" ${pg?'':'disabled'}>Garage via LINK</button></div>`;}).join('');
  api.modal('NEXUS · Préparer mes voyages',`<div class="nx-link-modal">
   <p class="muted-note">Connexion indépendante et chiffrée. Seuls les événements explicitement marqués « Voyage / week-end » peuvent être envoyés. Aucun contact, adresse ou invité n’est partagé.</p>
   ${p?`<div class="info-strip">Liaison voyage configurée (autorisation : contexte de séjour uniquement).</div>
      <div class="field"><label>Code privé à coller dans RITUEL → Trousse → Mes trousses</label><textarea id="nexus-trip-code" rows="4" readonly style="width:100%;overflow-wrap:anywhere">${esc(code)}</textarea></div>
      <div class="form-actions"><button type="button" class="btn btn-soft" data-action="nexus-trip-copy">Copier le code</button><button type="button" class="btn btn-ghost" data-action="nexus-trip-revoke">Révoquer ce lien</button></div>`:
     `<p class="muted-note">Crée une liaison NEXUS → RITUEL distincte de celle existant déjà dans l’autre sens.</p><button type="button" class="btn" data-action="nexus-trip-create">Créer le jumelage voyage</button>`}
   <h3>Garage · Ensembles de départ</h3>
   ${pg?`<div class="info-strip">Connexion chiffrée Nexus → Garage active pour les séjours choisis.</div>
     <div class="field"><label>Code privé à coller dans Garage → Réglages → Voyages Nexus</label><textarea id="nexus-garage-code" rows="4" readonly style="width:100%;overflow-wrap:anywhere">${esc(garageCode)}</textarea></div>
     <div class="form-actions"><button type="button" class="btn btn-soft" data-action="nexus-trip-copy-garage">Copier le code Garage</button><button type="button" class="btn btn-ghost" data-action="nexus-trip-revoke-garage">Révoquer ce lien</button></div>`:
     `<p class="muted-note">Un lien Garage indépendant, sans accès aux contacts ni au budget. Les trousses Rituel existantes restent inchangées.</p>
     <button type="button" class="btn" data-action="nexus-trip-create-garage">Créer le jumelage Garage</button>`}
   <h3>Séjours à venir</h3>
   ${rows||'<p class="muted-note">Aucun séjour marqué. Dans Agenda, édite un événement, coche « Voyage / week-end » et indique la date de retour.</p>'}
   <p class="muted-note">Une proposition n’ajoute ni dépense ni notification. La création d’une trousse Rituel ou d’un ensemble Garage reste manuelle dans l’app destinataire.</p>
  </div>`);
 }
 async function create(){
  if(pair()||busy)return show();
  if(!confirm('Créer un jumelage distinct NEXUS → RITUEL ?'))return;
  busy=true;try{
   const p=await window.NexusLinkCore.createPair('rituel',['trip_context']);
   data().linkConnections.push(p);await api.persist();api.render();show();api.toast('Liaison créée. Copie le code dans RITUEL.');
  }catch(e){api.toast('Connexion impossible : '+short(e.message,90))}
  finally{busy=false}
 }
 async function copy(){
  const p=pair();if(!p)return;
  try{await navigator.clipboard.writeText(window.NexusLinkCore.invitation(p));api.toast('Code copié pour RITUEL.');}
  catch{document.getElementById('nexus-trip-code')?.select();api.toast('Sélectionne puis copie le code.')}
 }
 async function send(id){
  if(busy)return;
  const p=pair(),e=data().events?.find(x=>x.id===id),d=range(e);
  if(!p||!d||d.end<today()){api.toast('Séjour ou connexion indisponible.');return}
  if(!navigator.onLine){api.toast('Internet requis.');return}
  if(!confirm('Envoyer à RITUEL « '+short(e.title)+' » du '+d.start+' au '+d.end+' ?'))return;
  const payload={type:'nexus.travel.v1',destination:'rituel',eventId:short(e.id,100),title:short(e.title,100),
   startDate:d.start,endDate:d.end,nights:d.nights};
  const digest=await fingerprint(payload),ledger=outbox(),prev=ledger.find(x=>x.eventId===e.id);
  if(prev?.fingerprint===digest){api.toast('Séjour déjà proposé sans modification.');return}
  busy=true;try{
   const revision=Math.min((prev?.revision||0)+1,1000000);
   await window.NexusLinkCore.publish(p,{entityId:'nexus-trip:'+e.id,scope:'trip_context',revision,payload});
   const entry={eventId:e.id,fingerprint:digest,revision,sentAt:new Date().toISOString()};
   if(prev)Object.assign(prev,entry);else ledger.push(entry);
   await api.persist();api.render();show();api.toast('Séjour envoyé. Ouvre RITUEL → Mes trousses.');
  }catch(e){api.toast('Envoi impossible : '+short(e.message,90))}
  finally{busy=false}
 }
 async function revoke(){
  const p=pair();if(!p||!confirm('Révoquer seulement la liaison voyage ? Le lien RITUEL → NEXUS reste inchangé.'))return;
  try{
   try{await window.NexusLinkCore.revoke(p);}catch(error){if(error.message!=='UNAUTHORIZED')throw error;}
   data().linkConnections=data().linkConnections.filter(x=>x.id!==p.id);
   data().travelOutbox=[];await api.persist();api.render();show();api.toast('Liaison voyage révoquée.');
  }catch(e){api.toast('Révocation impossible : '+short(e.message,80))}
 }
async function createGarage(){
  if(pairGarage()||busy)return show();
  if(!confirm('Créer un canal chiffré Nexus → Garage limité aux séjours ?'))return;
  busy=true;try{
   const p=await window.NexusLinkCore.createPair('garage',['trip_context']);
   data().linkConnections.push(p);await api.persist();api.render();show();api.toast('Liaison Garage créée. Copie le code dans Garage.');
  }catch(e){api.toast('Jumelage Garage impossible : '+short(e.message,90));}
  finally{busy=false;}
 }
 async function copyGarage(){
  const p=pairGarage();if(!p)return;
  try{await navigator.clipboard.writeText(window.NexusLinkCore.invitation(p));api.toast('Code Garage copié.');}
  catch{document.getElementById('nexus-garage-code')?.select();api.toast('Sélectionne puis copie le code.');}
 }
 async function sendGarage(id){
  if(busy)return;
  const p=pairGarage(),e=data().events?.find(x=>x.id===id),d=range(e);
  if(!p||!d||d.end<today()){api.toast('Séjour ou connexion Garage indisponible.');return;}
  if(!navigator.onLine){api.toast('Internet requis pour transmettre ce séjour.');return;}
  if(!confirm('Proposer à Garage « '+short(e.title)+' » du '+d.start+' au '+d.end+' ?'))return;
  const payload={type:'nexus.travel.v1',destination:'garage',eventId:short(e.id,100),title:short(e.title,100),
   startDate:d.start,endDate:d.end,nights:d.nights};
  const digest=await fingerprint(payload),ledger=garageOutbox(),prev=ledger.find(x=>x.eventId===e.id);
  if(prev?.fingerprint===digest){api.toast('Séjour déjà proposé sans modification à Garage.');return;}
  busy=true;try{
   const revision=Math.min((prev?.revision||0)+1,1000000);
   await window.NexusLinkCore.publish(p,{entityId:'nexus-garage-trip:'+e.id,scope:'trip_context',revision,payload});
   const entry={eventId:e.id,fingerprint:digest,revision,sentAt:new Date().toISOString()};
   if(prev)Object.assign(prev,entry);else ledger.push(entry);
   await api.persist();api.render();show();api.toast('Séjour proposé. Ouvre Garage → Réglages → Voyages Nexus.');
  }catch(e){api.toast('Garage : envoi impossible : '+short(e.message,90));}
  finally{busy=false;}
 }
 let hubAutoTimer=null,hubAutoBusy=false,hubLifecycleBound=false;
 const hubAutoQueue=new Set();
 function hubGaragePayload(e,d){
  return {type:"nexus.travel.v1",destination:"garage",eventId:short(e.id,100),
   title:short(e.title,100),startDate:d.start,endDate:d.end,nights:d.nights};
 }
 async function publishHubGarage(id,{interactive=false}={}){
  const p=pairGarage(),e=data().events?.find(x=>x.id===id),d=range(e);
  if(!p||!window.LinkHubBus)return {status:"unavailable"};
  const history=data().travelGarageHubOutbox||[],prev=history.find(x=>x.eventId===id);
  const old=garageOutbox().find(x=>x.eventId===id);
  // Only a previously published trip may be cancelled. Past (but still
  // valid) journeys are retained, not implicitly deleted on expiry.
  const deleted=!e||!d;
  if(deleted&&!prev)return {status:"unavailable"};
  if(!deleted&&d.end<today())return {status:"unavailable"};
  if(!navigator.onLine)return {status:"deferred"};
  if(interactive&&!confirm((deleted?"Annuler la proposition Garage de ce séjour ?":
   "Transmettre ce séjour à Garage via LINK ? Le déplacement d’objets restera manuel.")))
   return {status:"cancelled"};
  const cancelledAt=String(prev?.cancelledAt||prev?.sentAt||"").slice(0,10);
  const stamp=/^\d{4}-\d{2}-\d{2}$/.test(cancelledAt)?cancelledAt:"2000-01-01";
  const payload=deleted?{type:"nexus.travel.v1",destination:"garage",eventId:short(id,100),
   title:"Séjour annulé",startDate:stamp,endDate:stamp,nights:0,deleted:true}:hubGaragePayload(e,d);
  const digest=await fingerprint(payload);
  if(prev?.fingerprint===digest){
   if(interactive)api.toast("Séjour déjà transmis via LINK sans modification.");
   return {status:"unchanged",revision:prev.revision};
  }
  const base=old?(old.fingerprint===digest?old.revision:old.revision+1):1;
  const revision=Math.min(prev?Math.max(base,prev.revision+1):base,1000000);
  const result=await window.LinkHubBus.publish({pair:p,from:"nexus",to:"garage",
   contractId:"nexus-garage",scope:"trip_context",entityId:"nexus-garage-trip:"+id,
   revision,payload,schemaVersion:"nexus.travel.v1"});
  if(result.accepted){
   const entry={eventId:id,revision,fingerprint:digest,sentAt:new Date().toISOString(),...(deleted?{cancelledAt:stamp}:{})};
   data().travelGarageHubOutbox=prev?history.map(x=>x===prev?entry:x):[...history,entry];
   await api.persist();
   if(interactive)api.toast("Séjour chiffré transmis via LINK.");
   return {status:"sent",revision};
  }
  return {status:"not-accepted"};
 }
 async function flushAutoGarage(){
  if(hubAutoBusy||!navigator.onLine)return;
  if(!pairGarage()||!window.LinkHubBus)return;
  hubAutoBusy=true;
  try{
   const requested=[...hubAutoQueue];hubAutoQueue.clear();
   const ids=requested.includes("*")?[...upcoming().map(e=>e.id),...(data().travelGarageHubOutbox||[]).map(x=>x.eventId)]:requested;
   for(const id of [...new Set(ids)].slice(0,30)){
    try{await publishHubGarage(id,{interactive:false});}
    catch(error){
     hubAutoQueue.add(id);
     console.warn("NEXUS LINK : synchronisation Garage différée",error?.message||error);
    }
   }
  }finally{hubAutoBusy=false;}
 }
 function scheduleAutoGarage(id="*"){
  if(id)hubAutoQueue.add(id);
  clearTimeout(hubAutoTimer);
  hubAutoTimer=setTimeout(()=>void flushAutoGarage(),700);
 }
 function initAutoGarage(){
  if(!hubLifecycleBound){
   hubLifecycleBound=true;
   window.addEventListener("online",()=>scheduleAutoGarage("*"));
   window.addEventListener("focus",()=>scheduleAutoGarage("*"));
   document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")scheduleAutoGarage("*");});
  }
  scheduleAutoGarage("*");
 }
 async function sendHubGarage(id){
  return publishHubGarage(id,{interactive:true});
 }
 async function revokeGarage(){
  const p=pairGarage();if(!p||!confirm('Révoquer uniquement les voyages Garage ?'))return;
  try{
   await window.NexusLinkCore.revoke(p);
   data().linkConnections=data().linkConnections.filter(x=>x.id!==p.id);
   data().travelGarageOutbox=[];await api.persist();api.render();show();api.toast('Lien Garage révoqué.');
  }catch(e){api.toast('Révocation Garage impossible : '+short(e.message,80));}
 }
 function act(kind,target){
  if(!kind?.startsWith('nexus-trip-'))return false;
  if(kind==='nexus-trip-open')show();
  else if(kind==='nexus-trip-create')create();
  else if(kind==='nexus-trip-copy')copy();
  else if(kind==='nexus-trip-send')send(target.dataset.id);
  else if(kind==='nexus-trip-revoke')revoke();
  else if(kind==='nexus-trip-create-garage')createGarage();
  else if(kind==='nexus-trip-copy-garage')copyGarage();
  else if(kind==='nexus-trip-send-garage')sendGarage(target.dataset.id);
  else if(kind==='nexus-trip-hub-garage')sendHubGarage(target.dataset.id).catch(e=>api.toast("LINK : "+short(e.message,95)));
  else if(kind==='nexus-trip-revoke-garage')revokeGarage();
  return true;
 }
 window.NexusTravel=Object.freeze({attach:ctx=>{api=ctx},settingsCard,act,range,eligible:upcoming,scheduleAutoGarage,initAutoGarage});
})();