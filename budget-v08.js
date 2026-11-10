/* NEXUS V0.8 — Budget cockpit, local-first. No bank automation or hidden bookings. */
'use strict';
(() => {
 const tabs=[['overview','Vue d’ensemble'],['recurring','Récurrences'],['journal','Journal'],['stats','Statistiques']];
 const frequencies={monthly:'Mensuelle',weekly:'Hebdomadaire',yearly:'Annuelle'};
 let tab='overview',journalType='all',journalSearch='',journalCategory='all',busy=false;
 const currencies=x=>money(x);
 const safe=x=>escapeHtml(x);
 const budgetEntries=()=>data.transactions.filter(x=>x.date?.startsWith(budgetMonth)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||''));
 const categoryOptions=(selected='Autres')=>txCategories.map(c=>`<option value="${safe(c)}" ${c===selected?'selected':''}>${safe(c)}</option>`).join('');
 const projectSelect=(selected='')=>`<label class="b8-field">Projet (facultatif)<select name="projectId">${projectOptions(selected)}</select></label>`;
 const textField=(label,name,value='',extra='')=>`<label class="b8-field">${label}<input name="${name}" value="${safe(value)}" ${extra}></label>`;
 const selectType=(selected='expense')=>`<label class="b8-field">Nature<select name="type"><option value="expense" ${selected==='expense'?'selected':''}>Dépense</option><option value="income" ${selected==='income'?'selected':''}>Recette</option></select></label>`;
 const safeNumber=x=>Number.isSafeInteger(x)&&x>0&&x<=100000000000;
 function monthKey(date){return dateKey(date).slice(0,7);}
 function monthParts(month){const match=/^(\\d{4})-(0[1-9]|1[0-2])$/.exec(month);if(!match)return null;return {year:Number(match[1]),month:Number(match[2])};}
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
   const templates=data.quickExpenses;
   return `<section class="b8-quick-panel">
    ${panelTitle('Dépenses rapides','Tes opérations habituelles, en un geste.',
      `<button class="btn btn-neutral btn-small" data-action="b8-quick-new">${svg('plus')} Nouveau raccourci</button>`)}
    ${templates.length?`<div class="b8-quick-list">${templates.map(t=>`<div class="b8-quick-item">
      <button class="b8-quick-trigger" data-action="b8-quick-use" data-id="${safe(t.id)}" title="${t.mode==='fixed'?'Enregistrer tout de suite':'Saisir le montant'}">
      <span class="b8-quick-symbol">${svg('bolt')}</span><strong>${safe(t.title)}</strong>
      <span>${t.mode==='fixed'?currencies(t.amountCents):'Montant libre'}</span></button>
      <button class="b8-quick-edit" data-action="b8-quick-edit" data-id="${safe(t.id)}" aria-label="Modifier ${safe(t.title)}">${svg('edit')}</button>
      </div>`).join('')}</div>`:
      `<div class="b8-zero">${svg('bolt')} <div><strong>Ton premier raccourci ?</strong><p>Exemple : dépense de 12 € en un tap, ou livraison à montant variable.</p></div></div>`}
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
      `<button class="b8-mini-btn" data-action="transaction-detail" data-id="${tx.id}" aria-label="Voir l'opération">${svg('chevright')}</button>`:
      o.skipped?`<button class="b8-mini-btn" data-action="b8-unskip" data-id="${o.rule.id}" data-key="${safe(o.identity)}">Réactiver</button>`:
      `<button class="b8-mini-btn" data-action="b8-skip" data-id="${o.rule.id}" data-key="${safe(o.identity)}">Ignorer</button>
       <button class="b8-mini-btn b8-mini-primary" data-action="b8-book" data-id="${o.rule.id}" data-key="${safe(o.identity)}">Confirmer</button>`}
    </div></div>`;
 }
 function recurring(){
   const list=recurrenceOccurrences(budgetMonth),rules=[...data.recurrences].sort((a,b)=>(b.active===true)-(a.active===true)?(a.active?-1:1):(a.title||'').localeCompare(b.title||'','fr'));
   const active=data.recurrences.filter(x=>x.active).length;
   return `<section class="b8-panel">${panelTitle('Échéancier · '+formatDate(budgetMonth+'-01',{month:'long',year:'numeric'}),
       'Les dates prévues et leur validation indépendante du journal.',
       `<button class="btn btn-small" data-action="b8-rule-new">${svg('plus')} Récurrence</button>`)}
     <div class="b8-reminder-list">${list.length?list.map(occurrenceRow).join(''):
      `<div class="b8-zero">${svg('calendar')} <p>Aucune échéance active prévue ce mois.</p></div>`}</div>
   </section>
   <section class="b8-panel">${panelTitle('Mes récurrences',active+' active(s) · '+data.recurrences.length+' enregistrée(s)')}
    <div class="b8-rules">${rules.length?rules.map(r=>`<div class="b8-rule-row">
      <span class="b8-rule-icon ${r.type}">${svg(r.type==='income'?'arrow':'wallet')}</span>
      <span class="b8-rule-copy"><strong>${safe(r.title)}</strong><small>${safe(rulePeriodDescription(r))}
      · ${safe(r.category||'Autres')}${!r.active?' · En pause':''}</small></span>
      <span class="b8-rule-price ${r.type==='income'?'positive':'negative'}">${r.type==='income'?'+':'−'}${currencies(r.amountCents)}</span>
      <div class="b8-rule-actions">
       <button data-action="b8-rule-toggle" data-id="${r.id}">${r.active?'Pause':'Activer'}</button>
       <button data-action="b8-rule-edit" data-id="${r.id}" aria-label="Modifier ${safe(r.title)}">${svg('edit')}</button>
      </div></div>`).join(''):
      `<div class="b8-zero">${svg('calendar')} <div><strong>Commence avec une échéance</strong><p>Salaire, prêt, loyer, abonnement…</p></div></div>`}</div>
    <p class="b8-disclaimer">Suspendre ou supprimer une règle ne supprime jamais les opérations déjà enregistrées. Un mois peut être ignoré individuellement.</p>
   </section>`;
 }
 function categoryTotals(entries){const m=new Map();for(const t of entries.filter(x=>x.type==='expense'))m.set(t.category||'Autres',(m.get(t.category||'Autres')||0)+(t.amountCents||0));return [...m.entries()].sort((a,b)=>b[1]-a[1]);}
 function categoriesMarkup(entries){
   const cats=categoryTotals(entries),total=cats.reduce((s,x)=>s+x[1],0);
   return `<div class="b8-category-list">${cats.length?cats.slice(0,6).map(([name,n])=>
     `<div><div class="b8-category-label"><span>${safe(name)}</span><strong>${currencies(n)}</strong></div>
       <span class="b8-bar"><i style="width:${total?Math.round(n*100/total):0}%"></i></span></div>`).join(''):
     '<p class="muted-note">Aucune dépense enregistrée.</p>'}</div>`;
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
      <div class="list-stack">${rows.map(transactionRow).join('')}</div></div>`).join('')||
     empty('Journal vide','Tes opérations confirmées apparaîtront ici.','wallet')}`;
 }
 function journal(){
  const cats=[...new Set(budgetEntries().map(t=>t.category||'Autres'))].sort((a,b)=>a.localeCompare(b,'fr'));
  return `${quickPanel()}<section class="b8-panel">${panelTitle('Journal des opérations',
    'Tes recettes et dépenses réelles, modifiables à tout moment.',
    `<button class="btn btn-small" data-action="new-transaction">${svg('plus')} Opération</button>`)}
   <div class="b8-journal-controls"><input type="search" id="b8-journal-search" value="${safe(journalSearch)}" placeholder="Chercher une opération..." aria-label="Rechercher une opération">
   <select id="b8-journal-type" aria-label="Type d'opération">
    ${[['all','Toutes'],['expense','Dépenses'],['income','Recettes']].map(([x,label])=>
     `<option value="${x}" ${journalType===x?'selected':''}>${label}</option>`).join('')}</select>
   <select id="b8-journal-category" aria-label="Catégorie">
    <option value="all">Toutes catégories</option>
    ${cats.map(c=>`<option value="${safe(c)}" ${c===journalCategory?'selected':''}>${safe(c)}</option>`).join('')}
   </select></div>
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
    ${categoriesMarkup(current)}
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
    <div class="b8-tabs" role="tablist" aria-label="Sections Budget">${tabs.map(([key,label])=>
      `<button type="button" role="tab" aria-selected="${tab===key}" class="${tab===key?'active':''}" data-action="b8-switch-tab" data-tab="${key}">${label}</button>`).join('')}</div>
    ${tab==='recurring'?recurring():tab==='journal'?journal():tab==='stats'?stats():overview()}
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
   <label class="b8-field">Catégorie<select name="category">${categoryOptions(rule.category||(rule.type==='income'?'Salaire':'Autres'))}</select></label>
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
    <label class="b8-field">Catégorie<select name="category">${categoryOptions(template.category)}</select></label>
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
     const q={...template,id:template.id||uid(),title:v.title.trim().slice(0,120),mode:v.mode,
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
   const rule=data.recurrences.find(x=>x.id===id);if(!rule)return;
   if(!confirm('Supprimer la règle « '+rule.title+' » ? Ses opérations déjà enregistrées seront conservées.'))return;
   data.recurrences=data.recurrences.filter(x=>x.id!==id);
   await persist();closeModal();refresh();toast('Récurrence supprimée. Historique conservé.');
 }
 async function deleteQuick(id){
   const q=data.quickExpenses.find(x=>x.id===id);if(!q)return;
   if(!confirm('Supprimer le raccourci « '+q.title+' » ? Les opérations existantes seront conservées.'))return;
   data.quickExpenses=data.quickExpenses.filter(x=>x.id!==id);
   await persist();closeModal();refresh();toast('Raccourci supprimé.');
 }
 function act(action,el){
   if(action==='b8-switch-tab'){tab=el.dataset.tab;refresh();return;}
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
   if(action==='b8-quick-use')useQuick(el.dataset.id);
 }
 function change(el){
   if(el.id==='b8-journal-type'){journalType=el.value;updateJournal();}
   if(el.id==='b8-journal-category'){journalCategory=el.value;updateJournal();}
 }
 function inputSearch(el){if(el.id==='b8-journal-search'){journalSearch=el.value;updateJournal();}}
 function updateJournal(){
   const mount=document.getElementById('b8-journal-results');if(mount)mount.innerHTML=journalList();
 }
 window.NexusBudget={view,act,change,inputSearch,forecast,occurrences,trendMonths,openRule:ruleForm};
})();