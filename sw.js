// ═══════════════════════════════════════════
//  BailExpert — Service Worker v4.0
//  © 2026 BHSH — Tous droits réservés
//  Repo : heddine.github.io/Bail4you/
// ═══════════════════════════════════════════

const CACHE_NAME = 'bailexpert-v4';
const BASE = '/Bail4you';
const OFFLINE_URL = BASE + '/index.html';

const PRECACHE_URLS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/charges-travaux.html',
  BASE + '/politique-confidentialite.html',
  BASE + '/privacy.html',
  BASE + '/icon-48-3.png',
  BASE + '/icon-72-2.png',
  BASE + '/icon-96-3.png',
  BASE + '/icon-144-2.png',
  BASE + '/icon-192-3.png',
  BASE + '/icon-512-3.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW BailExpert] Mise en cache initiale');
      // addAll échoue entièrement si UNE seule ressource est introuvable (404).
      // On utilise donc un cache "best effort" pour ne jamais bloquer l'installation
      // même si un fichier optionnel (ex: charges-travaux.html) n'existe pas encore.
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW BailExpert] Impossible de mettre en cache :', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.hostname !== location.hostname) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
        // Pour les images/icônes non mises en cache et indisponibles hors-ligne,
        // on laisse l'échec se propager plutôt que de renvoyer undefined
        // (évite une exception silencieuse côté navigateur).
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
