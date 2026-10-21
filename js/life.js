import { THREE, TAU, clamp, rand } from "./utils.js";
import { PALETTES } from "./palettes.js";

const lumaPaletteKeys = [
  { body: "accent", trail: "accent", glow: "accent2" },
  { body: "accent2", trail: "accent2", glow: "accent" },
  { body: "gold", trail: "gold", glow: "accent2" },
];

export class Life {
  constructor(scene, shipPosition, audio) {
    this.scene = scene;
    this.audio = audio;
    this.lumas = [];
    this.count = window.matchMedia("(pointer: coarse)").matches ? 11 : 17;
    this.tmpA = new THREE.Vector3();
    this.tmpB = new THREE.Vector3();
    this.tmpC = new THREE.Vector3();

    this.bodyMaterials = [];
    this.glowMaterials = [];
    this.lineMaterials = [];

    for (let i = 0; i < 3; i++) {
      const palette = PALETTES[0];
      const color = i === 0 ? palette.accent : i === 1 ? palette.accent2 : "#ffd27a";
      this.bodyMaterials.push(
        new THREE.MeshStandardMaterial({
          color: 0x071017,
          metalness: 0.35,
          roughness: 0.35,
          emissive: new THREE.Color(color),
          emissiveIntensity: 1.1,
          flatShading: true,
        })
      );
      this.glowMaterials.push(
        new THREE.SpriteMaterial({
          map: null,
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      this.lineMaterials.push(
        new THREE.LineBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
    }

    this.buildLumas(shipPosition);
    this.chorus = this.buildChorus(shipPosition);
    this.setPalette(PALETTES[0]);
  }

  buildLumas(shipPosition) {
    const rng = Math.random;
    const bodyGeo = new THREE.ConeGeometry(0.52, 2.5, 5);
    bodyGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < this.count; i++) {
      const type = i % 3;
      const group = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, this.bodyMaterials[type]);
      body.scale.set(0.7, 0.7, 1);
      group.add(body);

      const fin = new THREE.Mesh(bodyGeo, this.bodyMaterials[type]);
      fin.scale.set(0.9, 0.24, 0.58);
      fin.position.z = -0.4;
      group.add(fin);

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: null,
          color: new THREE.Color(type === 1 ? PALETTES[0].accent2 : PALETTES[0].accent),
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      glow.scale.setScalar(6);
      group.add(glow);

      const scale = rand(0.75, 1.75);
      group.scale.setScalar(scale);

      const angle = rng() * TAU;
      const radius = rand(160, 520);
      group.position
        .copy(shipPosition)
        .add(new THREE.Vector3(Math.cos(angle) * radius, rand(-90, 130), Math.sin(angle) * radius));

      const velocity = new THREE.Vector3(rand(-8, 8), rand(-3, 3), rand(-8, 8));
      if (velocity.lengthSq() < 4) velocity.set(rand(-10, 10), rand(-2, 2), rand(-10, 10));

      const trailCount = 14;
      const positions = new Float32Array(trailCount * 3);
      for (let k = 0; k < trailCount; k++) {
        positions[k * 3] = group.position.x;
        positions[k * 3 + 1] = group.position.y;
        positions[k * 3 + 2] = group.position.z;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      const line = new THREE.Line(geometry, this.lineMaterials[type]);
      line.frustumCulled = false;
      this.scene.add(line);
      this.scene.add(group);

      this.lumas.push({
        group,
        glow,
        velocity,
        scale,
        trail: { line, geometry, positions, count: trailCount },
        phase: rng() * TAU,
        type,
        curious: 0,
        excited: 0,
        singClock: rand(1, 8),
        wander: new THREE.Vector3(rand(-1, 1), rand(-0.5, 0.5), rand(-1, 1)).normalize(),
      });
    }
  }

  buildChorus(shipPosition) {
    const group = new THREE.Group();
    const accent = new THREE.Color(PALETTES[0].accent2);
    const ringMats = [];
    const ringSizes = [34, 25, 16];
    ringSizes.forEach((radius, i) => {
      const mat = new THREE.MeshBasicMaterial({
        color: accent.clone(),
        transparent: true,
        opacity: 0.28 - i * 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.4 + i * 0.12, 6, 48), mat);
      ring.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
      group.add(ring);
      ringMats.push({ mesh: ring, material: mat, speed: rand(0.04, 0.12) * (i % 2 ? -1 : 1) });
    });

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: null,
        color: accent.clone(),
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.setScalar(130);
    group.add(glow);

    const tendrils = [];
    const tendrilMat = new THREE.LineBasicMaterial({
      color: accent.clone(),
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 8; i++) {
      const count = 9;
      const positions = new Float32Array(count * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      const line = new THREE.Line(geometry, tendrilMat);
      line.frustumCulled = false;
      group.add(line);
      tendrils.push({
        line,
        geometry,
        positions,
        count,
        angle: (i / 8) * TAU,
        phase: rand(0, TAU),
        length: rand(60, 110),
      });
    }

    const startAngle = 2.15;
    group.position
      .copy(shipPosition)
      .add(new THREE.Vector3(Math.cos(startAngle) * 760, 165, Math.sin(startAngle) * 760));
    this.scene.add(group);

    return {
      group,
      born: performance.now(),
      ringMats,
      glow,
      tendrils,
      tendrilMat,
      target: group.position.clone(),
      singClock: 6,
      pulse: 0,
    };
  }

  setPalette(palette) {
    const colors = [palette.accent, palette.accent2, "#ffd27a"];
    this.bodyMaterials.forEach((mat, i) => {
      mat.emissive.set(colors[i]);
    });
    const spriteMap = this.chorus ? null : null;
    this.lumas.forEach((luma) => {
      luma.glow.material.color.set(colors[luma.type]);
    });
    this.lineMaterials.forEach((mat, i) => {
      mat.color.set(colors[i]);
    });
    this.chorus.ringMats.forEach((ring) => ring.material.color.set(palette.accent2));
    this.chorus.glow.material.color.set(palette.accent2);
    this.chorus.tendrilMat.color.set(palette.accent2);
    void spriteMap;
  }

  respawnLuma(luma, shipPosition) {
    const angle = Math.random() * TAU;
    const radius = rand(350, 760);
    luma.group.position
      .copy(shipPosition)
      .add(new THREE.Vector3(Math.cos(angle) * radius, rand(-130, 190), Math.sin(angle) * radius));
    luma.velocity.set(rand(-12, 12), rand(-4, 4), rand(-12, 12));
    if (luma.velocity.lengthSq() < 9) luma.velocity.set(rand(-14, 14), rand(-3, 3), rand(-14, 14));
    for (let i = 0; i < luma.trail.count; i++) {
      luma.trail.positions[i * 3] = luma.group.position.x;
      luma.trail.positions[i * 3 + 1] = luma.group.position.y;
      luma.trail.positions[i * 3 + 2] = luma.group.position.z;
    }
    luma.trail.geometry.attributes.position.needsUpdate = true;
  }

  update(dt, time, shipPosition, started, photo, warp) {
    const sep = this.tmpA;
    const ali = this.tmpB;
    const coh = this.tmpC;
    const force = new THREE.Vector3();
    const toShip = new THREE.Vector3();
    const look = new THREE.Vector3();

    for (const luma of this.lumas) {
      const pos = luma.group.position;
      const vel = luma.velocity;
      const dist = pos.distanceTo(shipPosition);
      luma.singClock -= dt;
      luma.curious = Math.max(0, luma.curious - dt * 0.3);

      if (dist > 1550) {
        this.respawnLuma(luma, shipPosition);
        continue;
      }

      sep.set(0, 0, 0);
      ali.set(0, 0, 0);
      coh.set(0, 0, 0);
      let neighbors = 0;
      let nearCount = 0;

      for (const other of this.lumas) {
        if (other === luma) continue;
        const otherPos = other.group.position;
        const d = pos.distanceTo(otherPos);
        if (d < 95) {
          ali.add(other.velocity);
          coh.add(otherPos);
          neighbors++;
          if (d < 26 && d > 0.001) {
            force.copy(pos).sub(otherPos).multiplyScalar((26 - d) / (d * 3.2));
            sep.add(force);
            nearCount++;
          }
        }
      }

      if (neighbors > 0) {
        ali.divideScalar(neighbors).multiplyScalar(0.26);
        coh.divideScalar(neighbors).sub(pos).multiplyScalar(0.16);
      }
      sep.multiplyScalar(2.2);

      luma.wander.x += Math.sin(time * 0.14 + luma.phase) * dt * 0.4;
      luma.wander.y += Math.cos(time * 0.11 + luma.phase * 1.7) * dt * 0.25;
      luma.wander.z += Math.sin(time * 0.09 + luma.phase * 0.6) * dt * 0.4;
      luma.wander.normalize().multiplyScalar(7);

      force.add(sep).add(ali).add(coh).add(luma.wander);
      toShip.copy(shipPosition).sub(pos);
      const heading = toShip.normalize();

      if (started && !photo) {
        if (warp > 0.25 && dist < 460) {
          force.addScaledVector(heading, -95 * Math.pow(1 - dist / 460, 1.5));
          luma.excited = 1;
        } else if (dist < 320) {
          luma.curious = Math.min(1, luma.curious + dt * 0.5);
          if (dist > 52) {
            force.addScaledVector(heading, (320 - dist) * 0.075 * (0.4 + luma.curious));
          } else {
            const tangent = new THREE.Vector3(-heading.z, 0.12, heading.x);
            force.addScaledVector(tangent, 24);
            force.addScaledVector(heading, -10);
          }
        } else {
          luma.curious = Math.max(0, luma.curious - dt * 0.1);
        }
      }

      if (dist > 780) {
        force.addScaledVector(heading, (dist - 780) * 0.24);
      }

      vel.addScaledVector(force, dt);
      const maxSpeed = luma.excited > 0 ? 78 : 46;
      const speed = vel.length();
      if (speed > maxSpeed) vel.multiplyScalar(maxSpeed / speed);
      if (speed < 9) {
        if (speed < 0.001) vel.set(rand(-8, 8), rand(-2, 2), rand(-8, 8));
        else vel.multiplyScalar(9 / Math.max(0.05, speed));
      }
      luma.excited = Math.max(0, luma.excited - dt * 0.35);

      pos.addScaledVector(vel, dt);
      look.copy(pos).add(vel);
      luma.group.lookAt(look);
      const pulse = 1 + Math.sin(time * 2.2 + luma.phase) * 0.08 + luma.excited * 0.22;
      luma.group.scale.setScalar(luma.scale * pulse);
      luma.glow.scale.setScalar((5 + luma.excited * 4) * luma.scale);
      luma.glow.material.opacity = 0.34 + luma.excited * 0.35 + Math.sin(time * 3 + luma.phase) * 0.05;

      const trail = luma.trail;
      trail.positions.copyWithin(3, 0, (trail.count - 1) * 3);
      trail.positions[0] = pos.x;
      trail.positions[1] = pos.y;
      trail.positions[2] = pos.z;
      trail.geometry.attributes.position.needsUpdate = true;

      if (started && !photo && dist < 42 && luma.singClock <= 0) {
        luma.singClock = rand(9, 18);
        this.audio.sing();
      }
    }

    const chorus = this.chorus;
    const chorusAngle = time * 0.032 + 2.15;
    const desired = chorus.target.set(
      shipPosition.x + Math.cos(chorusAngle) * 760,
      shipPosition.y + 155 + Math.sin(time * 0.13) * 70,
      shipPosition.z + Math.sin(chorusAngle) * 760
    );
    chorus.group.position.lerp(desired, 1 - Math.exp(-dt * 0.9));
    chorus.pulse = Math.max(0, chorus.pulse - dt * 0.9);
    chorus.ringMats.forEach((ring, i) => {
      ring.mesh.rotation.x += dt * ring.speed * (1 + chorus.pulse * 2);
      ring.mesh.rotation.y += dt * ring.speed * 0.7;
      ring.material.opacity = (0.2 - i * 0.025) + Math.sin(time * 0.7 + i) * 0.04 + chorus.pulse * 0.18;
    });
    chorus.glow.material.opacity = 0.24 + Math.sin(time * 0.5) * 0.05 + chorus.pulse * 0.2;
    chorus.glow.scale.setScalar(120 + Math.sin(time * 0.6) * 12 + chorus.pulse * 30);

    chorus.tendrils.forEach((tendril, index) => {
      const count = tendril.count;
      for (let i = 0; i < count; i++) {
        const f = i / (count - 1);
        const radius = 26 * (1 - f * 0.45);
        const angle = tendril.angle + Math.sin(time * 0.35 + tendril.phase + f * 3.2) * 0.2 + f * 0.6;
        tendril.positions[i * 3] = Math.cos(angle) * radius * (1 - f * 0.3);
        tendril.positions[i * 3 + 1] = -f * tendril.length + Math.sin(time * 0.7 + tendril.phase + f * 4) * 6 * f;
        tendril.positions[i * 3 + 2] = Math.sin(angle) * radius * (1 - f * 0.3);
      }
      tendril.geometry.attributes.position.needsUpdate = true;
      void index;
    });

    chorus.singClock -= dt;
    if (started && chorus.singClock <= 0) {
      chorus.singClock = rand(18, 34);
      const dist = chorus.group.position.distanceTo(shipPosition);
      if (dist < 1300) {
        this.audio.sing();
        chorus.pulse = 1;
      }
    }
  }

  nearestLumaDistance(shipPosition) {
    let min = Infinity;
    for (const luma of this.lumas) min = Math.min(min, luma.group.position.distanceTo(shipPosition));
    return min;
  }

  applyTextures(glowTexture) {
    this.lumas.forEach((luma) => {
      luma.glow.material.map = glowTexture;
      luma.glow.material.needsUpdate = true;
    });
    this.chorus.glow.material.map = glowTexture;
    this.chorus.glow.material.needsUpdate = true;
    this.bodyMaterials.forEach((mat) => {
      mat.needsUpdate = true;
    });
  }
}
