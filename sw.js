const CACHE = 'san-cau-ui-70-20-5-5-v7';
const FILES = [
  './layout.js?v=ui-70-20-5-5-v7',
  './cloud-sync.js?v=ui-70-20-5-5-v7',
  './sports-theme.css?v=ui-70-20-5-5-v7',
  './',
  './index.html',
  './style.css?v=ui-70-20-5-5-v7',
  './antd-design-system.css?v=ui-70-20-5-5-v7',
  './app.js?v=ui-70-20-5-5-v7',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon.png',
  './favicon-32x32.png',
  './icon.svg',
  './icons/badminton.svg',
  './icons/calendar.svg',
  './icons/account-group.svg',
  './icons/cash-multiple.svg',
  './icons/wallet.svg',
  './icons/view-dashboard.svg',
  './icons/plus.svg'
];
self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()))
);
self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  )
);
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(x => {
          if (x.ok) {
            const copy = x.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copy));
          }
          return x;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(
      r =>
        r ||
        fetch(e.request)
          .then(x => {
            const copy = x.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
            return x;
          })
          .catch(() => caches.match('./index.html'))
    )
  );
});
