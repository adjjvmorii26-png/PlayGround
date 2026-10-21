import { THREE } from "./utils.js";

export const PALETTES = [
  {
    name: "INDIGO WAKE",
    accent: "#7df9ff",
    accent2: "#ff7ad9",
    deep: "#02040a",
    mid: "#071a2d",
    glow: "#15516b",
    notes: [73.42, 110, 146.83, 220, 293.66],
    log: "The dark exhales. Your wake is the only line drawn.",
  },
  {
    name: "VERDANT SIGNAL",
    accent: "#8bffc9",
    accent2: "#79b8ff",
    deep: "#020805",
    mid: "#06261f",
    glow: "#0f7a54",
    notes: [87.31, 130.81, 174.61, 261.63, 329.63],
    log: "Something green remembers the shape of your engine light.",
  },
  {
    name: "VIOLET TIDE",
    accent: "#c9a7ff",
    accent2: "#ff8de1",
    deep: "#05030c",
    mid: "#1a0c31",
    glow: "#512878",
    notes: [92.5, 138.59, 185, 277.18, 369.99],
    log: "A tide of violet folds over the instruments. It feels like welcome.",
  },
  {
    name: "AMBER CHOIR",
    accent: "#ffd27a",
    accent2: "#ff8a66",
    deep: "#0a0602",
    mid: "#2a1706",
    glow: "#83400d",
    notes: [98, 146.83, 196, 293.66, 392],
    log: "Warm static. Somewhere ahead, a choir of dead suns clears its throat.",
  },
  {
    name: "CORAL RITE",
    accent: "#ff9c7a",
    accent2: "#ff5fa2",
    deep: "#0b0406",
    mid: "#2c0b13",
    glow: "#85202e",
    notes: [103.83, 155.56, 207.65, 311.13, 415.3],
    log: "The nebula blooms coral. Your shadow is briefly longer than the ship.",
  },
  {
    name: "GLACIER HYMN",
    accent: "#b7e4ff",
    accent2: "#a5ffe9",
    deep: "#020710",
    mid: "#0a223d",
    glow: "#256889",
    notes: [110, 164.81, 220, 329.63, 440],
    log: "Cold light. The oldest voice here is not speaking to you. It is singing.",
  },
  {
    name: "PRISMATIC",
    accent: "#ffffff",
    accent2: "#ffd27a",
    deep: "#04030c",
    mid: "#1b1242",
    glow: "#73349a",
    notes: [116.54, 174.61, 233.08, 349.23, 466.16],
    log: "Every frequency arrives at once. For a moment, the whole sky knows your name.",
  },
];

export const CHUNK = 1600;
export const HALF_CHUNK = CHUNK / 2;
export const LOAD_RADIUS = 3000;
export const UNLOAD_RADIUS = 3800;
export const MAX_SPEED = 150;
export const WARP_SPEED = 820;
export const ATTUNE_RANGE = 76;
export const START_POS = new THREE.Vector3(HALF_CHUNK, HALF_CHUNK, HALF_CHUNK);
export const SAVE_KEY = "halcyon.drift.v2";

export const QUALITY = [
  { dpr: Math.min(window.devicePixelRatio || 1, 1.5), bloom: true, bloomScale: 0.5 },
  { dpr: Math.min(window.devicePixelRatio || 1, 1.2), bloom: true, bloomScale: 0.5 },
  { dpr: Math.min(window.devicePixelRatio || 1, 1), bloom: true, bloomScale: 0.42 },
  { dpr: 0.82, bloom: true, bloomScale: 0.34 },
  { dpr: 0.68, bloom: false, bloomScale: 0.3 },
];
