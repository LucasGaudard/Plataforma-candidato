const CACHE_VERSION = 'conecta-eleitor-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PRECACHE_URLS = [
  '/offline.html',
  '/icons/favicon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('conecta-eleitor-') && key !== STATIC_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

function isSafeStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/Images/') ||
    url.pathname === '/icons/favicon.png'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    request.headers.has('authorization')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html')),
    );
    return;
  }

  if (!isSafeStaticAsset(url)) {
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      const publicRequest = new Request(request, { credentials: 'omit' });
      const networkResponse = await fetch(publicRequest);

      if (networkResponse.ok && networkResponse.type === 'basic') {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    }),
  );
});
