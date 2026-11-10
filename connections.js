/* NEXUS App Link — configuration preview only; NO network, NO credentials.
   RITUEL and Gaming are NOT linked by this file. */
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
 function numberEnabled(id){return Object.values(cfg.grants[id]||{}).filter(Boolean).length;}
 function settingsCard(){
  return '<section class="preferences-panel nx-connections-panel">'+
    '<div class="pref-heading">'+svg('link')+'<div><h2>Applications & connexions</h2>'+
    '<p>Prépare les permissions de RITUEL et de la future app Gaming.</p></div></div>'+
    '<div class="nx-connection-apps">'+APPS.map(app=>
      '<div class="nx-connection-app"><div><strong>'+escape(app.name)+'</strong>'+
      '<small>'+escape(app.detail)+'</small>'+
      '<span class="nx-connection-status">'+escape(app.state)+' · '+numberEnabled(app.id)+' autorisation(s) préparée(s)</span></div>'+
      '<div class="nx-connection-actions"><button type="button" class="btn btn-soft btn-small" data-action="link-configure" data-app="'+app.id+'">Configurer</button>'+
      (app.id==='gaming'?'<a class="btn btn-neutral btn-small" href="https://gaming-app.q9pfwtztsc.workers.dev/" target="_blank" rel="noopener noreferrer">Ouvrir Gaming</a>':'')+
      '</div></div>'
    ).join('')+'</div>'+
    '<p class="nx-connection-disclaimer">'+svg('shield')+
    ' Configuration préliminaire uniquement : aucune application n’est reliée, aucune donnée n’est envoyée et aucun accès automatique n’est activé.</p></section>';
 }
 function show(id){
  const app=APPS.find(x=>x.id===id);
  if(!app)return;
  modal('Connexion · '+app.name,
   '<div class="nx-link-modal"><p class="muted-note">Choisis les échanges que tu aimerais autoriser. '+
   'Pour le moment, ces choix sont enregistrés uniquement sur cet appareil : <strong>aucune synchronisation n’a lieu.</strong></p>'+
   '<div class="nx-link-scopes">'+app.scopes.map(([key,label,destination])=>
     '<label class="nx-link-scope"><input type="checkbox" data-connector-scope="'+key+
     '" data-connector-app="'+app.id+'" '+(cfg.grants[id][key]?'checked':'')+'>'+
     '<span><strong>'+escape(label)+'</strong><small>Destination : '+escape(destination)+'</small></span></label>'
   ).join('')+'</div><div class="info-strip">'+svg('shield')+
   ' Fonctionnement prévu : propositions à valider dans NEXUS, aucun paiement créé automatiquement et aucune clé de coffre partagée.</div>'+
   '<div class="form-actions"><button type="button" class="btn btn-neutral" data-action="link-draft-reset" data-app="'+id+
   '">Tout désélectionner</button><button type="button" class="btn" data-action="link-finish">Terminer</button></div></div>');
 }
 function onChange(target){
  if(!target?.matches?.('[data-connector-scope]'))return false;
  const app=APPS.find(x=>x.id===target.dataset.connectorApp);
  const scope=target.dataset.connectorScope;
  if(!app||!app.scopes.some(([key])=>key===scope))return true;
  cfg.grants[app.id][scope]=Boolean(target.checked);
  save();
  return true;
 }
 function act(kind,target){
  if(kind==='link-configure'){show(target.dataset.app);return true;}
  if(kind==='link-finish'){closeModal();render();return true;}
  if(kind==='link-draft-reset'){
   const id=target.dataset.app;
   const app=APPS.find(x=>x.id===id);
   if(!app)return true;
   for(const [scope] of app.scopes)cfg.grants[id][scope]=false;
   save();show(id);toast('Préférences préparatoires effacées.');return true;
  }
  return false;
 }
 window.NexusConnections={settingsCard,act,onChange,read,registry:()=>APPS.map(app=>({id:app.id,scopes:app.scopes.map(([id])=>id)}))};
})();