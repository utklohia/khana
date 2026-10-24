/* Keeps the app openable with no internet, and remembers dish pictures
   after they have been seen once. Bump the version numbers if you ever
   want every phone to throw away what it has stored. */
const SHELL = 'menu-shell-v2';
const MEDIA = 'menu-media-v2';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // The menu itself must always be fresh — never serve it from a cache.
  if(url.hostname.includes('docs.google.com') || url.search.includes('output=csv')){
    return;                                   // let the page's own fetch handle it
  }

  // Pictures and fonts: use the stored copy first, refresh quietly behind it.
  if(req.destination === 'image' || req.destination === 'font' || req.destination === 'style'){
    e.respondWith(
      caches.open(MEDIA).then(cache =>
        cache.match(req).then(hit => {
          const live = fetch(req).then(res => {
            if(res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || live;
        })
      )
    );
    return;
  }

  // Everything else (the app files): stored copy first.
  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).catch(() => {
        if(req.mode === 'navigate') return caches.match('./index.html');
      })
    )
  );
});
