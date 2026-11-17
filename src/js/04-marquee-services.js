/* =========================================================
   04 · MARQUEE (scroll-velocity aware) + SERVICES COVERS
   ========================================================= */
function initMarquee() {
  const words = [['רוגע', 0], ['סבלנות', 1], ['אור טבעי', 0], ['חיוך', 1], ['התאמה אישית', 0], ['ירושלים', 1]];
  const icons = [ICON.camera, ICON.smile, ICON.sun, ICON.bars];
  const tracks = $$('.marquee__track');
  tracks.forEach((track) => {
    let set = '';
    words.forEach((w, i) => {
      set += '<span class="mq__item"><span class="mq__w' + (w[1] ? ' mq__w--b' : '') + '">' + w[0] + '</span>' +
        '<span class="mq__ic mq__ic--' + ((i % 4) + 1) + '">' + icons[i % 4] + '</span></span>';
    });
    track.innerHTML = set + set + set;
  });
  if (REDUCE) return;
  const state = tracks.map((t) => ({ el: t, dir: +t.dataset.dir || -1, x: 0, setW: 0 }));
  const measure = () => state.forEach((s) => { s.setW = s.el.scrollWidth / 3; s.x = s.dir > 0 ? 0 : s.setW * 0.5; });
  measure();
  addEventListener('resize', debounce(measure, 200));
  let visible = false;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe($('.marquee'));
  let lastY = scrollY, vel = 0;
  const tick = () => {
    if (!visible) return;
    const y = lenis ? lenis.scroll : scrollY;
    const dy = y - lastY; lastY = y;
    vel += (Math.max(-60, Math.min(60, dy)) - vel) * 0.12;
    const flip = vel < -0.4 ? -1 : 1;
    const speed = 0.7 + Math.min(Math.abs(vel), 40) * 0.32;
    state.forEach((s) => {
      if (!s.setW) return;
      s.x += s.dir * speed * flip;
      if (s.x >= s.setW) s.x -= s.setW;
      if (s.x < 0) s.x += s.setW;
      s.el.style.transform = 'translate3d(' + s.x.toFixed(2) + 'px,0,0)';
    });
  };
  if (HAS_GSAP) gsap.ticker.add(tick);
  else { const loop = () => { tick(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
}

/* the two framed photos beside every category come straight from that category's gallery */
function coversFor(cat) {
  const items = S.gallery.filter((g) => g.cat === cat);
  return items.filter((g) => g.cover).concat(items.filter((g) => !g.cover)).slice(0, 2);
}
function renderServices() {
  CAT_KEYS.forEach((cat) => {
    const covers = coversFor(cat);
    const n = S.gallery.filter((g) => g.cat === cat).length;
    $$('[data-cover="' + cat + '"]').forEach((ph) => {
      const it = covers[+ph.dataset.i];
      fillPh(ph, it, it ? (it.title || CATS[cat].full) : '', CATS[cat].full, 'התמונות יופיעו כאן מתוך הגלריה', 'gallery', cat);
      if (it) ph.setAttribute('data-cursor', 'צפייה'); else ph.removeAttribute('data-cursor');
    });
    $$('[data-count="' + cat + '"]').forEach((el) => { el.textContent = n ? '(' + n + ')' : ''; });
  });
}
function initServices() {
  on('gallery', renderServices);
  renderServices();
  $$('.cat [data-cover]').forEach((ph) => {
    ph.addEventListener('click', (e) => {
      if (e.target.closest('.admin-cta')) return;
      const cat = ph.dataset.cover;
      const list = S.gallery.filter((g) => g.cat === cat);
      if (!list.length) return;
      const at = Math.max(0, list.findIndex((g) => g.asset === ph.dataset.asset));
      openLB(list, at, ph);
    });
  });
}
