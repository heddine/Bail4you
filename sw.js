// ═══════════════════════════════════════════
//  BailExpert — Service Worker v2.0
//  © 2025 BHSH — Tous droits réservés
// ═══════════════════════════════════════════

const CACHE_NAME = 'bailexpert-v2';
const OFFLINE_URL = '/index.html';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/politique-confidentialite.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ── Installation : mise en cache des ressources statiques ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW BailExpert] Mise en cache initiale');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activation : nettoyage des anciens caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW BailExpert] Suppression ancien cache :', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Stratégie : Cache First, réseau en fallback ──
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  // Ignorer les requêtes API externes (adresses, etc.)
  const url = new URL(event.request.url);
  if (url.hostname !== location.hostname) {
    // Pour les ressources externes : réseau d'abord
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources valides
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Hors ligne : retourner la page principale
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// ── Message pour forcer la mise à jour ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
