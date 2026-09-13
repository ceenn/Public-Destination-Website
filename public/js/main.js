document.addEventListener('DOMContentLoaded', () => {

  // ── Navbar scroll ──
  const navbar = document.querySelector('.navbar');
  if (navbar) window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 50));

  // ── Hamburger ──
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileNav.classList.remove('open');
    }));
  }

  // ── Hero carousel ──
  const track  = document.getElementById('carouselTrack');
  const dots   = document.querySelectorAll('.carousel-dot');
  const slides = document.querySelectorAll('.carousel-slide');
  let cur = 0, timer;

  function goTo(n) {
    if (!track || !slides.length) return;
    slides[cur]?.classList.remove('active');
    cur = (n + slides.length) % slides.length;
    slides[cur]?.classList.add('active');
    track.style.transform = `translateX(-${cur * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  }
  function startTimer() { clearInterval(timer); timer = setInterval(() => goTo(cur + 1), 5000); }

  if (slides.length) {
    slides[0].classList.add('active');
    dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); startTimer(); }));
    document.getElementById('prevSlide')?.addEventListener('click', e => { e.stopPropagation(); goTo(cur - 1); startTimer(); });
    document.getElementById('nextSlide')?.addEventListener('click', e => { e.stopPropagation(); goTo(cur + 1); startTimer(); });
    startTimer();
    const hero = document.querySelector('.hero');
    if (hero) {
      let t0 = 0;
      hero.addEventListener('mousedown', () => t0 = Date.now());
      hero.addEventListener('mouseup', e => {
        if (Date.now() - t0 < 200 && !e.target.closest('.carousel-arrow') && !e.target.closest('.carousel-controls'))
          window.location.href = '/fasilitas';
      });
    }
  }

  // ── History drag scroll ──
  const hc = document.querySelector('.history-carousel');
  if (hc) {
    let down = false, sx, sl;
    hc.addEventListener('mousedown', e => { down = true; sx = e.pageX - hc.offsetLeft; sl = hc.scrollLeft; });
    hc.addEventListener('mouseleave', () => down = false);
    hc.addEventListener('mouseup', () => down = false);
    hc.addEventListener('mousemove', e => { if (!down) return; e.preventDefault(); hc.scrollLeft = sl - (e.pageX - hc.offsetLeft - sx) * 1.5; });
  }

  // ── Maps click ──
  document.getElementById('mapsEmbed')?.addEventListener('click', () => window.location.href = '/akses');

  // ── Contact popup ──
  const popup = document.getElementById('contactPopup');
  document.querySelectorAll('[data-open="contact"]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault(); popup?.classList.add('open'); document.body.style.overflow = 'hidden';
  }));
  document.getElementById('closeContact')?.addEventListener('click', () => {
    popup?.classList.remove('open'); document.body.style.overflow = '';
  });
  popup?.addEventListener('click', e => {
    if (e.target === popup) { popup.classList.remove('open'); document.body.style.overflow = ''; }
  });

  // ── Scroll animations ──
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
  } else {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
  }

  // ── Admin upload zone ──
  const fileInput = document.getElementById('imageInput');
  const fileLabel = document.getElementById('fileLabel');
  const uploadZone = document.querySelector('.upload-zone');
  if (fileInput && fileLabel && uploadZone) {
    fileInput.addEventListener('change', () => fileLabel.textContent = fileInput.files[0]?.name || 'Pilih file gambar');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--gold)'; });
    uploadZone.addEventListener('dragleave', () => uploadZone.style.borderColor = '');
    uploadZone.addEventListener('drop', e => {
      e.preventDefault(); uploadZone.style.borderColor = '';
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      fileInput.files = dt.files;
      fileLabel.textContent = fileInput.files[0]?.name || 'File dijatuhkan';
    });
  }

  // ── Password strength hint ──
  const pwInput = document.getElementById('passwordInput');
  const pwHint  = document.getElementById('passwordHint');
  if (pwInput && pwHint) {
    pwInput.addEventListener('input', () => {
      const v = pwInput.value;
      if (!v) { pwHint.textContent = ''; return; }
      if (v.length < 6)  { pwHint.textContent = '⚠ Terlalu pendek (min. 6 karakter)'; pwHint.style.color = '#f87171'; }
      else if (v.length < 10) { pwHint.textContent = '✓ Cukup'; pwHint.style.color = '#fbbf24'; }
      else               { pwHint.textContent = '✓ Kuat'; pwHint.style.color = '#34d399'; }
    });
  }

  // ── Confirm password check ──
  const pw2 = document.getElementById('confirmInput');
  const pw2hint = document.getElementById('confirmHint');
  if (pwInput && pw2 && pw2hint) {
    pw2.addEventListener('input', () => {
      if (!pw2.value) { pw2hint.textContent = ''; return; }
      if (pw2.value !== pwInput.value) { pw2hint.textContent = '✗ Password tidak cocok'; pw2hint.style.color = '#f87171'; }
      else { pw2hint.textContent = '✓ Cocok'; pw2hint.style.color = '#34d399'; }
    });
  }

  // ── Auto-hide flash message ──
  const flash = document.querySelector('.flash');
  if (flash) setTimeout(() => flash.style.opacity = '0', 4000);

});
