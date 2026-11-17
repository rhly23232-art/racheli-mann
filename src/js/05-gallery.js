/* =========================================================
   05 · GALLERY — tabs, fanned carousel, full grid view
   ========================================================= */
const G = { filter: 'all', cur: 0, cards: [], list: [], auto: 0, inView: false, hover: false, drag: null, suppressClick: false };

function gFiltered() { return G.filter === 'all' ? S.gallery : S.gallery.filter((g) => g.cat === G.filter); }

/* ---------- tabs (two groups share one filter) ---------- */
function positionInk(group) {
  const ink = $('.gtabs__ink', group);
  const on = $('[aria-selected="true"]', group);
  if (!ink || !on) return;
  ink.style.left = on.offsetLeft + 'px';
  ink.style.width = on.offsetWidth + 'px';
}
function setFilter(f) {
  if (!CATS[f] && f !== 'all') f = 'all';
  G.filter = f;
  $$('.gtabs').forEach((group) => {
    $$('[data-filter]', group).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.filter === f)));
    positionInk(group);
  });
  G.cur = 0;
  buildFan(true);
  if (!$('#gview').hidden) renderGrid();
  const sub = $('#gview-sub');
  if (sub) sub.textContent = '· ' + (f === 'all' ? 'כל התמונות' : CATS[f].full);
}
function renderCounts() {
  $$('[data-n]').forEach((el) => {
    const k = el.dataset.n;
    const n = k === 'all' ? S.gallery.length : S.gallery.filter((g) => g.cat === k).length;
    el.textContent = n ? String(n) : '';
  });
  $$('.gtabs').forEach(positionInk);
}

/* ---------- fan carousel ---------- */
function buildFan(animate) {
  const stage = $('#fan-stage');
  G.list = gFiltered();
  const real = G.list.length > 0;
  const src = real ? G.list : CAT_KEYS.concat(['newborn']).map((c) => ({ ph: true, cat: G.filter === 'all' ? c : G.filter }));
  stage.innerHTML = '';
  G.cards = src.map((it, i) => {
    const c = document.createElement('div');
    c.className = 'fan__card';
    c.dataset.i = i;
    const ph = document.createElement('div');
    ph.className = 'ph ph--t' + ((i % 3) + 1);
    if (it.ph) ph.innerHTML = emptyHTML('התמונות בדרך', CATS[it.cat] ? CATS[it.cat].full : '', i === 2 ? 'gallery' : '', G.filter !== 'all' ? G.filter : '');
    else ph.appendChild(makeImg(assetUrl(it.thumb || it.asset), it.title || CATS[it.cat].full, i < 3));
    c.appendChild(ph);
    c.insertAdjacentHTML('beforeend', '<span class="vf__c"></span>' + (CATS[it.cat] ? '<span class="fan__badge">' + CATS[it.cat].he + '</span>' : ''));
    c.addEventListener('click', (e) => {
      if (G.suppressClick || e.target.closest('.admin-cta')) return;
      if (i === G.cur) { if (real) openLB(G.list, i, c); }
      else { fanGo(i); restartAuto(); }
    });
    stage.appendChild(c);
    return c;
  });
  G.cur = Math.min(G.cur, G.cards.length - 1);
  if (G.cur < 0) G.cur = 0;
  if (!real) G.cur = 2;
  layoutFan();
  if (animate && MOTION) gsap.fromTo(stage, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity' });
  restartAuto();
}
function layoutFan(dragFrac) {
  const n = G.cards.length;
  if (!n) return;
  const w = G.cards[0].offsetWidth || 300;
  const small = innerWidth < 700;
  const step = w * (small ? 0.56 : 0.66);
  G.cards.forEach((c, i) => {
    let d = i - G.cur + (dragFrac || 0);
    if (n > 2) { if (d > n / 2) d -= n; if (d < -n / 2) d += n; }
    const ad = Math.abs(d);
    const x = -d * step * (1 - Math.min(ad, 3) * 0.07);
    const y = ad * ad * (small ? 6 : 12);
    const z = -ad * (small ? 120 : 170);
    const ry = d * 16;
    const rz = -d * 2.4;
    const op = ad > 2.6 ? Math.max(0, 1 - (ad - 2.6) * 2.5) : 1;
    c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg)';
    c.style.opacity = op.toFixed(3);
    c.style.zIndex = String(100 - Math.round(ad * 10));
    c.style.pointerEvents = op < 0.2 ? 'none' : '';
    const center = Math.round(d) === 0 && ad < 0.5;
    c.classList.toggle('is-center', center);
    if (center && G.list.length) c.setAttribute('data-cursor', 'הגדלה'); else c.removeAttribute('data-cursor');
  });
  const count = $('#fan-count');
  const cap = $('#fan-cap');
  if (G.list.length) {
    const it = G.list[G.cur];
    count.textContent = pad2(G.cur + 1) + ' / ' + pad2(G.list.length);
    cap.textContent = it ? (it.title || CATS[it.cat].full) : '';
  } else {
    count.textContent = '';
    cap.textContent = S.isAdmin ? 'הגלריה ריקה. העלו תמונות דרך „ניהול האתר".' : 'התמונות יעלו לכאן בקרוב';
  }
}
function fanGo(i) {
  const n = G.cards.length;
  if (!n) return;
  G.cur = ((i % n) + n) % n;
  layoutFan();
}
function restartAuto() {
  clearInterval(G.auto);
  if (REDUCE || G.list.length < 2) return;
  G.auto = setInterval(() => { if (G.inView && !G.hover && !document.hidden && !G.drag && $('#lb').hidden) fanGo(G.cur + 1); }, 4600);
}
function initFan() {
  const fan = $('#fan');
  $('#fan-next').addEventListener('click', () => { fanGo(G.cur + 1); restartAuto(); });
  $('#fan-prev').addEventListener('click', () => { fanGo(G.cur - 1); restartAuto(); });
  fan.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); fanGo(G.cur + 1); restartAuto(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); fanGo(G.cur - 1); restartAuto(); }
    else if ((e.key === 'Enter' || e.key === ' ') && G.list.length) { e.preventDefault(); openLB(G.list, G.cur, fan); }
  });
  fan.addEventListener('mouseenter', () => { G.hover = true; });
  fan.addEventListener('mouseleave', () => { G.hover = false; });
  new IntersectionObserver((e) => { G.inView = e[0].isIntersecting; }, { threshold: 0.3 }).observe(fan);

  /* drag / swipe — in RTL the next photo sits to the left, so dragging right brings it in */
  fan.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.admin-cta')) return;
    G.drag = { x: e.clientX, y: e.clientY, dx: 0, moved: false, id: e.pointerId };
  });
  fan.addEventListener('pointermove', (e) => {
    const d = G.drag;
    if (!d || d.id !== e.pointerId) return;
    d.dx = e.clientX - d.x;
    if (!d.moved && Math.abs(d.dx) > 8 && Math.abs(d.dx) > Math.abs(e.clientY - d.y)) {
      d.moved = true;
      fan.classList.add('is-dragging');
      try { fan.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    if (d.moved) {
      const w = (G.cards[0] && G.cards[0].offsetWidth) || 300;
      layoutFan(-Math.max(-1.2, Math.min(1.2, d.dx / (w * 0.9))));
    }
  });
  const end = (e) => {
    const d = G.drag;
    if (!d || d.id !== e.pointerId) return;
    G.drag = null;
    fan.classList.remove('is-dragging');
    if (d.moved) {
      G.suppressClick = true;
      setTimeout(() => { G.suppressClick = false; }, 60);
      const w = (G.cards[0] && G.cards[0].offsetWidth) || 300;
      const steps = Math.round(d.dx / (w * 0.9));
      if (steps !== 0) fanGo(G.cur + steps); else if (Math.abs(d.dx) > 45) fanGo(G.cur + (d.dx > 0 ? 1 : -1)); else layoutFan();
      restartAuto();
    }
  };
  fan.addEventListener('pointerup', end);
  fan.addEventListener('pointercancel', end);
  addEventListener('resize', debounce(() => { layoutFan(); $$('.gtabs').forEach(positionInk); }, 150));
}

/* ---------- full grid view ---------- */
function renderGrid() {
  const grid = $('#gview-grid');
  const list = gFiltered();
  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML = '<p class="gview__empty">' + (S.isAdmin ? 'עדיין אין כאן תמונות. אפשר להעלות דרך „ניהול האתר".' : 'התמונות של התחום הזה יעלו לכאן בקרוב.') + '</p>';
    return;
  }
  list.forEach((it, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gtile';
    b.style.aspectRatio = it.w && it.h ? it.w + ' / ' + it.h : '4 / 5';
    b.setAttribute('data-cursor', 'צפייה');
    b.setAttribute('aria-label', 'הגדלת התמונה' + (it.title ? ': ' + it.title : ''));
    b.appendChild(makeImg(assetUrl(it.thumb || it.asset), it.title || CATS[it.cat].full, i < 8));
    if (it.title) b.insertAdjacentHTML('beforeend', '<span class="gtile__cap">' + esc(it.title) + '</span>');
    b.addEventListener('click', () => openLB(list, i, b));
    grid.appendChild(b);
  });
}
function openGrid() {
  const gv = $('#gview');
  renderGrid();
  gv.hidden = false;
  gv.scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => { gv.classList.add('is-open'); positionInk($('.gtabs', gv)); }));
  lockScroll(true);
  setTimeout(() => $('#gview-close').focus(), 50);
}
function closeGrid() {
  const gv = $('#gview');
  if (gv.hidden) return;
  gv.classList.remove('is-open');
  lockScroll(false);
  setTimeout(() => { gv.hidden = true; }, 860);
  $('#open-grid').focus();
}
function initGallery() {
  $$('.gtabs').forEach((group) => {
    group.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (b) setFilter(b.dataset.filter);
    });
    group.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const tabs = $$('[data-filter]', group);
      const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const ni = (i + (e.key === 'ArrowLeft' ? 1 : -1) + tabs.length) % tabs.length;
      setFilter(tabs[ni].dataset.filter);
      tabs[ni].focus();
    });
  });
  initFan();
  $('#open-grid').addEventListener('click', openGrid);
  $('#gview-close').addEventListener('click', closeGrid);
  $('#gview').addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#lb').hidden) closeGrid();
    trapFocus($('#gview'), e);
  });
  on('gallery', () => { renderCounts(); buildFan(false); if (!$('#gview').hidden) renderGrid(); });
  on('admin', () => buildFan(false));
  renderCounts();
  buildFan(false);
  requestAnimationFrame(() => $$('.gtabs').forEach(positionInk));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => $$('.gtabs').forEach(positionInk));
}
