/* NEXUS V0.8 — Budget cockpit, local-first. No bank automation or hidden bookings. */
'use strict';
(() => {
 const tabs=[['overview','Vue d’ensemble'],['journal','Journal'],['stats','Statistiques']];
  const sections=[['daily','Quotidien'],['commitments','Engagements'],['goals','Objectifs']];
 const frequencies={monthly:'Mensuelle',weekly:'Hebdomadaire',yearly:'Annuelle'};
 const JOURNAL_FILTERS_KEY='nexus_budget_journal_filters_v010';
 function readJournalFilters(){
  try{
   const parsed=JSON.parse(localStorage.getItem(JOURNAL_FILTERS_KEY)||'null');
   return {type:['all','expense','income'].includes(parsed?.type)?parsed.type:'all',
    category:typeof parsed?.category==='string'&&parsed.category.length<100?parsed.category:'all'};
  }catch{return {type:'all',category:'all'};}
 }
 const savedFilters=readJournalFilters();
 let tab='overview',section='daily',journalType=savedFilters.type,journalSearch='',journalCategory=savedFilters.category,busy=false;
 function saveJournalFilters(){
  try{localStorage.setItem(JOURNAL_FILTERS_KEY,JSON.stringify({type:journalType,category:journalCategory}));}
  catch{ /* Local display settings may be unavailable in private mode. */ }
 }

 const DEFAULT_CATEGORY_NAMES=['Courses','Transport','Maison','Loisirs','Santé','Abonnements','Shopping','Équipement','Autres','Salaire','Vente'];
 const DEFAULT_CATEGORY_COLORS=['#68957c','#6485af','#bc9472','#ae86b5','#70a4a0','#8396be','#c78991','#9da06c','#87948b','#68a37b','#c7a161'];
 function asColor(value){return typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value)?value:'#83958a';}
 const normalizeName=value=>String(value||'').trim().toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 function categorySeeds(){
  return DEFAULT_CATEGORY_NAMES.map((name,i)=>({id:'default-'+i,name,color:DEFAULT_CATEGORY_COLORS[i],archived:false,builtIn:true}));
 }
 function categoriesCatalog(){
  const map=new Map(categorySeeds().map(x=>[x.id,x]));
  const deleted=(data.trash||[]).filter(e=>e.key==='budgetCategories'&&e.record?.id);
  const deletedIDs=new Set(deleted.map(e=>e.record.id));
  const deletedNames=new Set(deleted.map(e=>normalizeName(e.record.name)));
  for(const category of data.budgetCategories||[]){
   if(!category||!category.id||typeof category.name!=='string')continue;
   const name=category.name.trim();
   if(!name)continue;
   map.set(String(category.id),{id:String(category.id),name,color:asColor(category.color),archived:!!category.archived,builtIn:String(category.id).startsWith('default-')});
  }
  for(const id of deletedIDs)map.delete(id);
  const names=new Set([...map.values()].map(x=>normalizeName(x.name)));
  const historical=[...data.transactions,...data.recurrences,...data.quickExpenses].map(x=>x.category).filter(Boolean);
  for(const raw of historical){
   const name=String(raw).trim();
   if(!name||names.has(normalizeName(name))||deletedNames.has(normalizeName(name)))continue;
   names.add(normalizeName(name));
   // Historical unknown category: retain a stable, editable legacy entry until explicitly archived.
   map.set('legacy-'+Array.from(name).map(c=>c.codePointAt(0).toString(16)).join('-'),{id:'legacy-'+Array.from(name).map(c=>c.codePointAt(0).toString(16)).join('-'),name,color:'#83958a',archived:false,builtIn:false});
  }
  return [...map.values()];
 }
 function categoryByName(name){return categoriesCatalog().find(x=>normalizeName(x.name)===normalizeName(name));}
 function categoryOptionList(selected='Autres',editing=false){
  const active=categoriesCatalog().filter(c=>!c.archived||(editing&&normalizeName(c.name)===normalizeName(selected)));
  if(editing&&selected&&!active.some(c=>normalizeName(c.name)===normalizeName(selected)))
    active.push({id:'historical',name:selected,archived:true,color:'#83958a'});
  const chosen=active.some(c=>normalizeName(c.name)===normalizeName(selected))?
    selected:(active.find(c=>normalizeName(c.name)===normalizeName('Autres'))||active[0])?.name||'';
  return active.map(c=>`<option value="${safe(c.name)}" ${normalizeName(c.name)===normalizeName(chosen)?'selected':''}>${safe(c.name)}${c.archived?' (ancienne)':''}</option>`).join('');
 }
 function categoryHue(name){return asColor(categoryByName(name)?.color||'#83958a');}
 function categoryManager(){
  const catalog=categoriesCatalog();
  const usage=name=>[...data.transactions,...data.recurrences,...data.quickExpenses].filter(x=>normalizeName(x.category)===normalizeName(name)).length;
  modal('Catégories du budget',`<div class="b9-manage-categories">
   <p class="muted-note">Crée tes catégories, choisis leur couleur, renomme-les ou archive celles que tu n’utilises plus. Les opérations passées sont conservées.</p>
   <div class="b9-category-list">${catalog.map(cat=>`<div class="b9-category-entry ${cat.archived?'archived':''}">
    <span class="b9-category-dot" style="background:${asColor(cat.color)}"></span>
    <span class="b9-category-label"><strong>${safe(cat.name)}</strong><small>${usage(cat.name)} utilisation(s) ${cat.archived?'· Archivée':''}</small></span>
    <button class="btn btn-neutral btn-small" data-action="b9-category-edit" data-id="${safe(cat.id)}">${svg('edit')} Modifier</button>
    <button class="btn btn-soft btn-small" data-action="b9-category-toggle" data-id="${safe(cat.id)}">${cat.archived?'Réactiver':'Archiver'}</button>
    <button class="btn btn-neutral btn-small" data-action="b9-category-remove" data-id="${safe(cat.id)}" title="Placer dans la corbeille">${svg('trash')}</button>
    </div>`).join('')}</div>
   <div class="form-actions"><button class="btn btn-ghost" data-action="close-modal">Fermer</button>
    <button class="btn" data-action="b9-category-new">${svg('plus')} Nouvelle catégorie</button></div>
   </div>`);
 }
 function categoryForm(id=''){
  const old=id?categoriesCatalog().find(x=>x.id===id):null;
  if(id&&!old)return;
  modal(old?'Modifier une catégorie':'Nouvelle catégorie',`<form id="b9-category-form" class="b8-form">
   ${textField('Nom de la catégorie','name',old?.name||'','maxlength="48" required placeholder="Ex. Restaurants"')}
   <label class="b8-field">Couleur<input type="color" name="color" value="${asColor(old?.color||'#68957c')}" class="b9-category-picker"></label>
   <p class="b8-form-note">Si tu renommes une catégorie, toutes ses opérations et ses règles liées changent de libellé. Les montants et les dates restent inchangés.</p>
   <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="b9-categories">Retour</button>
    <button type="submit" class="btn">${svg('check')} Enregistrer</button></div></form>`);
  const form=document.getElementById('b9-category-form');
  form.addEventListener('submit',async evt=>{
   evt.preventDefault();if(!form.reportValidity())return;
   const formValues=Object.fromEntries(new FormData(form).entries());
   const name=String(formValues.name||'').replace(/\s+/g,' ').trim();
   if(name.length<2||name.length>48){toast('Le nom doit comporter 2 à 48 caractères.');return;}
   if(categoriesCatalog().some(x=>x.id!==old?.id&&normalizeName(x.name)===normalizeName(name))){
    toast('Cette catégorie existe déjà.');return;
   }
   const id=old?.id||uid();
   const color=asColor(formValues.color);
   // Rename all historical references together: category labels are stored as text.
   if(old&&normalizeName(old.name)!==normalizeName(name)){
    for(const group of [data.transactions,data.recurrences,data.quickExpenses]){
     for(const item of group)if(normalizeName(item.category)===normalizeName(old.name))
       {item.category=name;item.updatedAt=new Date().toISOString();}
    }
    if(normalizeName(journalCategory)===normalizeName(old.name)){journalCategory=name;saveJournalFilters();}
   }
   const updated={id,name,color,archived:!!old?.archived,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
   const index=data.budgetCategories.findIndex(x=>x.id===id);
   if(index>=0)data.budgetCategories[index]=updated;
   else data.budgetCategories.push(updated);
   await persist();refresh();categoryManager();toast('Catégorie enregistrée.');
  });
 }
 async function toggleCategory(id){
  const cat=categoriesCatalog().find(x=>x.id===id);if(!cat)return;
  // Archiving does not alter any transaction or recurrence in history.
  const index=data.budgetCategories.findIndex(x=>x.id===id);
  const updated={...cat,archived:!cat.archived,updatedAt:new Date().toISOString()};
  if(index>=0)data.budgetCategories[index]=updated;else data.budgetCategories.push(updated);
  if(updated.archived&&normalizeName(journalCategory)===normalizeName(updated.name)){journalCategory='all';saveJournalFilters();}
  await persist();refresh();categoryManager();toast(updated.archived?'Catégorie archivée.':'Catégorie réactivée.');
 }

 const currencies=x=>money(x);
 const safe=x=>escapeHtml(x);
 const budgetEntries=()=>data.transactions.filter(x=>x.date?.startsWith(budgetMonth)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||''));
 const categoryOptions=(selected='Autres',editing=false)=>categoryOptionList(selected,editing);
 const projectSelect=(selected='')=>`<label class="b8-field">Projet (facultatif)<select name="projectId">${projectOptions(selected)}</select></label>`;
 const textField=(label,name,value='',extra='')=>`<label class="b8-field">${label}<input name="${name}" value="${safe(value)}" ${extra}></label>`;
 const selectType=(selected='expense')=>`<label class="b8-field">Nature<select name="type"><option value="expense" ${selected==='expense'?'selected':''}>Dépense</option><option value="income" ${selected==='income'?'selected':''}>Recette</option></select></label>`;
 const safeNumber=x=>Number.isSafeInteger(x)&&x>0&&x<=100000000000;
 function monthKey(date){return dateKey(date).slice(0,7);}
 function monthParts(month){const match=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);if(!match)return null;return {year:Number(match[1]),month:Number(match[2])};}
 function daysIn(year,month){return new Date(year,month,0).getDate();}
 function dateWithin(rule,date){return (!rule.startDate||date>=rule.startDate)&&(!rule.endDate||date<=rule.endDate);}
 function occurrences(rule,month){
   const p=monthParts(month);if(!p||!rule.active)return [];
   const y=p.year,m=p.month;
   const values=[];
   const make=(day,identity)=>{
     const date=dateKey(new Date(y,m-1,day,12));
     if(dateWithin(rule,date))values.push({rule,date,identity,skipped:Array.isArray(rule.skips)&&rule.skips.includes(identity)});
   };
   if(rule.frequency==='monthly'){
     const day=Math.min(daysIn(y,m),Math.max(1,Number(rule.day)||1));
     make(day,month);
   }else if(rule.frequency==='weekly'){
     const weekday=Number(rule.weekday);
     if(Number.isInteger(weekday)&&weekday>=0&&weekday<=6){
       const last=daysIn(y,m);
       for(let day=1;day<=last;day++){
         if(new Date(y,m-1,day,12).getDay()===weekday)make(day,dateKey(new Date(y,m-1,day,12)));
       }
     }
   }else if(rule.frequency==='yearly'&&Number(rule.month)===m){
     make(Math.min(daysIn(y,m),Math.max(1,Number(rule.day)||1)),String(y));
   }
   return values;
 }
 function recurrenceOccurrences(month){return data.recurrences.flatMap(r=>occurrences(r,month)).sort((a,b)=>a.date.localeCompare(b.date));}
 function linkedTx(occ){return data.transactions.find(tx=>tx.recurrenceId===occ.rule.id&&tx.occurrenceKey===occ.identity);}
 function forecast(month){
   const occurrencesList=recurrenceOccurrences(month);
   const pending=occurrencesList.filter(o=>!o.skipped&&!linkedTx(o));
   return {occurrences:occurrencesList,pending,
     income:pending.filter(x=>x.rule.type==='income').reduce((s,x)=>s+x.rule.amountCents,0),
     expense:pending.filter(x=>x.rule.type==='expense').reduce((s,x)=>s+x.rule.amountCents,0)};
 }
 function rulePeriodDescription(rule){
   if(rule.frequency==='weekly')return ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][Number(rule.weekday)]||'jour à définir';
   if(rule.frequency==='yearly')return 'le '+rule.day+'/'+String(rule.month).padStart(2,'0')+' chaque année';
   return 'le '+rule.day+' de chaque mois';
 }
 function pill(label,cls='') {return `<span class="b8-pill ${cls}">${safe(label)}</span>`;}
 function panelTitle(title,subtitle='',actions=''){
   return `<div class="b8-panel-head"><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div>${actions}</div>`;
 }
 function quickPanel(){
   const templates=[...data.quickExpenses].sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||(a.title||'').localeCompare(b.title||'','fr'));
   return `<section class="b8-quick-panel">
    ${panelTitle('Dépenses rapides','Tes opérations habituelles, en un geste.',
      `<button class="btn btn-neutral btn-small" data-action="b8-quick-new">${svg('plus')} Nouveau raccourci</button>`)}
    ${templates.length?`<div class="b8-quick-list">${templates.map(t=>`<div class="b8-quick-item">
      <button class="b8-quick-trigger" data-action="b8-quick-use" data-id="${safe(t.id)}" title="${t.mode==='fixed'?'Enregistrer tout de suite':'Saisir le montant'}">
      <span class="b8-quick-symbol">${svg('bolt')}</span><strong>${safe(t.title)}</strong>
      <span>${t.mode==='fixed'?currencies(t.amountCents):'Montant libre'}</span></button>
      <div class="b9-quick-controls"><button class="b9-quick-pin ${t.pinned?'active':''}" data-action="b9-quick-pin" data-id="${safe(t.id)}" title="${t.pinned?'Désépingler':'Épingler'}">${svg('star')}</button><button class="b8-quick-edit" data-action="b8-quick-edit" data-id="${safe(t.id)}" aria-label="Modifier ${safe(t.title)}">${svg('edit')}</button></div>
      </div>`).join('')}</div>`:
      `<div class="b8-zero">${svg('bolt')} <div><strong>Ton premier raccourci ?</strong><p>Exemple : dépense de 12 € en un tap, ou livraison à montant variable.</p></div></div>`}
   </section>`;
 }
 function nextMonthsForecast(){
  const p=monthParts(budgetMonth);
  if(!p)return '';
  const months=Array.from({length:3},(_,i)=>{
   const date=new Date(p.year,p.month+i,1,12);
   const key=monthKey(date),f=forecast(key),totals=monthTotals(key);
   return {key,pending:f.pending.length,income:f.income+totals.income,expense:f.expense+totals.expense};
  });
  return `<section class="b8-panel b9-forecast-section">
   ${panelTitle('Trois mois à venir','Projection des règles actives, hors dépenses imprévues.')}
   <div class="b9-future-months">${months.map(m=>{
     const net=m.income-m.expense;
     return `<div class="b9-future-month"><strong>${formatDate(m.key+'-01',{month:'long',year:'numeric'})}</strong>
      <span class="b9-future-net ${net<0?'negative':'positive'}">${net<0?'−':'+'}${currencies(Math.abs(net))}</span>
      <small>+${currencies(m.income)} recettes · −${currencies(m.expense)} dépenses</small>
      <small>${m.pending} échéance(s) non confirmée(s)</small></div>`;
   }).join('')}</div>
   <p class="b8-disclaimer">Les mois futurs sont des projections de flux, pas des soldes bancaires. Seules les règles créées par toi sont incluses.</p>
   </section>`;
 }
 function overview(){
   const total=monthTotals(budgetMonth),remaining=forecast(budgetMonth),actualNet=total.income-total.expense;
   const forecastNet=actualNet+remaining.income-remaining.expense;
   const upcoming=remaining.pending.filter(o=>o.date>=dateKey(new Date())).slice(0,5);
   const past=remaining.pending.filter(o=>o.date<dateKey(new Date())).slice(-3).reverse();
   const limit=data.limits.find(x=>x.month===budgetMonth)?.limitCents||0;
   const expenses=budgetEntries().filter(t=>t.type==='expense').slice(0,5);
   return `<div class="b8-metrics">
    <div><span>Recettes enregistrées</span><strong class="positive">${currencies(total.income)}</strong><small>Confirmées dans le journal</small></div>
    <div><span>Dépenses enregistrées</span><strong>${currencies(total.expense)}</strong><small>Confirmées dans le journal</small></div>
    <div><span>Flux net du mois</span><strong class="${actualNet<0?'negative':'positive'}">${actualNet<0?'−':''}${currencies(Math.abs(actualNet))}</strong><small>Recettes − dépenses</small></div>
   </div>
   ${quickPanel()}
   <section class="b8-panel">
    ${panelTitle('Prévisions du mois','À confirmer, jamais ajoutées automatiquement au journal.',
      `<button class="btn btn-soft btn-small" data-action="b8-switch-tab" data-tab="recurring">Gérer ${svg('arrow')}</button>`)}
    <div class="b8-forecast">
      <div><span>Revenus encore prévus</span><strong class="positive">+${currencies(remaining.income)}</strong></div>
      <div><span>Dépenses encore prévues</span><strong class="negative">−${currencies(remaining.expense)}</strong></div>
      <div class="b8-forecast-net"><span>Flux net projeté *</span><strong class="${forecastNet<0?'negative':'positive'}">${forecastNet<0?'−':''}${currencies(Math.abs(forecastNet))}</strong></div>
    </div>
    <div class="b8-reminder-list">${[...past,...upcoming].length?[...past,...upcoming].map(o=>occurrenceRow(o)).join(''):
      `<p class="muted-note">Aucun mouvement récurrent en attente pour ce mois.</p>`}</div>
    <p class="b8-disclaimer">* Projection des mouvements enregistrés et des récurrences restant à confirmer. Ce n'est pas un solde bancaire.</p>
   </section>
   ${nextMonthsForecast()}
   <div class="b8-two-col">
    <section class="b8-panel">${panelTitle('Dernières dépenses','Les opérations réelles de ce mois.',
     `<button class="b8-text-btn" data-action="b8-switch-tab" data-tab="journal">Journal ${svg('arrow')}</button>`)}
     <div class="list-stack">${expenses.length?expenses.map(transactionRow).join(''):empty('Aucune dépense','Ajoute une opération ou utilise un raccourci.','wallet')}</div>
    </section>
    <section class="b8-panel">${panelTitle('Plafond & catégories','Pour voir où part ton budget.',
      `<button class="b8-text-btn" data-action="b8-switch-tab" data-tab="stats">Statistiques ${svg('arrow')}</button>`)}
      <div class="b8-limit-line"><span>${limit>0?'Plafond mensuel':'Pas de plafond défini'}</span>
      <strong>${limit>0?currencies(limit):'—'}</strong></div>
      ${limit>0?`<span class="progress-track"><i style="width:${Math.min(100,Math.round(total.expense/limit*100))}%"></i></span>`:''}
      <button class="btn btn-neutral btn-small" data-action="budget-limit">${svg('edit')} Modifier le plafond</button>
      ${categoriesMarkup(budgetEntries())}
    </section>
   </div>`;
 }
 function occurrenceRow(o){
   const tx=linkedTx(o),isPast=o.date<dateKey(new Date()),flag=tx?'Enregistré':o.skipped?'Ignoré':isPast?'À vérifier':'Prévu';
   return `<div class="b8-occurrence ${o.skipped?'is-skipped':''}">
    <span class="b8-occ-date"><strong>${o.date.slice(8,10)}</strong><small>${formatDate(o.date,{month:'short'})}</small></span>
    <span class="b8-occ-info"><strong>${safe(o.rule.title)}</strong><small>${pill(flag,tx?'done':o.skipped?'muted':isPast?'warning':'')}</small></span>
    <strong class="b8-occ-amount ${o.rule.type==='income'?'positive':'negative'}">${o.rule.type==='income'?'+':'−'}${currencies(o.rule.amountCents)}</strong>
    <div class="b8-occ-actions">${tx?
      `<button class="b8-mini-btn" data-action="transaction-detail" data-id="${safe(tx.id)}" aria-label="Voir l'opération">${svg('chevright')}</button>`:
      o.skipped?`<button class="b8-mini-btn" data-action="b8-unskip" data-id="${safe(o.rule.id)}" data-key="${safe(o.identity)}">Réactiver</button>`:
      `<button class="b8-mini-btn" data-action="b8-skip" data-id="${safe(o.rule.id)}" data-key="${safe(o.identity)}">Ignorer</button>
       <button class="b8-mini-btn b8-mini-primary" data-action="b8-book" data-id="${safe(o.rule.id)}" data-key="${safe(o.identity)}">Confirmer</button>`}
    </div></div>`;
 }
 function recurring(){
   const list=recurrenceOccurrences(budgetMonth),rules=[...data.recurrences].filter(r=>!r.commitmentKind).sort((a,b)=>(b.active===true)-(a.active===true)?(a.active?-1:1):(a.title||'').localeCompare(b.title||'','fr'));
   const active=rules.filter(x=>x.active).length;
   return `<section class="b8-panel">${panelTitle('Échéancier · '+formatDate(budgetMonth+'-01',{month:'long',year:'numeric'}),
       'Les dates prévues et leur validation indépendante du journal.',
       `<button class="btn btn-small" data-action="b8-rule-new">${svg('plus')} Récurrence</button>`)}
     <div class="b8-reminder-list">${list.length?list.map(occurrenceRow).join(''):
      `<div class="b8-zero">${svg('calendar')} <p>Aucune échéance active prévue ce mois.</p></div>`}</div>
   </section>
   <section class="b8-panel">${panelTitle('Autres récurrences',active+' active(s) · '+rules.length+' enregistrée(s)')}
    <div class="b8-rules">${rules.length?rules.map(r=>`<div class="b8-rule-row">
      <span class="b8-rule-icon ${r.type}">${svg(r.type==='income'?'arrow':'wallet')}</span>
      <span class="b8-rule-copy"><strong>${safe(r.title)}</strong><small>${safe(rulePeriodDescription(r))}
      · ${safe(r.category||'Autres')}${!r.active?' · En pause':''}</small></span>
      <span class="b8-rule-price ${r.type==='income'?'positive':'negative'}">${r.type==='income'?'+':'−'}${currencies(r.amountCents)}</span>
      <div class="b8-rule-actions">
       <button data-action="b8-rule-toggle" data-id="${safe(r.id)}">${r.active?'Pause':'Activer'}</button>
       <button data-action="b8-rule-edit" data-id="${safe(r.id)}" aria-label="Modifier ${safe(r.title)}">${svg('edit')}</button>
      </div></div>`).join(''):
      `<div class="b8-zero">${svg('calendar')} <div><strong>Commence avec une échéance</strong><p>Salaire, prêt, loyer, abonnement…</p></div></div>`}</div>
    <p class="b8-disclaimer">Suspendre ou supprimer une règle ne supprime jamais les opérations déjà enregistrées. Un mois peut être ignoré individuellement.</p>
   </section>`;
 }
 function categoryTotals(entries){const m=new Map();for(const t of entries.filter(x=>x.type==='expense'))m.set(t.category||'Autres',(m.get(t.category||'Autres')||0)+(t.amountCents||0));return [...m.entries()].sort((a,b)=>b[1]-a[1]);}
 function categoriesMarkup(entries,limit=6){
   const cats=categoryTotals(entries),total=cats.reduce((s,x)=>s+x[1],0);
   return `<div class="b8-category-list">${cats.length?cats.slice(0,limit).map(([name,n])=>
     `<div><div class="b8-category-label"><span><i class="b9-inline-dot" style="background:${categoryHue(name)}"></i>${safe(name)}</span><strong>${currencies(n)}</strong></div>
       <span class="b8-bar"><i style="width:${total?Math.round(n*100/total):0}%;background:${categoryHue(name)}"></i></span></div>`).join(''):
     '<p class="muted-note">Aucune dépense enregistrée.</p>'}</div>`;
 }

 function journalRow(tx){
  return `<div class="b10-journal-entry">
   ${transactionRow(tx)}
   <div class="b10-journal-entry-actions">
    <button data-action="b10-fast-edit" data-id="${safe(tx.id)}" aria-label="Modifier rapidement ${safe(tx.title)}">${svg('edit')} Modifier</button>
    <button data-action="b10-delete" data-id="${safe(tx.id)}" aria-label="Mettre ${safe(tx.title)} dans la corbeille">${svg('trash')} Supprimer</button>
   </div></div>`;
 }
 function fastEdit(id){
  const tx=data.transactions.find(item=>item.id===id);
  if(!tx)return;
  const markup=`<form id="b10-fast-form" class="b8-form">
   <p class="b8-form-note">Modifie le minimum nécessaire. Projet, achat d'origine et lien de récurrence seront préservés.</p>
   ${textField('Libellé','title',tx.title||'','required maxlength="140"')}
   <div class="b8-form-grid">${selectType(tx.type)}${textField('Montant (€)','amountEuros',euroInput(tx.amountCents),'required inputmode="decimal"')}</div>
   <div class="b8-form-grid">${textField('Date','date',tx.date||dateKey(new Date()),'type="date" required')}
    <label class="b8-field">Catégorie<select name="category">${categoryOptions(tx.category||'Autres',true)}</select></label></div>
   <p class="b8-form-note">${tx.recurrenceId?'Cette écriture restera reliée à sa récurrence. ':''}${tx.purchaseId?'Cette écriture restera reliée à son achat. ':''}L'historique reste disponible après la modification.</p>
   <div class="form-actions">
    <button type="button" class="btn btn-neutral" data-action="close-modal">Annuler</button>
    <button type="button" class="btn btn-soft" data-action="b10-full-edit" data-id="${safe(tx.id)}">${svg('edit')} Fiche complète</button>
    <button type="submit" class="btn">${svg('check')} Enregistrer</button>
   </div></form>`;
  modal('Édition express · '+tx.title,markup);
  const form=document.getElementById('b10-fast-form');
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const values=Object.fromEntries(new FormData(form).entries());
   const title=String(values.title||'').trim();
   const amount=toCents(values.amountEuros);
   const day=String(values.date||'');
   if(!title||title.length>140){toast('Renseigne un libellé de 140 caractères maximum.');return;}
   if(!safeNumber(amount)){toast('Le montant doit être supérieur à zéro.');return;}
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||dateKey(new Date(day+'T12:00:00'))!==day){
    toast('La date indiquée est invalide.');return;
   }
   if(!['expense','income'].includes(values.type)){toast('Le type d’opération est invalide.');return;}
   if(tx.purchaseId&&values.type==='income'){toast('Une dépense liée à un achat ne peut pas devenir une recette.');return;}
   const category=String(values.category||'').trim();
   const allowed=categoriesCatalog().some(item=>normalizeName(item.name)===normalizeName(category));
   const historical=normalizeName(tx.category||'')===normalizeName(category);
   if(!allowed&&!historical){toast('Cette catégorie n’est plus disponible.');return;}
   // Never mutate links or overwrite records by identity: this form changes only five fields.
   Object.assign(tx,{title,type:values.type,amountCents:amount,date:day,category,updatedAt:new Date().toISOString()});
   await persist();closeModal();refresh();toast('Opération mise à jour.');
  });
 }

 function journalItems(){
   const q=journalSearch.trim().toLocaleLowerCase('fr-FR');
   return budgetEntries().filter(t=>(journalType==='all'||t.type===journalType)&&
     (journalCategory==='all'||t.category===journalCategory)&&
     (!q||(t.title+' '+(t.category||'')+' '+(t.date||'')).toLocaleLowerCase('fr-FR').includes(q)));
 }
 function journalList(){
   const list=journalItems();
   const groups=new Map();
   for(const tx of list){const key=tx.date||'Sans date';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(tx);}
   return `<div class="b8-journal-result-count">${list.length} opération(s) affichée(s)</div>
     ${[...groups.entries()].map(([day,rows])=>`<div class="b8-day-group"><h3>${day==='Sans date'?'Sans date':formatDate(day,{weekday:'long',day:'numeric',month:'long'})}</h3>
      <div class="list-stack">${rows.map(journalRow).join('')}</div></div>`).join('')||
     empty('Journal vide','Tes opérations confirmées apparaîtront ici.','wallet')}`;
 }
 function journal(){
  const cats=[...new Set([...budgetEntries().map(t=>t.category||'Autres'),...(journalCategory!=='all'?[journalCategory]:[])])].sort((a,b)=>a.localeCompare(b,'fr'));
  return `${quickPanel()}<section class="b8-panel">${panelTitle('Journal des opérations',
    'Tes recettes et dépenses réelles. Modifier ou supprimer sans ouvrir chaque fiche.',
    `<button class="btn btn-small" data-action="new-transaction">${svg('plus')} Opération</button>`)}
   <div class="b8-journal-controls"><input type="search" id="b8-journal-search" value="${safe(journalSearch)}" placeholder="Chercher une opération..." aria-label="Rechercher une opération">
   <select id="b8-journal-type" aria-label="Type d'opération">
    ${[['all','Toutes'],['expense','Dépenses'],['income','Recettes']].map(([x,label])=>
     `<option value="${x}" ${journalType===x?'selected':''}>${label}</option>`).join('')}</select>
   <select id="b8-journal-category" aria-label="Catégorie">
    <option value="all">Toutes catégories</option>
    ${cats.map(c=>`<option value="${safe(c)}" ${c===journalCategory?'selected':''}>${safe(c)}</option>`).join('')}
   </select></div>
   <div class="b10-journal-filter-note"><span>Les filtres type et catégorie sont mémorisés sur cet appareil.</span>
    <button data-action="b10-clear-filters" class="b10-filter-reset">${svg('x')} Effacer les filtres</button></div>
   <div id="b8-journal-results">${journalList()}</div>
  </section>`;
 }
 function trendMonths(month){
   const p=monthParts(month);if(!p)return [];
   return Array.from({length:6},(_,i)=>{const d=new Date(p.year,p.month-1-5+i,1,12);return monthKey(d);});
 }
 function stats(){
   const months=trendMonths(budgetMonth),actual=months.map(key=>({month:key,...monthTotals(key)}));
   const highest=Math.max(1,...actual.flatMap(x=>[x.income,x.expense]));
   const expenseTotal=actual.reduce((s,x)=>s+x.expense,0),incomeTotal=actual.reduce((s,x)=>s+x.income,0);
   const current=budgetEntries();
   const categories=categoryTotals(current);
   return `<section class="b8-panel">
    ${panelTitle('Évolution sur 6 mois','Opérations réellement enregistrées, sans les prévisions.')}
    <div class="b8-chart-legend"><span><i class="b8-legend-income"></i> Recettes</span><span><i class="b8-legend-expense"></i> Dépenses</span></div>
    <div class="b8-trend" role="img" aria-label="Graphique des recettes et dépenses enregistrées des six derniers mois">
     ${actual.map(x=>`<div class="b8-trend-month" title="${safe(formatDate(x.month+'-01',{month:'long',year:'numeric'}))} : recettes ${currencies(x.income)}, dépenses ${currencies(x.expense)}">
       <div class="b8-trend-bars"><span class="b8-income-bar" style="height:${Math.max(x.income?3:0,x.income/highest*100)}%"></span>
       <span class="b8-expense-bar" style="height:${Math.max(x.expense?3:0,x.expense/highest*100)}%"></span></div>
       <small>${formatDate(x.month+'-01',{month:'short'})}</small></div>`).join('')}
    </div>
    <div class="b8-stats-summary"><div><span>Revenus moyens / mois</span><strong class="positive">${currencies(Math.round(incomeTotal/6))}</strong></div>
     <div><span>Dépenses moyennes / mois</span><strong>${currencies(Math.round(expenseTotal/6))}</strong></div>
     <div><span>Flux net sur 6 mois</span><strong class="${incomeTotal-expenseTotal<0?'negative':'positive'}">${currencies(Math.abs(incomeTotal-expenseTotal))} ${incomeTotal-expenseTotal<0?'de déficit':'de surplus'}</strong></div></div>
   </section>
   <section class="b8-panel">${panelTitle('Répartition des dépenses · '+formatDate(budgetMonth+'-01',{month:'long',year:'numeric'}),
      categories.length?categories.length+' catégories':'Aucune dépense enregistrée')}
    ${categoriesMarkup(current,999)}
   </section>
   <section class="b8-panel">${panelTitle('Lecture rapide','Quelques repères pour piloter ce mois.')}
    <div class="b8-insights"><div><strong>${current.filter(x=>x.type==='expense').length}</strong><span>dépenses enregistrées</span></div>
     <div><strong>${currencies(current.filter(x=>x.type==='expense').reduce((s,x)=>s+x.amountCents,0)/Math.max(1,current.filter(x=>x.type==='expense').length))}</strong><span>dépense moyenne</span></div>
     <div><strong>${categories[0]?safe(categories[0][0]):'—'}</strong><span>première catégorie de dépenses</span></div>
    </div><p class="b8-disclaimer">Les moyennes portent sur les six mois affichés, y compris les mois partiels ou sans saisie. Les chiffres ne représentent pas le solde du compte bancaire.</p>
   </section>`;
 }
 function view(){
   const monthDate=budgetMonth+'-01';
   return `<div class="b8-budget-page"><div class="page-header"><div><div class="eyebrow">CENTRE DE PILOTAGE</div>
    <h1 class="page-title">Budget<span class="punctuation">.</span></h1>
    <p class="subtitle">Prévoir, enregistrer, analyser. Tout au même endroit.</p></div>
    <button class="btn" data-action="new-transaction">${svg('plus')} Opération</button></div>
    <div class="b8-month-header"><span>${svg('calendar')} ${formatDate(monthDate,{month:'long',year:'numeric'})}</span>
    <div><button data-action="budget-prev" aria-label="Mois précédent">${svg('chevleft')}</button>
    <button data-action="budget-next" aria-label="Mois suivant">${svg('chevright')}</button></div></div>
    <div class="b9-budget-tools"><button class="btn btn-neutral btn-small" data-action="b9-categories">${svg('edit')} Gérer mes catégories</button></div>
    <div class="b20-tabs" role="tablist" aria-label="Espaces du budget">${sections.map(([key,label])=>
      `<button type="button" role="tab" aria-selected="${section===key}" class="${section===key?'active':''}" data-action="b8-switch-section" data-section="${key}">${label}</button>`).join('')}</div>
    ${section==='daily'?`<div class="b8-tabs b20-daily-tabs" role="tablist" aria-label="Vues du quotidien">${tabs.map(([key,label])=>
      `<button type="button" role="tab" aria-selected="${tab===key}" class="${tab===key?'active':''}" data-action="b8-switch-tab" data-tab="${key}">${label}</button>`).join('')}</div>`:
       `<p class="b20-section-caption">${section==='commitments'?'Abonnements, prêts et échéances à confirmer.':'Épargne suivie manuellement pour tes projets.'}</p>`}
    ${section==='commitments'?(window.NexusBudget20?.commitmentsView?.(recurring())||recurring()):
      section==='goals'?(window.NexusBudget20?.goalsView?.()||'<p class="muted-note">Chargement des objectifs…</p>'):
      tab==='journal'?journal():tab==='stats'?stats():overview()}
    <div class="info-strip">${svg('shield')} Suivi local indicatif : sans connexion bancaire. Les prévisions ne sont jamais considérées comme payées sans ta confirmation.</div>
   </div>`;
 }
 function refresh(){render();}
 function ruleForm(rule={}){
  const existing=!!rule.id;
  const defaultDate=budgetMonth+'-01';
  const freq=rule.frequency||'monthly';
  const content=`<form id="b8-rule-form" class="b8-form">
   ${textField('Libellé','title',rule.title||'','required maxlength="130" placeholder="Ex. Salaire, mensualité de prêt..."')}
   <div class="b8-form-grid">${selectType(rule.type)}${textField('Montant prévu (€)','amountEuros',euroInput(rule.amountCents),'required inputmode="decimal" placeholder="Ex. 750,00"')}</div>
   <div class="b8-form-grid">
     <label class="b8-field">Répétition<select name="frequency" id="b8-freq">
       ${Object.entries(frequencies).map(([key,label])=>`<option value="${key}" ${freq===key?'selected':''}>${label}</option>`).join('')}</select></label>
     <label class="b8-field" id="b8-monthday">Jour du mois (1 à 31)<input type="number" min="1" max="31" step="1" name="day" value="${safe(rule.day||1)}" required></label>
     <label class="b8-field" id="b8-weekday">Jour de semaine<select name="weekday">
       ${['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'].map((label,i)=>`<option value="${i}" ${Number(rule.weekday??1)===i?'selected':''}>${label}</option>`).join('')}</select></label>
     <label class="b8-field" id="b8-yearmonth">Mois de l’année<select name="month">
       ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${Number(rule.month||1)===i+1?'selected':''}>${formatDate('2026-'+String(i+1).padStart(2,'0')+'-01',{month:'long'})}</option>`).join('')}</select></label>
   </div>
   <div class="b8-form-grid">${textField('Début','startDate',rule.startDate||defaultDate,'type="date" required')}
   ${textField('Fin (facultative)','endDate',rule.endDate||'','type="date"')}</div>
   <label class="b8-field">Catégorie<select name="category">${categoryOptions(rule.category||(rule.type==='income'?'Salaire':'Autres'),!!rule.id)}</select></label>
   ${projectSelect(rule.projectId||'')}
   <label class="b8-checkbox"><input type="checkbox" name="active" ${rule.active!==false?'checked':''}> Récurrence active</label>
   <p class="b8-form-note">Le jour 29, 30 ou 31 est ramené au dernier jour des mois plus courts. Les écritures déjà validées ne seront jamais modifiées.</p>
   <div class="form-actions">${existing?`<button type="button" class="btn btn-danger btn-small" data-action="b8-rule-delete" data-id="${safe(rule.id)}">Supprimer</button>`:''}
   <button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button>
   <button type="submit" class="btn">${svg('check')} Enregistrer</button></div></form>`;
  modal(existing?'Modifier la récurrence':'Nouvelle récurrence',content);
  const form=document.getElementById('b8-rule-form');
  const toggle=()=>{
    const selected=form.elements.frequency.value;
    for(const [id,show] of [['b8-monthday',selected!=='weekly'],['b8-weekday',selected==='weekly'],['b8-yearmonth',selected==='yearly']]){
     const group=document.getElementById(id);group.hidden=!show;
     for(const input of group.querySelectorAll('input,select'))input.disabled=!show;
    }
  };
  form.elements.frequency.addEventListener('change',toggle);toggle();
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(!form.reportValidity())return;
   const v=Object.fromEntries(new FormData(form).entries());
   const amount=toCents(v.amountEuros);
   if(!safeNumber(amount)){toast('Montant invalide.');return;}
   if(v.endDate&&v.endDate<v.startDate){toast('La fin doit suivre le début.');return;}
   const next={...rule,id:rule.id||uid(),title:v.title.trim().slice(0,130),type:v.type,
    amountCents:amount,frequency:v.frequency,
    day:v.frequency==='weekly'?Number(rule.day||1):Number(v.day),
    weekday:v.frequency==='weekly'?Number(v.weekday):Number(rule.weekday??1),
    month:v.frequency==='yearly'?Number(v.month):Number(rule.month||1),
    startDate:v.startDate,endDate:v.endDate||'',
    category:v.category,projectId:v.projectId||'',active:!!v.active,
    skips:Array.isArray(rule.skips)?rule.skips:[],
    createdAt:rule.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
   const index=data.recurrences.findIndex(r=>r.id===next.id);
   if(index>=0)data.recurrences[index]=next;else data.recurrences.push(next);
   await persist();closeModal();refresh();toast('Récurrence enregistrée.');
  });
 }
 function quickForm(template={}){
   const existing=!!template.id;
   const content=`<form id="b8-quick-form" class="b8-form">
    ${textField('Nom du raccourci','title',template.title||'','required maxlength="120" placeholder="Ex. Café, livraison..."')}
    <label class="b8-field">Montant<select name="mode" id="b8-quick-mode">
     <option value="fixed" ${template.mode!=='variable'?'selected':''}>Fixe — un tap pour enregistrer</option>
     <option value="variable" ${template.mode==='variable'?'selected':''}>Variable — saisir le montant à chaque fois</option>
    </select></label>
    <div id="b8-fixed-field">${textField('Montant fixe (€)','amountEuros',euroInput(template.amountCents),'inputmode="decimal" placeholder="Ex. 12,00"')}</div>
    <label class="b8-field">Catégorie<select name="category">${categoryOptions(template.category,!!template.id)}</select></label>
    ${projectSelect(template.projectId||'')}
    <p class="b8-form-note">Un raccourci fixe crée immédiatement une dépense à la date du jour. Un raccourci variable te demande le montant avant de l'enregistrer.</p>
    <div class="form-actions">${existing?`<button type="button" class="btn btn-danger btn-small" data-action="b8-quick-delete" data-id="${safe(template.id)}">Supprimer</button>`:''}
      <button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button>
      <button type="submit" class="btn">${svg('check')} Enregistrer</button></div></form>`;
   modal(existing?'Modifier le raccourci':'Nouveau raccourci',content);
   const form=document.getElementById('b8-quick-form');
   const toggle=()=>{const fixed=form.elements.mode.value==='fixed';document.getElementById('b8-fixed-field').hidden=!fixed;form.elements.amountEuros.disabled=!fixed;form.elements.amountEuros.required=fixed;};
   form.elements.mode.addEventListener('change',toggle);toggle();
   form.addEventListener('submit',async e=>{
     e.preventDefault();if(!form.reportValidity())return;
     const v=Object.fromEntries(new FormData(form).entries());
     const amount=v.mode==='fixed'?toCents(v.amountEuros):null;
     if(v.mode==='fixed'&&!safeNumber(amount)){toast('Montant fixe invalide.');return;}
     const q={...template,id:template.id||uid(),pinned:!!template.pinned,title:v.title.trim().slice(0,120),mode:v.mode,
      amountCents:amount,category:v.category,projectId:v.projectId||'',
      createdAt:template.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
     const index=data.quickExpenses.findIndex(t=>t.id===q.id);
     if(index<0)data.quickExpenses.push(q);else data.quickExpenses[index]=q;
     await persist();closeModal();refresh();toast('Raccourci ajouté au budget.');
   });
 }
 async function createEntry(template,amount,extra={}){
   if(busy)return;
   if(!safeNumber(amount)){toast('Montant invalide.');return;}
   busy=true;
   try{
     const now=new Date().toISOString();
     data.transactions.push({id:uid(),title:template.title,type:template.type||'expense',
       amountCents:amount,category:template.category||'Autres',date:extra.date||dateKey(new Date()),
       projectId:template.projectId||'',quickExpenseId:extra.quickExpenseId||null,
       recurrenceId:extra.recurrenceId||null,occurrenceKey:extra.occurrenceKey||null,
       createdAt:now,updatedAt:now});
     await persist();closeModal();refresh();
     toast('Opération enregistrée : '+currencies(amount));
   }finally{busy=false;}
 }
 async function useQuick(id){
   const q=data.quickExpenses.find(t=>t.id===id);if(!q)return;
   if(q.mode==='fixed')return createEntry({...q,type:'expense'},q.amountCents,{quickExpenseId:q.id});
   const html=`<form id="b8-variable-form" class="b8-form"><p class="subtitle">${safe(q.title)} · ${safe(q.category)}</p>
    ${textField('Montant (€)','amountEuros','','inputmode="decimal" required placeholder="Ex. 23,50"')}
    ${textField('Date','date',dateKey(new Date()),'type="date" required')}
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button>
    <button type="submit" class="btn">${svg('check')} Ajouter la dépense</button></div></form>`;
   modal('Dépense rapide',html);
   const form=document.getElementById('b8-variable-form');
   form.addEventListener('submit',e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const v=Object.fromEntries(new FormData(form).entries()),amount=toCents(v.amountEuros);
    if(!safeNumber(amount)){toast('Montant invalide.');return;}
    createEntry({...q,type:'expense'},amount,{quickExpenseId:q.id,date:v.date});
   });
 }
 function confirmOccurrence(ruleId,identity){
   const rule=data.recurrences.find(r=>r.id===ruleId);if(!rule)return;
   const occ=occurrences(rule,budgetMonth).find(o=>o.identity===identity);
   if(!occ||occ.skipped||linkedTx(occ))return;
   // Explicitly show the scheduled date and amount before writing to the journal.
   const html=`<form id="b8-book-form" class="b8-form">
    <p class="subtitle">${safe(rule.title)} · prévu pour le ${formatDate(occ.date,{day:'numeric',month:'long',year:'numeric'})}</p>
    <div class="b8-form-grid">${textField('Montant réel (€)','amountEuros',euroInput(rule.amountCents),'inputmode="decimal" required')}
     ${textField('Date réelle','date',occ.date,'type="date" required')}</div>
    <p class="b8-form-note">Une validation crée une opération réelle dans le journal. Tu peux ajuster le montant et la date, sans modifier la règle.</p>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button>
    <button type="submit" class="btn">${svg('check')} Confirmer le mouvement</button></div></form>`;
   modal('Confirmer une échéance',html);
   const form=document.getElementById('b8-book-form');
   form.addEventListener('submit',async e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const v=Object.fromEntries(new FormData(form).entries()),amount=toCents(v.amountEuros);
    if(!safeNumber(amount)){toast('Montant invalide.');return;}
    if(data.transactions.some(tx=>tx.recurrenceId===rule.id&&tx.occurrenceKey===identity)){toast('Déjà enregistré.');return;}
    await createEntry(rule,amount,{recurrenceId:rule.id,occurrenceKey:identity,date:v.date});
   });
 }
 async function skipOcc(id,identity,skip){
   const r=data.recurrences.find(x=>x.id===id);if(!r)return;
   if(data.transactions.some(t=>t.recurrenceId===id&&t.occurrenceKey===identity)){toast('Une opération est déjà liée à cette échéance.');return;}
   const all=new Set(r.skips||[]);
   if(skip)all.add(identity);else all.delete(identity);
   r.skips=[...all];r.updatedAt=new Date().toISOString();
   await persist();refresh();toast(skip?'Échéance ignorée pour cette période.':'Échéance réactivée.');
 }
 async function toggleRule(id){
   const rule=data.recurrences.find(x=>x.id===id);if(!rule)return;
   rule.active=!rule.active;rule.updatedAt=new Date().toISOString();
   await persist();refresh();toast(rule.active?'Récurrence activée.':'Récurrence en pause.');
 }
 async function deleteRule(id){
  return window.NexusRecycle?.remove?.('recurrences',id);
 }
 async function deleteQuick(id){
  return window.NexusRecycle?.remove?.('quickExpenses',id);
 }
 async function toggleQuickPin(id){
 const q=data.quickExpenses.find(x=>x.id===id);if(!q)return;
 q.pinned=!q.pinned;q.updatedAt=new Date().toISOString();
 await persist();refresh();toast(q.pinned?'Raccourci épinglé.':'Raccourci désépinglé.');
 }
 function act(action,el){
   if(action==='b10-fast-edit')return fastEdit(el.dataset.id);
   if(action==='b10-full-edit'){
    const tx=data.transactions.find(item=>item.id===el.dataset.id);
    if(tx)return extraCaptureForm('transaction',tx);
   }
   if(action==='b10-delete')return window.NexusRecycle?.remove?.('transactions',el.dataset.id);
   if(action==='b10-clear-filters'){
    journalType='all';journalCategory='all';journalSearch='';
    saveJournalFilters();refresh();toast('Filtres du journal réinitialisés.');return;
   }
   if(action==='b9-categories')return categoryManager();
   if(action==='b9-category-new')return categoryForm();
   if(action==='b9-category-edit')return categoryForm(el.dataset.id);
   if(action==='b9-category-toggle')return toggleCategory(el.dataset.id);
   if(action==='b9-category-remove'){
    const cat=categoriesCatalog().find(c=>c.id===el.dataset.id);
    if(cat)return window.NexusRecycle?.removeCategory?.(cat);
   }
   if(action==='b9-quick-pin')return toggleQuickPin(el.dataset.id);
   if(action==='b8-switch-section'){
    const next=el.dataset.section;
    if(sections.some(([key])=>key===next)){section=next;refresh();}
    return;
   }
   if(action==='b8-switch-tab'){
    if(el.dataset.tab==='recurring'){section='commitments';refresh();return;}
    if(tabs.some(([key])=>key===el.dataset.tab)){tab=el.dataset.tab;section='daily';refresh();}
    return;
   }
   if(action==='b8-rule-new')ruleForm();
   if(action==='b8-rule-edit')ruleForm(data.recurrences.find(x=>x.id===el.dataset.id));
   if(action==='b8-rule-toggle')toggleRule(el.dataset.id);
   if(action==='b8-rule-delete')deleteRule(el.dataset.id);
   if(action==='b8-book')confirmOccurrence(el.dataset.id,el.dataset.key);
   if(action==='b8-skip')skipOcc(el.dataset.id,el.dataset.key,true);
   if(action==='b8-unskip')skipOcc(el.dataset.id,el.dataset.key,false);
   if(action==='b8-quick-new')quickForm();
   if(action==='b8-quick-edit')quickForm(data.quickExpenses.find(x=>x.id===el.dataset.id));
   if(action==='b8-quick-delete')deleteQuick(el.dataset.id);
   if(action==='b8-open-rule'){const x=data.recurrences.find(r=>r.id===el.dataset.id);if(x)ruleForm(x);}
   if(action==='b8-open-quick'){const x=data.quickExpenses.find(q=>q.id===el.dataset.id);if(x)quickForm(x);}
   if(action==='b8-quick-use')useQuick(el.dataset.id);
 }
 function change(el){
   if(el.id==='b8-journal-type'){journalType=el.value;saveJournalFilters();updateJournal();}
   if(el.id==='b8-journal-category'){journalCategory=el.value;saveJournalFilters();updateJournal();}
 }
 function inputSearch(el){if(el.id==='b8-journal-search'){journalSearch=el.value;updateJournal();}}
 function updateJournal(){
   const mount=document.getElementById('b8-journal-results');if(mount)mount.innerHTML=journalList();
 }
 window.NexusBudget={view,act,change,inputSearch,forecast,occurrences,trendMonths,openRule:ruleForm,categoryOptions:categoryOptionList,categoriesCatalog,categoryHue};
})();