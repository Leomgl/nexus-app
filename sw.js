const CACHE_NAME = 'nexus-v0.14.0';
const CORE = ['./', './index.html', './styles.css', './app.js', './recycle.js', './connections.js','./link-import.js', './link-core.js', './budget-v08.js', './cloud.js', './push-client.js', './passkey-client.js', './lock-boot.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
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
// Generic privacy-conscious notifications: never display personal data on lock screen.
self.addEventListener('push',event=>{
  let payload={title:'NEXUS · Rappel',body:'Tu as un rappel à consulter dans NEXUS.',tag:'nexus-reminder'};
  try{if(event.data)payload={...payload,...event.data.json()};}catch{}
  event.waitUntil(self.registration.showNotification(String(payload.title||'NEXUS').slice(0,80),{
    body:String(payload.body||'Ouvre NEXUS pour les détails.').slice(0,220),
    icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',
    tag:String(payload.tag||'nexus-reminder').slice(0,90),
    data:{url:new URL('./index.html',self.registration.scope).href}
  }));
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
