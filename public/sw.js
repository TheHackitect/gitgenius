// GitGenius Service Worker for Push Notifications

const CACHE_NAME = 'gitgenius-v1';
const OFFLINE_URL = '/offline.html';

// Cache static assets
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || data.message || 'You have a new notification',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-96.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || data.actionUrl || '/dashboard',
        notificationId: data.notificationId,
      },
      actions: data.actions || [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      tag: data.tag || 'gitgenius-notification',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      timestamp: data.timestamp || Date.now(),
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'GitGenius', options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
    
    // Fallback for text data
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('GitGenius', {
        body: text,
        icon: '/icon-192.png',
        badge: '/icon-96.png',
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  if (action === 'dismiss') {
    return;
  }

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (notificationData?.url) {
            client.navigate(notificationData.url);
          }
          return;
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(notificationData?.url || '/dashboard');
      }
    })
  );

  // Mark notification as read if we have an ID
  if (notificationData?.notificationId) {
    fetch(`/api/notifications/${notificationData.notificationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    }).catch(console.error);
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications?unreadOnly=true');
    const data = await response.json();
    
    if (data.notifications?.length > 0) {
      // Show badge with unread count
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(data.notifications.length);
      }
    }
  } catch (error) {
    console.error('Failed to sync notifications:', error);
  }
}

// Fetch event - network first, cache fallback  
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Return cached version
        return caches.match(event.request);
      })
  );
});
