/* NEXUS LINK — explicit encrypted pairing. No automatic financial/calendar imports. */
'use strict';
(() => {
 const STORE='nexus_link_config_draft_v1';
 const APPS=[
  {id:'rituel',name:'RITUEL',state:'Non connecté',detail:'Routines, stock et produits de soins',
   scopes:[
    ['restock_purchase','Stock faible → proposer un achat NEXUS','Achats'],
    ['restock_task','Stock faible → proposer un rappel','Rappels'],
    ['product_paid','Produit acheté → proposer une dépense réelle','Budget'],
    ['routine_schedule','Routine → proposer un événement','Agenda'],
    ['routine_summary','Progression → proposer un résumé','Accueil']
   ]},
  {id:'gaming',name:'Gaming',state:'Bêta autonome · non connectée',detail:'Jeux, supports de stockage, passes et saisons',
   scopes:[
    ['installed_summary','Jeux installés → résumé NEXUS','Accueil'],
    ['future_spending','Dépense prévue → proposition d’achat','Achats / Projets'],
    ['pass_deadline','Fin de pass → proposer un événement et des rappels','Agenda / Rappels'],
    ['pass_paid','Pass acheté → proposer une dépense réelle','Budget'],
    ['dlc_release','DLC à venir → proposer un achat et une date','Achats / Agenda'],
    ['game_release','Sortie de jeu → proposer une date et un achat','Agenda / Achats'],
    ['gaming_event','Événement de jeu → proposer un rendez-vous','Agenda / Rappels']
   ]}
 ];
 function read(){
  let raw;
  try{raw=JSON.parse(localStorage.getItem(STORE)||'null');}catch{}
  const grants={};
  for(const app of APPS){
   grants[app.id]={};
   for(const [scope] of app.scopes)grants[app.id][scope]=raw?.grants?.[app.id]?.[scope]===true;
  }
  return {version:1,grants};
 }
 let cfg=read();
 const escape=s=>escapeHtml(s);
 function save(){
  try{localStorage.setItem(STORE,JSON.stringify(cfg));}
  catch{toast('Impossible de sauvegarder ces préférences locales.');}
 }
 function numberEnabled(id){return id==='gaming'&&ownPairs().length?ownPairs()[0].scopes.length:Object.values(cfg.grants[id]||{}).filter(Boolean).length;}
 function settingsCard(){
  return '<section class="preferences-panel nx-connections-panel">'+
    '<div class="pref-heading">'+svg('link')+'<div><h2>Applications & connexions</h2>'+
    '<p>Prépare les permissions de RITUEL et de la future app Gaming.</p></div></div>'+
    '<div class="nx-connection-apps">'+APPS.map(app=>
      '<div class="nx-connection-app"><div><strong>'+escape(app.name)+'</strong>'+
      '<small>'+escape(app.detail)+'</small>'+
      '<span class="nx-connection-status">'+escape(app.id==='gaming'&&data.linkConnections?.some(x=>x.sourceApp==='gaming')?'Jumelage configuré · synchro disponible':app.state)+' · '+numberEnabled(app.id)+' autorisation(s)</span></div>'+
      '<div class="nx-connection-actions"><button type="button" class="btn btn-soft btn-small" data-action="link-configure" data-app="'+app.id+'">Configurer</button>'+
      (app.id==='gaming'?'<a class="btn btn-neutral btn-small" href="https://gaming-app.q9pfwtztsc.workers.dev/" target="_blank" rel="noopener noreferrer">Ouvrir Gaming</a>':'')+
      (app.id==='gaming'?'<button type="button" class="btn btn-soft btn-small" data-action="link-create">Jumeler</button><button type="button" class="btn btn-soft btn-small" data-action="link-proposals">Propositions ('+data.linkInbox.filter(x=>x.status==='pending').length+')</button><button type="button" class="btn btn-neutral btn-small" data-action="link-inbox">Tests</button>':'')+
      '</div></div>'
    ).join('')+'</div>'+
    '<p class="nx-connection-disclaimer">'+svg('shield')+
    ' Les propositions Gaming sont chiffrées et doivent être acceptées dans NEXUS. Aucune dépense réelle n’est créée automatiquement.</p></section>';
 }
 function show(id){
  const app=APPS.find(x=>x.id===id);
  if(!app)return;
  const linked=id==='gaming'&&ownPairs().length>0;
  modal('Connexion · '+app.name,
   '<div class="nx-link-modal"><p class="muted-note">'+
   (linked?'Connexion chiffrée active. Les permissions sont fixées au jumelage : pour les modifier, révoque la connexion puis jumelle Gaming à nouveau.':'Choisis les flux à autoriser. Les propositions seront à valider individuellement dans NEXUS.')+'</p>'+
   '<div class="nx-link-scopes">'+app.scopes.map(([key,label,destination])=>
     '<label class="nx-link-scope"><input type="checkbox" data-connector-scope="'+key+
     '" data-connector-app="'+app.id+'" '+(linked?'disabled ':'')+((linked?ownPairs()[0].scopes.includes(key):cfg.grants[id][key])?'checked':'')+'>'+
     '<span><strong>'+escape(label)+'</strong><small>Destination : '+escape(destination)+'</small></span></label>'
   ).join('')+'</div><div class="info-strip">'+svg('shield')+
   ' Gaming → NEXUS : propositions à valider, aucun paiement créé automatiquement et aucune clé de coffre partagée.</div>'+
   '<div class="form-actions"><button type="button" class="btn btn-neutral" data-action="link-draft-reset" data-app="'+id+
   '">Tout désélectionner</button><button type="button" class="btn" data-action="link-finish">Terminer</button></div></div>');
 }
 function onChange(target){
  if(!target?.matches?.('[data-connector-scope]'))return false;
  const app=APPS.find(x=>x.id===target.dataset.connectorApp);
  const scope=target.dataset.connectorScope;
  if(!app||!app.scopes.some(([key])=>key===scope))return true;
  if(app.id==='gaming'&&ownPairs().length)return true;
  cfg.grants[app.id][scope]=Boolean(target.checked);
  save();
  return true;
 }

 function ownPairs(){return (data.linkConnections||[]).filter(x=>x.sourceApp==='gaming');}
 function pairingPanel(pair){
  const code=window.NexusLinkCore.invitation(pair);
  modal('Code de jumelage Gaming',`<div class="nx-link-modal">
   <p class="muted-note">Code privé à usage personnel : copie-le dans Gaming → Réglages → NEXUS LINK. Ne le communique pas dans un chat : il donne accès à cette connexion chiffrée.</p>
   <div class="field"><label for="nx-link-code">Code de jumelage</label>
   <textarea id="nx-link-code" rows="5" readonly style="width:100%;overflow-wrap:anywhere;word-break:break-all">${escape(code)}</textarea></div>
   <div class="form-actions"><button class="btn btn-neutral" data-action="link-copy">Copier le code</button><button class="btn btn-ghost" data-action="link-revoke" data-id="${escape(pair.id)}">Révoquer</button>
   <button class="btn" data-action="link-inbox">Messages reçus</button></div></div>`);
 }
 async function createPairing(){
  const core=window.NexusLinkCore;
  if(!core){toast('Module NEXUS LINK indisponible : actualise la PWA.');return;}
  if(ownPairs().length){pairingPanel(ownPairs()[0]);return;}
  const scopes=Object.entries(cfg.grants.gaming||{}).filter(([_,allowed])=>allowed).map(([scope])=>scope);
  if(!scopes.length){toast('Configure Gaming et coche au moins une autorisation avant le jumelage.');return;}
  try{
   const pair=await core.createPair('gaming',scopes);
   data.linkConnections.push(pair);
   await persist();render();pairingPanel(pair);
  }catch(e){toast('Jumelage impossible : '+String(e.message).slice(0,75));}
 }
 async function inboxPanel(){
  const pair=ownPairs()[0];
  if(!pair){toast('Connecte Gaming avant de consulter les messages.');return;}
  try{
   const messages=await window.NexusLinkCore.inbox(pair);
   modal('NEXUS LINK · tests',`<div class="nx-link-modal">
    <p class="muted-note">Messages de test. Les données métier se trouvent dans « Propositions ».</p>
    <div class="nx-link-scopes">${messages.length?messages.map(msg=>`<div class="nx-link-scope" style="display:block">
      <strong>${escape(msg.invalid?'Message indéchiffrable':(msg.payload?.type==='test.ping'?'Test de connexion reçu':String(msg.payload?.title||'Proposition en attente')))}</strong>
      <small>Catégorie : ${escape(msg.scope||'Inconnue')} · Révision ${Number(msg.revision)||1}</small>
      ${!msg.invalid?`<div class="form-actions"><button class="btn btn-soft btn-small" data-action="link-ack" data-id="${escape(msg.id)}">Marquer comme lu</button></div>`:''}
    </div>`).join(''):'<div class="info-strip">Aucun message en attente. Envoie un test depuis Gaming.</div>'}</div>
    <div class="form-actions"><button class="btn btn-neutral" data-action="link-show-code">Voir le code</button>
    <button class="btn btn-ghost" data-action="link-revoke" data-id="${escape(pair.id)}">Révoquer</button>
    <button class="btn" data-action="link-inbox">Actualiser</button></div></div>`);
  }catch(e){toast('Réception impossible : '+String(e.message).slice(0,70));}
 }
 async function acknowledgeMessage(id){
  const pair=ownPairs()[0];if(!pair)return;
  try{await window.NexusLinkCore.acknowledge(pair,id);await inboxPanel();}
  catch(e){toast('Accusé non envoyé : '+String(e.message).slice(0,60));}
 }
 async function revokePair(id){
  const pair=ownPairs().find(x=>x.id===id);
  if(!pair||!confirm('Révoquer définitivement le jumelage Gaming ? Les deux apps conserveront leurs données indépendantes.'))return;
  try{await window.NexusLinkCore.revoke(pair);
   data.linkConnections=data.linkConnections.filter(x=>x.id!==id);await persist();closeModal();render();toast('Jumelage révoqué.');
  }catch(e){toast('Révocation impossible : '+String(e.message).slice(0,65));}
 }
 async function copyPair(){
  const pair=ownPairs()[0];if(!pair)return;
  const code=window.NexusLinkCore.invitation(pair);
  try{await navigator.clipboard.writeText(code);toast('Code copié. Colle-le dans Gaming.');}
  catch{const field=document.getElementById('nx-link-code');field?.focus();field?.select();toast('Sélectionne le code et copie-le manuellement.');}
 }

 function act(kind,target){
  if(window.NexusGamingImport?.act?.(kind,target))return true;
  if(kind==='link-create')return createPairing();
  if(kind==='link-inbox')return inboxPanel();
  if(kind==='link-show-code'){const pair=ownPairs()[0];if(pair)pairingPanel(pair);return;}
  if(kind==='link-copy')return copyPair();
  if(kind==='link-ack')return acknowledgeMessage(target.dataset.id);
  if(kind==='link-revoke')return revokePair(target.dataset.id);

  if(kind==='link-configure'){show(target.dataset.app);return true;}
  if(kind==='link-finish'){closeModal();render();return true;}
  if(kind==='link-draft-reset'){
   const id=target.dataset.app;
   if(id==='gaming'&&ownPairs().length){toast('Révoque le jumelage pour changer les permissions.');return true;}
   const app=APPS.find(x=>x.id===id);
   if(!app)return true;
   for(const [scope] of app.scopes)cfg.grants[id][scope]=false;
   save();show(id);toast('Préférences préparatoires effacées.');return true;
  }
  return false;
 }
 window.NexusConnections={settingsCard,act,onChange,read,registry:()=>APPS.map(app=>({id:app.id,scopes:app.scopes.map(([id])=>id)}))};
})();