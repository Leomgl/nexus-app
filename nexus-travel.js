/* Explicit encrypted NEXUS -> RITUEL trip sharing. Standalone reverse pair. */
'use strict';
(()=>{
 let api=null,busy=false;
 const esc=s=>api?.escape?.(s)??String(s??''),short=(s,n=110)=>String(s??'').trim().slice(0,n);
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d+'T12:00:00').toISOString().slice(0,10)===d;
 const range=e=>{
  const start=String(e?.start||'').slice(0,10),end=String(e?.returnDate||'');
  if(e?.tripType!=='travel'||!valid(start)||!valid(end)||end<start)return null;
  const nights=Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000);
  return nights>=0&&nights<=45?{start,end,nights}:null;
 };
 const data=()=>api?.state?.()||{};
 const pair=()=>data().linkConnections?.find(p=>p.sourceApp==='rituel'&&p.scopes?.length===1&&p.scopes[0]==='trip_context')||null;
 const upcoming=()=>Array.isArray(data().events)?data().events.filter(e=>range(e)&&range(e).end>=today()).sort((a,b)=>a.start.localeCompare(b.start)).slice(0,30):[];
 const outbox=()=>{if(!Array.isArray(data().travelOutbox))data().travelOutbox=[];return data().travelOutbox;};
 async function fingerprint(x){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x))));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
 function settingsCard(){
  if(!api)return '';
  return '<section class="preferences-panel nx-connections-panel"><div class="pref-heading"><span aria-hidden="true">🧳</span><div><h2>Voyages → Trousse RITUEL</h2><p>Choisis les séjours à transmettre, séparément de Gaming et de l’import RITUEL.</p></div></div>'+
   '<div class="settings-option"><div><strong>'+(pair()?'Connexion voyage disponible':'Connexion voyage indépendante')+
   '</strong><p>'+upcoming().length+' séjour(s) identifiés dans l’agenda.</p></div><button class="btn btn-soft btn-small" data-action="nexus-trip-open">Gérer</button></div></section>';
 }
 function show(){
  if(!api)return;
  const p=pair(),trips=upcoming(),code=p?window.NexusLinkCore.invitation(p):'';
  const rows=trips.map(e=>{const d=range(e);return `<div class="nx-link-scope" style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div><strong>${esc(short(e.title))}</strong><small>${d.start} → ${d.end} · ${d.nights} nuit(s)</small></div><button type="button" class="btn btn-soft btn-small" data-action="nexus-trip-send" data-id="${esc(e.id)}" ${p?'':'disabled'}>Proposer</button></div>`;}).join('');
  api.modal('NEXUS → RITUEL · Voyages',`<div class="nx-link-modal">
   <p class="muted-note">Connexion indépendante et chiffrée. Seuls les événements explicitement marqués « Voyage / week-end » peuvent être envoyés. Aucun contact, adresse ou invité n’est partagé.</p>
   ${p?`<div class="info-strip">Liaison voyage configurée (autorisation : contexte de séjour uniquement).</div>
      <div class="field"><label>Code privé à coller dans RITUEL → Trousse → Mes trousses</label><textarea id="nexus-trip-code" rows="4" readonly style="width:100%;overflow-wrap:anywhere">${esc(code)}</textarea></div>
      <div class="form-actions"><button type="button" class="btn btn-soft" data-action="nexus-trip-copy">Copier le code</button><button type="button" class="btn btn-ghost" data-action="nexus-trip-revoke">Révoquer ce lien</button></div>`:
     `<p class="muted-note">Crée une liaison NEXUS → RITUEL distincte de celle existant déjà dans l’autre sens.</p><button type="button" class="btn" data-action="nexus-trip-create">Créer le jumelage voyage</button>`}
   <h3>Séjours à venir</h3>
   ${rows||'<p class="muted-note">Aucun séjour marqué. Dans Agenda, édite un événement, coche « Voyage / week-end » et indique la date de retour.</p>'}
   <p class="muted-note">Une proposition n’ajoute ni dépense ni notification. La création de trousse reste manuelle dans RITUEL.</p>
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
   await window.NexusLinkCore.revoke(p);
   data().linkConnections=data().linkConnections.filter(x=>x.id!==p.id);
   data().travelOutbox=[];await api.persist();api.render();show();api.toast('Liaison voyage révoquée.');
  }catch(e){api.toast('Révocation impossible : '+short(e.message,80))}
 }
 function act(kind,target){
  if(!kind?.startsWith('nexus-trip-'))return false;
  if(kind==='nexus-trip-open')show();
  else if(kind==='nexus-trip-create')create();
  else if(kind==='nexus-trip-copy')copy();
  else if(kind==='nexus-trip-send')send(target.dataset.id);
  else if(kind==='nexus-trip-revoke')revoke();
  return true;
 }
 window.NexusTravel=Object.freeze({attach:ctx=>{api=ctx},settingsCard,act,range,eligible:upcoming});
})();