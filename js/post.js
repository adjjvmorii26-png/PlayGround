import { THREE } from "./utils.js";

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = null;
    this.width = 1;
    this.height = 1;

    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.bloomA = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.bloomB = this.bloomA.clone();

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.brightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: 0.64 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float uThreshold;
        void main() {
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float l = max(c.r, max(c.g, c.b));
          float knee = smoothstep(uThreshold, uThreshold + 0.24, l);
          gl_FragColor = vec4(c * knee, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(1, 0) },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uRadius: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform vec2 uDirection;
        uniform vec2 uTexel;
        uniform float uRadius;
        void main() {
          vec2 off = uDirection * uTexel * uRadius;
          vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
          sum += texture2D(tDiffuse, vUv + off * 1.3846153846).rgb * 0.3162162162;
          sum += texture2D(tDiffuse, vUv - off * 1.3846153846).rgb * 0.3162162162;
          sum += texture2D(tDiffuse, vUv + off * 3.2307692308).rgb * 0.0702702703;
          sum += texture2D(tDiffuse, vUv - off * 3.2307692308).rgb * 0.0702702703;
          gl_FragColor = vec4(sum, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tBase: { value: null },
        tBloom: { value: null },
        uBloom: { value: 1.0 },
        uTime: { value: 0 },
        uVignette: { value: 0.72 },
        uGrain: { value: 0.022 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tBase;
        uniform sampler2D tBloom;
        uniform float uBloom;
        uniform float uTime;
        uniform float uVignette;
        uniform float uGrain;
        void main() {
          vec3 base = texture2D(tBase, vUv).rgb;
          vec3 bloom = texture2D(tBloom, vUv).rgb;
          vec3 col = base + bloom * uBloom * 0.82;
          float d = length(vUv - 0.5);
          float vig = smoothstep(0.32, 0.88, d);
          col *= 1.0 - vig * uVignette;
          float grain = fract(sin(dot(vUv * vec2(1241.3, 7919.1) + uTime, vec2(12.9898, 78.233))) * 43758.5453);
          col += (grain - 0.5) * uGrain;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
  }

  setQuality(quality) {
    this.quality = quality;
  }

  resize(width, height, pixelRatio) {
    const q = this.quality;
    this.renderer.setPixelRatio(q.dpr);
    this.renderer.setSize(width, height, false);
    const size = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(size);
    this.width = size.x;
    this.height = size.y;
    this.sceneRT.setSize(this.width, this.height);
    const bw = Math.max(2, Math.floor(this.width * q.bloomScale));
    const bh = Math.max(2, Math.floor(this.height * q.bloomScale));
    this.bloomA.setSize(bw, bh);
    this.bloomB.setSize(bw, bh);
    this.blurMaterial.uniforms.uTexel.value.set(1 / bw, 1 / bh);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  render(time) {
    const q = this.quality;
    this.renderer.setRenderTarget(this.sceneRT);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    if (q.bloom) {
      this.brightMaterial.uniforms.tDiffuse.value = this.sceneRT.texture;
      this.pass(this.brightMaterial, this.bloomA);

      const blur = this.blurMaterial;
      for (let i = 0; i < 2; i++) {
        blur.uniforms.uRadius.value = 1.15 + i * 1.5;
        blur.uniforms.tDiffuse.value = this.bloomA.texture;
        blur.uniforms.uDirection.value.set(1, 0);
        this.pass(blur, this.bloomB);
        blur.uniforms.tDiffuse.value = this.bloomB.texture;
        blur.uniforms.uDirection.value.set(0, 1);
        this.pass(blur, this.bloomA);
      }
    }

    this.compositeMaterial.uniforms.tBase.value = this.sceneRT.texture;
    this.compositeMaterial.uniforms.tBloom.value = this.bloomA.texture;
    this.compositeMaterial.uniforms.uBloom.value = q.bloom ? 1 : 0;
    this.compositeMaterial.uniforms.uTime.value = time;
    this.quad.material = this.compositeMaterial;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }
}
