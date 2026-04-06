/* ============================================================
   notification.js — GrupIntro Notification System
   Push FCM + In-App Bell
   ============================================================ */

/* ============================================================
   CARA PAKAI:
   1. Taruh firebase-messaging-sw.js di root folder (sama level index.html)
   2. Tambahkan <script src="notification.js"></script> di index.html
      SETELAH firebase module script
   3. Di Firebase Console → Project Settings → Cloud Messaging
      → Generate VAPID key, paste ke VAPID_KEY di bawah
   ============================================================ */

(function() {
  'use strict';

  /* ===== CONFIG ===== */
  // Ganti ini dengan VAPID key dari Firebase Console
  // Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
  var VAPID_KEY = 'YOUR_VAPID_KEY_HERE';
  // Ganti jika VAPID sudah diisi
  var NOTIF_ENABLED = VAPID_KEY !== 'YOUR_VAPID_KEY_HERE';

  var NOTIF_STORAGE_KEY = 'gi_notifications';
  var NOTIF_PERM_KEY    = 'gi_notif_perm_asked';
  var FCM_TOKEN_KEY     = 'gi_fcm_token';
  var MAX_NOTIFS        = 50;

  /* ===== STATE ===== */
  var _notifs     = [];
  var _unreadCount = 0;
  var _panelOpen  = false;
  var _messaging  = null;

  /* ===== INIT ===== */
  window.initNotifications = function(messagingInstance) {
    _messaging = messagingInstance;
    _loadNotifs();
    _injectUI();
    _bindEvents();

    if (NOTIF_ENABLED && _messaging) {
      _initFCM();
    } else {
      // Mode tanpa FCM — tetap bisa notifikasi in-app
      console.log('[Notif] FCM disabled — in-app only mode');
    }
  };

  /* ===== FCM INIT ===== */
  function _initFCM() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(function(reg) {
        console.log('[Notif] SW registered');

        // Cek permission
        if (Notification.permission === 'granted') {
          _subscribeToken();
        } else if (Notification.permission !== 'denied') {
          // Tampil prompt minta izin setelah 3 detik
          setTimeout(_showPermissionBanner, 3000);
        }
      })
      .catch(function(err) {
        console.warn('[Notif] SW register failed:', err);
      });

    // Listen foreground messages
    if (_messaging && window.fbOnFCMMessage) {
      window.fbOnFCMMessage(function(payload) {
        _handleForegroundMessage(payload);
      });
    }
  }

  function _subscribeToken() {
    if (!_messaging || !NOTIF_ENABLED) return;
    window.fbGetFCMToken(VAPID_KEY)
      .then(function(token) {
        if (token) {
          localStorage.setItem(FCM_TOKEN_KEY, token);
          console.log('[Notif] FCM token:', token.substring(0, 20) + '...');
          // Simpan token ke Firestore biar admin bisa blast notif
          if (window._fbAdminAdd) {
            window._fbAdminAdd('fcm_tokens', {
              token: token,
              createdAt: new Date().toISOString(),
              ua: navigator.userAgent.substring(0, 80)
            }).catch(function(){});
          }
        }
      })
      .catch(function(err) { console.warn('[Notif] Token error:', err); });
  }

  /* ===== FOREGROUND MESSAGE HANDLER ===== */
  function _handleForegroundMessage(payload) {
    var notif = payload.notification || {};
    var data  = payload.data || {};
    _addNotif({
      id:    Date.now(),
      title: notif.title || data.title || '📢 Info Baru',
      body:  notif.body  || data.body  || '',
      type:  data.type || 'info',
      time:  Date.now(),
      read:  false,
      url:   data.url || null
    });
  }

  /* ===== PUBLIC: Add in-app notification ===== */
  window.notifAdd = function(title, body, type, url) {
    _addNotif({ id: Date.now(), title: title, body: body || '', type: type || 'info', time: Date.now(), read: false, url: url || null });
  };

  function _addNotif(notif) {
    _notifs.unshift(notif);
    if (_notifs.length > MAX_NOTIFS) _notifs = _notifs.slice(0, MAX_NOTIFS);
    _saveNotifs();
    _recountUnread();
    _updateBell();
    if (!_panelOpen) _showToastNotif(notif);
  }

  /* ===== STORAGE ===== */
  function _loadNotifs() {
    try { _notifs = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]'); } catch(_) { _notifs = []; }
    _recountUnread();
  }
  function _saveNotifs() {
    try { localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(_notifs)); } catch(_) {}
  }
  function _recountUnread() {
    _unreadCount = _notifs.filter(function(n) { return !n.read; }).length;
  }

  /* ===== PERMISSION BANNER ===== */
  function _showPermissionBanner() {
    if (localStorage.getItem(NOTIF_PERM_KEY)) return;
    if (Notification.permission !== 'default') return;

    var banner = document.createElement('div');
    banner.id = 'gi-notif-banner';
    banner.innerHTML =
      '<span class="gi-nb-icon">🔔</span>' +
      '<div class="gi-nb-text">' +
        '<strong>Aktifkan Notifikasi!</strong>' +
        '<span>Biar tau kalau ada intro baru & info dari admin 💕</span>' +
      '</div>' +
      '<button class="gi-nb-allow" id="gi-nb-allow">Izinkan</button>' +
      '<button class="gi-nb-deny" id="gi-nb-deny">Nanti</button>';
    document.body.appendChild(banner);
    setTimeout(function() { banner.classList.add('show'); }, 100);

    document.getElementById('gi-nb-allow').onclick = function() {
      localStorage.setItem(NOTIF_PERM_KEY, '1');
      Notification.requestPermission().then(function(perm) {
        if (perm === 'granted') _subscribeToken();
      });
      banner.classList.remove('show');
      setTimeout(function() { banner.remove(); }, 400);
    };
    document.getElementById('gi-nb-deny').onclick = function() {
      localStorage.setItem(NOTIF_PERM_KEY, '1');
      banner.classList.remove('show');
      setTimeout(function() { banner.remove(); }, 400);
    };
  }

  /* ===== INJECT UI ===== */
  function _injectUI() {
    // Bell button di nav
    var nav = document.querySelector('nav');
    if (nav) {
      var bellWrap = document.createElement('div');
      bellWrap.className = 'gi-bell-wrap';
      bellWrap.id = 'gi-bell-wrap';
      bellWrap.innerHTML =
        '<button class="gi-bell-btn" id="gi-bell-btn" title="Notifikasi">' +
          '<span class="gi-bell-icon">🔔</span>' +
          '<span class="gi-bell-badge" id="gi-bell-badge" style="display:none;">0</span>' +
        '</button>';
      nav.appendChild(bellWrap);
    }

    // Notification panel
    var panel = document.createElement('div');
    panel.id = 'gi-notif-panel';
    panel.className = 'gi-notif-panel';
    panel.innerHTML =
      '<div class="gi-np-header">' +
        '<div class="gi-np-title">🔔 Notifikasi</div>' +
        '<div class="gi-np-actions">' +
          '<button class="gi-np-markall" id="gi-np-markall">Tandai semua dibaca</button>' +
          '<button class="gi-np-close" id="gi-np-close">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="gi-np-list" id="gi-np-list"></div>';
    document.body.appendChild(panel);

    // Backdrop
    var backdrop = document.createElement('div');
    backdrop.id = 'gi-notif-backdrop';
    backdrop.className = 'gi-notif-backdrop';
    document.body.appendChild(backdrop);

    // CSS injection
    _injectCSS();
    _updateBell();
  }

  function _bindEvents() {
    document.getElementById('gi-bell-btn').onclick = _togglePanel;
    document.getElementById('gi-np-close').onclick = _closePanel;
    document.getElementById('gi-notif-backdrop').onclick = _closePanel;
    document.getElementById('gi-np-markall').onclick = _markAllRead;
  }

  /* ===== PANEL ===== */
  function _togglePanel() {
    _panelOpen ? _closePanel() : _openPanel();
  }
  function _openPanel() {
    _panelOpen = true;
    _renderPanel();
    document.getElementById('gi-notif-panel').classList.add('open');
    document.getElementById('gi-notif-backdrop').classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function _closePanel() {
    _panelOpen = false;
    document.getElementById('gi-notif-panel').classList.remove('open');
    document.getElementById('gi-notif-backdrop').classList.remove('show');
    document.body.style.overflow = '';
  }
  function _markAllRead() {
    _notifs.forEach(function(n) { n.read = true; });
    _saveNotifs();
    _recountUnread();
    _updateBell();
    _renderPanel();
  }

  /* ===== RENDER PANEL ===== */
  function _renderPanel() {
    var list = document.getElementById('gi-np-list');
    if (!_notifs.length) {
      list.innerHTML = '<div class="gi-np-empty"><span>🔕</span><p>Belum ada notifikasi</p></div>';
      return;
    }
    list.innerHTML = _notifs.map(function(n) {
      var icon = { intro:'💌', info:'📢', urgent:'🚨', event:'🎉', admin:'🌸' }[n.type] || '🔔';
      var colorClass = 'gi-nt-' + (n.type || 'info');
      var timeStr = _timeAgo(n.time);
      return '<div class="gi-notif-item ' + (n.read ? '' : 'unread') + ' ' + colorClass + '" data-nid="' + n.id + '">' +
        '<div class="gi-ni-icon">' + icon + '</div>' +
        '<div class="gi-ni-body">' +
          '<div class="gi-ni-title">' + _esc(n.title) + (n.read ? '' : '<span class="gi-ni-dot"></span>') + '</div>' +
          (n.body ? '<div class="gi-ni-msg">' + _esc(n.body) + '</div>' : '') +
          '<div class="gi-ni-time">' + timeStr + '</div>' +
        '</div>' +
        '<button class="gi-ni-del" data-nid="' + n.id + '" title="Hapus">✕</button>' +
      '</div>';
    }).join('');

    // Mark as read on click, delete on X
    list.querySelectorAll('.gi-notif-item').forEach(function(el) {
      el.addEventListener('click', function(ev) {
        if (ev.target.classList.contains('gi-ni-del')) return;
        var nid = Number(el.dataset.nid);
        var notif = _notifs.find(function(n) { return n.id === nid; });
        if (notif) {
          notif.read = true;
          _saveNotifs(); _recountUnread(); _updateBell(); _renderPanel();
          if (notif.url) { _closePanel(); location.href = notif.url; }
        }
      });
    });
    list.querySelectorAll('.gi-ni-del').forEach(function(btn) {
      btn.addEventListener('click', function(ev) {
        ev.stopPropagation();
        var nid = Number(btn.dataset.nid);
        _notifs = _notifs.filter(function(n) { return n.id !== nid; });
        _saveNotifs(); _recountUnread(); _updateBell(); _renderPanel();
      });
    });
  }

  /* ===== BELL UPDATE ===== */
  function _updateBell() {
    var badge = document.getElementById('gi-bell-badge');
    if (!badge) return;
    if (_unreadCount > 0) {
      badge.style.display = 'flex';
      badge.textContent = _unreadCount > 99 ? '99+' : _unreadCount;
      document.getElementById('gi-bell-btn').classList.add('has-notif');
    } else {
      badge.style.display = 'none';
      document.getElementById('gi-bell-btn').classList.remove('has-notif');
    }
  }

  /* ===== TOAST (foreground popup) ===== */
  function _showToastNotif(notif) {
    var existing = document.getElementById('gi-toast-notif');
    if (existing) existing.remove();

    var icon = { intro:'💌', info:'📢', urgent:'🚨', event:'🎉', admin:'🌸' }[notif.type] || '🔔';
    var toast = document.createElement('div');
    toast.id = 'gi-toast-notif';
    toast.className = 'gi-toast-notif gi-tn-' + (notif.type || 'info');
    toast.innerHTML =
      '<div class="gi-tn-icon">' + icon + '</div>' +
      '<div class="gi-tn-body">' +
        '<div class="gi-tn-title">' + _esc(notif.title) + '</div>' +
        (notif.body ? '<div class="gi-tn-msg">' + _esc(notif.body.substring(0, 80)) + (notif.body.length > 80 ? '...' : '') + '</div>' : '') +
      '</div>' +
      '<button class="gi-tn-close" id="gi-tn-close">✕</button>';
    document.body.appendChild(toast);

    setTimeout(function() { toast.classList.add('show'); }, 50);

    var timer = setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
    }, 5000);

    document.getElementById('gi-tn-close').onclick = function() {
      clearTimeout(timer);
      toast.classList.remove('show');
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
    };
    toast.onclick = function(ev) {
      if (ev.target.id === 'gi-tn-close') return;
      clearTimeout(timer);
      toast.classList.remove('show');
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
      _openPanel();
    };
  }

  /* ===== HELPERS ===== */
  function _esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _timeAgo(ms) {
    var diff = Date.now() - ms;
    if (diff < 60000) return 'Baru saja';
    if (diff < 3600000) return Math.floor(diff/60000) + ' menit lalu';
    if (diff < 86400000) return Math.floor(diff/3600000) + ' jam lalu';
    return Math.floor(diff/86400000) + ' hari lalu';
  }

  /* ===== CSS ===== */
  function _injectCSS() {
    var style = document.createElement('style');
    style.textContent = `
/* ===== NOTIFICATION BELL ===== */
.gi-bell-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.gi-bell-btn {
  position: relative;
  background: none;
  border: 1.5px solid rgba(240,98,146,0.25);
  border-radius: 50%;
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.22s;
  font-size: 1.1rem;
  background: rgba(255,255,255,0.35);
  backdrop-filter: blur(8px);
}
.gi-bell-btn:hover {
  background: rgba(240,98,146,0.12);
  border-color: var(--accent, #f06292);
  transform: scale(1.08);
}
.gi-bell-btn.has-notif {
  border-color: var(--accent, #f06292);
  box-shadow: 0 0 0 3px rgba(240,98,146,0.15);
  animation: bellRing 0.6s ease;
}
@keyframes bellRing {
  0%,100%{transform:rotate(0);}
  20%{transform:rotate(-15deg);}
  40%{transform:rotate(15deg);}
  60%{transform:rotate(-10deg);}
  80%{transform:rotate(10deg);}
}
.gi-bell-badge {
  position: absolute;
  top: -4px; right: -4px;
  min-width: 18px; height: 18px;
  background: linear-gradient(135deg, #f06292, #ec407a);
  color: #fff;
  border-radius: 100px;
  font-size: 0.6rem;
  font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  padding: 0 4px;
  border: 2px solid #fff0f5;
  box-shadow: 0 2px 6px rgba(236,64,122,0.4);
}

/* ===== NOTIFICATION PANEL ===== */
.gi-notif-panel {
  position: fixed;
  top: 0; right: -380px;
  width: 100%; max-width: 380px;
  height: 100vh;
  background: rgba(255,248,252,0.97);
  backdrop-filter: blur(24px);
  border-left: 1px solid rgba(240,98,146,0.2);
  box-shadow: -8px 0 40px rgba(240,98,146,0.12);
  z-index: 9999;
  display: flex; flex-direction: column;
  transition: right 0.3s cubic-bezier(0.34,1.1,0.64,1);
}
.gi-notif-panel.open { right: 0; }

.gi-notif-backdrop {
  position: fixed; inset: 0;
  background: rgba(255,220,235,0.35);
  backdrop-filter: blur(4px);
  z-index: 9998;
  display: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.gi-notif-backdrop.show { display: block; opacity: 1; }

.gi-np-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(240,98,146,0.15);
  background: rgba(255,255,255,0.6);
}
.gi-np-title { font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1rem; color: #5a2a3a; }
.gi-np-actions { display: flex; gap: 8px; align-items: center; }
.gi-np-markall {
  font-size: 0.72rem; font-weight: 700; color: #c2708a;
  background: none; border: none; cursor: pointer;
  padding: 4px 8px; border-radius: 8px;
  transition: all 0.18s;
}
.gi-np-markall:hover { background: rgba(240,98,146,0.08); color: #f06292; }
.gi-np-close {
  width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid rgba(240,98,146,0.2);
  background: none; cursor: pointer; color: #c2708a;
  font-size: 0.8rem; display: flex; align-items: center; justify-content: center;
  transition: all 0.18s;
}
.gi-np-close:hover { background: rgba(240,98,146,0.1); color: #f06292; }

.gi-np-list {
  flex: 1; overflow-y: auto;
  padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.gi-np-list::-webkit-scrollbar { width: 4px; }
.gi-np-list::-webkit-scrollbar-thumb { background: rgba(240,98,146,0.2); border-radius: 10px; }

.gi-np-empty { text-align: center; padding: 60px 20px; color: #c2708a; }
.gi-np-empty span { font-size: 2.5rem; display: block; margin-bottom: 10px; opacity: 0.5; }
.gi-np-empty p { font-size: 0.88rem; font-weight: 600; }

/* ===== NOTIFICATION ITEMS ===== */
.gi-notif-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(240,98,146,0.12);
  background: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.gi-notif-item:hover {
  background: rgba(255,255,255,0.95);
  border-color: rgba(240,98,146,0.3);
  transform: translateX(-2px);
  box-shadow: 4px 0 0 rgba(240,98,146,0.2);
}
.gi-notif-item.unread {
  background: rgba(255,240,248,0.9);
  border-color: rgba(240,98,146,0.25);
}
/* Type colors */
.gi-nt-intro.unread  { border-left: 3px solid #ec407a; }
.gi-nt-urgent.unread { border-left: 3px solid #f44336; }
.gi-nt-event.unread  { border-left: 3px solid #9c27b0; }
.gi-nt-admin.unread  { border-left: 3px solid #f06292; }
.gi-nt-info.unread   { border-left: 3px solid #42a5f5; }

.gi-ni-icon { font-size: 1.4rem; line-height: 1; flex-shrink: 0; margin-top: 2px; }
.gi-ni-body { flex: 1; min-width: 0; }
.gi-ni-title {
  font-size: 0.85rem; font-weight: 800; color: #5a2a3a;
  display: flex; align-items: center; gap: 6px;
  word-break: break-word;
}
.gi-ni-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #ec407a; flex-shrink: 0;
  box-shadow: 0 0 6px rgba(236,64,122,0.5);
}
.gi-ni-msg { font-size: 0.78rem; color: #c2708a; margin-top: 3px; line-height: 1.45; word-break: break-word; }
.gi-ni-time { font-size: 0.68rem; color: #e8a0b8; margin-top: 5px; font-weight: 700; }

.gi-ni-del {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
  border: none; background: none; cursor: pointer;
  color: #e8a0b8; font-size: 0.7rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.18s; opacity: 0;
}
.gi-notif-item:hover .gi-ni-del { opacity: 1; }
.gi-ni-del:hover { background: rgba(255,80,80,0.1); color: #f44336; }

/* ===== TOAST NOTIF (foreground) ===== */
.gi-toast-notif {
  position: fixed;
  top: 80px; right: 20px;
  max-width: 320px; width: calc(100vw - 40px);
  background: rgba(255,248,252,0.97);
  backdrop-filter: blur(20px);
  border: 1.5px solid rgba(240,98,146,0.3);
  border-radius: 18px;
  padding: 14px 16px;
  display: flex; align-items: flex-start; gap: 12px;
  z-index: 99999;
  box-shadow: 0 8px 32px rgba(240,98,146,0.18), 0 2px 8px rgba(0,0,0,0.08);
  transform: translateX(calc(100% + 30px));
  transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
  cursor: pointer;
}
.gi-toast-notif.show { transform: translateX(0); }
.gi-toast-notif::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  border-radius: 18px 18px 0 0;
  background: linear-gradient(90deg, #f06292, #ec407a, #ff80ab);
}
.gi-tn-urgent::before { background: linear-gradient(90deg, #f44336, #e53935); }
.gi-tn-intro::before  { background: linear-gradient(90deg, #ec407a, #f48fb1); }
.gi-tn-event::before  { background: linear-gradient(90deg, #9c27b0, #ce93d8); }
.gi-tn-icon { font-size: 1.5rem; flex-shrink: 0; }
.gi-tn-body { flex: 1; min-width: 0; }
.gi-tn-title { font-size: 0.85rem; font-weight: 900; color: #5a2a3a; margin-bottom: 2px; }
.gi-tn-msg   { font-size: 0.77rem; color: #c2708a; line-height: 1.4; }
.gi-tn-close {
  flex-shrink: 0; background: none; border: none;
  color: #e8a0b8; cursor: pointer; font-size: 0.8rem;
  padding: 2px; border-radius: 50%;
  transition: color 0.18s;
}
.gi-tn-close:hover { color: #f06292; }

/* ===== PERMISSION BANNER ===== */
#gi-notif-banner {
  position: fixed;
  bottom: -120px; left: 50%; transform: translateX(-50%);
  width: calc(100% - 32px); max-width: 480px;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(20px);
  border: 1.5px solid rgba(240,98,146,0.3);
  border-radius: 20px;
  padding: 16px 18px;
  display: flex; align-items: center; gap: 12px;
  z-index: 99998;
  box-shadow: 0 -4px 32px rgba(240,98,146,0.15);
  transition: bottom 0.4s cubic-bezier(0.34,1.2,0.64,1);
}
#gi-notif-banner.show { bottom: 20px; }
.gi-nb-icon { font-size: 1.6rem; flex-shrink: 0; }
.gi-nb-text { flex: 1; }
.gi-nb-text strong { display: block; font-size: 0.88rem; font-weight: 900; color: #5a2a3a; }
.gi-nb-text span { font-size: 0.75rem; color: #c2708a; }
.gi-nb-allow {
  padding: 8px 14px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #f06292, #ec407a);
  color: #fff; font-weight: 800; font-size: 0.78rem; cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 3px 12px rgba(236,64,122,0.3);
  transition: all 0.2s;
}
.gi-nb-allow:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(236,64,122,0.4); }
.gi-nb-deny {
  padding: 8px 12px; border-radius: 10px;
  border: 1px solid rgba(240,98,146,0.2);
  background: transparent; color: #c2708a;
  font-weight: 700; font-size: 0.78rem; cursor: pointer;
  white-space: nowrap; transition: all 0.18s;
}
.gi-nb-deny:hover { background: rgba(240,98,146,0.06); }

/* ===== RESPONSIVE ===== */
@media (max-width: 480px) {
  .gi-notif-panel { max-width: 100%; }
  .gi-toast-notif { top: 70px; right: 12px; width: calc(100vw - 24px); }
}
    `;
    document.head.appendChild(style);
  }

})();
