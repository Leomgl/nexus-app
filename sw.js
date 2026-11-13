const CACHE_NAME = 'nexus-v0.21.14.2-sante-revision-rc1';
const CORE = ['./index.html', './styles.css?v=02116', './pulse-v018.css?v=0180', './pulse-v018.js?v=0215', './vestiaire-v021.js?v=0214', './vestiaire-v021.css?v=0210', './settings-v0214.css?v=0214', './settings-v0214.js?v=0215', './contacts-v017.js?v=0174', './connections.js?v=0214', './nexus-travel.js?v=02124', './link-audit.js?v=02115', './link-import.js?v=02121', './link-hub-adapter.js?v=02122', './link-bridge.js?v=02117', './rituel-import.js?v=0194', './link-hub-bus.js?v=02123', './connect-v019.js?v=0191', './link-core.js?v=02112', './sante-link-core.js?v=0215', './nexus-sante.js?v=02125', './nexus-sante.css?v=0219', './cloud.js', './push-context-v0213.js?v=02110', './push-client.js?v=0213', './passkey-client.js?v=02114', './lock-boot.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './budget-v020.css?v=02110', './app.js?v=02114', './recycle.js?v=02124', './budget-v08.js?v=02110', './budget-v020.js?v=02110', './budget-finance-v02110.js?v=02110', './budget-import-v0216.js?v=0216'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('nexus-v') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Shared GitHub Pages host: never intercept or cache the RITUEL (or future Gaming) route.
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {}); }
    return response;
  }).catch(() => caches.match(event.request)));
});
// The server only knows opaque job IDs; contextual notification text is resolved
// from this device's IndexedDB. Nothing personal is uploaded to the push API.
async function localPushContext(tag){
  if(!/^nexus-[a-f0-9]{16}$/.test(tag)||!('indexedDB' in self))return null;
  return new Promise(resolve=>{
    let settled=false,db=null;
    const done=value=>{if(settled)return;settled=true;try{db?.close();}catch{}resolve(value);};
    try{
      const request=indexedDB.open('nexus-v0-1');
      request.onupgradeneeded=()=>{try{request.transaction.abort();}catch{}};
      request.onerror=()=>done(null);
      request.onsuccess=()=>{
        db=request.result;
        if(!db.objectStoreNames.contains('data'))return done(null);
        const tx=db.transaction('data','readonly');
        const store=tx.objectStore('data');
        const read=store.get('nexus_push_context_v1');
        const prefs=store.get('nexus_push_v1');
        tx.oncomplete=()=>{
          const item=read.result?.[tag];
          if(!item||typeof item.title!=='string'||typeof item.body!=='string')return done(null);
          // Revoking display consent takes effect immediately, even when
          // a previously scheduled remote job still has detailed local text.
          const safe={
            event:{title:'📅 Rendez-vous à venir',body:'Consulte ton agenda dans NEXUS.'},
            task:{title:'✅ Rappel à venir',body:'Une tâche t’attend dans NEXUS.'},
            budget:{title:'💳 Échéance budgétaire',body:'Une rentrée ou sortie d’argent est prévue dans NEXUS.'}
          };
          const selected=prefs.result?.showDetails===true?item:(safe[item.kind]||null);
          done(selected?{title:selected.title.slice(0,80),body:selected.body.slice(0,220)}:null);
        };
        tx.onerror=()=>done(null);
      };
    }catch{done(null);}
  });
}
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let payload={title:'NEXUS · Rappel',body:'Tu as un rappel à consulter dans NEXUS.',tag:'nexus-reminder'};
    try{if(event.data)payload={...payload,...event.data.json()};}catch{}
    const tag=String(payload.tag||'nexus-reminder').slice(0,90);
    const details=await localPushContext(tag);
    await self.registration.showNotification(String(details?.title||payload.title||'NEXUS').slice(0,80),{
      body:String(details?.body||payload.body||'Ouvre NEXUS pour les détails.').slice(0,220),
      icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',
      tag,data:{url:new URL('./index.html',self.registration.scope).href}
    });
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const url=new URL('./index.html',self.registration.scope).href;
    const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
    const app=windows.find(w=>w.url.startsWith(self.registration.scope));
    if(app){await app.focus();return;}
    if(clients.openWindow)await clients.openWindow(url);
  })());
});
