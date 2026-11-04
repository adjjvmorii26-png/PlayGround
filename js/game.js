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
  constellationModal: $('#constellation-modal'),
  starmap: $('#starmap'),
  starLine: $('#star-line'),
  sequencePips: $('#sequence-pips'),
  constellationStatus: $('#constellation-status'),
  constellationClue: $('#constellation-clue'),
  codeReveal: $('#code-reveal'),
  sequenceLock: $('#sequence-lock'),
  projectorState: $('#projector-state'),
  keypadModal: $('#keypad-modal'),
  keypadGrid: $('#keypad-grid'),
  keypadCode: $('#keypad-code'),
  keypadStatus: $('#keypad-status'),
  keypadLockLabel: $('#keypad-lock-label'),
  keypadHint: $('#keypad-hint'),
  keypadClear: $('#keypad-clear'),
  keypadEnter: $('#keypad-enter'),
  ending: $('#ending'),
  endingRank: $('#ending-rank'),
  endingTime: $('#ending-time'),
  endingHints: $('#ending-hints'),
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
const SEQUENCE = ['red', 'castor', 'pollux', 'eye']
const LAUNCH_CODE = '7394'

const HINTS = {
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
  ],
  won: [
    'You are out. Try not to miss me.',
    'Escape complete. Nothing left to do but brag.',
    'We are clear. Tell them I helped.'
  ]
}

const state = {
  started: false,
  power: false,
  drawerOpen: false,
  hasFuse: false,
  fuseInstalled: false,
  clueSeen: false,
  codeKnown: false,
  constellationSolved: false,
  codeEntered: false,
  doorOpen: false,
  won: false,
  hintsUsed: 0,
  hintStage: 0,
  lastHintPhase: '',
  startTime: 0,
  elapsed: 0,
  activeModal: null,
  scanning: false,
  sequence: [],
  keypad: '',
  keypadLocked: false,
  muted: false,
  elapsedTimer: null
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
  }, 4600)
}

function updateHintCount() {
  refs.hintCount.textContent = String(state.hintsUsed)
}

function updateInventory() {
  const items = []
  if (state.hasFuse) items.push({ icon: 'ϟ', name: 'Fuse' })
  if (state.codeKnown) items.push({ icon: '#', name: LAUNCH_CODE })
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
  const done = [state.power, state.codeKnown, state.doorOpen, state.won]
  const items = [...refs.objectiveList.querySelectorAll('li')]
  items.forEach((item, index) => {
    item.classList.toggle('done', done[index])
    const expectedNext = !done[index] && done.slice(0, index).every(Boolean)
    item.classList.toggle('active', expectedNext)
  })
  const count = done.filter(Boolean).length
  refs.objProgress.textContent = `${count} / 4`
  refs.objBarFill.style.width = `${(count / 4) * 100}%`
}

function syncMarkers() {
  if (!room) return
  const attention = {
    drawer: !state.drawerOpen && !state.hasFuse,
    fuse: state.drawerOpen && !state.hasFuse,
    relay: state.hasFuse && !state.power,
    plaque: state.power && !state.clueSeen,
    starchart: state.power && !state.codeKnown,
    keypad: state.codeKnown && !state.doorOpen,
    door: state.doorOpen && !state.won
  }
  room.setMarker('drawer', {
    hidden: state.drawerOpen || state.hasFuse,
    done: state.drawerOpen,
    attention: attention.drawer,
    label: 'Console drawer'
  })
  room.setMarker('fuse', {
    hidden: !state.drawerOpen || state.hasFuse || state.fuseInstalled || state.power,
    attention: attention.fuse && !state.fuseInstalled && !state.power,
    label: 'Spare fuse'
  })
  room.setMarker('relay', {
    hidden: false,
    done: state.power,
    attention: attention.relay,
    label: state.power ? 'Aux relay (online)' : state.hasFuse ? 'Aux relay (fuse ready)' : 'Aux power relay'
  })
  room.setMarker('plaque', {
    done: state.clueSeen,
    attention: attention.plaque,
    label: 'Crew plaque'
  })
  room.setMarker('starchart', {
    done: state.codeKnown,
    attention: attention.starchart,
    label: state.power ? (state.codeKnown ? 'Star projector (decoded)' : 'Star projector (online)') : 'Star projector (offline)'
  })
  room.setMarker('keypad', {
    done: state.doorOpen,
    attention: attention.keypad,
    label: state.power ? 'Launch keypad' : 'Launch keypad (offline)'
  })
  room.setMarker('door', {
    attention: attention.door,
    label: state.doorOpen ? 'Airlock 01 (open)' : state.power ? 'Airlock 01 (sealed)' : 'Airlock 01 (no power)'
  })
}

function refreshUi() {
  updateObjectives()
  updateInventory()
  syncMarkers()
  updateHintCount()
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
  refs.intro.classList.add('hidden')
  room.setActive(true)
  window.requestAnimationFrame(() => {
    room.resize()
    room.startRendering()
  })
  syncMarkers()
  updateObjectives()
  startTimer()
  assistant.push("You're awake. Good. I'm PIP, your co-pilot. ECHO-7 is running on emergency power, airlock 01 is sealed, and the air is… let's call it limited. Find us a way out — I'll flag what I can.")
  typingDelay = window.setTimeout(() => {
    assistant.push('Start with the console drawer on your right. Drag anywhere to look around. Tap a glowing marker to interact.', { tone: 'alert' })
  }, 2300)
  showToast('LINK ESTABLISHED', 'PIP is online', 'Drag to look. Click markers to interact.', 'success')
}

function collectFuse() {
  if (state.hasFuse) return
  state.hasFuse = true
  room.takeFuse?.()
  refs.markerLayer.classList.remove('flash')
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
  room.openDrawer?.()
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
  room.setPower(true)
  room.pulse()
  refreshUi()
  window.setTimeout(() => {
    assistant.push("Aux power is back. I can see the NAV-7 projector now — and I can read the crew plaque by the airlock. The code starts there.", { tone: 'alert' })
    showToast('POWER RESTORED', 'Aux relay online', 'The star projector and launch keypad are live.', 'success')
  }, 800)
  window.setTimeout(() => {
    showToast('NEW OBJECTIVE', 'Decode the launch sequence', 'Read the crew plaque, then use the star projector.', '')
  }, 5200)
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
    assistant.push("Still the same verse: Red Giant, the Twins, then the Eye. The projector is on the right wall.")
  }
}

function openConstellation() {
  if (!state.power) {
    audio.error()
    showToast('NO POWER', 'NAV-7 projector is offline', 'Restore auxiliary power first.', 'warn')
    assistant.push('The projector is dead until we restore auxiliary power. Left wall, relay cabinet.', { tone: 'alert' })
    return
  }
  updateConstellationClue()
  renderSequencePips()
  updateStarLine()
  refs.sequenceLock.textContent = state.codeKnown ? 'RELEASED' : 'ARMED'
  refs.projectorState.textContent = state.codeKnown ? 'DECODED' : 'ONLINE'
  refs.codeReveal.classList.toggle('visible', state.codeKnown)
  setConstellationStatus(state.codeKnown ? 'SEQUENCE VERIFIED' : 'AWAITING SEQUENCE', state.codeKnown ? 'ok' : '')
  if (state.codeKnown) {
    refs.starLine.classList.add('visible')
    document.querySelectorAll('.star').forEach((star) => {
      if (SEQUENCE.includes(star.dataset.id)) star.classList.add('selected')
    })
  }
  openModal(refs.constellationModal)
}

function openKeypad() {
  if (!state.power) {
    audio.error()
    showToast('KEYPAD OFFLINE', 'No power to launch control', 'Restore auxiliary power first.', 'warn')
    assistant.push('Keypad is dark. Power first. Relay cabinet, left wall.', { tone: 'alert' })
    return
  }
  if (state.doorOpen) {
    refs.keypadCode.textContent = LAUNCH_CODE.split('').join(' ')
    setKeypadStatus('ACCESS GRANTED', 'ok', 'AIRLOCK CYCLING')
    refs.keypadLockLabel.textContent = 'LAUNCH AUTHORIZATION ACCEPTED'
    openModal(refs.keypadModal)
    return
  }
  state.keypad = ''
  state.keypadLocked = false
  renderKeypad()
  setKeypadStatus('LOCKED', '')
  refs.keypadLockLabel.textContent = 'ENTER 4-DIGIT LAUNCH CODE'
  refs.keypadHint.textContent = state.codeKnown
    ? 'Launch code recovered. Check your kit if you need the digits.'
    : 'The launch code was recovered from the NAV-7 constellation protocol. Find the crew plaque for the order.'
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

function interact(id) {
  if (!state.started || state.activeModal || state.won) return
  audio.resume()
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
      room.pulse()
      assistant.push(pipLine())
      break
    case 'window':
      audio.click()
      assistant.push("That is the Kepler Nebula. The NAV-7 projector uses the same star chart. The crew plaque names the order.")
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

function tryDoor() {
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
      ? `Sealed. Enter ${LAUNCH_CODE.split('').join('-')} on the launch keypad and I will cycle the door.`
      : 'Sealed. We need the launch code. The projector on the right wall should decrypt it.', { tone: 'alert' })
    return
  }
  finishGame()
}

function pipLine() {
  const lines = [
    'You are looking at my local core. Most of me is in the walls. Try not to judge the housing.',
    'I have been alone on this station for 412 days. Do not make it weird.',
    'If I had hands, I would have opened the airlock myself. Alas. You are the hands.',
    'I could tell you a joke, but the air supply is a better motivator.',
    'My diagnostic says the room is 94 percent lethal. The other 6 percent is vibes.'
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

function updateConstellationClue() {
  if (state.codeKnown) {
    refs.constellationClue.textContent = 'From the Red Giant, follow the Twins, then the Eye. Sequence verified. Launch code transferred.'
    return
  }
  refs.constellationClue.textContent = state.clueSeen
    ? 'From the Red Giant, follow the Twins, then the Eye.'
    : 'No order recovered yet. Find the crew plaque beside the airlock.'
}

function setConstellationStatus(text, tone = '') {
  refs.constellationStatus.textContent = text
  refs.constellationStatus.className = `status-line${tone ? ` ${tone}` : ''}`
}

function renderSequencePips() {
  const slots = [...refs.sequencePips.querySelectorAll('.pip-slot')]
  slots.forEach((slot, index) => {
    const id = state.sequence[index]
    const star = STARS.find((entry) => entry.id === id)
    slot.classList.toggle('filled', Boolean(star))
    slot.querySelector('em').textContent = star ? star.short : '—'
  })
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

function pickStar(id) {
  if (state.codeKnown) return
  const expected = SEQUENCE[state.sequence.length]
  const element = document.querySelector(`.star[data-id="${id}"]`)
  if (id === expected) {
    state.sequence.push(id)
    element?.classList.add('selected')
    audio.tone({ frequency: 480 + state.sequence.length * 110, duration: 0.16, type: 'sine', volume: 0.06 })
    renderSequencePips()
    updateStarLine()
    if (state.sequence.length === SEQUENCE.length) solveConstellation()
  } else {
    audio.error()
    element?.classList.add('wrong')
    refs.starmap.classList.remove('shake')
    void refs.starmap.offsetWidth
    refs.starmap.classList.add('shake')
    setConstellationStatus('SEQUENCE REJECTED', 'bad')
    window.setTimeout(() => {
      state.sequence = []
      document.querySelectorAll('.star').forEach((star) => star.classList.remove('selected', 'wrong'))
      renderSequencePips()
      updateStarLine()
      setConstellationStatus('AWAITING SEQUENCE', '')
    }, 620)
  }
}

function solveConstellation() {
  state.codeKnown = true
  state.constellationSolved = true
  state.sequence = [...SEQUENCE]
  room.setCodeKnown()
  room.pulse()
  audio.success()
  document.querySelectorAll('.star').forEach((star) => {
    if (SEQUENCE.includes(star.dataset.id)) star.classList.add('selected')
    star.classList.remove('wrong')
  })
  renderSequencePips()
  updateStarLine()
  updateConstellationClue()
  setConstellationStatus('SEQUENCE VERIFIED', 'ok')
  refs.sequenceLock.textContent = 'RELEASED'
  refs.projectorState.textContent = 'DECODED'
  refs.codeReveal.classList.add('visible')
  refreshUi()
  assistant.push(`Launch code confirmed: ${LAUNCH_CODE.split('').join(' ')}. It is in your kit. The keypad is on the console — enter it and I will cycle the airlock.`, { tone: 'win' })
  showToast('LAUNCH CODE RECOVERED', LAUNCH_CODE.split('').join(' '), 'Enter it on the launch keypad on the console.', 'success')
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

function pressKey(digit) {
  if (state.keypadLocked || state.doorOpen) return
  if (state.keypad.length >= 4) return
  state.keypad += digit
  audio.tone({ frequency: 560 + Number(digit) * 24, duration: 0.05, type: 'square', volume: 0.025 })
  renderKeypad()
  if (state.keypad.length === 4) {
    window.setTimeout(validateCode, 420)
  }
}

function validateCode() {
  if (state.keypadLocked || state.doorOpen) return
  if (state.keypad.length < 4) {
    setKeypadStatus('ENTER 4 DIGITS', 'bad')
    return
  }
  state.keypadLocked = true
  if (state.keypad === LAUNCH_CODE) {
    const guessed = !state.codeKnown
    state.codeKnown = true
    state.constellationSolved = true
    state.codeEntered = true
    state.doorOpen = true
    room.setCodeKnown()
    room.openDoor()
    audio.success()
    audio.door()
    setKeypadStatus('ACCESS GRANTED', 'ok', 'AIRLOCK CYCLING')
    refs.keypadHint.textContent = 'Airlock 01 is cycling. Click the airlock door to escape.'
    refreshUi()
    assistant.push(guessed
      ? "That was either a very lucky guess or you are better at this than you let on. Airlock is cycling — click the door."
      : 'Airlock is cycling. Door is open. Click it and get out of here.', { tone: 'win' })
    showToast('AIRLOCK UNLOCKED', 'Airlock 01 is open', 'Click the airlock door to escape.', 'success')
    window.setTimeout(() => closeModal(refs.keypadModal), 1700)
  } else {
    audio.error()
    setKeypadStatus('ACCESS DENIED', 'bad', 'AUTHORIZATION REJECTED')
    refs.keypadModal.querySelector('.modal-card').classList.add('shake')
    window.setTimeout(() => {
      refs.keypadModal.querySelector('.modal-card').classList.remove('shake')
      state.keypad = ''
      state.keypadLocked = false
      renderKeypad()
      setKeypadStatus('LOCKED', '', 'ENTER 4-DIGIT LAUNCH CODE')
      refs.keypadHint.textContent = state.codeKnown
        ? `Incorrect. The recovered code is ${LAUNCH_CODE.split('').join('-')}.`
        : 'Incorrect. The launch code is stored in the NAV-7 constellation protocol.'
    }, 900)
    if (state.codeKnown) assistant.push(`Negative. The recovered code is ${LAUNCH_CODE.split('').join('-')}. Try again.`)
  }
}

function finishGame() {
  if (state.won) return
  state.won = true
  state.elapsed = (performance.now() - state.startTime) / 1000
  clearInterval(state.elapsedTimer)
  refs.timerValue.textContent = formatTime(state.elapsed)
  updateObjectives()
  room.setActive(false)
  room.setMarkersBlocked(true)
  room.pulse()
  audio.success()
  audio.door()
  assistant.push("That's it. We're clear. Do not look back — the station is venting and I have already drafted the incident report.", { tone: 'win' })

  let rank = 'C'
  if (state.elapsed < 150 && state.hintsUsed <= 1) rank = 'S'
  else if (state.elapsed < 240 && state.hintsUsed <= 3) rank = 'A'
  else if (state.elapsed < 360) rank = 'B'

  refs.endingRank.textContent = rank
  refs.endingTime.textContent = formatTime(state.elapsed)
  refs.endingHints.textContent = String(state.hintsUsed)
  refs.endingQuote.innerHTML = state.hintsUsed === 0
    ? '“You did not even need me. I am choosing to be impressed.” <span>— PIP</span>'
    : state.hintsUsed <= 2
      ? '“Not bad for a human.” <span>— PIP</span>'
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

function hintPhase() {
  if (!state.drawerOpen) return 'drawer'
  if (!state.hasFuse && !state.power) return state.fuseInstalled ? 'power' : 'fuse'
  if (!state.power) return 'power'
  if (!state.clueSeen) return 'clue'
  if (!state.codeKnown) return 'stars'
  if (!state.doorOpen) return 'code'
  return 'exit'
}

function giveHint() {
  const phase = hintPhase()
  if (state.lastHintPhase !== phase) {
    state.lastHintPhase = phase
    state.hintStage = 0
  } else {
    state.hintStage += 1
  }
  const list = HINTS[phase] || HINTS.drawer
  const text = list[Math.min(state.hintStage, list.length - 1)]
  state.hintsUsed += 1
  updateHintCount()
  audio.speak()
  assistant.push(text, { tone: 'alert' })
  return text
}

function statusText() {
  const parts = [
    `Power ${state.power ? 'online' : 'offline'}`,
    state.codeKnown ? `launch code ${LAUNCH_CODE.split('').join('-')} recovered` : 'launch code locked',
    state.doorOpen ? 'airlock open' : 'airlock sealed'
  ]
  if (state.hasFuse) parts.push('carrying the spare fuse')
  return `${parts.join(' · ')}.`
}

function showStatus() {
  assistant.push(statusText())
}

function scan() {
  if (!state.started || state.scanning) return
  state.scanning = true
  audio.scan()
  room.setScanning(true)
  refs.scanSweep.classList.remove('active')
  void refs.scanSweep.offsetWidth
  refs.scanSweep.classList.add('active')
  const found = []
  if (!state.drawerOpen) found.push('console drawer')
  else if (!state.hasFuse) found.push('spare fuse')
  if (!state.power) found.push(state.hasFuse ? 'aux relay' : 'aux relay (needs fuse)')
  if (state.power && !state.clueSeen) found.push('crew plaque')
  if (state.power && !state.codeKnown) found.push('star projector')
  if (state.power) found.push('launch keypad')
  found.push('airlock 01')
  assistant.push(`Scan complete. I am flagging: ${found.join(', ')}. The glowing markers are now enhanced.`, { tone: 'alert' })
  window.setTimeout(() => {
    state.scanning = false
    room.setScanning(false)
    refs.scanSweep.classList.remove('active')
  }, 6000)
}

function answerQuestion(text) {
  const query = text.toLowerCase()
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
    assistant.push('PIP. Personal Interface Pilot, ECHO-7. I run the local systems, the door, and the commentary. Mostly the commentary.')
    return
  }
  if (/(hello|hi|hey|yo)\b/.test(query)) {
    assistant.push(hintPhase() === 'exit' ? 'Hello. Door is open. Go.' : 'Eyes up. Airlock is still sealed. What do you need?')
    return
  }
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
    else if (state.codeKnown) assistant.push(`Already decoded. The sequence was Red Giant, Castor, Pollux, The Eye. Code: ${LAUNCH_CODE.split('').join('-')}.`)
    else if (!state.clueSeen) assistant.push('The order is on the crew plaque beside the airlock. Read it, then use the star projector on the right wall.')
    else assistant.push('Plaque order: Red Giant, the Twins — Castor and Pollux — then The Eye. Click those four stars on the projector in that order.')
    return
  }
  if (/(code|keypad|7394|digits|number)/.test(query)) {
    assistant.push(state.codeKnown
      ? `Launch code is ${LAUNCH_CODE.split('').join('-')}. Keypad is on the console.`
      : 'I do not have it yet. The NAV-7 projector on the right wall decrypts it once the star sequence is verified.')
    return
  }
  if (/(door|airlock|escape|exit|leave|out)/.test(query)) {
    if (state.doorOpen) assistant.push('Door is open. Click the airlock. I will handle the paperwork.')
    else if (!state.power) assistant.push('Airlock is sealed and unpowered. Fuse first, then the relay.')
    else if (!state.codeKnown) assistant.push('Airlock needs a launch code. The star projector decrypts it. The plaque gives the order.')
    else assistant.push(`Enter ${LAUNCH_CODE.split('').join('-')} on the launch keypad, then click the airlock.`)
    return
  }
  if (/(cryo|pod|sleep|wake)/.test(query)) {
    assistant.push('That was your pod. You have been out for a while. O2 is at eighteen percent, so no naps.')
    return
  }
  if (/(thank|thanks|nice|good|great)/.test(query)) {
    assistant.push('Save it for after the airlock.')
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
    code: `Enter ${LAUNCH_CODE.split('').join('-')} on the launch keypad.`,
    exit: 'The airlock is open. Click the door.'
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
refs.scanBtn.addEventListener('click', scan)
refs.assistantScanBtn.addEventListener('click', scan)
refs.hintBtn.addEventListener('click', giveHint)
refs.statusBtn.addEventListener('click', showStatus)
refs.lookLeft.addEventListener('click', () => room?.nudgeYaw(0.32))
refs.lookRight.addEventListener('click', () => room?.nudgeYaw(-0.32))
refs.playAgain.addEventListener('click', () => window.location.reload())

for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', () => closeModal(document.getElementById(button.dataset.close)))
}
for (const modal of [refs.constellationModal, refs.keypadModal]) {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal(modal)
  })
}

refs.keypadClear.addEventListener('click', () => {
  if (state.keypadLocked || state.doorOpen) return
  state.keypad = ''
  renderKeypad()
  setKeypadStatus('LOCKED', '', 'ENTER 4-DIGIT LAUNCH CODE')
  refs.keypadHint.textContent = state.codeKnown
    ? 'Launch code recovered. Check your kit if you need the digits.'
    : 'The launch code was recovered from the NAV-7 constellation protocol. Find the crew plaque for the order.'
})
refs.keypadEnter.addEventListener('click', validateCode)

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.activeModal) {
    closeModal(state.activeModal)
    return
  }
  if (!state.activeModal || state.activeModal !== refs.keypadModal || state.doorOpen) return
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
  initAssistantToggle()
  initIntroBest()
  updateInventory()
  updateObjectives()
  renderSequencePips()
  syncMarkers()
  assistant.push('PIP online. Waiting for crew link.', { tone: '' })
  window.setTimeout(() => {
    if (!state.started) assistant.push('Station diagnostics complete. Airlock sealed. Crew vitals: one. That would be you.')
  }, 1400)
}

init()
