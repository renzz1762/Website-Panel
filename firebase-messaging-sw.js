/* ============================================================
   firebase-messaging-sw.js — GrupIntro Push Notification
   TARUH FILE INI DI ROOT FOLDER (sama level index.html)
   ============================================================ */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyABbV5Ap3YcGxT6UYE4BVgPlTU63EVYArA",
  authDomain: "website-intro-ab3e7.firebaseapp.com",
  projectId: "website-intro-ab3e7",
  storageBucket: "website-intro-ab3e7.firebasestorage.app",
  messagingSenderId: "1064015162632",
  appId: "1:1064015162632:web:3cf509802b21c195c690bd",
  measurementId: "G-2W8LKDJGLC"
});

var messaging = firebase.messaging();

// Background push - jalan saat browser/tab TERTUTUP
messaging.onBackgroundMessage(function(payload) {
  var notif = payload.notification || {};
  var data  = payload.data || {};
  var type  = data.type || 'info';
  var title = notif.title || data.title || '🌸 GrupIntro';
  var body  = notif.body  || data.body  || 'Ada update baru nih!';

  return self.registration.showNotification(title, {
    body: body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || ('gi-' + Date.now()),
    data: { url: data.url || '/', type: type },
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: type === 'urgent',
    actions: [
      { action: 'open',  title: '👀 Lihat' },
      { action: 'close', title: 'Tutup'    }
    ]
  });
});

// Klik notifikasi — buka / focus tab
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'close') return;
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cs) {
      for (var i = 0; i < cs.length; i++) {
        if ('focus' in cs[i]) { cs[i].focus(); cs[i].navigate(url); return; }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install',  function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(clients.claim()); });
