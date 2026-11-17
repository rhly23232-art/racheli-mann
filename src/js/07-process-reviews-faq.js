/* =========================================================
   07 · PROCESS DECK + REVIEWS + FAQ
   ========================================================= */
function initProcess() {
  const stack = $('#pstack');
  if (!MOTION || !stack) return;
  stack.classList.add('pstack--deck');
  const cards = $$('.pcard', stack);
  const dots = $$('.process__dots li');
  const ANG = [0, -6.5, -13, -19.5];
  const lvl = (k) => ({ rotation: ANG[Math.min(k, ANG.length - 1)], opacity: 1 });
  cards.forEach((c, k) => { gsap.set(c, lvl(k)); gsap.set($('.pcard__in', c), { opacity: k ? 0 : 1 }); });
  gsap.from(stack, { scale: 0.86, opacity: 0, duration: 1.1, ease: 'power4.out', clearProps: 'scale,opacity', scrollTrigger: { trigger: stack, start: 'top 85%', once: true } });
  const setDot = (k) => dots.forEach((d, i) => d.classList.toggle('is-on', i === k));
  const mobile = isMobile();
  const STEP = mobile ? 420 : 600;
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: stack, start: mobile ? 'center 58%' : 'center 52%', end: '+=' + (cards.length - 1) * STEP,
      pin: '#process', scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (self) => setDot(Math.min(cards.length - 1, Math.round(self.progress * (cards.length - 1))))
    }
  });
  cards.forEach((card, i) => {
    if (i === cards.length - 1) return;
    tl.to(card, { rotation: -26, x: () => -(mobile ? innerWidth * 0.95 : Math.min(innerWidth * 0.45, 680)), y: -110, opacity: 0, duration: 1, ease: 'power2.in' }, i)
      .to($('.pcard__in', card), { opacity: 0, duration: 0.3, ease: 'none' }, i);
    cards.forEach((c2, j) => { if (j > i) tl.to(c2, Object.assign({ duration: 1, ease: 'power2.inOut' }, lvl(j - i - 1)), i); });
    tl.to($('.pcard__in', cards[i + 1]), { opacity: 1, duration: 0.5, ease: 'power2.out' }, i + 0.5);
  });
}

/* ---------- reviews ---------- */
const RV = { shown: 6 };
function renderReviews() {
  const sec = $('#reviews');
  const grid = $('#reviews-grid');
  const list = S.reviews;
  const visible = list.length > 0 || S.isAdmin;
  sec.hidden = !visible;
  $$('[data-needs="reviews"]').forEach((a) => { a.hidden = !list.length; });
  if (!visible) { refreshST(); return; }
  if (!sec.dataset.rv) { sec.dataset.rv = '1'; observeRv($('.reviews__head', sec)); }
  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML = '<p class="reviews__empty">עדיין אין המלצות. אפשר להוסיף המלצה כתובה או צילום מסך של הודעה, והן יופיעו כאן לכל המבקרים.</p>';
  }
  list.slice(0, RV.shown).forEach((r, i) => {
    const card = document.createElement(r.asset ? 'button' : 'article');
    card.className = 'rcard' + (r.asset ? ' rcard--img' : '');
    const by = (r.name || r.service) ? '<div class="rcard__by">' + (r.name ? '<span class="rcard__name">' + esc(r.name) + '</span>' : '') + (r.service ? '<span class="rcard__svc">' + esc(r.service) + '</span>' : '') + '</div>' : '';
    if (r.asset) {
      card.type = 'button';
      card.setAttribute('aria-label', 'הגדלת ההמלצה' + (r.name ? ' של ' + r.name : ''));
      card.setAttribute('data-cursor', 'צפייה');
      const img = makeImg(assetUrl(r.asset), 'המלצה' + (r.name ? ' מ' + r.name : ''));
      if (r.w && r.h) img.style.aspectRatio = r.w + ' / ' + r.h;
      img.addEventListener('load', refreshST, { once: true });
      card.appendChild(img);
      card.insertAdjacentHTML('beforeend', (r.text ? '<p class="rcard__t" style="margin-top:12px;font-size:15.5px">' + esc(r.text) + '</p>' : '') + by);
      card.addEventListener('click', () => {
        const imgs = S.reviews.filter((x) => x.asset).map((x) => ({ asset: x.asset, title: x.name || '', badge: 'המלצה' }));
        openLB(imgs, imgs.findIndex((x) => x.asset === r.asset), card);
      });
    } else {
      card.innerHTML = '<span class="rcard__q" aria-hidden="true">”</span><p class="rcard__t">' + esc(r.text) + '</p>' + by;
    }
    grid.appendChild(card);
    observeRv(card, (i % 3) * 90);
  });
  const more = $('#reviews-more');
  more.hidden = list.length <= RV.shown;
  refreshST();
}
function initReviews() {
  $('#reviews-more').addEventListener('click', () => { RV.shown += 6; renderReviews(); });
  on('reviews', renderReviews);
  on('admin', renderReviews);
}

/* ---------- FAQ ---------- */
function renderFaq() {
  const sec = $('#faq');
  const box = $('#faq-list');
  const list = S.faq;
  sec.hidden = !(list.length || S.isAdmin);
  if (sec.hidden) { refreshST(); return; }
  if (!sec.dataset.rv) { sec.dataset.rv = '1'; observeRv($('.faq__title', sec)); }
  const openIds = $$('.qa.is-open', box).map((q) => q.dataset.id);
  box.innerHTML = '';
  if (!list.length) box.innerHTML = '<p class="reviews__empty">עדיין אין שאלות. הוסיפו שאלות ותשובות שחוזרות על עצמן, והן יופיעו כאן כרשימה נפתחת.</p>';
  list.forEach((f, i) => {
    const qa = document.createElement('div');
    qa.className = 'qa' + (openIds.includes(f.id) ? ' is-open' : '');
    qa.dataset.id = f.id;
    const aid = 'qa-a-' + f.id;
    qa.innerHTML = '<button type="button" class="qa__q" aria-expanded="' + (openIds.includes(f.id)) + '" aria-controls="' + aid + '"><span class="qa__qt">' + esc(f.q) + '</span><span class="qa__qi">' + ICON.down + '</span></button>' +
      '<div class="qa__a" id="' + aid + '" role="region"><div class="qa__ai"><p>' + esc(f.a || '') + '</p></div></div>';
    $('.qa__q', qa).addEventListener('click', () => {
      const open = !qa.classList.contains('is-open');
      $$('.qa.is-open', box).forEach((o) => { if (o !== qa) { o.classList.remove('is-open'); $('.qa__q', o).setAttribute('aria-expanded', 'false'); } });
      qa.classList.toggle('is-open', open);
      $('.qa__q', qa).setAttribute('aria-expanded', String(open));
      setTimeout(refreshST, 650);
    });
    box.appendChild(qa);
    observeRv(qa, Math.min(i, 6) * 60);
  });
  refreshST();
}
function initFaq() {
  on('faq', renderFaq);
  on('admin', renderFaq);
}
