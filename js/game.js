import { THREE, clamp, damp, makeGlowTexture, makeSoftTexture, formatDist } from "./utils.js";
import {
  PALETTES,
  START_POS,
  QUALITY,
  SAVE_KEY,
  MAX_SPEED,
  WARP_SPEED,
  ATTUNE_RANGE,
  CHUNK,
} from "./palettes.js";
import { World } from "./world.js";
import { createShip } from "./ship.js";
import { PostFX } from "./post.js";
import { Soundscape } from "./audio.js";
import { HUD } from "./hud.js";

const isCoarse = window.matchMedia("(pointer: coarse)").matches;
const $ = (sel) => document.querySelector(sel);

const dom = {
  body: document.body,
  canvas: $("#scene"),
  startBtn: $("#startBtn"),
  guideBtn: $("#guideBtn"),
  soundBtn: $("#soundBtn"),
  photoBtn: $("#photoBtn"),
  helpBtn: $("#helpBtn"),
  helpPanel: $("#helpPanel"),
  helpClose: $("#helpClose"),
  saveFrameBtn: $("#saveFrameBtn"),
  exitPhotoBtn: $("#exitPhotoBtn"),
  attunePrompt: $("#attunePrompt"),
  marker: $("#echoMarker"),
  markerDist: $("#markerDist"),
  speedVal: $("#speedVal"),
  thrustBar: $("#thrustBar"),
  warpBar: $("#warpBar"),
  coordLine: $("#coordLine"),
  flightMode: $("#flightMode"),
  signalState: $("#signalState"),
  chordCount: $("#chordCount"),
  chordPips: $("#chordPips"),
  nearestDist: $("#nearestDist"),
  moteCount: $("#moteCount"),
  lumaCount: $("#lumaCount"),
  sectorReadout: $("#sectorReadout"),
  sectorHud: $("#sectorHud"),
  toast: $(".toast"),
  log: $("#log"),
  compass: $("#compass"),
  minimap: $("#minimap"),
  fallback: $("#fallback"),
  stick: $("#stick"),
  stickKnob: $("#stickKnob"),
  touchThrust: $("#touchThrust"),
  touchBoost: $("#touchBoost"),
  touchPulse: $("#touchPulse"),
  compassCtx: $("#compass").getContext("2d"),
  minimapCtx: $("#minimap").getContext("2d"),
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

const saved = loadSave();
const activated = new Set(Array.isArray(saved.activated) ? saved.activated : []);

const state = {
  started: false,
  ready: false,
  cameraCut: false,
  photo: false,
  help: false,
  muted: Boolean(saved.muted),
  chords: Number.isFinite(saved.chords) ? saved.chords : activated.size,
  motes: Number.isFinite(saved.motes) ? saved.motes : 0,
  paletteIndex: 0,
  palette: PALETTES[0],
  warp: 1,
  speed: 0,
  throttle: 0,
  boosting: false,
  pulseCd: 0,
  time: 0,
  quality: isCoarse ? 1 : 0,
  pointerLocked: false,
  camDist: 16.5,
  photoDist: 14,
  photoYaw: 0,
  photoPitch: 0.25,
};
state.paletteIndex = clamp(state.chords, 0, PALETTES.length - 1);

const flight = {
  yaw: 0,
  pitch: 0.02,
  roll: 0,
  touchX: 0,
  touchY: 0,
};
const keys = new Set();
const touch = { thrust: false, boost: false, steering: false };

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: dom.canvas,
    antialias: false,
    alpha: false,
    stencil: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
} catch (error) {
  dom.fallback.hidden = false;
  dom.body.classList.remove("loading");
  throw error;
}

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a);
const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 45000);
camera.position.copy(START_POS).add(new THREE.Vector3(0, 7, 26));
camera.lookAt(START_POS);

scene.add(new THREE.HemisphereLight(0x5d8cff, 0x05070c, 0.55));
const keyLight = new THREE.DirectionalLight(0xd8f6ff, 2.15);
keyLight.position.set(-1, 0.65, 0.8);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xff5fc8, 0.72);
fillLight.position.set(1.2, -0.4, -0.8);
scene.add(fillLight);

const glowTexture = makeGlowTexture();
const softTexture = makeSoftTexture();
const sound = new Soundscape();
const world = new World(scene, START_POS, sound, glowTexture, softTexture, activated, PALETTES[state.paletteIndex]);
const ship = createShip(glowTexture);
ship.group.position.copy(START_POS);
ship.resetTrail();
scene.add(ship.group);
scene.add(ship.trailLine);
scene.add(ship.trailPoints);
scene.add(ship.enginePoints);

const post = new PostFX(renderer, scene, camera);
const hud = new HUD(dom, state);

function resize() {
  const quality = QUALITY[state.quality];
  post.setQuality(quality);
  post.resize(window.innerWidth, window.innerHeight);
  ship.setPixelRatio(quality.dpr);
  world.sky.starUniforms.uPixelRatio.value = quality.dpr;
}

function applyPalette(index, instant = false) {
  const safe = clamp(index, 0, PALETTES.length - 1);
  state.paletteIndex = safe;
  state.palette = PALETTES[safe];
  world.setPalette(state.palette, instant);
  ship.setPalette(state.palette);
  hud.setPalette(state.palette);
  sound.setChord(safe, instant);
}

let saveTimer = 0;
function saveGame() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        activated: Array.from(activated),
        chords: state.chords,
        motes: state.motes,
        muted: state.muted,
      })
    );
  } catch {}
}
function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveGame, 900);
}

function startGame() {
  if (state.started || !state.ready) return;
  state.started = true;
  state.cameraCut = true;
  state.help = false;
  dom.helpPanel.classList.remove("open");
  dom.helpPanel.setAttribute("aria-hidden", "true");
  dom.body.classList.remove("help-open", "loading");
  dom.body.classList.add("playing", "pointer-free");
  sound.start().then(() => {
    sound.setMuted(state.muted);
    sound.setChord(state.paletteIndex, true);
  }).catch(() => {});
  hud.setMuted(state.muted);
  const nearest = world.findNearestEcho(ship.group.position);
  hud.toast("DRIFT ENGAGED");
  if (nearest) {
    hud.log(`AN UNRESONANT ECHO WAITS ${formatDist(nearest.dist)} AHEAD · <b>W</b> THRUST · <b>E</b> ATTUNE`, 11000);
  } else {
    hud.log("FOLLOW THE LIGHT · <b>W</b> THRUST · <b>SHIFT</b> WARP · <b>SPACE</b> PULSE", 11000);
  }
  setTimeout(() => {
    if (!state.started || state.photo) return;
    hud.log("THE LUMA ARE CURIOUS. DRIFT SLOWLY AND THEY WILL FIND YOU.", 9000);
  }, 13000);
}

function toggleSound() {
  state.muted = !state.muted;
  sound.toggle();
  sound.setMuted(state.muted);
  hud.setMuted(state.muted);
  hud.toast(state.muted ? "SOUND OFF" : "SOUND ON");
  saveGame();
}

function toggleHelp(force) {
  const next = typeof force === "boolean" ? force : !state.help;
  if (next && state.photo) togglePhoto(false);
  state.help = next;
  dom.helpPanel.classList.toggle("open", next);
  dom.helpPanel.setAttribute("aria-hidden", String(!next));
  dom.body.classList.toggle("help-open", next);
  if (next) {
    if (document.pointerLockElement) document.exitPointerLock();
    keys.clear();
  }
}

function togglePhoto(force) {
  if (!state.started) return;
  const next = typeof force === "boolean" ? force : !state.photo;
  if (next === state.photo) return;
  state.photo = next;
  dom.body.classList.toggle("photo", next);
  keys.clear();
  touch.thrust = false;
  touch.boost = false;
  state.boosting = false;
  if (next) {
    if (state.help) toggleHelp(false);
    if (document.pointerLockElement) document.exitPointerLock();
    const offset = camera.position.clone().sub(ship.group.position);
    state.photoDist = clamp(offset.length(), 7, 55);
    state.photoYaw = Math.atan2(offset.x, offset.z);
    state.photoPitch = Math.asin(clamp(offset.y / Math.max(0.001, offset.length()), -1, 1));
  }
}

function emitPulse() {
  if (!state.started || state.photo || state.help) return;
  if (state.pulseCd > 0) {
    hud.toast("PULSE RECHARGING");
    return;
  }
  if (state.warp < 0.12) {
    hud.toast("NOT ENOUGH WARP — COLLECT FRAGMENTS");
    return;
  }
  state.pulseCd = 4.6;
  state.warp = Math.max(0, state.warp - 0.16);
  world.pulse(ship.group.position);
  sound.pulse();
  hud.toast("RESONANCE PULSE");
}

function attuneNearest() {
  if (!state.started || state.photo || state.help) return;
  const nearest = world.findNearestEcho(ship.group.position);
  if (!nearest || nearest.dist > ATTUNE_RANGE) {
    hud.toast("NO ECHO IN RANGE");
    return;
  }
  const echo = world.attune(ship.group.position);
  if (!echo) return;
  state.chords += 1;
  state.paletteIndex = clamp(state.chords, 0, PALETTES.length - 1);
  applyPalette(state.paletteIndex);
  sound.chime(state.paletteIndex);
  hud.toast(`ECHO RESONANT · ${state.palette.name}`);
  hud.log(state.palette.log, 12000);
  saveGame();
}

function saveFrame() {
  post.render(state.time);
  dom.canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `halcyon-drift-${Date.now()}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  }, "image/png");
  hud.toast("FRAME CAPTURED");
}

function sectorLabel() {
  const cx = Math.floor(ship.group.position.x / CHUNK);
  const cy = Math.floor(ship.group.position.y / CHUNK);
  const cz = Math.floor(ship.group.position.z / CHUNK);
  return `${cx} : ${cy} : ${cz}`;
}

function updateFlight(dt) {
  const active = state.started && !state.photo && !state.help;
  let target = 0;
  if (active) {
    if (keys.has("KeyW")) target += 1;
    if (keys.has("KeyS")) target -= 1;
    if (touch.thrust) target = 1;
  }
  state.throttle = damp(state.throttle, clamp(target, -1, 1), target === 0 ? 1.4 : 2.2, dt);

  const boostHeld = active && (keys.has("ShiftLeft") || keys.has("ShiftRight") || touch.boost) && state.throttle > -0.2;
  state.boosting = false;
  if (boostHeld && state.warp > 0.01) {
    state.boosting = true;
    state.warp = Math.max(0, state.warp - dt * 0.215);
  } else {
    state.warp = Math.min(1, state.warp + dt * 0.055);
  }

  const targetSpeed = state.boosting
    ? WARP_SPEED
    : state.throttle >= 0
      ? state.throttle * MAX_SPEED
      : state.throttle * MAX_SPEED * 0.42;
  const speedTarget = active || !state.started ? targetSpeed : 0;
  state.speed = damp(state.speed, speedTarget, state.boosting ? 1.9 : 1.15, dt);

  let yawInput = 0;
  let pitchInput = 0;
  let rollInput = 0;
  if (active) {
    if (keys.has("ArrowLeft")) yawInput += 1;
    if (keys.has("ArrowRight")) yawInput -= 1;
    if (keys.has("ArrowUp")) pitchInput += 1;
    if (keys.has("ArrowDown")) pitchInput -= 1;
    if (keys.has("KeyA")) rollInput += 1;
    if (keys.has("KeyD")) rollInput -= 1;
  }
  flight.yaw += yawInput * 1.15 * dt;
  flight.pitch = clamp(flight.pitch + pitchInput * 0.85 * dt, -1.22, 1.22);
  if (active && touch.steering) {
    flight.yaw -= flight.touchX * 1.35 * dt;
    flight.pitch = clamp(flight.pitch - flight.touchY * 0.92 * dt, -1.22, 1.22);
  }
  if (Math.abs(rollInput) > 0.01) {
    flight.roll += rollInput * 1.7 * dt;
  } else {
    flight.roll = damp(flight.roll, 0, 0.5, dt);
  }

  ship.group.quaternion.setFromEuler(new THREE.Euler(-flight.pitch, flight.yaw, flight.roll, "YXZ"));
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.group.quaternion);
  ship.group.position.addScaledVector(forward, state.speed * dt);

  state.pulseCd = Math.max(0, state.pulseCd - dt);
  ship.update(state.time, dt, state.speed, state.throttle, state.boosting, 0, state.photo);
  sound.update(state.speed, state.boosting, dt);

  return forward;
}

const camDesired = new THREE.Vector3();
const camLook = new THREE.Vector3();
const camForward = new THREE.Vector3();
const camUp = new THREE.Vector3();
const shipUp = new THREE.Vector3();
const lookMatrix = new THREE.Matrix4();
const lookQuat = new THREE.Quaternion();

function updateCamera(dt, time) {
  const targetFov = state.boosting ? 78 : 62;
  if (state.photo) {
    const dist = state.photoDist;
    const yaw = state.photoYaw;
    const pitch = state.photoPitch;
    camDesired.set(
      ship.group.position.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      ship.group.position.y + Math.sin(pitch) * dist,
      ship.group.position.z + Math.cos(yaw) * Math.cos(pitch) * dist
    );
    camera.position.lerp(camDesired, 1 - Math.exp(-dt * 7));
    camLook.copy(ship.group.position);
    camLook.y += 0.5;
    camera.lookAt(camLook);
    camera.fov = damp(camera.fov, 52, 4, dt);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return;
  }

  if (!state.started) {
    const angle = 0.38 + Math.sin(time * 0.07) * 0.04;
    camDesired.set(
      ship.group.position.x + Math.sin(angle) * 26,
      ship.group.position.y + 7 + Math.sin(time * 0.18) * 2.5,
      ship.group.position.z + Math.cos(angle) * 26
    );
    camera.position.lerp(camDesired, 1 - Math.exp(-dt * 1.5));
    camLook.copy(ship.group.position);
    camLook.y += 2.1;
    camLook.x += Math.cos(angle) * 0.9;
    camLook.z -= Math.sin(angle) * 0.9;
    lookMatrix.lookAt(camera.position, camLook, new THREE.Vector3(0, 1, 0));
    lookQuat.setFromRotationMatrix(lookMatrix);
    camera.quaternion.slerp(lookQuat, 1 - Math.exp(-dt * 3));
    camera.fov = damp(camera.fov, 58, 2, dt);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return;
  }

  const dist = state.camDist;
  camForward.set(0, 0, 1).applyQuaternion(ship.group.quaternion);
  camDesired.copy(ship.group.position).add(
    new THREE.Vector3(0, dist * 0.26, -dist).applyQuaternion(ship.group.quaternion)
  );
  const cut = state.cameraCut;
  state.cameraCut = false;
  const follow = clamp(5.5 + Math.abs(state.speed) * 0.034, 5.5, 34);
  if (cut) camera.position.copy(camDesired);
  else camera.position.lerp(camDesired, 1 - Math.exp(-dt * follow));
  if (state.boosting) {
    camera.position.x += (Math.random() - 0.5) * 0.09;
    camera.position.y += (Math.random() - 0.5) * 0.09;
  }
  camLook.copy(ship.group.position).addScaledVector(camForward, Math.max(6, dist * 0.46));
  camLook.y += dist * 0.012;
  shipUp.set(0, 1, 0).applyQuaternion(ship.group.quaternion);
  camUp.set(0, 1, 0).lerp(shipUp, 0.38).normalize();
  lookMatrix.lookAt(camera.position, camLook, camUp);
  lookQuat.setFromRotationMatrix(lookMatrix);
  if (cut) camera.quaternion.copy(lookQuat);
  else camera.quaternion.slerp(lookQuat, 1 - Math.exp(-dt * 6));
  camera.fov = damp(camera.fov, targetFov, 3.2, dt);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

let qualityClock = 0;
let sectorClock = 0;
let fpsSmooth = 60;
let lowWindows = 0;

function adaptQuality(dt) {
  if (!state.started) return;
  fpsSmooth = damp(fpsSmooth, 1 / Math.max(0.001, dt), 2.4, dt);
  qualityClock += dt;
  if (qualityClock < 3.5) return;
  qualityClock = 0;
  if (fpsSmooth < 42 && state.quality < QUALITY.length - 1) {
    lowWindows++;
    if (lowWindows >= 2) {
      state.quality += 1;
      lowWindows = 0;
      resize();
    }
  } else if (fpsSmooth > 57) {
    lowWindows = 0;
  } else {
    lowWindows = Math.max(0, lowWindows - 1);
  }
}

function update(dt, time) {
  const forward = updateFlight(dt);
  updateCamera(dt, time);
  const warpIntensity = state.boosting ? 1 : clamp((Math.abs(state.speed) - MAX_SPEED * 1.2) / WARP_SPEED, 0, 1);
  world.update(
    dt,
    time,
    ship.group.position,
    camera.position,
    forward,
    state.speed,
    warpIntensity,
    QUALITY[state.quality].dpr,
    state.started,
    state.photo
  );

  if (state.started && !state.photo && !state.help) {
    const collected = world.collectMotes(ship.group.position);
    if (collected > 0) {
      state.motes += collected;
      state.warp = Math.min(1, state.warp + collected * 0.045);
      sound.collect();
      hud.toast(`+${collected} FRAGMENT${collected > 1 ? "S" : ""} · WARP RESTORED`);
      queueSave();
    }
  }

  const nearest = state.started ? world.findNearestEcho(ship.group.position) : world.nearest;
  sectorClock -= dt;
  if (sectorClock <= 0) {
    sectorClock = 0.75;
    if (dom.sectorHud) dom.sectorHud.textContent = sectorLabel();
    hud.setStartReadout(world.life.lumas.length, sectorLabel());
  }
  const canAttune = Boolean(nearest && nearest.dist <= ATTUNE_RANGE && state.started && !state.photo && !state.help);
  hud.update(dt, camera, {
    world,
    shipPosition: ship.group.position,
    flight,
    speed: state.speed,
    throttle: state.throttle,
    warp: state.warp,
    nearest,
    started: state.started,
    photo: state.photo,
    chords: state.chords,
    motes: state.motes,
    canAttune,
  });
  adaptQuality(dt);
}

let lastFrame = performance.now() / 1000;
let clockTime = 0;

function frame(nowMs) {
  requestAnimationFrame(frame);
  const now = nowMs / 1000;
  let dt = Math.min(now - lastFrame, 0.05);
  lastFrame = now;
  if (document.hidden) dt = 0;
  clockTime += dt;
  state.time = clockTime;
  update(dt, clockTime);
  post.render(clockTime);
}

function setupInput() {
  dom.startBtn.addEventListener("click", startGame);
  dom.guideBtn.addEventListener("click", () => toggleHelp(true));
  dom.helpBtn.addEventListener("click", () => toggleHelp());
  dom.helpClose.addEventListener("click", () => toggleHelp(false));
  dom.photoBtn.addEventListener("click", () => togglePhoto());
  dom.exitPhotoBtn.addEventListener("click", () => togglePhoto(false));
  dom.saveFrameBtn.addEventListener("click", saveFrame);
  dom.soundBtn.addEventListener("click", toggleSound);
  dom.attunePrompt.addEventListener("click", attuneNearest);
  dom.attunePrompt.addEventListener("keydown", (event) => {
    if (event.code === "Enter" || event.code === "Space") {
      event.preventDefault();
      attuneNearest();
    }
  });

  const flightKeys = new Set([
    "KeyW",
    "KeyS",
    "KeyA",
    "KeyD",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ShiftLeft",
    "ShiftRight",
  ]);

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") event.preventDefault();
    if (flightKeys.has(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
    if (event.repeat) return;
    if (event.code === "Enter" && !state.started) {
      startGame();
      return;
    }
    if (event.code === "Space") {
      if (!state.started) startGame();
      else emitPulse();
      return;
    }
    if (event.code === "KeyE" && state.started && !state.photo && !state.help) {
      attuneNearest();
      return;
    }
    if (event.code === "KeyM") {
      toggleSound();
      return;
    }
    if (event.code === "KeyP" || event.code === "KeyF") {
      if (state.started) togglePhoto();
      return;
    }
    if (event.code === "KeyH" || event.code === "Slash") {
      toggleHelp();
      return;
    }
    if (event.code === "Escape") {
      if (state.help) toggleHelp(false);
      else if (state.photo) togglePhoto(false);
      return;
    }
    if (event.code === "KeyC") {
      state.camDist = state.camDist > 20 ? 9 : state.camDist > 11 ? 24 : 14;
      hud.toast(`CAMERA ${state.camDist > 20 ? "FAR" : state.camDist > 11 ? "CHASE" : "CLOSE"}`);
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });
  window.addEventListener("blur", () => {
    keys.clear();
    touch.thrust = false;
    touch.boost = false;
  });

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  dom.canvas.addEventListener("pointerdown", (event) => {
    if (!state.started) return;
    if (event.button !== 0) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    if (state.photo) {
      dom.canvas.setPointerCapture?.(event.pointerId);
      return;
    }
    if (!state.pointerLocked && event.pointerType === "mouse") {
      const request = dom.canvas.requestPointerLock?.();
      if (request && request.catch) request.catch(() => {});
    }
  });

  window.addEventListener("pointermove", (event) => {
    if (!state.started) return;
    const dx = event.movementX || event.clientX - lastX;
    const dy = event.movementY || event.clientY - lastY;
    if (state.photo && dragging) {
      state.photoYaw -= dx * 0.0048;
      state.photoPitch = clamp(state.photoPitch - dy * 0.0034, -0.35, 1.32);
    } else if (!state.photo && !state.help && (state.pointerLocked || dragging)) {
      flight.yaw -= dx * 0.0022;
      flight.pitch = clamp(flight.pitch - dy * 0.0019, -1.22, 1.22);
    }
    lastX = event.clientX;
    lastY = event.clientY;
  });

  const endDrag = () => {
    dragging = false;
    if (dom.canvas.hasPointerCapture?.(1)) dom.canvas.releasePointerCapture(1);
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  document.addEventListener("pointerlockchange", () => {
    state.pointerLocked = document.pointerLockElement === dom.canvas;
    hud.setPointerLocked(state.pointerLocked);
  });
  document.addEventListener("pointerlockerror", () => {
    state.pointerLocked = false;
    hud.setPointerLocked(false);
  });

  dom.canvas.addEventListener(
    "wheel",
    (event) => {
      if (!state.started) return;
      event.preventDefault();
      const direction = Math.sign(event.deltaY);
      if (state.photo) {
        state.photoDist = clamp(state.photoDist + direction * 1.6, 6, 64);
      } else {
        state.camDist = clamp(state.camDist + direction * 1.1, 8, 27);
      }
    },
    { passive: false }
  );

  const stick = dom.stick;
  let stickId = null;
  const maxStick = 34;
  const moveStick = (event) => {
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const length = Math.hypot(dx, dy);
    if (length > maxStick) {
      dx = (dx / length) * maxStick;
      dy = (dy / length) * maxStick;
    }
    dom.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    flight.touchX = dx / maxStick;
    flight.touchY = dy / maxStick;
    touch.steering = true;
  };
  const resetStick = () => {
    stickId = null;
    touch.steering = false;
    flight.touchX = 0;
    flight.touchY = 0;
    dom.stickKnob.style.transform = "translate(0px, 0px)";
  };
  stick.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    stickId = event.pointerId;
    stick.setPointerCapture?.(event.pointerId);
    moveStick(event);
  });
  stick.addEventListener("pointermove", (event) => {
    if (stickId !== event.pointerId) return;
    moveStick(event);
  });
  stick.addEventListener("pointerup", (event) => {
    if (stickId === event.pointerId) resetStick();
  });
  stick.addEventListener("pointercancel", resetStick);

  const bindHold = (element, on, off) => {
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      element.classList.add("active");
      on();
    });
    const release = () => {
      element.classList.remove("active");
      off();
    };
    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
    element.addEventListener("pointerleave", release);
  };
  bindHold(dom.touchThrust, () => { touch.thrust = true; }, () => { touch.thrust = false; });
  bindHold(dom.touchBoost, () => { touch.boost = true; }, () => { touch.boost = false; });
  dom.touchPulse?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    emitPulse();
  });

  window.addEventListener("resize", resize);
}

function boot() {
  resize();
  applyPalette(state.paletteIndex, true);
  hud.setMuted(state.muted);
  hud.setStartReadout(world.life.lumas.length, sectorLabel());
  hud.setPointerLocked(false);
  dom.body.classList.remove("loading");
  dom.body.classList.add("ready");
  state.ready = true;
  setupInput();
  requestAnimationFrame(frame);
  const params = new URLSearchParams(window.location.search);
  if (params.has("play") || window.location.hash === "#play") {
    setTimeout(startGame, 700);
  }
  window.__halcyon = {
    state,
    ship,
    camera,
    world,
    post,
    renderer,
    sound,
    hud,
    startGame,
    attuneNearest,
    emitPulse,
    togglePhoto,
    applyPalette,
    get fps() {
      return fpsSmooth;
    },
  };
}

boot();
