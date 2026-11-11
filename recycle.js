/* NEXUS V0.10 — Recycle bin, safe undo and modular reset. */
'use strict';
(() => {
 const CONFIG=[
  {id:'notes',name:'Notes',keys:['notes'],icon:'notes'},
  {id:'calendar',name:'Agenda',keys:['events'],icon:'calendar'},
  {id:'tasks',name:'Rappels',keys:['tasks'],icon:'check'},
  {id:'contacts',name:'Personnes',keys:['contacts'],icon:'users'},
  {id:'projects',name:'Projets',keys:['projects'],icon:'briefcase'},
  {id:'purchases',name:'Achats',keys:['purchases'],icon:'cart'},
  {id:'budget',name:'Budget',keys:['transactions','limits','recurrences','quickExpenses','budgetCategories','savingsGoals'],icon:'wallet'}
 ];
 const TITLES={notes:'Note',events:'Rendez-vous',tasks:'Rappel',contacts:'Personne',
  projects:'Projet',purchases:'Achat',transactions:'Opération',
  limits:'Plafond',recurrences:'Récurrence',quickExpenses:'Raccourci',budgetCategories:'Catégorie',savingsGoals:'Objectif d’épargne'};
 const KEY_SET=new Set(CONFIG.flatMap(module=>module.keys));
 const clone=obj=>JSON.parse(JSON.stringify(obj));
 const formatTitle=(key,obj)=>String(obj?.title||obj?.name||obj?.month||TITLES[key]||'Élément').slice(0,140);
 const safe=value=>escapeHtml(value);
 const contents=()=>Array.isArray(data.trash)?data.trash:[];
 function counts(){
  return {entries:contents().length,items:contents().reduce((sum,entry)=>sum+(Array.isArray(entry.items)?entry.items.length:1),0)};
 }
 const categoryStatus=(id)=>contents().some(e=>e.key==='budgetCategories'&&e.record?.id===id);
 const toastUndo=(message,id)=>{
  const node=document.getElementById('toast');
  if(!node){toast(message);return;}
  node.innerHTML=`${safe(message)} <button class="nx-undo-action" data-action="trash-restore" data-id="${safe(id)}">Annuler</button>`;
  node.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>node.classList.remove('visible'),9500);
 };
 function pushTrash(key,record,reason='manual'){
  if(!KEY_SET.has(key)||!record||typeof record!=='object'||!record.id)return null;
  const entry={id:uid(),key,record:clone(record),label:formatTitle(key,record),
    deletedAt:new Date().toISOString(),reason};
  data.trash.push(entry);
  return entry;
 }
 async function remove(key,id,{ask=true,notify=true}={}){
  if(!KEY_SET.has(key))return false;
  const record=data[key].find(x=>x.id===id);
  if(!record)return false;
  if(ask&&!confirm('Placer « '+formatTitle(key,record)+' » dans la corbeille ? Les éléments associés resteront enregistrés.'))return false;
  const entry=pushTrash(key,record);
  if(!entry)return false;
  // A deleted automatic income must not be silently re-created the next time NEXUS opens.
  if(key==='transactions'&&record.autoRecorded===true&&record.recurrenceId&&record.occurrenceKey){
   const rule=data.recurrences.find(x=>x.id===record.recurrenceId);
   if(rule){rule.skips=[...new Set([...(rule.skips||[]),record.occurrenceKey])];rule.updatedAt=new Date().toISOString();}
  }
  // Keep foreign-key references untouched so they reconnect upon restoration.
  data[key]=data[key].filter(x=>x.id!==id);
  await persist();closeModal();render();
  if(notify)toastUndo('Déplacé dans la corbeille.',entry.id);
  return entry.id;
 }
 async function removeCategory(record){
  if(!record?.id)return false;
  if(!confirm('Placer la catégorie « '+record.name+' » dans la corbeille ? Les opérations historiques garderont leur libellé.'))return false;
  if(categoryStatus(record.id))return false;
  const entry=pushTrash('budgetCategories',record);
  if(!entry)return false;
  data.budgetCategories=data.budgetCategories.filter(x=>x.id!==record.id);
  await persist();closeModal();render();
  toastUndo('Catégorie placée dans la corbeille.',entry.id);
  return true;
 }
 async function restore(id){
  const entry=contents().find(x=>x.id===id);
  if(!entry)return false;
  const items=Array.isArray(entry.items)?entry.items:[{key:entry.key,record:entry.record}];
  if(!items.length||items.some(x=>!KEY_SET.has(x.key)||!x.record?.id))return false;
  const conflicts=items.filter(x=>data[x.key].some(existing=>existing.id===x.record.id));
  if(conflicts.length){
   alert('Impossible de restaurer : un élément portant le même identifiant existe déjà. Aucun élément n’a été écrasé.');
   return false;
  }
  for(const x of items){
   data[x.key].push(clone(x.record));
   if(x.key==='transactions'&&x.record.autoRecorded===true&&x.record.recurrenceId&&x.record.occurrenceKey){
    const rule=data.recurrences.find(r=>r.id===x.record.recurrenceId);
    if(rule){rule.skips=(rule.skips||[]).filter(key=>key!==x.record.occurrenceKey);rule.updatedAt=new Date().toISOString();}
   }
  }
  data.trash=data.trash.filter(x=>x.id!==id);
  await persist();closeModal();render();toast(items.length>1?items.length+' éléments restaurés.':'Élément restauré.');
  return true;
 }
 const dateLabel=date=>{try{return new Date(date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});}catch{return '';}};
 function trashPanel(){
  const entries=[...contents()].reverse();
  modal('Corbeille NEXUS',`<div class="nx-trash">
    <p class="muted-note">Restaure un élément ou un groupe entier. Les données restent dans ta corbeille et dans les sauvegardes chiffrées jusqu'à leur suppression définitive.</p>
    <div class="nx-trash-overview">${counts().items} élément(s) · ${counts().entries} suppression(s)</div>
    <div class="nx-trash-list">${entries.length?entries.map(e=>{
      const bundle=Array.isArray(e.items);
      const label=bundle?e.label:formatTitle(e.key,e.record);
      const type=bundle?'Réinitialisation de module':(TITLES[e.key]||e.key);
      const amount=bundle?`${e.items.length} éléments · `:'';
      return `<div class="nx-trash-entry">
        <div class="nx-trash-info"><strong>${safe(label)}</strong><small>${safe(type)} · ${amount}${dateLabel(e.deletedAt)}</small></div>
        <button class="btn btn-soft btn-small" data-action="trash-restore" data-id="${safe(e.id)}">Restaurer</button>
        <button class="btn btn-neutral btn-small" data-action="trash-delete-forever" data-id="${safe(e.id)}" title="Supprimer définitivement">${svg('trash')}</button>
       </div>`;
    }).join(''):`<div class="nx-trash-empty">${svg('check')} <strong>Corbeille vide</strong><p>Aucun élément supprimé.</p></div>`}</div>
    <div class="form-actions"><button class="btn btn-neutral" data-action="close-modal">Fermer</button>
     ${entries.length?`<button class="btn btn-danger" data-action="trash-empty">Vider définitivement</button>`:''}</div>
    </div>`);
 }
 async function permanentlyDelete(id){
  const entry=contents().find(x=>x.id===id);if(!entry)return;
  if(!confirm('Supprimer définitivement « '+entry.label+' » de la corbeille ? Cette action est irréversible sans export externe.'))return;
  data.trash=data.trash.filter(x=>x.id!==id);
  await persist();trashPanel();toast('Suppression définitive effectuée.');
 }
 async function emptyTrash(){
  if(!contents().length)return;
  const input=prompt('Cette action supprimera définitivement '+counts().items+' élément(s) de la corbeille. Tape VIDER pour confirmer.');
  if(input!=='VIDER'){toast('Corbeille inchangée.');return;}
  data.trash=[];
  await persist();trashPanel();toast('Corbeille vidée définitivement.');
 }
 function resetCenter(){
  modal('Réinitialisations par module',`<div class="nx-reset">
   <p class="muted-note">Chaque module peut être vidé séparément. Ses données sont déplacées dans la corbeille, pour pouvoir revenir en arrière. Les liens vers les autres modules sont conservés pour une future restauration.</p>
   <div class="nx-reset-modules">${CONFIG.map(module=>{
    const n=module.keys.reduce((sum,key)=>sum+data[key].length,0);
    return `<div class="nx-reset-row"><span class="nx-reset-icon">${svg(module.icon)}</span>
      <span><strong>${module.name}</strong><small>${n} élément(s) actif(s)</small></span>
      <button class="btn btn-neutral btn-small" data-action="trash-reset-module" data-module="${module.id}" ${n===0?'disabled':''}>Réinitialiser</button>
    </div>`;
   }).join('')}</div>
   <div class="info-strip">${svg('info')} Les réinitialisations sont locales, mais leurs modifications peuvent aussi être synchronisées vers ton coffre cloud. Fais un export JSON avant toute opération importante.</div>
   <p class="muted-note">Réinitialisation complète (coffre, notifications, passkeys et stockage local) : non disponible dans cette version. Elle demandera un parcours de sécurité dédié.</p>
   <div class="form-actions"><button class="btn btn-neutral" data-action="close-modal">Fermer</button>
    <button class="btn btn-soft" data-action="trash-panel">${svg('trash')} Voir la corbeille</button></div>
   </div>`);
 }
 async function resetModule(id){
  const module=CONFIG.find(x=>x.id===id);if(!module)return false;
  const items=module.keys.flatMap(key=>data[key].map(record=>({key,record:clone(record)})));
  if(!items.length){toast('Ce module est déjà vide.');return false;}
  const word=prompt('Réinitialiser '+module.name+' ('+items.length+' éléments) ? Toutes ses données passeront dans la corbeille. Tape '+module.name.toUpperCase()+' pour confirmer.');
  if(word!==module.name.toUpperCase()){toast('Réinitialisation annulée.');return false;}
  const entry={id:uid(),items,label:'Module '+module.name,deletedAt:new Date().toISOString(),reason:'module-reset'};
  data.trash.push(entry);
  for(const key of module.keys)data[key]=[];
  await persist();closeModal();render();toastUndo('Module '+module.name+' placé dans la corbeille.',entry.id);
  return true;
 }
 function act(action,button){
  if(action==='trash-panel')return trashPanel();
  if(action==='trash-reset-center')return resetCenter();
  if(action==='trash-restore')return restore(button.dataset.id);
  if(action==='trash-delete-forever')return permanentlyDelete(button.dataset.id);
  if(action==='trash-empty')return emptyTrash();
  if(action==='trash-reset-module')return resetModule(button.dataset.module);
 }
 window.NexusRecycle={act,remove,removeCategory,restore,trashPanel,resetCenter,resetModule,counts,categoryStatus};
})();