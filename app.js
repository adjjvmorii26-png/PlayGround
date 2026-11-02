/**
 * Court Relay — landing page behaviour.
 *
 * Vanilla ES2020, no dependencies and no build step. Each block is independent
 * and no-ops when its markup is absent, so the page keeps working if a section
 * is removed or an API (IntersectionObserver, clipboard) is unavailable.
 */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const on = (target, type, handler, options) => target?.addEventListener(type, handler, options);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsObserver = typeof IntersectionObserver === 'function';

  /* ----------------------------------------------------------- misc ----- */

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  on(window, 'load', () => {
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });

  /* ----------------------------------------------------------- nav ------ */

  const nav = $('#nav');
  const navToggle = $('#navToggle');
  const mobileNav = window.matchMedia('(max-width: 1100px)');

  function setMenu(open) {
    if (!nav) return;
    const next = Boolean(open) && mobileNav.matches;
    nav.classList.toggle('menu-open', next);
    document.body.classList.toggle('menu-open', next);
    navToggle?.setAttribute('aria-expanded', String(next));
  }

  setMenu(false);
  on(navToggle, 'click', () => setMenu(!nav?.classList.contains('menu-open')));
  $$('.nav-links a').forEach((link) => on(link, 'click', () => setMenu(false)));

  // Closing on outside press, Escape, and breakpoint changes keeps the panel
  // from staying open (and the body from staying scroll-locked) behind the user.
  on(document, 'pointerdown', (event) => {
    if (!nav?.classList.contains('menu-open')) return;
    if (event.target instanceof Node && nav.contains(event.target)) return;
    setMenu(false);
  });
  on(document, 'keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });
  on(mobileNav, 'change', () => setMenu(false));

  // Scroll state drives the translucent header; throttle to one frame.
  let scrollFrame = 0;
  function syncScrolled() {
    nav?.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  on(window, 'scroll', () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      syncScrolled();
    });
  }, { passive: true });
  syncScrolled();

  /* -------------------------------------------------------- reveals ----- */

  const revealItems = $$('.reveal');

  function revealAll() {
    revealItems.forEach((el) => el.classList.add('is-visible'));
  }

  if (!supportsObserver) {
    revealAll();
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach((el, index) => {
      el.style.transitionDelay = `${Math.min(index % 6, 5) * 55}ms`;
      revealObserver.observe(el);
    });

    // Safety net: never leave content invisible if a callback is missed.
    window.setTimeout(() => {
      revealAll();
      revealItems.forEach((el) => revealObserver.unobserve(el));
    }, 2000);
  }

  /* ------------------------------------------- feature card spotlight ---- */

  $$('.feature-card').forEach((card) => {
    on(card, 'pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });
  });

  const featureGrid = $('.feature-grid');
  // Bubble phase on purpose: capture fired for every child card's pointerleave.
  on(featureGrid, 'pointerleave', () => {
    $$('.feature-card').forEach((card) => {
      card.style.removeProperty('--mx');
      card.style.removeProperty('--my');
    });
  });

  /* --------------------------------------------------------- counters --- */

  const formatCount = (value, decimals) => value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  function animateCount(el) {
    if (el.dataset.done === 'true') return;
    const target = Number.parseFloat(el.dataset.count ?? '');
    if (!Number.isFinite(target)) return; // Leave unparsable values untouched.
    const decimals = Number.parseInt(el.dataset.decimals ?? '0', 10) || 0;
    el.dataset.done = 'true';

    if (reduceMotion) {
      el.textContent = formatCount(target, decimals);
      return;
    }

    const duration = 1500;
    const start = performance.now();
    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      el.textContent = progress < 1
        ? formatCount(target * eased, decimals)
        : formatCount(target, decimals);
      if (progress < 1) window.requestAnimationFrame(frame);
    };
    window.requestAnimationFrame(frame);
  }

  const counters = $$('[data-count]');
  if (!supportsObserver) {
    counters.forEach(animateCount);
  } else {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => countObserver.observe(el));
  }

  /* ----------------------------------------------------------- tabs ----- */

  const tabs = $$('.tab');

  function selectTab(tab, focus = false) {
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;

      const panel = document.getElementById(item.getAttribute('aria-controls') ?? '');
      if (!panel) return;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    if (focus) tab.focus();
  }

  tabs.forEach((tab, index) => {
    on(tab, 'click', () => selectTab(tab));
    on(tab, 'keydown', (event) => {
      const last = tabs.length - 1;
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = last;
      else return;
      event.preventDefault();
      selectTab(tabs[nextIndex], true);
    });
  });

  /* ---------------------------------------------------- FAQ accordion --- */

  const faqs = $$('.faq');
  faqs.forEach((faq) => {
    on(faq, 'toggle', () => {
      if (!faq.open) return;
      faqs.forEach((other) => {
        if (other !== faq) other.open = false;
      });
    });
  });

  /* ---------------------------------------------------- leaderboard ----- */

  const seasonTabs = $$('.season-tab');
  const leaderboardRows = $$('#leaderboardBody tr[data-platform]');
  const rankClasses = ['rank-1', 'rank-2', 'rank-3'];

  /**
   * Filter rows and renumber the visible ones so a filtered view always reads
   * 1, 2, 3 instead of keeping the ranks of hidden rows.
   */
  function applyLeaderboardFilter(filter) {
    let rank = 0;
    leaderboardRows.forEach((row) => {
      const visible = filter === 'all' || row.dataset.platform === filter;
      row.classList.toggle('is-hidden', !visible);
      if (!visible) return;

      rank += 1;
      const badge = $('.rank', row);
      if (!badge) return;
      badge.textContent = String(rank);
      badge.classList.remove(...rankClasses);
      if (rank <= rankClasses.length) badge.classList.add(rankClasses[rank - 1]);
    });
  }

  seasonTabs.forEach((tab) => {
    on(tab, 'click', () => {
      seasonTabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      applyLeaderboardFilter(tab.dataset.filter ?? 'all');
    });
  });

  /* ----------------------------------------------------------- toast ---- */

  const toast = $('#toast');
  let toastTimer = 0;

  function showToast(message, tone = 'success') {
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.tone = tone;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  function legacyCopy(text) {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';

    const selection = document.getSelection();
    const previousRange = selection?.rangeCount ? selection.getRangeAt(0) : null;

    document.body.appendChild(field);
    field.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    } finally {
      field.remove();
      if (selection && previousRange) {
        selection.removeAllRanges();
        selection.addRange(previousRange);
      }
    }
    return copied;
  }

  async function copyText(text) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return legacyCopy(text);
    }
  }

  $$('[data-copy]').forEach((button) => {
    on(button, 'click', async () => {
      const text = button.dataset.copy;
      if (!text) return;
      const copied = await copyText(text);
      showToast(
        copied ? 'Copied to clipboard' : 'Copy blocked — select the text manually',
        copied ? 'success' : 'error',
      );
    });
  });

  /* -------------------------------------------------- server status ----- */

  const lastCheckedEl = $('#lastChecked');
  const refreshButton = $('#refreshStatus');
  const regionRows = $$('.region');
  let lastCheckTime = Date.now();

  const jitterPing = (base, spread = 4) => Math.max(
    base - 6,
    Math.round(base + (Math.random() * 2 - 1) * spread),
  );

  function updatePings() {
    regionRows.forEach((row) => {
      const base = Number.parseInt(row.dataset.basePing ?? '', 10);
      const target = $('[data-ping]', row);
      if (!Number.isFinite(base) || !target) return;
      const value = jitterPing(base);
      target.textContent = `${value}ms`;
      target.classList.toggle('warn', value > 55);
    });

    const pc = $('[data-ping="pc"]');
    const android = $('[data-ping="android"]');
    if (pc) pc.textContent = `${jitterPing(18, 3)}ms`;
    if (android) android.textContent = `${jitterPing(42, 6)}ms`;

    lastCheckTime = Date.now();
    if (lastCheckedEl) lastCheckedEl.textContent = 'just now';
  }

  // Polling runs for everyone, reduced motion or not: the numbers are data, not
  // decoration. Reduced motion only skips the animated count-ups.
  window.setInterval(() => {
    if (!document.hidden) updatePings();
  }, 5200);

  window.setInterval(() => {
    if (!lastCheckedEl || document.hidden) return;
    const seconds = Math.round((Date.now() - lastCheckTime) / 1000);
    if (seconds < 5) return;
    lastCheckedEl.textContent = seconds < 60
      ? `${seconds}s ago`
      : `${Math.round(seconds / 60)}m ago`;
  }, 5000);

  on(document, 'visibilitychange', () => {
    if (!document.hidden) updatePings();
  });

  on(refreshButton, 'click', () => {
    refreshButton.classList.add('is-spinning');
    updatePings();
    showToast('Server status refreshed');
    window.setTimeout(() => refreshButton.classList.remove('is-spinning'), 550);
  });

  /* --------------------------------------------------- activity feed ---- */

  const activityFeed = $('#activityFeed');
  const activityPool = [
    { initials: 'JT', color: '#ff9b3d', name: 'JumpShotJim', text: 'locked in a 4-point play', meta: 'NA East · just now' },
    { initials: 'BR', color: '#38e8ff', name: 'BrickLayer', text: 'joined a club league lobby', meta: 'EU West · just now' },
    { initials: 'MD', color: '#38ff9c', name: 'MiddieKing', text: 'extended a 9-game win streak', meta: 'Asia · just now' },
    { initials: 'TP', color: '#c9a6ff', name: 'ThreadPasser', text: 'dropped 14 assists', meta: 'NA West · just now' },
    { initials: 'SW', color: '#ff5f8f', name: 'SwatMaster', text: 'recorded 6 blocks', meta: 'South America · just now' },
    { initials: 'LC', color: '#7c8cff', name: 'LogoCity', text: 'hit a half-court buzzer beater', meta: 'Oceania · just now' },
    { initials: 'DK', color: '#ffb347', name: 'DunkLab', text: 'finished a poster in the park', meta: 'EU East · just now' },
  ];

  if (activityFeed && !reduceMotion) {
    let activityIndex = 0;

    const addActivity = () => {
      const item = activityPool[activityIndex % activityPool.length];
      activityIndex += 1;

      const row = document.createElement('li');
      row.className = 'activity-item';

      const avatar = document.createElement('span');
      avatar.className = 'avatar';
      avatar.style.setProperty('--a', item.color);
      avatar.textContent = item.initials;

      const body = document.createElement('div');
      const line = document.createElement('p');
      const name = document.createElement('b');
      name.textContent = item.name;
      line.append(name, document.createTextNode(` ${item.text}`));
      const meta = document.createElement('small');
      meta.textContent = item.meta;
      body.append(line, meta);

      row.append(avatar, body);
      activityFeed.prepend(row);
      while (activityFeed.children.length > 5) activityFeed.lastElementChild.remove();
    };

    window.setInterval(() => {
      if (!document.hidden) addActivity();
    }, 9000);
  }

  /* ---------------------------------------------------- section spy ----- */

  const spyLinks = new Map($$('[data-spy]').map((link) => [link.dataset.spy, link]));

  if (spyLinks.size > 0 && supportsObserver) {
    const spySections = Array.from(spyLinks.keys())
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const spyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        spyLinks.forEach((link, key) => {
          const active = key === entry.target.id;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    spySections.forEach((section) => spyObserver.observe(section));
  }

  /* ------------------------------------------------- hero parallax ----- */

  const heroVisual = $('#heroVisual');
  const pointerIsFine = window.matchMedia('(pointer: fine)').matches;

  if (heroVisual && !reduceMotion && pointerIsFine) {
    const scorecard = $('.scorecard', heroVisual);

    on(heroVisual, 'pointermove', (event) => {
      if (!scorecard) return;
      const rect = heroVisual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      scorecard.style.transform = `translate(calc(-50% + ${x * -10}px), ${y * -8}px)`;
    });

    on(heroVisual, 'pointerleave', () => {
      if (scorecard) scorecard.style.transform = '';
    });
  }
})();
