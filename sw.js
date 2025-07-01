const CACHE_NAME = 'app-shell-v1';
const DATA_CACHE_NAME = 'data-cache-v1';
const FILES_TO_CACHE = [ '/', '/index.html', '/style.css', '/app.js', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png' ];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  if (url.pathname.startsWith('/data/Rev/') || url.pathname.startsWith('/data/Isa/')) {
    evt.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache =>
        cache.match(evt.request).then(resp => resp || fetch(evt.request).then(remote => { cache.put(evt.request, remote.clone()); return remote; }))
      )
    );
    return;
  }
  evt.respondWith(caches.match(evt.request).then(resp => resp || fetch(evt.request)));
});
