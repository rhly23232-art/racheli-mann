/* =========================================================
   BACKEND · claude.ai artifact (db + assets + user capabilities)
   ========================================================= */
const assetUrl = (id) => (!id ? '' : /^(https?:|data:|blob:|\/)/.test(id) ? id : '/_blob/' + id);
async function claudeEditLead(l, fn) {
  const ref = S.db.doc('leads/' + l.doc);
  const snap = await ref.get();
  if (!snap.exists) return;
  let items = ((snap.data() || {}).items || []).map((x) => Object.assign({}, x));
  items = fn(items);
  if (items.length) await ref.update({ items }); else await ref.delete();
}
const API = {
  thumbs: false,
  ready: () => !!S.db,
  canUpload: () => !!S.assets,
  putBlob: async (blob, type) => {
    let r;
    try { r = await S.assets.upload(blob, { type }); }
    catch (e) { if (e && e.code === 'store_unavailable') { await sleep(1200); r = await S.assets.upload(blob, { type }); } else throw e; }
    return r.id;
  },
  dropAsset: (id) => { if (id && S.assets) S.assets.delete(id).catch(() => {}); },
  saveConfig: (next) => S.db.doc('site/config').set(next),
  add: (t, data) => S.db.collection(t).doc().set(Object.assign({ createdAt: Date.now() }, data)),
  update: (t, id, patch) => S.db.doc(t + '/' + id).update(patch),
  remove: (t, id) => S.db.doc(t + '/' + id).delete(),
  swap: async (t, a, b) => {
    const ao = typeof a.order === 'number' ? a.order : 0;
    const bo = typeof b.order === 'number' ? b.order : 0;
    await S.db.doc(t + '/' + a.id).update({ order: bo });
    await S.db.doc(t + '/' + b.id).update({ order: ao === bo ? ao + 1 : ao });
  },
  addLead: async (lead) => {
    if (!S.db || !S.uid) throw { code: 'no_db' };
    const ref = S.db.doc('leads/' + S.uid);
    let items = [];
    try { const snap = await ref.get(); if (snap.exists) items = (snap.data().items || []).map((x) => Object.assign({}, x)); } catch (e) { items = []; }
    items.push(Object.assign({ id: uid8(), at: Date.now(), done: false }, lead));
    await ref.set({ items: items.slice(-40), updatedAt: Date.now() });
  },
  watchLeads: (cb) => {
    S.db.collection('leads').orderBy('updatedAt', 'desc').onSnapshot((q) => {
      const all = [];
      q.docs.forEach((d) => { ((d.data() || {}).items || []).forEach((it) => all.push(Object.assign({ doc: d.id }, it))); });
      all.sort((a, b) => (b.at || 0) - (a.at || 0));
      cb(all);
    }, (e) => console.warn('[db] leads', e && e.code));
  },
  setLeadDone: (l, done) => claudeEditLead(l, (items) => items.map((x) => (x.id === l.id ? Object.assign(x, { done }) : x))),
  removeLead: (l) => claudeEditLead(l, (items) => items.filter((x) => x.id !== l.id)),
  usage: async () => {
    if (!S.assets) return null;
    const r = await S.assets.list();
    const u = r && r.usage;
    return u ? 'אחסון: ' + u.files + ' קבצים · ' + fmtBytes(u.bytes) + (u.maxBytes ? ' מתוך ' + fmtBytes(u.maxBytes) : '') : null;
  }
};

/* ---------- database connection ---------- */
async function initData() {
  const cl = window.claude;
  if (!cl || typeof cl.use !== 'function') { S.dbState = 'none'; emit('state'); return; }
  S.dbState = 'loading';
  let db = null, user = null;
  try { [db, user] = await Promise.all([cl.use('db'), cl.use('user')]); } catch (e) { /* stays null */ }
  S.db = db; S.user = user;
  if (!db) { S.dbState = 'none'; emit('state'); }
  else {
    const timer = setTimeout(() => { if (S.dbState === 'loading') { S.dbState = 'slow'; emit('state'); } }, 10000);
    const ok = () => { clearTimeout(timer); if (S.dbState !== 'live') { S.dbState = 'live'; emit('state'); } };
    const fail = (what) => (e) => { console.warn('[db] ' + what, e && e.code); clearTimeout(timer); S.dbState = 'offline'; emit('state'); };
    const rows = (q) => q.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    db.doc('site/config').onSnapshot((s) => { S.config = s.exists ? Object.assign({}, s.data()) : {}; if (!s.metadata.fromCache) ok(); emit('config'); }, fail('config'));
    db.collection('gallery').orderBy('order').onSnapshot((q) => { S.gallery = rows(q).filter((g) => g.asset && CATS[g.cat]); if (!q.metadata.fromCache) ok(); emit('gallery'); }, fail('gallery'));
    db.collection('reviews').orderBy('order').onSnapshot((q) => { S.reviews = rows(q).filter((r) => r.text || r.asset); emit('reviews'); }, fail('reviews'));
    db.collection('faq').orderBy('order').onSnapshot((q) => { S.faq = rows(q).filter((f) => f.q); emit('faq'); }, fail('faq'));
  }
  if (user) {
    try { S.uid = await user.id(); } catch (e) { S.uid = null; }
    let admin = false;
    try { admin = await user.canEdit(); } catch (e) { admin = false; }
    if (admin && db) {
      S.isAdmin = true;
      document.documentElement.classList.add('is-admin');
      try { S.assets = await cl.use('assets'); } catch (e) { S.assets = null; }
      emit('admin');
    }
  }
}
