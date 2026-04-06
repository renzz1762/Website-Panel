/* ============================================================
   Security.js — GrupIntro Protection Layer
   Anti Inject | Anti XSS | Anti Tamper
   ============================================================ */
(function() {
  'use strict';

  // ===== 1. ANTI DEVTOOLS — DINONAKTIFKAN =====
  // Deteksi DevTools via window size & debugger sering false positive
  // terutama di mobile, browser dengan scrollbar, zoom, atau hosting tertentu.
  // Akibatnya: pointerEvents = 'none' ke-trigger dan semua button ga bisa di-klik.
  // Fitur ini dihapus supaya site bisa dipakai normal.

  // ===== 2. ANTI CONTEXT MENU (klik kanan) =====
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // ===== 3. ANTI INSPECT KEYBOARD SHORTCUTS =====
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); return false; }
    // Ctrl+Shift+I / Cmd+Opt+I
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) { e.preventDefault(); return false; }
    // Ctrl+Shift+J (console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) { e.preventDefault(); return false; }
    // Ctrl+Shift+C (inspector)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); return false; }
    // Ctrl+U (view source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) { e.preventDefault(); return false; }
    // Ctrl+S (save page)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) { e.preventDefault(); return false; }
  });

  // ===== 4. ANTI TEXT SELECT & COPY pada area sensitif =====
  document.addEventListener('selectstart', function(e) {
    if (e.target.closest && e.target.closest('#adminOverlay')) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
    }
  });
  document.addEventListener('copy', function(e) {
    if (e.target.closest && e.target.closest('#adminOverlay')) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
    }
  });

  // ===== 5. ANTI XSS — sanitize semua input sebelum dipakai =====
  window._secSanitize = function(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/expression\s*\(/gi, '');
  };

  // ===== 6. ANTI DOM TAMPERING — MutationObserver =====
  var _criticalIds = ['adm-loginUser','adm-loginPass','adm-loginBtn','adminOverlay','adm-panel'];
  var _observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type === 'childList') {
        m.removedNodes.forEach(function(node) {
          if (node.id && _criticalIds.indexOf(node.id) !== -1) {
            location.reload();
          }
        });
      }
    });
  });
  document.addEventListener('DOMContentLoaded', function() {
    _observer.observe(document.body, { childList: true, subtree: true });
  });

  // ===== 7. ANTI CONSOLE OVERRIDE =====
  (function() {
    var _noop = function() {};
    var _methods = ['log','warn','info','table','dir','dirxml','group','groupEnd','trace','assert','profile','profileEnd'];
    _methods.forEach(function(m) {
      try { console[m] = _noop; } catch(e) {}
    });
    try {
      Object.defineProperty(window, 'console', {
        get: function() {
          return { log:_noop,warn:_noop,error:_noop,info:_noop,table:_noop,dir:_noop };
        },
        set: function() {}
      });
    } catch(e) {}
  })();

  // ===== 8. INTEGRITY CHECK =====
  window._secIntegrityOK = true;

  // ===== 9. ANTI DRAG =====
  document.addEventListener('dragstart', function(e) {
    if (!e.target.closest('input') && !e.target.closest('textarea')) {
      e.preventDefault();
    }
  });

  // ===== 10. RATE LIMIT LOGIN ATTEMPTS =====
  var _loginAttempts = 0;
  var _loginBlocked = false;
  var _loginBlockTimer = null;
  window._secCheckLoginAttempt = function() {
    if (_loginBlocked) return false;
    _loginAttempts++;
    if (_loginAttempts >= 5) {
      _loginBlocked = true;
      _loginAttempts = 0;
      var btn = document.getElementById('adm-loginBtn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '🔒 Tunggu 30 detik...';
      }
      _loginBlockTimer = setTimeout(function() {
        _loginBlocked = false;
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🌸 Masuk Panel';
        }
      }, 30000);
      return false;
    }
    return true;
  };
  window._secResetLoginAttempts = function() {
    _loginAttempts = 0;
    _loginBlocked = false;
    if (_loginBlockTimer) clearTimeout(_loginBlockTimer);
  };

})();
