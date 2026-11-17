/* =========================================================
   06 · LIGHTBOX — keyboard, swipe, thumbnails
   ========================================================= */
const LB = { list: [], i: 0, back: null, sx: 0, sy: 0 };

function lbSrc(it) { return it.src || assetUrl(it.asset); }
function lbThumb(it) { return it.src || assetUrl(it.thumb || it.asset); }
function lbLabel(it) { return it.title || it.name || (CATS[it.cat] ? CATS[it.cat].full : ''); }

function openLB(list, i, backEl) {
  if (!list || !list.length) return;
  const lb = $('#lb');
  LB.list = list;
  LB.i = Math.max(0, Math.min(i, list.length - 1));
  LB.back = backEl || document.activeElement;
  const th = $('#lb-thumbs');
  th.innerHTML = '';
  if (list.length > 1) {
    list.forEach((it, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'תמונה ' + (k + 1));
      const img = new Image(); img.loading = 'lazy'; img.alt = ''; img.src = lbThumb(it);
      b.appendChild(img);
      b.addEventListener('click', () => lbShow(k, true));
      th.appendChild(b);
    });
  }
  th.hidden = list.length < 2;
  $('#lb-prev').hidden = list.length < 2;
  $('#lb-next').hidden = list.length < 2;
  lb.hidden = false;
  lbShow(LB.i, false);
  requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('is-open')));
  lockScroll(true);
  setTimeout(() => $('#lb-close').focus(), 30);
}
function lbShow(i, animate) {
  const n = LB.list.length;
  LB.i = ((i % n) + n) % n;
  const it = LB.list[LB.i];
  const img = $('#lb-img');
  const apply = () => {
    img.onload = () => img.classList.remove('is-swapping');
    img.onerror = () => img.classList.remove('is-swapping');
    img.src = lbSrc(it);
    img.alt = lbLabel(it) || 'תמונה מהגלריה';
  };
  if (animate && !REDUCE) { img.classList.add('is-swapping'); setTimeout(apply, 200); } else apply();
  const cat = $('#lb-cat');
  cat.textContent = CATS[it.cat] ? CATS[it.cat].full : (it.badge || '');
  cat.hidden = !cat.textContent;
  $('#lb-count').textContent = n > 1 ? pad2(LB.i + 1) + ' / ' + pad2(n) : '';
  $('#lb-cap').textContent = it.title || it.caption || '';
  $$('#lb-thumbs button').forEach((b, k) => {
    const curr = k === LB.i;
    b.setAttribute('aria-current', curr ? 'true' : 'false');
    if (curr) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCE ? 'auto' : 'smooth' });
  });
  /* warm the neighbours */
  [LB.i + 1, LB.i - 1].forEach((k) => { const nb = LB.list[((k % n) + n) % n]; if (nb) { const p = new Image(); p.src = lbSrc(nb); } });
}
function closeLB() {
  const lb = $('#lb');
  if (lb.hidden) return;
  lb.classList.remove('is-open');
  lockScroll(false);
  setTimeout(() => { lb.hidden = true; $('#lb-img').removeAttribute('src'); }, 460);
  if (LB.back && LB.back.focus) LB.back.focus({ preventScroll: true });
}
function initLightbox() {
  const lb = $('#lb');
  $('#lb-close').addEventListener('click', closeLB);
  $('#lb-next').addEventListener('click', () => lbShow(LB.i + 1, true));
  $('#lb-prev').addEventListener('click', () => lbShow(LB.i - 1, true));
  $('#lb-stage').addEventListener('click', (e) => { if (e.target.id === 'lb-stage') closeLB(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeLB(); }
    else if (e.key === 'ArrowLeft') lbShow(LB.i + 1, true);
    else if (e.key === 'ArrowRight') lbShow(LB.i - 1, true);
    trapFocus(lb, e);
  });
  const stage = $('#lb-stage');
  stage.addEventListener('pointerdown', (e) => { LB.sx = e.clientX; LB.sy = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    const dx = e.clientX - LB.sx, dy = e.clientY - LB.sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && LB.list.length > 1) lbShow(LB.i + (dx > 0 ? 1 : -1), true);
    else if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.5) closeLB();
  });
}
