/* =========================================================
   03 · HERO SLIDESHOW + SINGLE-IMAGE SLOTS
   ========================================================= */
const hero = { imgs: [], idx: 0, timer: 0, paused: false, key: null };

function renderHero() {
  const box = $('#hero-slides');
  const dots = $('#hero-dots');
  const ctrl = $('#hero-ctrl');
  const list = (Array.isArray(S.config.hero) ? S.config.hero : []).filter((h) => h && h.asset);
  const key = list.map((h) => h.asset).join(',');
  if (key === hero.key) return;
  hero.key = key;
  stopHero();
  hero.imgs.forEach((i) => i.remove());
  hero.imgs = [];
  dots.innerHTML = '';
  const empty = $('.ph__empty', box);
  if (!list.length) { if (empty) empty.hidden = false; ctrl.hidden = true; return; }
  if (empty) empty.hidden = true;
  hero.imgs = list.map((h, i) => {
    const img = makeImg(assetUrl(h.asset), 'צילום של רחלי מן', i === 0);
    box.appendChild(img);
    return img;
  });
  ctrl.hidden = list.length < 2;
  list.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'תמונה ' + (i + 1) + ' מתוך ' + list.length);
    b.addEventListener('click', () => { showHero(i); restartHero(); });
    dots.appendChild(b);
  });
  hero.idx = 0;
  showHero(0);
  restartHero();
}
function showHero(i) {
  if (!hero.imgs.length) return;
  hero.idx = (i + hero.imgs.length) % hero.imgs.length;
  hero.imgs.forEach((img, k) => img.classList.toggle('is-active', k === hero.idx));
  $$('#hero-dots button').forEach((b, k) => b.setAttribute('aria-current', k === hero.idx ? 'true' : 'false'));
}
function stopHero() { clearInterval(hero.timer); hero.timer = 0; }
function restartHero() {
  stopHero();
  if (hero.paused || REDUCE || hero.imgs.length < 2) return;
  hero.timer = setInterval(() => { if (!document.hidden) showHero(hero.idx + 1); }, 5600);
}
function initHero() {
  const btn = $('#hero-pause');
  btn.addEventListener('click', () => {
    hero.paused = !hero.paused;
    btn.setAttribute('aria-pressed', String(hero.paused));
    btn.setAttribute('aria-label', hero.paused ? 'הפעלת החלפת התמונות' : 'עצירת החלפת התמונות');
    btn.innerHTML = hero.paused
      ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
    restartHero();
  });
  on('config', renderHero);
  on('config', renderSlots);
}
function renderSlots() {
  const st = $('[data-slot="studio"]');
  const ct = $('[data-slot="contact"]');
  if (st) fillPh(st, S.config.studio, 'הסטודיו של רחלי מן');
  if (ct) fillPh(ct, S.config.contact, 'רחלי מן צילום');
}
