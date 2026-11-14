/* NEXUS V0.21.4 — settings information architecture. Local navigation only. */
'use strict';
(() => {
  const CATEGORIES=[
    {id:'interface',label:'Apparence et interface',detail:'Thèmes, navigation, accueil Pulse',icon:'sliders',keywords:'widgets densité palette raccourcis home'},
    {id:'link',label:'LINK',detail:'Notifications, connexions et autorisations',icon:'link',keywords:'notifications push rappels échéances budget salaire prêt agenda applications connectées autorisations jumelage automatisation synchronisation'},
    {id:'security',label:'Sécurité et confidentialité',detail:'Face ID, passkeys et protection',icon:'shield',keywords:'connexion verrouillage authentification'},
    {id:'data',label:'Données et sauvegardes',detail:'Coffre, export, import et corbeille',icon:'download',keywords:'restauration synchronisation réinitialiser suppression'},
    {id:'about',label:'À propos de Nexus',detail:'Version et mises à jour',icon:'info',keywords:'actualiser pwa maintenance'}
  ];
  const APP_LABELS={gaming:'Gaming',rituel:'Rituel',vestiaire:'Vestiaire',health:'Santé'};
  let page='home',search='',canaryFeedback='',canaryBusy=false;
  let env=null;
  const e=s=>env.escape(s);
  const ico=s=>env.svg(s);
  const normalized=s=>String(s||'').toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const action=(label,kind,icon,klass='btn btn-soft btn-small')=>'<button type="button" class="'+klass+'" data-action="'+kind+'">'+(icon?ico(icon)+' ':'')+e(label)+'</button>';
  const panel=(title,subtitle,icon,body)=>'<section class="preferences-panel nx-set-panel"><div class="pref-heading">'+ico(icon)+'<div><h2>'+e(title)+'</h2><p>'+e(subtitle)+'</p></div></div>'+body+'</section>';
  const option=(title,desc,kind,label,icon)=>'<div class="settings-option"><div><strong>'+e(title)+'</strong><p>'+e(desc)+'</p></div>'+action(label,kind,icon)+'</div>';
  const link=(name,desc,icon,target,suffix='',disabled=false)=>'<button type="button" class="nx-set-link" data-action="settings-open" data-page="'+e(target)+'"'+(disabled?' disabled':'')+'><span class="nx-set-icon">'+ico(icon)+'</span><span class="nx-set-copy"><strong>'+e(name)+'</strong><small>'+e(desc)+'</small></span><span class="nx-set-end">'+(suffix?'<span class="nx-set-status">'+e(suffix)+'</span>':'')+ico('chevright')+'</span></button>';
  const routes=[
    ...CATEGORIES,
    {id:'app:gaming',label:'Gaming',detail:'Jumelage, permissions et propositions',keywords:'jeu saison pass achats'},
    {id:'app:rituel',label:'Rituel',detail:'Jumelage, achats et voyages',keywords:'trousse produits week-end'},
    {id:'app:vestiaire',label:'Vestiaire',detail:'Catalogue de tenues et jumelage',keywords:'vêtement look dressing'},
    {id:'app:health',label:'Santé',detail:'Traitements du jour et Agenda Nexus',keywords:'rendez-vous santé médical traitement jumelage'},
    {id:'apps-automation',label:'Synchronisation et automatisations',detail:'Réception et dépenses autorisées',keywords:'connect 2.0 automatique gaming rituel'},
    {id:'data-advanced',label:'Réinitialisations par module',detail:'Actions de maintenance sensibles',keywords:'effacer vider suppression'}
  ];
  function results(){
    if(!search.trim())return '';
    const q=normalized(search.trim()),found=routes.filter(item=>normalized([item.label,item.detail,item.keywords].join(' ')).includes(q));
    return '<div class="nx-set-results" role="status">'+(found.length?found.map(x=>link(x.label,x.detail,x.icon||'link',x.id)).join(''):'<p class="nx-set-empty">Aucun réglage trouvé. Essaie « budget », « Face ID » ou « sauvegarde ».</p>')+'</div>';
  }
  function home(){
    return '<div class="nexus-page-heading nx-set-main-head"><div class="eyebrow">NEXUS · CONFIGURATION</div><h1 class="page-title">Réglages<span class="punctuation">.</span></h1><p class="subtitle">Tout ton univers, bien organisé.</p></div>'+
      '<div class="nx-set-home">'+
      '<div class="nx-set-intro"><span class="nx-set-intro-icon">'+ico('sliders')+'</span><div><strong>Mon espace Nexus</strong><small>Personnalisation et préférences</small></div><span class="nx-set-intro-version">V'+e(env.version)+'</span></div>'+
      '<div class="nx-set-search">'+ico('search')+'<label class="sr-only" for="nx-settings-search">Rechercher un réglage</label><input id="nx-settings-search" type="search" placeholder="Rechercher un réglage…" autocomplete="off" value="'+e(search)+'"></div>'+
      '<div id="nx-settings-results">'+results()+'</div>'+
      '<div class="nx-set-groups">'+CATEGORIES.map(item=>link(item.label,item.detail,item.icon,item.id)).join('')+'</div>'+
      '<p class="nx-set-footer">NEXUS · V'+e(env.version)+' · Local-first · PWA iPhone</p></div>';
  }
  function chooseSlot(index){
    return '<label class="ui-select"><span>Raccourci '+index+'</span><select data-pref-slot="'+index+'" aria-label="Choisir le module du raccourci '+index+'">'+
      env.MODULES.map(m=>'<option value="'+e(m[0])+'"'+(env.UI['slot'+index]===m[0]?' selected':'')+'>'+e(m[2])+'</option>').join('')+'</select></label>';
  }
  function interfacePage(){
    const m1=env.MODULES.find(m=>m[0]===env.UI.slot1)||env.MODULES[0],m2=env.MODULES.find(m=>m[0]===env.UI.slot2)||env.MODULES[0];
    const widgets=[...env.UI.widgets,...env.HOME_WIDGETS.map(w=>w[0]).filter(id=>!env.UI.widgets.includes(id))];
    const navigation=panel('Navigation','Tes deux raccourcis dans la barre principale.','grid',
      '<div class="slots-visual"><span>'+ico('home')+' Accueil</span><span>'+ico('grid')+' Catégories</span><span class="custom-slot">'+ico(m1[1])+' '+e(m1[2])+'</span><span class="custom-slot">'+ico(m2[1])+' '+e(m2[2])+'</span><span>'+ico('sliders')+' Réglages</span></div>'+
      '<div class="pref-select-grid">'+chooseSlot(1)+chooseSlot(2)+'</div><p class="pref-hint">Un même module ne peut pas occuper les deux raccourcis : Nexus échange les emplacements.</p>');
    const appearance=panel('Apparence','Personnalise le confort de lecture.','sparkle',
      '<span class="nx-set-mini-label">Palette · aperçu instantané</span><div class="nx-set-theme-grid">'+
      '<button type="button" class="nx-set-theme nx-set-theme-sage'+(env.UI.theme==='sage'?' selected':'')+'" data-action="settings-theme" data-theme="sage" aria-pressed="'+(env.UI.theme==='sage')+'"><span class="nx-set-theme-preview"><b></b><i></i><i></i></span><strong>Sauge</strong><small>Naturel</small></button>'+
      '<button type="button" class="nx-set-theme nx-set-theme-slate'+(env.UI.theme==='slate'?' selected':'')+'" data-action="settings-theme" data-theme="slate" aria-pressed="'+(env.UI.theme==='slate')+'"><span class="nx-set-theme-preview"><b></b><i></i><i></i></span><strong>Ardoise</strong><small>Contrasté</small></button></div>'+
      '<div class="pref-select-grid"><label class="ui-select"><span>Densité</span><select data-pref-option="density"><option value="comfortable"'+(env.UI.density==='comfortable'?' selected':'')+'>Confortable</option><option value="compact"'+(env.UI.density==='compact'?' selected':'')+'>Compacte</option></select></label></div>'+
      '<p class="pref-hint">Choisis une palette pour voir immédiatement le résultat. Mode sombre à venir après vérification des contrastes.</p>');
    const widgetRows=widgets.map(id=>{
      const w=env.HOME_WIDGETS.find(x=>x[0]===id),enabled=env.UI.widgets.includes(id),i=env.UI.widgets.indexOf(id);
      if(!w)return '';
      return '<div class="widget-setting'+(enabled?'':' is-hidden')+'"><button type="button" data-action="toggle-widget" data-widget="'+e(id)+'" aria-pressed="'+enabled+'" aria-label="'+(enabled?'Masquer ':'Afficher ')+e(w[1])+'">'+ico(enabled?'check':'plus')+'</button>'+
        '<div><strong>'+e(w[1])+'</strong><small>'+e(w[2])+'</small></div><span class="widget-arrows"><button type="button" data-action="move-widget" data-widget="'+e(id)+'" data-dir="-1"'+(!enabled||i<=0?' disabled':'')+' aria-label="Monter '+e(w[1])+'">'+ico('chevleft')+'</button><button type="button" data-action="move-widget" data-widget="'+e(id)+'" data-dir="1"'+(!enabled||i===env.UI.widgets.length-1?' disabled':'')+' aria-label="Descendre '+e(w[1])+'">'+ico('chevright')+'</button></span></div>';
    }).join('');
    const pulse=panel('Accueil Pulse','Afficher, masquer et classer les widgets.','layers',
      '<div class="widget-settings">'+widgetRows+'</div>'+action("Retrouver l'interface par défaut",'reset-ui','refresh','btn btn-neutral btn-small'));
    return '<div class="nx-set-stack">'+navigation+appearance+pulse+'</div>';
  }
  function liveCanaryAvailable(){
    const l=window.location;
    return l?.origin==='https://leomgl.github.io'&&
      l.pathname?.startsWith('/nexus-app/');
  }
  function liveCanaryActive(){
    return liveCanaryAvailable()&&
      new URL(window.location.href).searchParams.get('linkNotificationsLive')==='1';
  }
  function linkNotificationsCanaryPanel(){
    if(!liveCanaryAvailable())return '';
    const active=liveCanaryActive();
    const state=active?'Activé · notifications programmées via LINK pour les nouveaux événements':
      'Désactivé · tes notifications actuelles restent inchangées';
    return panel('Notifications · Moteur LINK',
      'Un seul distributeur pour les rappels des applications.','clock',
      '<div class="nx-set-info-row"><strong>Mode de recette Nexus</strong><small>'+e(state)+'</small></div>'+
      action(active?'Quitter le test LINK':'Tester les notifications via le vrai LINK',
        'settings-link-notifications-toggle','clock','btn btn-neutral btn-small')+
      (active?
        '<div class="nx-set-info-row"><strong>Connexion et file locale</strong><small role="status" aria-live="polite">'+
        e(canaryFeedback||'Vérifie la connexion depuis cette rubrique. Aucun contrôle automatique permanent.')+
        '</small></div>'+
        action('Vérifier la connexion','settings-link-notifications-status','refresh')+' '+
        action('Relancer la synchronisation','settings-link-notifications-retry','refresh'):
        '')+
      '<p class="pref-hint">'+(active?
        'Crée un nouveau rendez-vous et choisis tes alertes dans Me notifier. Les anciens rendez-vous ne sont pas migrés.':
        'Active uniquement pour les tests. Les autorisations iPhone et les abonnements Web Push restent gérés dans LINK.')+
      '</p>');
  }
  function linked(id){
    const pairs=env.data.linkConnections||[];
    return pairs.some(p=>p.sourceApp===id && (id!=='rituel'||!p.scopes?.includes('trip_context')));
  }
  function linkPage(){
    const vest=linked('vestiaire'),rit=linked('rituel'),gaming=linked('gaming');
    return '<div class="nx-set-stack">'+
      panel('LINK · Centre technique','Une seule passerelle pour les connexions, les appareils et les notifications.','link',
        '<p class="pref-hint">Les échanges chiffrés et les autorisations sont pilotés par LINK. Les données de Nexus restent dans Nexus.</p>'+
        '<a class="btn btn-soft btn-small" href="https://link-app.q9pfwtztsc.workers.dev/" target="_blank" rel="noopener noreferrer">Ouvrir LINK · Appareils et autorisations</a>')+
      linkNotificationsCanaryPanel()+
      panel('Notifications Nexus','Préférences conservées pendant le passage au moteur central.','clock',
        option('Paramètres de notifications Nexus','Préférences iOS et anciens rappels Nexus, conservés jusqu’à la fin de la migration.','push-settings','Configurer','sliders')+
        '<div class="nx-set-info-row"><strong>Rendez-vous et rappels</strong><small>Dans le mode test, choisis de 1 à 5 alertes directement dans Me notifier.</small></div>'+
        '<div class="nx-set-info-row"><strong>Budget</strong><small>Échéances et récurrences : réglages conservés dans Budget → Engagements.</small></div>')+
      panel('Applications','Connexions et réglages propres à chaque application.','link',
        '<div class="nx-set-app-list">'+
        link('Gaming','Bibliothèque, passes et propositions','bolt','app:gaming',gaming?'Clé LINK locale':'À vérifier dans LINK')+
        link('Rituel','Soins, achats et trousse de voyage','sparkle','app:rituel',rit?'Clé LINK locale':'À vérifier dans LINK')+
        link('Vestiaire','Tenues et suggestions contextuelles','users','app:vestiaire',vest?'Clé LINK locale':'À vérifier dans LINK')+
        link('Santé','Traitements du jour et agenda','shield','app:health',linked('sante')?'Clé LINK locale':'À vérifier dans LINK')+
        '</div><p class="pref-hint">Les autorisations techniques restent centralisées dans LINK ; les paramètres métier restent dans chaque application.</p>')+
      panel('Automatisations','Réception des propositions et inscriptions budgétaires autorisées.','refresh',
        '<div class="nx-set-app-list">'+link('Connect 2.0','Réception, examen et suivi budgétaire','sliders','apps-automation')+'</div>')+
      '</div>';
  }
  function appPage(id){
    if(id==='health'){
      return '<div class="nx-set-stack">'+(window.NexusSanteBridge?.settingsCard?.()||panel('Santé','Module en chargement.','shield',''))+'</div>';
    }
    if(id==='vestiaire')return '<div class="nx-set-stack">'+(window.NexusVestiaire?.settingsCard?.()||panel('Vestiaire','Module indisponible.','users',''))+'</div>';
    if(id==='gaming'||id==='rituel'){
      const pairing=window.NexusConnections?.settingsCard?.(id)||'';
      return '<div class="nx-set-stack">'+pairing+(id==='rituel'?(window.NexusTravel?.settingsCard?.()||''):'')+'</div>';
    }
    return '';
  }
  function securityPage(){
    return '<div class="nx-set-stack">'+panel('Accès et verrouillage','Contrôle l’accès à ton application.','shield',
      option('Face ID / passkeys','Configurer la protection de l’interface et ses méthodes de connexion.','passkey-settings','Configurer','sliders'))+
      panel('Confidentialité','Ce qui reste sur ton appareil.','info',
      '<div class="info-strip">'+ico('shield')+' Les données locales IndexedDB ne sont pas chiffrées au repos. Une passkey protège l’accès à l’interface, pas le stockage local. Les sauvegardes envoyées au coffre sont chiffrées côté appareil.</div>'+
      '<p class="pref-hint">Ne partage jamais un code de jumelage ni une clé de récupération. Gère les autorisations inter-applications dans LINK.</p>')+'</div>';
  }
  function dataPage(){
    const trash=window.NexusRecycle?.counts?.().items||0;
    return '<div class="nx-set-stack">'+
      panel('Coffre et synchronisation','Sauvegardes chiffrées et récupération.','shield',
        option('Ouvrir le coffre','Gérer les sauvegardes distantes, transferts et récupérations.','cloud-vault','Ouvrir','cloud'))+
      panel('Sauvegardes locales','Importer ou exporter tes données Nexus.','download',
        option('Exporter les données','Télécharge un fichier JSON complet, en clair.','export','Exporter','download')+
        option('Importer une sauvegarde','Remplace les données locales après vérification et confirmation.','restore','Importer','upload'))+
      panel('Entretien et restauration','Gère les éléments supprimés sans tout effacer.','trash',
        option('Corbeille universelle',trash+' élément(s) supprimé(s). Restaurations et suppression définitive.','trash-panel','Ouvrir','trash')+
        '<div class="nx-set-app-list">'+link('Réinitialisations par module','Actions sensibles et confirmations séparées','sliders','data-advanced')+'</div>'+
        '<p class="pref-hint">Les exports JSON ne sont pas chiffrés. Conserve-les dans un emplacement privé.</p>')+'</div>';
  }
  function advancedPage(){
    return panel('Réinitialisations par module','Conserve un contrôle précis sur les effacements.','trash',
      option('Gérer les réinitialisations','Vider uniquement un module et accéder aux options de retour arrière prévues.','trash-reset-center','Configurer','sliders')+
      '<div class="info-strip">'+ico('info')+' Vérifie ta sauvegarde avant toute suppression définitive. Ne désinstalle pas la PWA pour forcer une mise à jour.</div>');
  }
  function aboutPage(){
    return '<div class="nx-set-stack">'+panel('NEXUS · V'+env.version,'Ton second cerveau personnel · PWA iPhone.','info',
      option('Vérifier les mises à jour','Actualiser les fichiers sans désinstaller Nexus ni supprimer son stockage.','refresh-app','Actualiser','refresh'))+
      panel('À propos','Un centre, plusieurs applications spécialisées.','link',
      '<p class="nx-set-description">Nexus centralise ton quotidien : Pulse, Agenda, Rappels, Contacts, Projets et Budget. Gaming, Rituel, Vestiaire et Santé restent des espaces dédiés.</p>'+
      '<p class="pref-hint">Version de l’interface : '+e(env.version)+' · Hébergement PWA · Données locales et coffre optionnel.</p>')+'</div>';
  }
  function view(adapter){
    env=adapter;
    if(!routes.some(x=>x.id===page)&&page!=='home')page='home';
    if(page==='home')return home();
    const current=routes.find(x=>x.id===page);
    const isApp=page.startsWith('app:'),isNested=isApp||page==='apps-automation'||page==='data-advanced';
    const back=isApp||page==='apps-automation'?'link':page==='data-advanced'?'data':'home';
    const title=current?.label||'Réglages';
    let body='';
    if(page==='interface')body=interfacePage();
    if(page==='link')body=linkPage();
    if(isApp)body=appPage(page.slice(4));
    if(page==='apps-automation')body=window.NexusConnect2?.settingsCard?.()||'';
    if(page==='security')body=securityPage();
    if(page==='data')body=dataPage();
    if(page==='data-advanced')body=advancedPage();
    if(page==='about')body=aboutPage();
    return '<div class="nx-set-subpage"><button type="button" class="nx-set-back" data-action="settings-open" data-page="'+back+'">'+ico('chevleft')+e(isNested?(back==='link'?'LINK':'Données et sauvegardes'):'Réglages')+'</button>'+
      '<div class="nexus-page-heading nx-set-subhead"><div class="eyebrow">NEXUS · RÉGLAGES</div><h1 class="page-title">'+e(title)+'<span class="punctuation">.</span></h1><p class="subtitle">'+e(current?.detail||'')+'</p></div>'+
      body+'<p class="nx-set-footer">NEXUS · V'+e(env.version)+'</p></div>';
  }
  function updateCanaryStatus(message){
    canaryFeedback=message;
    if(page==='link')env?.render?.();
  }
  async function inspectCanary({retry=false}={}){
    if(canaryBusy||!liveCanaryActive())return;
    canaryBusy=true;
    updateCanaryStatus(retry?'Reprise des changements locaux…':'Vérification locale de la connexion…');
    try{
      const pilot=window.NexusLinkNotifyPilot;
      if(pilot?.mode?.()!=='live'||!pilot?.status)
        throw Error('Module notifications LINK indisponible. Mets Nexus à jour.');
      const outcome=retry?await pilot.retryPending():null;
      const status=await pilot.status();
      updateCanaryStatus((status.linked?'Nexus ↔ LINK détecté.':'Connexion Hub absente. Ouvre LINK pour vérifier l’inscription.')+
        ' File locale : '+status.pending+' changement(s) en attente.'+
        (outcome?' '+outcome.retried+' repris.':''));
    }catch(error){
      updateCanaryStatus('Vérification indisponible : '+String(error?.message||'Réessaie.').slice(0,110));
    }finally{canaryBusy=false;}
  }
  function act(kind,target){
    if(kind==='settings-link-notifications-status'||kind==='settings-link-notifications-retry'){
      void inspectCanary({retry:kind==='settings-link-notifications-retry'});
      return true;
    }
    if(kind==='settings-link-notifications-toggle'){
      // Only canonical Nexus may opt into the real LINK canary. This changes
      // the URL mode, never the private Hub credential or an iOS subscription.
      if(!liveCanaryAvailable())return true;
      const next=new URL(window.location.href);
      if(liveCanaryActive())next.searchParams.delete('linkNotificationsLive');
      else next.searchParams.set('linkNotificationsLive','1');
      next.searchParams.delete('linkNotificationsPilot');
      window.location.assign(next.href);
      return true;
    }
    if(kind==='settings-theme'){
      const value=target?.dataset?.theme;
      if(['sage','slate'].includes(value)){env.UI.theme=value;env.saveUI?.();}
      return true;
    }
    if(kind!=='settings-open')return false;
    const requested=target?.dataset?.page;
    // Old deep-links remain valid without restoring duplicate navigation tabs.
    const next=['notifications','apps'].includes(requested)?'link':requested;
    if(next!=='home'&&!routes.some(x=>x.id===next))return true;
    page=next;search='';env?.render?.();
    window.scrollTo?.({top:0,behavior:'instant'});
    return true;
  }
  function onInput(target){
    if(target?.id!=='nx-settings-search')return false;
    search=target.value.slice(0,120);
    const container=document.getElementById('nx-settings-results');
    if(container)container.innerHTML=results();
    return true;
  }
  function reset(){page='home';search='';}
  window.NexusSettings=Object.freeze({view,act,onInput,reset});
})();
