/* =========================================================
   02 · INTRO + HEADER + MENU + ANCHORS
   ========================================================= */
function runIntro(onReveal) {
  const intro = $('#intro');
  let seen = false;
  try { seen = sessionStorage.getItem('rm-intro') === '1'; } catch (e) { seen = false; }
  if (!intro || !MOTION || seen) {
    if (intro) intro.classList.add('is-done');
    onReveal(false);
    return;
  }
  try { sessionStorage.setItem('rm-intro', '1'); } catch (e) { /* private mode */ }
  document.documentElement.style.overflow = 'hidden';
  const bars = $$('.intro__bars i', intro);
  const panels = $$('.intro__panels i', intro);
  const stage = $('.intro__stage', intro);
  let revealed = false;
  const reveal = () => { if (!revealed) { revealed = true; onReveal(true); } };
  const finish = () => {
    intro.classList.add('is-done');
    document.documentElement.style.overflow = '';
    reveal();
  };
  const tl = gsap.timeline({ onComplete: finish });
  tl.from(bars, { scaleY: 0, duration: 0.55, ease: 'back.out(1.7)', stagger: 0.11 })
    .from('.intro__cam', { y: -80, opacity: 0, duration: 0.6, ease: 'bounce.out' }, '-=0.12')
    .to('.intro__flash', { opacity: 1, scale: 5, duration: 0.16, ease: 'power2.out' })
    .to('.intro__flash', { opacity: 0, scale: 10, duration: 0.4, ease: 'power2.in' })
    .from('.intro__dash', { scaleX: 0, duration: 0.55, ease: 'power3.out' }, '-=0.45')
    .from('.intro__name', { y: 26, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=0.45')
    .from('.intro__sub', { y: 12, opacity: 0, duration: 0.5, ease: 'power3.out' }, '-=0.4')
    .fromTo(panels, { yPercent: 101, y: 0 }, { yPercent: 0, duration: 0.6, ease: 'power4.inOut', stagger: 0.08 }, '+=0.3')
    .set(stage, { autoAlpha: 0 })
    .set(intro, { backgroundColor: 'transparent' })
    .add(reveal)
    .to(panels, { yPercent: -101, duration: 0.75, ease: 'power4.inOut', stagger: 0.08 });
  intro.addEventListener('click', () => tl.progress(1), { once: true });
}

function initHeader() {
  const hdr = $('#hdr');
  const prog = $('#progress');
  const burger = $('#burger');
  const menu = $('#menu');
  let lastY = 0, menuOpen = false;

  const onScroll = (y) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    hdr.classList.toggle('is-scrolled', y > 8);
    if (!menuOpen) {
      if (y > lastY + 6 && y > 260) hdr.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 260) hdr.classList.remove('is-hidden');
    }
    lastY = y;
  };
  if (lenis) lenis.on('scroll', (e) => onScroll(e.scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  onScroll(scrollY);

  /* current section in the nav */
  const links = $$('.hdr__nav a');
  const io = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (!en.isIntersecting) return;
    links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['about', 'services', 'gallery', 'studio', 'process', 'reviews', 'contact'].forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });

  /* full-screen menu */
  const menuLinks = $$('.menu__nav a span', menu);
  const openMenu = () => {
    menuOpen = true;
    menu.hidden = false;
    hdr.classList.remove('is-hidden');
    burger.setAttribute('aria-expanded', 'true');
    $('.sr-only', burger).textContent = 'סגירת תפריט';
    menuLinks.forEach((s, i) => { s.style.transitionDelay = (0.18 + i * 0.06) + 's'; });
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    lockScroll(true);
  };
  const closeMenu = (thenScrollTo) => {
    if (!menuOpen) return;
    menuOpen = false;
    burger.setAttribute('aria-expanded', 'false');
    $('.sr-only', burger).textContent = 'פתיחת תפריט';
    menuLinks.forEach((s) => { s.style.transitionDelay = '0s'; });
    menu.classList.remove('is-open');
    lockScroll(false);
    setTimeout(() => { if (!menuOpen) menu.hidden = true; }, 820);
    if (thenScrollTo) setTimeout(() => thenScrollTo(), 60);
  };
  burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { closeMenu(); burger.focus(); } });
  menu.addEventListener('keydown', (e) => trapFocus(menu, e));

  /* every in-page link scrolls smoothly (and closes the menu) */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.length < 2) return;
    e.preventDefault();
    const go = () => scrollToTarget(href);
    if (menuOpen) closeMenu(go); else go();
  });

  /* category shortcuts (menu + services) open the gallery on that category */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-goto-cat]');
    if (!b) return;
    const cat = b.getAttribute('data-goto-cat');
    const go = () => { setFilter(cat); scrollToTarget('#gallery'); };
    if (menuOpen) closeMenu(go); else go();
  });
}
