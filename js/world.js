import { THREE, TAU, clamp, mulberry32, chunkHash, rand } from "./utils.js";
import { PALETTES, CHUNK, HALF_CHUNK, LOAD_RADIUS, UNLOAD_RADIUS, ATTUNE_RANGE } from "./palettes.js";
import { Sky } from "./sky.js";
import { Life } from "./life.js";

export class World {
  constructor(scene, shipPosition, audio, glowTexture, softTexture, activated, palette) {
    this.scene = scene;
    this.audio = audio;
    this.glowTexture = glowTexture;
    this.activated = activated;
    this.currentPalette = palette;
    this.time = 0;

    this.sky = new Sky(softTexture);
    scene.add(this.sky.group);

    this.life = new Life(scene, shipPosition, audio);
    this.life.applyTextures(glowTexture);

    this.chunks = new Map();
    this.echoes = [];
    this.bursts = [];
    this.shockwaves = [];
    this.streamClock = 0;
    this.nearest = null;
    this.collected = 0;

    this.asteroidGeo = new THREE.IcosahedronGeometry(1, 1);
    this.asteroidMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0.12,
      emissive: new THREE.Color(0x02050a),
      emissiveIntensity: 1,
      flatShading: true,
    });
    this.crystalGeo = new THREE.OctahedronGeometry(1, 0);
    this.crystalMat = new THREE.MeshStandardMaterial({
      color: 0x0a1018,
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 1.55,
      metalness: 0.42,
      roughness: 0.18,
      flatShading: true,
    });
    this.crystalGlowMat = new THREE.SpriteMaterial({
      map: glowTexture,
      color: new THREE.Color(palette.accent),
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.moteMat = new THREE.PointsMaterial({
      color: 0xffd27a,
      size: 2.8,
      map: glowTexture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.buildDust(shipPosition);
    this.primeChunks(shipPosition);
    this.setPalette(palette, true);
  }

  buildDust(shipPosition) {
    this.dustCount = 240;
    this.dustOffset = [];
    const rng = mulberry32(778821);
    const positions = new Float32Array(this.dustCount * 2 * 3);
    const colors = new Float32Array(this.dustCount * 2 * 3);
    const baseColors = new Float32Array(this.dustCount * 3);
    for (let i = 0; i < this.dustCount; i++) {
      const offset = new THREE.Vector3(rand(-280, 280), rand(-280, 280), rand(-280, 280));
      this.dustOffset.push(offset);
      const intensity = 0.2 + rng() * 0.8;
      baseColors[i * 3] = intensity;
      baseColors[i * 3 + 1] = intensity;
      baseColors[i * 3 + 2] = intensity;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dust = new THREE.LineSegments(geometry, material);
    this.dust.frustumCulled = false;
    this.dustBaseColors = baseColors;
    this.scene.add(this.dust);
    this.dustColorDirty = true;
  }

  updateDust(dt, time, shipPosition, forward, speed) {
    const positions = this.dust.geometry.attributes.position.array;
    const colors = this.dust.geometry.attributes.color.array;
    const streak = 0.5 + Math.abs(speed) * 0.036;
    const size = 280;
    for (let i = 0; i < this.dustCount; i++) {
      const offset = this.dustOffset[i];
      offset.x -= forward.x * speed * dt;
      offset.y -= forward.y * speed * dt;
      offset.z -= forward.z * speed * dt;
      if (offset.x > size) offset.x -= size * 2;
      else if (offset.x < -size) offset.x += size * 2;
      if (offset.y > size) offset.y -= size * 2;
      else if (offset.y < -size) offset.y += size * 2;
      if (offset.z > size) offset.z -= size * 2;
      else if (offset.z < -size) offset.z += size * 2;
      const px = shipPosition.x + offset.x;
      const py = shipPosition.y + offset.y;
      const pz = shipPosition.z + offset.z;
      positions[i * 6] = px;
      positions[i * 6 + 1] = py;
      positions[i * 6 + 2] = pz;
      positions[i * 6 + 3] = px - forward.x * streak;
      positions[i * 6 + 4] = py - forward.y * streak;
      positions[i * 6 + 5] = pz - forward.z * streak;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.dust.material.opacity = clamp(Math.abs(speed) / 190, 0, 1) * 0.42 + 0.08;
    if (this.dustColorDirty) {
      for (let i = 0; i < this.dustCount; i++) {
        const b = this.dustBaseColors[i * 3];
        colors[i * 6] = this.dustColor.r * b;
        colors[i * 6 + 1] = this.dustColor.g * b;
        colors[i * 6 + 2] = this.dustColor.b * b;
        colors[i * 6 + 3] = this.dustColor.r * b * 0.15;
        colors[i * 6 + 4] = this.dustColor.g * b * 0.15;
        colors[i * 6 + 5] = this.dustColor.b * b * 0.15;
      }
      this.dust.geometry.attributes.color.needsUpdate = true;
      this.dustColorDirty = false;
    }
    void time;
  }

  chunkKey(cx, cy, cz) {
    return `${cx},${cy},${cz}`;
  }

  wantedChunks(shipPosition) {
    const cx = Math.floor(shipPosition.x / CHUNK);
    const cy = Math.floor(shipPosition.y / CHUNK);
    const cz = Math.floor(shipPosition.z / CHUNK);
    const list = [];
    for (let x = cx - 2; x <= cx + 2; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        for (let z = cz - 2; z <= cz + 2; z++) {
          const center = new THREE.Vector3(x * CHUNK + CHUNK / 2, y * CHUNK + CHUNK / 2, z * CHUNK + CHUNK / 2);
          const dist = center.distanceTo(shipPosition);
          if (dist <= LOAD_RADIUS) list.push({ x, y, z, dist });
        }
      }
    }
    list.sort((a, b) => a.dist - b.dist);
    return list;
  }

  primeChunks(shipPosition) {
    const wanted = this.wantedChunks(shipPosition);
    wanted.forEach((item) => this.ensureChunk(item.x, item.y, item.z, shipPosition));
    this.nearest = this.findNearestEcho(shipPosition);
  }

  ensureChunk(cx, cy, cz, shipPosition) {
    const key = this.chunkKey(cx, cy, cz);
    if (this.chunks.has(key)) return this.chunks.get(key);
    const rng = mulberry32(chunkHash(cx, cy, cz));
    const group = new THREE.Group();
    group.position.set(cx * CHUNK + CHUNK / 2, cy * CHUNK + CHUNK / 2, cz * CHUNK + CHUNK / 2);
    this.scene.add(group);

    const chunk = {
      key,
      cx,
      cy,
      cz,
      group,
      echo: null,
      motes: null,
      pois: [],
      crystal: false,
    };

    const dummy = new THREE.Object3D();
    const count = 24 + Math.floor(rng() * 28);
    const asteroid = new THREE.InstancedMesh(this.asteroidGeo, this.asteroidMat, count);
    asteroid.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    asteroid.frustumCulled = false;
    const clusterCount = 1 + Math.floor(rng() * 3);
    const clusters = [];
    for (let c = 0; c < clusterCount; c++) {
      clusters.push({
        x: (rng() * 2 - 1) * HALF_CHUNK * 0.6,
        y: (rng() * 2 - 1) * HALF_CHUNK * 0.45,
        z: (rng() * 2 - 1) * HALF_CHUNK * 0.6,
        spread: 60 + rng() * 240,
      });
    }
    const color = new THREE.Color();
    let poiCount = 0;
    for (let i = 0; i < count; i++) {
      const cluster = clusters[i % clusters.length];
      let lx = cluster.x + (rng() + rng() + rng() - 1.5) * cluster.spread;
      let ly = cluster.y + (rng() + rng() + rng() - 1.5) * cluster.spread * 0.7;
      let lz = cluster.z + (rng() + rng() + rng() - 1.5) * cluster.spread;
      lx = clamp(lx, -HALF_CHUNK + 30, HALF_CHUNK - 30);
      ly = clamp(ly, -HALF_CHUNK + 30, HALF_CHUNK - 30);
      lz = clamp(lz, -HALF_CHUNK + 30, HALF_CHUNK - 30);
      const world = new THREE.Vector3(group.position.x + lx, group.position.y + ly, group.position.z + lz);
      const toShip = new THREE.Vector3().subVectors(world, shipPosition);
      if (toShip.lengthSq() < 160 * 160) {
        toShip.normalize().multiplyScalar(160);
        lx = toShip.x + (rng() - 0.5) * 40;
        ly = toShip.y + (rng() - 0.5) * 40;
        lz = toShip.z + (rng() - 0.5) * 40;
      }
      const scale = 2.2 + Math.pow(rng(), 2.4) * 24;
      dummy.position.set(lx, ly, lz);
      dummy.rotation.set(rng() * TAU, rng() * TAU, rng() * TAU);
      dummy.scale.set(scale * (0.6 + rng() * 0.7), scale * (0.5 + rng() * 0.85), scale * (0.6 + rng() * 0.7));
      dummy.updateMatrix();
      asteroid.setMatrixAt(i, dummy.matrix);
      const shade = 0.06 + rng() * 0.15;
      color.setHSL(0.55 + rng() * 0.1, 0.12 + rng() * 0.25, shade);
      asteroid.setColorAt(i, color);
      if (poiCount < 10) {
        chunk.pois.push({ x: lx, z: lz, size: scale });
        poiCount++;
      }
    }
    asteroid.instanceMatrix.needsUpdate = true;
    if (asteroid.instanceColor) asteroid.instanceColor.needsUpdate = true;
    group.add(asteroid);

    if (rng() < 0.48) {
      const crystalCount = 4 + Math.floor(rng() * 6);
      const formation = new THREE.InstancedMesh(this.crystalGeo, this.crystalMat, crystalCount);
      formation.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      formation.frustumCulled = false;
      const cxLocal = (rng() * 2 - 1) * HALF_CHUNK * 0.55;
      const cyLocal = (rng() * 2 - 1) * HALF_CHUNK * 0.35;
      const czLocal = (rng() * 2 - 1) * HALF_CHUNK * 0.55;
      for (let i = 0; i < crystalCount; i++) {
        const angle = rng() * TAU;
        const radius = rng() * 46;
        dummy.position.set(cxLocal + Math.cos(angle) * radius, cyLocal + rng() * 18, czLocal + Math.sin(angle) * radius);
        dummy.rotation.set(rng() * TAU, rng() * TAU, rng() * TAU);
        dummy.scale.set(1.4 + rng() * 4, 5 + rng() * 16, 1.4 + rng() * 4);
        dummy.updateMatrix();
        formation.setMatrixAt(i, dummy.matrix);
        color.setHSL(0.52 + rng() * 0.12, 0.2, 0.55 + rng() * 0.25);
        formation.setColorAt(i, color);
      }
      formation.instanceMatrix.needsUpdate = true;
      if (formation.instanceColor) formation.instanceColor.needsUpdate = true;
      group.add(formation);
      const glow = new THREE.Sprite(this.crystalGlowMat);
      glow.position.set(cxLocal, cyLocal + 10, czLocal);
      glow.scale.setScalar(150);
      group.add(glow);
      chunk.crystal = true;
      chunk.pois.push({ x: cxLocal, z: czLocal, size: 14, crystal: true });
    }

    if (rng() < 0.74) {
      const moteCount = 5 + Math.floor(rng() * 5);
      const positions = new Float32Array(moteCount * 3);
      const local = [];
      for (let i = 0; i < moteCount; i++) {
        const pos = new THREE.Vector3(
          (rng() * 2 - 1) * HALF_CHUNK * 0.74,
          (rng() * 2 - 1) * HALF_CHUNK * 0.55,
          (rng() * 2 - 1) * HALF_CHUNK * 0.74
        );
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        local.push(pos);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      const points = new THREE.Points(geometry, this.moteMat);
      points.frustumCulled = false;
      group.add(points);
      chunk.motes = { points, local, alive: new Array(moteCount).fill(true), positions };
    }

    const origin = cx === 0 && cy === 0 && cz === 0;
    if (origin) {
      this.createEcho(chunk, new THREE.Vector3(0, 32, 480), rng);
    } else if (rng() < 0.2) {
      const echoPos = new THREE.Vector3(
        (rng() * 2 - 1) * HALF_CHUNK * 0.55,
        (rng() * 2 - 1) * HALF_CHUNK * 0.5,
        (rng() * 2 - 1) * HALF_CHUNK * 0.55
      );
      this.createEcho(chunk, echoPos, rng);
    }

    this.chunks.set(key, chunk);
    return chunk;
  }

  createEcho(chunk, local, rng) {
    const group = new THREE.Group();
    group.position.copy(local);
    const active = this.activated.has(chunk.key);
    const accent = new THREE.Color(this.currentPalette.accent);
    const gold = new THREE.Color(0xffd27a);
    const base = active ? gold : accent;
    const mats = { rings: [], shards: null, glyph: null, core: null };

    const ringConfigs = [
      { radius: 18, tube: 0.38, opacity: 0.78, rotation: [0, 0, 0], speed: 0.42 },
      { radius: 24, tube: 0.11, opacity: 0.5, rotation: [0.7, 0.2, 0.4], speed: -0.55 },
      { radius: 11, tube: 0.1, opacity: 0.5, rotation: [1.1, 0.5, -0.6], speed: 0.7 },
    ];
    ringConfigs.forEach((config) => {
      const mat = new THREE.MeshBasicMaterial({
        color: base.clone(),
        transparent: true,
        opacity: active ? config.opacity * 0.42 : config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(config.radius, config.tube, 6, 64), mat);
      ring.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
      ring.userData.speed = config.speed;
      group.add(ring);
      mats.rings.push({ mesh: ring, material: mat, baseOpacity: config.opacity });
    });

    const glyphPts = [];
    const glyphCount = 64;
    for (let i = 0; i < glyphCount; i++) {
      const a = (i / glyphCount) * TAU;
      const radius = 8.5 + Math.sin(a * 5 + rng() * 4) * 2.2 + Math.sin(a * 9) * 0.8;
      glyphPts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, Math.sin(a * 4) * 1.4));
    }
    const glyphGeo = new THREE.BufferGeometry().setFromPoints(glyphPts);
    const glyphMat = new THREE.LineBasicMaterial({
      color: base.clone(),
      transparent: true,
      opacity: active ? 0.22 : 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glyph = new THREE.LineLoop(glyphGeo, glyphMat);
    glyph.rotation.x = 0.4;
    group.add(glyph);
    mats.glyph = glyphMat;

    const shardMat = new THREE.MeshBasicMaterial({
      color: base.clone(),
      transparent: true,
      opacity: active ? 0.35 : 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    mats.shards = { material: shardMat, mesh: [] };
    for (let i = 0; i < 4; i++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.7 + rng() * 0.5, 0), shardMat);
      shard.userData.angle = (i / 4) * TAU;
      shard.userData.radius = 28 + rng() * 6;
      shard.userData.speed = 0.3 + rng() * 0.25;
      shard.userData.yOffset = (rng() - 0.5) * 12;
      group.add(shard);
      mats.shards.mesh.push(shard);
    }

    const coreMat = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color: base.clone(),
      transparent: true,
      opacity: active ? 0.22 : 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Sprite(coreMat);
    core.scale.setScalar(54);
    group.add(core);
    mats.core = core;

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 96, 6, 1, true),
      new THREE.MeshBasicMaterial({
        color: base.clone(),
        transparent: true,
        opacity: active ? 0.04 : 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    beam.position.y = 44;
    group.add(beam);

    chunk.group.add(group);
    const echo = {
      chunk,
      group,
      local: local.clone(),
      worldPos: new THREE.Vector3(),
      active,
      activeAt: active ? -100 : 0,
      phase: rng() * TAU,
      mats,
      beam,
      baseLocalY: local.y,
    };
    chunk.echo = echo;
    this.echoes.push(echo);
    this.applyEchoWorldPosition(echo);
    return echo;
  }

  applyEchoWorldPosition(echo) {
    echo.worldPos.copy(echo.chunk.group.position).add(echo.group.position);
  }

  styleEcho(echo) {
    const accent = new THREE.Color(this.currentPalette.accent);
    const gold = new THREE.Color(0xffd27a);
    const base = echo.active ? gold : accent;
    echo.mats.rings.forEach((ring) => {
      ring.material.color.copy(base);
      ring.material.opacity = echo.active ? ring.baseOpacity * 0.42 : ring.baseOpacity;
    });
    echo.mats.glyph.color.copy(base);
    echo.mats.glyph.opacity = echo.active ? 0.22 : 0.72;
    echo.mats.shards.material.color.copy(base);
    echo.mats.shards.material.opacity = echo.active ? 0.35 : 0.9;
    echo.mats.core.material.color.copy(base);
    echo.mats.core.material.opacity = echo.active ? 0.22 : 0.62;
    echo.beam.material.color.copy(base);
    echo.beam.material.opacity = echo.active ? 0.04 : 0.09;
  }

  updateChunks(dt, shipPosition) {
    this.streamClock -= dt;
    if (this.streamClock > 0) return;
    this.streamClock = 0.24;
    const wanted = this.wantedChunks(shipPosition);
    const queue = [];
    wanted.forEach((item) => {
      const key = this.chunkKey(item.x, item.y, item.z);
      if (!this.chunks.has(key)) queue.push(item);
    });
    let budget = 4;
    for (const item of queue) {
      if (budget <= 0) break;
      this.ensureChunk(item.x, item.y, item.z, shipPosition);
      budget--;
    }
    for (const [key, chunk] of this.chunks) {
      if (chunk.group.position.distanceTo(shipPosition) > UNLOAD_RADIUS) {
        this.disposeChunk(chunk);
        this.chunks.delete(key);
      }
    }
  }

  disposeChunk(chunk) {
    if (chunk.echo) {
      const index = this.echoes.indexOf(chunk.echo);
      if (index >= 0) this.echoes.splice(index, 1);
      chunk.echo.group.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((mat) => mat.dispose());
          else object.material.dispose();
        }
      });
    }
    if (chunk.motes) chunk.motes.points.geometry.dispose();
    this.scene.remove(chunk.group);
  }

  findNearestEcho(shipPosition) {
    let nearest = null;
    let min = Infinity;
    for (const echo of this.echoes) {
      if (echo.active) continue;
      const dist = echo.worldPos.distanceTo(shipPosition);
      if (dist < min) {
        min = dist;
        nearest = echo;
      }
    }
    return nearest ? { echo: nearest, dist: min } : null;
  }

  updateEchoes(dt, time) {
    for (const echo of this.echoes) {
      const group = echo.group;
      group.position.y = echo.baseLocalY + Math.sin(time * 0.8 + echo.phase) * 2.2;
      group.rotation.y = time * 0.18 + echo.phase;
      echo.mats.rings.forEach((ring, index) => {
        ring.mesh.rotation.z += dt * ring.mesh.userData.speed;
        if (index === 1) ring.mesh.rotation.x += dt * 0.2;
      });
      const pulse = 1 + Math.sin(time * 1.8 + echo.phase) * 0.08;
      echo.mats.core.scale.setScalar((echo.active ? 34 : 52) * pulse);
      echo.mats.shards.mesh.forEach((shard) => {
        const angle = shard.userData.angle + time * shard.userData.speed;
        shard.position.set(
          Math.cos(angle) * shard.userData.radius,
          shard.userData.yOffset + Math.sin(time * 0.9 + angle) * 4,
          Math.sin(angle) * shard.userData.radius
        );
        shard.rotation.x += dt * 0.6;
        shard.rotation.y += dt * 0.4;
      });
      if (echo.active && echo.activeAt > 0) {
        const age = time - echo.activeAt;
        if (age < 2.4) {
          const t = age / 2.4;
          echo.group.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.22);
        } else {
          echo.group.scale.setScalar(1);
        }
      }
      this.applyEchoWorldPosition(echo);
    }
  }

  updateMotes(time) {
    let collected = 0;
    for (const chunk of this.chunks.values()) {
      if (!chunk.motes) continue;
      const motes = chunk.motes;
      for (let i = 0; i < motes.local.length; i++) {
        if (!motes.alive[i]) continue;
        const local = motes.local[i];
        const wx = chunk.group.position.x + local.x;
        const wy = chunk.group.position.y + local.y + Math.sin(time * 1.4 + i * 1.7) * 0.4;
        const wz = chunk.group.position.z + local.z;
        const dx = wx - this.shipPosition.x;
        const dy = wy - this.shipPosition.y;
        const dz = wz - this.shipPosition.z;
        if (dx * dx + dy * dy + dz * dz < 144) {
          motes.alive[i] = false;
          motes.positions[i * 3 + 1] = -50000;
          motes.points.geometry.attributes.position.needsUpdate = true;
          collected++;
        }
      }
    }
    return collected;
  }

  spawnBurst(position, color, count = 150, speed = 90) {
    const positions = new Float32Array(count * 3);
    const velocity = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      const dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(speed * (0.25 + Math.random()));
      velocity.push(dir);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 2.2,
      map: this.glowTexture,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.scene.add(points);
    this.bursts.push({ points, geometry, material, velocity, age: 0, life: 2.4 });
  }

  spawnShockwave(position, color, maxRadius = 620, life = 1.9) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), material);
    mesh.position.copy(position);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.shockwaves.push({ mesh, material, age: 0, life, maxRadius });
  }

  updateFx(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.age += dt;
      if (burst.age >= burst.life) {
        this.scene.remove(burst.points);
        burst.geometry.dispose();
        burst.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      const positions = burst.geometry.attributes.position.array;
      const drag = 1 - dt * 0.9;
      for (let j = 0; j < burst.velocity.length; j++) {
        const vel = burst.velocity[j];
        vel.multiplyScalar(drag);
        positions[j * 3] += vel.x * dt;
        positions[j * 3 + 1] += vel.y * dt;
        positions[j * 3 + 2] += vel.z * dt;
      }
      burst.geometry.attributes.position.needsUpdate = true;
      burst.material.opacity = Math.pow(1 - burst.age / burst.life, 1.6);
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const wave = this.shockwaves[i];
      wave.age += dt;
      if (wave.age >= wave.life) {
        this.scene.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        wave.material.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const t = wave.age / wave.life;
      const radius = 4 + Math.pow(t, 0.55) * wave.maxRadius;
      wave.mesh.scale.setScalar(radius);
      wave.material.opacity = 0.3 * Math.pow(1 - t, 1.8);
    }
  }

  pulse(shipPosition) {
    this.spawnShockwave(shipPosition, this.currentPalette.accent, 850, 2.1);
    this.spawnShockwave(shipPosition, this.currentPalette.accent2, 520, 1.4);
    this.sky.pulseFlash();
  }

  attune(shipPosition) {
    const nearest = this.findNearestEcho(shipPosition);
    if (!nearest || nearest.dist > ATTUNE_RANGE) return null;
    const echo = nearest.echo;
    echo.active = true;
    echo.activeAt = this.time;
    this.activated.add(echo.chunk.key);
    this.styleEcho(echo);
    this.spawnBurst(echo.worldPos, this.currentPalette.accent2, 190, 120);
    this.spawnShockwave(echo.worldPos, this.currentPalette.accent, 420, 1.7);
    this.sky.pulseFlash();
    return echo;
  }

  setPalette(palette, instant = false) {
    this.currentPalette = palette;
    this.sky.setPalette(palette, instant);
    this.life.setPalette(palette);
    this.crystalMat.emissive.set(palette.accent);
    this.crystalMat.color.set(palette.deep);
    this.crystalGlowMat.color.set(palette.accent);
    this.dustColor = new THREE.Color(palette.accent);
    this.dustColorDirty = true;
    this.echoes.forEach((echo) => this.styleEcho(echo));
  }

  collectMotes(shipPosition) {
    this.shipPosition = shipPosition;
    return this.updateMotes(this.time);
  }

  update(dt, time, shipPosition, cameraPosition, forward, speed, warp, pixelRatio, started, photo) {
    this.time = time;
    this.updateChunks(dt, shipPosition);
    this.sky.update(dt, time, cameraPosition, warp, pixelRatio);
    this.life.update(dt, time, shipPosition, started, photo, warp);
    this.updateDust(dt, time, shipPosition, forward, speed);
    this.updateEchoes(dt, time);
    this.updateFx(dt);
    this.nearest = this.findNearestEcho(shipPosition);
  }
}

