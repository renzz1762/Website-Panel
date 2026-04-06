/* ============================================================
   main.js — GrupIntro App Logic + Admin Panel
   ============================================================ */

/* ===== ADMIN OVERLAY TOGGLE — defined first ===== */
function openAdminOverlay() {
  document.getElementById('adminOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAdminOverlay() {
  document.getElementById('adminOverlay').classList.remove('open');
  document.body.style.overflow = '';
  if (document.getElementById('adm-panel').classList.contains('adm-show')) {
    admDoLogout();
  }
}

/* ===== UI STATE ===== */
var intros      = [];
var infos       = [];
var photoMode   = 'link';
var pickedSticker = '';
var memberLabel = 'MEMBER';
var daftarTab   = 'all';

/* ===== STICKER GRID ===== */
var STICKERS = ['😊','😎','🥳','🤩','😍','🫶','🙌','✨','🔥','💫','🌟','🎉','🐼','🦊','🐱','🐸','🌸','🍀','🎵','🎮','📚','✈️','🍜','🧋','💖','🦋','🌺','🍓'];
(function() {
  var grid = document.getElementById('stickerGrid');
  STICKERS.forEach(function(s) {
    var d = document.createElement('div');
    d.className = 'sticker-opt';
    d.textContent = s;
    d.onclick = function() { pickSticker(s, d); };
    grid.appendChild(d);
  });
})();

/* ===== PAGE NAVIGATION ===== */
function showPage(page) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-links button').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById(page).classList.add('active');
  document.getElementById('nav-' + page).classList.add('active');
  if (page === 'daftar') renderCards();
  if (page === 'info') renderInfoPage();
}

function setPhotoMode(mode) {
  photoMode = mode;
  ['link','stiker','none'].forEach(function(m) {
    document.getElementById('btn-' + m).classList.toggle('selected', m === mode);
    var area = document.getElementById('area-' + m);
    if (area) area.classList.toggle('show', m === mode);
  });
}

function pickMemberLabel(el) {
  memberLabel = el.dataset.mlbl;
  document.querySelectorAll('.mlabel-opt').forEach(function(d) { d.classList.remove('active'); });
  el.classList.add('active');
}

function pickGender(el) {
  document.querySelectorAll('.gender-opt').forEach(function(d) { d.classList.remove('active'); });
  el.classList.add('active');
  document.getElementById('gender').value = el.dataset.val;
}

function pickSticker(s, el) {
  pickedSticker = s;
  document.querySelectorAll('.sticker-opt').forEach(function(d) { d.classList.remove('picked'); });
  el.classList.add('picked');
}

/* ===== SUBMIT INTRO ===== */
function submitIntro() {
  var nama   = document.getElementById('nama').value.trim();
  var umur   = document.getElementById('umur').value.trim();
  var asal   = document.getElementById('asal').value.trim();
  var gender = document.getElementById('gender').value;
  var hobi   = document.getElementById('hobi').value.trim();

  // Security scan input
  if (window._secScanInput) {
    var fields = [nama, umur, asal, hobi];
    for (var i = 0; i < fields.length; i++) {
      if (!window._secScanInput(fields[i])) {
        alert('⚠️ Input mengandung karakter tidak valid!');
        return;
      }
    }
  }

  if (!nama || !umur || !asal || !gender || !hobi) {
    alert('⚠️ Lengkapi semua data diri dulu ya!'); return;
  }
  var visual = { type: 'none', value: '' };
  if (photoMode === 'link') {
    var link = document.getElementById('fotoLink').value.trim();
    if (link) visual = { type: 'link', value: link };
  } else if (photoMode === 'stiker') {
    if (!pickedSticker) { alert('Pilih stiker dulu ya! 😊'); return; }
    visual = { type: 'stiker', value: pickedSticker };
  }
  if (!window.fbSubmitIntro) { alert('⚠️ Database belum siap, tunggu sebentar ya!'); return; }
  window.fbSubmitIntro({ nama:nama, umur:umur, asal:asal, gender:gender, hobi:hobi, visual:visual, label:memberLabel });
}

/* ===== RESET FORM ===== */
function resetForm() {
  ['nama','umur','asal','hobi','fotoLink'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('gender').value = '';
  document.querySelectorAll('.gender-opt').forEach(function(d) { d.classList.remove('active'); });
  memberLabel = 'MEMBER';
  document.querySelectorAll('.mlabel-opt').forEach(function(d) { d.classList.remove('active'); });
  var def = document.querySelector('.mlabel-opt[data-mlbl="MEMBER"]');
  if (def) def.classList.add('active');
  pickedSticker = '';
  document.querySelectorAll('.sticker-opt').forEach(function(d) { d.classList.remove('picked'); });
  setPhotoMode('link');
}

function closePopup() { document.getElementById('successPopup').classList.remove('show'); }
function goToDaftar() { closePopup(); showPage('daftar'); }

function switchDaftarTab(tab, btn) {
  daftarTab = tab;
  window.daftarTab = tab;
  document.querySelectorAll('.dtab').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('daftar-all-content').style.display = tab === 'all' ? '' : 'none';
  document.getElementById('daftar-info-content').style.display = tab === 'info' ? '' : 'none';
  if (tab === 'info') renderInfoInDaftar();
}

/* ===== HELPERS ===== */
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ===== RENDER CARDS ===== */
function renderCards() {
  var grid  = document.getElementById('cardsGrid');
  var badge = document.getElementById('countBadge');
  if (badge) badge.textContent = intros.length + ' member';
  if (!intros.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-circle">🌸</div><div class="empty-title">Belum ada yang intro nih...</div><div class="empty-sub">Jadilah yang pertama! Isi form di halaman Home 💕</div></div>';
    return;
  }
  grid.innerHTML = '';
  intros.forEach(function(d, i) {
    var card = document.createElement('div');
    card.className = 'intro-card';
    card.style.animationDelay = (i * 0.07) + 's';
    var visualHTML = '';
    if (d.visual && d.visual.type === 'link' && d.visual.value)
      visualHTML = '<img class="card-photo" src="' + esc(d.visual.value) + '" alt="' + esc(d.nama) + '" onerror="this.style.display=\'none\'"/>';
    else if (d.visual && d.visual.type === 'stiker' && d.visual.value)
      visualHTML = '<div class="card-sticker">' + d.visual.value + '</div>';
    else
      visualHTML = '<div class="card-sticker">👤</div>';
    var gClass = d.gender === 'Laki-laki' ? 'gender-male' : d.gender === 'Perempuan' ? 'gender-female' : 'gender-other';
    var gIcon  = d.gender === 'Laki-laki' ? '♂' : d.gender === 'Perempuan' ? '♀' : '⚧';
    var l = d.label || 'MEMBER';
    var lMap = {OWNER:'👑',ADMIN:'🌸',MEMBER:'💙',ANOMALI:'🌀'};
    var cMap = {OWNER:'#ffd700',ADMIN:'#f06292',MEMBER:'#4dd0e1',ANOMALI:'#b06ef5'};
    card.innerHTML =
      '<div style="position:relative">' + visualHTML + '<div class="card-ribbon">' + esc(d.ts||'') + '</div></div>' +
      '<div class="card-body">' +
        '<div class="card-name">✨ ' + esc(d.nama) + '</div>' +
        '<div class="card-meta">' +
          '<span class="meta-pill">📍 ' + esc(d.asal) + '</span>' +
          '<span class="meta-pill">🎂 ' + esc(d.umur) + ' thn</span>' +
          '<span class="meta-pill ' + gClass + '">' + gIcon + ' ' + esc(d.gender) + '</span>' +
          '<span class="meta-pill" style="color:' + (cMap[l]||'#4dd0e1') + ';background:rgba(77,208,225,0.08);border-color:rgba(77,208,225,0.2);">' + (lMap[l]||'💙') + ' ' + l + '</span>' +
        '</div>' +
        '<div class="card-divider"></div>' +
        '<div class="card-hobi"><span class="hobi-label">🎯 Hobi</span>' + esc(d.hobi) + '</div>' +
        (d.adminComment ? '<div style="margin-top:10px;padding:8px 12px;background:rgba(240,98,146,0.07);border-radius:10px;border:1px solid rgba(240,98,146,0.15);font-size:0.78rem;color:var(--muted);"><span style="font-weight:800;color:var(--accent);">💬 Admin:</span> ' + esc(d.adminComment) + '</div>' : '') +
      '</div>';
    grid.appendChild(card);
  });
}

/* ===== RENDER INFO ===== */
function typeAccent(t) { return {urgent:'urgent',info:'info-type',event:'event',umum:''}[t]||''; }
function typeBadge(t) {
  var map = {
    umum:   '<span class="info-type-badge badge-umum">📌 Umum</span>',
    urgent: '<span class="info-type-badge badge-urgent">🚨 Urgent</span>',
    info:   '<span class="info-type-badge badge-info">ℹ️ Info</span>',
    event:  '<span class="info-type-badge badge-event">🎉 Event</span>'
  };
  return map[t] || map.umum;
}
function isNew(ts) {
  try { return (Date.now() - Number(ts)) < 3 * 24 * 60 * 60 * 1000; } catch(_) { return false; }
}
function buildInfoCards(list) {
  if (!list.length) return '<div class="info-empty"><div class="ie-icon">📭</div><p>Belum ada info dari admin nih...<br>Pantau terus ya! 💕</p></div>';
  return '<div class="info-list">' + list.map(function(item, i) {
    var hasPhoto = item.photoUrl && item.photoUrl.trim();
    var ts = item.createdAt && item.createdAt.seconds ? item.createdAt.seconds * 1000 : (item.createdAt || 0);
    var photoHTML = hasPhoto ?
      '<div class="info-card-photo-wrap"><img src="' + esc(item.photoUrl) + '" onerror="this.parentElement.style.display=\'none\'"/><div class="info-card-photo-overlay"></div><div class="info-card-photo-badge">' + typeBadge(item.type) + (isNew(ts) ? '<span class="new-badge">✨ BARU</span>' : '') + '</div></div>' : '';
    return '<div class="info-card" style="animation-delay:' + (i*0.07) + 's">' +
      '<div class="info-card-accent ' + typeAccent(item.type) + '"></div>' +
      '<div class="info-card-body">' +
        photoHTML +
        (!hasPhoto ? '<div class="info-card-top"><div class="info-card-badges">' + typeBadge(item.type) + (isNew(ts) ? '<span class="new-badge">✨ BARU</span>' : '') + '</div><span class="info-date">📅 ' + esc(item.date||'') + '</span></div>' : '<div style="text-align:right;margin-bottom:8px;"><span class="info-date">📅 ' + esc(item.date||'') + '</span></div>') +
        '<div class="info-card-title">' + esc(item.title) + '</div>' +
        '<div class="info-card-content">' + esc(item.content||'').replace(/\n/g,'<br>') + '</div>' +
        '<div class="info-card-footer"><span class="info-from">📝 Dari <span>' + esc(item.author||'Admin') + '</span></span></div>' +
      '</div></div>';
  }).join('') + '</div>';
}
function renderInfoPage() { document.getElementById('infoList').innerHTML = buildInfoCards(infos); }
function renderInfoInDaftar() { document.getElementById('daftar-info-content').innerHTML = buildInfoCards(infos); }


/* ============================================================
   ADMIN PANEL LOGIC
   ============================================================ */

/* ===== CREDENTIAL DECODER =====
   Password: 1125577@%27+#&)wj3
   Stored sebagai triple-encoded + XOR — tidak plain text
   ===== */
var _SEC_KEY = 'GI_SEC_2025';
var _ENC_U = 'fiIzMgsnB2F1Xl4VfR0HEBcndX1gURAfCQEpEG5nZmc=';
var _ENC_P = 'enQOA3wgMmYFdF4mBw0LEQZud1RkRRAd';

function _decodeCredential(enc) {
  try {
    // Base64 decode
    var step1 = atob(enc);
    // XOR decode
    var step2 = step1.split('').map(function(c, i) {
      return String.fromCharCode(c.charCodeAt(0) ^ _SEC_KEY.charCodeAt(i % _SEC_KEY.length));
    }).join('');
    // Reverse
    var step3 = step2.split('').reverse().join('');
    // Double base64 decode
    var step4 = atob(step3);
    return atob(step4);
  } catch(e) {
    return null;
  }
}

/* ===== ADMIN FIREBASE ===== */
var ADM_PROJECT = 'website-intro-ab3e7';
var ADM_API_KEY = 'AIzaSyABbV5Ap3YcGxT6UYE4BVgPlTU63EVYArA';
var ADM_BASE    = 'https://firestore.googleapis.com/v1/projects/' + ADM_PROJECT + '/databases/(default)/documents';
var admPollTimer       = null;
var admDeletedIntroIds = {};
var admDeletedInfoIds  = {};

function admToFSValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return { integerValue: String(val) };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'object') {
    var fields = {};
    Object.keys(val).forEach(function(k) { fields[k] = admToFSValue(val[k]); });
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(val) };
}
function admFromFSValue(v) {
  if (!v) return null;
  if ('stringValue'   in v) return v.stringValue;
  if ('integerValue'  in v) return Number(v.integerValue);
  if ('doubleValue'   in v) return v.doubleValue;
  if ('booleanValue'  in v) return v.booleanValue;
  if ('nullValue'     in v) return null;
  if ('timestampValue'in v) return v.timestampValue;
  if ('mapValue'      in v) {
    var obj = {};
    var f = v.mapValue.fields || {};
    Object.keys(f).forEach(function(k) { obj[k] = admFromFSValue(f[k]); });
    return obj;
  }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(admFromFSValue);
  return null;
}
function admDocToObj(doc) {
  var obj = { _id: doc.name.split('/').pop() };
  var fields = doc.fields || {};
  Object.keys(fields).forEach(function(k) { obj[k] = admFromFSValue(fields[k]); });
  return obj;
}
function admObjToFields(obj) {
  var fields = {};
  Object.keys(obj).forEach(function(k) {
    if (k === '_id') return;
    fields[k] = admToFSValue(obj[k]);
  });
  return fields;
}
function admFbGet(col) {
  // Pakai data realtime dari window yang sudah di-sync onSnapshot
  if (col === 'intros' && window.intros) return Promise.resolve(window.intros.slice());
  if (col === 'infos'  && window.infos)  return Promise.resolve(window.infos.slice());
  return Promise.resolve([]);
}
function admFbAdd(col, obj) {
  if (!window._fbAdminAdd) return Promise.reject(new Error('SDK belum siap'));
  return window._fbAdminAdd(col, obj);
}
function admFbUpdate(col, id, obj) {
  if (!window._fbAdminUpdate) return Promise.reject(new Error('SDK belum siap'));
  return window._fbAdminUpdate(col, id, obj);
}
function admFbDelete(col, id) {
  if (!window._fbAdminDelete) return Promise.reject(new Error('SDK belum siap'));
  return window._fbAdminDelete(col, id);
}

/* ===== ADM STATE ===== */
var admIntros          = [];
var admInfos           = [];
var admCurrentInfoType = 'umum';
var admActiveId        = null;
var admPickedLabel     = '';
var admCurrentFilter   = 'ALL';

/* ===== AUTH ===== */
function admDoLogin() {
  // Rate limit check
  if (window._secCheckLoginAttempt && !window._secCheckLoginAttempt()) {
    return;
  }
  var u = document.getElementById('adm-loginUser').value.trim();
  var p = document.getElementById('adm-loginPass').value.trim();
  var expectedU = _decodeCredential(_ENC_U);
  var expectedP = _decodeCredential(_ENC_P);
  if (u === expectedU && p === expectedP) {
    if (window._secResetLoginAttempts) window._secResetLoginAttempts();
    document.getElementById('adm-loginScreen').classList.add('adm-hidden');
    document.getElementById('adm-panel').classList.add('adm-show');
    admLoadData(); admUpdateStats(); admRenderTable(); admRenderInfoAdmin();
    admStartListeners();
  } else {
    var err = document.getElementById('adm-loginErr');
    err.style.display = 'block';
    setTimeout(function() { err.style.display = 'none'; }, 3000);
  }
}
function admDoLogout() {
  admStopListeners();
  admIntros = []; admInfos = [];
  document.getElementById('adm-panel').classList.remove('adm-show');
  document.getElementById('adm-loginScreen').classList.remove('adm-hidden');
  document.getElementById('adm-loginUser').value = '';
  document.getElementById('adm-loginPass').value = '';
}

function admStartListeners() {
  admLoadFromFirebase();
  admPollTimer = setInterval(admLoadFromFirebase, 5000);
}
function admStopListeners() {
  if (admPollTimer) { clearInterval(admPollTimer); admPollTimer = null; }
}
function admPausePoll(ms) {
  // Pause polling sementara supaya write tidak langsung di-overwrite
  admStopListeners();
  setTimeout(function() {
    if (document.getElementById('adm-panel').classList.contains('adm-show')) {
      admPollTimer = setInterval(admLoadFromFirebase, 5000);
    }
  }, ms || 3000);
}
function admLoadFromFirebase() {
  admFbGet('intros').then(function(docs) {
    docs = docs.filter(function(d) { return !admDeletedIntroIds[d._id]; });
    docs.sort(function(a,b) { var ta=a.createdAt||'';var tb=b.createdAt||''; return tb>ta?1:-1; });
    admIntros = docs; admSaveIntros(); admUpdateStats(); admRenderTable();
  }).catch(function() {
    try { admIntros = JSON.parse(localStorage.getItem('grupintro_intros')||'[]'); } catch(e){ admIntros=[]; }
    admUpdateStats(); admRenderTable();
  });
  admFbGet('infos').then(function(docs) {
    docs = docs.filter(function(d) { return !admDeletedInfoIds[d._id]; });
    docs.sort(function(a,b) { var ta=a.createdAt||'';var tb=b.createdAt||''; return tb>ta?1:-1; });
    admInfos = docs; admSaveInfos(); admUpdateStats(); admRenderInfoAdmin();
  }).catch(function() {
    try { admInfos = JSON.parse(localStorage.getItem('grupintro_infos')||'[]'); } catch(e){ admInfos=[]; }
    admUpdateStats(); admRenderInfoAdmin();
  });
}
function admLoadData() {
  try { admIntros = JSON.parse(localStorage.getItem('grupintro_intros')||'[]'); } catch(e){ admIntros=[]; }
  try { admInfos  = JSON.parse(localStorage.getItem('grupintro_infos') ||'[]'); } catch(e){ admInfos=[]; }
}
function admSaveIntros() { localStorage.setItem('grupintro_intros', JSON.stringify(admIntros)); }
function admSaveInfos()  { localStorage.setItem('grupintro_infos',  JSON.stringify(admInfos));  }

/* ===== STATS ===== */
function admUpdateStats() {
  document.getElementById('adm-statTotal').textContent   = admIntros.length;
  document.getElementById('adm-statOwner').textContent   = admIntros.filter(function(i){ return i.label==='OWNER'; }).length;
  document.getElementById('adm-statAdmin').textContent   = admIntros.filter(function(i){ return i.label==='ADMIN'; }).length;
  document.getElementById('adm-statMember').textContent  = admIntros.filter(function(i){ return i.label==='MEMBER'||!i.label; }).length;
  document.getElementById('adm-statAnomali').textContent = admIntros.filter(function(i){ return i.label==='ANOMALI'; }).length;
  document.getElementById('adm-statDev').textContent     = admIntros.filter(function(i){ return i.label==='DEV'; }).length;
  document.getElementById('adm-statInfo').textContent    = admInfos.length;
}

/* ===== FILTER & TABLE ===== */
function admSetFilter(f, btn) {
  admCurrentFilter = f;
  document.querySelectorAll('.adm-filter-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  admRenderTable();
}
function admEsc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function admRenderTable() {
  var q = (document.getElementById('adm-searchBox').value||'').toLowerCase();
  var rows = admIntros.filter(function(i) {
    var mf = admCurrentFilter==='ALL'||(i.label||'MEMBER')===admCurrentFilter;
    var ms = !q||(i.nama||'').toLowerCase().includes(q)||(i.asal||'').toLowerCase().includes(q);
    return mf && ms;
  });
  var tbody = document.getElementById('adm-tableBody');
  var empty = document.getElementById('adm-emptyAdmin');
  if (!rows.length) { tbody.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  tbody.innerHTML = rows.map(function(d,idx) {
    var lbl=d.label||'MEMBER';
    var lIcon={OWNER:'👑',ADMIN:'🌸',MEMBER:'💙',ANOMALI:'🌀',DEV:'⚙️'}[lbl]||'💙';
    var photoHTML='';
    if (d.visual&&d.visual.type==='link'&&d.visual.value)
      photoHTML='<img class="adm-photo-tiny" src="'+admEsc(d.visual.value)+'" onerror="this.style.display=\'none\'"/>';
    else if (d.visual&&d.visual.type==='stiker'&&d.visual.value)
      photoHTML='<span class="adm-sticker-tiny">'+d.visual.value+'</span>';
    else photoHTML='<span class="adm-sticker-tiny">👤</span>';
    var commentHTML=d.adminComment?'<span class="adm-comment-bubble">💬 '+admEsc(d.adminComment)+'</span>':'<span style="color:var(--admin-muted2);font-size:0.78rem;">—</span>';
    return '<tr>'+
      '<td style="color:var(--admin-muted2);font-size:0.78rem;">'+(idx+1)+'</td>'+
      '<td>'+photoHTML+'</td>'+
      '<td style="font-weight:800;">'+admEsc(d.nama)+'</td>'+
      '<td>'+admEsc(d.umur)+'</td>'+
      '<td>'+admEsc(d.asal)+'</td>'+
      '<td>'+admEsc(d.gender)+'</td>'+
      '<td><span class="adm-label-badge adm-label-'+lbl+'">'+lIcon+' '+lbl+'</span></td>'+
      '<td>'+commentHTML+'</td>'+
      '<td style="color:var(--admin-muted2);font-size:0.78rem;white-space:nowrap;">'+admEsc(d.ts||'')+'</td>'+
      '<td><div class="adm-actions-cell">'+
        '<button class="adm-act-btn adm-act-label" onclick="admOpenLabel(\''+d._id+'\')">🏷️</button>'+
        '<button class="adm-act-btn adm-act-comment" onclick="admOpenComment(\''+d._id+'\')">💬</button>'+
        '<button class="adm-act-btn adm-act-del" onclick="admOpenDelete(\''+d._id+'\')">🗑️</button>'+
      '</div></td>'+
    '</tr>';
  }).join('');
}

/* ===== MODALS ===== */
function admOpenComment(id) {
  admActiveId = id;
  var e=admIntros.find(function(i){return i._id===id;});
  document.getElementById('adm-modalCommentSub').textContent='Member: '+(e?e.nama:'');
  document.getElementById('adm-commentInput').value=e?(e.adminComment||''):'';
  document.getElementById('adm-modalComment').classList.add('show');
  setTimeout(function(){ document.getElementById('adm-commentInput').focus(); },100);
}
function admSaveComment() {
  if (!admActiveId) return;
  var val=document.getElementById('adm-commentInput').value.trim();
  var btn=document.getElementById('adm-commentConfirm');
  btn.disabled=true;
  admIntros=admIntros.map(function(i){return i._id===admActiveId?Object.assign({},i,{adminComment:val}):i;});
  admSaveIntros(); admRenderTable();
  admPausePoll(4000);
  admFbUpdate('intros',admActiveId,{adminComment:val})
    .then(function(){admShowToast('💬 Komentar disimpan!');admCloseModal('adm-modalComment');})
    .catch(function(){admShowToast('❌ Gagal simpan komentar!');admCloseModal('adm-modalComment');})
    .finally(function(){btn.disabled=false;});
}
function admOpenLabel(id) {
  admActiveId=id;
  var e=admIntros.find(function(i){return i._id===id;});
  document.getElementById('adm-modalLabelSub').textContent='Member: '+(e?e.nama:'');
  admPickedLabel=e?(e.label||'MEMBER'):'MEMBER';
  document.querySelectorAll('.adm-label-opt').forEach(function(el){el.classList.toggle('active',el.dataset.lbl===admPickedLabel);});
  document.getElementById('adm-modalLabel').classList.add('show');
}
function admSelectLabel(el) {
  admPickedLabel=el.dataset.lbl;
  document.querySelectorAll('.adm-label-opt').forEach(function(e){e.classList.remove('active');});
  el.classList.add('active');
}
function admSaveLabel() {
  if (!admActiveId) return;
  var btn=document.getElementById('adm-labelConfirm');
  btn.disabled=true;
  admIntros=admIntros.map(function(i){return i._id===admActiveId?Object.assign({},i,{label:admPickedLabel}):i;});
  admSaveIntros(); admUpdateStats(); admRenderTable();
  admPausePoll(4000);
  admFbUpdate('intros',admActiveId,{label:admPickedLabel})
    .then(function(){admShowToast('🏷️ Label diperbarui!');admCloseModal('adm-modalLabel');})
    .catch(function(){admShowToast('❌ Gagal update label!');admCloseModal('adm-modalLabel');})
    .finally(function(){btn.disabled=false;});
}
function admOpenDelete(id) {
  admActiveId=id;
  var e=admIntros.find(function(i){return i._id===id;});
  document.getElementById('adm-modalDeleteSub').textContent='Yakin hapus intro dari "'+(e?e.nama:'')+'\"? Ga bisa balik lagi ya!';
  document.getElementById('adm-modalDelete').classList.add('show');
}
function admConfirmDelete() {
  if (!admActiveId) return;
  var btn=document.getElementById('adm-deleteConfirm');
  btn.disabled=true; btn.textContent='⏳ Menghapus...';
  var deletedId=admActiveId;
  admDeletedIntroIds[deletedId]=true;
  admIntros=admIntros.filter(function(i){return i._id!==deletedId;});
  admSaveIntros(); admUpdateStats(); admRenderTable();
  admPausePoll(4000);
  admFbDelete('intros',deletedId)
    .then(function(){admShowToast('🗑️ Intro dihapus!');
    if (window._sendPushNotif) {
      window._sendPushNotif({ title:'🗑️ Intro Dihapus', body:'Satu intro berhasil dihapus.', tag:'admin-del-'+Date.now(), type:'admin' });
    }})
    .catch(function(){admShowToast('❌ Gagal hapus dari server!');})
    .finally(function(){btn.disabled=false;btn.textContent='🗑️ Hapus';admCloseModal('adm-modalDelete');});
}
function admCloseModal(id) {
  document.getElementById(id).classList.remove('show');
  admActiveId=null;
}

/* ===== INFO MANAGEMENT ===== */
function admPickInfoType(btn) {
  admCurrentInfoType=btn.dataset.itype;
  document.querySelectorAll('.adm-itype-btn').forEach(function(b){b.className='adm-itype-btn';});
  btn.classList.add('active-'+admCurrentInfoType);
}
function admAddInfo() {
  var title=document.getElementById('adm-infoTitle').value.trim();
  var content=document.getElementById('adm-infoContent').value.trim();
  var author=document.getElementById('adm-infoAuthor').value.trim()||'Admin';
  var photoUrl=document.getElementById('adm-infoPhoto').value.trim();
  if (!title||!content){admShowToast('⚠️ Judul dan isi wajib diisi!');return;}
  var addBtn=document.getElementById('adm-addInfoBtn');
  addBtn.disabled=true; addBtn.textContent='⏳ Mengirim...';
  var newInfo={type:admCurrentInfoType,title:title,content:content,author:author,photoUrl:photoUrl,date:new Date().toLocaleDateString('id-ID'),createdAt:new Date().toISOString()};
  admFbAdd('infos',newInfo).then(function(resp){
    var fid=resp.name?resp.name.split('/').pop():Date.now().toString();
    newInfo._id=fid;
    admInfos.unshift(newInfo); admSaveInfos(); admRenderInfoAdmin(); admUpdateStats();
    document.getElementById('adm-infoTitle').value='';
    document.getElementById('adm-infoContent').value='';
    document.getElementById('adm-infoPhoto').value='';
    admShowToast('📢 Info berhasil diposting!');
    // Push notif untuk admin sendiri
    if (window._sendPushNotif) {
      var icon2 = { umum:'📌', urgent:'🚨', info:'ℹ️', event:'🎉', dev:'⚙️' }[admCurrentInfoType] || '📢';
      window._sendPushNotif({
        title: icon2 + ' Info Diposting!',
        body: title.substring(0, 80),
        tag: 'admin-info-' + Date.now(),
        type: admCurrentInfoType
      });
    }
  }).catch(function(){
    newInfo._id=Date.now().toString();
    admInfos.unshift(newInfo); admSaveInfos(); admRenderInfoAdmin(); admUpdateStats();
    document.getElementById('adm-infoTitle').value='';
    document.getElementById('adm-infoContent').value='';
    document.getElementById('adm-infoPhoto').value='';
    admShowToast('📢 Tersimpan lokal (offline)');
  }).finally(function(){addBtn.disabled=false;addBtn.textContent='📢 Posting Info';});
}
function admDeleteInfo(id) {
  if (!confirm('Hapus info ini?')) return;
  admDeletedInfoIds[id]=true;
  admInfos=admInfos.filter(function(i){return i._id!==id;});
  admSaveInfos(); admRenderInfoAdmin(); admUpdateStats();
  admPausePoll(4000);
  admFbDelete('infos',id)
    .then(function(){admShowToast('🗑️ Info dihapus!');})
    .catch(function(){admShowToast('❌ Gagal hapus dari server!');});
}
function admRenderInfoAdmin() {
  var el=document.getElementById('adm-infoAdminList');
  if (!admInfos.length){el.innerHTML='<div class="adm-info-empty-admin">Belum ada info yang diposting.</div>';return;}
  var bm={
    umum:  '<span class="adm-iac-badge adm-iac-badge-umum">📌 Umum</span>',
    urgent:'<span class="adm-iac-badge adm-iac-badge-urgent">🚨 Urgent</span>',
    info:  '<span class="adm-iac-badge adm-iac-badge-info">ℹ️ Info</span>',
    event: '<span class="adm-iac-badge adm-iac-badge-event">🎉 Event</span>',
    dev:   '<span class="adm-iac-badge adm-iac-badge-dev">⚙️ Dev</span>'
  };
  el.innerHTML='<div class="adm-info-admin-list">'+admInfos.map(function(item){
    return '<div class="adm-info-admin-card adm-iac-'+item.type+'">'+
      '<div class="adm-iac-accent"></div>'+
      '<div class="adm-iac-body">'+
        '<div class="adm-iac-top"><div class="adm-iac-title">'+admEsc(item.title)+'</div>'+
        '<button class="adm-iac-del" onclick="admDeleteInfo(\''+item._id+'\')">🗑️ Hapus</button></div>'+
        (item.photoUrl?'<img src="'+admEsc(item.photoUrl)+'" style="width:100%;max-height:140px;object-fit:cover;border-radius:10px;margin-bottom:10px;border:1px solid rgba(240,98,146,0.2);" onerror="this.style.display=\'none\'"/>':'')+''+
        '<div class="adm-iac-content">'+admEsc(item.content||'').replace(/\n/g,'<br>')+'</div>'+
        '<div class="adm-iac-meta">'+(bm[item.type]||bm.umum)+'<span class="adm-iac-date">📅 '+admEsc(item.date||'')+' · ✍️ '+admEsc(item.author||'Admin')+'</span></div>'+
      '</div></div>';
  }).join('')+'</div>';
}

/* ===== TOAST ===== */
function admShowToast(msg) {
  var t=document.getElementById('adm-toast');
  t.textContent=msg; t.style.display='block';
  clearTimeout(t._timer);
  t._timer=setTimeout(function(){t.style.display='none';},2500);
}

/* ===== BIND EVENTS (after DOM ready) ===== */
document.addEventListener('DOMContentLoaded', function() {
  // Admin access button
  var adminBtn = document.getElementById('adminAccessBtn');
  if (adminBtn) adminBtn.addEventListener('click', openAdminOverlay);

  // Admin login
  document.getElementById('adm-loginBtn').addEventListener('click', admDoLogin);
  document.getElementById('adm-loginPass').addEventListener('keydown',function(e){if(e.key==='Enter')admDoLogin();});
  document.getElementById('adm-loginUser').addEventListener('keydown',function(e){if(e.key==='Enter')admDoLogin();});
  document.getElementById('adm-logoutBtn').addEventListener('click', admDoLogout);
  document.getElementById('adm-searchBox').addEventListener('input', admRenderTable);

  // Filters
  document.querySelectorAll('.adm-filter-btn').forEach(function(btn){
    btn.addEventListener('click',function(){admSetFilter(btn.dataset.admfilter,btn);});
  });
  document.querySelectorAll('.adm-itype-btn').forEach(function(btn){
    btn.addEventListener('click',function(){admPickInfoType(btn);});
  });

  // Info
  document.getElementById('adm-addInfoBtn').addEventListener('click', admAddInfo);

  // Modals
  document.getElementById('adm-commentCancel').addEventListener('click',function(){admCloseModal('adm-modalComment');});
  document.getElementById('adm-commentConfirm').addEventListener('click', admSaveComment);
  document.getElementById('adm-labelCancel').addEventListener('click',function(){admCloseModal('adm-modalLabel');});
  document.getElementById('adm-labelConfirm').addEventListener('click', admSaveLabel);
  document.getElementById('adm-deleteCancel').addEventListener('click',function(){admCloseModal('adm-modalDelete');});
  document.getElementById('adm-deleteConfirm').addEventListener('click', admConfirmDelete);
  document.querySelectorAll('.adm-label-opt').forEach(function(el){
    el.addEventListener('click',function(){admSelectLabel(el);});
  });
  document.querySelectorAll('.adm-modal-overlay').forEach(function(m){
    m.addEventListener('click',function(ev){if(ev.target===m)m.classList.remove('show');});
  });
});
