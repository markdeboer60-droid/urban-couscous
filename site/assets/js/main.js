/* ============================================
   Otto Visser & Partners – Vanilla JS
   ============================================ */

// ── Mobile Navigation Toggle ──
const navToggle = document.querySelector('.nav-toggle');
const siteNav   = document.querySelector('.site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('nav-open');
    navToggle.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
    navToggle.setAttribute('aria-label', isOpen ? 'Menu sluiten' : 'Menu openen');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }, { passive: true });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.site-header') && siteNav.classList.contains('nav-open')) {
      siteNav.classList.remove('nav-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  }, { passive: true });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteNav.classList.contains('nav-open')) {
      siteNav.classList.remove('nav-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.focus();
      document.body.style.overflow = '';
    }
  });
}

// ── FAQ Accordion ──
document.querySelectorAll('.faq-question').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-item.open').forEach((el) => {
      el.classList.remove('open');
      el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // Toggle current
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  }, { passive: true });
});

// ── Contact Form Validation ──
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    // Clear previous errors
    contactForm.querySelectorAll('.form-group').forEach((g) => g.classList.remove('has-error'));

    const naam = contactForm.querySelector('#naam');
    const email = contactForm.querySelector('#email');
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (naam && naam.value.trim().length < 2) {
      naam.closest('.form-group').classList.add('has-error');
      valid = false;
    }
    if (email && !emailRe.test(email.value.trim())) {
      email.closest('.form-group').classList.add('has-error');
      valid = false;
    }

    if (valid) {
      // Show success (in production: use fetch() to POST to backend)
      const success = document.getElementById('form-success');
      if (success) {
        success.style.display = 'block';
        contactForm.reset();
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });
}

// ── Image fallback for missing photos ──
document.querySelectorAll('img[src]').forEach((img) => {
  img.addEventListener('error', () => {
    const src = img.getAttribute('src') || '';
    if (src.includes('team') || src.includes('hero')) {
      img.src = '/assets/img/placeholder-hero.svg';
    } else if (src.includes('mark-de-boer') || src.includes('marco-wijnia') || src.includes('avatar')) {
      img.src = '/assets/img/placeholder-avatar.svg';
    } else {
      img.src = '/assets/img/placeholder-kantoor.svg';
    }
  }, { once: true });
});

// ── Passive scroll for header shadow ──
const header = document.querySelector('.site-header');
if (header) {
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 8
      ? '0 2px 12px rgba(11,18,32,0.12)'
      : '0 1px 4px rgba(11,18,32,0.06)';
  }, { passive: true });
}
