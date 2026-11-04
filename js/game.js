import { EchoRoom } from './scene.js'
import { Assistant } from './assistant.js'
import { AudioEngine } from './audio.js'

const $ = (selector) => document.querySelector(selector)

const refs = {
  canvas: $('#scene'),
  markerLayer: $('#markers'),
  intro: $('#intro'),
  startBtn: $('#start-btn'),
  introBest: $('#intro-best'),
  timerValue: $('#timer-value'),
  deckLabel: $('#deck-label'),
  deckRail: $('#deck-rail'),
  objLabel: $('#obj-label'),
  objectiveList: $('#objective-list'),
  objProgress: $('#obj-progress'),
  objBarFill: $('#obj-bar-fill'),
  inventory: $('#inventory'),
  toast: $('#toast'),
  toastKicker: $('#toast-kicker'),
  toastTitle: $('#toast-title'),
  toastBody: $('#toast-body'),
  scanSweep: $('#scan-sweep'),
  scanBtn: $('#scan-btn'),
  soundBtn: $('#sound-btn'),
  lookLeft: $('#look-left'),
  lookRight: $('#look-right'),
  chat: $('#chat'),
  chatForm: $('#chat-form'),
  chatInput: $('#chat-input'),
  hintBtn: $('#hint-btn'),
  hintCount: $('#hint-count'),
  assistantScanBtn: $('#assistant-scan-btn'),
  statusBtn: $('#status-btn'),
  assistant: $('#assistant'),
  assistantToggle: $('#assistant-toggle'),
  pipLoadout: $('#pip-loadout'),
  pipLevel: $('#pip-level'),
  gemCount: $('#gem-count'),
  pipXpFill: $('#pip-xp-fill'),
  skillList: $('#skill-list'),
  loadoutToggle: $('#loadout-toggle'),
  constellationModal: $('#constellation-modal'),
  constellationEyebrow: $('#constellation-eyebrow'),
  constellationTitle: $('#constellation-title'),
  starmap: $('#starmap'),
  starLine: $('#star-line'),
  sequencePips: $('#sequence-pips'),
  constellationStatus: $('#constellation-status'),
  constellationClue: $('#constellation-clue'),
  constellationClueLabel: $('#constellation-clue-label'),
  constellationNote: $('#constellation-note'),
  codeReveal: $('#code-reveal'),
  codeLabel: $('#code-label'),
  codeDigits: $('#code-digits'),
  sequenceLock: $('#sequence-lock'),
  projectorLabel: $('#projector-label'),
  projectorState: $('#projector-state'),
  breakerModal: $('#breaker-modal'),
  breakerGrid: $('#breaker-grid'),
  breakerStatus: $('#breaker-status'),
  breakerMeter: $('#breaker-meter'),
  breakerFeed: $('#breaker-feed'),
  breakerReset: $('#breaker-reset'),
  keypadModal: $('#keypad-modal'),
  keypadGrid: $('#keypad-grid'),
  keypadCode: $('#keypad-code'),
  keypadStatus: $('#keypad-status'),
  keypadLockLabel: $('#keypad-lock-label'),
  keypadHint: $('#keypad-hint'),
  keypadClear: $('#keypad-clear'),
  keypadEnter: $('#keypad-enter'),
  deckClear: $('#deck-clear'),
  deckClearKicker: $('#deck-clear-kicker'),
  deckClearTitle: $('#deck-clear-title'),
  deckClearGems: $('#deck-clear-gems'),
  deckClearSkill: $('#deck-clear-skill'),
  deckClearNextName: $('#deck-clear-next-name'),
  nextDeckBtn: $('#next-deck-btn'),
  nextDeckLabel: $('#next-deck-label'),
  ending: $('#ending'),
  endingRank: $('#ending-rank'),
  endingTime: $('#ending-time'),
  endingHints: $('#ending-hints'),
  endingGems: $('#ending-gems'),
  endingSkills: $('#ending-skills'),
  endingQuote: $('#ending-quote'),
  playAgain: $('#play-again'),
  flash: $('#flash')
}

const STARS = [
  { id: 'red', name: 'Red Giant', short: 'RED GIANT', kind: 'red', x: 16, y: 34 },
  { id: 'castor', name: 'Castor', short: 'CASTOR', kind: 'twin', x: 42, y: 43 },
  { id: 'pollux', name: 'Pollux', short: 'POLLUX', kind: 'twin', x: 51, y: 62 },
  { id: 'eye', name: 'The Eye', short: 'EYE', kind: 'eye', x: 82, y: 37 },
  { id: 'drift-a', name: 'Drift A', short: 'DRIFT A', kind: 'decoy', x: 29, y: 78 },
  { id: 'drift-b', name: 'Drift B', short: 'DRIFT B', kind: 'decoy', x: 66, y: 19 },
  { id: 'drift-c', name: 'Drift C', short: 'DRIFT C', kind: 'decoy', x: 89, y: 70 },
  { id: 'drift-d', name: 'Drift D', short: 'DRIFT D', kind: 'decoy', x: 10, y: 64 },
  { id: 'drift-e', name: 'Drift E', short: 'DRIFT E', kind: 'decoy', x: 73, y: 80 }
]

const CRYO_SEQUENCE = ['red', 'castor', 'pollux', 'eye']
const BRIDGE_SEQUENCE = ['eye', 'castor', 'red', 'pollux']
const CRYO_CODE = '7394'
const BRIDGE_CODE = '4826'

const DECKS = [
  {
    id: 'cryo',
    code: 'DECK 01',
    name: 'CRYO BAY',
    objective: 'Restore the bay, decode the launch order, and get out.',
    intro: "Cryo Bay. Emergency power is down and airlock 01 is sealed. Each task you finish feeds me a little more processing power — and a few gems. Try not to waste them.",
    tasks: [
      { id: 'power', title: 'Restore auxiliary power', detail: 'Find a fuse for the relay', gem: 5, skill: 'deep-scan' },
      { id: 'code', title: 'Decode the launch sequence', detail: 'Read the constellation protocol', gem: 8, skill: 'overdrive' },
      { id: 'escape', title: 'Escape the cryo bay', detail: 'Unlock airlock 01', gem: 12, skill: 'surge' }
    ]
  },
  {
    id: 'engineering',
    code: 'DECK 02',
    name: 'ENGINEERING',
    objective: 'Retrieve the plasma cutter, stabilize the reactor, and cut through the hatch.',
    intro: "Engineering. The reactor is surging and the hatch is magnetically sealed. Tool locker on the right, breaker panel beside it. I can already feel the new skill coming online.",
    tasks: [
      { id: 'cutter', title: 'Retrieve the plasma cutter', detail: 'Search the tool locker', gem: 8, skill: 'hull-whisper' },
      { id: 'breaker', title: 'Reroute reactor feed', detail: 'Stabilize the breaker grid', gem: 12, skill: 'star-sight' },
      { id: 'hatch', title: 'Cut through the hatch', detail: 'Escape engineering', gem: 15, skill: 'door-sense' }
    ]
  },
  {
    id: 'bridge',
    code: 'DECK 03',
    name: 'NAV BRIDGE',
    objective: 'Align the nav array, compute the jump vector, and launch ECHO-7.',
    intro: "Nav Bridge. The drift chart is on the observation window, the NAV array is on the right, and the helm is dead ahead. Last deck. Let us make it look intentional.",
    tasks: [
      { id: 'nav', title: 'Realign the nav array', detail: 'Match the drift chart order', gem: 15, skill: 'vector-lock' },
      { id: 'vector', title: 'Compute the jump vector', detail: 'Enter the helm keypad code', gem: 18, skill: 'warp-core' },
      { id: 'launch', title: 'Launch ECHO-7', detail: 'Take the helm', gem: 25, skill: 'legend' }
    ]
  }
]

const SKILLS = {
  'deep-scan': {
    name: 'Deep Scan',
    icon: '◎',
    cost: 3,
    desc: 'Sweep the deck and tag every objective marker for twenty seconds.'
  },
  overdrive: {
    name: 'Overdrive',
    icon: 'ϟ',
    cost: 6,
    desc: 'Force the reactor breaker grid to stabilize the next time you open it.'
  },
  surge: {
    name: 'Surge',
    icon: '⌁',
    cost: 8,
    desc: 'Absorb the next failed star sequence or keypad attempt.'
  },
  'hull-whisper': {
    name: 'Hull Whisper',
    icon: '◈',
    cost: 4,
    desc: 'Reveal hidden items and clue locations on the current deck.'
  },
  'star-sight': {
    name: 'Star Sight',
    icon: '✦',
    cost: 6,
    desc: 'Auto-select the first star of the next alignment array.'
  },
  'door-sense': {
    name: 'Door Sense',
    icon: '⇥',
    cost: 3,
    desc: 'Tag the current deck exit for thirty seconds.'
  },
  'vector-lock': {
    name: 'Vector Lock',
    icon: '⌗',
    cost: 6,
    desc: 'Pre-fill two digits on the next keypad you open.'
  },
  'warp-core': {
    name: 'Warp Core',
    icon: '☄',
    cost: 12,
    desc: 'Instantly launch once the jump vector has been accepted.'
  },
  legend: {
    name: 'Echo Legend',
    icon: '★',
    cost: 0,
    desc: 'Final co-pilot tier. All decks cleared. No further upgrades.'
  }
}

const SKILL_ORDER = [
  'deep-scan',
  'overdrive',
  'surge',
  'hull-whisper',
  'star-sight',
  'door-sense',
  'vector-lock',
  'warp-core',
  'legend'
]

const HINTS = {
  cryo: {
    drawer: [
      'The console is to your right. There is a drawer under the monitors. Click it.',
      'Right side of the room, beneath the screens. The drawer is not locked.',
      'Open the console drawer. The fuse is inside.'
    ],
    fuse: [
      'There is a spare fuse sitting in the open drawer. Grab it.',
      'Click the glowing fuse inside the drawer. We need it for the relay.',
      'The fuse is in the drawer. Take it. Please.'
    ],
    power: [
      'The auxiliary power relay is on the left wall. Insert the fuse.',
      'Left wall, cabinet with the breaker levers. That is the relay.',
      'Take the fuse to the relay cabinet on your left. Power first, everything else second.'
    ],
    clue: [
      'Read the crew plaque beside the airlock. It names the star order.',
      'Left of the airlock door. The plaque is the clue for the projector.',
      'The plaque says: Red Giant, the Twins, then the Eye. Order matters.'
    ],
    stars: [
      'The star projector is live on the right wall. Follow the plaque order.',
      'Click stars in this order: Red Giant, Castor, Pollux, The Eye.',
      'Right wall, projector. Red Giant, then the two Twins, then the Eye. The line will show you.'
    ],
    code: [
      'Launch code is 7-3-9-4. The keypad is on the desk.',
      'Use the launch keypad on the console. Enter 7-3-9-4.',
      'Keypad. 7-3-9-4. Then we leave.'
    ],
    exit: [
      'Airlock 01 is open. Click the door and get out of here.',
      'The door is open. Click it. Freedom is one interaction away.',
      'Click the airlock. I am not staying here.'
    ]
  },
  engineering: {
    locker: [
      'The tool locker is the drawer beneath the console monitors on your right.',
      'Right side of engineering, under the screens. Open the drawer.',
      'Open the tool locker. We need the plasma cutter inside.'
    ],
    cutter: [
      'The plasma cutter is glowing inside the open tool locker. Grab it.',
      'Click the cutter in the drawer. We need it to open the hatch.',
      'Take the plasma cutter from the locker. Then we cut our way out.'
    ],
    breaker: [
      'The breaker panel is the server rack on your right wall. Open it.',
      'Right wall, tall rack. That is the reactor breaker panel.',
      'Open the breaker panel and bring every cell online. A pulse flips the cell and its neighbours.'
    ],
    hatch: [
      'The deck hatch is the big door ahead. It needs the cutter and stable reactor feed.',
      'Get the plasma cutter from the tool locker and stabilize the breaker grid, then cut the hatch.',
      'Cutter in hand, breaker grid green, then click the deck hatch. That is the way out.'
    ]
  },
  bridge: {
    chart: [
      'Read the drift chart on the observation window behind you. It gives the star order.',
      'The observation window is the drift chart. Read it before touching the NAV array.',
      'Drift chart order: Eye, Castor, Red Giant, Pollux. The window has the proof.'
    ],
    stars: [
      'The NAV-7 alignment array is on the right wall. Follow the drift chart order.',
      'Click: Eye, Castor, Red Giant, Pollux. Four stars, in that order.',
      'Right wall array. Eye first, then Castor, Red Giant, Pollux. The line will show you.'
    ],
    vector: [
      'The helm keypad is on the console. Enter the jump vector from the array.',
      'Jump vector is 4-8-2-6. Use the keypad on the console.',
      'Keypad. 4-8-2-6. Then take the helm.'
    ],
    launch: [
      'Vector accepted. The helm is live. Click the launch helm and get us out.',
      'The helm is glowing. Click it. Launch the ship.',
      'Click the launch helm. Final task. Do it dramatically.'
    ]
  }
}

const state = {
  started: false,
  won: false,
  deckIndex: 0,
  tasks: Object.fromEntries(DECKS.map((deck) => [deck.id, [false, false, false]])),
  gems: 0,
  gemsEarned: 0,
  skills: [],
  hintsUsed: 0,
  hintStage: 0,
  lastHintPhase: '',
  startTime: 0,
  elapsed: 0,
  activeModal: null,
  scanning: false,
  scanUntil: 0,
  doorSenseUntil: 0,
  sequence: [],
  keypad: '',
  keypadLocked: false,
  muted: false,
  elapsedTimer: null,
  transitioning: false,
  boosts: {
    overdrive: false,
    surge: false,
    star: false,
    digits: 0
  },
  // Cryo Bay
  power: false,
  drawerOpen: false,
  hasFuse: false,
  fuseInstalled: false,
  clueSeen: false,
  codeKnown: false,
  constellationSolved: false,
  codeEntered: false,
  doorOpen: false,
  // Engineering
  cutterLockerOpen: false,
  hasCutter: false,
  breakerSolved: false,
  breakerGrid: null,
  breakerInitial: null,
  hatchOpen: false,
  // Nav Bridge
  navClueSeen: false,
  navSolved: false,
  bridgeCodeKnown: false,
  vectorAccepted: false
}

const audio = new AudioEngine()

let room
try {
  room = new EchoRoom({
    canvas: refs.canvas,
    markerLayer: refs.markerLayer,
    onHotspot: (id) => interact(id)
  })
} catch (error) {
  console.error(error)
  refs.introBest.textContent = 'WEBGL UNAVAILABLE — ENABLE HARDWARE ACCELERATION'
  refs.startBtn.disabled = true
}

const assistant = new Assistant({
  log: refs.chat,
  form: refs.chatForm,
  input: refs.chatInput,
  sound: audio,
  onAsk: (text) => answerQuestion(text)
})

let toastTimer = null
let typingDelay = null
let scanTimer = null

function currentDeck() {
  return DECKS[state.deckIndex]
}

function activeSequence() {
  return state.deckIndex === 2 ? BRIDGE_SEQUENCE : CRYO_SEQUENCE
}

function activeCode() {
  return state.deckIndex === 2 ? BRIDGE_CODE : CRYO_CODE
}

function doorSenseActive() {
  return Date.now() < state.doorSenseUntil
}

function deckTasks(deck = currentDeck()) {
  return state.tasks[deck.id]
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function updateTimer() {
  if (!state.started || state.won) return
  state.elapsed = (performance.now() - state.startTime) / 1000
  refs.timerValue.textContent = formatTime(state.elapsed)
}

function startTimer() {
  clearInterval(state.elapsedTimer)
  state.elapsedTimer = window.setInterval(updateTimer, 250)
}

function showToast(kicker, title, body, type = '') {
  clearTimeout(toastTimer)
  refs.toast.className = `toast show${type ? ` ${type}` : ''}`
  refs.toastKicker.textContent = kicker
  refs.toastTitle.textContent = title
  refs.toastBody.textContent = body
  toastTimer = window.setTimeout(() => {
    refs.toast.classList.remove('show')
  }, 4800)
}

function updateHintCount() {
  refs.hintCount.textContent = String(state.hintsUsed)
}

function updateDeckChrome() {
  const deck = currentDeck()
  document.body.dataset.deck = deck.id
  refs.deckLabel.textContent = `${deck.code} // ${deck.name}`
  refs.objLabel.textContent = `${deck.code} // ESCAPE PROTOCOL`
}

function renderDeckRail() {
  if (!refs.deckRail) return
  const fragment = document.createDocumentFragment()
  DECKS.forEach((deck, index) => {
    const pill = document.createElement('div')
    const status = index < state.deckIndex ? 'cleared' : index === state.deckIndex ? 'active' : 'locked'
    pill.className = `deck-pill ${status}`
    pill.setAttribute('aria-label', `${deck.code} ${deck.name}: ${status}`)
    const dot = document.createElement('i')
    const code = document.createElement('b')
    code.textContent = deck.code
    const name = document.createElement('span')
    name.textContent = deck.name
    pill.append(dot, code, name)
    fragment.appendChild(pill)
  })
  refs.deckRail.replaceChildren(fragment)
}

function updateInventory() {
  const items = []
  if (state.deckIndex === 0) {
    if (state.hasFuse) items.push({ icon: 'ϟ', name: 'Fuse' })
    if (state.codeKnown) items.push({ icon: '#', name: CRYO_CODE })
  } else if (state.deckIndex === 1) {
    if (state.hasCutter) items.push({ icon: '✦', name: 'Cutter' })
    if (state.breakerSolved) items.push({ icon: 'ϟ', name: 'Feed OK' })
  } else {
    if (state.navSolved) items.push({ icon: '#', name: BRIDGE_CODE })
    if (state.vectorAccepted) items.push({ icon: '⇧', name: 'Vector' })
  }
  const slots = 4
  const fragment = document.createDocumentFragment()
  const label = document.createElement('span')
  label.className = 'inventory-label'
  label.textContent = 'KIT'
  fragment.appendChild(label)
  for (let index = 0; index < slots; index += 1) {
    const slot = document.createElement('div')
    slot.className = `slot${items[index] ? ' filled' : ''}`
    if (items[index]) {
      const icon = document.createElement('span')
      icon.className = 'slot-icon'
      icon.textContent = items[index].icon
      const name = document.createElement('span')
      name.className = 'slot-name'
      name.textContent = items[index].name
      slot.append(icon, name)
    } else {
      const empty = document.createElement('span')
      empty.className = 'slot-empty'
      empty.textContent = '·'
      slot.appendChild(empty)
    }
    fragment.appendChild(slot)
  }
  refs.inventory.replaceChildren(fragment)
}

function updateObjectives() {
  const deck = currentDeck()
  const done = deckTasks(deck)
  const fragment = document.createDocumentFragment()
  deck.tasks.forEach((task, index) => {
    const item = document.createElement('li')
    item.dataset.objective = task.id
    item.classList.toggle('done', done[index])
    item.classList.toggle('active', !done[index] && done.slice(0, index).every(Boolean))
    const dot = document.createElement('span')
    dot.className = 'obj-dot'
    const copy = document.createElement('span')
    copy.className = 'obj-copy'
    const strong = document.createElement('strong')
    strong.textContent = task.title
    const em = document.createElement('em')
    em.textContent = task.detail
    copy.append(strong, em)
    item.append(dot, copy)
    fragment.appendChild(item)
  })
  refs.objectiveList.replaceChildren(fragment)
  const count = done.filter(Boolean).length
  refs.objProgress.textContent = `${count} / ${deck.tasks.length}`
  refs.objBarFill.style.width = `${(count / deck.tasks.length) * 100}%`
}

function renderLoadout() {
  const level = Math.min(10, 1 + state.skills.length)
  refs.pipLevel.textContent = String(level)
  refs.gemCount.textContent = String(state.gems)
  refs.pipXpFill.style.width = `${(state.skills.length / SKILL_ORDER.length) * 100}%`
  const fragment = document.createDocumentFragment()
  SKILL_ORDER.forEach((id) => {
    const skill = SKILLS[id]
    const unlocked = state.skills.includes(id)
    const affordable = state.gems >= skill.cost
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `skill${unlocked ? '' : ' locked'}${unlocked && affordable && id !== 'legend' ? ' ready' : ''}`
    button.dataset.skill = id
    button.disabled = !unlocked || !affordable || id === 'legend'
    button.title = unlocked
      ? `${skill.name} — ${skill.desc}${skill.cost ? ` Costs ${skill.cost} gems.` : ''}`
      : `Locked — complete more tasks to unlock ${skill.name}.`
    button.setAttribute('aria-label', button.title)
    const icon = document.createElement('span')
    icon.className = 'skill-icon'
    icon.textContent = unlocked ? skill.icon : '·'
    const name = document.createElement('span')
    name.className = 'skill-name'
    name.textContent = unlocked ? skill.name : 'Locked'
    const cost = document.createElement('span')
    cost.className = 'skill-cost'
    cost.textContent = !unlocked ? '???' : id === 'legend' ? 'MAX' : `${skill.cost} ◆`
    button.append(icon, name, cost)
    button.addEventListener('click', () => useSkill(id))
    fragment.appendChild(button)
  })
  refs.skillList.replaceChildren(fragment)
}

function setLoadoutOpen(open) {
  refs.pipLoadout.classList.toggle('collapsed', !open)
  refs.loadoutToggle.setAttribute('aria-expanded', String(open))
}

function refreshUi() {
  updateDeckChrome()
  updateObjectives()
  updateInventory()
  syncMarkers()
  updateHintCount()
  renderLoadout()
  renderDeckRail()
}

function syncMarkers() {
  if (!room) return
  const all = [
    'drawer',
    'fuse',
    'relay',
    'plaque',
    'starchart',
    'keypad',
    'door',
    'reactor',
    'navtable',
    'hologram',
    'window',
    'crates',
    'server',
    'cryo'
  ]
  for (const id of all) room.setMarker(id, { hidden: true, attention: false })

  if (state.deckIndex === 0) {
    room.setMarker('drawer', {
      hidden: state.drawerOpen || state.hasFuse,
      done: state.drawerOpen,
      attention: !state.drawerOpen && !state.hasFuse,
      label: 'Console drawer'
    })
    room.setMarker('fuse', {
      hidden: !state.drawerOpen || state.hasFuse || state.fuseInstalled || state.power,
      attention: state.drawerOpen && !state.hasFuse && !state.fuseInstalled && !state.power,
      label: 'Spare fuse'
    })
    room.setMarker('relay', {
      hidden: false,
      done: state.power,
      attention: state.hasFuse && !state.power,
      label: state.power ? 'Aux relay (online)' : state.hasFuse ? 'Aux relay (fuse ready)' : 'Aux power relay'
    })
    room.setMarker('plaque', {
      hidden: false,
      done: state.clueSeen,
      attention: state.power && !state.clueSeen,
      label: 'Crew plaque'
    })
    room.setMarker('starchart', {
      hidden: false,
      done: state.codeKnown,
      attention: state.power && state.clueSeen && !state.codeKnown,
      label: state.power ? (state.codeKnown ? 'Star projector (decoded)' : 'Star projector (online)') : 'Star projector (offline)'
    })
    room.setMarker('keypad', {
      hidden: false,
      done: state.doorOpen,
      attention: state.codeKnown && !state.doorOpen,
      label: state.power ? 'Launch keypad' : 'Launch keypad (offline)'
    })
    room.setMarker('door', {
      hidden: false,
      attention: doorSenseActive() || state.doorOpen || (state.power && state.codeKnown && !state.doorOpen),
      label: state.doorOpen ? 'Airlock 01 (open)' : state.power ? 'Airlock 01 (sealed)' : 'Airlock 01 (no power)'
    })
    room.setMarker('hologram', { hidden: false, label: 'PIP core' })
    room.setMarker('window', { hidden: false, label: 'Observation window' })
    room.setMarker('crates', { hidden: false, label: 'Cargo crate' })
    room.setMarker('server', { hidden: false, label: 'Server rack' })
    room.setMarker('cryo', { hidden: false, label: 'Cryo pod' })
    return
  }

  if (state.deckIndex === 1) {
    room.setMarker('drawer', {
      hidden: false,
      done: state.hasCutter,
      attention: !state.cutterLockerOpen && !state.hasCutter,
      label: state.cutterLockerOpen ? 'Tool locker (open)' : 'Tool locker'
    })
    room.setMarker('fuse', {
      hidden: !state.cutterLockerOpen || state.hasCutter,
      attention: state.cutterLockerOpen && !state.hasCutter,
      label: 'Plasma cutter'
    })
    room.setMarker('relay', {
      hidden: false,
      label: 'Coolant pump',
      attention: false
    })
    room.setMarker('server', {
      hidden: false,
      done: state.breakerSolved,
      attention: !state.breakerSolved,
      label: state.breakerSolved ? 'Breaker panel (stable)' : 'Breaker panel'
    })
    room.setMarker('reactor', {
      hidden: false,
      done: state.breakerSolved,
      attention: !state.breakerSolved,
      label: state.breakerSolved ? 'Reactor core (stable)' : 'Reactor core (surging)'
    })
    room.setMarker('door', {
      hidden: false,
      attention: doorSenseActive() || (state.hasCutter && state.breakerSolved),
      label: state.hatchOpen ? 'Deck 02 hatch (open)' : state.hasCutter && state.breakerSolved ? 'Deck 02 hatch (ready)' : 'Deck 02 hatch'
    })
    room.setMarker('hologram', { hidden: false, label: 'PIP core' })
    room.setMarker('window', { hidden: false, label: 'Observation window' })
    room.setMarker('crates', { hidden: false, label: 'Parts crate' })
    room.setMarker('cryo', { hidden: false, label: 'Cryo pod (empty)' })
    return
  }

  room.setMarker('starchart', {
    hidden: false,
    done: state.navSolved,
    attention: !state.navSolved,
    label: state.navSolved ? 'NAV array (aligned)' : 'NAV-7 alignment array'
  })
  room.setMarker('keypad', {
    hidden: false,
    done: state.vectorAccepted,
    attention: state.navSolved && !state.vectorAccepted,
    label: state.vectorAccepted ? 'Jump keypad (accepted)' : 'Jump vector keypad'
  })
  room.setMarker('door', {
    hidden: false,
    attention: doorSenseActive() || state.vectorAccepted,
    label: state.vectorAccepted ? 'Launch helm (ready)' : 'Launch helm'
  })
  room.setMarker('window', {
    hidden: false,
    done: state.navClueSeen,
    attention: !state.navClueSeen,
    label: state.navClueSeen ? 'Drift chart' : 'Drift chart (unread)'
  })
  room.setMarker('navtable', { hidden: false, label: 'Nav table' })
  room.setMarker('hologram', { hidden: false, label: 'PIP core' })
  room.setMarker('crates', { hidden: false, label: 'Cargo crate' })
  room.setMarker('server', { hidden: false, label: 'Server rack' })
}

function stopTyping() {
  if (typingDelay) {
    clearTimeout(typingDelay)
    typingDelay = null
  }
}

function startGame() {
  if (state.started || !room) return
  state.started = true
  state.startTime = performance.now()
  audio.init()
  audio.setMuted(state.muted)
  audio.resume()
  document.body.classList.add('playing')
  document.body.dataset.deck = 'cryo'
  refs.intro.classList.add('hidden')
  room.setActive(true)
  window.requestAnimationFrame(() => {
    room.resize()
    room.startRendering()
  })
  refreshUi()
  startTimer()
  assistant.push("You're awake. Good. I'm PIP, your co-pilot. ECHO-7 has three sealed decks between you and the launch bridge. Every task you complete earns gems and upgrades one of my skills — use them when the room gets stubborn.", { tone: 'alert' })
  typingDelay = window.setTimeout(() => {
    assistant.push('Start with the console drawer on your right. Drag anywhere to look around, and tap a glowing marker to interact.', { tone: 'alert' })
  }, 2500)
  showToast('LINK ESTABLISHED', 'PIP is online', 'Three decks. Nine tasks. Skills unlock as you work.', 'success')
}

function completeTask(deckId, taskIndex, options = {}) {
  const deck = DECKS.find((entry) => entry.id === deckId)
  if (!deck) return null
  const flags = state.tasks[deckId]
  if (!flags || flags[taskIndex]) return null
  flags[taskIndex] = true
  const task = deck.tasks[taskIndex]
  const skill = SKILLS[task.skill]
  if (!state.skills.includes(task.skill)) state.skills.push(task.skill)
  state.gems += task.gem
  state.gemsEarned += task.gem
  refreshUi()
  if (!options.quiet) {
    if (window.innerWidth > 900) setLoadoutOpen(true)
    showToast('TASK COMPLETE', task.title, `+${task.gem} gems  ·  ${skill.name} unlocked`, 'success')
    assistant.push(`Task complete: ${task.title}. I banked ${task.gem} gems and unlocked ${skill.name}. ${skill.desc}`, { tone: 'win' })
    audio.success()
  }
  return task
}

function enterDeck(index) {
  const deck = DECKS[index]
  if (!deck) return
  state.deckIndex = index
  state.transitioning = false
  state.sequence = []
  state.keypad = ''
  state.keypadLocked = false
  state.doorOpen = false
  state.hatchOpen = false
  if (index === 1) {
    state.cutterLockerOpen = false
    state.hasCutter = false
    state.breakerSolved = false
    state.breakerGrid = null
    state.breakerInitial = null
  }
  if (index === 2) {
    state.navClueSeen = false
    state.navSolved = false
    state.bridgeCodeKnown = false
    state.vectorAccepted = false
  }
  room?.setDeck(index)
  refs.deckClear.classList.remove('show')
  document.body.classList.remove('modal-open')
  room?.setActive(true)
  room?.setMarkersBlocked(false)
  refreshUi()
  audio.powerUp()
  assistant.push(deck.intro, { tone: 'alert' })
  showToast(`${deck.code} // UNLOCKED`, deck.name, deck.objective, 'success')
}

function showDeckClear(index) {
  const deck = DECKS[index]
  const next = DECKS[index + 1]
  if (!deck || !next) return
  const reward = deck.tasks[deck.tasks.length - 1]
  const skill = SKILLS[reward.skill]
  state.transitioning = true
  room?.setActive(false)
  room?.setMarkersBlocked(true)
  refs.deckClearKicker.textContent = `${deck.code} // CLEARED`
  refs.deckClearTitle.innerHTML = `${deck.name} <span>ESCAPED</span>`
  refs.deckClearGems.textContent = `+${reward.gem}`
  refs.deckClearSkill.textContent = `${skill.icon}  ${skill.name}`
  refs.deckClearNextName.textContent = next.name
  refs.nextDeckLabel.textContent = `Enter ${next.code}`
  refs.deckClear.classList.add('show')
  document.body.classList.add('modal-open')
  audio.success()
}

function collectFuse() {
  if (state.hasFuse) return
  state.hasFuse = true
  room?.takeFuse()
  audio.pickup()
  assistant.push('Fuse secure. The auxiliary relay is on your left wall — cabinet with the breaker levers. That is our way back online.', { tone: 'alert' })
  showToast('ITEM ACQUIRED', 'Spare fuse', 'Insert it into the aux power relay on the left wall.', 'success')
  refreshUi()
}

function openDrawer() {
  if (state.drawerOpen) {
    if (!state.hasFuse) collectFuse()
    return
  }
  state.drawerOpen = true
  room?.openDrawer()
  audio.noise({ duration: 0.34, volume: 0.06, frequency: 760 })
  audio.click()
  assistant.push('There it is. A spare fuse, still in the drawer. Take it.', { tone: 'alert' })
  showToast('CONSOLE DRAWER', 'A spare fuse is inside', 'Click the fuse to collect it.', '')
  refreshUi()
}

function installFuse() {
  if (state.power) {
    assistant.push('Relay is green. Next problem: the launch code.')
    return
  }
  if (!state.hasFuse) {
    audio.error()
    showToast('RELAY OFFLINE', 'Fuse socket is empty', 'A spare fuse should be somewhere on the console.', 'warn')
    assistant.push('The relay is missing its fuse. Check the console drawer on your right.', { tone: 'alert' })
    return
  }
  state.hasFuse = false
  state.fuseInstalled = true
  state.power = true
  audio.powerUp()
  room?.setPower(true)
  room?.pulse()
  completeTask('cryo', 0)
  window.setTimeout(() => {
    assistant.push('Aux power is back. I can see the NAV-7 projector now — and I can read the crew plaque by the airlock. The code starts there.', { tone: 'alert' })
    showToast('POWER RESTORED', 'Aux relay online', 'The star projector and launch keypad are live.', 'success')
  }, 900)
  window.setTimeout(() => {
    showToast('NEW OBJECTIVE', 'Decode the launch sequence', 'Read the crew plaque, then use the star projector.', '')
  }, 5400)
}

function readPlaque() {
  if (!state.clueSeen) {
    state.clueSeen = true
    audio.click()
    updateConstellationClue()
    refreshUi()
    assistant.push("Plaque reads: 'From the Red Giant, follow the Twins, then the Eye.' That is the star order. The NAV-7 projector is on your right wall.", { tone: 'alert' })
    showToast('CREW PLAQUE', 'Red Giant → Twins → Eye', 'Order matters. The projector wants that sequence.', '')
  } else {
    audio.click()
    showToast('CREW PLAQUE', 'Red Giant → Twins → Eye', 'The projector is on the right wall. Follow the order.', '')
    assistant.push('Still the same verse: Red Giant, the Twins, then the Eye. The projector is on the right wall.')
  }
}

function openToolLocker() {
  if (state.cutterLockerOpen) {
    if (!state.hasCutter) collectCutter()
    else assistant.push('Tool locker is empty. The breaker panel still needs you.')
    return
  }
  state.cutterLockerOpen = true
  room?.openDrawer()
  audio.noise({ duration: 0.34, volume: 0.06, frequency: 640 })
  audio.click()
  assistant.push('Tool locker open. Plasma cutter, still warm. Take it.', { tone: 'alert' })
  showToast('TOOL LOCKER', 'Plasma cutter inside', 'Click the cutter to collect it.', '')
  refreshUi()
}

function collectCutter() {
  if (state.hasCutter) return
  state.hasCutter = true
  room?.takeFuse()
  audio.pickup()
  completeTask('engineering', 0)
  assistant.push('Plasma cutter secure. Next: the breaker panel on the right wall. Bring every cell online and the hatch lock will release.', { tone: 'alert' })
  showToast('ITEM ACQUIRED', 'Plasma cutter', 'Use it on the deck hatch after the breaker grid is stable.', 'success')
  refreshUi()
}

function createBreakerPuzzle() {
  const initial = Array(9).fill(true)
  const presses = [0, 4, 7]
  for (const press of presses) toggleBreakerCross(initial, press)
  state.breakerInitial = initial.slice()
  state.breakerGrid = initial.slice()
}

function toggleBreakerCross(grid, index) {
  const row = Math.floor(index / 3)
  const col = index % 3
  const affected = [
    [row, col],
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ]
  for (const [r, c] of affected) {
    if (r < 0 || r > 2 || c < 0 || c > 2) continue
    const cell = r * 3 + c
    grid[cell] = !grid[cell]
  }
}

function openBreaker() {
  if (state.breakerSolved) {
    audio.click()
    showToast('BREAKER PANEL', 'Grid stable', 'The hatch magnetic lock is disengaged.', 'success')
    assistant.push('Breaker grid is green. Take the cutter to the deck hatch and get us out of engineering.')
    return
  }
  if (!state.breakerGrid) createBreakerPuzzle()
  audio.click()
  renderBreaker()
  setBreakerStatus('GRID UNSTABLE', '')
  refs.breakerFeed.textContent = 'UNSTABLE'
  openModal(refs.breakerModal)
  if (state.boosts.overdrive) {
    state.boosts.overdrive = false
    assistant.push('Overdrive engaged. Forcing the reactor grid to stabilize.', { tone: 'win' })
    window.setTimeout(stabilizeBreaker, 700)
  }
}

function renderBreaker() {
  const grid = state.breakerGrid || Array(9).fill(false)
  const fragment = document.createDocumentFragment()
  grid.forEach((lit, index) => {
    const cell = document.createElement('button')
    cell.type = 'button'
    cell.className = `breaker-cell${lit ? ' lit' : ''}`
    cell.dataset.cell = String(index)
    cell.setAttribute('aria-label', `Breaker cell ${index + 1}: ${lit ? 'online' : 'offline'}`)
    cell.textContent = lit ? 'ON' : 'OFF'
    cell.addEventListener('click', () => pressBreaker(index))
    fragment.appendChild(cell)
  })
  refs.breakerGrid.replaceChildren(fragment)
  const lit = grid.filter(Boolean).length
  refs.breakerMeter.style.width = `${(lit / 9) * 100}%`
}

function pressBreaker(index) {
  if (state.breakerSolved || !state.breakerGrid) return
  toggleBreakerCross(state.breakerGrid, index)
  audio.tone({ frequency: 240 + index * 35, duration: 0.06, type: 'square', volume: 0.03 })
  renderBreaker()
  if (state.breakerGrid.every(Boolean)) solveBreaker()
}

function setBreakerStatus(text, tone = '') {
  refs.breakerStatus.textContent = text
  refs.breakerStatus.className = `status-line${tone ? ` ${tone}` : ''}`
}

function solveBreaker() {
  if (state.breakerSolved) return
  state.breakerSolved = true
  state.breakerGrid = Array(9).fill(true)
  renderBreaker()
  setBreakerStatus('GRID STABLE', 'ok')
  refs.breakerFeed.textContent = 'STABLE'
  audio.success()
  completeTask('engineering', 1)
  assistant.push('Reactor feed stable. Hatch magnetic lock released. Take the plasma cutter to the deck hatch.', { tone: 'win' })
  showToast('REACTOR STABLE', 'Breaker grid online', 'The deck hatch magnetic lock is released.', 'success')
  window.setTimeout(() => closeModal(refs.breakerModal), 1600)
}

function stabilizeBreaker() {
  if (state.breakerSolved) return
  state.breakerGrid = Array(9).fill(true)
  renderBreaker()
  solveBreaker()
}

function resetBreaker() {
  if (state.breakerSolved) return
  if (!state.breakerInitial) createBreakerPuzzle()
  state.breakerGrid = state.breakerInitial.slice()
  renderBreaker()
  setBreakerStatus('GRID UNSTABLE', '')
  refs.breakerFeed.textContent = 'UNSTABLE'
  audio.click()
}

function tryHatch() {
  if (!state.hasCutter) {
    audio.error()
    showToast('PLASMA CUTTER REQUIRED', 'Hatch is reinforced', 'Search the tool locker on the right.', 'warn')
    assistant.push('The hatch is reinforced. We need the plasma cutter from the tool locker.', { tone: 'alert' })
    return
  }
  if (!state.breakerSolved) {
    audio.error()
    showToast('MAGNETIC LOCK ENGAGED', 'Reactor feed unstable', 'Stabilize the breaker grid on the right wall.', 'warn')
    assistant.push('Magnetic lock is still engaged. Reroute the reactor feed at the breaker panel.', { tone: 'alert' })
    return
  }
  if (state.transitioning) return
  state.hatchOpen = true
  room?.openDoor()
  audio.door()
  completeTask('engineering', 2, { quiet: true })
  state.transitioning = true
  assistant.push('Hatch cut. Deck 02 is clear. Do not tell the reactor I said that.', { tone: 'win' })
  window.setTimeout(() => showDeckClear(1), 1100)
}

function readDriftChart() {
  state.navClueSeen = true
  audio.click()
  updateConstellationClue()
  refreshUi()
  assistant.push('Drift chart reads: Eye, Castor, Red Giant, Pollux. That is the alignment order for the NAV array on the right wall.', { tone: 'alert' })
  showToast('DRIFT CHART', 'Eye → Castor → Red Giant → Pollux', 'Align the NAV-7 array in that order.', '')
}

function openNavTable() {
  audio.click()
  room?.pulse()
  assistant.push(state.navClueSeen
    ? 'Nav table is tracking the same four stars as the drift chart. The array on the right wall is the input.'
    : 'Nav table is locked to the drift chart. Read the observation window behind you first.')
  showToast('NAV TABLE', state.navClueSeen ? 'Alignment reference live' : 'Drift chart required', state.navClueSeen ? 'Use the NAV-7 array on the right wall.' : 'Read the observation window.', '')
}

function updateConstellationClue() {
  const bridge = state.deckIndex === 2
  const solved = bridge ? state.navSolved : state.codeKnown
  if (bridge) {
    if (solved) {
      refs.constellationClue.textContent = 'Eye, Castor, Red Giant, Pollux. Alignment verified. Jump vector transferred to the helm keypad.'
      return
    }
    refs.constellationClue.textContent = state.navClueSeen
      ? 'From the Eye, to Castor, the Red Giant, then Pollux.'
      : 'No drift order recovered yet. Read the drift chart on the observation window.'
    return
  }
  if (solved) {
    refs.constellationClue.textContent = 'From the Red Giant, follow the Twins, then the Eye. Sequence verified. Launch code transferred.'
    return
  }
  refs.constellationClue.textContent = state.clueSeen
    ? 'From the Red Giant, follow the Twins, then the Eye.'
    : 'No order recovered yet. Find the crew plaque beside the airlock.'
}

function openConstellation() {
  const bridge = state.deckIndex === 2
  const solved = bridge ? state.navSolved : state.codeKnown
  if (!bridge && !state.power) {
    audio.error()
    showToast('NO POWER', 'NAV-7 projector is offline', 'Restore auxiliary power first.', 'warn')
    assistant.push('The projector is dead until we restore auxiliary power. Left wall, relay cabinet.', { tone: 'alert' })
    return
  }
  updateConstellationClue()
  renderSequencePips()
  updateStarLine()
  refs.constellationEyebrow.innerHTML = `<span></span>${bridge ? 'DECK 03 // NAV-7 ARRAY' : 'NAV-7 PROJECTOR'}`
  refs.constellationTitle.textContent = bridge ? 'Jump Alignment' : 'Constellation Protocol'
  refs.constellationClueLabel.textContent = bridge ? 'DRIFT CHART // NAV-7' : 'CREW PLAQUE // NAV-7'
  refs.projectorLabel.textContent = bridge ? 'ARRAY' : 'PROJECTOR'
  refs.codeLabel.textContent = bridge ? 'JUMP VECTOR' : 'LAUNCH CODE'
  refs.codeDigits.textContent = activeCode().split('').join(' ')
  refs.constellationNote.textContent = bridge
    ? 'Click the stars in the order shown by the drift chart. A wrong star resets the alignment.'
    : 'Click the stars in the order described by the plaque. A wrong star resets the sequence.'
  refs.sequenceLock.textContent = solved ? 'RELEASED' : 'ARMED'
  refs.projectorState.textContent = solved ? 'DECODED' : 'ONLINE'
  refs.codeReveal.classList.toggle('visible', solved)
  setConstellationStatus(solved ? 'SEQUENCE VERIFIED' : 'AWAITING SEQUENCE', solved ? 'ok' : '')
  if (solved) {
    state.sequence = [...activeSequence()]
    refs.starLine.classList.add('visible')
  }
  syncStarSelection()
  openModal(refs.constellationModal)
  if (state.boosts.star && !solved) {
    state.boosts.star = false
    assistant.push('Star Sight locked on. Auto-selecting the first star.', { tone: 'win' })
    window.setTimeout(() => pickStar(activeSequence()[0]), 650)
  }
}

function tryDoor() {
  if (state.deckIndex === 0) {
    if (!state.power) {
      audio.error()
      showToast('AIRLOCK SEALED', 'No power to the door', 'Restore auxiliary power first.', 'warn')
      assistant.push('No power, no airlock. Find the fuse and bring the relay back online.', { tone: 'alert' })
      return
    }
    if (!state.doorOpen) {
      audio.error()
      showToast('AIRLOCK SEALED', 'Launch code required', 'Use the keypad on the console to authorize the airlock.', 'warn')
      assistant.push(state.codeKnown
        ? `Sealed. Enter ${CRYO_CODE.split('').join('-')} on the launch keypad and I will cycle the door.`
        : 'Sealed. We need the launch code. The projector on the right wall should decrypt it.', { tone: 'alert' })
      return
    }
    if (state.transitioning) return
    completeTask('cryo', 2, { quiet: true })
    state.transitioning = true
    audio.door()
    assistant.push('Airlock cycled. Deck 01 is behind us. Engineering, here we come.', { tone: 'win' })
    window.setTimeout(() => showDeckClear(0), 700)
    return
  }

  if (state.deckIndex === 2) {
    if (!state.vectorAccepted) {
      audio.error()
      showToast('HELM LOCKED', 'Jump vector missing', 'Align the NAV array, then enter the vector on the keypad.', 'warn')
      assistant.push(state.navSolved
        ? `Helm is locked. Enter ${BRIDGE_CODE.split('').join('-')} on the jump keypad.`
        : 'Helm has no jump vector. Align the NAV array first, then enter the vector.', { tone: 'alert' })
      return
    }
    if (state.won) return
    completeTask('bridge', 2, { quiet: true })
    finishGame()
  }
}

function pipLine() {
  const lines = [
    'You are looking at my local core. Most of me is in the walls. Try not to judge the housing.',
    'I have been alone on this station for 412 days. Do not make it weird.',
    'If I had hands, I would have flown us out myself. Alas. You are the hands.',
    'I could tell you a joke, but the air supply is a better motivator.',
    'My diagnostic says the deck is 94 percent lethal. The other 6 percent is vibes.'
  ]
  return lines[Math.floor(Math.random() * lines.length)]
}

function buildStarField() {
  for (const star of STARS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'star'
    button.dataset.id = star.id
    button.dataset.kind = star.kind
    button.style.left = `${star.x}%`
    button.style.top = `${star.y}%`
    button.setAttribute('aria-label', star.name)
    button.innerHTML = `<span class="star-dot"></span><span class="star-name">${star.name}</span>`
    button.addEventListener('click', () => pickStar(star.id))
    refs.starmap.appendChild(button)
  }
}

function syncStarSelection() {
  document.querySelectorAll('.star').forEach((star) => {
    star.classList.toggle('selected', state.sequence.includes(star.dataset.id))
    star.classList.remove('wrong')
  })
}

function setConstellationStatus(text, tone = '') {
  refs.constellationStatus.textContent = text
  refs.constellationStatus.className = `status-line${tone ? ` ${tone}` : ''}`
}

function renderSequencePips() {
  const sequence = activeSequence()
  const slots = [...refs.sequencePips.querySelectorAll('.pip-slot')]
  slots.forEach((slot, index) => {
    const id = state.sequence[index]
    const star = STARS.find((entry) => entry.id === id)
    slot.classList.toggle('filled', Boolean(star))
    slot.querySelector('em').textContent = star ? star.short : '—'
  })
  if (sequence.length !== slots.length) {
    slots.forEach((slot, index) => {
      if (index >= sequence.length) {
        slot.querySelector('em').textContent = '—'
        slot.classList.remove('filled')
      }
    })
  }
}

function updateStarLine() {
  const points = state.sequence
    .map((id) => STARS.find((star) => star.id === id))
    .filter(Boolean)
    .map((star) => `${star.x},${star.y}`)
    .join(' ')
  refs.starLine.setAttribute('points', points)
  refs.starLine.classList.toggle('visible', state.sequence.length > 1)
}

function isStarPuzzleSolved() {
  return state.deckIndex === 2 ? state.navSolved : state.codeKnown
}

function pickStar(id) {
  if (isStarPuzzleSolved()) return
  const sequence = activeSequence()
  const expected = sequence[state.sequence.length]
  const element = document.querySelector(`.star[data-id="${id}"]`)
  if (id === expected) {
    state.sequence.push(id)
    element?.classList.add('selected')
    audio.tone({ frequency: 480 + state.sequence.length * 110, duration: 0.16, type: 'sine', volume: 0.06 })
    renderSequencePips()
    updateStarLine()
    if (state.sequence.length === sequence.length) solveStars()
  } else if (state.boosts.surge) {
    state.boosts.surge = false
    audio.error()
    renderLoadout()
    element?.classList.add('wrong')
    refs.starmap.classList.remove('shake')
    void refs.starmap.offsetWidth
    refs.starmap.classList.add('shake')
    setConstellationStatus('SURGE ABSORBED — SEQUENCE PRESERVED', 'ok')
    assistant.push('Surge absorbed the bad input. Your sequence is intact. Keep going.', { tone: 'win' })
    window.setTimeout(() => {
      element?.classList.remove('wrong')
      setConstellationStatus('AWAITING SEQUENCE', '')
    }, 750)
  } else {
    audio.error()
    element?.classList.add('wrong')
    refs.starmap.classList.remove('shake')
    void refs.starmap.offsetWidth
    refs.starmap.classList.add('shake')
    setConstellationStatus('SEQUENCE REJECTED', 'bad')
    window.setTimeout(() => {
      state.sequence = []
      syncStarSelection()
      renderSequencePips()
      updateStarLine()
      setConstellationStatus('AWAITING SEQUENCE', '')
    }, 620)
  }
}

function solveStars() {
  const bridge = state.deckIndex === 2
  state.sequence = [...activeSequence()]
  if (bridge) {
    state.navSolved = true
    state.bridgeCodeKnown = true
    completeTask('bridge', 0)
  } else {
    state.codeKnown = true
    state.constellationSolved = true
    completeTask('cryo', 1)
  }
  room?.setCodeKnown()
  room?.pulse()
  audio.success()
  syncStarSelection()
  renderSequencePips()
  updateStarLine()
  updateConstellationClue()
  setConstellationStatus('SEQUENCE VERIFIED', 'ok')
  refs.sequenceLock.textContent = 'RELEASED'
  refs.projectorState.textContent = 'DECODED'
  refs.codeReveal.classList.add('visible')
  refs.codeDigits.textContent = activeCode().split('').join(' ')
  refreshUi()
  if (bridge) {
    assistant.push(`Jump vector confirmed: ${BRIDGE_CODE.split('').join(' ')}. It is in your kit. Enter it on the helm keypad and I will unlock the launch helm.`, { tone: 'win' })
    showToast('JUMP VECTOR RECOVERED', BRIDGE_CODE.split('').join(' '), 'Enter it on the jump keypad on the console.', 'success')
  } else {
    assistant.push(`Launch code confirmed: ${CRYO_CODE.split('').join(' ')}. It is in your kit. The keypad is on the console — enter it and I will cycle the airlock.`, { tone: 'win' })
    showToast('LAUNCH CODE RECOVERED', CRYO_CODE.split('').join(' '), 'Enter it on the launch keypad on the console.', 'success')
  }
}

function buildKeypad() {
  for (let digit = 1; digit <= 9; digit += 1) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'keypad-key'
    button.textContent = String(digit)
    button.addEventListener('click', () => pressKey(String(digit)))
    refs.keypadGrid.appendChild(button)
  }
  const zero = document.createElement('button')
  zero.type = 'button'
  zero.className = 'keypad-key zero'
  zero.textContent = '0'
  zero.addEventListener('click', () => pressKey('0'))
  refs.keypadGrid.appendChild(zero)
}

function renderKeypad() {
  refs.keypadCode.textContent = Array.from({ length: 4 }, (_, index) => state.keypad[index] || '·').join(' ')
}

function setKeypadStatus(text, tone = '', label) {
  refs.keypadStatus.textContent = text
  refs.keypadStatus.className = `keypad-status${tone ? ` ${tone}` : ''}`
  if (label) refs.keypadLockLabel.textContent = label
}

function keypadHintText() {
  if (state.deckIndex === 2) {
    return state.navSolved
      ? 'Jump vector recovered. Check your kit if you need the digits.'
      : 'The jump vector is recovered from the NAV-7 alignment array. Read the drift chart for the star order.'
  }
  return state.codeKnown
    ? 'Launch code recovered. Check your kit if you need the digits.'
    : 'The launch code was recovered from the NAV-7 constellation protocol. Find the crew plaque for the order.'
}

function openKeypad() {
  const bridge = state.deckIndex === 2
  if (!bridge && !state.power) {
    audio.error()
    showToast('KEYPAD OFFLINE', 'No power to launch control', 'Restore auxiliary power first.', 'warn')
    assistant.push('Keypad is dark. Power first. Relay cabinet, left wall.', { tone: 'alert' })
    return
  }
  if (bridge && !state.navSolved) {
    audio.error()
    showToast('KEYPAD LOCKED', 'Nav array not aligned', 'Align the NAV-7 array before computing a jump vector.', 'warn')
    assistant.push('Helm keypad is locked until the NAV array is aligned. Read the drift chart, then use the array on the right wall.', { tone: 'alert' })
    return
  }
  const accepted = bridge ? state.vectorAccepted : state.doorOpen
  if (accepted) {
    refs.keypadCode.textContent = activeCode().split('').join(' ')
    setKeypadStatus('ACCESS GRANTED', 'ok', bridge ? 'JUMP VECTOR ACCEPTED' : 'AIRLOCK CYCLING')
    refs.keypadLockLabel.textContent = bridge ? 'LAUNCH AUTHORIZATION ACCEPTED' : 'LAUNCH AUTHORIZATION ACCEPTED'
    openModal(refs.keypadModal)
    return
  }
  state.keypad = ''
  state.keypadLocked = false
  if (state.boosts.digits > 0) {
    state.keypad = activeCode().slice(0, state.boosts.digits)
    state.boosts.digits = 0
    assistant.push('Vector Lock engaged. Two digits pre-filled.', { tone: 'win' })
  }
  renderKeypad()
  setKeypadStatus('LOCKED', '')
  refs.keypadLockLabel.textContent = bridge ? 'ENTER 4-DIGIT JUMP VECTOR' : 'ENTER 4-DIGIT LAUNCH CODE'
  refs.keypadHint.textContent = keypadHintText()
  openModal(refs.keypadModal)
}

function openModal(modal) {
  state.activeModal = modal
  modal.classList.add('show')
  document.body.classList.add('modal-open')
  room?.setMarkersBlocked(true)
  const close = modal.querySelector('.modal-close')
  window.setTimeout(() => close?.focus({ preventScroll: true }), 120)
}

function closeModal(modal = state.activeModal) {
  if (!modal) return
  modal.classList.remove('show')
  state.activeModal = null
  document.body.classList.remove('modal-open')
  room?.setMarkersBlocked(false)
}

function pressKey(digit) {
  if (state.keypadLocked || (state.deckIndex === 0 ? state.doorOpen : state.vectorAccepted)) return
  if (state.keypad.length >= 4) return
  state.keypad += digit
  audio.tone({ frequency: 560 + Number(digit) * 24, duration: 0.05, type: 'square', volume: 0.025 })
  renderKeypad()
  if (state.keypad.length === 4) {
    window.setTimeout(validateCode, 420)
  }
}

function validateCode() {
  const accepted = state.deckIndex === 2 ? state.vectorAccepted : state.doorOpen
  if (state.keypadLocked || accepted) return
  if (state.keypad.length < 4) {
    setKeypadStatus('ENTER 4 DIGITS', 'bad')
    return
  }
  state.keypadLocked = true
  const code = activeCode()
  if (state.keypad === code) {
    const guessed = state.deckIndex === 2 ? !state.navSolved : !state.codeKnown
    if (state.deckIndex === 2) {
      state.vectorAccepted = true
      room?.openDoor()
      audio.success()
      audio.door()
      completeTask('bridge', 1)
      setKeypadStatus('ACCESS GRANTED', 'ok', 'JUMP VECTOR ACCEPTED')
      refs.keypadHint.textContent = 'Vector accepted. Close this panel and click the launch helm.'
      refreshUi()
      assistant.push(guessed
        ? 'You guessed the vector. I am choosing to be impressed. Helm is unlocked.'
        : 'Jump vector accepted. Helm is unlocked. Click the launch helm and get us out.', { tone: 'win' })
      showToast('HELM UNLOCKED', 'Jump vector accepted', 'Close the panel and click the launch helm.', 'success')
      window.setTimeout(() => closeModal(refs.keypadModal), 1700)
      return
    }
    if (!state.codeKnown) {
      state.codeKnown = true
      state.constellationSolved = true
      completeTask('cryo', 1)
    }
    state.codeEntered = true
    state.doorOpen = true
    room?.setCodeKnown()
    room?.openDoor()
    audio.success()
    audio.door()
    setKeypadStatus('ACCESS GRANTED', 'ok', 'AIRLOCK CYCLING')
    refs.keypadHint.textContent = 'Airlock 01 is cycling. Close this panel and click the airlock door to escape.'
    refreshUi()
    assistant.push(guessed
      ? 'That was either a very lucky guess or you are better at this than you let on. Airlock is cycling — click the door.'
      : 'Airlock is cycling. Door is open. Click it and get out of here.', { tone: 'win' })
    showToast('AIRLOCK UNLOCKED', 'Airlock 01 is open', 'Close the panel and click the airlock door to escape.', 'success')
    window.setTimeout(() => closeModal(refs.keypadModal), 1700)
    return
  }

  audio.error()
  if (state.boosts.surge) {
    state.boosts.surge = false
    renderLoadout()
    setKeypadStatus('SURGE ABSORBED — RETRY', 'ok', 'INPUT BUFFER RESTORED')
    refs.keypadModal.querySelector('.modal-card').classList.add('shake')
    assistant.push('Surge absorbed the failed authorization. Input buffer restored. Try again.', { tone: 'win' })
    window.setTimeout(() => {
      refs.keypadModal.querySelector('.modal-card').classList.remove('shake')
      state.keypad = ''
      state.keypadLocked = false
      renderKeypad()
      setKeypadStatus('LOCKED', '', state.deckIndex === 2 ? 'ENTER 4-DIGIT JUMP VECTOR' : 'ENTER 4-DIGIT LAUNCH CODE')
    }, 900)
    return
  }

  setKeypadStatus('ACCESS DENIED', 'bad', 'AUTHORIZATION REJECTED')
  refs.keypadModal.querySelector('.modal-card').classList.add('shake')
  window.setTimeout(() => {
    refs.keypadModal.querySelector('.modal-card').classList.remove('shake')
    state.keypad = ''
    state.keypadLocked = false
    renderKeypad()
    setKeypadStatus('LOCKED', '', state.deckIndex === 2 ? 'ENTER 4-DIGIT JUMP VECTOR' : 'ENTER 4-DIGIT LAUNCH CODE')
    refs.keypadHint.textContent = keypadHintText()
  }, 900)
  const known = state.deckIndex === 2 ? state.navSolved : state.codeKnown
  if (known) assistant.push(`Negative. The recovered code is ${code.split('').join('-')}. Try again.`)
}

function interact(id) {
  if (!state.started || state.activeModal || state.won || state.transitioning) return
  audio.resume()
  if (state.deckIndex === 0) interactCryo(id)
  else if (state.deckIndex === 1) interactEngineering(id)
  else interactBridge(id)
}

function interactCryo(id) {
  switch (id) {
    case 'drawer':
      audio.click()
      openDrawer()
      break
    case 'fuse':
      audio.click()
      collectFuse()
      break
    case 'relay':
      audio.click()
      installFuse()
      break
    case 'plaque':
      readPlaque()
      break
    case 'starchart':
      audio.click()
      openConstellation()
      break
    case 'keypad':
      audio.click()
      openKeypad()
      break
    case 'door':
      audio.click()
      tryDoor()
      break
    case 'hologram':
      audio.click()
      room?.pulse()
      assistant.push(pipLine())
      break
    case 'window':
      audio.click()
      assistant.push('That is the Kepler Nebula. The NAV-7 projector uses the same star chart. The crew plaque names the order.')
      showToast('OBSERVATION WINDOW', 'Kepler Nebula', 'The constellation protocol is drawn from these stars.', '')
      break
    case 'crates':
      audio.click()
      assistant.push("Cargo's sealed. Rations, coolant, and one suspiciously empty crate. Nothing we need. Probably.")
      break
    case 'server':
      audio.click()
      assistant.push('Station logs are corrupted. I can still hold the airlock from here — but I cannot open it without the launch code.')
      break
    case 'cryo':
      audio.click()
      assistant.push('That was your pod. O2 is down to eighteen percent, so I would not climb back in for a nap.')
      break
    default:
      break
  }
}

function interactEngineering(id) {
  switch (id) {
    case 'drawer':
      audio.click()
      openToolLocker()
      break
    case 'fuse':
      audio.click()
      collectCutter()
      break
    case 'server':
      openBreaker()
      break
    case 'relay':
      audio.click()
      assistant.push(state.breakerSolved
        ? 'Coolant pump is steady. The reactor is stable. The hatch is the only thing left.'
        : 'Coolant pump is holding, but the reactor feed is unstable. Use the breaker panel on the right wall.')
      showToast('COOLANT PUMP', state.breakerSolved ? 'Flow nominal' : 'Reactor feed unstable', state.breakerSolved ? 'Hatch lock is released.' : 'Stabilize the breaker grid.', state.breakerSolved ? 'success' : 'warn')
      break
    case 'reactor':
      audio.click()
      room?.pulse()
      assistant.push(state.breakerSolved
        ? 'Reactor core is stable. It is purring. I did not know it could purr.'
        : 'Reactor core is surging. The breaker panel on the right wall is the only thing keeping it from a very short, very bright lesson in physics.')
      break
    case 'crates':
      audio.click()
      showToast('PARTS CRATE', 'Field note recovered', 'A pulse flips the cell you hit and the four cells beside it.', '')
      assistant.push('Parts crate has a field note: bring every breaker online. A pulse flips the target cell and its four neighbours. Start from a cross and work the edges.')
      break
    case 'door':
      audio.click()
      tryHatch()
      break
    case 'hologram':
      audio.click()
      room?.pulse()
      assistant.push(pipLine())
      break
    case 'window':
      audio.click()
      assistant.push('That is the same Kepler Nebula. From engineering it looks a lot like a way out. Mostly because it is.')
      break
    case 'cryo':
      audio.click()
      assistant.push('Empty cryo pod. You are not getting back in. I have already logged the escape.')
      break
    default:
      break
  }
}

function interactBridge(id) {
  switch (id) {
    case 'starchart':
      audio.click()
      openConstellation()
      break
    case 'keypad':
      audio.click()
      openKeypad()
      break
    case 'door':
      audio.click()
      tryDoor()
      break
    case 'window':
      audio.click()
      readDriftChart()
      break
    case 'navtable':
      openNavTable()
      break
    case 'hologram':
      audio.click()
      room?.pulse()
      assistant.push(pipLine())
      break
    case 'crates':
      audio.click()
      assistant.push('Cargo is strapped down for launch. Someone packed three crates of instant noodles and one framed photo of the reactor. I have questions.')
      break
    case 'server':
      audio.click()
      assistant.push('Bridge servers are green. The only thing missing is a jump vector and a human with steady hands. That is you.')
      break
    default:
      break
  }
}

function finishGame() {
  if (state.won) return
  completeTask('bridge', 2, { quiet: true })
  state.won = true
  state.elapsed = (performance.now() - state.startTime) / 1000
  clearInterval(state.elapsedTimer)
  refs.timerValue.textContent = formatTime(state.elapsed)
  updateObjectives()
  room?.setActive(false)
  room?.setMarkersBlocked(true)
  room?.pulse()
  audio.success()
  audio.door()
  assistant.push("That's it. ECHO-7 is clear. Three decks, nine tasks, one co-pilot who got substantially more capable along the way. Do not look back — the station is venting and I have already drafted the incident report.", { tone: 'win' })

  let rank = 'C'
  if (state.elapsed < 480 && state.hintsUsed <= 2) rank = 'S'
  else if (state.elapsed < 720 && state.hintsUsed <= 5) rank = 'A'
  else if (state.elapsed < 960) rank = 'B'

  refs.endingRank.textContent = rank
  refs.endingTime.textContent = formatTime(state.elapsed)
  refs.endingHints.textContent = String(state.hintsUsed)
  refs.endingGems.textContent = String(state.gemsEarned)
  refs.endingSkills.textContent = `${state.skills.length} / ${SKILL_ORDER.length}`
  refs.endingQuote.innerHTML = state.hintsUsed === 0
    ? '“You did not even need me. I am choosing to be impressed.” <span>— PIP</span>'
    : state.hintsUsed <= 3
      ? '“Not bad for a human. I unlocked nine skills and all I got was this ship.” <span>— PIP</span>'
      : '“We made it. Barely. I am telling everyone it was my plan.” <span>— PIP</span>'

  const previousBest = Number(localStorage.getItem('echo7-best') || 0)
  if (!previousBest || state.elapsed < previousBest) {
    localStorage.setItem('echo7-best', String(state.elapsed))
  }
  refs.flash.classList.remove('fire')
  void refs.flash.offsetWidth
  refs.flash.classList.add('fire')
  window.setTimeout(() => {
    refs.ending.classList.add('show')
  }, 950)
}

function useSkill(id) {
  const skill = SKILLS[id]
  if (!skill) return
  if (!state.skills.includes(id)) {
    showToast('SKILL LOCKED', skill.name, 'Complete more tasks to unlock this co-pilot skill.', 'warn')
    return
  }
  if (id === 'legend') {
    assistant.push('Echo Legend is a trophy skill. You already did the impossible part. Go launch the ship.')
    return
  }
  if (state.gems < skill.cost) {
    audio.error()
    showToast('NOT ENOUGH GEMS', skill.name, `You need ${skill.cost} gems. Complete more tasks.`, 'warn')
    return
  }
  let applied = true

  switch (id) {
    case 'deep-scan':
      applied = scan(true)
      if (applied) {
        showToast('SKILL USED', 'Deep Scan', 'Every objective marker is tagged for twenty seconds.', 'success')
      } else {
        assistant.push('Scan is already running. Give it a second before burning another skill charge.')
      }
      break
    case 'overdrive':
      if (state.deckIndex !== 1 || state.breakerSolved) {
        applied = false
        assistant.push(state.deckIndex === 1
          ? 'Breaker grid is already stable. Overdrive would be wasted.'
          : 'Overdrive is tuned to the engineering breaker grid. Save it for Deck 02.')
      } else {
        state.boosts.overdrive = true
        showToast('SKILL ARMED', 'Overdrive', 'The breaker grid will auto-stabilize the next time you open it.', 'success')
        assistant.push('Overdrive armed. Open the breaker panel and I will force the grid stable.', { tone: 'win' })
      }
      break
    case 'surge':
      state.boosts.surge = true
      showToast('SKILL ARMED', 'Surge', 'The next failed sequence or keypad attempt will be absorbed.', 'success')
      assistant.push('Surge armed. Next bad input gets eaten instead of resetting us.', { tone: 'win' })
      break
    case 'hull-whisper':
      applied = scan(true)
      if (applied) {
        showToast('SKILL USED', 'Hull Whisper', 'Hidden items and clue markers are highlighted.', 'success')
        assistant.push('Hull Whisper online. I can hear the loose panels. The glowing marks are where the useful things are.', { tone: 'win' })
      } else {
        assistant.push('I am already sweeping the deck. Let the current scan finish first.')
      }
      break
    case 'star-sight': {
      const solved = state.deckIndex === 2 ? state.navSolved : state.deckIndex === 0 ? state.codeKnown : true
      if (solved || state.deckIndex === 1) {
        applied = false
        assistant.push(state.deckIndex === 1
          ? 'No alignment array on this deck. Save Star Sight for the bridge.'
          : 'That alignment array is already solved. Star Sight would be wasted.')
      } else {
        state.boosts.star = true
        showToast('SKILL ARMED', 'Star Sight', 'The next alignment array will auto-select its first star.', 'success')
        assistant.push('Star Sight armed. Open the array and I will lock the first star for you.', { tone: 'win' })
      }
      break
    }
    case 'door-sense':
      state.doorSenseUntil = Date.now() + 30000
      syncMarkers()
      window.setTimeout(() => syncMarkers(), 30300)
      showToast('SKILL USED', 'Door Sense', 'The exit marker is tagged for thirty seconds.', 'success')
      assistant.push('Door Sense online. The exit is the marker pulsing at the front of the deck.', { tone: 'win' })
      break
    case 'vector-lock':
      if (state.deckIndex === 1) {
        applied = false
        assistant.push('No keypad on this deck. Save Vector Lock for the cryo console or the bridge helm.')
      } else {
        state.boosts.digits = 2
        showToast('SKILL ARMED', 'Vector Lock', 'The next keypad will open with two digits pre-filled.', 'success')
        assistant.push('Vector Lock armed. Open the keypad and I will pre-fill two digits.', { tone: 'win' })
      }
      break
    case 'warp-core':
      if (state.deckIndex !== 2 || !state.vectorAccepted || state.won) {
        applied = false
        assistant.push('Warp Core needs an accepted jump vector on the bridge helm. Save it for the final launch.')
      } else {
        audio.powerUp()
        showToast('SKILL USED', 'Warp Core', 'Emergency launch assist engaged.', 'success')
        window.setTimeout(() => finishGame(), 500)
      }
      break
    default:
      applied = false
      break
  }

  if (!applied) return
  state.gems -= skill.cost
  audio.click()
  refreshUi()
}

function hintPhase() {
  if (state.deckIndex === 0) {
    if (!state.drawerOpen) return 'drawer'
    if (!state.hasFuse && !state.power) return state.fuseInstalled ? 'power' : 'fuse'
    if (!state.power) return 'power'
    if (!state.clueSeen) return 'clue'
    if (!state.codeKnown) return 'stars'
    if (!state.doorOpen) return 'code'
    return 'exit'
  }
  if (state.deckIndex === 1) {
    if (!state.cutterLockerOpen) return 'locker'
    if (!state.hasCutter) return 'cutter'
    if (!state.breakerSolved) return 'breaker'
    return 'hatch'
  }
  if (!state.navClueSeen) return 'chart'
  if (!state.navSolved) return 'stars'
  if (!state.vectorAccepted) return 'vector'
  return 'launch'
}

function giveHint() {
  const phase = hintPhase()
  if (state.lastHintPhase !== phase) {
    state.lastHintPhase = phase
    state.hintStage = 0
  } else {
    state.hintStage += 1
  }
  const deckHints = HINTS[currentDeck().id] || HINTS.cryo
  const list = deckHints[phase] || Object.values(deckHints)[0]
  const text = list[Math.min(state.hintStage, list.length - 1)]
  state.hintsUsed += 1
  updateHintCount()
  audio.speak()
  assistant.push(text, { tone: 'alert' })
  return text
}

function statusText() {
  if (state.deckIndex === 0) {
    const parts = [
      `Power ${state.power ? 'online' : 'offline'}`,
      state.codeKnown ? `launch code ${CRYO_CODE.split('').join('-')} recovered` : 'launch code locked',
      state.doorOpen ? 'airlock open' : 'airlock sealed'
    ]
    if (state.hasFuse) parts.push('carrying the spare fuse')
    return `${parts.join(' · ')}.`
  }
  if (state.deckIndex === 1) {
    const parts = [
      state.hasCutter ? 'plasma cutter secured' : 'plasma cutter missing',
      state.breakerSolved ? 'reactor feed stable' : 'reactor feed unstable',
      state.hatchOpen ? 'hatch open' : 'hatch sealed'
    ]
    return `${parts.join(' · ')}.`
  }
  const parts = [
    state.navSolved ? 'NAV array aligned' : 'NAV array unaligned',
    state.vectorAccepted ? 'jump vector accepted' : 'jump vector missing',
    state.vectorAccepted ? 'helm ready' : 'helm locked'
  ]
  return `${parts.join(' · ')}.`
}

function showStatus() {
  assistant.push(`${statusText()} ${state.gems} gems banked, ${state.skills.length} skills online.`)
}

function scan(enhanced = false) {
  if (!state.started || state.scanning) return false
  state.scanning = true
  audio.scan()
  room?.setScanning(true)
  refs.scanSweep.classList.remove('active')
  void refs.scanSweep.offsetWidth
  refs.scanSweep.classList.add('active')
  const found = []
  if (state.deckIndex === 0) {
    if (!state.drawerOpen) found.push('console drawer')
    else if (!state.hasFuse) found.push('spare fuse')
    if (!state.power) found.push(state.hasFuse ? 'aux relay' : 'aux relay (needs fuse)')
    if (state.power && !state.clueSeen) found.push('crew plaque')
    if (state.power && !state.codeKnown) found.push('star projector')
    if (state.power) found.push('launch keypad')
    found.push('airlock 01')
  } else if (state.deckIndex === 1) {
    if (!state.cutterLockerOpen) found.push('tool locker')
    else if (!state.hasCutter) found.push('plasma cutter')
    if (!state.breakerSolved) found.push('breaker panel', 'reactor core')
    found.push('coolant pump', 'deck hatch')
  } else {
    if (!state.navClueSeen) found.push('drift chart')
    if (!state.navSolved) found.push('NAV-7 alignment array')
    if (state.navSolved && !state.vectorAccepted) found.push('jump keypad')
    found.push('launch helm')
  }
  assistant.push(`Scan complete. I am flagging: ${found.join(', ')}. ${enhanced ? 'Deep sweep active — markers are enhanced.' : 'The glowing markers are now enhanced.'}`, { tone: 'alert' })
  const duration = enhanced ? 20000 : 6000
  state.scanUntil = Date.now() + duration
  clearTimeout(scanTimer)
  scanTimer = window.setTimeout(() => {
    state.scanning = false
    room?.setScanning(false)
    refs.scanSweep.classList.remove('active')
  }, duration)
  return true
}

function answerQuestion(text) {
  const query = text.toLowerCase()
  if (/(skill|loadout|upgrade|gem|ability)/.test(query)) {
    assistant.push(`You have ${state.gems} gems and ${state.skills.length} unlocked skills. Every completed task earns gems and upgrades one of my systems. Open the PIP loadout above the chat and spend gems on a skill when a puzzle needs a push.`)
    return
  }
  if (/(hint|stuck|help|lost)/.test(query)) {
    giveHint()
    return
  }
  if (/(scan|look around|search)/.test(query)) {
    scan()
    return
  }
  if (/(status|progress|objective|what now|what next)/.test(query)) {
    showStatus()
    return
  }
  if (/(who|name|pip|are you)/.test(query)) {
    assistant.push('PIP. Personal Interface Pilot, ECHO-7. I run the local systems, the door, and the commentary. Every task you finish makes me a little more useful. Mostly the commentary.')
    return
  }
  if (/(hello|hi|hey|yo)\b/.test(query)) {
    assistant.push(hintPhase() === 'launch' ? 'Hello. Helm is live. Go.' : `Eyes up. ${currentDeck().name} is still sealed. What do you need?`)
    return
  }
  if (/(deck|level|ship|room)/.test(query)) {
    assistant.push(`We are on ${currentDeck().code} — ${currentDeck().name}. ${state.deckIndex < DECKS.length - 1 ? `Clear this deck to unlock ${DECKS[state.deckIndex + 1].name}.` : 'Clear the bridge and we launch.'}`)
    return
  }
  if (state.deckIndex === 0) {
    if (/(fuse|power|relay|breaker|drawer)/.test(query)) {
      if (!state.power) {
        assistant.push(state.hasFuse
          ? 'You have the fuse. The auxiliary relay is the cabinet on your left wall. Insert it there.'
          : state.drawerOpen
            ? 'The fuse is in the open console drawer on your right. Click it, then take it to the relay on the left wall.'
            : 'Open the console drawer on your right. There should be a fuse inside — the relay on the left wall needs it.')
      } else {
        assistant.push('Power is online. Save the victory lap for after the airlock.')
      }
      return
    }
    if (/(star|constellation|projector|plaque|sequence|order)/.test(query)) {
      if (!state.power) assistant.push('Projector needs auxiliary power. Relay cabinet, left wall.')
      else if (state.codeKnown) assistant.push(`Already decoded. The sequence was Red Giant, Castor, Pollux, The Eye. Code: ${CRYO_CODE.split('').join('-')}.`)
      else if (!state.clueSeen) assistant.push('The order is on the crew plaque beside the airlock. Read it, then use the star projector on the right wall.')
      else assistant.push('Plaque order: Red Giant, the Twins — Castor and Pollux — then The Eye. Click those four stars on the projector in that order.')
      return
    }
    if (/(code|keypad|7394|digits|number)/.test(query)) {
      assistant.push(state.codeKnown
        ? `Launch code is ${CRYO_CODE.split('').join('-')}. Keypad is on the console.`
        : 'I do not have it yet. The NAV-7 projector on the right wall decrypts it once the star sequence is verified.')
      return
    }
    if (/(door|airlock|escape|exit|leave|out)/.test(query)) {
      if (state.doorOpen) assistant.push('Airlock is open. Click the door. I will handle the paperwork.')
      else if (!state.power) assistant.push('Airlock is sealed and unpowered. Fuse first, then the relay.')
      else if (!state.codeKnown) assistant.push('Airlock needs a launch code. The star projector decrypts it. The plaque gives the order.')
      else assistant.push(`Enter ${CRYO_CODE.split('').join('-')} on the launch keypad, then click the airlock.`)
      return
    }
  } else if (state.deckIndex === 1) {
    if (/(cutter|plasma|tool|locker|drawer)/.test(query)) {
      assistant.push(state.hasCutter
        ? 'Cutter is in your kit. The hatch needs it after the breaker grid is stable.'
        : state.cutterLockerOpen
          ? 'The plasma cutter is inside the open tool locker on your right. Click it.'
          : 'Open the tool locker on your right. The plasma cutter is inside.')
      return
    }
    if (/(breaker|grid|reactor|power|cell)/.test(query)) {
      assistant.push(state.breakerSolved
        ? 'Breaker grid is stable. Hatch lock is released.'
        : 'Open the breaker panel on the right wall. Bring every cell online. A pulse flips the cell you hit and the four beside it. Use Overdrive if you unlocked it.')
      return
    }
    if (/(hatch|door|escape|exit|leave|out)/.test(query)) {
      if (!state.hasCutter) assistant.push('Hatch is reinforced. Find the plasma cutter in the tool locker.')
      else if (!state.breakerSolved) assistant.push('Magnetic lock is still on. Stabilize the breaker grid first.')
      else assistant.push('Hatch is ready. Click it and cut us out of engineering.')
      return
    }
  } else {
    if (/(chart|window|drift|clue|order)/.test(query)) {
      assistant.push(state.navClueSeen
        ? 'Drift chart order: Eye, Castor, Red Giant, Pollux. Use that on the NAV array.'
        : 'Read the drift chart on the observation window behind you. It names the star order.')
      return
    }
    if (/(star|nav|array|sequence|align)/.test(query)) {
      assistant.push(state.navSolved
        ? `Array is aligned. Jump vector is ${BRIDGE_CODE.split('').join('-')}. Enter it on the helm keypad.`
        : 'Open the NAV-7 alignment array on the right wall. Follow the drift chart: Eye, Castor, Red Giant, Pollux.')
      return
    }
    if (/(code|keypad|vector|digits|number)/.test(query)) {
      assistant.push(state.navSolved
        ? `Jump vector is ${BRIDGE_CODE.split('').join('-')}. Keypad is on the console.`
        : 'No vector yet. Align the NAV array, then the keypad will accept a vector.')
      return
    }
    if (/(door|helm|launch|escape|exit|leave|out|ship)/.test(query)) {
      if (state.vectorAccepted) assistant.push('Vector accepted. Click the launch helm and get us out of here.')
      else if (!state.navSolved) assistant.push('Helm is locked. Align the NAV array and compute the vector first.')
      else assistant.push(`Enter ${BRIDGE_CODE.split('').join('-')} on the jump keypad to unlock the helm.`)
      return
    }
  }
  if (/(cryo|pod|sleep|wake)/.test(query)) {
    assistant.push('That was your pod. You have been out for a while. O2 is at eighteen percent, so no naps.')
    return
  }
  if (/(thank|thanks|nice|good|great)/.test(query)) {
    assistant.push('Save it for after the launch.')
    return
  }
  if (/(joke|funny|bored)/.test(query)) {
    assistant.push('Two airlocks walk into a bar. Only one leaves. I am working on the timing.')
    return
  }
  const next = {
    drawer: 'The console drawer on your right is the most obvious place to start.',
    fuse: 'The spare fuse is in the open console drawer.',
    power: 'Bring the fuse to the auxiliary relay on the left wall.',
    clue: 'Read the crew plaque beside the airlock.',
    stars: 'Use the star projector on the right wall. Follow the plaque order.',
    code: `Enter ${CRYO_CODE.split('').join('-')} on the launch keypad.`,
    exit: 'The airlock is open. Click the door.',
    locker: 'Open the tool locker on your right.',
    cutter: 'Take the plasma cutter from the tool locker.',
    breaker: 'Open the breaker panel on the right wall and bring every cell online.',
    hatch: 'Cut through the deck hatch once the breaker grid is stable.',
    chart: 'Read the drift chart on the observation window.',
    vector: `Enter ${BRIDGE_CODE.split('').join('-')} on the jump keypad.`,
    launch: 'The helm is live. Click it.'
  }
  assistant.push(next[hintPhase()] || 'Check the glowing markers. One of them is the next step.')
}

/* ---------- event wiring ---------- */
refs.startBtn.addEventListener('click', startGame)
refs.soundBtn.addEventListener('click', () => {
  state.muted = !state.muted
  audio.setMuted(state.muted)
  refs.soundBtn.classList.toggle('muted', state.muted)
  refs.soundBtn.setAttribute('aria-label', state.muted ? 'Unmute sound' : 'Mute sound')
  refs.soundBtn.title = state.muted ? 'Unmute sound' : 'Mute sound'
})
refs.scanBtn.addEventListener('click', () => scan())
refs.assistantScanBtn.addEventListener('click', () => scan())
refs.hintBtn.addEventListener('click', giveHint)
refs.statusBtn.addEventListener('click', showStatus)
refs.lookLeft.addEventListener('click', () => room?.nudgeYaw(0.32))
refs.lookRight.addEventListener('click', () => room?.nudgeYaw(-0.32))
refs.playAgain.addEventListener('click', () => window.location.reload())
refs.nextDeckBtn.addEventListener('click', () => {
  const nextIndex = Math.min(state.deckIndex + 1, DECKS.length - 1)
  enterDeck(nextIndex)
})
refs.loadoutToggle.addEventListener('click', () => {
  setLoadoutOpen(refs.pipLoadout.classList.contains('collapsed'))
})
refs.breakerReset.addEventListener('click', resetBreaker)

for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', () => closeModal(document.getElementById(button.dataset.close)))
}
for (const modal of [refs.constellationModal, refs.keypadModal, refs.breakerModal]) {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal(modal)
  })
}

refs.keypadClear.addEventListener('click', () => {
  const accepted = state.deckIndex === 2 ? state.vectorAccepted : state.doorOpen
  if (state.keypadLocked || accepted) return
  state.keypad = ''
  renderKeypad()
  setKeypadStatus('LOCKED', '', state.deckIndex === 2 ? 'ENTER 4-DIGIT JUMP VECTOR' : 'ENTER 4-DIGIT LAUNCH CODE')
  refs.keypadHint.textContent = keypadHintText()
})
refs.keypadEnter.addEventListener('click', validateCode)

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.activeModal) {
    closeModal(state.activeModal)
    return
  }
  if (!state.activeModal || state.activeModal !== refs.keypadModal) return
  const accepted = state.deckIndex === 2 ? state.vectorAccepted : state.doorOpen
  if (accepted) return
  if (/^[0-9]$/.test(event.key)) pressKey(event.key)
  else if (event.key === 'Enter') validateCode()
  else if (event.key === 'Backspace') {
    state.keypad = state.keypad.slice(0, -1)
    renderKeypad()
  }
})

function initAssistantToggle() {
  const reopen = document.createElement('button')
  reopen.type = 'button'
  reopen.id = 'pip-reopen'
  reopen.className = 'pip-reopen'
  reopen.setAttribute('aria-label', 'Open co-pilot')
  reopen.innerHTML = '<span class="pip-reopen-dot"></span><span>PIP</span>'
  reopen.addEventListener('click', () => {
    document.body.classList.remove('assistant-collapsed')
  })
  refs.canvas.parentElement.appendChild(reopen)
  refs.assistantToggle.addEventListener('click', () => {
    document.body.classList.toggle('assistant-collapsed')
  })
}

function initIntroBest() {
  const best = Number(localStorage.getItem('echo7-best') || 0)
  if (best > 0) {
    refs.introBest.innerHTML = `BEST ESCAPE <strong>${formatTime(best)}</strong>`
  }
}

function init() {
  buildStarField()
  buildKeypad()
  renderBreaker()
  initAssistantToggle()
  initIntroBest()
  renderLoadout()
  renderDeckRail()
  updateDeckChrome()
  updateInventory()
  updateObjectives()
  renderSequencePips()
  syncMarkers()
  if (window.innerWidth <= 900) setLoadoutOpen(false)
  assistant.push('PIP online. Waiting for crew link.', { tone: '' })
  window.setTimeout(() => {
    if (!state.started) assistant.push('Station diagnostics complete. Three decks sealed. Crew vitals: one. That would be you.')
  }, 1400)
}

init()
