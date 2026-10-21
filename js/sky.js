import { THREE, TAU, mulberry32 } from "./utils.js";
import { PALETTES } from "./palettes.js";

export class Sky {
  constructor(softTexture) {
    this.group = new THREE.Group();

    this.uniforms = {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(PALETTES[0].deep) },
      uMid: { value: new THREE.Color(PALETTES[0].mid) },
      uGlow: { value: new THREE.Color(PALETTES[0].glow) },
      uPulse: { value: 0 },
      uWarp: { value: 0 },
    };
    this.targetDeep = new THREE.Color(PALETTES[0].deep);
    this.targetMid = new THREE.Color(PALETTES[0].mid);
    this.targetGlow = new THREE.Color(PALETTES[0].glow);

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform float uTime;
        uniform vec3 uDeep;
        uniform vec3 uMid;
        uniform vec3 uGlow;
        uniform float uPulse;
        uniform float uWarp;

        float hash31(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        float vnoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float n000 = hash31(i);
          float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
          float nx00 = mix(n000, n100, f.x);
          float nx10 = mix(n010, n110, f.x);
          float nx01 = mix(n001, n101, f.x);
          float nx11 = mix(n011, n111, f.x);
          return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
        }

        float fbm(vec3 p) {
          float v = 0.0;
          float a = 0.56;
          for (int i = 0; i < 3; i++) {
            v += a * vnoise(p);
            p = p * 2.03 + vec3(3.7, 1.3, 8.1);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 d = normalize(vDir);
          float t = uTime * 0.006;
          float n1 = fbm(d * 2.6 + vec3(0.0, 0.0, t));
          float n2 = fbm(d * 5.8 - vec3(t * 1.4, t * 0.7, 0.0));
          float veil = smoothstep(0.4, 0.94, n1 * 0.94 + n2 * 0.32);
          vec3 col = mix(uDeep, uMid, veil * veil);
          col += uGlow * pow(smoothstep(0.48, 1.0, n1), 2.2) * 0.72;
          float band = smoothstep(0.7, 0.98, 1.0 - abs(d.y * 0.72 + d.x * 0.22));
          col += uGlow * band * 0.06;
          col += uGlow * uWarp * 0.045;
          col = mix(col, uGlow * 0.6 + uMid * 0.6, uPulse * 0.16);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    });

    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(20000, 40, 26), material);
    this.skyMesh.renderOrder = -1000;
    this.skyMesh.frustumCulled = false;
    this.group.add(this.skyMesh);

    this.starUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uWarp: { value: 0 },
      uTint: { value: new THREE.Color(PALETTES[0].accent) },
    };
    this.stars = this.makeStars();
    this.group.add(this.stars);

    this.planet = this.makePlanet();
    this.group.add(this.planet);

    this.ringGroup = new THREE.Group();
    this.ringGroup.position.copy(this.planet.position);
    this.ringGroup.rotation.set(1.16, 0.14, 0.34);
    this.ringMatA = new THREE.MeshBasicMaterial({
      color: 0x4d8ca4,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.ringMatB = new THREE.MeshBasicMaterial({
      color: 0x8ed9ee,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.ringGroup.add(new THREE.Mesh(new THREE.RingGeometry(1260, 2110, 128), this.ringMatA));
    this.ringGroup.add(new THREE.Mesh(new THREE.RingGeometry(1200, 1226, 128), this.ringMatB));
    this.group.add(this.ringGroup);

    this.planetGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: softTexture,
        color: 0x55bde0,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      })
    );
    this.planetGlow.position.copy(this.planet.position);
    this.planetGlow.scale.setScalar(3100);
    this.planetGlow.renderOrder = -19;
    this.group.add(this.planetGlow);

    this.pulse = 0;
  }

  makeStars() {
    const count = window.matchMedia("(pointer: coarse)").matches ? 4200 : 7200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const rng = mulberry32(918273);
    const palette = [new THREE.Color(0xd6f5ff), new THREE.Color(0x91c9ff), new THREE.Color(0xffe0b0), new THREE.Color(0xffffff)];
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const u = rng() * 2 - 1;
      const theta = rng() * TAU;
      const s = Math.sqrt(1 - u * u);
      v.set(s * Math.cos(theta), u, s * Math.sin(theta));
      const radius = 3300 + Math.pow(rng(), 0.6) * 9600;
      positions[i * 3] = v.x * radius;
      positions[i * 3 + 1] = v.y * radius;
      positions[i * 3 + 2] = v.z * radius;
      const c = palette[Math.floor(rng() * palette.length)];
      const shade = 0.55 + rng() * 0.45;
      colors[i * 3] = c.r * shade;
      colors[i * 3 + 1] = c.g * shade;
      colors[i * 3 + 2] = c.b * shade;
      sizes[i] = 0.7 + Math.pow(rng(), 3) * 3.1;
      phases[i] = rng() * TAU;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: this.starUniforms,
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute vec3 aColor;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uWarp;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.72 + 0.28 * sin(uTime * (0.5 + aPhase * 1.55) + aPhase * 18.0);
          vColor = aColor;
          vTw = tw;
          gl_PointSize = aSize * uPixelRatio * (0.82 + 0.34 * tw) * (1.0 + uWarp * 0.4);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTw;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.04, d);
          gl_FragColor = vec4(vColor, a * vTw);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  makePlanetTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d");
    const rng = mulberry32(44219);
    const base = ctx.createLinearGradient(0, 0, 0, 512);
    base.addColorStop(0, "#06121e");
    base.addColorStop(0.45, "#0c2a3a");
    base.addColorStop(0.62, "#124354");
    base.addColorStop(1, "#050c14");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 512);

    for (let i = 0; i < 60; i++) {
      const y = rng() * 512;
      const h = 4 + rng() * 42;
      const hue = 178 + rng() * 46;
      ctx.fillStyle = `hsla(${hue}, ${24 + rng() * 36}%, ${10 + rng() * 22}%, ${0.1 + rng() * 0.24})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 32) {
        ctx.lineTo(x, y + Math.sin(x * 0.011 + i * 1.7) * (3 + rng() * 7) + Math.sin(x * 0.041 + i) * 2);
      }
      ctx.lineTo(1024, y + h);
      for (let x = 1024; x >= 0; x -= 32) {
        ctx.lineTo(x, y + h + Math.sin(x * 0.013 + i * 2.1) * 4);
      }
      ctx.closePath();
      ctx.fill();
    }

    for (let i = 0; i < 22; i++) {
      const x = rng() * 1024;
      const y = 40 + rng() * 430;
      const r = 8 + rng() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(160, 225, 235, ${0.04 + rng() * 0.1})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (let i = 0; i < 120; i++) {
      const x = rng() * 1024;
      const y = rng() * 512;
      const r = 1 + rng() * 7;
      ctx.fillStyle = `rgba(4, 12, 18, ${0.08 + rng() * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.4 + rng()), rng() * TAU, 0, TAU);
      ctx.fill();
    }

    const shade = ctx.createLinearGradient(0, 0, 1024, 0);
    shade.addColorStop(0, "rgba(0,0,0,0.62)");
    shade.addColorStop(0.42, "rgba(0,0,0,0)");
    shade.addColorStop(0.75, "rgba(160,235,255,0.05)");
    shade.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 1024, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  makePlanet() {
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(920, 56, 40),
      new THREE.MeshStandardMaterial({
        map: this.makePlanetTexture(),
        roughness: 0.96,
        metalness: 0.02,
        emissive: new THREE.Color(0x061520),
        emissiveIntensity: 0.7,
      })
    );
    planet.position.set(-4100, 1450, 6200);
    planet.rotation.set(0.22, -0.45, 0.32);
    planet.renderOrder = -20;
    return planet;
  }

  setPalette(palette, instant = false) {
    this.targetDeep.set(palette.deep);
    this.targetMid.set(palette.mid);
    this.targetGlow.set(palette.glow);
    if (instant) {
      this.uniforms.uDeep.value.copy(this.targetDeep);
      this.uniforms.uMid.value.copy(this.targetMid);
      this.uniforms.uGlow.value.copy(this.targetGlow);
    }
    const accent = new THREE.Color(palette.accent);
    this.starUniforms.uTint.value.copy(accent);
    this.ringMatA.color.copy(accent).lerp(new THREE.Color(palette.deep), 0.45);
    this.ringMatB.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.35);
    this.planetGlow.material.color.copy(accent).lerp(new THREE.Color(palette.mid), 0.35);
  }

  pulseFlash() {
    this.pulse = 1;
  }

  update(dt, time, cameraPosition, warp, pixelRatio) {
    this.uniforms.uTime.value = time;
    this.uniforms.uWarp.value = warp;
    this.pulse = Math.max(0, this.pulse - dt * 0.65);
    this.uniforms.uPulse.value = this.pulse;
    const blend = 1 - Math.exp(-dt * 1.8);
    this.uniforms.uDeep.value.lerp(this.targetDeep, blend);
    this.uniforms.uMid.value.lerp(this.targetMid, blend);
    this.uniforms.uGlow.value.lerp(this.targetGlow, blend);
    this.starUniforms.uTime.value = time;
    this.starUniforms.uWarp.value = warp;
    this.starUniforms.uPixelRatio.value = pixelRatio;
    this.group.position.copy(cameraPosition);
    this.planet.rotation.y += dt * 0.005;
    this.ringGroup.rotation.z += dt * 0.002;
    this.planetGlow.material.opacity = 0.19 + Math.sin(time * 0.3) * 0.025;
  }
}
