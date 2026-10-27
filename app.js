const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const yearEl = $('#year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('load', () => {
  if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
});

const nav = $('#nav');
const navToggle = $('#navToggle');

function setMenu(open) {
  nav.classList.toggle('menu-open', open);
  document.body.classList.toggle('menu-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
}

navToggle?.addEventListener('click', () => {
  setMenu(!nav.classList.contains('menu-open'));
});

$$('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});

function onScroll() {
  nav.classList.toggle('is-scrolled', window.scrollY > 24);
}
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

$$('.reveal').forEach((el, index) => {
  el.style.transitionDelay = `${Math.min(index % 6, 5) * 55}ms`;
  revealObserver.observe(el);
});

setTimeout(() => {
  $$('.reveal').forEach((el) => {
    el.classList.add('is-visible');
    revealObserver.unobserve(el);
  });
}, 1600);

const featureGrid = $('.feature-grid');
$$('.feature-card').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
  });
});

function formatCount(value, decimals) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function animateCount(el) {
  if (el.dataset.done === 'true') return;
  el.dataset.done = 'true';
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  if (Number.isNaN(target)) return;
  if (reduceMotion) {
    el.textContent = formatCount(target, decimals);
    return;
  }
  const duration = 1500;
  const start = performance.now();
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = formatCount(target * eased, decimals);
    if (progress < 1) requestAnimationFrame(frame);
    else el.textContent = formatCount(target, decimals);
  }
  requestAnimationFrame(frame);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    animateCount(entry.target);
    countObserver.unobserve(entry.target);
  });
}, { threshold: 0.5 });

$$('[data-count]').forEach((el) => countObserver.observe(el));

const tabs = $$('.tab');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
      const panel = document.getElementById(item.getAttribute('aria-controls'));
      if (panel) {
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      }
    });
  });
});

const faqs = $$('.faq');
faqs.forEach((faq) => {
  faq.addEventListener('toggle', () => {
    if (!faq.open) return;
    faqs.forEach((other) => {
      if (other !== faq) other.open = false;
    });
  });
});

const seasonTabs = $$('.season-tab');
const rows = $$('#leaderboardBody tr');
seasonTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    seasonTabs.forEach((item) => item.classList.toggle('is-active', item === tab));
    const filter = tab.dataset.filter;
    rows.forEach((row) => {
      row.classList.toggle('is-hidden', filter !== 'all' && row.dataset.platform !== filter);
    });
  });
});

let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
  showToast('Copied to clipboard');
}

$$('[data-copy]').forEach((button) => {
  button.addEventListener('click', () => copyText(button.dataset.copy));
});

const lastCheckedEl = $('#lastChecked');
const refreshButton = $('#refreshStatus');
const regionRows = $$('.region');
let lastCheckTime = Date.now();

function jitterPing(base, spread = 4) {
  const value = base + Math.round((Math.random() * 2 - 1) * spread);
  return Math.max(base - 6, value);
}

function updatePings() {
  regionRows.forEach((row) => {
    const base = parseInt(row.dataset.basePing, 10);
    const target = $('[data-ping]', row);
    if (!target) return;
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

function refreshStatus() {
  refreshButton?.classList.add('is-spinning');
  updatePings();
  showToast('Server status refreshed');
  setTimeout(() => refreshButton?.classList.remove('is-spinning'), 550);
}

refreshButton?.addEventListener('click', refreshStatus);

if (!reduceMotion) {
  setInterval(updatePings, 5200);
}

setInterval(() => {
  if (!lastCheckedEl) return;
  const seconds = Math.round((Date.now() - lastCheckTime) / 1000);
  if (seconds < 5) return;
  lastCheckedEl.textContent = seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`;
}, 5000);

const activityPool = [
  { initials: 'JT', color: '#ff9b3d', name: 'JumpShotJim', text: 'locked in a 4-point play', meta: 'NA East · just now' },
  { initials: 'BR', color: '#38e8ff', name: 'BrickLayer', text: 'joined a Pro-Am lobby', meta: 'EU West · just now' },
  { initials: 'MD', color: '#38ff9c', name: 'MiddieKing', text: 'extended a 9-game win streak', meta: 'Asia · just now' },
  { initials: 'TP', color: '#c9a6ff', name: 'ThreadPasser', text: 'dropped 14 assists', meta: 'NA West · just now' },
  { initials: 'SW', color: '#ff5f8f', name: 'SwatMaster', text: 'recorded 6 blocks', meta: 'South America · just now' },
  { initials: 'LC', color: '#7c8cff', name: 'LogoCity', text: 'hit a half-court buzzer beater', meta: 'Oceania · just now' },
  { initials: 'DK', color: '#ffb347', name: 'DunkLab', text: 'finished a poster in the park', meta: 'EU East · just now' },
];

const activityFeed = $('#activityFeed');
let activityIndex = 0;

function pushActivity() {
  if (!activityFeed) return;
  const item = activityPool[activityIndex % activityPool.length];
  activityIndex += 1;
  const li = document.createElement('li');
  li.className = 'activity-item';
  li.innerHTML = `
    <span class="avatar" style="--a:${item.color}">${item.initials}</span>
    <div><p><b>${item.name}</b> ${item.text}</p><small>${item.meta}</small></div>
  `;
  activityFeed.prepend(li);
  while (activityFeed.children.length > 5) activityFeed.lastElementChild.remove();
}

if (!reduceMotion && activityFeed) {
  setInterval(pushActivity, 9000);
}

const sections = ['status', 'connect', 'features', 'leaderboard', 'discord']
  .map((id) => document.getElementById(id))
  .filter(Boolean);

const spyLinks = new Map($$('[data-spy]').map((link) => [link.dataset.spy, link]));

const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    spyLinks.forEach((link, key) => link.classList.toggle('is-active', key === entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });

sections.forEach((section) => spyObserver.observe(section));

const heroVisual = $('#heroVisual');
if (heroVisual && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  heroVisual.addEventListener('pointermove', (event) => {
    const rect = heroVisual.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    const card = $('.scorecard', heroVisual);
    if (card) card.style.transform = `translate(calc(-50% + ${x * -10}px), ${y * -8}px)`;
  });
  heroVisual.addEventListener('pointerleave', () => {
    const card = $('.scorecard', heroVisual);
    if (card) card.style.transform = '';
  });
}

if (featureGrid) {
  featureGrid.addEventListener('pointerleave', () => {
    $$('.feature-card', featureGrid).forEach((card) => {
      card.style.removeProperty('--mx');
      card.style.removeProperty('--my');
    });
  }, true);
}
