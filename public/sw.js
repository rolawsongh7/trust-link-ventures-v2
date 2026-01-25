const CACHE_NAME = 'trust-link-v2';
const OFFLINE_URL = '/';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.png',
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          // If cache miss and offline, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Trust Link Ventures';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    data: {
      ...data.data,
      link: data.link || data.data?.link || '/portal',
      notificationId: data.notificationId || Date.now().toString(),
    },
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - handle deep linking
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click');
  event.notification.close();

  // Get the deep link from notification data
  const link = event.notification.data?.link;
  const baseUrl = self.location.origin;
  
  // Construct full URL
  let urlToOpen = baseUrl;
  if (link) {
    if (link.startsWith('http')) {
      urlToOpen = link;
    } else if (link.startsWith('/')) {
      urlToOpen = baseUrl + link;
    } else {
      urlToOpen = baseUrl + '/' + link;
    }
  }

  console.log('[Service Worker] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if a window is already open with the same origin
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen);
          
          // If same origin, focus and navigate
          if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
            return client.focus().then((focusedClient) => {
              // Navigate to the deep link
              if ('navigate' in focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
              // Fallback: post message to navigate
              focusedClient.postMessage({
                type: 'NAVIGATE',
                url: urlToOpen,
              });
              return focusedClient;
            });
          }
        }
        
        // No existing window, open new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification.tag);
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
