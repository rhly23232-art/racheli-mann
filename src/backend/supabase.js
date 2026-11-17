/* =========================================================
   BACKEND · public site (Supabase: Postgres + Storage + Auth)
   Visitors read the gallery anonymously and can send a lead;
   only e-mails listed in the `admins` table may change anything.
   ========================================================= */
const SB_URL = '__SB_URL__';
const SB_KEY = '__SB_KEY__';
const SB_BUCKET = 'media';
const assetUrl = (p) => (!p ? '' : /^(https?:|data:|blob:)/.test(p) ? p : SB_URL + '/storage/v1/object/public/' + SB_BUCKET + '/' + p);

/* app objects <-> table rows */
const SB_MAP = {
  gallery: { order: 'ord' },
  reviews: { order: 'ord', text: 'body' },
  faq: { order: 'ord' }
};
const SB_FROM = {
  gallery: (r) => ({ id: r.id, cat: r.cat, asset: r.asset, thumb: r.thumb || '', w: r.w || 0, h: r.h || 0, title: r.title || '', cover: !!r.cover, order: r.ord }),
  reviews: (r) => ({ id: r.id, name: r.name || '', service: r.service || '', text: r.body || '', asset: r.asset || '', w: r.w || 0, h: r.h || 0, order: r.ord }),
  faq: (r) => ({ id: r.id, q: r.q || '', a: r.a || '', order: r.ord })
};
function sbRow(t, obj) {
  const m = SB_MAP[t] || {}, out = {};
  Object.keys(obj).forEach((k) => { if (k !== 'id' && k !== 'createdAt') out[m[k] || k] = obj[k]; });
  return out;
}
const sbCheck = (res) => { if (res && res.error) throw Object.assign({ code: res.error.code || 'db_error' }, res.error); return res; };

async function sbLoad(t) {
  const res = sbCheck(await S.sb.from(t).select('*').order('ord', { ascending: true }));
  const rows = (res.data || []).map(SB_FROM[t]);
  if (t === 'gallery') S.gallery = rows.filter((g) => g.asset && CATS[g.cat]);
  if (t === 'reviews') S.reviews = rows.filter((r) => r.text || r.asset);
  if (t === 'faq') S.faq = rows.filter((f) => f.q);
  emit(t);
}
async function sbLoadConfig() {
  const res = sbCheck(await S.sb.from('site_config').select('value').eq('key', 'main').maybeSingle());
  S.config = (res.data && res.data.value) || {};
  emit('config');
}

let sbLeadTimer = 0;
const API = {
  thumbs: true,
  ready: () => !!S.sb,
  canUpload: () => !!S.sb && S.isAdmin,
  putBlob: async (blob, type) => {
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/gif' ? 'gif' : 'jpg';
    const path = new Date().toISOString().slice(0, 7) + '/' + Date.now().toString(36) + '-' + uid8() + '.' + ext;
    const res = await S.sb.storage.from(SB_BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false });
    if (res.error) {
      const st = res.error.statusCode || res.error.status;
      throw { code: String(st) === '413' ? 'too_large' : String(st) === '403' ? 'not_granted' : 'upstream_error', message: res.error.message };
    }
    return path;
  },
  dropAsset: (p) => { if (p && !/^https?:/.test(p)) S.sb.storage.from(SB_BUCKET).remove([p]).catch(() => {}); },
  saveConfig: async (next) => {
    sbCheck(await S.sb.from('site_config').upsert({ key: 'main', value: next, updated_at: new Date().toISOString() }));
    S.config = next;
    emit('config');
  },
  add: async (t, data) => { sbCheck(await S.sb.from(t).insert(sbRow(t, data))); await sbLoad(t); },
  update: async (t, id, patch) => { sbCheck(await S.sb.from(t).update(sbRow(t, patch)).eq('id', id)); await sbLoad(t); },
  remove: async (t, id) => { sbCheck(await S.sb.from(t).delete().eq('id', id)); await sbLoad(t); },
  swap: async (t, a, b) => {
    const ao = typeof a.order === 'number' ? a.order : 0;
    const bo = typeof b.order === 'number' ? b.order : 0;
    sbCheck(await S.sb.from(t).update({ ord: bo }).eq('id', a.id));
    sbCheck(await S.sb.from(t).update({ ord: ao === bo ? ao + 1 : ao }).eq('id', b.id));
    await sbLoad(t);
  },
  addLead: async (lead) => {
    if (!S.sb) throw { code: 'no_db' };
    sbCheck(await S.sb.from('leads').insert({ name: lead.name, phone: lead.phone, service: lead.service || '', message: lead.message || '' }));
  },
  watchLeads: (cb) => {
    const pull = async () => {
      try {
        const res = sbCheck(await S.sb.from('leads').select('*').order('created_at', { ascending: false }).limit(500));
        cb((res.data || []).map((r) => ({ id: r.id, name: r.name, phone: r.phone, service: r.service, message: r.message, done: !!r.done, at: Date.parse(r.created_at) })));
      } catch (e) { console.warn('[db] leads', e); }
    };
    pull();
    clearInterval(sbLeadTimer);
    sbLeadTimer = setInterval(() => { if (!document.hidden) pull(); }, 60000);
    API.pullLeads = pull;
  },
  setLeadDone: async (l, done) => { sbCheck(await S.sb.from('leads').update({ done }).eq('id', l.id)); if (API.pullLeads) await API.pullLeads(); },
  removeLead: async (l) => { sbCheck(await S.sb.from('leads').delete().eq('id', l.id)); if (API.pullLeads) await API.pullLeads(); },
  usage: async () => null,
  signOut: async () => { try { await S.sb.auth.signOut(); } catch (e) { /* ignore */ } location.replace(location.pathname); }
};

/* ---------- admin sign-in (one-time link by e-mail) ---------- */
function loginHTML() {
  return '<div class="login__scrim" data-login-close></div>' +
    '<section class="login__card" role="dialog" aria-modal="true" aria-labelledby="login-t">' +
      '<button type="button" class="sqbtn login__x" data-login-close aria-label="סגירה">' + ICON.close + '</button>' +
      '<span class="login__logo"><span class="mark"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3 7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9Zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"/></svg><i></i><i></i><i></i></span></span>' +
      '<h2 id="login-t">כניסה לניהול האתר</h2>' +
      '<form class="login__f" id="login-f1" novalidate>' +
        '<p class="login__p">נשלח אליך מייל עם קישור כניסה חד-פעמי.</p>' +
        '<label class="ad-fld"><span>כתובת האימייל של המנהלת</span><input id="login-email" type="email" autocomplete="email" dir="ltr" required></label>' +
        '<button class="dbtn dbtn--solid" type="submit"><span class="dbtn__label">שליחת קישור כניסה</span><span class="dbtn__icon">' + ICON.arrow + '</span></button>' +
      '</form>' +
      '<div class="login__f" id="login-f2" hidden>' +
        '<p class="login__p">שלחנו מייל ל-<b id="login-to" dir="ltr"></b> עם קישור כניסה. פתחי את המייל ולחצי על הקישור, והאתר ייפתח כשאת מחוברת לניהול.</p>' +
        '<p class="login__p login__hint">המייל מגיע מ-Supabase, לפעמים אחרי דקה. אם הוא לא מופיע, כדאי לבדוק גם בתיקיית הספאם.</p>' +
        '<button type="button" class="tlink" id="login-back">שינוי כתובת או שליחה מחדש</button>' +
      '</div>' +
      '<p class="login__note" id="login-note" role="status" aria-live="polite"></p>' +
    '</section>';
}
function openLogin() {
  let box = $('#login');
  if (!box) {
    box = document.createElement('div');
    box.id = 'login';
    box.className = 'login';
    box.hidden = true;
    box.setAttribute('data-lenis-prevent', '');
    box.innerHTML = loginHTML();
    document.body.appendChild(box);
    const note = $('#login-note', box);
    const say = (t, bad) => { note.textContent = t; note.classList.toggle('is-bad', !!bad); };
    $$('[data-login-close]', box).forEach((b) => b.addEventListener('click', closeLogin));
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLogin(); trapFocus(box, e); });
    $('#login-f1', box).addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#login-email', box).value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('נא לכתוב כתובת אימייל תקינה.', true); return; }
      say('שולחים…');
      const res = await S.sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
      if (res.error) { say(res.error.status === 429 ? 'נשלחו יותר מדי מיילים בשעה האחרונה. נסי שוב מאוחר יותר.' : 'לא הצלחנו לשלוח את המייל. נסי שוב.', true); return; }
      $('#login-to', box).textContent = email;
      $('#login-f1', box).hidden = true;
      $('#login-f2', box).hidden = false;
      say('');
      $('#login-back', box).focus();
    });
    $('#login-back', box).addEventListener('click', () => { $('#login-f2', box).hidden = true; $('#login-f1', box).hidden = false; say(''); $('#login-email', box).focus(); });
  }
  box.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('is-open')));
  lockScroll(true);
  setTimeout(() => { const i = $('#login-email', box); if (i && !$('#login-f1', box).hidden) i.focus(); }, 60);
}
function closeLogin() {
  const box = $('#login');
  if (!box || box.hidden) return;
  box.classList.remove('is-open');
  lockScroll(false);
  setTimeout(() => { box.hidden = true; }, 400);
  if (location.hash === '#admin') history.replaceState(null, '', location.pathname);
}
let sbAdminChecked = '';
async function sbCheckAdmin(session) {
  const email = session && session.user ? session.user.email || '' : '';
  if (!email) { sbAdminChecked = ''; return; }
  if (sbAdminChecked === email) return;
  sbAdminChecked = email;
  let ok = false;
  try { const r = await S.sb.rpc('is_admin'); ok = r.data === true; } catch (e) { ok = false; }
  if (!ok) {
    toast('האימייל הזה לא מורשה לנהל את האתר', true);
    await S.sb.auth.signOut();
    sbAdminChecked = '';
    return;
  }
  closeLogin();
  if (!S.isAdmin) {
    S.isAdmin = true;
    document.documentElement.classList.add('is-admin');
    emit('admin');
    toast('נכנסת למצב ניהול');
  }
}

/* ---------- connect ---------- */
async function initData() {
  const foot = $('.foot__nav');
  if (foot && !$('#login-link')) foot.insertAdjacentHTML('beforeend', '<a href="#admin" id="login-link" class="foot__admin">כניסת מנהלת</a>');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#admin"]');
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    if (S.isAdmin) openAdmin(); else if (S.sb) openLogin();
  }, true);

  if (!window.supabase || SB_URL.indexOf('__') === 0) { S.dbState = 'none'; emit('state'); return; }
  S.sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
  S.dbState = 'loading';
  emit('state');
  try {
    await Promise.all([sbLoadConfig(), sbLoad('gallery'), sbLoad('reviews'), sbLoad('faq')]);
    S.dbState = 'live';
  } catch (e) { console.warn('[db]', e); S.dbState = 'offline'; }
  emit('state');

  S.sb.auth.onAuthStateChange((ev, session) => { setTimeout(() => sbCheckAdmin(session), 0); });
  let session = null;
  try { session = (await S.sb.auth.getSession()).data.session; } catch (e) { session = null; }
  await sbCheckAdmin(session);
  if (location.hash === '#admin') { if (S.isAdmin) openAdmin(); else openLogin(); }
}
