/* ==========================================================================
   Integrated Framing & Drywall — interactions
   Vanilla JS, no dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  var header = document.getElementById('siteHeader');
  var floatActions = document.getElementById('floatActions');
  var navToggle = document.getElementById('navToggle');
  var navClose = document.getElementById('navClose');
  var drawer = document.getElementById('mobileNav');
  var mqDesktop = window.matchMedia('(min-width: 56.25em)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- current year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- sticky header + floating actions ---------- */
  var hero = document.querySelector('.hero');
  var lastState = null;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var stuck = y > 12;
    if (stuck !== lastState) {
      header.classList.toggle('is-stuck', stuck);
      lastState = stuck;
    }
    if (floatActions) {
      var trigger = hero ? hero.offsetHeight * 0.55 : 420;
      floatActions.classList.toggle('is-visible', y > trigger);
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(function () {
        onScroll();
        ticking = false;
      });
    }
  }, { passive: true });
  onScroll();

  /* ---------- mobile drawer ---------- */
  var focusableSelector = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  var lastFocused = null;

  function openDrawer() {
    lastFocused = document.activeElement;
    body.classList.add('nav-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');
    drawer.setAttribute('aria-hidden', 'false');
    window.setTimeout(function () {
      if (navClose) navClose.focus();
    }, 60);
  }

  function closeDrawer(restoreFocus) {
    body.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    drawer.setAttribute('aria-hidden', 'true');
    if (restoreFocus !== false && lastFocused) lastFocused.focus();
  }

  if (navToggle && drawer) {
    navToggle.addEventListener('click', function () {
      if (body.classList.contains('nav-open')) closeDrawer();
      else openDrawer();
    });

    if (navClose) navClose.addEventListener('click', function () { closeDrawer(); });

    drawer.addEventListener('click', function (e) {
      if (e.target === drawer) closeDrawer();
    });

    drawer.querySelectorAll('a[href]').forEach(function (link) {
      link.addEventListener('click', function () { closeDrawer(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (!body.classList.contains('nav-open')) return;
      if (e.key === 'Escape') {
        closeDrawer();
        return;
      }
      if (e.key === 'Tab') {
        var items = drawer.querySelectorAll(focusableSelector);
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    mqDesktop.addEventListener('change', function (e) {
      if (e.matches) closeDrawer(false);
    });
  }

  /* ---------- FAQ accordion ---------- */
  var accordion = document.getElementById('faqAccordion');
  if (accordion) {
    var triggers = accordion.querySelectorAll('.acc-trigger');
    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var expanded = trigger.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(trigger.getAttribute('aria-controls'));
        trigger.setAttribute('aria-expanded', String(!expanded));
        if (panel) panel.hidden = expanded;
      });
    });
  }

  /* ---------- active nav link ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-desktop a[href^="#"]'));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (section) { navObserver.observe(section); });
  }

  /* ---------- reveal on scroll ---------- */
  var revealTargets = document.querySelectorAll(
    '.intro-figure, .intro-body > *, .pillars li, .services-head > *, .service, .service-extra, ' +
    '.process-head > *, .steps li, .work-head > *, .work-item, .work-note, .areas-copy > *, ' +
    '.areas-map, .quote-copy > *, .quote-card, .faq-head > *, .acc-item, .cta-title, .cta-actions'
  );

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealTargets.forEach(function (el) {
      el.classList.add('reveal');
      revealObserver.observe(el);
    });
  }

  /* ---------- quote form ----------
     This is a static GitHub Pages build with no backend and no verified
     mailbox, so the form never pretends to send. It validates the details,
     flags what is missing, and hands off to the real phone line.
  ------------------------------------------------------------------------- */
  var form = document.getElementById('quoteForm');
  var formStatus = document.getElementById('formStatus');
  var quoteCard = document.getElementById('quoteFormCard');

  function setError(field, hasError) {
    if (!field) return;
    var wrap = field.closest('.field');
    if (!wrap) return;
    wrap.classList.toggle('has-error', hasError);
    field.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    var msg = wrap.querySelector('.field-error');
    if (msg) msg.hidden = !hasError;
  }

  if (form) {
    var nameInput = document.getElementById('q-name');
    var phoneInput = document.getElementById('q-phone');
    var scopeSelect = document.getElementById('q-scope');

    [nameInput, phoneInput].forEach(function (input) {
      if (!input) return;
      input.addEventListener('input', function () {
        if (input.value.trim()) setError(input, false);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var valid = true;
      if (!nameInput || !nameInput.value.trim()) {
        setError(nameInput, true);
        valid = false;
      }
      var digits = phoneInput ? phoneInput.value.replace(/[^\d]/g, '') : '';
      if (digits.length < 7) {
        setError(phoneInput, true);
        valid = false;
      }
      if (!valid) {
        if (formStatus) formStatus.innerHTML = '';
        var firstBad = form.querySelector('.has-error input');
        if (firstBad) firstBad.focus();
        return;
      }

      var scope = scopeSelect ? scopeSelect.value : 'Framing and drywall';
      var lines = [
        'Quote request — Integrated Framing & Drywall',
        'Name: ' + nameInput.value.trim(),
        'Phone: ' + phoneInput.value.trim(),
        'Scope: ' + scope
      ];

      if (formStatus) {
        formStatus.innerHTML = '';

        var lead = document.createElement('p');
        lead.textContent = 'Thanks, ' + nameInput.value.trim().split(' ')[0] + '. This demo page has no form backend, so nothing was sent. To get your quote, call the crew and read off these details:';
        formStatus.appendChild(lead);

        var actions = document.createElement('p');
        actions.className = 'form-status-actions';

        var callLink = document.createElement('a');
        callLink.className = 'btn btn-primary btn-sm';
        callLink.href = 'tel:+16474473441';
        callLink.textContent = 'Call (647) 447-3441';

        var copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn btn-outline btn-sm';
        copyBtn.textContent = 'Copy details';
        copyBtn.addEventListener('click', function () {
          var text = lines.join('\n');
          var done = function () { copyBtn.textContent = 'Copied'; };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fallbackCopy);
          } else {
            fallbackCopy();
          }
          function fallbackCopy() {
            var tmp = document.createElement('textarea');
            tmp.value = text;
            tmp.setAttribute('readonly', '');
            tmp.style.position = 'absolute';
            tmp.style.left = '-9999px';
            document.body.appendChild(tmp);
            tmp.select();
            try { document.execCommand('copy'); done(); } catch (err) { copyBtn.textContent = 'Select the text below'; }
            document.body.removeChild(tmp);
          }
        });

        var summaryBox = document.createElement('pre');
        summaryBox.className = 'form-summary';
        summaryBox.textContent = lines.join('\n');

        actions.appendChild(callLink);
        actions.appendChild(copyBtn);
        formStatus.appendChild(actions);
        formStatus.appendChild(summaryBox);
        if (quoteCard) quoteCard.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    });
  }
})();
