const CACHE='flicksort-experiment-4.0.0';
const urls=['./','./style.css','./config.js','./app.mjs','./core.mjs','./storage.mjs','../study-v3/scoring.js',...Array.from({length:12},(_,i)=>`../study-v3/assets/l2-${String(i+1).padStart(2,'0')}.png`)];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(urls))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('flicksort-experiment-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request).then(r=>r||new Response('离线缓存尚未就绪，请联网打开一次。',{status:503}))));});
