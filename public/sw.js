const CACHE = 'bk-omzetter-v1';

const PRECACHE = [
  '/',
  '/belastingcodes/',
  '/elfproef/',
  '/aanslagnummer/',
  '/navorderingsaanslag/',
];

// Installeer: cache de pagina-shells
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activeer: verwijder oude caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: stale-while-revalidate voor HTML, cache-first voor assets
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Externe API-calls (KvK) nooit cachen
  const url = new URL(event.request.url);
  if (!url.origin.includes(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request)
          .then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cached);

        // Stale-while-revalidate: lever cache direct, update op de achtergrond
        return cached ?? networkFetch;
      })
    )
  );
});
