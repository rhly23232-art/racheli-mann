/* =========================================================
   01 · CORE — helpers, store, database connection, scrolling
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const HAS_GSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
const MOTION = HAS_GSAP && !REDUCE;
const isMobile = () => matchMedia('(max-width: 900px)').matches;
const PHONE = '0548413353';
const WA = 'https://wa.me/972548413353';

if (MOTION) { document.documentElement.classList.add('motion'); gsap.registerPlugin(ScrollTrigger); }

const CATS = {
  newborn: { he: 'ניו בורן', full: 'צילומי ניו בורן', en: 'NEWBORN' },
  outdoor: { he: 'צילומי חוץ', full: 'צילומי חוץ', en: 'OUTDOOR' },
  family:  { he: 'משפחה', full: 'צילומי משפחה', en: 'FAMILY' },
  studio:  { he: 'סטודיו', full: 'צילומי סטודיו', en: 'STUDIO' }
};
const CAT_KEYS = Object.keys(CATS);

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const uid8 = () => Math.random().toString(36).slice(2, 10);

const ICON = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6 6-6-6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.2" r="3.6"/></svg>',
  smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8.5 10h.01M15.5 10h.01"/><path d="M8 14.5c2.2 2.4 5.8 2.4 8 0"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
  bars: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4.5" y="7" width="4" height="12" rx="1.2"/><rect x="10" y="5" width="4" height="14" rx="1.2"/><rect x="15.5" y="7" width="4" height="12" rx="1.2"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
};

/* ---------- tiny event bus + shared state ---------- */
const S = {
  config: {}, gallery: [], reviews: [], faq: [], leads: [],
  db: null, user: null, assets: null, uid: null, isAdmin: false, sb: null,
  dbState: 'none' /* none | loading | live | slow | offline */
};
const BUS = {};
const on = (ev, fn) => { (BUS[ev] = BUS[ev] || []).push(fn); };
const emit = (ev) => { (BUS[ev] || []).forEach((fn) => { try { fn(); } catch (e) { console.error('[' + ev + ']', e); } }); };

/* ---------- images ---------- */
function makeImg(src, alt, eager) {
  const img = new Image();
  img.decoding = 'async';
  img.loading = eager ? 'eager' : 'lazy';
  img.alt = alt || '';
  img.draggable = false;
  img.addEventListener('load', () => img.classList.add('is-in'), { once: true });
  img.addEventListener('error', () => img.classList.add('is-broken'), { once: true });
  img.src = src;
  return img;
}
function emptyHTML(title, sub, adminTab, adminCat) {
  return '<div class="ph__empty"><span class="mk"><i></i><i></i><i></i></span><span>' + esc(title) + '</span>' +
    (sub ? '<small>' + esc(sub) + '</small>' : '') +
    (adminTab ? '<button type="button" class="dbtn dbtn--sm admin-cta" data-admin-open="' + adminTab + '"' + (adminCat ? ' data-admin-cat="' + adminCat + '"' : '') + '><span class="dbtn__label">העלאת תמונות</span><span class="dbtn__icon">' + ICON.plus + '</span></button>' : '') +
    '</div>';
}
/* put one image (or the designed empty state) into a .ph box */
function fillPh(ph, item, alt, emptyTitle, emptySub, adminTab, adminCat) {
  const next = item && item.asset ? item.asset : '';
  if (ph.dataset.filled === '1' && ph.dataset.asset === next) return;
  ph.dataset.filled = '1';
  ph.dataset.asset = next;
  $$('img', ph).forEach((i) => i.remove());
  let empty = $('.ph__empty', ph);
  if (next) {
    if (empty) empty.hidden = true;
    ph.appendChild(makeImg(assetUrl(item.thumb || next), alt || ''));
  } else {
    if (!empty && emptyTitle) { ph.insertAdjacentHTML('beforeend', emptyHTML(emptyTitle, emptySub, adminTab, adminCat)); empty = $('.ph__empty', ph); }
    if (empty) empty.hidden = false;
  }
}

/* ---------- toast + clipboard ---------- */
let toastT = 0;
function toast(msg, isErr) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle('is-err', !!isErr);
  t.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('is-on'), 3400);
}
function copyText(text, selectEl) {
  let p;
  try { p = navigator.clipboard && navigator.clipboard.writeText(text); } catch (e) { p = null; }
  const fallback = () => {
    if (selectEl) {
      const r = document.createRange(); r.selectNodeContents(selectEl);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }
    toast('המספר מסומן, אפשר להעתיק אותו');
  };
  if (p && p.then) p.then(() => toast('המספר הועתק')).catch(fallback); else fallback();
}

/* ---------- word splitting (keeps nested tags) ---------- */
function splitWords(el) {
  if (!el || el.dataset.split) return el ? $$('.word', el) : [];
  el.dataset.split = '1';
  const walk = (node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        if (parts.length === 1 && !parts[0].trim()) return;
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
          else { const s = document.createElement('span'); s.className = 'word'; s.textContent = p; frag.appendChild(s); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('hl__bg') && !n.classList.contains('sh') && n.getAttribute('aria-hidden') !== 'true') {
        walk(n);
      }
    });
  };
  walk(el);
  return $$('.word', el);
}

/* ---------- smooth scroll (Lenis) + scroll lock ---------- */
let lenis = null;
function initScroll() {
  if (MOTION && typeof window.Lenis !== 'undefined') {
    try {
      lenis = new Lenis({ lerp: 0.095, smoothWheel: true, wheelMultiplier: 0.95 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } catch (e) { lenis = null; }
  }
}
function scrollToTarget(target) {
  const el = typeof target === 'string' ? (target === '#top' ? null : $(target)) : target;
  if (target === '#top' || !el) {
    if (lenis) lenis.scrollTo(0, { duration: 1.4 }); else window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
    return;
  }
  const off = -(($('#hdr') || {}).offsetHeight || 0) + 1;
  if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + off, behavior: REDUCE ? 'auto' : 'smooth' });
}
let locks = 0;
function lockScroll(on) {
  locks = Math.max(0, locks + (on ? 1 : -1));
  const L = locks > 0;
  if (lenis) { if (L) lenis.stop(); else lenis.start(); }
  document.documentElement.style.overflow = L ? 'hidden' : '';
}
const refreshST = debounce(() => { if (MOTION) ScrollTrigger.refresh(); }, 260);

/* simple focus trap for dialogs */
function trapFocus(root, e) {
  if (e.key !== 'Tab') return;
  const f = $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', root).filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* reveal-on-view for content that arrives later from the database */
let rvIO = null;
function observeRv(el, delay) {
  if (!MOTION) return;
  el.classList.add('rv');
  if (delay) el.style.transitionDelay = delay + 'ms';
  if (!rvIO) {
    rvIO = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); rvIO.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
  }
  rvIO.observe(el);
}

