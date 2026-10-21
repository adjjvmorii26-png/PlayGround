import { THREE, clamp, rand, TAU } from "./utils.js";

export function createShip(glowTexture) {
  const group = new THREE.Group();
  group.rotation.order = "YXZ";
  const visual = new THREE.Group();
  group.add(visual);

  const materials = {
    accents: [],
    hull: null,
    wing: null,
    canopy: null,
    engineColor: new THREE.Color(0x7df9ff),
  };

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x7df9ff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.accents.push(glowMat);

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x1b2b36,
    metalness: 0.32,
    roughness: 0.45,
    emissive: new THREE.Color(0x051019),
    emissiveIntensity: 0.85,
    flatShading: true,
  });
  materials.hull = hullMat;

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0a1219,
    metalness: 0.4,
    roughness: 0.42,
    flatShading: true,
  });

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.62, 4.5, 6), hullMat);
  body.rotation.x = Math.PI / 2;
  body.position.z = 0.75;
  body.scale.x = 0.78;
  visual.add(body);

  const rear = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.44, 1.9, 6), darkMat);
  rear.rotation.x = Math.PI / 2;
  rear.position.z = -1.35;
  visual.add(rear);

  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0.18, 0.02, 1.15, 3.05, -0.12, -1.3, 0.6, -0.2, -1.72, 0.1, -0.02, -0.3,
        -0.18, 0.02, 1.15, -0.1, -0.02, -0.3, -0.6, -0.2, -1.72, -3.05, -0.12, -1.3,
      ],
      3
    )
  );
  wingGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  wingGeo.computeVertexNormals();
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x0f1a22,
    metalness: 0.35,
    roughness: 0.5,
    side: THREE.DoubleSide,
    flatShading: true,
    emissive: new THREE.Color(0x040a10),
    emissiveIntensity: 0.7,
  });
  materials.wing = wingMat;
  visual.add(new THREE.Mesh(wingGeo, wingMat));

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x7df9ff,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.accents.push(edgeMat);
  visual.add(new THREE.LineSegments(new THREE.EdgesGeometry(wingGeo, 25), edgeMat));

  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x06131f,
    metalness: 0.9,
    roughness: 0.08,
    emissive: new THREE.Color(0x7df9ff),
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.92,
  });
  materials.canopy = canopyMat;
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), canopyMat);
  canopy.scale.set(0.35, 0.23, 0.86);
  canopy.position.set(0, 0.3, 0.62);
  visual.add(canopy);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.72, 1.15), hullMat);
  fin.position.set(0, 0.45, -1.0);
  fin.rotation.x = -0.12;
  visual.add(fin);

  const finEdge = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 1.16), glowMat);
  finEdge.position.set(0, 0.79, -1.0);
  visual.add(finEdge);

  const engineSprites = [];
  for (const side of [-1, 1]) {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.31, 1.35, 8), darkMat);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(side * 0.48, -0.05, -1.62);
    visual.add(housing);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.045, 6, 18), glowMat);
    ring.position.set(side * 0.48, -0.05, -2.28);
    visual.add(ring);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), glowMat);
    tip.position.set(side * 2.82, -0.09, -1.18);
    visual.add(tip);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0x7df9ff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    sprite.position.set(side * 0.48, -0.05, -2.4);
    sprite.scale.setScalar(1.25);
    visual.add(sprite);
    engineSprites.push(sprite);
  }

  const coreGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x7df9ff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  coreGlow.position.set(0, -0.02, -2.0);
  coreGlow.scale.setScalar(2.6);
  visual.add(coreGlow);
  engineSprites.push(coreGlow);

  const shipLight = new THREE.PointLight(0x7df9ff, 5, 34, 2);
  group.add(shipLight);

  const trailCount = 84;
  const trailPositions = new Float32Array(trailCount * 3);
  const trailColors = new Float32Array(trailCount * 3);
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3).setUsage(THREE.DynamicDrawUsage));
  trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3).setUsage(THREE.DynamicDrawUsage));
  const trailMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const trailLine = new THREE.Line(trailGeometry, trailMaterial);
  trailLine.frustumCulled = false;
  const trailPoints = new THREE.Points(
    trailGeometry,
    new THREE.PointsMaterial({
      size: 1.3,
      map: glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  trailPoints.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(trailLine);
  scene.add(trailPoints);

  const engineCount = 130;
  const enginePositions = new Float32Array(engineCount * 3);
  const engineAlpha = new Float32Array(engineCount);
  const engineSizes = new Float32Array(engineCount);
  const engineLife = new Float32Array(engineCount);
  const engineVel = [];
  for (let i = 0; i < engineCount; i++) {
    engineVel.push(new THREE.Vector3());
    enginePositions[i * 3 + 1] = -99999;
  }
  const engineGeometry = new THREE.BufferGeometry();
  engineGeometry.setAttribute("position", new THREE.BufferAttribute(enginePositions, 3).setUsage(THREE.DynamicDrawUsage));
  engineGeometry.setAttribute("aAlpha", new THREE.BufferAttribute(engineAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  engineGeometry.setAttribute("aSize", new THREE.BufferAttribute(engineSizes, 1).setUsage(THREE.DynamicDrawUsage));
  const engineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x7df9ff) },
      uPixelRatio: { value: 1 },
    },
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      uniform float uPixelRatio;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vAlpha = aAlpha;
        gl_PointSize = aSize * uPixelRatio * clamp(300.0 / max(1.0, -mv.z), 1.0, 26.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.05, d);
        gl_FragColor = vec4(uColor, a * vAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  const enginePoints = new THREE.Points(engineGeometry, engineMaterial);
  enginePoints.frustumCulled = false;
  scene.add(enginePoints);

  const nozzleL = new THREE.Vector3();
  const nozzleR = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const lastTrail = new THREE.Vector3();
  let initialized = false;
  let spawnAccum = 0;
  let pixelRatio = 1;

  function resetTrail() {
    group.updateMatrixWorld(true);
    nozzleL.set(0.48, -0.05, -2.3).applyMatrix4(group.matrixWorld);
    for (let i = 0; i < trailCount; i++) {
      trailPositions[i * 3] = nozzleL.x;
      trailPositions[i * 3 + 1] = nozzleL.y;
      trailPositions[i * 3 + 2] = nozzleL.z;
    }
    lastTrail.copy(nozzleL);
    trailGeometry.attributes.position.needsUpdate = true;
    initialized = true;
  }
  resetTrail();

  function setPalette(palette) {
    const accent = new THREE.Color(palette.accent);
    const accent2 = new THREE.Color(palette.accent2);
    materials.engineColor.copy(accent);
    materials.accents.forEach((mat) => mat.color.copy(accent));
    materials.hull.emissive.copy(accent).multiplyScalar(0.055);
    materials.wing.emissive.copy(accent).multiplyScalar(0.045);
    materials.canopy.emissive.copy(accent);
    engineSprites.forEach((sprite) => sprite.material.color.copy(accent));
    shipLight.color.copy(accent);
    engineMaterial.uniforms.uColor.value.copy(accent);
    const attr = trailGeometry.attributes.color;
    for (let i = 0; i < trailCount; i++) {
      const t = i / (trailCount - 1);
      const fade = Math.pow(1 - t, 2.1);
      const base = accent.clone().lerp(accent2, t * 0.4);
      attr.array[i * 3] = base.r * fade;
      attr.array[i * 3 + 1] = base.g * fade;
      attr.array[i * 3 + 2] = base.b * fade;
    }
    attr.needsUpdate = true;
  }

  function spawnParticle(throttle, boost) {
    for (let i = 0; i < engineCount; i++) {
      if (engineLife[i] > 0) continue;
      const left = Math.random() > 0.5;
      const base = left ? nozzleL : nozzleR;
      enginePositions[i * 3] = base.x + rand(-0.14, 0.14);
      enginePositions[i * 3 + 1] = base.y + rand(-0.14, 0.14);
      enginePositions[i * 3 + 2] = base.z + rand(-0.14, 0.14);
      const spread = 1.8 + Math.random() * 3.2;
      engineVel[i]
        .copy(forward)
        .multiplyScalar(-(9 + Math.random() * 24 + (boost ? 34 : 0)))
        .add(tmp.set(rand(-spread, spread), rand(-spread, spread), rand(-spread, spread)));
      engineLife[i] = rand(0.35, 0.9);
      engineSizes[i] = rand(0.1, boost ? 0.34 : 0.24) * (0.6 + throttle * 0.7);
      engineAlpha[i] = 1;
      return;
    }
  }

  function update(time, dt, speed, throttle, boost, ratio, photo) {
    group.updateMatrixWorld(true);
    nozzleL.set(0.48, -0.05, -2.3).applyMatrix4(group.matrixWorld);
    nozzleR.set(-0.48, -0.05, -2.3).applyMatrix4(group.matrixWorld);
    forward.set(0, 0, 1).applyQuaternion(group.quaternion);

    visual.position.y = Math.sin(time * 1.35) * 0.022;
    const flicker = 0.94 + Math.sin(time * 23) * 0.06;
    const intensity = photo ? 0.6 : 0.8 + throttle * 0.9;
    engineSprites.forEach((sprite, i) => {
      const base = i === 2 ? 2.2 + throttle * 1.8 : 1.0 + throttle * 0.7;
      sprite.scale.setScalar(base * flicker);
      sprite.material.opacity = clamp(intensity * (i === 2 ? 0.36 : 0.7), 0, 1);
    });
    shipLight.intensity = photo ? 0.45 : 0.7 + throttle * 1.8;

    const nozzle = nozzleL;
    if (!initialized || lastTrail.distanceToSquared(nozzle) > 0.5) {
      trailPositions.copyWithin(3, 0, (trailCount - 1) * 3);
      trailPositions[0] = nozzle.x;
      trailPositions[1] = nozzle.y;
      trailPositions[2] = nozzle.z;
      trailGeometry.attributes.position.needsUpdate = true;
      lastTrail.copy(nozzle);
    }

    if (!photo) {
      spawnAccum += dt * (18 + throttle * 100 + (boost ? 140 : 0));
      while (spawnAccum > 1) {
        spawnAccum -= 1;
        if (engineLife.some((life) => life <= 0)) spawnParticle(throttle, boost);
      }
    }

    for (let i = 0; i < engineCount; i++) {
      if (engineLife[i] <= 0) {
        engineAlpha[i] = 0;
        continue;
      }
      engineLife[i] -= dt * (1.25 + Math.abs(speed) / 620);
      if (engineLife[i] <= 0) {
        enginePositions[i * 3 + 1] = -99999;
        engineAlpha[i] = 0;
        continue;
      }
      enginePositions[i * 3] += engineVel[i].x * dt;
      enginePositions[i * 3 + 1] += engineVel[i].y * dt;
      enginePositions[i * 3 + 2] += engineVel[i].z * dt;
      engineVel[i].multiplyScalar(1 - dt * 1.2);
      engineAlpha[i] = clamp(engineLife[i] * 1.4, 0, 1) * (0.5 + throttle * 0.5);
    }
    engineGeometry.attributes.position.needsUpdate = true;
    engineGeometry.attributes.aAlpha.needsUpdate = true;
    engineGeometry.attributes.aSize.needsUpdate = true;
  }

  function setPixelRatio(value) {
    pixelRatio = value;
    engineMaterial.uniforms.uPixelRatio.value = value;
  }

  setPalette({
    accent: "#7df9ff",
    accent2: "#ff7ad9",
    deep: "#02040a",
    mid: "#071a2d",
    glow: "#15516b",
  });

  return {
    group,
    visual,
    trailLine,
    trailPoints,
    enginePoints,
    setPalette,
    resetTrail,
    update,
    setPixelRatio,
    engineSprites,
  };
}
