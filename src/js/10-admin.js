/* =========================================================
   10 · ADMIN — only for people who can edit the site
   gallery uploads, site photos, reviews, FAQ, leads inbox
   ========================================================= */
const AD = { built: false, tab: 'gallery', listCat: 'all', upCat: 'newborn', queue: [], running: false, editR: null, editF: null, leadsView: 'new', pendingG: false, rImg: null };

const fmtBytes = (b) => (b >= 1073741824 ? (b / 1073741824).toFixed(1) + 'GB' : b >= 1048576 ? (b / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB');
const waFor = (phone) => { let d = String(phone || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '972' + d.slice(1); return 'https://wa.me/' + d; };
const fmtDate = (t) => { try { return new Date(t).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

/* ---------- image pipeline: decode → resize → JPEG → upload ---------- */
function decodeViaImg(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => { res(i); setTimeout(() => URL.revokeObjectURL(u), 1000); };
    i.onerror = () => { URL.revokeObjectURL(u); rej({ code: 'decode' }); };
    i.src = u;
  });
}
async function prepImage(file, max) {
  const t = (file.type || '').toLowerCase();
  if (t === 'image/gif' || t === 'image/svg+xml') return { blob: file, w: 0, h: 0, type: t };
  if (t && !t.startsWith('image/')) throw { code: 'unsupported_type' };
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { src = await decodeViaImg(file); }
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
  if (!w0 || !h0) throw { code: 'decode' };
  const s = Math.min(1, (max || 2200) / Math.max(w0, h0));
  const w = Math.round(w0 * s), h = Math.round(h0 * s);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#ffffff';
  cx.fillRect(0, 0, w, h);
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(src, 0, 0, w, h);
  if (src.close) src.close();
  const blob = await new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej({ code: 'decode' })), 'image/jpeg', 0.86));
  return { blob, w, h, type: 'image/jpeg' };
}
async function uploadImage(file, max, withThumb) {
  if (!API.canUpload()) throw { code: 'not_granted' };
  const p = await prepImage(file, max);
  const asset = await API.putBlob(p.blob, p.type);
  let thumb = '';
  if (withThumb && API.thumbs && Math.max(p.w, p.h) > 1100) {
    try { const t = await prepImage(p.blob, 1000); thumb = await API.putBlob(t.blob, t.type); } catch (e) { thumb = ''; }
  }
  return { asset, thumb, w: p.w, h: p.h };
}
function upErr(e) {
  const c = e && e.code;
  return ({
    decode: 'לא הצלחנו לפתוח את התמונה. אם זו תמונת HEIC מאייפון, שמרו אותה כ-JPG ונסו שוב.',
    unsupported_type: 'סוג הקובץ לא נתמך. אפשר להעלות JPG, PNG או WEBP.',
    too_large: 'הקובץ גדול מדי. נסו תמונה קטנה יותר.',
    quota_or_state: 'נגמר נפח האחסון של האתר. מחקו תמונות שאינן בשימוש ונסו שוב.',
    rate_limited: 'יותר מדי העלאות ברצף. חכו רגע ונסו שוב.',
    not_granted: 'העלאה זמינה רק למי שיכול לערוך את האתר.',
    capability_disabled: 'העלאת קבצים לא זמינה בתצוגה הזו.',
    upstream_auth: 'צריך להתחבר מחדש. רעננו את העמוד ונסו שוב.',
    invalid_argument: 'אין הרשאה לשמור את השינוי.',
    quota_exceeded: 'מסד הנתונים מלא. מחקו פריטים ישנים ונסו שוב.'
  })[c] || 'משהו השתבש בשמירה. נסו שוב בעוד רגע.';
}
async function dbTry(fn, okMsg) {
  try { await fn(); if (okMsg) toast(okMsg); return true; }
  catch (e) { console.warn(e); toast(upErr(e), true); return false; }
}
async function saveConfig(patch) {
  await API.saveConfig(Object.assign({}, S.config, patch));
}
const swapOrder = (t, a, b) => API.swap(t, a, b);
function confirmBtn(btn, onYes) {
  if (btn.dataset.confirm === '1') { btn.disabled = true; onYes(); return; }
  btn.dataset.confirm = '1';
  const old = btn.innerHTML, oldL = btn.getAttribute('aria-label');
  btn.classList.add('is-confirm');
  btn.innerHTML = '<span>למחוק?</span>';
  btn.setAttribute('aria-label', 'לחצו שוב כדי לאשר מחיקה');
  setTimeout(() => {
    if (!btn.isConnected || btn.disabled) return;
    btn.dataset.confirm = '';
    btn.classList.remove('is-confirm');
    btn.innerHTML = old;
    btn.setAttribute('aria-label', oldL || 'מחיקה');
  }, 3600);
}
const dropAsset = (id) => { if (id) API.dropAsset(id); };

/* ---------- markup ---------- */
function adminHTML() {
  const catOpts = CAT_KEYS.map((k) => '<option value="' + k + '">' + CATS[k].full + '</option>').join('');
  const slot = (key, title, help) =>
    '<div class="ad-card"><h3 class="ad-h">' + title + '</h3><p class="ad-help">' + help + '</p>' +
    '<div class="ad-slot" data-slot-ad="' + key + '"><span class="ad-slot__img"></span><div class="ad-slot__btns">' +
    '<label class="dbtn dbtn--sm ad-filebtn"><input type="file" accept="image/*" class="sr-only" data-slot-file="' + key + '"><span class="dbtn__label">בחירת תמונה</span><span class="dbtn__icon">' + ICON.plus + '</span></label>' +
    '<button type="button" class="tlink ad-slot__rm" data-slot-rm="' + key + '">הסרת התמונה</button></div></div></div>';
  return '' +
  '<div class="admin__scrim" data-ad-close></div>' +
  '<section class="admin__panel" role="dialog" aria-modal="true" aria-labelledby="ad-title">' +
    '<header class="admin__head">' +
      '<div class="admin__ttl"><span class="admin__logo"><span class="mark"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3 7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9Zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"/></svg><i></i><i></i><i></i></span></span>' +
      '<div><h2 id="ad-title">ניהול האתר</h2><p class="admin__sub">כל שינוי נשמר מיד ומופיע לכל המבקרים</p></div></div>' +
      '<div class="admin__hbtns">' + (API.signOut ? '<button type="button" class="tlink admin__out" id="ad-out">יציאה מהחשבון</button>' : '') + '<button type="button" class="sqbtn admin__x" data-ad-close aria-label="סגירת הניהול">' + ICON.close + '</button></div>' +
    '</header>' +
    '<div class="admin__tabs" role="tablist" aria-label="אזורי ניהול">' +
      '<button type="button" role="tab" data-ad-tab="gallery" aria-selected="true">גלריה<span class="admin__n" data-ad-n="gallery"></span></button>' +
      '<button type="button" role="tab" data-ad-tab="media" aria-selected="false">תמונות באתר</button>' +
      '<button type="button" role="tab" data-ad-tab="reviews" aria-selected="false">המלצות<span class="admin__n" data-ad-n="reviews"></span></button>' +
      '<button type="button" role="tab" data-ad-tab="faq" aria-selected="false">שאלות<span class="admin__n" data-ad-n="faq"></span></button>' +
      '<button type="button" role="tab" data-ad-tab="leads" aria-selected="false">פניות<span class="admin__n admin__n--hot" data-ad-n="leads"></span></button>' +
    '</div>' +
    '<div class="admin__body">' +

      /* gallery */
      '<div class="admin__pane" data-ad-pane="gallery">' +
        '<div class="ad-card">' +
          '<h3 class="ad-h">העלאת תמונות לגלריה</h3>' +
          '<p class="ad-help">בוחרים תחום, ואז גוררים תמונות לתיבה או לוחצים עליה. אפשר הרבה תמונות בבת אחת, וכל תמונה מוקטנת אוטומטית לגודל שמתאים לאתר.</p>' +
          '<div class="ad-seg" role="radiogroup" aria-label="לאיזה תחום שייכות התמונות">' +
            CAT_KEYS.map((k) => '<label class="ad-seg__o"><input type="radio" name="ad-upcat" value="' + k + '"' + (k === AD.upCat ? ' checked' : '') + '><span>' + CATS[k].full + '</span></label>').join('') +
          '</div>' +
          '<label class="ad-drop" id="ad-drop"><input type="file" id="ad-file" accept="image/*" multiple class="sr-only">' +
            '<span class="ad-drop__ic">' + ICON.camera + '</span><b>גררו תמונות לכאן</b><span>או לחצו כדי לבחור מהמחשב או מהטלפון</span>' +
            '<em class="ad-drop__to">יעלו אל: <span id="ad-drop-to">' + CATS[AD.upCat].full + '</span></em></label>' +
          '<ul class="ad-queue" id="ad-queue" aria-live="polite"></ul>' +
        '</div>' +
        '<div class="ad-card">' +
          '<div class="ad-row"><h3 class="ad-h">התמונות בגלריה</h3><select class="ad-sel" id="ad-listcat" aria-label="איזה תחום להציג"><option value="all">כל התחומים</option>' + catOpts + '</select></div>' +
          '<p class="ad-help">הסדר כאן הוא הסדר באתר. כוכב מסמן תמונת שער, שתופיע ליד שם התחום בעמוד הבית.</p>' +
          '<ul class="ad-list" id="ad-glist"></ul>' +
        '</div>' +
      '</div>' +

      /* site photos */
      '<div class="admin__pane" data-ad-pane="media" hidden>' +
        '<div class="ad-card"><h3 class="ad-h">תמונות השער</h3><p class="ad-help">התמונות בראש העמוד. אם יש יותר מאחת, הן מתחלפות במצגת. מומלץ תמונות לאורך.</p>' +
          '<ul class="ad-list" id="ad-hero"></ul>' +
          '<label class="dbtn dbtn--sm ad-filebtn"><input type="file" accept="image/*" multiple class="sr-only" id="ad-hero-file"><span class="dbtn__label">הוספת תמונות שער</span><span class="dbtn__icon">' + ICON.plus + '</span></label>' +
          '<ul class="ad-queue" id="ad-hero-q" aria-live="polite"></ul></div>' +
        slot('studio', 'תמונת הסטודיו', 'מופיעה באזור „הסטודיו והלוקיישנים" על הרקע הכהה.') +
        slot('contact', 'תמונה ליצירת קשר', 'מופיעה ליד טופס יצירת הקשר בתחתית העמוד.') +
      '</div>' +

      /* reviews */
      '<div class="admin__pane" data-ad-pane="reviews" hidden>' +
        '<form class="ad-card ad-form" id="ad-rform" novalidate>' +
          '<h3 class="ad-h" id="ad-rform-t">הוספת המלצה</h3>' +
          '<div class="ad-fld"><label for="ad-r-name">שם, כפי שיופיע באתר</label><input id="ad-r-name" maxlength="60" placeholder="לדוגמה: משפחת לוי"></div>' +
          '<div class="ad-fld"><label for="ad-r-svc">סוג הצילום (לא חובה)</label><select id="ad-r-svc" class="ad-sel"><option value="">ללא</option>' + CAT_KEYS.map((k) => '<option>' + CATS[k].full + '</option>').join('') + '</select></div>' +
          '<div class="ad-fld"><label for="ad-r-text">טקסט ההמלצה</label><textarea id="ad-r-text" rows="4" maxlength="1500"></textarea></div>' +
          '<div class="ad-fld"><label for="ad-r-img">או צילום מסך של ההמלצה (לא חובה)</label><input type="file" id="ad-r-img" accept="image/*"><div class="ad-prev" id="ad-r-prev"></div></div>' +
          '<div class="ad-actions"><button class="dbtn dbtn--sm" type="submit" id="ad-r-save"><span class="dbtn__label">הוספה לאתר</span><span class="dbtn__icon">' + ICON.check + '</span></button><button type="button" class="tlink" id="ad-r-cancel" hidden>ביטול עריכה</button></div>' +
        '</form>' +
        '<div class="ad-card"><h3 class="ad-h">ההמלצות באתר</h3><ul class="ad-list" id="ad-rlist"></ul></div>' +
      '</div>' +

      /* faq */
      '<div class="admin__pane" data-ad-pane="faq" hidden>' +
        '<form class="ad-card ad-form" id="ad-fform" novalidate>' +
          '<h3 class="ad-h" id="ad-fform-t">הוספת שאלה</h3>' +
          '<div class="ad-fld"><label for="ad-f-q">השאלה</label><input id="ad-f-q" maxlength="200"></div>' +
          '<div class="ad-fld"><label for="ad-f-a">התשובה</label><textarea id="ad-f-a" rows="4" maxlength="2000"></textarea></div>' +
          '<div class="ad-actions"><button class="dbtn dbtn--sm" type="submit" id="ad-f-save"><span class="dbtn__label">הוספה לאתר</span><span class="dbtn__icon">' + ICON.check + '</span></button><button type="button" class="tlink" id="ad-f-cancel" hidden>ביטול עריכה</button></div>' +
        '</form>' +
        '<div class="ad-card"><h3 class="ad-h">השאלות באתר</h3><ul class="ad-list" id="ad-flist"></ul></div>' +
      '</div>' +

      /* leads */
      '<div class="admin__pane" data-ad-pane="leads" hidden>' +
        '<div class="ad-card">' +
          '<div class="ad-row"><h3 class="ad-h">פניות מהאתר</h3>' +
            '<div class="ad-seg ad-seg--sm" role="radiogroup" aria-label="אילו פניות להציג"><label class="ad-seg__o"><input type="radio" name="ad-lv" value="new" checked><span>חדשות</span></label><label class="ad-seg__o"><input type="radio" name="ad-lv" value="all"><span>הכל</span></label></div></div>' +
          '<p class="ad-help">כל פנייה שנשלחת מהטופס באתר נשמרת כאן. אחרי שחזרתם ללקוח, סמנו „טופל".</p>' +
          '<ul class="ad-leads" id="ad-leads"></ul>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<footer class="admin__foot"><span class="ad-state" id="ad-state"></span><span id="ad-usage"></span></footer>' +
  '</section>';
}

/* ---------- open / close / tabs ---------- */
function openAdmin(tab, cat) {
  if (!AD.built) return;
  const root = $('#admin');
  if (cat && CATS[cat]) setUpCat(cat);
  setAdTab(tab || AD.tab);
  if (root.hidden) {
    root.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
    lockScroll(true);
  }
  refreshUsage();
  setTimeout(() => $('.admin__x', root).focus(), 80);
}
function closeAdmin() {
  const root = $('#admin');
  if (root.hidden) return;
  root.classList.remove('is-open');
  lockScroll(false);
  setTimeout(() => { root.hidden = true; }, 620);
  $('#admin-fab').focus();
}
function setAdTab(t) {
  AD.tab = t;
  $$('[data-ad-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.adTab === t)));
  $$('[data-ad-pane]').forEach((p) => { p.hidden = p.dataset.adPane !== t; });
  const body = $('.admin__body');
  if (body) body.scrollTop = 0;
}
function setUpCat(cat) {
  AD.upCat = cat;
  $$('input[name="ad-upcat"]').forEach((r) => { r.checked = r.value === cat; });
  const to = $('#ad-drop-to');
  if (to) to.textContent = CATS[cat].full;
}
function updateAdState() {
  const el = $('#ad-state');
  if (!el) return;
  const m = { live: ['is-ok', 'מחובר למסד הנתונים'], loading: ['', 'מתחבר…'], slow: ['is-warn', 'החיבור איטי, ממתינים לנתונים…'], offline: ['is-bad', 'אין חיבור למסד הנתונים כרגע. שינויים לא יישמרו.'], none: ['is-bad', 'מסד הנתונים לא זמין בתצוגה הזו.'] }[S.dbState] || ['', ''];
  el.className = 'ad-state ' + m[0];
  el.textContent = m[1];
}
function refreshUsage() {
  API.usage().then((txt) => { const el = $('#ad-usage'); if (el) el.textContent = txt || ''; }).catch(() => {});
}
function updateCounts() {
  const set = (k, v) => $$('[data-ad-n="' + k + '"]').forEach((e) => { e.textContent = v ? String(v) : ''; });
  set('gallery', S.gallery.length);
  set('reviews', S.reviews.length);
  set('faq', S.faq.length);
  const fresh = S.leads.filter((l) => !l.done).length;
  set('leads', fresh);
  const badge = $('#admin-badge');
  badge.hidden = !fresh;
  badge.textContent = fresh;
}

/* ---------- gallery manager ---------- */
function renderQueue(ulId, jobs) {
  const ul = $('#' + ulId);
  if (!ul) return;
  ul.innerHTML = jobs.map((j) => {
    const st = { wait: ['', 'ממתין'], work: ['is-work', 'מעלה…'], ok: ['is-ok', 'נוסף'], err: ['is-err', j.msg || 'שגיאה'] }[j.state];
    return '<li class="ad-q ' + st[0] + '"><span class="ad-q__n">' + esc(j.file.name || 'תמונה') + '</span><span class="ad-q__s">' + esc(st[1]) + '</span></li>';
  }).join('');
}
function queueFiles(files, cat) {
  const arr = Array.from(files || []).filter((f) => f && f.size);
  if (!arr.length) return;
  if (!API.canUpload()) { toast(upErr({ code: 'not_granted' }), true); return; }
  arr.forEach((f) => AD.queue.push({ file: f, cat, state: 'wait' }));
  renderQueue('ad-queue', AD.queue);
  if (!AD.running) runQueue();
}
async function runQueue() {
  AD.running = true;
  let added = 0;
  for (;;) {
    const job = AD.queue.find((j) => j.state === 'wait');
    if (!job) break;
    job.state = 'work';
    renderQueue('ad-queue', AD.queue);
    try {
      const up = await uploadImage(job.file, 2200, true);
      await API.add('gallery', { cat: job.cat, asset: up.asset, thumb: up.thumb, w: up.w, h: up.h, title: '', cover: false, order: Date.now() });
      job.state = 'ok';
      added++;
    } catch (e) { console.warn(e); job.state = 'err'; job.msg = upErr(e); }
    renderQueue('ad-queue', AD.queue);
  }
  AD.running = false;
  if (added) toast(added === 1 ? 'התמונה נוספה לגלריה' : added + ' תמונות נוספו לגלריה');
  setTimeout(() => { AD.queue = AD.queue.filter((j) => j.state === 'err' || j.state === 'wait' || j.state === 'work'); renderQueue('ad-queue', AD.queue); }, 2600);
  refreshUsage();
}
function renderAdGallery() {
  const ul = $('#ad-glist');
  if (!ul) return;
  if (ul.contains(document.activeElement) && document.activeElement.matches('input,select')) { AD.pendingG = true; return; }
  AD.pendingG = false;
  const list = AD.listCat === 'all' ? S.gallery : S.gallery.filter((g) => g.cat === AD.listCat);
  if (!list.length) { ul.innerHTML = '<li class="ad-empty">אין עדיין תמונות' + (AD.listCat === 'all' ? '' : ' בתחום הזה') + '. העלו תמונות בתיבה למעלה.</li>'; return; }
  ul.innerHTML = '';
  list.forEach((g, i) => {
    const li = document.createElement('li');
    li.className = 'ad-item';
    li.innerHTML =
      '<span class="ad-thumb"><img src="' + assetUrl(g.thumb || g.asset) + '" alt="" loading="lazy"></span>' +
      '<div class="ad-item__b">' +
        '<input class="ad-in" value="' + esc(g.title || '') + '" placeholder="כיתוב לתמונה (לא חובה)" aria-label="כיתוב לתמונה" maxlength="90">' +
        '<div class="ad-item__r"><select class="ad-sel ad-sel--sm" aria-label="תחום התמונה">' + CAT_KEYS.map((k) => '<option value="' + k + '"' + (k === g.cat ? ' selected' : '') + '>' + CATS[k].full + '</option>').join('') + '</select>' +
        '<button type="button" class="ad-star" aria-pressed="' + (!!g.cover) + '" title="תמונת שער לתחום">' + ICON.star + '<span>שער</span></button></div>' +
      '</div>' +
      '<div class="ad-item__c">' +
        '<button type="button" class="ad-ib" data-act="up" aria-label="הזזה מוקדם יותר"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + '</button>' +
        '<button type="button" class="ad-ib" data-act="down" aria-label="הזזה מאוחר יותר"' + (i === list.length - 1 ? ' disabled' : '') + '>' + ICON.down + '</button>' +
        '<button type="button" class="ad-ib ad-ib--del" data-act="del" aria-label="מחיקת התמונה">' + ICON.trash + '</button>' +
      '</div>';
    const upd = (patch) => API.update('gallery', g.id, patch);
    const input = $('.ad-in', li);
    input.addEventListener('change', () => dbTry(() => upd({ title: input.value.trim() }), 'הכיתוב נשמר'));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
    $('select', li).addEventListener('change', (e) => dbTry(() => upd({ cat: e.target.value }), 'התחום עודכן'));
    $('.ad-star', li).addEventListener('click', () => dbTry(() => upd({ cover: !g.cover }), g.cover ? 'הוסר מתמונות השער' : 'סומן כתמונת שער'));
    $('[data-act="up"]', li).addEventListener('click', () => dbTry(() => swapOrder('gallery', g, list[i - 1])));
    $('[data-act="down"]', li).addEventListener('click', () => dbTry(() => swapOrder('gallery', g, list[i + 1])));
    const del = $('[data-act="del"]', li);
    del.addEventListener('click', () => confirmBtn(del, async () => { const ok = await dbTry(() => API.remove('gallery', g.id), 'התמונה נמחקה'); if (ok) { dropAsset(g.asset); dropAsset(g.thumb); refreshUsage(); } }));
    ul.appendChild(li);
  });
}

/* ---------- site photos ---------- */
function renderAdMedia() {
  const ul = $('#ad-hero');
  if (!ul) return;
  const hero = (Array.isArray(S.config.hero) ? S.config.hero : []).filter((h) => h && h.asset);
  ul.innerHTML = hero.length ? '' : '<li class="ad-empty">אין עדיין תמונות שער.</li>';
  hero.forEach((h, i) => {
    const li = document.createElement('li');
    li.className = 'ad-item ad-item--slim';
    li.innerHTML = '<span class="ad-thumb"><img src="' + assetUrl(h.asset) + '" alt="" loading="lazy"></span><div class="ad-item__b"><b>תמונה ' + (i + 1) + '</b>' + (i === 0 ? '<small>מוצגת ראשונה</small>' : '') + '</div>' +
      '<div class="ad-item__c"><button type="button" class="ad-ib" data-act="up" aria-label="הזזה מוקדם יותר"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + '</button>' +
      '<button type="button" class="ad-ib" data-act="down" aria-label="הזזה מאוחר יותר"' + (i === hero.length - 1 ? ' disabled' : '') + '>' + ICON.down + '</button>' +
      '<button type="button" class="ad-ib ad-ib--del" data-act="del" aria-label="מחיקת התמונה">' + ICON.trash + '</button></div>';
    const move = (to) => { const arr = hero.slice(); const [x] = arr.splice(i, 1); arr.splice(to, 0, x); return dbTry(() => saveConfig({ hero: arr })); };
    $('[data-act="up"]', li).addEventListener('click', () => move(i - 1));
    $('[data-act="down"]', li).addEventListener('click', () => move(i + 1));
    const del = $('[data-act="del"]', li);
    del.addEventListener('click', () => confirmBtn(del, async () => {
      const ok = await dbTry(() => saveConfig({ hero: hero.filter((_, k) => k !== i) }), 'התמונה הוסרה');
      if (ok) dropAsset(h.asset);
    }));
    ul.appendChild(li);
  });
  ['studio', 'contact'].forEach((k) => {
    const box = $('[data-slot-ad="' + k + '"]');
    if (!box) return;
    const v = S.config[k];
    $('.ad-slot__img', box).innerHTML = v && v.asset ? '<img src="' + assetUrl(v.asset) + '" alt="">' : '<span>אין תמונה</span>';
    $('.ad-slot__rm', box).hidden = !(v && v.asset);
  });
}
async function addHero(files) {
  const arr = Array.from(files || []).filter((f) => f && f.size);
  if (!arr.length) return;
  const jobs = arr.map((f) => ({ file: f, state: 'wait' }));
  renderQueue('ad-hero-q', jobs);
  for (const j of jobs) {
    j.state = 'work'; renderQueue('ad-hero-q', jobs);
    try {
      const up = await uploadImage(j.file, 2400);
      const hero = (Array.isArray(S.config.hero) ? S.config.hero : []).filter((h) => h && h.asset).slice();
      hero.push({ asset: up.asset, w: up.w, h: up.h });
      await saveConfig({ hero });
      j.state = 'ok';
    } catch (e) { j.state = 'err'; j.msg = upErr(e); }
    renderQueue('ad-hero-q', jobs);
  }
  setTimeout(() => renderQueue('ad-hero-q', jobs.filter((j) => j.state === 'err')), 2600);
  refreshUsage();
}
async function setSlot(key, file) {
  if (!file) return;
  toast('מעלה את התמונה…');
  try {
    const up = await uploadImage(file, 2200);
    const old = S.config[key];
    await saveConfig({ [key]: { asset: up.asset, w: up.w, h: up.h } });
    if (old && old.asset) dropAsset(old.asset);
    toast('התמונה עודכנה');
    refreshUsage();
  } catch (e) { toast(upErr(e), true); }
}

/* ---------- reviews ---------- */
function resetRForm() {
  AD.editR = null; AD.rImg = null;
  $('#ad-rform').reset();
  $('#ad-r-prev').innerHTML = '';
  $('#ad-rform-t').textContent = 'הוספת המלצה';
  $('#ad-r-save .dbtn__label').textContent = 'הוספה לאתר';
  $('#ad-r-cancel').hidden = true;
}
function renderAdReviews() {
  const ul = $('#ad-rlist');
  if (!ul) return;
  const list = S.reviews;
  ul.innerHTML = list.length ? '' : '<li class="ad-empty">אין עדיין המלצות. ההמלצה הראשונה שתוסיפו תפתח את אזור ההמלצות באתר.</li>';
  list.forEach((r, i) => {
    const li = document.createElement('li');
    li.className = 'ad-item';
    li.innerHTML = (r.asset ? '<span class="ad-thumb"><img src="' + assetUrl(r.asset) + '" alt="" loading="lazy"></span>' : '<span class="ad-thumb ad-thumb--q">”</span>') +
      '<div class="ad-item__b"><b>' + esc(r.name || 'ללא שם') + '</b><small>' + esc((r.text || 'צילום מסך').slice(0, 90)) + ((r.text || '').length > 90 ? '…' : '') + '</small></div>' +
      '<div class="ad-item__c"><button type="button" class="ad-ib" data-act="edit" aria-label="עריכה">' + ICON.edit + '</button>' +
      '<button type="button" class="ad-ib" data-act="up" aria-label="הזזה מוקדם יותר"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + '</button>' +
      '<button type="button" class="ad-ib" data-act="down" aria-label="הזזה מאוחר יותר"' + (i === list.length - 1 ? ' disabled' : '') + '>' + ICON.down + '</button>' +
      '<button type="button" class="ad-ib ad-ib--del" data-act="del" aria-label="מחיקת ההמלצה">' + ICON.trash + '</button></div>';
    $('[data-act="edit"]', li).addEventListener('click', () => {
      AD.editR = r; AD.rImg = null;
      $('#ad-r-name').value = r.name || '';
      $('#ad-r-svc').value = r.service || '';
      $('#ad-r-text').value = r.text || '';
      $('#ad-r-img').value = '';
      $('#ad-r-prev').innerHTML = r.asset ? '<img src="' + assetUrl(r.asset) + '" alt="">' : '';
      $('#ad-rform-t').textContent = 'עריכת המלצה';
      $('#ad-r-save .dbtn__label').textContent = 'שמירת השינויים';
      $('#ad-r-cancel').hidden = false;
      $('#ad-r-text').focus();
    });
    $('[data-act="up"]', li).addEventListener('click', () => dbTry(() => swapOrder('reviews', r, list[i - 1])));
    $('[data-act="down"]', li).addEventListener('click', () => dbTry(() => swapOrder('reviews', r, list[i + 1])));
    const del = $('[data-act="del"]', li);
    del.addEventListener('click', () => confirmBtn(del, async () => { const ok = await dbTry(() => API.remove('reviews', r.id), 'ההמלצה נמחקה'); if (ok) dropAsset(r.asset); if (AD.editR && AD.editR.id === r.id) resetRForm(); }));
    ul.appendChild(li);
  });
}
async function saveReview(e) {
  e.preventDefault();
  const name = $('#ad-r-name').value.trim();
  const service = $('#ad-r-svc').value;
  const text = $('#ad-r-text').value.trim();
  const file = AD.rImg;
  if (!text && !file && !(AD.editR && AD.editR.asset)) { toast('כתבו טקסט או בחרו צילום מסך', true); $('#ad-r-text').focus(); return; }
  const btn = $('#ad-r-save');
  btn.disabled = true;
  try {
    const data = { name, service, text };
    if (file) { const up = await uploadImage(file, 1600); Object.assign(data, { asset: up.asset, w: up.w, h: up.h }); }
    if (AD.editR) {
      const old = AD.editR;
      await API.update('reviews', old.id, data);
      if (file && old.asset) dropAsset(old.asset);
      toast('ההמלצה עודכנה');
    } else {
      await API.add('reviews', Object.assign({ asset: '', w: 0, h: 0, order: Date.now() }, data));
      toast('ההמלצה נוספה לאתר');
    }
    resetRForm();
  } catch (err) { toast(upErr(err), true); }
  finally { btn.disabled = false; }
}

/* ---------- FAQ ---------- */
function resetFForm() {
  AD.editF = null;
  $('#ad-fform').reset();
  $('#ad-fform-t').textContent = 'הוספת שאלה';
  $('#ad-f-save .dbtn__label').textContent = 'הוספה לאתר';
  $('#ad-f-cancel').hidden = true;
}
function renderAdFaq() {
  const ul = $('#ad-flist');
  if (!ul) return;
  const list = S.faq;
  ul.innerHTML = list.length ? '' : '<li class="ad-empty">אין עדיין שאלות. השאלה הראשונה תפתח את אזור השאלות באתר.</li>';
  list.forEach((f, i) => {
    const li = document.createElement('li');
    li.className = 'ad-item ad-item--slim';
    li.innerHTML = '<div class="ad-item__b"><b>' + esc(f.q) + '</b><small>' + esc((f.a || '').slice(0, 100)) + ((f.a || '').length > 100 ? '…' : '') + '</small></div>' +
      '<div class="ad-item__c"><button type="button" class="ad-ib" data-act="edit" aria-label="עריכה">' + ICON.edit + '</button>' +
      '<button type="button" class="ad-ib" data-act="up" aria-label="הזזה מוקדם יותר"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + '</button>' +
      '<button type="button" class="ad-ib" data-act="down" aria-label="הזזה מאוחר יותר"' + (i === list.length - 1 ? ' disabled' : '') + '>' + ICON.down + '</button>' +
      '<button type="button" class="ad-ib ad-ib--del" data-act="del" aria-label="מחיקת השאלה">' + ICON.trash + '</button></div>';
    $('[data-act="edit"]', li).addEventListener('click', () => {
      AD.editF = f;
      $('#ad-f-q').value = f.q || '';
      $('#ad-f-a').value = f.a || '';
      $('#ad-fform-t').textContent = 'עריכת שאלה';
      $('#ad-f-save .dbtn__label').textContent = 'שמירת השינויים';
      $('#ad-f-cancel').hidden = false;
      $('#ad-f-q').focus();
    });
    $('[data-act="up"]', li).addEventListener('click', () => dbTry(() => swapOrder('faq', f, list[i - 1])));
    $('[data-act="down"]', li).addEventListener('click', () => dbTry(() => swapOrder('faq', f, list[i + 1])));
    const del = $('[data-act="del"]', li);
    del.addEventListener('click', () => confirmBtn(del, () => { dbTry(() => API.remove('faq', f.id), 'השאלה נמחקה'); if (AD.editF && AD.editF.id === f.id) resetFForm(); }));
    ul.appendChild(li);
  });
}
async function saveFaq(e) {
  e.preventDefault();
  const q = $('#ad-f-q').value.trim();
  const a = $('#ad-f-a').value.trim();
  if (!q || !a) { toast('צריך גם שאלה וגם תשובה', true); (q ? $('#ad-f-a') : $('#ad-f-q')).focus(); return; }
  const btn = $('#ad-f-save');
  btn.disabled = true;
  const ok = AD.editF
    ? await dbTry(() => API.update('faq', AD.editF.id, { q, a }), 'השאלה עודכנה')
    : await dbTry(() => API.add('faq', { q, a, order: Date.now() }), 'השאלה נוספה לאתר');
  btn.disabled = false;
  if (ok) resetFForm();
}

/* ---------- leads inbox ---------- */
function subscribeLeads() {
  API.watchLeads((list) => { S.leads = list; renderLeads(); updateCounts(); });
}
function renderLeads() {
  const ul = $('#ad-leads');
  if (!ul) return;
  const list = AD.leadsView === 'new' ? S.leads.filter((l) => !l.done) : S.leads;
  if (!list.length) { ul.innerHTML = '<li class="ad-empty">' + (AD.leadsView === 'new' ? 'אין פניות חדשות. כל הכבוד!' : 'עדיין לא התקבלו פניות מהאתר.') + '</li>'; return; }
  ul.innerHTML = '';
  list.forEach((l) => {
    const li = document.createElement('li');
    li.className = 'ad-lead' + (l.done ? ' is-done' : '');
    li.innerHTML =
      '<div class="ad-lead__top"><b>' + esc(l.name) + '</b><span class="ad-lead__svc">' + esc(l.service || '') + '</span><time>' + esc(fmtDate(l.at)) + '</time></div>' +
      '<div class="ad-lead__ph"><span dir="ltr" class="ad-lead__num">' + esc(l.phone) + '</span>' +
        '<button type="button" class="ad-mini" data-act="copy">' + ICON.copy + 'העתקה</button>' +
        '<a class="ad-mini" href="' + waFor(l.phone) + '" target="_blank" rel="noopener">וואטסאפ</a></div>' +
      (l.message ? '<p class="ad-lead__msg">' + esc(l.message) + '</p>' : '') +
      '<div class="ad-lead__act"><button type="button" class="ad-chk" aria-pressed="' + (!!l.done) + '">' + ICON.check + (l.done ? 'טופל' : 'סימון כטופל') + '</button>' +
        '<button type="button" class="ad-ib ad-ib--del" data-act="del" aria-label="מחיקת הפנייה">' + ICON.trash + '</button></div>';
    $('[data-act="copy"]', li).addEventListener('click', () => copyText(l.phone, $('.ad-lead__num', li)));
    $('.ad-chk', li).addEventListener('click', () => dbTry(() => API.setLeadDone(l, !l.done), l.done ? 'הפנייה הוחזרה לחדשות' : 'סומן כטופל'));
    const del = $('[data-act="del"]', li);
    del.addEventListener('click', () => confirmBtn(del, () => dbTry(() => API.removeLead(l), 'הפנייה נמחקה')));
    ul.appendChild(li);
  });
}

/* ---------- build once the viewer turns out to be an editor ---------- */
function buildAdmin() {
  if (AD.built || !API.ready()) return;
  AD.built = true;
  const root = $('#admin');
  root.innerHTML = adminHTML();
  $('#admin-fab').hidden = false;

  $('#admin-fab').addEventListener('click', () => openAdmin());
  if ($('#ad-out')) $('#ad-out').addEventListener('click', () => API.signOut());
  $$('[data-ad-close]', root).forEach((b) => b.addEventListener('click', closeAdmin));
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAdmin(); trapFocus(root, e); });
  $$('[data-ad-tab]', root).forEach((b) => b.addEventListener('click', () => setAdTab(b.dataset.adTab)));

  /* uploads */
  $$('input[name="ad-upcat"]', root).forEach((r) => r.addEventListener('change', () => setUpCat(r.value)));
  const drop = $('#ad-drop');
  $('#ad-file').addEventListener('change', (e) => { queueFiles(e.target.files, AD.upCat); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => queueFiles(e.dataTransfer && e.dataTransfer.files, AD.upCat));
  $('#ad-listcat').addEventListener('change', (e) => { AD.listCat = e.target.value; renderAdGallery(); });
  $('#ad-glist').addEventListener('focusout', () => setTimeout(() => { if (AD.pendingG) renderAdGallery(); }, 0));

  /* site photos */
  $('#ad-hero-file').addEventListener('change', (e) => { addHero(e.target.files); e.target.value = ''; });
  $$('[data-slot-file]', root).forEach((inp) => inp.addEventListener('change', (e) => { setSlot(inp.dataset.slotFile, e.target.files[0]); e.target.value = ''; }));
  $$('[data-slot-rm]', root).forEach((b) => b.addEventListener('click', () => confirmBtn(b, async () => {
    const k = b.dataset.slotRm, old = S.config[k];
    const ok = await dbTry(() => saveConfig({ [k]: null }), 'התמונה הוסרה');
    if (ok && old && old.asset) dropAsset(old.asset);
    b.disabled = false;
  })));

  /* reviews + faq */
  $('#ad-r-img').addEventListener('change', (e) => {
    AD.rImg = e.target.files[0] || null;
    const prev = $('#ad-r-prev');
    prev.innerHTML = '';
    if (AD.rImg) { const u = URL.createObjectURL(AD.rImg); prev.innerHTML = '<img src="' + u + '" alt="">'; }
  });
  $('#ad-rform').addEventListener('submit', saveReview);
  $('#ad-r-cancel').addEventListener('click', resetRForm);
  $('#ad-fform').addEventListener('submit', saveFaq);
  $('#ad-f-cancel').addEventListener('click', resetFForm);

  /* leads */
  $$('input[name="ad-lv"]', root).forEach((r) => r.addEventListener('change', () => { AD.leadsView = r.value; renderLeads(); }));

  on('gallery', () => { renderAdGallery(); updateCounts(); });
  on('config', renderAdMedia);
  on('reviews', () => { renderAdReviews(); updateCounts(); });
  on('faq', () => { renderAdFaq(); updateCounts(); });
  on('state', updateAdState);
  renderAdGallery(); renderAdMedia(); renderAdReviews(); renderAdFaq(); renderLeads(); updateCounts(); updateAdState();
  subscribeLeads();
}
function initAdmin() {
  on('admin', buildAdmin);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-admin-open]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    openAdmin(b.getAttribute('data-admin-open'), b.getAttribute('data-admin-cat'));
  }, true);
}
