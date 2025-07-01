/* =================================================
   캐시 이름 (버전)
================================================== */
const CACHE_VERSION = 'v2';
const SHELL_CACHE   = `shell-${CACHE_VERSION}`;
const DATA_CACHE    = `data-${CACHE_VERSION}`;
const IMG_CACHE     = `img-${CACHE_VERSION}`;

/* =================================================
   앱 셸 + 데이터 파일
================================================== */
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const rev = Array.from({length:22},(_,i)=>`./data/Rev/R-chapter${i+1}.txt`);
const isa = Array.from({length:66},(_,i)=>`./data/Isa/I-chapter${i+1}.txt`);
const DATA_FILES = [...rev,...isa];

/* =================================================
   INSTALL
================================================== */
self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(SHELL_CACHE).then(c=>c.addAll([...APP_SHELL,...DATA_FILES]))
  );
  self.skipWaiting();
});

/* =================================================
   ACTIVATE
================================================== */
self.addEventListener('activate',e=>{
  const keep=[SHELL_CACHE,DATA_CACHE,IMG_CACHE];
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys
      .filter(k=>!keep.includes(k))
      .map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

/* =================================================
   FETCH
================================================== */
self.addEventListener('fetch',e=>{
  const req=e.request;
  const url=new URL(req.url);

  /* 텍스트 데이터: Cache-first */
  if(url.pathname.endsWith('.txt')){
    e.respondWith(
      caches.open(DATA_CACHE).then(async cache=>{
        const cached=await cache.match(req);
        const fetchAndUpdate=fetch(req).then(res=>{
          if(res.ok) cache.put(req,res.clone());
          return res;
        });
        return cached || fetchAndUpdate;
      })
    );
    return;
  }

  /* 이미지: Cache-first */
  if(req.destination==='image' || url.pathname.endsWith('.png')){
    e.respondWith(
      caches.open(IMG_CACHE).then(async cache=>{
        const cached=await cache.match(req);
        if(cached) return cached;
        const res=await fetch(req);
        if(res.ok) cache.put(req,res.clone());
        return res;
      })
    );
    return;
  }

  /* 앱 셸: Network-first */
  e.respondWith(
    fetch(req)
      .then(res=>{
        if(res.ok) caches.open(SHELL_CACHE).then(c=>c.put(req,res.clone()));
        return res;
      })
      .catch(()=>caches.match(req))
  );
});
