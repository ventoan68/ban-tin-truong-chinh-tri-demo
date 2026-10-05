const CACHE_PREFIX = 'tayninh-bantin-';
const CACHE = `${CACHE_PREFIX}20261005-1`;
const FILES = [
  './', 'index.html', 'styles.css', 'docx.js', 'samples.js', 'workflow.js', 'ui.js', 'views.js', 'app.js',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'manifest.webmanifest',
  'be-vietnam-pro-latin-400-normal.woff2', 'be-vietnam-pro-latin-500-normal.woff2',
  'be-vietnam-pro-latin-600-normal.woff2', 'be-vietnam-pro-latin-700-normal.woff2',
  'be-vietnam-pro-vietnamese-400-normal.woff2', 'be-vietnam-pro-vietnamese-500-normal.woff2',
  'be-vietnam-pro-vietnamese-600-normal.woff2', 'be-vietnam-pro-vietnamese-700-normal.woff2',
  'source-serif-4-latin-wght-normal.woff2', 'source-serif-4-vietnamese-wght-normal.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE && (key.startsWith(CACHE_PREFIX) || key === 'bantin-v2')).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then(hit => hit || (request.mode === 'navigate' ? caches.match(new URL('index.html', scope).href) : Response.error())))
  );
});
