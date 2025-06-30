const CACHE_NAME = 'afd-dashboard-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  // External CDN resources
  'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css',
  'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Cache failed:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the service worker takes control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests and chrome-extension requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith('https://cdnjs.cloudflare.com') &&
      !event.request.url.startsWith('https://fonts.googleapis.com') &&
      !event.request.url.startsWith('https://fonts.gstatic.com') &&
      !event.request.url.startsWith('https://www.data.gouv.fr')) {
    return;
  }

  // Handle API data requests (data.gouv.fr) with network-first strategy
  if (event.request.url.includes('data.gouv.fr')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network request is successful, update cache and return response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request).then((response) => {
            if (response) {
              console.log('[ServiceWorker] Serving cached data for:', event.request.url);
              return response;
            }
            // If not in cache either, return offline message
            return new Response(
              JSON.stringify({
                error: 'Données non disponibles hors ligne',
                message: 'Veuillez vérifier votre connexion internet'
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          });
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return response;
        }

        console.log('[ServiceWorker] Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response because it's a stream
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch((error) => {
          console.error('[ServiceWorker] Fetch failed:', error);
          
          // Return a custom offline page for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/').then((response) => {
              return response || new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <title>AFD Dashboard - Hors ligne</title>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body { 
                      font-family: 'Poppins', sans-serif; 
                      background: linear-gradient(135deg, #0055A4, #0074D9); 
                      color: white; 
                      margin: 0; 
                      padding: 20px; 
                      min-height: 100vh; 
                      display: flex; 
                      align-items: center; 
                      justify-content: center; 
                      text-align: center; 
                    }
                    .container { max-width: 500px; }
                    h1 { font-size: 2rem; margin-bottom: 1rem; }
                    p { font-size: 1.1rem; margin-bottom: 2rem; }
                    button { 
                      background: #EF4135; 
                      color: white; 
                      border: none; 
                      padding: 12px 24px; 
                      border-radius: 25px; 
                      font-size: 1rem; 
                      cursor: pointer; 
                      transition: all 0.3s ease; 
                    }
                    button:hover { background: #d63384; transform: translateY(-2px); }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>🌐 Mode Hors Ligne</h1>
                    <p>Vous êtes actuellement hors ligne. Certaines fonctionnalités peuvent être limitées.</p>
                    <button onclick="window.location.reload()">Réessayer</button>
                  </div>
                </body>
                </html>`,
                {
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            });
          }
          
          throw error;
        });
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync tasks here
      fetch('https://www.data.gouv.fr/fr/datasets/r/4baea878-d5ff-4fb5-bcb9-3ce325c1c050')
        .then((response) => {
          if (response.ok) {
            return caches.open(CACHE_NAME).then((cache) => {
              return cache.put(
                'https://www.data.gouv.fr/fr/datasets/r/4baea878-d5ff-4fb5-bcb9-3ce325c1c050',
                response
              );
            });
          }
        })
        .catch((error) => {
          console.error('[ServiceWorker] Background sync failed:', error);
        })
    );
  }
});

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelles données AFD disponibles',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explorer',
        icon: '/favicon-32x32.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/favicon-32x32.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('AFD Dashboard', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Send a message back
  event.ports[0].postMessage({
    error: null,
    data: 'ServiceWorker received message'
  });
});