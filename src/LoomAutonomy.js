/**
 * LoomAutonomy — a small utility-driven mind for Loom the fox-spirit.
 *
 * The engine is deliberately free of DOM, three.js and game imports. The host
 * gives it two things:
 *
 *   1. a live `context` snapshot (ink, clutter, islands, boids, catalogue…)
 *   2. action callbacks (`dream`, `tidy`, `tend`, `scout`, `swarm`, `excavate`)
 *
 * It then decides what Loom wants to do next, learns from what the player
 * dreams / remixes / banishes, and reports a human-readable thought + journal
 * entry for the HUD.
 *
 * Design goals:
 *   - observable autonomy (short planning cadence, visible intents)
 *   - taste learning (player choices bend Loom's future dream choices)
 *   - sandbox stewardship (Loom tidies its own clutter + loose dream lint)
 *   - no runaway behaviour (cooldowns, ink floor, clutter thresholds)
 */

export const DREAM_LIBRARY = [
  { fn: 'tree',      word: 'dream tree',             icon: '🌳', name: 'dream tree',      tags: ['cozy', 'nature'] },
  { fn: 'forest',    word: 'whispering forest',      icon: '🌲', name: 'whispering forest', tags: ['cozy', 'nature', 'wild'] },
  { fn: 'mushroom',  word: 'glowing mushroom grove', icon: '🍄', name: 'mushroom grove',  tags: ['nature', 'glow'] },
  { fn: 'crystal',   word: 'singing crystal field',  icon: '💎', name: 'crystal field',   tags: ['glow', 'wild'] },
  { fn: 'house',     word: 'cozy house',             icon: '🏠', name: 'cozy house',      tags: ['cozy'] },
  { fn: 'village',   word: 'cozy village',           icon: '🏘️', name: 'cozy village',    tags: ['cozy'] },
  { fn: 'castle',    word: 'storybook castle',       icon: '🏰', name: 'storybook castle', tags: ['cozy', 'wild'] },
  { fn: 'volcano',   word: 'grumbly volcano',        icon: '🌋', name: 'volcano',         tags: ['wild'] },
  { fn: 'lake',      word: 'glassy lake',            icon: '🌊', name: 'glassy lake',     tags: ['nature', 'cozy'] },
  { fn: 'rainbow',   word: 'rainbow arch',           icon: '🌈', name: 'rainbow arch',    tags: ['glow', 'sky'] },
  { fn: 'jellyfish', word: 'dream jellyfish drift',  icon: '🎐', name: 'jellyfish drift', tags: ['glow', 'sky'] },
  { fn: 'lanterns',  word: 'floating lanterns',      icon: '🏮', name: 'floating lanterns', tags: ['cozy', 'glow', 'sky'] },
  { fn: 'windmill',  word: 'sleepy windmill',        icon: '🌬️', name: 'sleepy windmill', tags: ['cozy', 'nature'] },
  { fn: 'cactus',    word: 'tiny desert',            icon: '🌵', name: 'tiny desert',     tags: ['wild', 'nature'] },
  { fn: 'garden',    word: 'flower garden',          icon: '🌸', name: 'flower garden',   tags: ['cozy', 'nature'] },
  { fn: 'ufo',       word: 'curious UFO',            icon: '🛸', name: 'curious UFO',     tags: ['sky', 'wild'] },
  { fn: 'golem',     word: 'friendly moss golem',    icon: '🪨', name: 'moss golem',      tags: ['cozy', 'wild'] },
  { fn: 'bridge',    word: 'light bridge',           icon: '🌉', name: 'light bridge',    tags: ['sky', 'wild'] },
  { fn: 'orb',       word: 'wild dream orb',         icon: '🔮', name: 'wild dream orb',  tags: ['glow', 'wild'] },
];

export const TRAITS = {
  cozy:   { icon: '🏡', label: 'Cozy' },
  glow:   { icon: '✨', label: 'Glowing' },
  wild:   { icon: '🌋', label: 'Wild' },
  nature: { icon: '🌿', label: 'Nature' },
  sky:    { icon: '🛰️', label: 'Skyward' },
};

export const LEVELS = [
  { title: 'Reads the room',    desc: 'Tidies loose dream-stuff before it piles up.' },
  { title: "Explorer's nose",   desc: 'Scouts quiet islands on soft paws.' },
  { title: 'Garden paws',       desc: 'Tends fading bio-luminescence.' },
  { title: 'Swarm conductor',   desc: 'Deploys and directs the Loomings.' },
  { title: 'Memory keeper',     desc: 'Excavates forgotten seals on its own.' },
  { title: 'Sandbox steward',   desc: 'Balances ink, tidiness and wonder.' },
  { title: 'Dream cartographer', desc: 'Reads the whole archipelago at a glance.' },
  { title: 'Quiet architect',   desc: 'Leaves more room for your own dreams.' },
  { title: 'Star librarian',    desc: 'Keeps every learned preference close.' },
  { title: 'Loomweaver',        desc: 'Autonomy and intuition move as one.' },
];

const DREAM_META = Object.fromEntries(DREAM_LIBRARY.map((d) => [d.fn, d]));

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const COOLDOWN = {
  tidy: 14,
  dream: 0,
  scout: 32,
  tend: 24,
  swarm: 42,
  excavate: 52,
};

const MODE_LABEL = {
  tidy: 'tidying',
  dream: 'dreaming',
  scout: 'scouting',
  tend: 'tending',
  swarm: 'conducting',
  excavate: 'remembering',
};

const ACTION_ICON = {
  tidy: '🧹',
  dream: '💭',
  scout: '🧭',
  tend: '🌿',
  swarm: '🐝',
  excavate: '🗝️',
};

const IDLE_LINES = [
  'Watching the tide count its own footsteps.',
  'Listening for dreams that have not been dreamed yet.',
  'Keeping one ear on the sandbox, one ear on you.',
  'The islands are humming. I am humming back.',
  'Counting stars. The number keeps changing.',
  'Checking that every dream has room to breathe.',
];

const INSIGHT_STEPS = [12, 28, 48, 74, 106, 144, 188, 238, 294, 356];

export class LoomAutonomy {
  constructor({ actions = {}, onLevelUp = null } = {}) {
    this.actions = actions;
    this.onLevelUp = onLevelUp;

    this.auto = true;
    this._clock = 0;
    this._nextPlan = 2.4;
    this._cooldowns = {};
    this._lastDream = -999;
    this._lastFocus = -999;

    this.level = 1;
    this.insights = 0;
    this.prefs = {};
    this.traits = {};
    this.seen = new Set();
    this.islandAffinity = {};
    this.tutored = {};

    this.stats = {
      playerDreams: 0, remixes: 0, pets: 0, banished: 0,
      autoDreams: 0, tidies: 0, cleaned: 0, tended: 0,
      scouted: 0, excavations: 0, swarm: 0, decisions: 0,
    };

    this.journal = [];
    this.drives = { curiosity: 0.5, order: 0.2, care: 0.4 };
    this.thought = 'Reading the sandbox…';
    this.mode = 'observing';
    this.lastClutter = 0;
    this.lastTidiness = 1;
    this._recentDreams = [];
  }

  /* ------------------------------------------------------------------ */
  /* persistence                                                        */
  /* ------------------------------------------------------------------ */

  restore(data) {
    if (!data || typeof data !== 'object') return;
    this.auto = data.auto !== false;
    this.level = clamp(Math.round(Number(data.level) || 1), 1, 99);
    this.insights = Math.max(0, Number(data.insights) || 0);
    this.prefs = data.prefs && typeof data.prefs === 'object' ? data.prefs : {};
    this.traits = data.traits && typeof data.traits === 'object' ? data.traits : {};
    this.seen = new Set(Array.isArray(data.seen) ? data.seen.filter((x) => DREAM_META[x]) : []);
    this.islandAffinity = data.islandAffinity && typeof data.islandAffinity === 'object' ? data.islandAffinity : {};
    this.tutored = Object.assign({}, this.tutored, data.tutored && typeof data.tutored === 'object' ? data.tutored : {});
    this.stats = Object.assign({}, this.stats, data.stats && typeof data.stats === 'object' ? data.stats : {});
    this.journal = Array.isArray(data.journal) ? data.journal.slice(0, 12) : [];
    this._recentDreams = Array.isArray(data.recentDreams) ? data.recentDreams.filter((x) => DREAM_META[x]) : [];
  }

  serialize() {
    return {
      v: 1,
      auto: this.auto,
      level: this.level,
      insights: this.insights,
      prefs: this.prefs,
      traits: this.traits,
      seen: [...this.seen],
      islandAffinity: this.islandAffinity,
      tutored: this.tutored,
      stats: this.stats,
      journal: this.journal.slice(0, 12),
      recentDreams: this._recentDreams,
    };
  }

  /* ------------------------------------------------------------------ */
  /* learning                                                           */
  /* ------------------------------------------------------------------ */

  _insightNeed() {
    if (this.level <= INSIGHT_STEPS.length) return INSIGHT_STEPS[this.level - 1];
    return INSIGHT_STEPS[INSIGHT_STEPS.length - 1] + (this.level - INSIGHT_STEPS.length) * 70;
  }

  _levelInfo(level = this.level) {
    return LEVELS[Math.min(LEVELS.length - 1, Math.max(0, level - 1))];
  }

  _gainInsight(amount) {
    if (!amount) return;
    this.insights += amount;
    let guard = 0;
    while (this.insights >= this._insightNeed() && this.level < 30 && guard++ < 20) {
      this.insights -= this._insightNeed();
      this.level++;
      const info = this._levelInfo(this.level);
      this._journal('🧠', `Learned "${info.title}" — ${info.desc}`);
      if (typeof this.onLevelUp === 'function') {
        try { this.onLevelUp(this.level, info); } catch (e) { /* host UI is optional */ }
      }
    }
  }

  _pref(fn) {
    if (!this.prefs[fn] || typeof this.prefs[fn] !== 'object') {
      this.prefs[fn] = { seen: 0, love: 0, last: 0 };
    }
    return this.prefs[fn];
  }

  _reward(fn, amount) {
    const meta = DREAM_META[fn];
    if (!meta) return;
    const p = this._pref(fn);
    p.love = clamp(p.love + amount, -4, 14);
    p.last = Date.now();
    for (const tag of meta.tags) {
      this.traits[tag] = clamp((this.traits[tag] || 0) + amount, -8, 40);
    }
  }

  observeDream({ fn, island, byLoom = false } = {}) {
    if (!DREAM_META[fn]) return;
    if (byLoom) { this.stats.autoDreams++; return; }
    this.stats.playerDreams++;
    this.seen.add(fn);
    this._pref(fn).seen++;
    this._reward(fn, 1.15);
    if (Number.isFinite(island)) {
      this.islandAffinity[island] = (this.islandAffinity[island] || 0) + 0.35;
    }
    this._gainInsight(0.9);
  }

  observeFocus(fn) {
    if (!DREAM_META[fn]) return;
    const now = Date.now();
    if (now - this._lastFocus < 700) return;
    this._lastFocus = now;
    this._reward(fn, 0.35);
    this._gainInsight(0.18);
  }

  observeRemix(fn) {
    if (!DREAM_META[fn]) return;
    this.stats.remixes++;
    this._reward(fn, 1.0);
    this._gainInsight(0.55);
  }

  observeBanish(fn) {
    if (!DREAM_META[fn]) return;
    this.stats.banished++;
    this._reward(fn, -0.85);
    this._gainInsight(0.22);
  }

  observePet() {
    this.stats.pets++;
    this.traits.cozy = clamp((this.traits.cozy || 0) + 0.5, -8, 40);
    this._gainInsight(0.45);
  }

  teach(tag) {
    if (!TRAITS[tag]) return null;
    this.tutored[tag] = (this.tutored[tag] || 0) + 1;
    this.traits[tag] = clamp((this.traits[tag] || 0) + 2.4, -8, 40);
    for (const dream of DREAM_LIBRARY) {
      if (dream.tags.includes(tag)) this._pref(dream.fn).love += 0.32;
    }
    this._gainInsight(2.2);
    const label = TRAITS[tag].label.toLowerCase();
    this._journal('🎓', `You taught Loom to love ${label} dreams.`);
    this.thought = `Learning: ${label} dreams feel right to you.`;
    this.mode = 'learning';
    return this.summary();
  }

  /* ------------------------------------------------------------------ */
  /* public controls / reporting                                        */
  /* ------------------------------------------------------------------ */

  setAuto(on) {
    this.auto = !!on;
    this.mode = this.auto ? 'observing' : 'paused';
    this.thought = this.auto ? 'Back on watch. The sandbox is mine to mind.' : 'Autonomy paused — your paws on the wheel.';
  }

  toggleAuto() {
    this.setAuto(!this.auto);
    return this.auto;
  }

  topTraits(n = 4) {
    return Object.entries(this.traits)
      .filter(([tag]) => TRAITS[tag])
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([tag, value]) => ({ tag, value, ...TRAITS[tag] }));
  }

  favorite() {
    let best = null;
    for (const [fn, p] of Object.entries(this.prefs)) {
      if (!DREAM_META[fn]) continue;
      const score = (p.love || 0) + (p.seen || 0) * 0.08;
      if (!best || score > best.score) best = { fn, score, ...DREAM_META[fn] };
    }
    return best && best.score > 0.2 ? best : null;
  }

  summary() {
    const need = this._insightNeed();
    const info = this._levelInfo();
    return {
      auto: this.auto,
      level: this.level,
      levelTitle: info.title,
      levelDesc: info.desc,
      insights: this.insights,
      insightNeed: need,
      progress: clamp(this.insights / need, 0, 1),
      drives: { ...this.drives },
      thought: this.thought,
      mode: this.mode,
      tidiness: this.lastTidiness,
      clutter: this.lastClutter,
      traits: this.topTraits(4),
      favorite: this.favorite(),
      stats: { ...this.stats },
      journal: this.journal.slice(0, 8),
      seenCount: this.seen.size,
      totalTypes: DREAM_LIBRARY.length,
    };
  }

  /** Manual “do it now” action from the autonomy panel. */
  force(type, ctx) {
    if (!ctx) return { ok: false, message: 'The sandbox is still waking up.' };
    if (!this._unlocked(type)) {
      return { ok: false, message: 'Loom has not learned that yet — keep dreaming together.' };
    }
    let payload = {};
    if (type === 'dream') {
      const idea = this._chooseDream(ctx);
      if (!idea) return { ok: false, message: 'Not enough dream-ink for a new dream right now.' };
      payload = idea;
    } else if (type === 'tidy') {
      payload = { mode: 'deep' };
    } else if (type === 'tend' || type === 'scout') {
      payload = { island: Number.isFinite(ctx.lowIsland) ? ctx.lowIsland : 0 };
    } else if (type === 'swarm') {
      payload = { job: 'harvest' };
    }
    return this._perform({ type, payload }, ctx);
  }

  /* ------------------------------------------------------------------ */
  /* planning                                                           */
  /* ------------------------------------------------------------------ */

  _unlocked(type) {
    if (type === 'tidy' || type === 'dream') return true;
    if (type === 'scout') return this.level >= 2;
    if (type === 'tend' || type === 'swarm') return this.level >= 3;
    if (type === 'excavate') return this.level >= 5;
    return false;
  }

  _cooling(type) {
    return (this._cooldowns[type] || 0) > this._clock;
  }

  _planGap() {
    const base = clamp(4.6 - this.level * 0.15, 2.0, 4.6);
    return base * rand(0.85, 1.2);
  }

  _driveTargets(ctx) {
    const inkRatio = clamp((ctx.ink || 0) / Math.max(1, ctx.maxInk || 100), 0, 1);
    const idle = clamp((ctx.idle || 0) / 24, 0, 1);
    const bio = clamp(Number.isFinite(ctx.bioAvg) ? ctx.bioAvg : 0.5, 0, 1);
    const clutter = clamp((ctx.clutter && ctx.clutter.score) || 0, 0, 1);
    const undiscovered = clamp((ctx.discoveredRatio == null ? 0.35 : ctx.discoveredRatio), 0, 1);
    const swarmNeed = clamp(1 - (ctx.boids || 0) / 8, 0, 1);
    return {
      curiosity: clamp(0.22 + undiscovered * 0.35 + idle * 0.45 + inkRatio * 0.15, 0, 1),
      order: clamp(0.12 + clutter * 1.08, 0, 1),
      care: clamp((1 - bio) * 0.9 + (1 - inkRatio) * 0.4 + (ctx.canExcavate ? 0.18 : 0) + swarmNeed * 0.1, 0, 1),
    };
  }

  _chooseDream(ctx) {
    const catalog = Array.isArray(ctx.catalog) && ctx.catalog.length ? ctx.catalog : DREAM_LIBRARY;
    const pool = catalog.filter((d) => DREAM_META[d.fn] && (ctx.ink || 0) >= (d.cost == null ? 8 : d.cost));
    if (!pool.length) return null;

    let best = null;
    let bestScore = -Infinity;
    for (const candidate of pool) {
      const meta = DREAM_META[candidate.fn];
      const p = this._pref(candidate.fn);
      const trait = meta.tags.reduce((sum, tag) => sum + (this.traits[tag] || 0), 0);
      const recentIndex = this._recentDreams.indexOf(candidate.fn);
      const novelty = p.seen === 0 ? 1.1 : 0;
      const love = clamp(p.love, -3, 8) * 0.22;
      const costPenalty = ((candidate.cost == null ? 8 : candidate.cost) / Math.max(1, ctx.maxInk || 100)) * 0.5;
      const nightBonus = ctx.night && meta.tags.includes('glow') ? 0.22 : 0;
      const score = 0.45 + love + trait * 0.032 + novelty + nightBonus
        - costPenalty - (recentIndex >= 0 ? 0.55 - recentIndex * 0.08 : 0)
        + Math.random() * 0.22;
      if (score > bestScore) {
        bestScore = score;
        best = { ...candidate, ...meta, novelty };
      }
    }
    return best;
  }

  _choose(ctx) {
    const candidates = [];
    const offer = (type, utility, payload = {}) => {
      if (!this._unlocked(type) || this._cooling(type)) return;
      if (utility < 0.08) return;
      candidates.push({ type, utility: utility * rand(0.86, 1.16), payload });
    };

    const clutter = ctx.clutter || {};
    if ((clutter.removable || 0) > 0) {
      offer('tidy', 0.42 + this.drives.order * 1.15, { mode: 'auto' });
    }

    const canDream = (ctx.ink || 0) >= (ctx.dreamFloor == null ? 20 : ctx.dreamFloor)
      && this._clock - this._lastDream >= (ctx.dreamInterval == null ? 24 : ctx.dreamInterval);
    if (canDream) {
      const idea = this._chooseDream(ctx);
      if (idea) offer('dream', 0.58 + this.drives.curiosity * 1.05 + (idea.novelty || 0) * 0.18, idea);
    }

    if (Number.isFinite(ctx.lowIsland) && this.drives.curiosity > 0.42) {
      offer('scout', 0.28 + this.drives.curiosity * 0.8, { island: ctx.lowIsland });
    }
    if (Number.isFinite(ctx.lowIsland) && (ctx.bioAvg == null || ctx.bioAvg < 0.82)) {
      offer('tend', 0.32 + this.drives.care * 0.95, { island: ctx.lowIsland });
    }
    if ((ctx.boids || 0) < 6 && (ctx.ink || 0) > 24) {
      offer('swarm', 0.22 + this.drives.care * 0.6, { job: 'harvest' });
    } else if ((ctx.boids || 0) >= 8 && ctx.swarmJob !== 'harvest') {
      offer('swarm', 0.22 + this.drives.care * 0.35, { job: 'harvest' });
    }
    if (ctx.canExcavate && (ctx.ink || 0) >= 12) {
      offer('excavate', 0.4 + this.drives.care * 0.75, {});
    }

    if (!candidates.length) return null;

    // Critical mess beats everything else; otherwise utility with a dash of whim.
    if ((clutter.score || 0) > 0.72 && (clutter.removable || 0) > 0) {
      const urgent = candidates.find((c) => c.type === 'tidy');
      if (urgent) return urgent;
    }
    candidates.sort((a, b) => b.utility - a.utility);
    if (candidates.length > 1 && Math.random() < 0.16) return candidates[1];
    return candidates[0];
  }

  _perform(action, ctx) {
    const callback = this.actions[action.type];
    if (typeof callback !== 'function') {
      return { ok: false, message: `Loom has not learned how to ${action.type} yet.` };
    }

    let result;
    try {
      result = callback(action.payload || {}, ctx) || {};
    } catch (err) {
      result = { ok: false, message: `Loom tripped over a ${action.type} dream.` };
    }

    if (result.ok === false) {
      const retry = Math.max(6, (COOLDOWN[action.type] || 10) * 0.4);
      this._cooldowns[action.type] = this._clock + retry;
      this.mode = 'observing';
      this.thought = result.message || `Could not ${action.type} just yet.`;
      this._journal(ACTION_ICON[action.type] || '🦊', this.thought);
      return { ...result, ok: false, action: action.type };
    }

    this.stats.decisions++;

    if (action.type === 'dream') {
      const idea = action.payload || {};
      this._lastDream = this._clock;
      if (idea.fn) {
        this._recentDreams.unshift(idea.fn);
        this._recentDreams = this._recentDreams.slice(0, 5);
        this.stats.autoDreams++;
        this._gainInsight(0.12);
      }
    } else if (action.type === 'tidy') {
      this.stats.tidies++;
      this.stats.cleaned += Math.max(0, Number(result.cleaned) || 0);
      this.drives.order *= 0.35;
    } else if (action.type === 'tend') {
      this.stats.tended++;
    } else if (action.type === 'scout') {
      this.stats.scouted++;
    } else if (action.type === 'excavate') {
      this.stats.excavations++;
    } else if (action.type === 'swarm') {
      this.stats.swarm++;
    }

    const cooldown = (COOLDOWN[action.type] || 10) * (1 - Math.min(0.35, this.level * 0.025));
    if (cooldown > 0) this._cooldowns[action.type] = this._clock + cooldown;
    this.mode = MODE_LABEL[action.type] || 'managing';
    this.thought = result.thought || this._thoughtFor(action, result, ctx);
    this._journal(result.icon || ACTION_ICON[action.type] || '🦊', result.message || this._messageFor(action, result));

    return {
      ...result,
      ok: true,
      action: action.type,
      mode: this.mode,
      thought: this.thought,
    };
  }

  _thoughtFor(action, result, ctx) {
    const island = result.islandName || 'a quiet isle';
    switch (action.type) {
      case 'dream': return `Weaving ${action.payload.icon || '✨'} ${action.payload.name || 'a dream'} into the sandbox.`;
      case 'tidy': return `Tidying ${result.cleaned || 0} loose dream-bits. A clean sandbox dreams clearer.`;
      case 'tend': return `Tending ${island}. Its glow was getting shy.`;
      case 'scout': return `Scouting ${island} on soft paws.`;
      case 'swarm': return `The Loomings are on ${result.job || 'harvest'} duty.`;
      case 'excavate': return 'Digging up a memory the sand remembers.';
      default: return 'Managing the sandbox, one small choice at a time.';
    }
  }

  _messageFor(action, result) {
    switch (action.type) {
      case 'dream': return `Dreamed ${action.payload.name || 'a new dream'}.`;
      case 'tidy': return `Tidied ${result.cleaned || 0} loose dream-bits.`;
      case 'tend': return `Tended ${result.islandName || 'a fading isle'}.`;
      case 'scout': return `Scouted ${result.islandName || 'a quiet isle'}.`;
      case 'swarm': return `Sent the Loomings to ${result.job || 'harvest'}.`;
      case 'excavate': return 'Excavated a forgotten seal.';
      default: return 'Managed the sandbox.';
    }
  }

  _journal(icon, text) {
    this.journal.unshift({ icon, text, t: Date.now() });
    if (this.journal.length > 12) this.journal.length = 12;
  }

  _idleThought(ctx) {
    if ((ctx.ink || 0) < (ctx.dreamFloor == null ? 20 : ctx.dreamFloor)) {
      return 'Ink is low. I will wander and let the islands refill us.';
    }
    if ((ctx.clutter && ctx.clutter.score) > 0.25) return 'I see a little mess. Soon, little mess. Soon.';
    if ((ctx.bioAvg == null ? 0.5 : ctx.bioAvg) < 0.5) return 'Some islands feel dim. I am keeping watch.';
    return pick(IDLE_LINES);
  }

  /* ------------------------------------------------------------------ */
  /* frame update                                                       */
  /* ------------------------------------------------------------------ */

  update(dt, ctx) {
    if (!this.auto) {
      this.mode = 'paused';
      this.thought = 'Autonomy paused — your paws on the wheel.';
      return null;
    }
    if (!ctx || ctx.running === false) {
      this.mode = 'waking';
      this.thought = 'Waiting for the dream to begin.';
      return null;
    }

    this._clock += Math.min(0.1, Math.max(0, dt || 0));
    this.lastClutter = clamp((ctx.clutter && ctx.clutter.score) || 0, 0, 1);
    this.lastTidiness = 1 - this.lastClutter;

    const target = this._driveTargets(ctx);
    const ease = Math.min(1, Math.max(0, dt || 0) * 0.6);
    for (const key of Object.keys(this.drives)) {
      this.drives[key] += (target[key] - this.drives[key]) * ease;
    }

    if (this._clock < this._nextPlan) return null;
    this._nextPlan = this._clock + this._planGap();

    const action = this._choose(ctx);
    if (!action) {
      this.mode = this.auto ? 'observing' : 'paused';
      this.thought = this._idleThought(ctx);
      return null;
    }

    const result = this._perform(action, ctx);
    return { action, result, mode: this.mode, thought: this.thought };
  }
}

export default LoomAutonomy;
