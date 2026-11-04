/* ═══════════════════════════════════════════════════════════════════
   THE PARK — a spectator-only 3v3 park game
   Auto server selection · locked sideline camera · custom sideline kit
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const park = $('#parkApp');
  if (!park) return;

  const canvas = $('#parkCanvas');
  const ctx = canvas.getContext('2d');
  const parkStage = $('#parkStage');

  const loader = $('#parkLoader');
  const loaderNodes = $('#loaderNodes');
  const loaderTitle = $('#loaderTitle');
  const loaderSub = $('#loaderSub');
  const loaderBest = $('#loaderBest');
  const loaderBestName = $('#loaderBestName');
  const loaderBestPing = $('#loaderBestPing');
  const loaderBestPort = $('#loaderBestPort');
  const loaderBar = $('#loaderBar');
  const loaderStep = $('#loaderStep');
  const loaderSkip = $('#loaderSkip');

  const emoteTray = $('#emoteTray');
  const emoteToggle = $('#emoteToggle');
  const emoteList = $('#emoteList');
  const emoteModal = $('#emoteModal');
  const emoteEditor = $('#emoteEditor');
  const emoteBubble = $('#youBubble');

  const youProp = $('#youProp');
  const youPropEmoji = $('#youPropEmoji');
  const youPet = $('#youPet');
  const youPetEmoji = $('#youPetEmoji');
  const youPetName = $('#youPetName');

  const propGrid = $('#propGrid');
  const petGrid = $('#petGrid');
  const petNameInput = $('#petName');
  const emoteAdd = $('#emoteAdd');
  const emoteReset = $('#emoteReset');

  const parkFeed = $('#parkFeed');
  const parkFinal = $('#parkFinal');
  const hudScore = $('.hud-score');
  const hudScoreA = $('#hudScoreA');
  const hudScoreB = $('#hudScoreB');
  const hudClock = $('#hudClock');
  const hudShot = $('#hudShot');
  const hudQuarter = $('#hudQuarter');
  const hudRegion = $('#hudRegion');
  const hudPing = $('#hudPing');
  const youRegion = $('#youRegion');
  const commentaryText = $('#commentaryText');
  const parkSide = $('.park-side');

  const TAU = Math.PI * 2;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* ═══════════════════════════════════════════════════════════════
     Regional nodes — best connection is picked automatically
     ═══════════════════════════════════════════════════════════════ */

  const REGIONS = [
    { id: 'android', name: 'Android', city: 'Mobile edge', base: 7, color: '#3ddc84' },
    { id: 'na-east', name: 'NA East', city: 'Virginia', base: 18, color: '#ff6a1a' },
    { id: 'na-west', name: 'NA West', city: 'Oregon', base: 24, color: '#ffb347' },
    { id: 'eu-west', name: 'EU West', city: 'Amsterdam', base: 31, color: '#38e8ff' },
    { id: 'eu-east', name: 'EU East', city: 'Warsaw', base: 39, color: '#7c8cff' },
    { id: 'asia', name: 'Asia', city: 'Singapore', base: 58, color: '#38ff9c' },
    { id: 'sa', name: 'South America', city: 'São Paulo', base: 66, color: '#ff5f8f' },
    { id: 'oceania', name: 'Oceania', city: 'Sydney', base: 72, color: '#c9a6ff' },
  ];

  /* Game/voice ports scanned on the winning node. Lowest handshake wins. */
  const SERVER_PORTS = [7777, 8080, 28960, 27015];

  /* ═══════════════════════════════════════════════════════════════
     Sideline kit data — emotes, props, pets
     ═══════════════════════════════════════════════════════════════ */

  const DEFAULT_EMOTES = [
    { emoji: '🔥', label: 'Cooked', color: '#ff6a1a' },
    { emoji: '💦', label: 'Splash', color: '#38e8ff' },
    { emoji: '😤', label: 'Too easy', color: '#ffb347' },
    { emoji: '🪣', label: 'Buckets', color: '#38ff9c' },
    { emoji: '🧱', label: 'Board man', color: '#c9a6ff' },
    { emoji: '😂', label: 'Airball', color: '#ff5f8f' },
    { emoji: '🤝', label: 'GG', color: '#7c8cff' },
    { emoji: '💸', label: 'Cash', color: '#ffd166' },
  ];

  const PROPS = [
    { id: 'boombox', emoji: '📻', label: 'Boombox', desc: 'Park anthem on loop' },
    { id: 'cooler', emoji: '🧃', label: 'Cooler', desc: 'Cold drinks for the run' },
    { id: 'chair', emoji: '🪑', label: 'Folding chair', desc: 'Courtside comfort' },
    { id: 'umbrella', emoji: '⛱️', label: 'Umbrella', desc: 'Shade for the sideline' },
    { id: 'sign', emoji: '🪧', label: 'Fan sign', desc: 'Make some noise' },
    { id: 'camera', emoji: '📷', label: 'Camcorder', desc: 'Film the run' },
    { id: 'none', emoji: '🚫', label: 'No prop', desc: 'Travel light' },
  ];

  const PETS = [
    { id: 'dog', emoji: '🐕', label: 'Dog', desc: 'Hype on four legs', defaultName: 'Rex', sound: 'Woof!' },
    { id: 'cat', emoji: '🐈', label: 'Cat', desc: 'Unbothered courtside', defaultName: 'Milo', sound: 'Mrrp.' },
    { id: 'parrot', emoji: '🦜', label: 'Parrot', desc: 'Repeats every call', defaultName: 'Rio', sound: 'Squawk!' },
    { id: 'bunny', emoji: '🐇', label: 'Rabbit', desc: 'Quick off the bench', defaultName: 'Clover', sound: '*thump*' },
    { id: 'turtle', emoji: '🐢', label: 'Turtle', desc: 'Never leaves early', defaultName: 'Shelly', sound: '...sup.' },
    { id: 'none', emoji: '🚫', label: 'No pet', desc: 'Just you and the game', defaultName: '', sound: '' },
  ];

  const EMOTE_KEY = 'reborn2k16.emotes.v2';
  const KIT_KEY = 'reborn2k16.kit.v1';
  const DEFAULT_KIT = { prop: 'boombox', pet: 'dog', petName: 'Rex' };

  function validColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#ff6a1a';
  }

  function sanitizeEmotes(list) {
    if (!Array.isArray(list) || !list.length) return null;
    return list.slice(0, 8).map((item) => ({
      emoji: String(item && item.emoji ? item.emoji : '✨').slice(0, 6),
      label: String(item && item.label ? item.label : 'Emote').slice(0, 24),
      color: validColor(item && item.color),
    }));
  }

  function loadEmotes() {
    try {
      const saved = sanitizeEmotes(JSON.parse(localStorage.getItem(EMOTE_KEY) || 'null'));
      if (saved) return saved;
    } catch { /* private mode */ }
    return DEFAULT_EMOTES.map((item) => ({ ...item }));
  }

  function saveEmotes() {
    try { localStorage.setItem(EMOTE_KEY, JSON.stringify(emotes)); } catch { /* ignore */ }
  }

  function loadKit() {
    try {
      const saved = JSON.parse(localStorage.getItem(KIT_KEY) || 'null');
      if (saved) {
        return {
          prop: PROPS.some((p) => p.id === saved.prop) ? saved.prop : DEFAULT_KIT.prop,
          pet: PETS.some((p) => p.id === saved.pet) ? saved.pet : DEFAULT_KIT.pet,
          petName: String(saved.petName || DEFAULT_KIT.petName).slice(0, 16),
        };
      }
    } catch { /* private mode */ }
    return { ...DEFAULT_KIT };
  }

  function saveKit() {
    try { localStorage.setItem(KIT_KEY, JSON.stringify(kit)); } catch { /* ignore */ }
  }

  let emotes = loadEmotes();
  let kit = loadKit();
  let lastEmoteAt = 0;

  /* ═══════════════════════════════════════════════════════════════
     Emote toolbar
     ═══════════════════════════════════════════════════════════════ */

  function setTray(open) {
    emoteTray.hidden = !open;
    emoteToggle.setAttribute('aria-expanded', String(open));
    park.classList.toggle('is-tray-open', open);
  }

  function renderEmoteBar() {
    emoteList.replaceChildren();
    emotes.forEach((emote, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'emote-btn';
      button.style.setProperty('--ec', emote.color);
      button.title = `${emote.label} (${index + 1})`;
      button.setAttribute('aria-label', `Send emote: ${emote.label}`);

      const emoji = document.createElement('span');
      emoji.className = 'eb-emoji';
      emoji.textContent = emote.emoji;

      const label = document.createElement('span');
      label.className = 'eb-label';
      label.textContent = emote.label;

      const key = document.createElement('span');
      key.className = 'eb-key';
      key.textContent = String(index + 1);

      button.append(emoji, label, key);
      button.addEventListener('click', () => fireEmote(index, button));
      emoteList.append(button);
    });
  }

  function showBubble(emoji, label, color) {
    emoteBubble.style.setProperty('--bc', color || '#ff6a1a');
    const emojiEl = document.createElement('span');
    emojiEl.className = 'bubble-emoji';
    emojiEl.textContent = emoji;
    const labelEl = document.createElement('span');
    labelEl.className = 'bubble-label';
    labelEl.textContent = label;
    emoteBubble.replaceChildren(emojiEl, labelEl);
    emoteBubble.classList.remove('is-live');
    void emoteBubble.offsetWidth;
    emoteBubble.classList.add('is-live');
  }

  function fireEmote(index, button) {
    const emote = emotes[index];
    if (!emote) return;
    const now = performance.now();
    if (now - lastEmoteAt < 550) return;
    lastEmoteAt = now;

    showBubble(emote.emoji, emote.label, emote.color);
    addFeed(emote.emoji, 'You', `“${emote.label}” from the sideline`, emote.color);
    spawnEmoteFx(emote.emoji);
    if (typeof game !== 'undefined') game.hype = Math.min(1.4, game.hype + 0.9);

    if (button) {
      button.classList.add('is-fired');
      setTimeout(() => button.classList.remove('is-fired'), 520);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     Sideline kit UI — emotes, props, pets
     ═══════════════════════════════════════════════════════════════ */

  function applyKit() {
    const prop = PROPS.find((item) => item.id === kit.prop) || PROPS[0];
    youPropEmoji.textContent = prop.emoji;
    youProp.style.display = prop.id === 'none' ? 'none' : '';

    const pet = PETS.find((item) => item.id === kit.pet) || PETS[0];
    if (pet.id === 'none') {
      youPet.hidden = true;
    } else {
      youPet.hidden = false;
      youPetEmoji.textContent = pet.emoji;
      const name = (kit.petName || pet.defaultName || pet.label).slice(0, 16);
      youPetName.textContent = name;
      youPet.setAttribute('aria-label', `Pet ${name} (${pet.label})`);
    }
    if (petNameInput) petNameInput.value = kit.petName || '';
  }

  function renderPropGrid() {
    propGrid.replaceChildren();
    PROPS.forEach((prop) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `kit-card${kit.prop === prop.id ? ' is-selected' : ''}`;
      card.innerHTML = `
        <span class="kit-card-check"><span class="check-dot">✓</span></span>
        <span class="kit-card-emoji">${prop.emoji}</span>
        <b>${prop.label}</b>
        <small>${prop.desc}</small>`;
      card.addEventListener('click', () => {
        kit.prop = prop.id;
        saveKit();
        applyKit();
        renderPropGrid();
      });
      propGrid.append(card);
    });
  }

  function renderPetGrid() {
    petGrid.replaceChildren();
    PETS.forEach((pet) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `kit-card${kit.pet === pet.id ? ' is-selected' : ''}`;
      card.innerHTML = `
        <span class="kit-card-check"><span class="check-dot">✓</span></span>
        <span class="kit-card-emoji">${pet.emoji}</span>
        <b>${pet.label}</b>
        <small>${pet.desc}</small>`;
      card.addEventListener('click', () => {
        kit.pet = pet.id;
        if (pet.id !== 'none' && !kit.petName) kit.petName = pet.defaultName;
        saveKit();
        applyKit();
        renderPetGrid();
      });
      petGrid.append(card);
    });
  }

  function renderEmoteEditor() {
    emoteEditor.replaceChildren();
    emotes.forEach((emote, index) => {
      const row = document.createElement('div');
      row.className = 'emote-row';
      row.style.setProperty('--ec', emote.color);

      const key = document.createElement('span');
      key.className = 'emote-row-key';
      key.textContent = String(index + 1);

      const emoji = document.createElement('input');
      emoji.type = 'text';
      emoji.className = 'emoji-input';
      emoji.value = emote.emoji;
      emoji.maxLength = 6;
      emoji.setAttribute('aria-label', `Emote ${index + 1} emoji`);

      const label = document.createElement('input');
      label.type = 'text';
      label.className = 'label-input';
      label.value = emote.label;
      label.maxLength = 24;
      label.setAttribute('aria-label', `Emote ${index + 1} label`);

      const color = document.createElement('input');
      color.type = 'color';
      color.value = emote.color;
      color.setAttribute('aria-label', `Emote ${index + 1} color`);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'emote-del';
      del.setAttribute('aria-label', `Delete emote ${index + 1}`);
      del.disabled = emotes.length <= 1;
      del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      emoji.addEventListener('input', () => {
        emote.emoji = emoji.value.slice(0, 6) || '✨';
        saveEmotes();
        renderEmoteBar();
      });
      label.addEventListener('input', () => {
        emote.label = label.value.slice(0, 24) || 'Emote';
        saveEmotes();
        renderEmoteBar();
      });
      color.addEventListener('input', () => {
        emote.color = validColor(color.value);
        row.style.setProperty('--ec', emote.color);
        saveEmotes();
        renderEmoteBar();
      });
      del.addEventListener('click', () => {
        if (emotes.length <= 1) return;
        emotes.splice(index, 1);
        saveEmotes();
        renderEmoteBar();
        renderEmoteEditor();
      });

      row.append(key, emoji, label, color, del);
      emoteEditor.append(row);
    });
    emoteAdd.hidden = emotes.length >= 8;
  }

  function setKitTab(name) {
    $$('.kit-tab').forEach((tab) => {
      const active = tab.dataset.kit === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    $('#kitEmotes').hidden = name !== 'emotes';
    $('#kitProps').hidden = name !== 'props';
    $('#kitPets').hidden = name !== 'pets';
    emoteAdd.hidden = name !== 'emotes' || emotes.length >= 8;
  }

  function openKit() {
    state.paused = true;
    emoteModal.hidden = false;
    renderEmoteEditor();
    renderPropGrid();
    renderPetGrid();
    applyKit();
    setKitTab('emotes');
    setTimeout(() => $('#emoteClose').focus(), 30);
  }

  function closeKit() {
    emoteModal.hidden = true;
    state.paused = false;
  }

  $$('.kit-tab').forEach((tab) => {
    tab.addEventListener('click', () => setKitTab(tab.dataset.kit));
  });

  $('#emoteCustomize').addEventListener('click', openKit);
  $('#emoteClose').addEventListener('click', closeKit);
  $('#emoteDone').addEventListener('click', closeKit);
  emoteModal.addEventListener('click', (event) => {
    if (event.target === emoteModal) closeKit();
  });

  emoteAdd.addEventListener('click', () => {
    if (emotes.length >= 8) return;
    const palette = ['#ff6a1a', '#38e8ff', '#38ff9c', '#c9a6ff', '#ff5f8f', '#ffd166'];
    emotes.push({ emoji: '✨', label: 'New emote', color: palette[emotes.length % palette.length] });
    saveEmotes();
    renderEmoteBar();
    renderEmoteEditor();
    const rows = $$('.emote-row', emoteEditor);
    const last = rows[rows.length - 1];
    if (last) last.querySelector('.label-input').focus();
  });

  emoteReset.addEventListener('click', () => {
    emotes = DEFAULT_EMOTES.map((item) => ({ ...item }));
    kit = { ...DEFAULT_KIT };
    saveEmotes();
    saveKit();
    renderEmoteBar();
    renderEmoteEditor();
    renderPropGrid();
    renderPetGrid();
    applyKit();
    showToast('Sideline kit reset to defaults');
  });

  petNameInput.addEventListener('input', () => {
    kit.petName = petNameInput.value.slice(0, 16);
    saveKit();
    applyKit();
  });

  youPet.addEventListener('click', () => {
    const pet = PETS.find((item) => item.id === kit.pet);
    if (!pet || pet.id === 'none') {
      openKit();
      setKitTab('pets');
      return;
    }
    const name = kit.petName || pet.defaultName;
    showBubble(pet.emoji, `${name}: ${pet.sound}`, '#ffb347');
    youPet.classList.remove('is-petted');
    void youPet.offsetWidth;
    youPet.classList.add('is-petted');
    setTimeout(() => youPet.classList.remove('is-petted'), 700);
  });

  emoteToggle.addEventListener('click', () => setTray(emoteTray.hidden));

  renderEmoteBar();
  applyKit();

  /* ═══════════════════════════════════════════════════════════════
     App state, loader, entry & exit
     ═══════════════════════════════════════════════════════════════ */

  const state = {
    open: false,
    running: false,
    paused: false,
    best: null,
    loaderToken: 0,
    lastFocus: null,
    raf: 0,
    last: 0,
    acc: 0,
  };

  const probe = { measured: [], best: null };
  let pingTimer = 0;

  let parkToastTimer = 0;
  function showToast(message) {
    const toast = $('#parkToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-live');
    clearTimeout(parkToastTimer);
    parkToastTimer = setTimeout(() => toast.classList.remove('is-live'), 2600);
  }

  function buildLoaderNodes() {
    loaderNodes.replaceChildren();
    REGIONS.forEach((region) => {
      const item = document.createElement('li');
      item.style.setProperty('--nc', region.color);
      item.innerHTML = `
        <span class="loader-node-dot" aria-hidden="true"></span>
        <span class="loader-node-name"><b>${region.name}</b><span>${region.city}</span></span>
        <span class="loader-node-bar" aria-hidden="true"><i></i></span>
        <span class="loader-node-ping">—</span>`;
      loaderNodes.append(item);
    });
  }

  function resetLoaderUI() {
    loader.classList.remove('is-done');
    loaderSkip.disabled = false;
    loaderTitle.textContent = 'Finding your best connection…';
    loaderSub.textContent = 'Probing regional nodes and ports for the lowest ping';
    loaderBest.hidden = true;
    loaderBar.style.width = '6%';
    loaderStep.textContent = 'Auto-join is on · Android node + best port';
    buildLoaderNodes();
  }

  function measureRegions() {
    return REGIONS.map((region) => ({
      ...region,
      ping: Math.max(8, Math.round(region.base + rand(-2, 5))),
    }));
  }

  const PORT_BASE = { 7777: 2, 8080: 4, 28960: 6, 27015: 8 };

  function probePorts() {
    const scanned = SERVER_PORTS.map((port) => ({
      port,
      rtt: Math.max(1, Math.round((PORT_BASE[port] || 5) + rand(-1, 2))),
    })).sort((a, b) => a.rtt - b.rtt);
    return { best: scanned[0], scanned };
  }

  function revealNode(index, region) {
    const item = loaderNodes.children[index];
    if (!item) return;
    item.classList.add('is-live');
    item.querySelector('.loader-node-ping').textContent = `${region.ping}ms`;
    const bar = item.querySelector('.loader-node-bar i');
    bar.style.width = `${clamp(104 - region.ping, 10, 96)}%`;
  }

  function markBest(best) {
    Array.from(loaderNodes.children).forEach((item, index) => {
      if (REGIONS[index] && REGIONS[index].id === best.id) item.classList.add('is-best');
    });
    loaderBest.hidden = false;
    loaderBestName.textContent = `${best.name} · ${best.city}`;
    loaderBestPing.textContent = `${best.ping}ms`;
    if (loaderBestPort) loaderBestPort.textContent = best.port ? `:${best.port}` : ':—';
  }

  async function runProbe(token) {
    const measured = measureRegions();
    probe.measured = measured;

    for (let i = 0; i < measured.length; i += 1) {
      if (token !== state.loaderToken) return;
      revealNode(i, measured[i]);
      loaderBar.style.width = `${8 + ((i + 1) / measured.length) * 46}%`;
      await sleep(235);
    }
    if (token !== state.loaderToken) return;

    const best = measured.reduce((lowest, region) => (region.ping <= lowest.ping ? region : lowest));
    const scan = probePorts();
    best.port = scan.best.port;
    best.portRtt = scan.best.rtt;
    probe.ports = scan;
    probe.best = best;
    markBest(best);
    loaderTitle.textContent = 'Best connection locked.';
    loaderSub.textContent = `${best.name} · ${best.city} — ${best.ping}ms · port ${best.port} wins`;
    loaderBar.style.width = '62%';
    loaderStep.textContent = `${scan.scanned.length} ports scanned · best handshake ${best.portRtt}ms`;
    await sleep(720);
    if (token !== state.loaderToken) return;

    loaderTitle.textContent = 'Entering The Park…';
    loaderSub.textContent = 'Syncing rosters, court pack, and your sideline kit';
    loaderBar.style.width = '93%';
    loaderStep.textContent = `Joining ${best.name} · :${best.port} · ${best.ping}ms`;
    await sleep(920);
    if (token !== state.loaderToken) return;

    loaderBar.style.width = '100%';
    await sleep(280);
    if (token !== state.loaderToken) return;
    enterGame();
  }

  function enterGame() {
    const best = probe.best || { ...REGIONS[0], ping: REGIONS[0].base, port: SERVER_PORTS[0] };
    if (!best.port) best.port = probePorts().best.port;
    state.best = best;
    state.running = true;
    state.paused = false;

    loader.classList.add('is-done');
    loaderSkip.disabled = true;
    hudRegion.textContent = best.name;
    hudPing.textContent = `${best.ping}ms · :${best.port}`;
    youRegion.textContent = best.name;

    resetGame();
    startPingJitter();
    showToast(`Joined ${best.name} · :${best.port} · ${best.ping}ms — best connection`);
    addFeed('🛰️', 'You', `connected to ${best.name} · :${best.port} · ${best.ping}ms`, '#38ff9c');
    addFeed('🏀', 'Park', 'ORANGE vs BLACKTOP · 60 FPS', '#ff6a1a');
  }

  function startPingJitter() {
    clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      if (!state.open || !state.running || !state.best) return;
      const jitter = Math.round(rand(-2, 2));
      hudPing.textContent = `${Math.max(6, state.best.ping + jitter)}ms · :${state.best.port || SERVER_PORTS[0]}`;
    }, 4400);
  }

  function openPark() {
    if (state.open) return;
    state.open = true;
    state.running = false;
    state.paused = false;
    state.lastFocus = document.activeElement;

    park.hidden = false;
    park.setAttribute('aria-hidden', 'false');
    document.body.classList.add('park-open');

    emoteModal.hidden = true;
    parkFinal.hidden = true;
    setTray(false);
    loader.classList.remove('is-done');
    probe.measured = [];
    probe.best = null;
    resetLoaderUI();

    resizeCanvas();
    resetGame();
    render(performance.now() / 1000);
    startLoop();

    const token = ++state.loaderToken;
    loaderSkip.focus();
    runProbe(token);

    setTimeout(() => {
      if (!state.open) return;
      resizeCanvas();
    }, 80);
  }

  function leavePark() {
    if (!state.open) return;
    state.open = false;
    state.running = false;
    state.paused = false;
    state.loaderToken += 1;
    clearInterval(pingTimer);

    park.hidden = true;
    park.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('park-open');
    emoteModal.hidden = true;
    parkFinal.hidden = true;
    setTray(false);

    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.last = 0;

    if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
  }

  $$('[data-start-park]').forEach((button) => button.addEventListener('click', openPark));
  $('#parkLeave').addEventListener('click', leavePark);
  $('#parkExit').addEventListener('click', leavePark);
  $('#parkAgain').addEventListener('click', () => {
    resetGame();
    showToast('Run it back — tip-off');
  });
  $('#parkFeedToggle').addEventListener('click', () => {
    parkSide.classList.toggle('is-hidden');
  });

  loaderSkip.addEventListener('click', () => {
    if (!state.open) return;
    state.loaderToken += 1;
    if (!probe.best) {
      const best = probe.measured.length
        ? probe.measured.reduce((lowest, region) => (region.ping <= lowest.ping ? region : lowest))
        : { ...REGIONS[0], ping: REGIONS[0].base };
      probe.best = best;
    }
    if (!probe.best.port) probe.best.port = probePorts().best.port;
    markBest(probe.best);
    loaderBar.style.width = '100%';
    loaderSkip.disabled = true;
    enterGame();
  });

  document.addEventListener('keydown', (event) => {
    if (!state.open) return;
    const tag = document.activeElement ? document.activeElement.tagName : '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (event.key === 'Escape') {
      if (!emoteModal.hidden) { closeKit(); event.preventDefault(); return; }
      if (!emoteTray.hidden) { setTray(false); event.preventDefault(); return; }
      leavePark();
      return;
    }
    if (typing) return;
    if (event.key === 'e' || event.key === 'E') {
      event.preventDefault();
      setTray(emoteTray.hidden);
      return;
    }
    if (!emoteTray.hidden && /^[1-8]$/.test(event.key)) {
      const index = Number(event.key) - 1;
      fireEmote(index, emoteList.children[index] || null);
      event.preventDefault();
    }
  });

  window.addEventListener('resize', () => {
    if (state.open) resizeCanvas();
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      if (state.open) resizeCanvas();
    }).observe(parkStage);
  }

  /* ═══════════════════════════════════════════════════════════════
     Scene view & static backdrop
     ═══════════════════════════════════════════════════════════════ */

  const view = {
    w: 0, h: 0, unit: 60, left: 0, right: 0, cx: 0,
    farY: 0, nearY: 0, horizon: 0,
    stars: [], buildings: [], trees: [], crowd: [], specks: [],
  };

  const bgCanvas = document.createElement('canvas');
  const bgCtx = bgCanvas.getContext('2d');

  function project(x, z) {
    const spread = 0.84 + 0.16 * z;
    return {
      x: view.cx + (x - 0.5) * (view.right - view.left) * spread,
      y: view.farY + (view.nearY - view.farY) * z,
    };
  }

  function resizeCanvas() {
    const rect = parkStage.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    view.w = w;
    view.h = h;
    view.unit = Math.max(26, Math.min(w * 0.095, h * 0.145));
    const portrait = h > w * 1.1;
    view.left = w * (portrait ? 0.07 : 0.035);
    view.right = w * (portrait ? 0.93 : 0.965);
    view.cx = w / 2;
    view.farY = h * 0.66;
    view.nearY = Math.min(h * 0.945, view.farY + Math.min(h * 0.27, w * 0.46));
    view.horizon = view.farY - Math.max(20, view.unit * 0.55);

    buildStars();
    buildBuildings();
    buildTrees();
    buildCrowd();
    buildSpecks();
    buildBackdrop();
  }

  function buildStars() {
    view.stars = [];
    const count = Math.max(34, Math.round(view.w / 26));
    for (let i = 0; i < count; i += 1) {
      view.stars.push({
        x: rand(0, view.w),
        y: rand(0, view.h * 0.42),
        r: rand(0.5, 1.5),
        a: rand(0.16, 0.75),
      });
    }
  }

  function buildBuildings() {
    view.buildings = [];
    let x = -view.w * 0.02;
    while (x < view.w + 30) {
      const width = rand(view.w * 0.025, view.w * 0.085);
      const height = rand(view.h * 0.035, view.h * 0.145);
      view.buildings.push({
        x,
        y: view.horizon - height,
        w: width,
        h: height,
        windows: Math.random() > 0.25,
        lit: rand(0.25, 0.75),
        back: false,
      });
      x += width + rand(1, view.w * 0.012);
    }
    // A dimmer second layer for depth.
    x = -20;
    while (x < view.w + 40) {
      const width = rand(view.w * 0.03, view.w * 0.1);
      const height = rand(view.h * 0.025, view.h * 0.09);
      view.buildings.push({
        x,
        y: view.horizon - height * 0.72,
        w: width,
        h: height,
        windows: false,
        lit: 0.2,
        back: true,
      });
      x += width + rand(4, 24);
    }
  }

  function buildTrees() {
    view.trees = [];
    const count = Math.max(4, Math.round(view.w / 210));
    for (let i = 0; i < count; i += 1) {
      view.trees.push({
        x: rand(-20, view.w + 20),
        y: view.horizon + rand(0, 10),
        r: rand(view.unit * 0.35, view.unit * 0.75),
        shade: rand(0.06, 0.14),
      });
    }
  }

  function buildCrowd() {
    view.crowd = [];
    const count = clamp(Math.round(view.w / 34), 16, 52);
    const colors = ['#1a2330', '#222d39', '#2c2533', '#1c2b2c', '#26303a'];
    for (let i = 0; i < count; i += 1) {
      view.crowd.push({
        x: (i + rand(0.1, 0.9)) / count * view.w,
        y: view.farY + rand(-2, 7),
        h: view.unit * rand(0.3, 0.46),
        phase: rand(0, TAU),
        color: pick(colors),
        accent: pick(['#ff6a1a', '#38e8ff', '#ffb347', '#38ff9c']),
        hasAccent: Math.random() < 0.22,
      });
    }
  }

  function buildSpecks() {
    view.specks = [];
    for (let i = 0; i < 110; i += 1) {
      view.specks.push({
        x: rand(0, 1),
        z: rand(0, 1),
        r: rand(0.5, 1.8),
        a: rand(0.03, 0.1),
        warm: Math.random() < 0.4,
      });
    }
  }

  function buildBackdrop() {
    const c = bgCtx;
    const w = view.w;
    const h = view.h;
    c.clearRect(0, 0, w, h);

    const sky = c.createLinearGradient(0, 0, 0, view.farY + view.unit * 0.6);
    sky.addColorStop(0, '#050711');
    sky.addColorStop(0.32, '#11122a');
    sky.addColorStop(0.55, '#2c1c36');
    sky.addColorStop(0.74, '#5c2c35');
    sky.addColorStop(0.9, '#a84d33');
    sky.addColorStop(1, '#e57a41');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    const sun = c.createRadialGradient(w * 0.72, view.horizon + 8, 0, w * 0.72, view.horizon + 8, w * 0.44);
    sun.addColorStop(0, 'rgba(255, 186, 112, 0.5)');
    sun.addColorStop(0.35, 'rgba(255, 124, 60, 0.18)');
    sun.addColorStop(1, 'rgba(255, 106, 26, 0)');
    c.fillStyle = sun;
    c.fillRect(0, 0, w, view.farY + 30);

    // Stars
    for (const star of view.stars) {
      c.globalAlpha = star.a;
      c.fillStyle = '#dfe9ff';
      c.beginPath();
      c.arc(star.x, star.y, star.r, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;

    // Skyline
    for (const building of view.buildings) {
      c.fillStyle = building.back ? 'rgba(14, 16, 28, 0.6)' : '#0c0f1a';
      c.fillRect(building.x, building.y, building.w, building.h + (view.horizon - building.y));
      if (building.windows) {
        const cols = Math.max(1, Math.floor(building.w / 9));
        const rows = Math.max(1, Math.floor(building.h / 13));
        for (let cx = 0; cx < cols; cx += 1) {
          for (let ry = 0; ry < rows; ry += 1) {
            if (Math.random() > 0.36) continue;
            c.fillStyle = `rgba(255, 190, 110, ${rand(0.12, 0.55) * building.lit})`;
            c.fillRect(
              building.x + 3 + cx * (building.w - 6) / cols,
              building.y + 5 + ry * (building.h - 8) / rows,
              1.6,
              2.4,
            );
          }
        }
      }
    }

    // Distant trees
    for (const tree of view.trees) {
      c.fillStyle = `rgba(5, 12, 10, ${0.55 + tree.shade})`;
      c.beginPath();
      c.arc(tree.x, tree.y - tree.r * 0.5, tree.r, 0, TAU);
      c.arc(tree.x + tree.r * 0.55, tree.y - tree.r * 0.22, tree.r * 0.62, 0, TAU);
      c.arc(tree.x - tree.r * 0.55, tree.y - tree.r * 0.2, tree.r * 0.58, 0, TAU);
      c.fill();
      c.fillRect(tree.x - 2, tree.y - tree.r * 0.4, 4, tree.r * 0.8);
    }

    // Chain-link fence behind the crowd
    const fenceTop = view.farY - view.unit * 0.9;
    const postGap = Math.max(42, view.unit * 1.1);
    c.strokeStyle = 'rgba(210, 225, 235, 0.10)';
    c.lineWidth = 1;
    for (let x = 0; x < w; x += postGap) {
      c.beginPath();
      c.moveTo(x, fenceTop);
      c.lineTo(x, view.farY + 4);
      c.stroke();
      c.strokeStyle = 'rgba(210, 225, 235, 0.05)';
      c.beginPath();
      c.moveTo(x, fenceTop);
      c.lineTo(x + postGap, view.farY + 4);
      c.moveTo(x + postGap, fenceTop);
      c.lineTo(x, view.farY + 4);
      c.stroke();
      c.strokeStyle = 'rgba(210, 225, 235, 0.10)';
    }
    c.beginPath();
    c.moveTo(0, fenceTop);
    c.lineTo(w, fenceTop);
    c.strokeStyle = 'rgba(255, 255, 255, 0.13)';
    c.lineWidth = 2;
    c.stroke();

    // String lights over the court
    const lightPoles = [w * 0.05, w * 0.95];
    c.strokeStyle = 'rgba(8, 10, 15, 0.9)';
    c.lineWidth = Math.max(2, view.unit * 0.025);
    for (const px of lightPoles) {
      c.beginPath();
      c.moveTo(px, view.farY);
      c.lineTo(px, h * 0.13);
      c.stroke();
    }
    for (let wire = 0; wire < 2; wire += 1) {
      const y0 = h * (0.16 + wire * 0.035);
      const sag = h * (0.025 + wire * 0.015);
      c.beginPath();
      c.moveTo(lightPoles[0], y0);
      c.quadraticCurveTo(w / 2, y0 + sag * 2.2, lightPoles[1], y0);
      c.strokeStyle = 'rgba(10, 12, 18, 0.85)';
      c.lineWidth = 1.2;
      c.stroke();

      const bulbs = Math.round(w / 62);
      for (let i = 1; i < bulbs; i += 1) {
        const t = i / bulbs;
        const mt = 1 - t;
        const bx = mt * mt * lightPoles[0] + 2 * mt * t * (w / 2) + t * t * lightPoles[1];
        const by = mt * mt * y0 + 2 * mt * t * (y0 + sag * 2.2) + t * t * y0;
        const glow = c.createRadialGradient(bx, by + 3, 0, bx, by + 3, 8);
        glow.addColorStop(0, 'rgba(255, 210, 140, 0.9)');
        glow.addColorStop(1, 'rgba(255, 160, 70, 0)');
        c.fillStyle = glow;
        c.beginPath();
        c.arc(bx, by + 3, 8, 0, TAU);
        c.fill();
        c.fillStyle = '#ffe0a8';
        c.beginPath();
        c.arc(bx, by + 2, 1.4, 0, TAU);
        c.fill();
      }
    }

    // Warm haze at the horizon line
    const haze = c.createLinearGradient(0, view.horizon - 20, 0, view.farY + 20);
    haze.addColorStop(0, 'rgba(255, 138, 70, 0)');
    haze.addColorStop(0.6, 'rgba(255, 138, 70, 0.1)');
    haze.addColorStop(1, 'rgba(255, 138, 70, 0)');
    c.fillStyle = haze;
    c.fillRect(0, view.horizon - 20, w, view.unit);
  }

  function drawCrowd(time) {
    const hype = game.hype;
    for (const person of view.crowd) {
      const bounce = Math.sin(time * 1.7 + person.phase) * 1.2
        + (hype > 0.03 ? Math.abs(Math.sin(time * 9 + person.phase)) * hype * view.unit * 0.05 : 0);
      const x = person.x;
      const y = person.y - bounce;
      const h = person.h;

      ctx.fillStyle = person.color;
      ctx.beginPath();
      ctx.ellipse(x, y - h * 0.37, h * 0.17, h * 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(x - h * 0.16, y - h * 0.5, h * 0.32, h * 0.42);

      ctx.fillStyle = 'rgba(20, 16, 18, 0.95)';
      ctx.beginPath();
      ctx.arc(x, y - h * 0.72, h * 0.14, 0, TAU);
      ctx.fill();

      if (person.hasAccent) {
        ctx.fillStyle = person.accent;
        ctx.globalAlpha = 0.24;
        ctx.fillRect(x - h * 0.15, y - h * 0.46, h * 0.3, h * 0.05);
        ctx.globalAlpha = 1;
      }

      if (hype > 0.25) {
        ctx.strokeStyle = 'rgba(210, 220, 232, 0.55)';
        ctx.lineWidth = Math.max(1.4, h * 0.06);
        ctx.lineCap = 'round';
        const arm = Math.sin(time * 10 + person.phase) * h * 0.14;
        ctx.beginPath();
        ctx.moveTo(x - h * 0.15, y - h * 0.48);
        ctx.lineTo(x - h * 0.23, y - h * 0.72 + arm);
        ctx.moveTo(x + h * 0.15, y - h * 0.48);
        ctx.lineTo(x + h * 0.23, y - h * 0.72 - arm);
        ctx.stroke();
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     Court, hoop, net
     ═══════════════════════════════════════════════════════════════ */

  function drawCourt(time) {
    const p0 = project(0, 0);
    const p1 = project(1, 0);
    const p2 = project(1, 1);
    const p3 = project(0, 1);
    const band = view.nearY - view.farY;

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();

    const floor = ctx.createLinearGradient(0, view.farY, 0, view.nearY);
    floor.addColorStop(0, '#1c2d34');
    floor.addColorStop(0.5, '#16252c');
    floor.addColorStop(1, '#0c151b');
    ctx.fillStyle = floor;
    ctx.fill();

    ctx.save();
    ctx.clip();
    const glow = ctx.createRadialGradient(
      view.w * 0.84, view.farY + band * 0.25, 0,
      view.w * 0.84, view.farY + band * 0.25, view.w * 0.6,
    );
    glow.addColorStop(0, 'rgba(255, 140, 60, 0.18)');
    glow.addColorStop(0.5, 'rgba(255, 110, 40, 0.05)');
    glow.addColorStop(1, 'rgba(255, 106, 26, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, view.farY, view.w, band);

    for (const speck of view.specks) {
      const point = project(speck.x, speck.z);
      ctx.fillStyle = speck.warm ? `rgba(255, 180, 120, ${speck.a})` : `rgba(220, 235, 245, ${speck.a})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, speck.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    const line = 'rgba(234, 224, 204, 0.46)';
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(1.1, view.unit * 0.013);
    ctx.lineCap = 'round';

    // Boundary
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.stroke();

    // Half-court line at the left edge
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p0.x, p0.y);
    ctx.stroke();

    // Painted key
    const key = [
      project(0.78, 0.31), project(0.99, 0.31),
      project(0.99, 0.69), project(0.78, 0.69),
    ];
    ctx.beginPath();
    ctx.moveTo(key[0].x, key[0].y);
    for (let i = 1; i < key.length; i += 1) ctx.lineTo(key[i].x, key[i].y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 106, 26, 0.13)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 160, 90, 0.5)';
    ctx.stroke();

    // Free-throw circle
    ctx.beginPath();
    for (let i = 0; i <= 48; i += 1) {
      const a = (i / 48) * TAU;
      const point = project(0.78 + Math.cos(a) * 0.14, 0.5 + Math.sin(a) * 0.14);
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = 'rgba(234, 224, 204, 0.42)';
    ctx.stroke();

    // Three-point arc
    ctx.beginPath();
    const arcStart = Math.PI * 0.56;
    const arcEnd = Math.PI * 1.44;
    for (let i = 0; i <= 44; i += 1) {
      const a = arcStart + (i / 44) * (arcEnd - arcStart);
      const point = project(0.94 + Math.cos(a) * 0.34, 0.5 + Math.sin(a) * 0.34);
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = 'rgba(234, 224, 204, 0.5)';
    ctx.stroke();

    // Corner three lines
    const arcA = project(0.94 + Math.cos(arcStart) * 0.34, 0.5 + Math.sin(arcStart) * 0.34);
    const arcB = project(0.94 + Math.cos(arcEnd) * 0.34, 0.5 + Math.sin(arcEnd) * 0.34);
    const baseA = project(1, 0.5 + Math.sin(arcStart) * 0.34);
    const baseB = project(1, 0.5 + Math.sin(arcEnd) * 0.34);
    ctx.beginPath();
    ctx.moveTo(arcA.x, arcA.y);
    ctx.lineTo(baseA.x, baseA.y);
    ctx.moveTo(arcB.x, arcB.y);
    ctx.lineTo(baseB.x, baseB.y);
    ctx.stroke();

    // Restricted arc under the rim
    ctx.beginPath();
    for (let i = 0; i <= 20; i += 1) {
      const a = Math.PI * 0.56 + (i / 20) * Math.PI * 0.88;
      const point = project(0.94 + Math.cos(a) * 0.075, 0.5 + Math.sin(a) * 0.1);
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = 'rgba(255, 150, 80, 0.34)';
    ctx.stroke();

    // Center-court mark
    ctx.beginPath();
    for (let i = 0; i <= 36; i += 1) {
      const a = (i / 36) * TAU;
      const point = project(0.12 + Math.cos(a) * 0.08, 0.5 + Math.sin(a) * 0.08);
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = 'rgba(234, 224, 204, 0.24)';
    ctx.stroke();

    // Ghost court stencil
    const label = project(0.42, 0.5);
    ctx.save();
    ctx.translate(label.x, label.y - view.unit * 0.02);
    ctx.rotate(-0.02);
    ctx.font = `700 ${Math.max(13, view.unit * 0.26)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(235, 240, 245, 0.045)';
    ctx.fillText('REBORN PARK', 0, 0);
    ctx.restore();

    // Court-side board line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = Math.max(4, view.unit * 0.1);
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y + 2);
    ctx.lineTo(p2.x, p2.y + 2);
    ctx.stroke();

    // Subtle warm flicker across the floor
    const shimmer = (Math.sin(time * 0.5) + 1) * 0.5;
    ctx.fillStyle = `rgba(255, 150, 80, ${0.012 + shimmer * 0.012})`;
    ctx.fillRect(0, view.nearY - 16, view.w, 16);
  }

  function hoopMetrics() {
    const base = project(0.94, 0.5);
    return {
      x: base.x + view.unit * 0.07,
      y: base.y - view.unit * 1.55,
      rimR: view.unit * 0.24,
      ground: base,
    };
  }

  function drawHoopBack() {
    const hoop = hoopMetrics();
    const unit = view.unit;
    const boardW = unit * 0.62;
    const boardH = unit * 0.46;
    const boardLeft = hoop.x + hoop.rimR * 0.85;
    const boardBottom = hoop.y - unit * 0.02;
    const boardTop = boardBottom - boardH;
    const boardCX = boardLeft + boardW / 2;
    const ground = project(0.995, 0.5);

    // Pole
    ctx.strokeStyle = 'rgba(16, 21, 28, 0.98)';
    ctx.lineWidth = Math.max(4, unit * 0.085);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(boardCX + boardW * 0.38, boardTop + boardH * 0.12);
    ctx.lineTo(ground.x, ground.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120, 140, 158, 0.28)';
    ctx.lineWidth = Math.max(1, unit * 0.018);
    ctx.beginPath();
    ctx.moveTo(boardCX + boardW * 0.38 - unit * 0.02, boardTop + boardH * 0.12);
    ctx.lineTo(ground.x - unit * 0.02, ground.y);
    ctx.stroke();

    // Support arm
    ctx.strokeStyle = 'rgba(40, 50, 62, 0.95)';
    ctx.lineWidth = Math.max(2, unit * 0.04);
    ctx.beginPath();
    ctx.moveTo(boardCX + boardW * 0.2, boardTop + boardH * 0.55);
    ctx.lineTo(boardCX + boardW * 0.48, boardTop + boardH * 0.45);
    ctx.stroke();

    // Backboard
    ctx.beginPath();
    ctx.roundRect(boardLeft, boardTop, boardW, boardH, Math.max(2, unit * 0.02));
    const glass = ctx.createLinearGradient(boardLeft, boardTop, boardLeft + boardW, boardTop + boardH);
    glass.addColorStop(0, 'rgba(208, 232, 245, 0.18)');
    glass.addColorStop(0.5, 'rgba(160, 195, 215, 0.08)');
    glass.addColorStop(1, 'rgba(230, 245, 255, 0.2)');
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.strokeStyle = 'rgba(225, 240, 250, 0.6)';
    ctx.lineWidth = Math.max(1.3, unit * 0.014);
    ctx.stroke();

    // Target square
    const squareW = unit * 0.28;
    const squareH = unit * 0.2;
    ctx.strokeStyle = 'rgba(255, 130, 55, 0.9)';
    ctx.lineWidth = Math.max(1.4, unit * 0.017);
    ctx.strokeRect(boardLeft + boardW * 0.5 - squareW * 0.15, boardBottom - squareH - unit * 0.04, squareW, squareH);

    // Board shadow on the pole side
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(boardCX + boardW * 0.3, boardTop + boardH * 0.9, boardW * 0.08, boardH * 0.1);
  }

  function drawRimNet(time) {
    const hoop = hoopMetrics();
    const unit = view.unit;
    const sway = Math.sin(time * 13) * game.netSway * unit * 0.018
      + Math.sin(time * 7.4) * game.netSway * unit * 0.01;
    const netBottom = hoop.y + unit * 0.36;

    // Rim
    ctx.save();
    ctx.shadowColor = 'rgba(255, 106, 26, 0.75)';
    ctx.shadowBlur = unit * 0.16;
    ctx.strokeStyle = '#ff7a2b';
    ctx.lineWidth = Math.max(2.4, unit * 0.045);
    ctx.beginPath();
    ctx.ellipse(hoop.x, hoop.y, hoop.rimR, hoop.rimR * 0.17, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // Rim connection to the board
    ctx.strokeStyle = 'rgba(255, 122, 43, 0.9)';
    ctx.lineWidth = Math.max(1.5, unit * 0.025);
    ctx.beginPath();
    ctx.moveTo(hoop.x + hoop.rimR * 0.9, hoop.y);
    ctx.lineTo(hoop.x + hoop.rimR * 1.35, hoop.y);
    ctx.stroke();

    // Net mesh
    const strands = 12;
    ctx.strokeStyle = 'rgba(236, 246, 255, 0.5)';
    ctx.lineWidth = Math.max(0.8, unit * 0.011);
    for (let i = 0; i < strands; i += 1) {
      const a = (i / strands) * TAU;
      const topX = hoop.x + Math.cos(a) * hoop.rimR;
      const topY = hoop.y + Math.sin(a) * hoop.rimR * 0.17;
      const bottomX = hoop.x + Math.cos(a) * hoop.rimR * 0.56 + sway;
      const bottomY = netBottom + Math.sin(a) * hoop.rimR * 0.1;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(
        hoop.x + Math.cos(a) * hoop.rimR * 0.82 + sway * 0.4,
        hoop.y + unit * 0.2,
        bottomX,
        bottomY,
      );
      ctx.stroke();
    }
    for (let row = 1; row <= 3; row += 1) {
      const k = row / 3;
      const rx = hoop.rimR * (1 - 0.42 * k);
      const ry = hoop.rimR * 0.16 * (1 - 0.42 * k);
      ctx.beginPath();
      ctx.ellipse(hoop.x + sway * k, hoop.y + unit * 0.36 * k, rx, ry, 0, 0, TAU);
      ctx.strokeStyle = `rgba(236, 246, 255, ${0.28 - k * 0.05})`;
      ctx.stroke();
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     The 3v3 park simulation (spectator only)
     ═══════════════════════════════════════════════════════════════ */

  const TEAM_NAMES = ['Orange', 'Blacktop'];
  const GAME_SECONDS = 180;
  const TIME_SCALE = 3;
  const FIXED_STEP = 1 / 60;
  const MAX_STEPS = 6;
  const fx = [];

  const PLAYER_DATA = [
    { name: 'SplashBros', num: 3, team: 0, skin: '#a86f47', hair: '#171310', agility: 1.06 },
    { name: 'DimeRunner', num: 11, team: 0, skin: '#6d452c', hair: '#0f0c0a', agility: 1.12 },
    { name: 'RimContest', num: 24, team: 0, skin: '#c58b60', hair: '#1e1512', agility: 0.92 },
    { name: 'AnkleBully', num: 7, team: 1, skin: '#8d5a3b', hair: '#120e0c', agility: 1.14 },
    { name: 'PostFadeGod', num: 32, team: 1, skin: '#5f3a25', hair: '#0b0908', agility: 0.9 },
    { name: 'CornerBaker', num: 1, team: 1, skin: '#e0ae86', hair: '#2b1c14', agility: 1.01 },
  ];

  const players = PLAYER_DATA.map((data) => ({
    ...data,
    x: 0.4,
    z: 0.5,
    tx: 0.4,
    tz: 0.5,
    run: 0,
    phase: rand(0, TAU),
    face: 1,
    shoot: 0,
    mark: null,
  }));

  const game = {
    poss: 0,
    score: [0, 0],
    quarter: 1,
    clock: GAME_SECONDS,
    shotClock: 14,
    phase: 'inbound',
    pt: 0,
    hype: 0,
    netSway: 0,
    scoreFlash: 0,
    handler: null,
    flight: null,
    passTarget: null,
    reboundTarget: null,
    loose: null,
    reboundTimer: 0,
    nextAction: 1.5,
    driveTime: 1,
    ended: false,
    lastScorer: null,
  };

  function playersOf(team) {
    return players.filter((player) => player.team === team);
  }

  function setupPossession(team, initial = false) {
    const offense = playersOf(team);
    const defense = playersOf(1 - team);
    const spots = [[0.34, 0.5], [0.2, 0.22], [0.6, 0.8]];

    game.poss = team;
    game.shotClock = 14;
    game.phase = 'inbound';
    game.pt = 0;
    game.flight = null;
    game.passTarget = null;
    game.loose = null;
    game.reboundTarget = null;
    game.ended = false;

    offense.forEach((player, index) => {
      const spot = spots[index % spots.length];
      player.tx = clamp(spot[0] + rand(-0.025, 0.045), 0.1, 0.8);
      player.tz = clamp(spot[1] + rand(-0.035, 0.035), 0.12, 0.9);
      player.shoot = 0;
      if (initial) {
        player.x = player.tx;
        player.z = player.tz;
        player.run = 0;
      }
    });

    defense.forEach((player, index) => {
      player.mark = offense[index % offense.length];
      player.tx = clamp(offense[index].x + 0.13, 0.14, 0.93);
      player.tz = clamp(offense[index].z + (index === 2 ? 0.04 : -0.02), 0.1, 0.92);
      if (initial) {
        player.x = clamp(player.tx - 0.03, 0.55, 0.92);
        player.z = player.tz;
        player.run = 0;
      }
    });

    game.handler = offense[0];
    syncHud();
  }

  function assignMarks() {
    const offense = playersOf(game.poss);
    const defense = playersOf(1 - game.poss);
    defense.forEach((player, index) => {
      player.mark = offense[index % offense.length];
    });
  }

  function repositionOffense() {
    const offense = playersOf(game.poss);
    const others = offense.filter((player) => player !== game.handler);
    const spots = [[0.22, 0.22], [0.62, 0.8]];
    others.forEach((player, index) => {
      const spot = spots[index % spots.length];
      player.tx = clamp(spot[0] + rand(-0.035, 0.045), 0.08, 0.84);
      player.tz = clamp(spot[1] + rand(-0.035, 0.035), 0.1, 0.9);
    });
  }

  function beginDribble() {
    if (!game.handler) game.handler = playersOf(game.poss)[0];
    game.phase = 'dribble';
    game.pt = 0;
    game.nextAction = rand(1.0, 2.2);

    const handler = game.handler;
    handler.tx = clamp(0.43 + Math.random() * 0.31, 0.36, 0.82);
    handler.tz = clamp(0.34 + Math.random() * 0.24, 0.3, 0.62);

    repositionOffense();
    assignMarks();
  }

  function chooseAction() {
    const handler = game.handler;
    if (!handler) return;
    const roll = Math.random();
    if (roll < 0.34) passBall();
    else if (roll < 0.64) startDrive();
    else takeShot(handler, false);
  }

  function passBall() {
    if (!game.handler) return;
    const mates = playersOf(game.poss).filter((player) => player !== game.handler);
    if (!mates.length) { takeShot(game.handler, false); return; }
    const target = pick(mates);

    game.phase = 'pass';
    game.pt = 0;
    game.passTarget = target;
    game.flight = {
      type: 'pass',
      from: game.handler,
      to: target,
      t: 0,
      dur: 0.46,
    };
    setCommentary(`${game.handler.name} swings it to ${target.name}.`);
  }

  function startDrive() {
    const handler = game.handler;
    if (!handler) return;
    game.phase = 'drive';
    game.pt = 0;
    game.driveTime = rand(0.9, 1.5);
    handler.tx = clamp(0.8 + rand(-0.03, 0.06), 0.72, 0.9);
    handler.tz = clamp(handler.z + rand(-0.08, 0.08), 0.2, 0.84);
    setCommentary(`${handler.name} puts it on the floor and attacks.`);
  }

  function takeShot(shooter, driveFinish) {
    if (!shooter) return;
    const layup = driveFinish || shooter.x > 0.79;
    const three = !layup && shooter.x < 0.57;
    const chance = layup ? 0.66 : three ? 0.43 : 0.55;
    const make = Math.random() < chance;

    game.phase = 'shot';
    game.pt = 0;
    game.flight = {
      type: 'shot',
      from: shooter,
      shooter,
      t: 0,
      dur: layup ? 0.56 : 0.92,
      make,
      three,
      layup,
      points: three ? 3 : 2,
    };
    shooter.shoot = 1;

    if (three) setCommentary(`${shooter.name} lets it fly from deep…`);
    else if (layup) setCommentary(`${shooter.name} rises at the rim…`);
    else setCommentary(`${shooter.name} pulls up from midrange…`);
  }

  function updateFlight(dt) {
    const flight = game.flight;
    if (!flight) return;
    flight.t = Math.min(1, flight.t + dt / flight.dur);
    if (flight.t < 1) return;

    if (flight.type === 'pass') {
      game.handler = game.passTarget;
      game.flight = null;
      beginDribble();
    } else if (flight.type === 'shot') {
      resolveShot(flight);
    }
  }

  function resolveShot(flight) {
    const shooter = flight.shooter;
    game.flight = null;
    if (shooter) shooter.shoot = 0;

    if (flight.make) {
      game.score[shooter.team] += flight.points;
      game.hype = Math.min(1.5, game.hype + (flight.three ? 1.15 : 0.85));
      game.netSway = 1;
      game.scoreFlash = 1;
      game.lastScorer = shooter;
      game.phase = 'scored';
      game.pt = 0;
      game.handler = null;

      if (flight.three) {
        setCommentary(`SPLASH. ${shooter.name} buries it from three.`);
      } else if (flight.layup) {
        setCommentary(`${shooter.name} finishes through contact at the rim.`);
      } else {
        setCommentary(`${shooter.name} knocks down the jumper.`);
      }
      addFeed(
        flight.three ? '💦' : '🏀',
        shooter.name,
        flight.three ? 'splashes a three from deep' : 'buckets in the paint',
        shooter.team === 0 ? '#ff6a1a' : '#38e8ff',
      );
      flashHud();
      syncHud();
    } else {
      game.hype = Math.min(1.1, game.hype + 0.32);
      setCommentary(flight.layup
        ? `${shooter.name} misses at the rim — live ball!`
        : `${shooter.name} hits the iron — rebound!`);
      addFeed('🧱', shooter.name, 'misses — rebound live', shooter.team === 0 ? '#ff6a1a' : '#38e8ff');
      startRebound(shooter);
      syncHud();
    }
  }

  function startRebound(shooter) {
    const spot = {
      x: clamp(0.94 - rand(0.14, 0.38), 0.34, 0.8),
      z: clamp(rand(0.25, 0.8), 0.12, 0.9),
    };
    const defense = playersOf(1 - shooter.team);
    const offense = playersOf(shooter.team);
    const rebounder = Math.random() < 0.62 ? pick(defense) : pick(offense);

    game.loose = spot;
    game.reboundTarget = rebounder;
    game.phase = 'rebound';
    game.pt = 0;
    game.reboundTimer = 0;
    game.handler = null;
    game.flight = { type: 'miss', t: 0, dur: 0.55 };

    players.forEach((player) => {
      if (player === rebounder) {
        player.tx = spot.x;
        player.tz = spot.z;
      } else {
        player.tx = clamp(spot.x + rand(-0.13, 0.15), 0.12, 0.9);
        player.tz = clamp(spot.z + rand(-0.13, 0.13), 0.12, 0.9);
      }
    });
  }

  function updateRebound(dt) {
    if (!game.flight) {
      game.phase = 'loose';
      game.pt = 0;
      return;
    }
    game.flight.t += dt / 0.55;
    if (game.flight.t >= 1) {
      game.flight = null;
      game.phase = 'loose';
      game.pt = 0;
    }
  }

  function updateLoose(dt) {
    game.pt += dt;
    const rebounder = game.reboundTarget;
    if (!rebounder || !game.loose) return;
    const distance = Math.hypot(rebounder.x - game.loose.x, rebounder.z - game.loose.z);

    if (distance < 0.06 || game.pt > 2.4) {
      game.handler = rebounder;
      game.poss = rebounder.team;
      game.shotClock = 14;
      game.loose = null;
      game.reboundTarget = null;
      beginDribble();
      setCommentary(`${rebounder.name} comes down with it. ${TEAM_NAMES[rebounder.team]} ball.`);
      addFeed('🙌', rebounder.name, 'grabs the rebound', rebounder.team === 0 ? '#ff6a1a' : '#38e8ff');
    }
  }

  function updatePlayers(dt) {
    const offense = game.poss;

    players.forEach((player) => {
      if (player.team !== offense) {
        if (!player.mark || player.mark.team !== offense) {
          let nearest = null;
          let best = Infinity;
          playersOf(offense).forEach((target) => {
            const d = Math.hypot(target.x - player.x, target.z - player.z);
            if (d < best) { best = d; nearest = target; }
          });
          player.mark = nearest;
        }
        if (player.mark) {
          const defenderIndex = playersOf(1 - offense).indexOf(player);
          const depthOffset = defenderIndex === 0 ? -0.08 : defenderIndex === 1 ? 0.12 : 0.2;
          player.tx = clamp(player.mark.x + 0.11, 0.08, 0.94);
          player.tz = clamp(player.mark.z + depthOffset, 0.08, 0.93);
        }
      }

      const dx = player.tx - player.x;
      const dz = player.tz - player.z;
      const distance = Math.hypot(dx, dz);
      const speed = (player.team === offense ? 0.56 : 0.5) * player.agility;

      if (distance > 0.0015) {
        const step = Math.min(distance, speed * dt);
        player.x += (dx / distance) * step;
        player.z += (dz / distance) * step;
        player.run = Math.min(1, player.run + dt * 8);
      } else {
        player.run = Math.max(0, player.run - dt * 5);
      }

      player.x = clamp(player.x, 0.05, 0.93);
      player.z = clamp(player.z, 0.06, 0.94);
      player.face = player.team === offense ? 1 : -1;
      player.shoot = Math.max(0, player.shoot - dt * 1.7);
    });
  }

  function updatePhase(dt) {
    game.pt += dt;

    switch (game.phase) {
      case 'inbound':
        if (game.pt > 0.65) beginDribble();
        break;
      case 'dribble':
        if (game.pt > game.nextAction) chooseAction();
        break;
      case 'drive':
        if (game.pt > game.driveTime) takeShot(game.handler, true);
        break;
      case 'pass':
      case 'shot':
        updateFlight(dt);
        break;
      case 'scored':
        if (game.pt > 1.45) setupPossession(1 - game.poss);
        break;
      case 'rebound':
        updateRebound(dt);
        break;
      case 'loose':
        updateLoose(dt);
        break;
      default:
        break;
    }
  }

  function updateGame(dt) {
    if (game.ended) return;

    game.clock -= dt * TIME_SCALE;
    if (game.clock <= 0) {
      handleQuarterEnd();
      return;
    }

    if (['inbound', 'dribble', 'drive', 'pass'].includes(game.phase)) {
      game.shotClock -= dt;
      if (game.shotClock <= 0) {
        turnover('Shot clock violation');
        return;
      }
    }

    game.hype = Math.max(0, game.hype - dt * 0.85);
    game.netSway = Math.max(0, game.netSway - dt * 1.7);
    game.scoreFlash = Math.max(0, game.scoreFlash - dt * 2.2);

    updatePlayers(dt);
    updatePhase(dt);
    syncHud();
  }

  function handleQuarterEnd() {
    if (game.quarter >= 4) {
      endGame();
      return;
    }
    game.quarter += 1;
    game.clock = GAME_SECONDS;
    game.shotClock = 14;
    setupPossession(1 - game.poss);
    setCommentary(`End of Q${game.quarter - 1}. ${TEAM_NAMES[0]} ${game.score[0]} — ${game.score[1]} ${TEAM_NAMES[1]}.`);
    addFeed('⏱️', 'Park', `Q${game.quarter} underway`, '#38e8ff');
    showToast(`Q${game.quarter} underway`);
    syncHud(true);
  }

  function turnover(reason) {
    addFeed('⏱️', 'Park', reason, '#ffb347');
    showToast(reason);
    const next = 1 - game.poss;
    setupPossession(next);
    setCommentary(`${reason}. ${TEAM_NAMES[next]} ball.`);
    syncHud();
  }

  function endGame() {
    game.ended = true;
    game.phase = 'final';
    game.handler = null;
    game.flight = null;

    const a = game.score[0];
    const b = game.score[1];
    $('#finalA').textContent = a;
    $('#finalB').textContent = b;

    let line = 'Deadlocked at the final horn. Run it back.';
    if (a !== b) {
      const winner = a > b ? TEAM_NAMES[0] : TEAM_NAMES[1];
      line = `${winner} takes the run, ${Math.max(a, b)}–${Math.min(a, b)}. The sideline approves.`;
    }
    $('#finalLine').textContent = line;
    parkFinal.hidden = false;

    addFeed('🏁', 'Park', `Final — ${a}–${b}`, '#ff6a1a');
    setCommentary('Final horn. Great run from the sideline.');
    syncHud(true);
  }

  function resetGame() {
    game.score = [0, 0];
    game.quarter = 1;
    game.clock = GAME_SECONDS;
    game.shotClock = 14;
    game.hype = 0;
    game.netSway = 0;
    game.scoreFlash = 0;
    game.ended = false;
    game.phase = 'inbound';
    game.pt = 0;
    game.flight = null;
    game.handler = null;
    game.loose = null;
    game.reboundTarget = null;
    game.lastScorer = null;
    game.passTarget = null;

    fx.length = 0;
    parkFinal.hidden = true;
    parkFeed.replaceChildren();
    players.forEach((player) => {
      player.run = 0;
      player.shoot = 0;
      player.mark = null;
    });

    setupPossession(0, true);
    syncHud(true);
    setCommentary('Tip-off. You are courtside — camera locked to the sideline.');
  }

  /* ── HUD, commentary & feed ─────────────────────────────────── */

  let lastHud = { a: -1, b: -1, clock: '', quarter: 0, shot: -1 };

  function formatClock(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function syncHud(force = false) {
    const a = game.score[0];
    const b = game.score[1];
    if (force || a !== lastHud.a) { hudScoreA.textContent = String(a); lastHud.a = a; }
    if (force || b !== lastHud.b) { hudScoreB.textContent = String(b); lastHud.b = b; }

    const clock = formatClock(game.clock);
    if (force || clock !== lastHud.clock) { hudClock.textContent = clock; lastHud.clock = clock; }

    if (force || game.quarter !== lastHud.quarter) {
      hudQuarter.textContent = `Q${game.quarter}`;
      lastHud.quarter = game.quarter;
    }

    const shot = Math.max(0, Math.ceil(game.shotClock));
    if (force || shot !== lastHud.shot) {
      hudShot.textContent = String(shot);
      hudShot.classList.toggle('is-low', shot <= 4);
      lastHud.shot = shot;
    }
  }

  function flashHud() {
    if (!hudScore) return;
    hudScore.classList.remove('is-flash');
    void hudScore.offsetWidth;
    hudScore.classList.add('is-flash');
    setTimeout(() => hudScore.classList.remove('is-flash'), 700);
  }

  function setCommentary(text) {
    if (!commentaryText) return;
    commentaryText.textContent = text;
    commentaryText.classList.remove('is-new');
    void commentaryText.offsetWidth;
    commentaryText.classList.add('is-new');
  }

  function addFeed(emoji, name, action, color) {
    if (!parkFeed) return;
    const item = document.createElement('li');
    const icon = document.createElement('span');
    icon.className = 'feed-emoji';
    icon.textContent = emoji;
    icon.style.setProperty('--fc', color || '#ff6a1a');
    const text = document.createElement('span');
    text.className = 'feed-text';
    const bold = document.createElement('b');
    bold.textContent = name;
    text.append(bold, document.createTextNode(` ${action}`));
    item.append(icon, text);
    parkFeed.prepend(item);
    while (parkFeed.children.length > 5) parkFeed.lastElementChild.remove();
  }

  function spawnEmoteFx(emoji) {
    if (!view.w) return;
    const count = reduceMotion ? 1 : 5;
    for (let i = 0; i < count; i += 1) {
      fx.push({
        emoji,
        x: view.w * 0.06 + rand(0, view.w * 0.16),
        y: view.nearY - rand(0, view.unit * 0.5),
        vx: rand(-14, 20),
        vy: -rand(32, 74),
        life: -i * 0.09,
        max: rand(1.4, 2.1),
        rot: rand(-0.4, 0.4),
        spin: rand(-0.8, 0.8),
      });
    }
  }

  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i -= 1) {
      const item = fx[i];
      item.life += dt;
      if (item.life > item.max) { fx.splice(i, 1); continue; }
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.rot += item.spin * dt;
      item.vy += 18 * dt;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     Players, ball, effects & the render loop
     ═══════════════════════════════════════════════════════════════ */

  function playerHeight(player) {
    return view.unit * (0.74 + player.z * 0.42) * 0.97;
  }

  function playerFoot(player) {
    return project(player.x, player.z);
  }

  function handScreen(player) {
    const foot = playerFoot(player);
    const h = playerHeight(player);
    return {
      x: foot.x + h * 0.23 * (player.face || 1),
      y: foot.y - h * 0.44,
      z: player.z,
    };
  }

  function drawArm(shoulderX, shoulderY, handX, handY, bend, h, skin, jersey) {
    const elbowX = (shoulderX + handX) / 2 + bend;
    const elbowY = (shoulderY + handY) / 2 + h * 0.045;
    ctx.strokeStyle = skin;
    ctx.lineWidth = Math.max(2.5, h * 0.058);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.quadraticCurveTo(elbowX, elbowY, handX, handY);
    ctx.stroke();

    ctx.fillStyle = jersey;
    ctx.beginPath();
    ctx.arc(shoulderX, shoulderY, Math.max(1.5, h * 0.045), 0, TAU);
    ctx.fill();

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(handX, handY, Math.max(1.2, h * 0.032), 0, TAU);
    ctx.fill();
  }

  function drawPlayer(player, time) {
    const foot = playerFoot(player);
    const h = playerHeight(player);
    const unit = view.unit;
    const swing = Math.sin(time * 11 + player.phase);
    const run = player.run;
    const stride = swing * run;
    const bob = Math.abs(swing) * h * 0.019 * run;
    const x = foot.x;
    const y = foot.y - bob;
    const facing = player.face || 1;

    const isOrange = player.team === 0;
    const skin = player.skin;
    const jersey = isOrange ? '#ff6a1a' : '#203443';
    const trim = isOrange ? '#ffd0a6' : '#63ecff';
    const shorts = isOrange ? '#141b24' : '#0a1016';
    const shoes = isOrange ? '#f4f6fa' : '#d6f7ff';
    const numberColor = isOrange ? '#2b1205' : '#dff9ff';

    // Floor shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(foot.x, foot.y + h * 0.02, h * 0.33, h * 0.085, 0, 0, TAU);
    ctx.fill();

    // Ball-handler ring
    if (player === game.handler && game.phase !== 'scored') {
      ctx.strokeStyle = 'rgba(255, 154, 74, 0.4)';
      ctx.lineWidth = Math.max(1.2, h * 0.016);
      ctx.beginPath();
      ctx.ellipse(foot.x, foot.y + h * 0.02, h * 0.35, h * 0.095, 0, 0, TAU);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(x, y);

    const hipY = -h * 0.46;
    const kneeY = -h * 0.25;
    const ankleY = -h * 0.015;
    const legWidth = Math.max(2.6, h * 0.071);

    // Legs
    ctx.lineCap = 'round';
    ctx.strokeStyle = skin;
    ctx.lineWidth = legWidth;
    ctx.beginPath();
    ctx.moveTo(-h * 0.075, hipY);
    ctx.quadraticCurveTo(-h * 0.105 + stride * h * 0.12, kneeY, -h * 0.13 + stride * h * 0.24, ankleY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h * 0.075, hipY);
    ctx.quadraticCurveTo(h * 0.105 - stride * h * 0.12, kneeY, h * 0.13 - stride * h * 0.24, ankleY);
    ctx.stroke();

    // Shoes
    ctx.fillStyle = shoes;
    ctx.beginPath();
    ctx.ellipse(-h * 0.13 + stride * h * 0.24 + h * 0.015 * facing, ankleY + h * 0.008, h * 0.07, h * 0.027, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(h * 0.13 - stride * h * 0.24 + h * 0.015 * facing, ankleY + h * 0.008, h * 0.07, h * 0.027, 0, 0, TAU);
    ctx.fill();

    // Shorts
    ctx.fillStyle = shorts;
    ctx.beginPath();
    ctx.moveTo(-h * 0.16, -h * 0.5);
    ctx.lineTo(h * 0.16, -h * 0.5);
    ctx.lineTo(h * 0.145, -h * 0.29);
    ctx.quadraticCurveTo(h * 0.05, -h * 0.255, 0, -h * 0.29);
    ctx.quadraticCurveTo(-h * 0.05, -h * 0.255, -h * 0.145, -h * 0.29);
    ctx.closePath();
    ctx.fill();

    // Shorts trim
    ctx.strokeStyle = isOrange ? 'rgba(255, 160, 90, 0.55)' : 'rgba(99, 236, 255, 0.4)';
    ctx.lineWidth = Math.max(1, h * 0.013);
    ctx.beginPath();
    ctx.moveTo(-h * 0.152, -h * 0.46);
    ctx.lineTo(-h * 0.14, -h * 0.3);
    ctx.moveTo(h * 0.152, -h * 0.46);
    ctx.lineTo(h * 0.14, -h * 0.3);
    ctx.stroke();

    // Torso / jersey
    ctx.fillStyle = jersey;
    ctx.beginPath();
    ctx.moveTo(-h * 0.13, -h * 0.48);
    ctx.lineTo(-h * 0.188, -h * 0.755);
    ctx.quadraticCurveTo(0, -h * 0.83, h * 0.188, -h * 0.755);
    ctx.lineTo(h * 0.13, -h * 0.48);
    ctx.closePath();
    ctx.fill();

    // Jersey trim
    ctx.strokeStyle = trim;
    ctx.lineWidth = Math.max(0.9, h * 0.015);
    ctx.beginPath();
    ctx.moveTo(-h * 0.075, -h * 0.79);
    ctx.lineTo(0, -h * 0.73);
    ctx.lineTo(h * 0.075, -h * 0.79);
    ctx.stroke();
    ctx.strokeStyle = isOrange ? 'rgba(255, 208, 166, 0.45)' : 'rgba(99, 236, 255, 0.4)';
    ctx.lineWidth = Math.max(0.8, h * 0.011);
    ctx.beginPath();
    ctx.moveTo(-h * 0.172, -h * 0.71);
    ctx.lineTo(-h * 0.14, -h * 0.52);
    ctx.moveTo(h * 0.172, -h * 0.71);
    ctx.lineTo(h * 0.14, -h * 0.52);
    ctx.stroke();

    // Number
    if (h > 34) {
      ctx.font = `700 ${Math.max(8, h * 0.16)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = numberColor;
      ctx.fillText(String(player.num), 0, -h * 0.6);
    }

    // Arms
    const shoulderY = -h * 0.755;
    if (player.shoot > 0.05) {
      drawArm(-h * 0.16, shoulderY, -h * 0.075, -h * 1.05, -h * 0.04, h, skin, jersey);
      drawArm(h * 0.16, shoulderY, h * 0.075, -h * 1.05, h * 0.04, h, skin, jersey);
    } else if (player === game.handler) {
      const ballBounce = Math.abs(Math.sin(time * 8.5 + player.phase)) * h * 0.14;
      drawArm(-h * 0.16, shoulderY, -h * 0.2, -h * 0.54, -h * 0.045, h, skin, jersey);
      drawArm(h * 0.16, shoulderY, h * 0.27, -h * 0.4 + ballBounce, h * 0.02, h, skin, jersey);
    } else {
      const armSwing = swing * run * h * 0.12;
      drawArm(-h * 0.17, shoulderY, -h * 0.21 + armSwing, -h * 0.45, -h * 0.05, h, skin, jersey);
      drawArm(h * 0.17, shoulderY, h * 0.21 - armSwing, -h * 0.45, h * 0.05, h, skin, jersey);
    }

    // Neck & head
    ctx.strokeStyle = skin;
    ctx.lineWidth = Math.max(2, h * 0.055);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.79);
    ctx.lineTo(0, -h * 0.85);
    ctx.stroke();

    const headX = h * 0.012 * facing;
    const headY = -h * 0.9;
    const headR = h * 0.095;

    ctx.fillStyle = player.hair;
    ctx.beginPath();
    ctx.arc(headX, headY - headR * 0.08, headR * 1.04, 0, TAU);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(headX, headY + headR * 0.05, headR * 0.92, 0, TAU);
    ctx.fill();

    // Headband accent for a little park flavor
    ctx.strokeStyle = isOrange ? 'rgba(255, 180, 120, 0.8)' : 'rgba(99, 236, 255, 0.8)';
    ctx.lineWidth = Math.max(0.8, h * 0.014);
    ctx.beginPath();
    ctx.arc(headX, headY + headR * 0.05, headR * 0.92, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();

    // Rim light from the setting sun
    ctx.strokeStyle = 'rgba(255, 190, 130, 0.22)';
    ctx.lineWidth = Math.max(0.8, h * 0.012);
    ctx.beginPath();
    ctx.arc(headX, headY + headR * 0.05, headR * 0.82, Math.PI * 1.62, Math.PI * 2.02);
    ctx.stroke();

    ctx.restore();

    // Soft glow under the rim light
    if (player === game.lastScorer && game.hype > 0.8) {
      ctx.fillStyle = `rgba(255, 150, 70, ${0.05 + Math.sin(time * 8) * 0.03})`;
      ctx.beginPath();
      ctx.arc(foot.x, foot.y - h * 0.5, h * 0.7, 0, TAU);
      ctx.fill();
    }

    // Keep unit referenced for linters/readability
    void unit;
  }

  function drawPlayers(time) {
    const sorted = players.slice().sort((a, b) => a.z - b.z);
    sorted.forEach((player) => drawPlayer(player, time));
  }

  function bezierBall(from, ctrl, to, t, time, z, radius) {
    const mt = 1 - t;
    return {
      x: mt * mt * from.x + 2 * mt * t * ctrl.x + t * t * to.x,
      y: mt * mt * from.y + 2 * mt * t * ctrl.y + t * t * to.y,
      z,
      r: radius,
      rot: time * 9 + t * 6,
    };
  }

  function ballPosition(time) {
    const unit = view.unit;

    if (game.phase === 'scored') {
      const hoop = hoopMetrics();
      const fall = clamp(game.pt / 0.55, 0, 1);
      return {
        x: hoop.x + Math.sin(game.pt * 18) * unit * 0.02,
        y: hoop.y + unit * 0.12 + fall * unit * 0.5,
        z: 0.5,
        r: unit * 0.075,
        rot: time * 8,
      };
    }

    const flight = game.flight;
    if (flight) {
      if (flight.type === 'pass') {
        const from = handScreen(flight.from);
        const to = handScreen(flight.to);
        const ctrl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - unit * 0.4 };
        return bezierBall(from, ctrl, to, flight.t, time, (from.z + to.z) / 2, unit * 0.072);
      }
      if (flight.type === 'shot') {
        const hoop = hoopMetrics();
        const from = handScreen(flight.shooter);
        const to = { x: hoop.x, y: hoop.y };
        const peak = unit * (0.85 + Math.abs(hoop.x - from.x) / Math.max(1, view.w) * 1.5);
        const ctrl = { x: (from.x + to.x) / 2 + unit * 0.06, y: Math.min(from.y, to.y) - peak };
        return bezierBall(from, ctrl, to, flight.t, time, 0.5, unit * 0.075);
      }
      if (flight.type === 'miss' && game.loose) {
        const hoop = hoopMetrics();
        const spot = project(game.loose.x, game.loose.z);
        const from = { x: hoop.x, y: hoop.y };
        const to = { x: spot.x, y: spot.y - unit * 0.08 };
        const ctrl = { x: to.x + unit * 0.22, y: Math.min(from.y, to.y) - unit * 0.38 };
        return bezierBall(from, ctrl, to, flight.t, time, 0.5, unit * 0.075);
      }
    }

    if (game.loose && (game.phase === 'rebound' || game.phase === 'loose')) {
      const spot = project(game.loose.x, game.loose.z);
      const bounce = Math.abs(Math.sin(time * 8.5)) * unit * 0.16;
      return { x: spot.x, y: spot.y - unit * 0.08 - bounce, z: game.loose.z, r: unit * 0.075, rot: time * 7 };
    }

    if (game.handler) {
      const handler = game.handler;
      const hand = handScreen(handler);
      const h = playerHeight(handler);
      const bounce = Math.abs(Math.sin(time * 8.5 + handler.phase)) * h * 0.17;
      return {
        x: hand.x + h * 0.015,
        y: hand.y + h * 0.11 + bounce,
        z: handler.z + 0.01,
        r: h * 0.075,
        rot: time * 6,
      };
    }

    const middle = project(0.5, 0.5);
    return { x: middle.x, y: middle.y - unit * 0.4, z: 0.5, r: unit * 0.075, rot: time * 5 };
  }

  function drawBallSprite(x, y, radius, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const gradient = ctx.createRadialGradient(-radius * 0.32, -radius * 0.38, radius * 0.08, 0, 0, radius * 1.02);
    gradient.addColorStop(0, '#ffbe7a');
    gradient.addColorStop(0.4, '#ff8a2b');
    gradient.addColorStop(0.8, '#f05a0b');
    gradient.addColorStop(1, '#a93200');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(45, 18, 6, 0.85)';
    ctx.lineWidth = Math.max(1, radius * 0.15);
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.bezierCurveTo(radius * 0.8, -radius * 0.35, radius * 0.8, radius * 0.35, 0, radius);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.bezierCurveTo(-radius * 0.8, -radius * 0.35, -radius * 0.8, radius * 0.35, 0, radius);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 190, 130, 0.45)';
    ctx.lineWidth = Math.max(0.7, radius * 0.07);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.96, Math.PI * 1.05, Math.PI * 1.65);
    ctx.stroke();
    ctx.restore();
  }

  function drawBall(time) {
    const ball = ballPosition(time);
    drawBallSprite(ball.x, ball.y, ball.r, ball.rot);
  }

  function drawFx() {
    for (const item of fx) {
      if (item.life < 0) continue;
      const alpha = clamp(1 - item.life / item.max, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot);
      ctx.font = `${Math.max(16, view.unit * 0.3)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.emoji, 0, 0);
      ctx.restore();
    }
  }

  function drawScoreFlash() {
    if (game.scoreFlash <= 0) return;
    const hoop = hoopMetrics();
    const strength = game.scoreFlash;

    const glow = ctx.createRadialGradient(hoop.x, hoop.y, 0, hoop.x, hoop.y, view.unit * 1.7);
    glow.addColorStop(0, `rgba(255, 176, 96, ${strength * 0.38})`);
    glow.addColorStop(0.45, `rgba(255, 120, 50, ${strength * 0.13})`);
    glow.addColorStop(1, 'rgba(255, 106, 26, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(hoop.x, hoop.y, view.unit * 1.7, 0, TAU);
    ctx.fill();

    const progress = 1 - strength;
    ctx.strokeStyle = `rgba(255, 190, 120, ${strength * 0.5})`;
    ctx.lineWidth = Math.max(1, view.unit * 0.018);
    ctx.beginPath();
    ctx.arc(hoop.x, hoop.y, view.unit * (0.3 + progress * 1.1), 0, TAU);
    ctx.stroke();
  }

  function render(time) {
    if (!view.w || !view.h) return;
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.drawImage(bgCanvas, 0, 0, view.w, view.h);
    drawCrowd(time);
    drawCourt(time);
    drawHoopBack();
    drawPlayers(time);
    drawBall(time);
    drawRimNet(time);
    drawFx();
    drawScoreFlash();
  }

  function startLoop() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.last = performance.now();
    state.acc = 0;

    const frame = (now) => {
      if (!state.open) { state.raf = 0; return; }
      const dt = Math.min((now - (state.last || now)) / 1000, 0.1);
      state.last = now;
      const time = now / 1000;

      if (state.running && !state.paused && !game.ended) {
        // Fixed 60 Hz simulation: gameplay stays identical at any refresh rate.
        state.acc = Math.min(state.acc + dt, FIXED_STEP * MAX_STEPS);
        let steps = 0;
        while (state.acc >= FIXED_STEP && steps < MAX_STEPS) {
          updateGame(FIXED_STEP);
          state.acc -= FIXED_STEP;
          steps += 1;
        }
      } else {
        state.acc = 0;
      }

      updateFx(dt);
      render(time);
      state.raf = requestAnimationFrame(frame);
    };

    state.raf = requestAnimationFrame(frame);
  }
})();
