/* NEXUS LINK inbound Gaming proposals — explicit review, durable dedupe, no silent writes. */
'use strict';
(()=>{
 let api=null,working=false;
 const esc=x=>api.escape(String(x??''));
 const clean=(x,n)=>String(x??'').trim().slice(0,n);
 const validDate=x=>{
  if(typeof x!=='string'||!/\d{4}-\d\d-\d\d/.test(x)||x.length!==10)return false;
  const d=new Date(x+'T12:00:00Z');
  return !isNaN(d.getTime())&&d.toISOString().startsWith(x);
 };
 const targetLabel={events:'Agenda',tasks:'Rappels',purchases:'Achats',transactions:'Budget',notes:'Notes'};
 // An accepted proposal can outlive a transaction deleted from the Budget (single item or module reset).
 // Keep deduplication anchored to the active source identity, even after another LINK review recreated it.
 function activeTarget(item){
  const kind=item?.payload?.destination;
  const collection=api?.state()?.[kind];
  if(!Array.isArray(collection))return null;
  const direct=item.targetId?collection.find(x=>x.id===item.targetId):null;
  if(direct)return direct;
  if(kind!=='transactions')return null;
  const sourceId=item.payload?.sourceId;
  if(!sourceId)return null;
  const bySource=collection.find(x=>x.originApp==='gaming'&&x.originSourceId===sourceId);
  if(bySource)return bySource;
  return collection.find(x=>(api.state().linkInbox||[]).some(other=>other!==item&&other.status==='accepted'&&
   other.payload?.sourceApp==='gaming'&&other.payload?.sourceId===sourceId&&other.targetId===x.id))||null;
 }
 function missingBudgetTarget(item){
  return item?.payload?.destination==='transactions'&&!!item.targetId&&!activeTarget(item);
 }
 const mapping={
  installed_summary:['notes'],future_spending:['purchases'],pass_deadline:['events','tasks'],
  pass_paid:['transactions'],dlc_release:['events','purchases'],
  game_release:['events','purchases'],gaming_event:['events']
 };
 function connection(){return api?.state().linkConnections?.find(x=>x.sourceApp==='gaming')}
 function list(){return api?.state().linkInbox||[]}
 function valid(msg,pair){
  const p=msg?.payload;
  if(msg?.invalid||!p||p.type!=='gaming.proposal.v1'||p.sourceApp!=='gaming'||
     !pair.scopes.includes(msg.scope)||!mapping[msg.scope]?.includes(p.destination)||
     typeof msg.sourceKey!=='string'||!/^[a-f0-9]{64}$/i.test(msg.sourceKey)||
     !Number.isSafeInteger(msg.revision)||msg.revision<1||msg.revision>1e6||
     typeof p.title!=='string'||!p.title.trim()||p.title.length>140||
     typeof p.sourceId!=='string'||!p.sourceId||p.sourceId.length>140||
     typeof p.game!=='string'||p.game.length>100||
     typeof p.details!=='string'||p.details.length>500)return false;
  if(p.date&&!validDate(p.date))return false;
  if(typeof p.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time))return false;
  if(p.priceCents!==null&&(!Number.isSafeInteger(p.priceCents)||p.priceCents<0||p.priceCents>1e10))return false;
  if(p.currency!=null&&p.currency!=='EUR')return false;
  if((p.destination==='events'||p.destination==='tasks')&&!validDate(p.date))return false;
  return true;
 }
 async function persistVerified(){
  await api.persist();
  // Never acknowledge a server message unless the full local inbox has been written successfully.
  if(!(await api.verify()))throw Error('Sauvegarde NEXUS non vérifiée. Messages laissés sur le serveur.');
 }
 async function synchronize(){
  const pair=connection();if(!pair)throw Error('Aucun jumelage Gaming enregistré.');
  if(working)return {busy:true};
  if(!window.NexusLinkCore)throw Error('Module NEXUS LINK indisponible.');
  working=true;
  let received=0,invalid=0,acked=0;
  try{
   for(let round=0;round<6;round++){
    const messages=await window.NexusLinkCore.inbox(pair);
    if(!messages.length)break;
    const toAck=[];
    let changed=false;
    for(const msg of messages){
     if(msg?.payload?.type==='test.ping'){toAck.push(msg.id);continue}
     if(!valid(msg,pair)){invalid++;continue}
     const entry=list().find(x=>x.pairId===pair.id&&x.sourceKey===msg.sourceKey);
     if(!entry){
      api.state().linkInbox.push({id:api.uid(),pairId:pair.id,sourceKey:msg.sourceKey,
       revision:msg.revision,scope:msg.scope,payload:msg.payload,status:'pending',
       createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),targetId:'',targetKind:''});
      changed=true;received++;
     }else if(msg.revision>entry.revision){
      entry.revision=msg.revision;entry.payload=msg.payload;entry.scope=msg.scope;
      entry.status='pending';entry.updatedAt=new Date().toISOString();changed=true;received++;
     }
     toAck.push(msg.id);
    }
    if(changed||(toAck.length&&!(await api.verify())))await persistVerified();
    for(const id of toAck){
     try{await window.NexusLinkCore.acknowledge(pair,id);acked++}
     catch(e){console.warn('NEXUS LINK ack retry on next pull',e.message)}
    }
    if(!toAck.length||messages.length<50)break;
   }
   if(received>0)(api.safeRender||api.render)?.();
   return {received,invalid,acked};
  }finally{working=false}
 }
 async function pull(){
  try{const stats=await synchronize();api.toast(stats.received+' proposition(s) reçue(s).');panel()}
  catch(e){api.toast('Réception Gaming : '+e.message.slice(0,80))}
 }
 const OBSERVER_LINK_URL='https://link-app.q9pfwtztsc.workers.dev/';
 function observation(){
  if(!api)throw Error('NEXUS n’est pas initialisé');
  const pair=connection();
  const rows=pair?list().filter(x=>x.pairId===pair.id&&['pending','accepted','rejected'].includes(x.status)):[];
  const count=status=>rows.filter(x=>x.status===status).length;
  const times=rows.map(x=>Date.parse(x.createdAt)).filter(x=>Number.isFinite(x)&&x<=Date.now()+300000);
  return {
   schema:'link.observation.nexus.v1',
   contractId:'gaming-nexus',app:'nexus',
   createdAt:new Date().toISOString(),paired:!!pair,
   scopeCount:pair?.scopes?.length||0,
   recorded:rows.length,pending:count('pending'),accepted:count('accepted'),rejected:count('rejected'),
   lastRecordedAt:times.length?new Date(Math.max(...times)).toISOString():null
  };
 }
 function observationCode(report){
  const value=JSON.stringify(report),bytes=new TextEncoder().encode(value);
  let text='';for(const b of bytes)text+=String.fromCharCode(b);
  return 'LDN1.'+btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 }
 function observe(){
  if(!api)return;
  let snapshot,code;
  try{snapshot=observation();code=observationCode(snapshot)}
  catch(err){api.toast('Diagnostic LINK : '+clean(err?.message,80));return;}
  const href=OBSERVER_LINK_URL+'#nexus-observe='+encodeURIComponent(code);
  const html='<div class="nx-gaming-import">'
   +'<div class="info-strip">Relevé local de la boîte de réception Gaming. Aucune clé, invitation NXL1, donnée de jeu, dépense ou identité de paire n’est exportée. Ce n’est pas une preuve d’accusé réception serveur.</div>'
   +'<div class="nx-gaming-stats"><div><strong>'+snapshot.recorded+'</strong><small>Propositions conservées</small></div>'
   +'<div><strong>'+snapshot.pending+'</strong><small>À examiner</small></div>'
   +'<div><strong>'+snapshot.accepted+'</strong><small>Acceptées</small></div></div>'
   +'<p class="muted-note">Jumelage : '+(snapshot.paired?'configuré':'absent')+' · '+snapshot.scopeCount+' permission(s) · '+snapshot.rejected+' ignorée(s). Les propositions historiques peuvent différer du catalogue actuel Gaming.</p>'
   +'<div class="form-actions"><a class="btn" href="'+href+'" target="_blank" rel="noopener noreferrer">Ouvrir dans LINK ↗</a>'
   +'<button class="btn btn-neutral" type="button" id="nx-link-observer-copy">Copier le code</button></div>'
   +'<label class="field"><span>Code technique de diagnostic (LDN1)</span><textarea id="nx-link-observer-code" rows="4" readonly style="width:100%;overflow-wrap:anywhere;word-break:break-all">'+code+'</textarea></label>'
   +'<p class="muted-note">Si iOS ouvre Safari plutôt que LINK, copie le code et colle-le dans LINK → Diagnostic → Côté Nexus. Ce relevé ne déclenche aucun échange et ne modifie aucune proposition.</p></div>';
  api.modal('LINK · Diagnostic côté Nexus',html);
  document.getElementById('nx-link-observer-copy')?.addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(code);api.toast('Diagnostic Nexus copié pour LINK.')}
   catch{
    const el=document.getElementById('nx-link-observer-code');
    el?.select();
    try{if(!document.execCommand?.('copy'))throw Error('COPY_UNSUPPORTED');api.toast('Diagnostic copié.')}
    catch{api.toast('Sélectionne le code puis utilise Copier.')}
   }
  });
 }
 async function auditSnapshot(){
  if(!api||!window.LinkAudit)throw Error('Module de vérification LINK indisponible.');
  const p=connection();
  if(!p)return window.LinkAudit.snapshot(null,'nexus',[]);
  const rows=list().filter(x=>x?.pairId===p.id&&
    ['pending','accepted','rejected'].includes(x.status)&&
    typeof x.sourceKey==='string'&&/^[a-f0-9]{64}$/i.test(x.sourceKey)&&
    Number.isSafeInteger(x.revision)&&x.revision>0&&x.revision<=1000000)
   .map(x=>({sourceKey:x.sourceKey,revision:x.revision}));
  return window.LinkAudit.snapshot(p,'nexus',rows);
 }
 async function auditPanel(){
  if(!api)return;
  let report,code;
  try{report=await auditSnapshot();code=window.LinkAudit.encode(report)}
  catch(err){api.toast('Vérification LINK : '+clean(err?.message,80));return}
  const href=OBSERVER_LINK_URL+'#audit='+encodeURIComponent(code);
  const html='<div class="nx-gaming-import">'+
   '<div class="info-strip">Empreintes temporaires des propositions Gaming conservées dans la boîte de réception Nexus. Aucune clé, code NXL1, identité, titre, montant ou contenu de message n’est exporté. Ce contrôle ne prouve pas un accusé de réception du serveur.</div>'+
   '<div class="nx-gaming-stats"><div><strong>'+report.total+'</strong><small>Événements conservés</small></div>'+
   '<div><strong>'+report.events.length+'</strong><small>Empreintes temporaires</small></div></div>'+
   '<p class="muted-note">Jour UTC : '+report.day+'. '+(report.limited?'Échantillon limité à 128 événements.':'Rapport non tronqué.')+
   ' Fais le même contrôle dans Gaming aujourd’hui pour comparer les événements dans LINK.</p>'+
   '<div class="form-actions"><a class="btn" target="_blank" rel="noopener noreferrer" href="'+href+'">Comparer dans LINK ↗</a>'+
   '<button class="btn btn-neutral" id="nx-link-audit-copy" type="button">Copier le code</button></div>'+
   '<label class="field"><span>Code temporaire de concordance (LDA1)</span><textarea id="nx-link-audit-code" rows="4" readonly style="width:100%;overflow-wrap:anywhere;word-break:break-all">'+code+'</textarea></label>'+
   '<p class="muted-note">Si Safari s’ouvre au lieu de LINK, utilise le copier-coller dans LINK → Diagnostic → Concordance des événements. Aucune donnée de Nexus n’est modifiée.</p></div>';
  api.modal('LINK · Concordance des événements',html);
  document.getElementById('nx-link-audit-copy')?.addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(code);api.toast('Code temporaire Nexus copié.')}
   catch{
    const el=document.getElementById('nx-link-audit-code');el?.select();
    try{if(!document.execCommand?.('copy'))throw Error('COPY_UNSUPPORTED');api.toast('Code copié.')}
    catch{api.toast('Sélectionne le code et utilise Copier.')}
   }
  });
 }
 const counters=()=>{const p=connection(),rows=list().filter(x=>x.pairId===p?.id);return {
  pending:rows.filter(x=>x.status==='pending').length,
  accepted:rows.filter(x=>x.status==='accepted').length,
  rejected:rows.filter(x=>x.status==='rejected').length};};
 function panel(){
  const pair=connection();if(!pair){api.toast('Jumelle d’abord Gaming à NEXUS.');return}
  const mine=list().filter(x=>x.pairId===pair.id).sort((a,b)=>
   Number(b.status==='pending')-Number(a.status==='pending')||String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const totals=counters();
  api.modal('NEXUS LINK · Propositions Gaming',`<div class="nx-gaming-import">
   <div class="info-strip">Gaming chiffre les propositions. Rien n’est ajouté aux modules NEXUS sans ta validation. Une modification provenant de Gaming sera examinée comme une nouvelle révision.</div>
   <div class="nx-gaming-stats"><div><strong>${totals.pending}</strong><small>À examiner</small></div>
    <div><strong>${totals.accepted}</strong><small>Acceptées</small></div><div><strong>${totals.rejected}</strong><small>Ignorées</small></div></div>
   <div class="form-actions"><button class="btn" data-action="link-pull">Recevoir depuis Gaming</button>
    <button class="btn btn-neutral" data-action="link-show-code">Code de jumelage</button>
    <button class="btn btn-soft" data-action="link-observe">Diagnostic LINK</button>
    <button class="btn btn-soft" data-action="link-audit">Vérifier les événements</button></div>
   <div class="nx-gaming-proposals">${mine.length?mine.map(x=>`<div class="nx-gaming-proposal">
    <div class="nx-gaming-proposal-head"><strong>${esc(x.payload.title)}</strong><span class="nx-proposal-state">${missingBudgetTarget(x)?'Dépense supprimée':x.status==='pending'?'À examiner':x.status==='accepted'?'Acceptée':'Ignorée'}</span></div>
    <small>${esc(targetLabel[x.payload.destination]||'NEXUS')} · ${esc(x.payload.game||'Gaming')} · Révision ${x.revision}
    ${x.payload.date?' · '+esc(x.payload.date):''}
    ${x.payload.priceCents!=null?' · '+(x.payload.priceCents/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):''}</small>
    <div class="form-actions"><button class="btn btn-soft btn-small" data-action="link-review" data-id="${esc(x.id)}">${x.status==='pending'?'Examiner':'Voir / réexaminer'}</button></div>
   </div>`).join(''):'<p class="muted-note">Aucune proposition pour le moment. Lance l’envoi depuis Gaming, puis appuie sur « Recevoir ».</p>'}</div>
   <p class="muted-note">Les propositions acceptées restent tracées dans ta sauvegarde chiffrée. Les éléments créés restent indépendants et peuvent être modifiés normalement dans NEXUS.</p>
   </div>`);
 }
 function review(id){
  const item=list().find(x=>x.id===id);if(!item)return;
  const p=item.payload,kind=p.destination,exists=!!activeTarget(item),missing=missingBudgetTarget(item);
  const date=kind==='transactions'?(p.paymentDate||api.today()):p.date||'';
  const price=p.priceCents!=null?(p.priceCents/100).toFixed(2):'';
  const projects=api.state().projects||[];
  const chooser=['events','tasks','purchases','transactions'].includes(kind)?
   `<label class="field"><span>Projet NEXUS (facultatif)</span><select name="projectId">
     <option value="">Aucun</option>${projects.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</select></label>`:'';
  api.modal('Examiner · '+p.title,`<div class="nx-gaming-review">
   <p class="muted-note">Destination : <strong>${esc(targetLabel[kind])}</strong> · Données proposées par Gaming.
    ${exists?'Cette proposition mettra à jour le même élément NEXUS après confirmation.':''}</p>
   ${missing?'<p class="muted-note">La dépense liée a été supprimée de ton Budget. Tu peux la restaurer depuis la corbeille ou choisir de la réimporter ici. La restauration de l’ancienne dépense sera bloquée si cela crée un doublon.</p>':''}
   <form id="nx-gaming-approve" class="nx-gaming-approve">
    <label class="field"><span>Titre</span><input type="text" name="title" maxlength="140" required value="${esc(p.title)}"></label>
    ${kind!=='notes'?`<label class="field"><span>${kind==='transactions'?'Date réelle de paiement':'Date'}</span>
     <input type="date" name="date" ${kind==='purchases'?'':'required'} value="${esc(date)}"></label>`:''}
    ${['purchases','transactions'].includes(kind)?`<label class="field"><span>Montant (€)${kind==='purchases'?' facultatif':''}</span>
     <input type="text" name="price" inputmode="decimal" ${kind==='transactions'?'required':''} value="${esc(price)}" placeholder="Ex. 6,99"></label>`:''}
    ${chooser}
    <label class="field"><span>Commentaire</span><textarea name="details" maxlength="1500">${esc(p.details)}</textarea></label>
    <div class="form-actions"><button type="button" class="btn btn-neutral" data-action="link-reject" data-id="${esc(item.id)}">Ignorer</button>
     <button type="submit" class="btn">${exists?'Confirmer la mise à jour':missing?'Réimporter dans le Budget':'Ajouter à NEXUS'}</button></div></form></div>`);
  document.getElementById('nx-gaming-approve')?.addEventListener('submit',async e=>{
   e.preventDefault();
   const f=new FormData(e.currentTarget),values=Object.fromEntries(f.entries());
   await approve(item.id,values);
  });
 }
 function cents(value){
  const t=String(value||'').trim().replace(/\s/g,'').replace(',','.');
  if(!t)return null;
  if(!/^\d+(?:\.\d{1,2})?$/.test(t))return NaN;
  const n=Math.round(Number(t)*100);
  return Number.isSafeInteger(n)&&n>=0&&n<=1e10?n:NaN;
 }
 async function approve(id,form){
  const item=list().find(x=>x.id===id);if(!item)return;
  const kind=item.payload.destination,now=new Date().toISOString();
  const title=clean(form.title,140),date=String(form.date||'');
  const price=cents(form.price),projectId=String(form.projectId||'');
  if(!title||kind!=='notes'&&kind!=='purchases'&&!validDate(date)||
   date&&!validDate(date)||Number.isNaN(price)||
   kind==='transactions'&&(price===null||price<=0)||
   projectId&&!api.state().projects.some(x=>x.id===projectId)){
   api.toast('Vérifie le titre, la date, le montant et le projet.');return;
  }
  const collection=api.state()[kind];
  const target=activeTarget(item);
  if(item.targetId&&!target&&kind!=='transactions'){
   api.toast('L’élément NEXUS lié a été supprimé. Restaure-le depuis la corbeille avant de réexaminer.');return;
  }
  // Explicit reimport from this review creates a fresh ID; the deleted record stays in the trash.
  // No background/automatic replay is enabled by this pathway. 
  const data={...target,id:target?.id||api.uid(),createdAt:target?.createdAt||now,updatedAt:now,
    title,originApp:'gaming',originSourceId:item.payload.sourceId,originLink:{pairId:item.pairId,sourceKey:item.sourceKey,revision:item.revision}};
  if(kind==='events')Object.assign(data,{start:date+'T'+item.payload.time+':00',details:clean(form.details,1500),
    location:target?.location||'',reminderMinutes:target?.reminderMinutes||[],projectId:projectId||target?.projectId||''});
  if(kind==='tasks')Object.assign(data,{dueDate:date,dueTime:item.payload.time,done:target?.done||false,
    projectId:projectId||target?.projectId||''});
  if(kind==='purchases')Object.assign(data,{status:target?.status||'planned',priority:target?.priority||1,
    projectId:projectId||target?.projectId||'',shop:target?.shop||'',priceCents:price,
    details:clean(form.details,1500),plannedDate:date||null});
  if(kind==='transactions')Object.assign(data,{type:'expense',amountCents:price,date,category:target?.category||'Loisirs',
    projectId:projectId||target?.projectId||'',notes:clean(form.details,1500)});
  if(kind==='notes')Object.assign(data,{body:clean(form.details,1500),projectId:target?.projectId||''});
  // Mutate atomically in app memory, verify local commit before confirming approval.
  const old=target?JSON.parse(JSON.stringify(target)):null,ix=target?collection.indexOf(target):-1;
  const oldEntry=JSON.parse(JSON.stringify(item));
  if(ix>=0)collection[ix]=data;else collection.push(data);
  item.targetId=data.id;item.targetKind=kind;item.status='accepted';item.updatedAt=now;
  try{
   await persistVerified();
   if(kind==='transactions'&&api.verifyLedger&&
    !(await api.verifyLedger(data.id,item.pairId,item.sourceKey)))throw Error('Écriture Budget non vérifiée');
   api.render();api.toast(target?'Élément Gaming mis à jour dans NEXUS.':oldEntry.targetId?'Dépense Gaming réimportée dans le Budget.':'Proposition Gaming ajoutée à NEXUS.');
   panel();
  }catch(err){
   if(ix>=0)collection[ix]=old;else{
    const inserted=collection.findIndex(x=>x.id===data.id);
    if(inserted>=0)collection.splice(inserted,1);
   }
   for(const key of Object.keys(item))if(!(key in oldEntry))delete item[key];
   Object.assign(item,oldEntry);
   // A save may have reached IndexedDB but failed verification; restore the prior snapshot too.
   try{await api.persist()}catch(rollbackError){console.warn('NEXUS LINK rollback failed',rollbackError);}
   api.toast('Enregistrement refusé : '+err.message.slice(0,75));
  }
 }
 async function reject(id){
  const item=list().find(x=>x.id===id);if(!item)return;
  item.status='rejected';item.updatedAt=new Date().toISOString();
  try{await persistVerified();panel();api.toast('Proposition ignorée, sans supprimer le jeu Gaming.')}
  catch(e){item.status='pending';api.toast('Enregistrement impossible.')}
 }
 function act(kind,button){
  if(kind==='link-proposals'){panel();return true}
  if(kind==='link-observe'){observe();return true}
  if(kind==='link-audit'){void auditPanel();return true}
  if(kind==='link-pull'){pull();return true}
  if(kind==='link-review'){review(button.dataset.id);return true}
  if(kind==='link-reject'){reject(button.dataset.id);return true}
  return false;
 }
 function attach(model){api=model}
 window.NexusGamingImport=Object.freeze({attach,synchronize,panel,review,approve,act,valid,counters,observation,observe,auditSnapshot,auditPanel});
})();