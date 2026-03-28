/**
 * Service Worker - Navette Express Espace Chauffeur
 * Cache offline pour utilisation terrain
 * W2K-Digital 2025
 */

const CACHE_NAME = 'navette-chauffeur-v1';
const OFFLINE_URL = '/erreur.html';

// Fichiers à mettre en cache pour fonctionnement offline
const ASSETS_TO_CACHE = [
  '/',
  '/splash.html',
  '/connexion.html',
  '/accueil.html',
  '/itineraire.html',
  '/passagers.html',
  '/embarquement.html',
  '/incident.html',
  '/planning.html',
  '/info-bus.html',
  '/notifications.html',
  '/profil.html',
  '/erreur.html',
  '/css/app.css',
  '/js/app.js',
  '/manifest.json',
  '/images/logo/logo-jaebets.png',
  '/images/logo/logo-jaebets.webp'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des ressources');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erreur installation:', error);
      })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

// Stratégie de cache : Network First avec fallback cache
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes API Supabase (toujours réseau)
  if (event.request.url.includes('supabase')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cloner la réponse pour la mettre en cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Réseau indisponible, chercher dans le cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si page HTML non trouvée, afficher page erreur
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Ressource non disponible hors ligne', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Gestion des messages depuis l'application
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notification push (préparé pour futures fonctionnalités)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/images/logo/icon-192x192.png',
    badge: '/images/logo/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'navette-notification',
    requireInteraction: true,
    data: {
      url: data.url || '/notifications.html'
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Navette Express',
      options
    )
  );
});

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const url = event.notification.data.url || '/';
        
        // Chercher une fenêtre déjà ouverte
        for (const client of clientList) {
          if (client.url.includes('navette') && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        
        // Ouvrir nouvelle fenêtre si aucune trouvée
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
