/* NEXUS V0.4 — private Web Push, only generic messages leave Cloudflare. */
'use strict';
(() => {
  const API='https://nexus-app-api.q9pfwtztsc.workers.dev';
  const STORE_KEY='nexus_push_v1';
  const timeouts=[{min:1440,text:'24 heures avant'},{min:60,text:'1 heure avant'},{min:15,text:'15 minutes avant'}];
  const db=()=>{if(!dbHandle)throw new Error('Stockage IndexedDB indisponible.');return dbHandle;};
  const read=()=>new Promise((resolve,reject)=>{const r=db().transaction(DB_STORE,'readonly').objectStore(DB_STORE).get(STORE_KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});
  const write=value=>new Promise((resolve,reject)=>{const t=db().transaction(DB_STORE,'readwrite');if(value===null)t.objectStore(DB_STORE).delete(STORE_KEY);else t.objectStore(DB_STORE).put(value,STORE_KEY);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});
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
  function scheduleDate(raw){
    if(typeof raw!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw))return null;
    const dt=new Date(raw);return Number.isNaN(dt.getTime())?null:dt;
  }
  async function scheduledJobs(settings){
    const now=Date.now(),jobs=[];
    const opts=Array.isArray(settings.eventMins)?settings.eventMins:[60];
    const taskOpts=Array.isArray(settings.taskMins)?settings.taskMins:[60];
    const rows=[
      ...data.events.map(e=>({item:e,kind:'event',at:scheduleDate(e.start),mins:opts})),
      ...data.tasks.filter(t=>!t.done&&t.dueDate).map(t=>({item:t,kind:'task',at:scheduleDate(t.dueDate+'T'+(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.dueTime||'')?t.dueTime:'09:00')+':00'),mins:taskOpts}))
    ];
    for(const row of rows){
      if(!row.at||!row.item.id)continue;
      for(const delta of row.mins){
        const fireAt=Math.floor((row.at.getTime()-delta*60_000)/1000);
        if(![15,60,1440].includes(delta)||fireAt<now/1000-60||fireAt>now/1000+366*86400)continue;
        const id=await hash(row.kind+':'+row.item.id+':'+row.at.toISOString()+':'+delta);
        jobs.push({id,kind:row.kind,fireAt});
      }
    }
    return jobs.sort((a,b)=>a.fireAt-b.fireAt).slice(0,600);
  }
  let scheduleTimer=null,active=false;
  async function scheduleNow(){
    const state=await read();
    if(!state?.enabled||!state.deviceId)return;
    const jobs=await scheduledJobs(state);
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
    const eventMins=state?.eventMins||[1440,60];
    const taskMins=state?.taskMins||[60];
    modal('Notifications · V0.4',`
      <div class="info-strip">${svg('shield')} Ton serveur reçoit seulement les horaires et le type de rappel. Aucun titre, motif ou nom de contact. Les notifications affichées restent génériques.</div>
      <p class="muted-note">Installation écran d’accueil : ${installed?'OK':'Nécessaire'} · Autorisation iOS : ${escapeHtml(allowed)} · Push : ${state?.enabled?'activé':'désactivé'}</p>
      <form id="nx-push-form" class="vault-form">
        <h3>Avant un rendez-vous</h3>
        ${timeouts.map(x=>`<label class="nx-check"><input type="checkbox" name="event" value="${x.min}" ${eventMins.includes(x.min)?'checked':''}> ${x.text}</label>`).join('')}
        <h3>Avant une tâche à échéance</h3>
        <p>Si aucune heure n’est indiquée, l’échéance est fixée à 9 h.</p>
        ${timeouts.map(x=>`<label class="nx-check"><input type="checkbox" name="task" value="${x.min}" ${taskMins.includes(x.min)?'checked':''}> ${x.text}</label>`).join('')}
        <div class="vault-actions">
          <button class="btn" id="nx-push-enable" type="button">${svg('check')} ${state?.enabled?'Mettre à jour mes rappels':'Activer les notifications'}</button>
          ${state?.enabled?'<button class="btn btn-soft" id="nx-push-test" type="button">Envoyer une notification test</button><button class="btn btn-neutral" id="nx-push-disable" type="button">Désactiver les notifications</button>':''}
        </div>
      </form>
      <p class="muted-note">Envoi prévu toutes les cinq minutes côté Cloudflare. Les rappels peuvent arriver avec un léger décalage, nécessitent une connexion réseau et une autorisation iOS active.</p>
    `);
    const form=document.getElementById('nx-push-form');
    const prefs=()=>({
      eventMins:[...form.querySelectorAll('input[name=event]:checked')].map(x=>+x.value),
      taskMins:[...form.querySelectorAll('input[name=task]:checked')].map(x=>+x.value),
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
        await write(null);toast('Notifications désactivées.');panel();
      }));
    }
  }
  window.NexusPush={
    openPanel:()=>stateError(panel),
    onLocalChange:queueSchedule,
    refresh:()=>stateError(scheduleNow),
    status:read
  };
  window.addEventListener('online',()=>{scheduleNow().catch(()=>{});});
})();
