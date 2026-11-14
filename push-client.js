/* NEXUS V0.21.3 — private Web Push with contextual details resolved on this iPhone. */
'use strict';
(() => {
  const API='https://nexus-app-api.q9pfwtztsc.workers.dev';
  const STORE_KEY='nexus_push_v1';
  const CONTEXT_KEY='nexus_push_context_v1';
  const taskTimeouts=[{min:1440,text:'24 heures avant'},{min:120,text:'2 heures avant'},{min:60,text:'1 heure avant'},{min:45,text:'45 minutes avant'},{min:30,text:'30 minutes avant'},{min:15,text:'15 minutes avant'}];
  const db=()=>{if(!dbHandle)throw new Error('Stockage IndexedDB indisponible.');return dbHandle;};
  const read=(key=STORE_KEY)=>new Promise((resolve,reject)=>{const r=db().transaction(DB_STORE,'readonly').objectStore(DB_STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});
  const write=(value,key=STORE_KEY)=>new Promise((resolve,reject)=>{const t=db().transaction(DB_STORE,'readwrite');if(value===null)t.objectStore(DB_STORE).delete(key);else t.objectStore(DB_STORE).put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});
  const hash=async raw=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const b64bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
  function checks(){
    if(!('Notification' in window)||!('PushManager' in window)||!('serviceWorker' in navigator))throw new Error('Ce navigateur ne permet pas les notifications Web Push.');
    if(!(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true))throw new Error('Installe et ouvre NEXUS depuis l’écran d’accueil de ton iPhone.');
  }
  async function call(path,method='GET',body){
    const session=await window.NexusCloud?.session?.();
    if(!session?.token)throw new Error('Active d’abord ton coffre dans Réglages → Coffre cloud.');
    let r;try{
      r=await fetch(API+path,{method,headers:{'Authorization':'Bearer '+session.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
    }catch{throw new Error('Cloudflare est inaccessible.');}
    let obj;try{obj=await r.json();}catch{throw new Error('Réponse du serveur invalide.');}
    if(!r.ok)throw new Error(({UNAUTHORIZED:'La clé du coffre est invalide.',RATE_LIMITED:'Attends 90 secondes avant un autre test.',SUBSCRIPTION_EXPIRED:'Abonnement expiré : réactive les notifications.',PUSH_DELIVERY_FAILED:'Le service push n’a pas confirmé l’envoi.',INVALID_JOBS:'Trop de rappels à programmer.'})[obj.error]||('Erreur serveur : '+obj.error));
    return obj;
  }
  const stateError=async fn=>{try{return await fn();}catch(err){alert(err.message||'Notifications indisponibles.');}};
  async function scheduledJobs(settings){
    if(!window.NexusPushContext?.build)throw new Error('Le module de notifications contextuelles est indisponible.');
    return window.NexusPushContext.build(data,settings,hash);
  }
  let scheduleTimer=null,active=false;
  async function scheduleNow(){
    // LINK staging pilot owns all reminder scheduling in this isolated mode.
    // Never rebuild the legacy D1 schedule concurrently (quota + duplicates).
    // Both explicit LINK pilot modes own their new test events. Do not
    // trigger the legacy full D1 delete+reinsert job rebuild in either mode.
    const params=new URL(location.href).searchParams;
    if(params.get('linkNotificationsPilot')==='1'||
       params.get('linkNotificationsLive')==='1')return;
    const state=await read();
    if(!state?.enabled||!state.deviceId)return;
    const {jobs,contexts}=await scheduledJobs(state);
    // This mapping stays in the local NEXUS IndexedDB. Never upload labels or amounts.
    // Write before scheduling: a push arriving immediately can already resolve its context.
    await write(contexts,CONTEXT_KEY);
    await call('/api/v1/push/schedule','POST',{deviceId:state.deviceId,jobs});
    await write({...state,lastSyncedAt:new Date().toISOString(),count:jobs.length});
  }
  function queueSchedule(){
    if(scheduleTimer)clearTimeout(scheduleTimer);
    scheduleTimer=setTimeout(()=>{scheduleNow().catch(e=>console.warn('Push schedule will retry',e.message));},2000);
  }
  async function panel(){
    const state=await read();
    const installed=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
    const supported='Notification' in window&&'PushManager' in window&&'serviceWorker' in navigator;
    const allowed=supported?Notification.permission:'unsupported';
    const taskMins=state?.taskMins||[60];
    modal('Notifications · V0.21.3',`
      <div class="info-strip">${svg('shield')} Cloudflare reçoit seulement les horaires, le type et un identifiant opaque. Les titres, lieux, participants et montants sont lus directement sur ton iPhone si tu actives les détails.</div>
      <p class="muted-note">Installation écran d’accueil : ${installed?'OK':'Nécessaire'} · Autorisation iOS : ${escapeHtml(allowed)} · Push : ${state?.enabled?'activé':'désactivé'}</p>
      <form id="nx-push-form" class="vault-form">
        <h3>Rendez-vous : réglage individuel</h3>
        <p>Les délais sont maintenant définis directement dans chaque rendez-vous de l'agenda : 1 jour, 2 h, 45 min, 15 min, etc. Tu peux en cocher plusieurs ou aucun.</p>
        <h3>Délais par défaut pour les tâches</h3>
        <p>Si aucune heure n’est indiquée, l’échéance est fixée à 9 h.</p>
        ${taskTimeouts.map(x=>`<label class="nx-check"><input type="checkbox" name="task" value="${x.min}" ${taskMins.includes(x.min)?'checked':''}> ${x.text}</label>`).join('')}
        <h3>Budget · échéances récurrentes</h3>
        <label class="nx-check"><input type="checkbox" name="budgetEnabled" ${state?.budgetEnabled!==false?'checked':''}> Prévenir des revenus et dépenses récurrents</label>
        <p>Par défaut : à J-2 et le jour J à 9 h. Chaque récurrence peut personnaliser ou désactiver ses alertes dans Budget → Engagements.</p>
        <h3>Confidentialité sur l'écran verrouillé</h3>
        <label class="nx-check"><input type="checkbox" name="showDetails" ${state?.showDetails===true?'checked':''}> Afficher intitulés, lieux, personnes et montants dans les notifications</label>
        <p class="muted-note">Désactivé par défaut. Si tu coches cette option, les personnes pouvant voir ton écran verrouillé verront aussi ces détails. Cloudflare n'y a pas accès.</p>
        <div class="vault-actions">
          <button class="btn" id="nx-push-enable" type="button">${svg('check')} ${state?.enabled?'Mettre à jour mes rappels':'Activer les notifications'}</button>
          ${state?.enabled?'<button class="btn btn-soft" id="nx-push-test" type="button">Envoyer une notification test</button><button class="btn btn-neutral" id="nx-push-disable" type="button">Désactiver les notifications</button>':''}
        </div>
      </form>
      <p class="muted-note">Cloudflare vérifie les rappels toutes les cinq minutes. Les modifications ne sont transmises que si NEXUS est ouvert et connecté. Aucun titre de rendez-vous n’est communiqué au serveur.</p>
    `);
    const form=document.getElementById('nx-push-form');
    const prefs=()=>({
      // Keep this for legacy appointments that do not yet have their own reminders.
      eventMins:Array.isArray(state?.eventMins)?state.eventMins:[1440,60],
      budgetEnabled:!!form.elements.budgetEnabled.checked,
      showDetails:!!form.elements.showDetails.checked,
      taskMins:[...form.querySelectorAll('input[name=task]:checked')].map(x=>+x.value),
    });
    // Privacy revocation must work immediately, even if Cloudflare is offline.
    // The Service Worker always checks the current local preference at display time.
    form.elements.showDetails.addEventListener('change',async()=>{
      if(form.elements.showDetails.checked||!state?.enabled)return;
      try{
        const current=await read();
        if(!current?.enabled)return;
        await write({...current,showDetails:false});
        await write({},CONTEXT_KEY);
        queueSchedule();
        toast('Détails des notifications masqués sur cet iPhone.');
      }catch(err){console.warn('Local privacy update failed',err);}
    });
    document.getElementById('nx-push-enable').addEventListener('click',async()=>{
      // MUST be initiated directly from the click event to preserve iOS user gesture.
      let permission;
      try{checks();permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;}
      catch(e){alert(e.message);return;}
      if(permission!=='granted'){alert('Active les notifications de NEXUS dans les réglages iPhone.');return;}
      await stateError(async()=>{
        const button=document.getElementById('nx-push-enable');if(button)button.disabled=true;
        const server=await call('/api/v1/push/config');
        if(!server.ready||!server.publicKey)throw new Error('Les clés Web Push du serveur ne sont pas prêtes.');
        const reg=await navigator.serviceWorker.ready;
        const existing=await reg.pushManager.getSubscription();
        const subscription=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64bytes(server.publicKey)});
        const result=await call('/api/v1/push/register','POST',{subscription:subscription.toJSON()});
        await write({enabled:true,deviceId:result.deviceId,...prefs(),lastSyncedAt:null});
        await scheduleNow();toast('Notifications activées sur cet iPhone.');panel();
      });
    });
    if(state?.enabled){
      document.getElementById('nx-push-test').addEventListener('click',()=>stateError(async()=>{
        await call('/api/v1/push/test','POST',{deviceId:state.deviceId});toast('Notification test demandée.');
      }));
      document.getElementById('nx-push-disable').addEventListener('click',()=>stateError(async()=>{
        if(!confirm('Désactiver toutes les notifications NEXUS sur cet iPhone ?'))return;
        await call('/api/v1/push/unsubscribe','POST',{deviceId:state.deviceId});
        const reg=await navigator.serviceWorker.ready;
        const sub=await reg.pushManager.getSubscription();
        if(sub)await sub.unsubscribe();
        await write(null);await write(null,CONTEXT_KEY);toast('Notifications désactivées.');panel();
      }));
    }
  }
  window.NexusPush={
    openPanel:()=>stateError(panel),
    onLocalChange:queueSchedule,
    refresh:()=>stateError(scheduleNow),
    syncQuietly:()=>scheduleNow().catch(e=>console.warn('Push sync retry',e.message)),
    status:read
  };
  window.addEventListener('online',()=>{scheduleNow().catch(()=>{});});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueSchedule();});
})();
