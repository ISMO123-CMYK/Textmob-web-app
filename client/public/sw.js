// Textmob Service Worker - Minimal PWA support
// This service worker is intentionally left without caching to ensure the latest app state is always loaded from the network.

const CACHE_NAME = 'textmob-v1';

self.addEventListener('install', (event) => {
    // Skip waiting to activate the latest service worker immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Take control of all pages immediately 
    event.waitUntil(self.clients.claim());
});

// A fetch listener is required for the app to be installable in some browsers.
// We use a simple pass-through to ensure the network is always used directly.
self.addEventListener('fetch', (event) => {
    // Bypass the service worker for live stream requests to ensure direct network handling
    if (event.request.url.includes('/api/live-stream/')) {
        return;
    }
    
    // If offline, this will naturally fail as there is no cache fallback, 
    // satisfying the requirement that the app should not load offline.
    event.respondWith(fetch(event.request));
});
