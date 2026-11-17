/* =========================================================
   08 · CONTACT FORM (saves leads to the database) + CURSOR
   ========================================================= */
function waLink(name, phone, service, msg) {
  const t = 'שלום רחלי, כאן ' + name + '. אשמח לפרטים על ' + service + '.' + (msg ? ' ' + msg : '') + ' (טלפון: ' + phone + ')';
  return WA + '?text=' + encodeURIComponent(t);
}
function initContact() {
  const form = $('#cform');
  const note = $('#cform-note');
  const done = $('#cdone');
  const submit = $('#cform-submit');

  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => copyText(b.dataset.copy, b.parentElement.querySelector('b'))));
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-pick-service]');
    if (!a) return;
    const v = a.getAttribute('data-pick-service');
    const r = $$('input[name="service"]', form).find((x) => x.value === v);
    if (r) r.checked = true;
  });
  ['f-name', 'f-phone'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.closest('.fld').classList.remove('is-bad')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#f-name').value.trim();
    const phone = $('#f-phone').value.trim();
    const digits = phone.replace(/\D/g, '');
    const service = (($('input[name="service"]:checked', form) || {}).value) || 'אחר / התייעצות';
    const message = $('#f-msg').value.trim();
    let bad = null;
    if (!name) { $('#f-name').closest('.fld').classList.add('is-bad'); bad = bad || $('#f-name'); }
    if (digits.length < 9 || digits.length > 13) { $('#f-phone').closest('.fld').classList.add('is-bad'); bad = bad || $('#f-phone'); }
    if (bad) {
      note.className = 'cform__note is-err';
      note.textContent = !name ? 'נא לכתוב שם, כדי שרחלי תדע למי לחזור.' : 'נא לכתוב מספר טלפון מלא (לפחות 9 ספרות).';
      bad.focus();
      return;
    }
    submit.disabled = true;
    submit.classList.add('is-busy');
    note.className = 'cform__note';
    note.textContent = 'שולחים…';
    try {
      if (($('#f-hp') || {}).value) throw { code: 'spam' };
      await API.addLead({ name: name.slice(0, 80), phone: phone.slice(0, 30), service, message: message.slice(0, 1500) });
      form.hidden = true;
      $('#cdone-t').textContent = 'תודה ' + name + '! הפנייה נשמרה.';
      done.hidden = false;
      requestAnimationFrame(() => done.classList.add('is-on'));
      done.focus({ preventScroll: true });
      note.textContent = '';
      form.reset();
      $('#s-newborn').checked = true;
    } catch (err) {
      note.className = 'cform__note is-err';
      note.innerHTML = 'לא הצלחנו לשמור את הפנייה כאן. אפשר לשלוח אותה ישירות: <a href="' + waLink(name, phone, service, message) + '" target="_blank" rel="noopener">שליחה בוואטסאפ עם כל הפרטים</a>, או להתקשר ל־<span dir="ltr">054.8413353</span>.';
    } finally {
      submit.disabled = false;
      submit.classList.remove('is-busy');
    }
  });
  $('#cdone-again').addEventListener('click', () => {
    done.classList.remove('is-on');
    done.hidden = true;
    form.hidden = false;
    $('#f-name').focus();
  });
}

/* ---------- custom cursor ---------- */
function initCursor() {
  if (!FINE || REDUCE) return;
  const c = $('#cursor');
  const t = $('#cursor-t');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, shown = false;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!shown) { shown = true; cx = x; cy = y; c.classList.add('is-on'); }
  }, { passive: true });
  document.addEventListener('mouseleave', () => { shown = false; c.classList.remove('is-on'); });
  document.addEventListener('mouseover', (e) => {
    const lab = e.target.closest('[data-cursor]');
    const link = e.target.closest('a,button,[role="tab"],label.chip,input,select,textarea');
    if (lab && !e.target.closest('.admin-cta')) {
      t.textContent = lab.getAttribute('data-cursor');
      c.classList.add('is-label'); c.classList.remove('is-link');
    } else {
      c.classList.remove('is-label');
      c.classList.toggle('is-link', !!link);
    }
  });
  const loop = () => {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
    c.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
