// Eldritch — Service Worker
// Enables "Install app" in Chrome and caches the app shell for offline use.
// Bump CACHE_VERSION whenever you want old caches wiped after an update.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `eldritch-shell-${CACHE_VERSION}`;

// The app shell. If you rename Eldritch.html (e.g. to index.html), update
// this list and the start_url/id in manifest.json to match.
const PRECACHE_ASSETS = [
  './Eldritch.html',
  './manifest.json',
  './icon.ico'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests. Multiplayer traffic (Nostr relays,
  // Supabase) is cross-origin and must always go straight to the network.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Network-first: always fetch the latest version of the game when online,
  // and quietly refresh the cache. Falls back to the cached shell offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
