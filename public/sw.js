// Kill-switch service worker.
// Older builds of this app shipped a caching SW that hijacked the page and
// kept serving stale HTML/JS across deploys. This replacement intentionally
// does nothing useful: on install it deletes every cache and on activate it
// unregisters itself and reloads every controlled client. Once it runs, the
// browser is back to network-only and future deploys land instantly.

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    // Take control of open pages FIRST so navigate() is allowed to reload them.
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      try { client.navigate(client.url); } catch {}
    }
    // Remove ourselves LAST so future loads are pure network, with no SW at all.
    await self.registration.unregister();
  })());
});

// Pass-through fetch — never cache, never intercept.
self.addEventListener('fetch', () => {});
