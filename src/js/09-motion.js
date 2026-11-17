/* =========================================================
   09 · MOTION — every section gets its own choreography (GSAP)
   ========================================================= */
const EASE_IN = 'power4.out';

function rvFrom(targets, vars, trigger, extra) {
  const els = typeof targets === 'string' ? gsap.utils.toArray(targets) : targets.filter(Boolean);
  if (!els.length) return;
  gsap.from(els, Object.assign({
    y: 30, opacity: 0, duration: 1, ease: EASE_IN, clearProps: 'transform,opacity',
    scrollTrigger: { trigger: trigger || els[0], start: 'top 88%', once: true }
  }, vars || {}, extra || {}));
}
function rvWords(sel, trigger) {
  gsap.utils.toArray(sel).forEach((el) => {
    const lines = $$('.ln', el);
    const words = lines.length ? lines.reduce((a, l) => a.concat(splitWords(l)), []) : splitWords(el);
    if (!words.length) return;
    gsap.from(words, {
      y: '0.55em', opacity: 0, rotationX: -40, transformOrigin: '50% 100%', duration: 1, ease: EASE_IN, stagger: 0.05, clearProps: 'all',
      scrollTrigger: { trigger: trigger || el, start: 'top 86%', once: true }
    });
  });
}
function rvBar(sel, trigger, delay) {
  gsap.utils.toArray(sel).forEach((el) => {
    gsap.from(el, { scaleX: 0, duration: 1, ease: 'power3.inOut', delay: delay || 0.35, clearProps: 'transform', scrollTrigger: { trigger: trigger || el, start: 'top 88%', once: true } });
  });
}
function rvPhoto(sel, dir) {
  const from = { up: 'inset(100% 0% 0% 0%)', down: 'inset(0% 0% 100% 0%)', left: 'inset(0% 100% 0% 0%)', right: 'inset(0% 0% 0% 100%)' }[dir || 'up'];
  gsap.utils.toArray(sel).forEach((el) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    tl.fromTo(el, { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.35, ease: 'power4.inOut', clearProps: 'clipPath' }, 0);
    const corners = el.parentElement && $('.vf__c', el.parentElement);
    if (corners) tl.from(corners, { opacity: 0, scale: 0.94, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity' }, 0.75);
  });
}
function rvBigWord(sel, dir) {
  gsap.utils.toArray(sel).forEach((el) => {
    gsap.from(el, { xPercent: 14 * dir, opacity: 0, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 95%', once: true } });
    gsap.fromTo(el, { x: 0 }, { x: -90 * dir, ease: 'none', scrollTrigger: { trigger: el.closest('section,.sec') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}
function rvTag(sec) {
  rvBar(sec + ' .tag__bg', sec + ' .tag', 0);
  rvFrom(sec + ' .tag__t', { x: 24, y: 0, delay: 0.25 }, sec + ' .tag');
  rvFrom(sec + ' .tag__dot', { scale: 0, y: 0, duration: 0.9, ease: 'back.out(2)' }, sec + ' .tag');
}

/* ---------- hero: runs when the intro hands over ---------- */
function heroIn(afterIntro) {
  if (!MOTION) return;
  const words = $$('.hero__title .ln').reduce((a, l) => a.concat(splitWords(l)), []);
  const tl = gsap.timeline({ delay: afterIntro ? 0.05 : 0.15 });
  tl.from('.hdr__bar', { y: -24, opacity: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity' }, 0)
    .from(words, { y: '0.6em', opacity: 0, rotationX: -45, transformOrigin: '50% 100%', duration: 1.05, ease: EASE_IN, stagger: 0.07, clearProps: 'all' }, 0.1)
    .from('.hero__title .sh', { scale: 0, duration: 0.9, ease: 'back.out(2.2)', stagger: 0.14, clearProps: 'transform' }, 0.45)
    .from('.hero__title .hl__bg', { scaleX: 0, duration: 1, ease: 'power3.inOut', clearProps: 'transform' }, 0.85)
    .from(['.hero__eyebrow', '.hero__lead', '.hero__ctas', '.hero__facts'], { y: 26, opacity: 0, duration: 0.95, ease: 'power3.out', stagger: 0.1, clearProps: 'transform,opacity' }, 0.5)
    .from('.hero__sun', { scale: 0.3, opacity: 0, duration: 1.6, ease: 'power3.out', clearProps: 'opacity' }, 0.2)
    .fromTo('.hero__ph', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.35, ease: 'power4.inOut', clearProps: 'clipPath' }, 0.25)
    .from('.hero__frame > .vf__c', { opacity: 0, scale: 0.9, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity' }, 1.05)
    .from('.hero__stamp', { scale: 0, rotation: -120, duration: 1, ease: 'back.out(1.7)', clearProps: 'transform' }, 1.15)
    .from('.hero__ctrl, .hero__scroll', { opacity: 0, y: -8, duration: 0.6, clearProps: 'transform,opacity' }, 1.3);
}

function initMotion() {
  if (!MOTION) return;
  const mobile = isMobile();

  /* hero parallax while leaving */
  const heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__sun', { yPercent: 35, scale: 1.12, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hero__frame', { y: mobile ? -20 : -60, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hero__text', { y: mobile ? 20 : 70, ease: 'none', scrollTrigger: heroST });

  /* ABOUT — words light up while you read */
  rvTag('.about');
  rvBigWord('.about__wm', -1);
  const aboutWords = splitWords($('#about-text'));
  gsap.fromTo(aboutWords, { opacity: 0.13 }, { opacity: 1, ease: 'none', stagger: 0.06, scrollTrigger: { trigger: '#about-text', start: 'top 78%', end: 'bottom 48%', scrub: 0.45 } });
  rvFrom('.about__sign', { y: 20 });
  const ptl = gsap.timeline({ scrollTrigger: { trigger: '.pillars', start: 'top 78%', once: true } });
  ptl.from('.pillars__dash', { scaleX: 0, transformOrigin: '100% 50%', duration: 1, ease: 'power3.inOut', clearProps: 'transform' }, 0)
    .from('.pillar__bg', { scaleY: 0, duration: 1.1, ease: 'power4.inOut', stagger: 0.14, clearProps: 'transform' }, 0.1)
    .from('.pillars__cam', { y: -90, opacity: 0, duration: 0.9, ease: 'bounce.out', clearProps: 'transform,opacity' }, 0.7)
    .from($$('.pillar__in > *'), { y: 26, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06, clearProps: 'transform,opacity' }, 0.7);
  $$('.pillar__ic path, .pillar__ic circle').forEach((p) => {
    let len = 120;
    try { len = Math.ceil(p.getTotalLength()) + 2; } catch (e) { /* keep default */ }
    p.style.strokeDasharray = len;
    ptl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, 0.8);
  });

  /* MARQUEE — bands swing into their angle */
  gsap.from('.marquee__band--front', { rotation: 0, opacity: 0, duration: 1.3, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.marquee', start: 'top 92%', once: true } });
  gsap.from('.marquee__band--back', { rotation: 0, opacity: 0, duration: 1.5, delay: 0.1, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.marquee', start: 'top 92%', once: true } });

  /* SERVICES — photos slide out from behind the text and tilt */
  rvBigWord('.services__wm', 1);
  rvFrom('.services__head .eyebrow', { y: 16 });
  rvWords('.services__head .h2');
  rvFrom('.services__intro', { y: 24, delay: 0.2 });
  $$('.cat').forEach((row) => {
    const R = $('.cat__photo--r .cat__photo-in', row);
    const L = $('.cat__photo--l .cat__photo-in', row);
    const move = mobile ? 40 : Math.min(innerWidth * 0.2, 300);
    const rot = mobile ? 4 : 5.5;
    gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 95%', end: mobile ? 'top 35%' : 'center 48%', scrub: 0.7 } })
      .fromTo(R, { x: -move, rotation: 0, scale: 0.86 }, { x: 0, rotation: rot, scale: 1, ease: 'none' }, 0)
      .fromTo(L, { x: move, rotation: 0, scale: 0.86 }, { x: 0, rotation: -rot, scale: 1, ease: 'none' }, 0);
    gsap.from($('.cat__bar', row), { scaleY: 0, duration: 1.1, ease: 'power4.out', clearProps: 'transform', scrollTrigger: { trigger: $('.cat__label', row), start: 'top 88%', once: true } });
    gsap.from($('.cat__en', row), { opacity: 0, y: 40, duration: 1.1, ease: 'power3.out', delay: 0.2, clearProps: 'opacity', scrollTrigger: { trigger: $('.cat__label', row), start: 'top 88%', once: true } });
    rvWords($('.cat__h3', row), $('.cat__mid', row));
    rvFrom([$('.cat__chip', row), $('.cat__sub', row), $('.cat__desc', row), $('.cat__ctas', row)], { y: 24, stagger: 0.1 }, $('.cat__mid', row));
  });

  /* STUDIO — dark panel slides in, the frame opens like a curtain */
  gsap.from('.studio__panel', { xPercent: -100, duration: 1.4, ease: 'power4.out', scrollTrigger: { trigger: '.studio', start: 'top 80%', once: true } });
  rvBigWord('.studio__wm', 1);
  rvTag('.studio');
  rvWords('.studio .h2');
  rvFrom('.studio__list li', { x: 30, y: 0, stagger: 0.09 }, '.studio__list');
  rvBar('.studio__hl .hl__bg', '.studio__hl', 0.1);
  rvFrom(['.studio__p', '.studio .dbtn'], { y: 24, stagger: 0.12 }, '.studio__p');
  rvPhoto('.studio__ph', 'down');
  rvFrom('.studio__zig', { scale: 0.5, rotation: -20, y: 0, duration: 1.1, ease: 'back.out(1.8)' }, '.studio__media');
  rvFrom('.studio__circle', { scale: 0, y: 0, duration: 1.2, ease: 'power4.out' }, '.studio__media');
  gsap.to('.studio__circle', { y: -70, ease: 'none', scrollTrigger: { trigger: '.studio', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* GALLERY */
  rvBigWord('.gallery__wm', -1);
  rvFrom('.gallery__head .eyebrow', { y: 16 });
  rvWords('.gallery__head .h2');
  rvFrom('.gallery .gtabs', { y: 20, delay: 0.25 }, '.gallery__head');
  gsap.from('#fan-stage', { y: 90, scale: 0.92, opacity: 0, duration: 1.4, ease: 'power4.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '#fan', start: 'top 85%', once: true } });
  rvFrom(['.gallery__foot', '.gallery__all'], { y: 24, stagger: 0.12 }, '.gallery__foot');

  /* PROCESS — the pinned deck is created here so later triggers measure after its pin */
  initProcess();
  rvBigWord('.process__wm', -1);
  rvTag('.process');
  rvWords('.process .h2');
  rvBar('.process .h2 .hl__bg', '.process .h2', 0.55);
  rvFrom(['.process__p', '.process__dots', '.process .dbtn'], { y: 24, stagger: 0.1 }, '.process__p');

  /* REVIEWS + FAQ (their items reveal as they arrive) */
  /* reviews + faq start hidden, so their titles reveal through observeRv when first shown */

  /* CONTACT + FOOTER */
  rvBigWord('.contact__wm', -1);
  rvFrom('.contact .eyebrow', { y: 16 });
  rvWords('.contact .h2');
  rvFrom('.contact__p', { y: 24, delay: 0.2 });
  rvFrom(['.cform .fld', '.chips', '.cform__foot'], { y: 30, stagger: 0.09 }, '.cform');
  rvPhoto('.contact__ph', 'up');
  rvFrom('.contact__list li', { y: 18, stagger: 0.08 }, '.contact__list');
  const btl = gsap.timeline({ scrollTrigger: { trigger: '.contact__brand', start: 'top 92%', once: true } });
  btl.from('.contact__name', { yPercent: 100, duration: 1.3, ease: 'power4.out', clearProps: 'transform' }, 0)
    .from('.contact__mark i', { scaleY: 0, duration: 1, ease: 'back.out(1.6)', stagger: 0.12, clearProps: 'transform' }, 0.2)
    .from('.contact__mark svg', { y: -80, opacity: 0, duration: 0.9, ease: 'bounce.out', clearProps: 'transform,opacity' }, 0.75);
  rvFrom('.foot__bar', { y: 16 }, '.foot');

  /* when fonts settle or content arrives, recompute every trigger */
  if (typeof ScrollTrigger.sort === 'function') ScrollTrigger.sort();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshST);
  addEventListener('load', refreshST);
}
