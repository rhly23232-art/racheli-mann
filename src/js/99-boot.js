/* =========================================================
   99 · BOOT
   ========================================================= */
function boot() {
  initScroll();
  initHeader();
  initHero();
  initMarquee();
  initServices();
  initGallery();
  initLightbox();
  initReviews();
  initFaq();
  initContact();
  initCursor();
  initAdmin();
  renderHero();
  renderSlots();
  initMotion();
  runIntro((afterIntro) => heroIn(afterIntro));
  initData();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
