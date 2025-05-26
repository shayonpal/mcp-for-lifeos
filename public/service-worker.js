/**
 * LifeOS MCP Web Interface - Service Worker
 * Enables PWA functionality with offline capabilities
 */

const CACHE_NAME = 'lifeos-mcp-v1.0.0';
const OFFLINE_PAGE = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_FILES = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/manifest.json',
    // Icons will be added when created
    '/icons/favicon-16x16.png',
    '/icons/favicon-32x32.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                // Cache files that exist, skip missing ones
                return Promise.allSettled(
                    STATIC_CACHE_FILES.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`Failed to cache ${url}:`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('Service Worker: Installation complete');
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Installation failed', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activation complete');
                // Take control of all pages immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return cachedResponse;
                }

                // Fetch from network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Don't cache API calls or dynamic content
                        if (shouldCache(event.request)) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.log('Service Worker: Network request failed', error);
                        
                        // Return offline page for navigation requests
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html') || 
                                   new Response('Offline - Please check your connection', {
                                       status: 503,
                                       statusText: 'Service Unavailable',
                                       headers: new Headers({
                                           'Content-Type': 'text/html'
                                       })
                                   });
                        }
                        
                        // For other requests, just throw the error
                        throw error;
                    });
            })
    );
});

// Helper function to determine if a request should be cached
function shouldCache(request) {
    const url = new URL(request.url);
    
    // Cache static assets
    if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
        return true;
    }
    
    // Cache HTML pages (but not API endpoints)
    if (url.pathname.endsWith('.html') || url.pathname === '/') {
        return true;
    }
    
    // Don't cache API endpoints
    if (url.pathname.startsWith('/api/')) {
        return false;
    }
    
    return false;
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
    console.log('Service Worker: Received message', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            type: 'VERSION',
            version: CACHE_NAME
        });
    }
});

// Background sync for future enhancement
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Future: Sync offline actions when connection is restored
            Promise.resolve()
        );
    }
});

// Push notifications for future enhancement
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received');
    
    // Future: Handle push notifications
    const options = {
        body: event.data ? event.data.text() : 'New message from LifeOS MCP',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Message',
                icon: '/icons/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icons/icon-192x192.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('LifeOS MCP', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('Service Worker: Script loaded');