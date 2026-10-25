/* Service worker — Commission Exposé (5 applications installables : Suivi, Modérateurs, Jury, Administration, Accueil)
   - Affiche les notifications push même quand l'application est fermée (modèle « resto »)
   - Garde une copie des pages pour qu'elles s'ouvrent même sans réseau (les données restent celles du serveur) */
const CACHE = 'ce-v7';
const PAGES = ['index.html','suivi.html','moderateur.html','jury.html','admin.html','etudiant.html','core.css','core.js','discussion.js','suivi.js','moderateur.js','jury.js','admin.js','etudiant.js','export.js','banniere.jpg','icon.svg'];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(PAGES)).catch(() => {})); });
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
// Réseau d'abord (toujours la dernière version), copie locale si le réseau ne répond pas. Jamais de cache pour l'API.
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && !u.pathname.startsWith('/justificatifs/') && !u.pathname.startsWith('/photos/')) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)).catch(() => {}); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Commission Exposé', body: e.data ? e.data.text() : '' }; }
  const k = ({'moderateur.html':'moderateur','jury.html':'jury','admin.html':'admin','etudiant.html':'accueil'})[String(d.url||'').split('?')[0]] || 'suivi';
  e.waitUntil(self.registration.showNotification(d.title || 'Commission Exposé', {
    body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag,
    icon: 'icons/' + k + '-192.png', badge: 'icons/' + k + '-192.png', vibrate: [120, 60, 120],
    data: { url: d.url || 'suivi.html' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || 'suivi.html', self.registration.scope).href;
  const page = new URL(url).pathname;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (new URL(c.url).pathname === page && 'focus' in c) { c.postMessage({ type: 'open', url }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
