/**
 * ResonanceReefs — audio-reactive coral shelves ringing the dream archipelago.
 *
 * Vector 2 of the living-systems brief: "generative spatial Web Audio drives the
 * 3D landscape topology". The soundscape is the instrument; the reefs are its
 * resonating body. Loud passages bloom the coral, quiet passages let it settle,
 * and pulses of light travel outward across a shelf like sound through water.
 *
 * Lifecycle follows the host contract:
 *   const reefs = new ResonanceReefs(scene, camera, renderer);
 *   reefs.update(elapsedTime);   // once per frame
 *
 * The host publishes audio energy through `reefBus` (a tiny shared channel) so
 * the module stays decoupled from the game's Web Audio graph.
 */
import * as THREE from 'three';

/** Shared channel: the host writes, this module reads. */
export const reefBus = {
  level: 0,      // smoothed 0..1 audio energy
  beat: 0,       // rises on transients, decays on its own
  hue: 0,        // 0..1 colour drift supplied by the ecosystem
};

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** One coral shelf: a ring of instanced fronds anchored on the sea floor. */
class Shelf {
  constructor(opts) {
    this.cx = opts.x;
    this.cz = opts.z;
    this.radius = opts.radius;
    this.count = opts.count;
    this.phase = opts.phase;
    this.hue = opts.hue;
    this.bloom = 0;
    this.bloomTarget = 0;
    this.pulse = -1;          // seconds since the last pulse fired (<0 = idle)
    this.pulsePeriod = rand(3.5, 9);
    this.fronds = [];
    for (let i = 0; i < this.count; i++) {
      const a = (i / this.count) * TAU + rand(-0.12, 0.12);
      const r = this.radius * rand(0.72, 1.05);
      this.fronds.push({
        x: this.cx + Math.cos(a) * r,
        z: this.cz + Math.sin(a) * r,
        // outward-facing so pulses read as a wave travelling across the shelf
        dir: a,
        h: rand(1.4, 3.4),
        w: rand(0.2, 0.42),
        lean: rand(-0.22, 0.22),
        sway: rand(0.6, 1.7),
        seed: rand(0, TAU),
        grow: rand(0, 1),      // 0..1 boot-in
      });
    }
  }
}

/** Soft radial sprite texture, generated locally so the module stays self-contained. */
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(94,234,212,0.45)');
  g.addColorStop(0.7, 'rgba(45,212,191,0.14)');
  g.addColorStop(1, 'rgba(45,212,191,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export class ResonanceReefs {
  constructor(scene, camera, renderer, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.enabled = options.enabled !== false;
    this.quality = options.quality || 'high';

    this.group = new THREE.Group();
    this.group.name = 'ResonanceReefs';
    scene.add(this.group);

    this.shelves = [];
    this._t = 0;
    this._smoothLevel = 0;
    this._beatPrev = 0;

    this._build();
  }

  /** Frond geometry: a tapered cone reads as kelp/coral at low poly counts. */
  _makeGeometry() {
    const g = new THREE.ConeGeometry(0.5, 1, 5, 1, true);
    g.translate(0, 0.5, 0);   // grow from the base, not the centre
    return g;
  }

  _build() {
    const per = { low: 26, mid: 44, high: 64 }[this.quality] || 64;
    const shelfCount = { low: 3, mid: 5, high: 7 }[this.quality] || 7;

    this.material = new THREE.MeshStandardMaterial({
      color: 0x1f6f6b,
      emissive: 0x0d4f52,
      emissiveIntensity: 0.6,
      roughness: 0.75,
      metalness: 0.05,
      flatShading: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.94,
    });

    this.mesh = new THREE.InstancedMesh(this._makeGeometry(), this.material, per * shelfCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    if ('instanceColor' in this.mesh || true) {
      // instanceColor is allocated lazily by three when first set
      this.mesh.instanceColor = null;
    }
    this.group.add(this.mesh);

    this.perShelf = per;
    this.total = per * shelfCount;

    // Scatter shelves around the archipelago. Positions are authored relative to
    // the host's island ring so reefs hug the shorelines without touching land.
    const ringRadius = 26;
    for (let s = 0; s < shelfCount; s++) {
      const a = (s / shelfCount) * TAU + rand(-0.2, 0.2);
      const r = ringRadius + rand(-4, 12);
      const shelf = new Shelf({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        radius: rand(7, 13),
        count: per,
        phase: rand(0, TAU),
        hue: rand(0.42, 0.58),
      });
      this.shelves.push(shelf);
    }

    // A soft caustic glow disc under each shelf sells the "underwater" read.
    this.glowTex = makeGlowTexture();
    this.glowMat = new THREE.SpriteMaterial({
      map: this.glowTex,
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.glows = this.shelves.map((s) => {
      const sp = new THREE.Sprite(this.glowMat.clone());
      sp.position.set(s.cx, -0.95, s.cz);
      sp.scale.set(s.radius * 2.4, s.radius * 2.4, 1);
      this.group.add(sp);
      return sp;
    });

    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
    this._eulers = this.shelves.map(() => new THREE.Euler());
  }

  /** Public: host can reposition reefs when the archipelago changes. */
  setAnchors(anchors) {
    if (!Array.isArray(anchors) || !anchors.length) return;
    this.shelves.forEach((s, i) => {
      const a = anchors[i % anchors.length];
      if (!a) return;
      const dx = a.x - s.cx;
      const dz = a.z - s.cz;
      s.cx += dx;
      s.cz += dz;
      s.fronds.forEach((f) => {
        f.x += dx;
        f.z += dz;
      });
      if (this.glows[i]) this.glows[i].position.set(s.cx, -0.95, s.cz);
    });
  }

  setQuality(q) {
    if (!['low', 'mid', 'high'].includes(q) || q === this.quality) return;
    // Rebuild at the new density rather than thrashing the instance buffer.
    this.group.clear();
    this.quality = q;
    this._build();
  }

  setEnabled(on) {
    this.enabled = !!on;
    this.group.visible = this.enabled;
  }

  /**
   * Per-frame update.
   * @param {number} elapsedTime seconds since start
   */
  update(elapsedTime) {
    if (!this.enabled) return;
    const dt = this._last === undefined ? 0 : clamp(elapsedTime - this._last, 0, 0.1);
    this._last = elapsedTime;
    this._t = elapsedTime;

    // --- consume the host's audio channel -------------------------------
    const raw = clamp(reefBus.level || 0, 0, 1);
    // asymmetric smoothing: snap up on a hit, ease down on a release
    this._smoothLevel += (raw - this._smoothLevel) * (raw > this._smoothLevel ? 0.45 : 0.08);
    const energy = this._smoothLevel;

    const beat = reefBus.beat || 0;
    if (beat > this._beatPrev + 0.05) {
      // transient: fire a pulse from the loudest shelf
      let best = this.shelves[0];
      let bestE = -1;
      for (const s of this.shelves) {
        const d = this._cameraEnergy(s);
        if (d < bestE) { bestE = d; best = s; }
      }
      if (best) best.pulse = 0;
      this._beatPrev = beat;
    }

    // --- drive every frond ----------------------------------------------
    let i = 0;
    for (const shelf of this.shelves) {
      shelf.bloomTarget = energy;
      shelf.bloom += (shelf.bloomTarget - shelf.bloom) * Math.min(1, dt * 3.2 + 0.02);

      // travel the pulse outward from the shelf's centre
      let wave = 0;
      if (shelf.pulse >= 0) {
        shelf.pulse += dt;
        if (shelf.pulse > 2.6) shelf.pulse = -1;
      }
      const pulseT = shelf.pulse >= 0 ? shelf.pulse / 2.6 : -1;

      for (const f of shelf.fronds) {
        if (f.grow < 1) f.grow = Math.min(1, f.grow + dt * 0.55);

        // radial distance from the shelf centre, normalised 0..1
        const rx = f.x - shelf.cx;
        const rz = f.z - shelf.cz;
        const radial = clamp(Math.hypot(rx, rz) / (shelf.radius * 1.1), 0, 1);
        if (pulseT >= 0) {
          // gaussian ring riding outward
          const d = radial - pulseT;
          wave = Math.exp(-d * d * 42) * (1 - pulseT);
        }

        const breathe = Math.sin(elapsedTime * f.sway + f.seed) * 0.06;
        const swell = 1 + shelf.bloom * 0.85 + wave * 1.25;
        const h = f.h * f.grow * swell;
        const w = f.w * f.grow * (1 + wave * 0.55);

        // lean away from the shelf centre + current sway
        const lean = f.lean + breathe + wave * 0.5;
        this._e.set(Math.sin(f.dir) * lean, f.dir, Math.cos(f.dir) * lean, 'YXZ');
        this._q.setFromEuler(this._e);

        this._v.set(f.x, -0.95, f.z);
        this._s.set(w, h, w);
        this._m.compose(this._v, this._q, this._s);
        this.mesh.setMatrixAt(i, this._m);

        // hue drifts with the ecosystem; emissive tracks the bloom
        const hue = (shelf.hue + (reefBus.hue || 0) * 0.25) % 1;
        this._c.setHSL(hue, 0.62, 0.32 + shelf.bloom * 0.18 + wave * 0.4);
        this._c.offsetHSL(0, 0, 0);
        this.mesh.setColorAt(i, this._c);
        i++;
      }

      if (this.glows[this.shelves.indexOf(shelf)]) {
        const g = this.glows[this.shelves.indexOf(shelf)];
        g.material.opacity = 0.12 + shelf.bloom * 0.26 + wave * 0.34;
        const s = shelf.radius * (2.2 + wave * 0.5);
        g.scale.set(s, s, 1);
      }
    }

    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.material.emissiveIntensity = 0.35 + energy * 1.5;
  }

  /** Louder shelves pulse; used to pick which reef answers a transient. */
  _cameraEnergy(shelf) {
    if (!this.camera) return 0;
    const dx = shelf.cx - this.camera.position.x;
    const dz = shelf.cz - this.camera.position.z;
    return dx * dx + dz * dz;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.isMesh || o.isSprite) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      }
    });
    this.scene.remove(this.group);
    this.group.clear();
  }
}

export default ResonanceReefs;
