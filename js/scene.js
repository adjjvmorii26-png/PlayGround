import * as THREE from '../vendor/three/three.module.min.js'
import {
  buildTextures,
  makeDynamicScreen,
  drawStatusScreen,
  drawMapScreen
} from './textures.js'

const UP = new THREE.Vector3(0, 1, 0)
const _world = new THREE.Vector3()
const _color = new THREE.Color()

function lerp(a, b, t) {
  return a + (b - a) * t
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

const MARKERS = [
  { id: 'drawer', icon: '▤', label: 'Console drawer', position: [2.03, 0.92, -3.98] },
  { id: 'fuse', icon: '▮', label: 'Spare fuse', position: [2.03, 0.98, -3.9], hidden: true },
  { id: 'relay', icon: 'ϟ', label: 'Aux power relay', position: [-4.55, 1.5, -1.2] },
  { id: 'plaque', icon: 'i', label: 'Crew plaque', position: [-2.72, 1.68, -4.72] },
  { id: 'starchart', icon: '✦', label: 'Star projector', position: [4.5, 1.86, -1.3] },
  { id: 'keypad', icon: '⌗', label: 'Launch keypad', position: [3.22, 1.2, -4.18] },
  { id: 'door', icon: '⇧', label: 'Airlock 01', position: [0, 2.12, -4.5] },
  { id: 'hologram', icon: '◎', label: 'PIP core', position: [2.0, 1.5, -4.32], minor: true },
  { id: 'window', icon: '◐', label: 'Observation window', position: [0, 1.92, 4.68], minor: true },
  { id: 'crates', icon: '▣', label: 'Cargo crate', position: [-4.15, 1.05, 2.05], minor: true },
  { id: 'server', icon: '▥', label: 'Server rack', position: [4.55, 1.6, 2.0], minor: true },
  { id: 'cryo', icon: '▯', label: 'Cryo pod', position: [-3.5, 1.6, 4.24], minor: true }
]

export class EchoRoom {
  constructor({ canvas, markerLayer, onHotspot }) {
    this.canvas = canvas
    this.markerLayer = markerLayer
    this.onHotspot = onHotspot
    this.markers = new Map()
    this.hotspotMeshes = []
    this.disposables = []
    this.powerMix = 0
    this.powerOn = false
    this.codeKnown = false
    this.doorMix = 0
    this.doorOpen = false
    this.drawerMix = 0
    this.drawerOpen = false
    this.pulseAmount = 0
    this.scanning = false
    this.active = false
    this.elapsed = 0
    this.screenTimer = 0
    this.drag = null
    this.look = { yaw: -0.14, pitch: -0.02, yawTarget: -0.14, pitchTarget: -0.02 }
    this.pointerMoved = 0
    this.lastPointer = { x: 0, y: 0 }
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.textures = buildTextures()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x03070b)
    this.scene.fog = new THREE.FogExp2(0x03070b, 0.016)
    this.scene.environment = this.textures.env

    this.camera = new THREE.PerspectiveCamera(68, 1, 0.08, 60)
    this.camera.rotation.order = 'YXZ'
    this.camera.position.set(0, 1.63, 0)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderScale = 1
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.37
    this.renderer.shadowMap.enabled = false

    this.buildMaterials()
    this.buildLights()
    this.buildRoom()
    this.buildAirlock()
    this.buildDesk()
    this.buildRelay()
    this.buildProjector()
    this.buildObservationWindow()
    this.buildServerRack()
    this.buildCrates()
    this.buildCryoPod()
    this.buildAtmosphere()
    this.buildMarkers()
    this.bindInput()
    this.resize()
    this.clock = new THREE.Clock()
    this.running = false
    this.perfAt = performance.now()
    this.perfFrames = 0
  }

  buildMaterials() {
    const t = this.textures
    this.mats = {
      wall: new THREE.MeshStandardMaterial({ map: t.metal, color: 0xa8bcc9, metalness: 0.42, roughness: 0.6 }),
      wallDark: new THREE.MeshStandardMaterial({ color: 0x22303b, metalness: 0.5, roughness: 0.52 }),
      floor: new THREE.MeshStandardMaterial({ map: t.floor, color: 0xd2e0e9, metalness: 0.46, roughness: 0.42 }),
      ceiling: new THREE.MeshStandardMaterial({ color: 0x151f28, metalness: 0.45, roughness: 0.62 }),
      trim: new THREE.MeshStandardMaterial({ color: 0x60798a, metalness: 0.62, roughness: 0.34 }),
      trimDark: new THREE.MeshStandardMaterial({ color: 0x2b3d49, metalness: 0.6, roughness: 0.4 }),
      trimLight: new THREE.MeshStandardMaterial({ color: 0x7d95a4, metalness: 0.7, roughness: 0.28 }),
      hazard: new THREE.MeshStandardMaterial({ map: t.hazard, metalness: 0.55, roughness: 0.55 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x090c0f, metalness: 0.2, roughness: 0.85 }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x89d9f0,
        metalness: 0.35,
        roughness: 0.08,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      screenFrame: new THREE.MeshStandardMaterial({ color: 0x0b1117, metalness: 0.9, roughness: 0.25 }),
      amber: new THREE.MeshStandardMaterial({ color: 0x3a2010, emissive: 0xff9d3d, emissiveIntensity: 1.6 }),
      green: new THREE.MeshStandardMaterial({ color: 0x082016, emissive: 0x5dffb0, emissiveIntensity: 1.4 }),
      red: new THREE.MeshStandardMaterial({ color: 0x2a080b, emissive: 0xff4055, emissiveIntensity: 1.6 }),
      paper: new THREE.MeshStandardMaterial({ color: 0x9aa5aa, metalness: 0.1, roughness: 0.8 })
    }
    this.stripMat = new THREE.MeshStandardMaterial({
      color: 0x0a1c24,
      emissive: 0xff3d4e,
      emissiveIntensity: 1.4,
      metalness: 0.3,
      roughness: 0.4
    })
    this.ceilingPanelMat = new THREE.MeshStandardMaterial({
      color: 0x101820,
      emissive: 0xff3d4e,
      emissiveIntensity: 0.7,
      metalness: 0.4,
      roughness: 0.3
    })
    this.projectorMat = new THREE.MeshStandardMaterial({
      color: 0x07232c,
      emissive: 0x1ec8e6,
      emissiveIntensity: 0.15,
      metalness: 0.65,
      roughness: 0.35,
      transparent: true,
      opacity: 0.92
    })
    this.projectorRingMat = new THREE.MeshStandardMaterial({
      color: 0x0b2831,
      emissive: 0x2be5ff,
      emissiveIntensity: 0.2,
      metalness: 0.7,
      roughness: 0.25
    })
    this.fuseMat = new THREE.MeshStandardMaterial({
      color: 0x3a2408,
      emissive: 0xffb347,
      emissiveIntensity: 2.4,
      metalness: 0.4,
      roughness: 0.3
    })
    this.doorGlowMat = new THREE.MeshBasicMaterial({
      color: 0xa8eeff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
    this.doorRingMat = new THREE.MeshStandardMaterial({
      color: 0x2b0c10,
      emissive: 0xff4055,
      emissiveIntensity: 1.5,
      metalness: 0.6,
      roughness: 0.3
    })
  }

  addGlow(position, size, color, opacity = 0.6) {
    const material = new THREE.SpriteMaterial({
      map: this.textures.glow,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    })
    const sprite = new THREE.Sprite(material)
    sprite.position.set(...position)
    sprite.scale.set(size, size, 1)
    this.scene.add(sprite)
    return sprite
  }

  box(width, height, depth, material, x, y, z, options = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
    mesh.position.set(x, y, z)
    if (options.rotation) mesh.rotation.set(...options.rotation)
    this.scene.add(mesh)
    this.disposables.push(mesh.geometry)
    return mesh
  }

  cylinder(radiusTop, radiusBottom, height, material, x, y, z, options = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments || 16), material)
    mesh.position.set(x, y, z)
    if (options.rotation) mesh.rotation.set(...options.rotation)
    this.scene.add(mesh)
    this.disposables.push(mesh.geometry)
    return mesh
  }

  torus(radius, tube, material, x, y, z, options = {}) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, options.radial || 8, options.tubular || 48), material)
    mesh.position.set(x, y, z)
    if (options.rotation) mesh.rotation.set(...options.rotation)
    this.scene.add(mesh)
    this.disposables.push(mesh.geometry)
    return mesh
  }

  plane(width, height, material, x, y, z, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
    mesh.position.set(x, y, z)
    mesh.rotation.set(...rotation)
    this.scene.add(mesh)
    this.disposables.push(mesh.geometry)
    return mesh
  }

  contactShadow(x, z, width, depth, opacity = 0.55) {
    if (!this.shadowTexture) {
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
      gradient.addColorStop(0, `rgba(0,0,0,${opacity})`)
      gradient.addColorStop(0.55, `rgba(0,0,0,${opacity * 0.5})`)
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 128, 128)
      this.shadowTexture = new THREE.CanvasTexture(canvas)
    }
    const material = new THREE.MeshBasicMaterial({
      map: this.shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.9
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, 0.012, z)
    this.scene.add(mesh)
    this.disposables.push(mesh.geometry, material)
    return mesh
  }

  buildLights() {
    this.scene.add(new THREE.AmbientLight(0x4a6d80, 1.26))
    const hemi = new THREE.HemisphereLight(0x5b9db8, 0x0a1116, 1.25)
    this.scene.add(hemi)

    this.lights = []
    const addPoint = (position, offColor, onColor, offIntensity, onIntensity, distance = 11, decay = 2) => {
      const light = new THREE.PointLight(offColor, offIntensity, distance, decay)
      light.position.set(...position)
      this.scene.add(light)
      this.lights.push({ light, offColor: new THREE.Color(offColor), onColor: new THREE.Color(onColor), offIntensity, onIntensity })
      return light
    }

    addPoint([-2.4, 3.05, -1.6], 0xff3048, 0xd9eef7, 9, 36, 11, 2)
    addPoint([2.4, 3.05, -1.6], 0xff3048, 0xcdefff, 9, 33, 11, 2)
    addPoint([-2.4, 3.05, 1.8], 0xff3048, 0xcdefff, 9, 30, 11, 2)
    addPoint([2.4, 3.05, 1.8], 0xff3048, 0xd8e9f4, 9, 33, 11, 2)
    this.deskLight = addPoint([2.4, 1.9, -3.5], 0xff5a3c, 0xffb36a, 6, 22, 7, 2)
    this.projectorLight = addPoint([4.3, 1.9, -1.3], 0xff4055, 0x30dfff, 4, 18, 8, 2)
    this.windowLight = addPoint([0, 2.0, 3.9], 0x4aa8ff, 0x8ed8ff, 8, 14, 8, 2)
    this.emergency = []
  }

  buildRoom() {
    this.box(10.4, 0.22, 10.4, this.mats.floor, 0, -0.12, 0)
    this.box(10.4, 0.22, 10.4, this.mats.ceiling, 0, 3.5, 0)

    this.box(10.4, 3.6, 0.24, this.mats.wall, 0, 1.72, -5.14)
    this.box(10.4, 3.6, 0.24, this.mats.wall, 0, 1.72, 5.14)
    this.box(0.24, 3.6, 10.4, this.mats.wall, -5.14, 1.72, 0)
    this.box(0.24, 3.6, 10.4, this.mats.wall, 5.14, 1.72, 0)

    const ribPositions = [-4.2, -2.8, -1.4, 0, 1.4, 2.8, 4.2]
    for (const x of ribPositions) {
      this.box(0.075, 3.05, 0.055, this.mats.trim, x, 1.65, -4.995)
      this.box(0.075, 3.05, 0.055, this.mats.trim, x, 1.65, 4.995)
    }
    for (const z of ribPositions) {
      this.box(0.055, 3.05, 0.075, this.mats.trim, -4.995, 1.65, z)
      this.box(0.055, 3.05, 0.075, this.mats.trim, 4.995, 1.65, z)
    }

    for (const y of [0.28, 2.7]) {
      this.box(10.05, 0.08, 0.06, this.mats.trimLight, 0, y, -4.99)
      this.box(10.05, 0.08, 0.06, this.mats.trimLight, 0, y, 4.99)
      this.box(0.06, 0.08, 10.05, this.mats.trimLight, -4.99, y, 0)
      this.box(0.06, 0.08, 10.05, this.mats.trimLight, 4.99, y, 0)
    }

    this.stripMat.emissiveIntensity = 1.3
    this.box(9.9, 0.022, 0.018, this.stripMat, 0, 2.5, -4.975)
    this.box(9.9, 0.022, 0.018, this.stripMat, 0, 2.5, 4.975)
    this.box(0.018, 0.022, 9.9, this.stripMat, -4.975, 2.5, 0)
    this.box(0.018, 0.022, 9.9, this.stripMat, 4.975, 2.5, 0)

    for (let i = 0; i < 4; i += 1) {
      for (let j = 0; j < 4; j += 1) {
        const x = -3.75 + i * 2.5
        const z = -3.75 + j * 2.5
        if (Math.abs(x) < 1.4 && z < -3) continue
        this.plane(2.32, 0.04, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }), x, 0.008, z, [-Math.PI / 2, 0, 0])
      }
    }

    const decalMat = new THREE.MeshBasicMaterial({
      map: this.textures.decal,
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
      toneMapped: false
    })
    this.plane(3.4, 3.4, decalMat, 0, 0.016, 0.35, [-Math.PI / 2, 0, 0])

    this.box(3.1, 0.015, 0.5, this.mats.hazard, 0, 0.02, -4.12)
    this.box(0.5, 0.015, 2.4, this.mats.hazard, -4.28, 0.02, 0.4)
    this.box(0.5, 0.015, 2.4, this.mats.hazard, 4.28, 0.02, 0.4)

    for (const x of [-2.4, 2.4]) {
      for (const z of [-1.8, 1.8]) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.07, 0.62), this.mats.screenFrame)
        frame.position.set(x, 3.32, z)
        this.scene.add(frame)
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.025, 0.46), this.ceilingPanelMat)
        panel.position.set(x, 3.275, z)
        this.scene.add(panel)
      }
    }

    this.torus(0.83, 0.028, this.stripMat, 0, 3.24, 0, { rotation: [Math.PI / 2, 0, 0], radial: 6, tubular: 64 })
    this.addGlow([0, 3.17, 0], 2.4, 0x3bd8ff, 0.12)

    for (const z of [-2.6, 0, 2.6]) {
      this.box(10.05, 0.13, 0.16, this.mats.trimDark, 0, 3.29, z)
    }
    this.box(0.16, 0.13, 10.05, this.mats.trimDark, -3.2, 3.29, 0)
    this.box(0.16, 0.13, 10.05, this.mats.trimDark, 3.2, 3.29, 0)

    for (const [x, z, rot] of [[-4.7, -3.6, -0.35], [-4.7, 3.4, 0.2], [4.7, -3.9, 0.3], [4.7, 3.2, -0.25]]) {
      const cable = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, 3.35, z),
            new THREE.Vector3(x + 0.28 * Math.sin(rot), 2.9, z + 0.1),
            new THREE.Vector3(x + 0.12, 2.45, z + 0.26),
            new THREE.Vector3(x, 2.35, z + 0.4)
          ]),
          24,
          0.017,
          6,
          false
        ),
        this.mats.rubber
      )
      this.scene.add(cable)
      this.disposables.push(cable.geometry)
    }

    this.addGlow([-4.6, 2.5, -4.4], 1.3, 0xff3048, 0.28)
    this.addGlow([4.6, 2.5, -4.4], 1.3, 0xff3048, 0.28)
    this.addGlow([-4.6, 2.5, 4.4], 1.3, 0xff3048, 0.22)
    this.addGlow([4.6, 2.5, 4.4], 1.3, 0xff3048, 0.22)
  }

  buildAirlock() {
    const group = new THREE.Group()
    group.position.set(0, 0, -4.9)
    this.scene.add(group)
    this.doorGroup = group

    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.15, 3.18, 0.22), this.mats.trim)
    frame.position.set(0, 1.61, 0)
    group.add(frame)
    const recess = new THREE.Mesh(new THREE.BoxGeometry(2.76, 2.9, 0.18), this.mats.trimDark)
    recess.position.set(0, 1.52, 0.08)
    group.add(recess)

    const corridorMat = new THREE.MeshBasicMaterial({ map: this.textures.corridor, toneMapped: false })
    const corridor = new THREE.Mesh(new THREE.PlaneGeometry(2.63, 3.04), corridorMat)
    corridor.position.set(0, 1.52, 0.179)
    group.add(corridor)
    this.corridorMat = corridorMat
    this.disposables.push(corridor.geometry, corridorMat)

    const slab = new THREE.Group()
    slab.position.set(0, 1.47, 0.2)
    group.add(slab)
    this.doorSlab = slab

    const slabMesh = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.76, 0.16), this.mats.wallDark)
    slab.add(slabMesh)
    this.disposables.push(slabMesh.geometry)

    for (const y of [-1.1, -0.55, 0, 0.55, 1.1]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.045, 0.035), this.mats.trimLight)
      rib.position.set(0, y, 0.095)
      slab.add(rib)
      this.disposables.push(rib.geometry)
    }
    const edgeMat = this.mats.trimLight
    for (const x of [-1.24, 1.24]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.76, 0.055), edgeMat)
      edge.position.set(x, 0, 0.09)
      slab.add(edge)
      this.disposables.push(edge.geometry)
    }

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.042, 8, 48), this.doorRingMat)
    ring.position.set(0, 0.12, 0.13)
    slab.add(ring)
    this.disposables.push(ring.geometry)
    this.doorRing = ring

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.012, 6, 40), this.mats.trimLight)
    innerRing.position.set(0, 0.12, 0.135)
    slab.add(innerRing)
    this.disposables.push(innerRing.geometry)

    const portholeMat = new THREE.MeshBasicMaterial({ map: this.textures.nebula, color: 0x9fc4d4, toneMapped: false })
    const porthole = new THREE.Mesh(new THREE.CircleGeometry(0.495, 48), portholeMat)
    porthole.position.set(0, 0.12, 0.118)
    slab.add(porthole)
    this.disposables.push(porthole.geometry, portholeMat)

    const portholeGlassMat = new THREE.MeshBasicMaterial({
      map: this.textures.glow,
      color: 0x2bd8ff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    })
    const portholeGlass = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), portholeGlassMat)
    portholeGlass.position.set(0, 0.12, 0.125)
    slab.add(portholeGlass)
    this.portholeGlassMat = portholeGlassMat
    this.disposables.push(portholeGlass.geometry, portholeGlassMat)

    for (let i = 0; i < 8; i += 1) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 8), this.mats.trimLight)
      bolt.rotation.x = Math.PI / 2
      const angle = (i / 8) * Math.PI * 2
      bolt.position.set(Math.cos(angle) * 0.44, Math.sin(angle) * 0.44 + 0.12, 0.16)
      slab.add(bolt)
      this.disposables.push(bolt.geometry)
    }

    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 0.34), new THREE.MeshBasicMaterial({ map: this.textures.hazard, toneMapped: false }))
    stripe.position.set(0, -1.18, 0.105)
    slab.add(stripe)
    this.disposables.push(stripe.geometry, stripe.material)

    const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.1), this.mats.amber)
    gauntlet.position.set(0, -0.72, 0.12)
    slab.add(gauntlet)
    this.disposables.push(gauntlet.geometry)

    const labelMat = new THREE.MeshBasicMaterial({ map: this.textures.label('AIRLOCK 01', { width: 512, height: 96, size: 34 }), transparent: true, toneMapped: false })
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.36), labelMat)
    label.position.set(0, 3.04, 0.33)
    label.rotation.x = 0
    group.add(label)
    this.disposables.push(label.geometry, labelMat)

    this.doorStatus = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), this.mats.red.clone())
    this.doorStatus.position.set(1.43, 2.6, 0.16)
    group.add(this.doorStatus)
    this.disposables.push(this.doorStatus.geometry, this.doorStatus.material)

    const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.9), this.doorGlowMat)
    doorGlow.position.set(0, 1.48, -0.03)
    group.add(doorGlow)
    this.disposables.push(doorGlow.geometry)
    this.doorGlow = doorGlow

    this.doorStatusGlow = this.addGlow([1.43, 2.6, -4.72], 0.55, 0xff3048, 0.5)
    this.doorHalo = this.addGlow([0, 1.5, -4.55], 4.2, 0x2bd8ff, 0.08)

    this.registerHotspot('door', [slabMesh, ...slab.children], group)
    this.contactShadow(0, -4.5, 3.4, 1.2, 0.75)
  }

  buildDesk() {
    const group = new THREE.Group()
    group.position.set(2.7, 0, -4.45)
    this.scene.add(group)
    this.deskGroup = group

    const top = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.1, 0.78), this.mats.trim)
    top.position.set(0, 1.0, 0)
    group.add(top)
    const front = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.82, 0.07), this.mats.wallDark)
    front.position.set(0, 0.56, 0.34)
    group.add(front)
    for (const x of [-1.08, 1.08]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.92, 0.62), this.mats.trimDark)
      leg.position.set(x, 0.5, 0)
      group.add(leg)
    }
    const kick = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.08, 0.1), this.stripMat)
    kick.position.set(0, 0.2, 0.38)
    group.add(kick)

    const drawer = new THREE.Group()
    drawer.position.set(-0.66, 0.83, 0.39)
    group.add(drawer)
    this.drawer = drawer
    const drawerFace = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.05), this.mats.trimLight)
    drawer.add(drawerFace)
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.05), this.mats.amber)
    handle.position.set(0, 0.02, 0.045)
    drawer.add(handle)
    const drawerLine = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.012, 0.02), this.mats.trimDark)
    drawerLine.position.set(0, -0.07, 0.048)
    drawer.add(drawerLine)
    this.disposables.push(drawerFace.geometry, handle.geometry, drawerLine.geometry)

    const fuse = new THREE.Group()
    fuse.position.set(-0.66, 0.9, 0.55)
    fuse.visible = false
    group.add(fuse)
    this.fuseObject = fuse
    const fuseBody = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 12), this.fuseMat)
    fuseBody.rotation.z = Math.PI / 2
    fuse.add(fuseBody)
    for (const x of [-0.11, 0.11]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.035, 12), this.mats.trimLight)
      cap.rotation.z = Math.PI / 2
      cap.position.x = x
      fuse.add(cap)
      this.disposables.push(cap.geometry)
    }
    this.disposables.push(fuseBody.geometry)
    this.fuseGlow = this.addGlow([2.04, 0.98, -3.92], 0.5, 0xffb347, 0.35)
    this.fuseGlow.visible = false

    const monitorGroup = new THREE.Group()
    monitorGroup.position.set(-0.2, 1.55, -0.14)
    monitorGroup.rotation.y = -0.16
    group.add(monitorGroup)
    const monitorBody = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.66, 0.07), this.mats.screenFrame)
    monitorGroup.add(monitorBody)
    this.disposables.push(monitorBody.geometry)

    this.statusScreen = makeDynamicScreen(512, 256, drawStatusScreen)
    this.statusScreen.refresh({ powered: false })
    const screenMat = new THREE.MeshBasicMaterial({ map: this.statusScreen.texture, toneMapped: false })
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.53), screenMat)
    screen.position.set(0, 0, 0.041)
    monitorGroup.add(screen)
    this.disposables.push(screen.geometry, screenMat)

    const smallGroup = new THREE.Group()
    smallGroup.position.set(-1.17, 1.43, 0.02)
    smallGroup.rotation.y = 0.4
    group.add(smallGroup)
    const smallBody = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.4, 0.06), this.mats.screenFrame)
    smallGroup.add(smallBody)
    this.disposables.push(smallBody.geometry)
    this.mapScreen = makeDynamicScreen(384, 256, drawMapScreen)
    this.mapScreen.refresh({ powered: false, solved: false })
    const mapMat = new THREE.MeshBasicMaterial({ map: this.mapScreen.texture, toneMapped: false })
    const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.51, 0.34), mapMat)
    mapPlane.position.set(0, 0, 0.036)
    smallGroup.add(mapPlane)
    this.disposables.push(mapPlane.geometry, mapMat)

    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.035, 0.24), this.mats.trimDark)
    keyboard.position.set(0.28, 1.07, 0.03)
    keyboard.rotation.y = -0.12
    group.add(keyboard)
    this.disposables.push(keyboard.geometry)
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const key = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.045), this.mats.trimLight)
        key.position.set(0.01 + col * 0.075, 1.093, -0.06 + row * 0.055)
        key.rotation.y = -0.12
        group.add(key)
        this.disposables.push(key.geometry)
      }
    }

    const keypadGroup = new THREE.Group()
    keypadGroup.position.set(0.56, 1.2, 0.26)
    keypadGroup.rotation.set(-0.16, -0.32, 0)
    group.add(keypadGroup)
    const keypadBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.06), this.mats.screenFrame)
    keypadGroup.add(keypadBody)
    this.disposables.push(keypadBody.geometry)
    const keypadMat = new THREE.MeshBasicMaterial({ map: this.textures.keypad, toneMapped: false })
    const keypadFace = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.34), keypadMat)
    keypadFace.position.set(0, 0, 0.033)
    keypadGroup.add(keypadFace)
    this.disposables.push(keypadFace.geometry, keypadMat)
    this.keypadGlow = this.addGlow([3.27, 1.2, -4.16], 0.6, 0x2bd8ff, 0.12)

    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.15, 16), this.mats.paper)
    mug.position.set(0.98, 1.12, 0.1)
    group.add(mug)
    this.disposables.push(mug.geometry)

    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(2.3, 1.05, -4.15),
          new THREE.Vector3(2.0, 0.9, -3.9),
          new THREE.Vector3(1.3, 0.55, -3.95),
          new THREE.Vector3(1.05, 0.12, -4.1)
        ]),
        28,
        0.018,
        6,
        false
      ),
      this.mats.rubber
    )
    this.scene.add(cable)
    this.disposables.push(cable.geometry)

    const pip = new THREE.Group()
    pip.position.set(-0.78, 1.06, 0.18)
    group.add(pip)
    this.pipGroup = pip
    const pipBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.08, 24), this.mats.trimDark)
    pip.add(pipBase)
    this.disposables.push(pipBase.geometry)
    const pipRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.011, 6, 32), this.projectorRingMat)
    pipRing.rotation.x = Math.PI / 2
    pipRing.position.y = 0.05
    pip.add(pipRing)
    this.disposables.push(pipRing.geometry)
    const orbMat = new THREE.MeshStandardMaterial({ color: 0x0b3948, emissive: 0x52e9ff, emissiveIntensity: 2.1, metalness: 0.2, roughness: 0.2 })
    this.pipOrb = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), orbMat)
    this.pipOrb.position.y = 0.29
    pip.add(this.pipOrb)
    this.disposables.push(this.pipOrb.geometry, orbMat)
    this.pipHalo = this.addGlow([1.92, 1.35, -4.27], 0.9, 0x3fe6ff, 0.38)
    this.pipRings = []
    for (let i = 0; i < 2; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17 + i * 0.055, 0.006, 5, 32), this.projectorRingMat)
      ring.rotation.x = Math.PI / 2 + i * 0.5
      ring.position.y = 0.3
      pip.add(ring)
      this.disposables.push(ring.geometry)
      this.pipRings.push(ring)
    }

    this.registerHotspot('drawer', [drawerFace, handle, drawerLine], drawer)
    this.registerHotspot('fuse', [fuseBody, ...fuse.children], fuse)
    this.registerHotspot('keypad', [keypadBody, keypadFace], keypadGroup)
    this.registerHotspot('hologram', [this.pipOrb, pipBase, ...pip.children], pip)
    this.contactShadow(2.7, -4.38, 3.0, 1.3, 0.7)
  }

  buildRelay() {
    const group = new THREE.Group()
    group.position.set(-4.82, 0, -1.2)
    group.rotation.y = Math.PI / 2
    this.scene.add(group)
    this.relayGroup = group

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.46, 1.9, 0.38), this.mats.wallDark)
    body.position.set(0, 1.25, 0)
    group.add(body)
    const inner = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.56, 0.05), this.mats.trimDark)
    inner.position.set(0, 1.3, 0.2)
    group.add(inner)
    const hazardBand = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.16), new THREE.MeshBasicMaterial({ map: this.textures.hazard, toneMapped: false }))
    hazardBand.position.set(0, 0.49, 0.215)
    group.add(hazardBand)
    this.disposables.push(hazardBand.geometry, hazardBand.material)

    const labelMat = new THREE.MeshBasicMaterial({ map: this.textures.label('AUX POWER // 3', { width: 512, height: 96, size: 30 }), transparent: true, toneMapped: false })
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.22), labelMat)
    label.position.set(0, 2.02, 0.22)
    group.add(label)
    this.disposables.push(label.geometry, labelMat)

    for (let i = 0; i < 3; i += 1) {
      const leverBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.08), this.mats.trim)
      leverBase.position.set(-0.34 + i * 0.34, 1.72, 0.235)
      group.add(leverBase)
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.21, 0.06), this.mats.amber)
      lever.position.set(-0.34 + i * 0.34, 1.78, 0.29)
      lever.rotation.z = i === 1 ? 0.35 : -0.25
      group.add(lever)
      this.disposables.push(leverBase.geometry, lever.geometry)
    }

    const socket = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.06), this.mats.trim)
    socket.position.set(0, 1.05, 0.235)
    group.add(socket)
    this.disposables.push(socket.geometry)
    const socketInner = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ color: 0x4a2a08, toneMapped: false }))
    socketInner.position.set(0, 1.05, 0.268)
    group.add(socketInner)
    this.disposables.push(socketInner.geometry, socketInner.material)
    this.socketGlow = this.addGlow([-4.55, 1.25, -1.2], 0.7, 0xffa53d, 0.24)

    for (let i = 0; i < 2; i += 1) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.35, 12), this.mats.trim)
      pipe.position.set(-0.58 + i * 0.16, 2.55, -0.04)
      group.add(pipe)
      this.disposables.push(pipe.geometry)
    }
    for (const x of [-0.55, 0.55]) {
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.9, 12), this.mats.trimDark)
      conduit.position.set(x, 2.35, -0.05)
      group.add(conduit)
      this.disposables.push(conduit.geometry)
    }

    this.relayIndicator = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.03), this.mats.red.clone())
    this.relayIndicator.position.set(0.6, 2.12, 0.22)
    group.add(this.relayIndicator)
    this.disposables.push(this.relayIndicator.geometry, this.relayIndicator.material)

    this.registerHotspot('relay', [...group.children], group)
    this.contactShadow(-4.5, -1.2, 1.8, 2.2, 0.55)
  }

  buildProjector() {
    const group = new THREE.Group()
    group.position.set(4.86, 1.85, -1.3)
    group.rotation.y = -Math.PI / 2
    this.scene.add(group)
    this.projectorGroup = group

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.96, 0.12, 40), this.mats.trimDark)
    base.rotation.x = Math.PI / 2
    group.add(base)
    this.disposables.push(base.geometry)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.035, 8, 64), this.mats.trimLight)
    group.add(rim)
    this.disposables.push(rim.geometry)

    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.83, 48), this.projectorMat)
    disc.position.z = 0.08
    group.add(disc)
    this.disposables.push(disc.geometry)
    this.projectorDisc = disc

    this.projectorRings = []
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34 + i * 0.18, 0.008, 5, 64), this.projectorRingMat)
      ring.position.z = 0.16
      group.add(ring)
      this.disposables.push(ring.geometry)
      this.projectorRings.push(ring)
    }

    const stars = []
    const random = (() => {
      let s = 19
      return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff
        return s / 0x7fffffff
      }
    })()
    for (let i = 0; i < 44; i += 1) {
      const angle = random() * Math.PI * 2
      const radius = Math.sqrt(random()) * 0.76
      stars.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.18 + random() * 0.08)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0x8ff2ff,
      size: 0.022,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    })
    this.projectorStars = new THREE.Points(starGeo, starMat)
    group.add(this.projectorStars)
    this.disposables.push(starGeo, starMat)

    const centerStar = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), this.fuseMat)
    centerStar.position.set(0, 0, 0.22)
    group.add(centerStar)
    this.disposables.push(centerStar.geometry)

    const glow = this.addGlow([4.63, 1.85, -1.3], 1.7, 0x2bd8ff, 0.14)
    this.projectorHalo = glow
    const frameLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.15), new THREE.MeshBasicMaterial({ map: this.textures.label('NAV-7', { width: 256, height: 80, size: 30 }), transparent: true, toneMapped: false }))
    frameLabel.position.set(0, -1.06, 0.02)
    group.add(frameLabel)
    this.disposables.push(frameLabel.geometry, frameLabel.material)

    this.registerHotspot('starchart', [base, disc, ...this.projectorRings], group)
  }

  buildObservationWindow() {
    const group = new THREE.Group()
    group.position.set(0, 1.83, 4.9)
    group.rotation.y = Math.PI
    this.scene.add(group)
    this.windowGroup = group

    const nebulaMat = new THREE.MeshBasicMaterial({ map: this.textures.nebula, toneMapped: false })
    const view = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 1.95), nebulaMat)
    view.position.z = 0.02
    group.add(view)
    this.disposables.push(view.geometry, nebulaMat)

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 1.95), this.mats.glass)
    glass.position.z = 0.12
    group.add(glass)
    this.disposables.push(glass.geometry)

    const frameMat = this.mats.trim
    for (const x of [-2.78, 2.78]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.22, 0.2), frameMat)
      side.position.set(x, 0, 0.12)
      group.add(side)
      this.disposables.push(side.geometry)
    }
    for (const y of [-1.07, 1.07]) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(5.68, 0.14, 0.2), frameMat)
      top.position.set(0, y, 0.12)
      group.add(top)
      this.disposables.push(top.geometry)
    }
    for (const x of [-1.78, 0, 1.78]) {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.98, 0.14), this.mats.trimDark)
      mullion.position.set(x, 0, 0.12)
      group.add(mullion)
      this.disposables.push(mullion.geometry)
    }
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.16), new THREE.MeshBasicMaterial({ map: this.textures.label('OBSERVATION', { width: 320, height: 80, size: 26 }), transparent: true, toneMapped: false }))
    label.position.set(0, 1.2, 0.2)
    group.add(label)
    this.disposables.push(label.geometry, label.material)

    this.windowGlow = this.addGlow([0, 2.2, 4.5], 5.2, 0x2a8dff, 0.14)
    this.registerHotspot('window', [view, glass, ...group.children], group)
  }

  buildServerRack() {
    const group = new THREE.Group()
    group.position.set(4.72, 0, 2.0)
    this.scene.add(group)
    this.serverGroup = group
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.05, 1.05), this.mats.wallDark)
    rack.position.y = 1.02
    group.add(rack)
    this.disposables.push(rack.geometry)
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.86, 0.92), this.mats.trimDark)
    face.position.set(-0.29, 1.07, 0)
    group.add(face)
    this.disposables.push(face.geometry)
    this.leds = []
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const ledMat = new THREE.MeshStandardMaterial({
          color: 0x071018,
          emissive: col === 0 ? 0x38d9ff : 0xffa53d,
          emissiveIntensity: 0.6
        })
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.04), ledMat)
        led.position.set(-0.31, 0.38 + row * 0.2, -0.28 + col * 0.58)
        group.add(led)
        this.disposables.push(led.geometry, ledMat)
        this.leds.push(ledMat)
      }
    }
    const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.32), new THREE.MeshBasicMaterial({ map: this.textures.hazard, toneMapped: false }))
    vent.position.set(-0.31, 0.1, 0)
    vent.rotation.y = -Math.PI / 2
    group.add(vent)
    this.disposables.push(vent.geometry, vent.material)
    this.registerHotspot('server', [...group.children], group)
    this.contactShadow(4.3, 2.0, 1.1, 1.6, 0.5)
  }

  buildCrates() {
    const group = new THREE.Group()
    group.position.set(-4.28, 0, 2.05)
    this.scene.add(group)
    this.crateGroup = group
    const crateA = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.82, 0.92), this.mats.wallDark)
    crateA.position.y = 0.42
    crateA.rotation.y = 0.12
    group.add(crateA)
    this.disposables.push(crateA.geometry)
    const crateB = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.64, 0.76), this.mats.wallDark)
    crateB.position.set(0.05, 1.14, 0.02)
    crateB.rotation.y = -0.18
    group.add(crateB)
    this.disposables.push(crateB.geometry)
    const stripeA = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.13), new THREE.MeshBasicMaterial({ map: this.textures.hazard, toneMapped: false }))
    stripeA.position.set(0, 0.42, 0.47)
    stripeA.rotation.y = 0.12
    group.add(stripeA)
    const stripeB = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.11), new THREE.MeshBasicMaterial({ map: this.textures.hazard, toneMapped: false }))
    stripeB.position.set(0.05, 1.18, 0.4)
    stripeB.rotation.y = -0.18
    group.add(stripeB)
    this.disposables.push(stripeA.geometry, stripeA.material, stripeB.geometry, stripeB.material)
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), this.mats.amber)
    latch.position.set(0.04, 0.72, 0.475)
    latch.rotation.y = 0.12
    group.add(latch)
    this.disposables.push(latch.geometry)
    this.registerHotspot('crates', [...group.children], group)
    this.contactShadow(-4.1, 2.05, 1.6, 1.5, 0.6)
  }

  buildCryoPod() {
    const group = new THREE.Group()
    group.position.set(-3.5, 0, 4.32)
    this.scene.add(group)
    this.cryoGroup = group
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.25, 24), this.mats.trimDark)
    base.position.y = 0.13
    group.add(base)
    this.disposables.push(base.geometry)
    const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.25, 8, 20), this.mats.glass)
    capsule.position.y = 1.05
    group.add(capsule)
    this.disposables.push(capsule.geometry)
    const innerGlow = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.05, 6, 16), new THREE.MeshBasicMaterial({ color: 0x0e5c70, transparent: true, opacity: 0.4, toneMapped: false }))
    innerGlow.position.y = 1.05
    group.add(innerGlow)
    this.disposables.push(innerGlow.geometry, innerGlow.material)
    for (const y of [0.34, 1.78]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 32), this.mats.trimLight)
      rim.rotation.x = Math.PI / 2
      rim.position.y = y
      group.add(rim)
      this.disposables.push(rim.geometry)
    }
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.12), new THREE.MeshBasicMaterial({ map: this.textures.label('CRYO 04', { width: 256, height: 72, size: 28 }), transparent: true, toneMapped: false }))
    label.position.set(0, 0.42, 0.48)
    group.add(label)
    this.disposables.push(label.geometry, label.material)
    this.registerHotspot('cryo', [...group.children], group)
    this.contactShadow(-3.5, 4.32, 1.3, 1.3, 0.55)
  }

  buildAtmosphere() {
    const random = (() => {
      let s = 71
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0
        return s / 4294967296
      }
    })()
    const positions = []
    for (let i = 0; i < 260; i += 1) {
      positions.push((random() - 0.5) * 9.2, random() * 3.1 + 0.15, (random() - 0.5) * 9.2)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: 0x9fe8ff,
      size: 0.014,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    this.dust = new THREE.Points(geometry, material)
    this.scene.add(this.dust)
    this.disposables.push(geometry, material)
  }

  registerHotspot(id, meshes, root) {
    this.hotspots = this.hotspots || new Map()
    const entry = { id, root, meshes, marker: this.markers.get(id) }
    this.hotspots.set(id, entry)
    for (const mesh of meshes) {
      if (!mesh) continue
      mesh.userData.hotspot = id
      if (!this.hotspotMeshes.includes(mesh)) this.hotspotMeshes.push(mesh)
    }
  }

  buildMarkers() {
    for (const config of MARKERS) {
      const element = document.createElement('button')
      element.type = 'button'
      element.className = `marker${config.minor ? ' minor' : ''}${config.hidden ? ' is-hidden' : ''}`
      element.dataset.id = config.id
      element.setAttribute('aria-label', config.label)
      element.innerHTML = `<span class="marker-ring"></span><span class="marker-glyph">${config.icon}</span><span class="marker-label">${config.label}</span>`
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        this.onHotspot(config.id)
      })
      this.markerLayer.appendChild(element)
      this.markers.set(config.id, {
        id: config.id,
        position: new THREE.Vector3(...config.position),
        element,
        hidden: Boolean(config.hidden),
        done: false,
        attention: false
      })
    }
  }

  setMarker(id, patch = {}) {
    const marker = this.markers.get(id)
    if (!marker) return
    Object.assign(marker, patch)
    marker.element.classList.toggle('is-hidden', Boolean(marker.hidden))
    marker.element.classList.toggle('is-done', Boolean(marker.done))
    marker.element.classList.toggle('is-attention', Boolean(marker.attention))
    if (patch.label) marker.element.querySelector('.marker-label').textContent = patch.label
    if (patch.icon) marker.element.querySelector('.marker-glyph').textContent = patch.icon
  }

  setScanning(active) {
    this.scanning = active
    this.markerLayer.classList.toggle('scanning', active)
  }

  setPower(on) {
    this.powerOn = on
    this.powerStartedAt = performance.now()
    if (on) {
      this.statusScreen.refresh({ powered: true, codeKnown: this.codeKnown, unlocked: this.doorOpen })
      this.mapScreen.refresh({ powered: true, solved: this.codeKnown })
      this.relayIndicator.material.color.setHex(0x082016)
      this.relayIndicator.material.emissive.setHex(0x5dffb0)
      this.socketGlow.material.color.setHex(0x2bd8ff)
    }
  }

  setCodeKnown() {
    this.codeKnown = true
    this.mapScreen.refresh({ powered: true, solved: true })
  }

  openDoor() {
    this.doorOpen = true
    this.doorOpenedAt = performance.now()
  }

  openDrawer() {
    this.drawerOpen = true
    this.drawerOpenedAt = performance.now()
    this.fuseObject.visible = true
    this.fuseGlow.visible = true
    const fuseMarker = this.markers.get('fuse')
    if (fuseMarker) fuseMarker.position.set(2.04, 0.98, -3.6)
  }

  takeFuse() {
    this.fuseObject.visible = false
    this.fuseGlow.visible = false
    this.fuseGlow.material.opacity = 0
  }

  nudgeYaw(amount) {
    this.look.yawTarget += amount
  }

  pulse() {
    this.pulseAmount = 1
  }

  refreshScreens() {
    this.statusScreen.refresh({
      powered: this.powerMix > 0.5,
      codeKnown: this.codeKnown,
      unlocked: this.doorOpen
    })
    this.mapScreen.refresh({
      powered: this.powerMix > 0.5,
      solved: this.codeKnown
    })
  }

  bindInput() {
    this.onPointerDown = (event) => {
      if (!this.active) return
      if (event.button !== undefined && event.button !== 0) return
      this.drag = {
        x: event.clientX,
        y: event.clientY,
        yaw: this.look.yawTarget,
        pitch: this.look.pitchTarget
      }
      this.pointerMoved = 0
      this.lastPointer = { x: event.clientX, y: event.clientY }
      this.canvas.setPointerCapture?.(event.pointerId)
      this.canvas.classList.add('grabbing')
    }

    this.onPointerMove = (event) => {
      if (!this.drag) return
      const dx = event.clientX - this.drag.x
      const dy = event.clientY - this.drag.y
      this.pointerMoved = Math.max(this.pointerMoved, Math.hypot(dx, dy))
      this.look.yawTarget = this.drag.yaw - dx * 0.0042
      this.look.pitchTarget = clamp(this.drag.pitch - dy * 0.0032, -0.55, 0.42)
      this.lastPointer = { x: event.clientX, y: event.clientY }
    }

    this.onPointerUp = (event) => {
      if (!this.drag) return
      this.drag = null
      this.canvas.classList.remove('grabbing')
      this.canvas.releasePointerCapture?.(event.pointerId)
      if (this.pointerMoved < 7) this.pick(event.clientX, event.clientY)
    }

    this.onWheel = (event) => {
      if (!this.active) return
      event.preventDefault()
      this.camera.fov = clamp(this.camera.fov + event.deltaY * 0.016, 46, 72)
      this.camera.updateProjectionMatrix()
    }

    this.onKeyDown = (event) => {
      if (!this.active || document.body.classList.contains('modal-open')) return
      const step = event.shiftKey ? 0.18 : 0.07
      if (event.key === 'ArrowLeft') this.look.yawTarget += step
      else if (event.key === 'ArrowRight') this.look.yawTarget -= step
      else if (event.key === 'ArrowUp') this.look.pitchTarget = clamp(this.look.pitchTarget + step * 0.6, -0.55, 0.42)
      else if (event.key === 'ArrowDown') this.look.pitchTarget = clamp(this.look.pitchTarget - step * 0.6, -0.55, 0.42)
      else return
      event.preventDefault()
    }

    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    this.canvas.addEventListener('pointermove', this.onPointerMove)
    this.canvas.addEventListener('pointerup', this.onPointerUp)
    this.canvas.addEventListener('pointercancel', this.onPointerUp)
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false })
    window.addEventListener('keydown', this.onKeyDown)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.canvas.parentElement)
  }

  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.hotspotMeshes, false)
    if (hits.length) {
      const id = hits[0].object.userData.hotspot
      if (id) this.onHotspot(id)
    }
  }

  setActive(active) {
    this.active = active
    this.markerLayer.classList.toggle('is-active', active)
  }

  resize() {
    const parent = this.canvas.parentElement
    if (!parent) return
    const width = Math.max(1, parent.clientWidth)
    const height = Math.max(1, parent.clientHeight)
    const base = Math.min(window.devicePixelRatio || 1, 2)
    this.renderer.setPixelRatio(base * this.renderScale)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.viewWidth = width
    this.viewHeight = height
  }

  updateMarkers() {
    if (!this.viewWidth) return
    const width = this.viewWidth
    const height = this.viewHeight
    for (const marker of this.markers.values()) {
      _world.copy(marker.position).project(this.camera)
      const x = (_world.x * 0.5 + 0.5) * width
      const y = (-_world.y * 0.5 + 0.5) * height
      const visible = this.active && _world.z < 1 && x > -40 && x < width + 40 && y > -40 && y < height + 40
      marker.element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
      marker.element.style.visibility = visible && !this.markersBlocked ? 'visible' : 'hidden'
      marker.element.style.opacity = visible && !this.markersBlocked ? '' : '0'
    }
  }

  setMarkersBlocked(blocked) {
    this.markersBlocked = blocked
  }

  startRendering() {
    if (this.running) return
    this.running = true
    this.clock.start()
    this.animate()
  }

  animate() {
    if (!this.running) return
    requestAnimationFrame(() => this.animate())
    const dt = Math.min(this.clock.getDelta(), 0.25)
    this.elapsed += dt
    const t = this.elapsed
    const now = performance.now()
    this.powerMix = this.powerOn ? Math.min(1, (now - this.powerStartedAt) / 1500) : 0
    const p = this.powerMix
    const flicker = p > 0.05 && p < 0.98 ? 0.7 + Math.random() * 0.6 : 1

    for (const entry of this.lights) {
      entry.light.color.copy(entry.offColor).lerp(entry.onColor, p)
      entry.light.intensity = lerp(entry.offIntensity, entry.onIntensity, p) * (p > 0.02 && p < 0.98 ? flicker : 1)
    }
    this.stripMat.emissive.setHex(0xff3d4e).lerp(_color.setHex(0x2bd8ff), p)
    this.stripMat.emissiveIntensity = lerp(2.0, 3.2, p)
    this.ceilingPanelMat.emissive.setHex(0xff3d4e).lerp(_color.setHex(0xcdefff), p)
    this.ceilingPanelMat.emissiveIntensity = lerp(1.4, 3.0, p)
    this.projectorMat.emissiveIntensity = lerp(0.12, 1.6, p)
    this.projectorMat.opacity = lerp(0.7, 0.94, p)
    this.projectorRingMat.emissiveIntensity = lerp(0.16, 1.9, p)
    this.projectorHalo.material.opacity = lerp(0.04, 0.18, p) + Math.sin(t * 1.3) * 0.02
    this.projectorDisc.rotation.z = t * 0.08
    this.projectorRings.forEach((ring, index) => {
      ring.rotation.z = t * (0.08 + index * 0.045) * (index % 2 ? -1 : 1)
      ring.scale.setScalar(1 + Math.sin(t * 1.2 + index) * 0.015 * p)
    })
    this.projectorStars.rotation.z = -t * 0.06
    this.projectorStars.material.opacity = lerp(0.2, 0.9, p)
    if (this.projectorStars.material.size !== undefined) this.projectorStars.material.size = lerp(0.012, 0.022, p)

    this.doorStatus.material.emissive.setHex(this.doorOpen ? 0x5dffb0 : p > 0.5 ? 0xff4055 : 0xff4055)
    this.doorStatus.material.emissiveIntensity = 1.4 + Math.sin(t * 4.2) * 0.4
    this.doorStatusGlow.material.color.setHex(this.doorOpen ? 0x5dffb0 : 0xff4055)

    this.drawerMix = this.drawerOpen ? Math.min(1, (now - this.drawerOpenedAt) / 700) : 0
    const drawerEase = easeInOut(this.drawerMix)
    this.drawer.position.z = 0.39 + drawerEase * 0.3
    if (this.fuseObject.visible) {
      this.fuseObject.rotation.y = t * 0.8
      this.fuseObject.position.y = 0.9 + Math.sin(t * 2.4) * 0.02
      this.fuseObject.position.z = 0.55 + drawerEase * 0.3
    }

    this.doorMix = this.doorOpen ? Math.min(1, (now - this.doorOpenedAt) / 1800) : 0
    const doorEase = easeInOut(this.doorMix)
    this.doorSlab.position.y = 1.47 + doorEase * 3.62
    this.doorGlowMat.opacity = doorEase * 0.22
    this.doorHalo.material.opacity = 0.04 + doorEase * 0.32
    this.doorRing.scale.setScalar(1 + Math.sin(t * 2.4) * 0.012)
    this.doorRing.material = this.doorRingMat
    this.doorRingMat.emissive.setHex(this.doorOpen ? 0x5dffb0 : 0xff4055)

    this.relayIndicator.material.emissiveIntensity = p > 0.5 ? 1.3 + Math.sin(t * 3) * 0.4 : 0.7 + Math.sin(t * 5) * 0.6
    this.socketGlow.material.opacity = lerp(0.2 + Math.sin(t * 2.2) * 0.05, 0.12, p)
    this.fuseGlow.material.opacity = this.fuseObject.visible ? 0.32 + Math.sin(t * 3) * 0.1 : 0
    this.keypadGlow.material.opacity = lerp(0.04, 0.16, p) + Math.sin(t * 2) * 0.02
    this.windowGlow.material.opacity = 0.1 + Math.sin(t * 0.8) * 0.03

    this.pulseAmount = Math.max(0, this.pulseAmount - dt * 1.4)
    const pipPulse = 1 + this.pulseAmount * 0.35 + Math.sin(t * 2.1) * 0.035
    this.pipOrb.scale.setScalar(pipPulse)
    this.pipHalo.material.opacity = 0.26 + this.pulseAmount * 0.4 + Math.sin(t * 2.1) * 0.04
    this.pipOrb.position.y = 0.29 + Math.sin(t * 1.6) * 0.012
    this.pipRings.forEach((ring, index) => {
      ring.rotation.z = t * (0.5 + index * 0.3) * (index % 2 ? -1 : 1)
      ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.9 + index) * 0.35
    })

    if (this.dust) {
      this.dust.rotation.y = t * 0.007
      this.dust.position.y = Math.sin(t * 0.2) * 0.05
    }
    this.leds.forEach((led, index) => {
      led.emissiveIntensity = 0.4 + Math.abs(Math.sin(t * (1.4 + index * 0.13) + index)) * (p > 0.5 ? 1.5 : 0.5)
    })

    this.screenTimer += dt
    if (this.screenTimer > 0.75) {
      this.screenTimer = 0
      this.statusScreen.refresh({
        powered: p > 0.5,
        codeKnown: this.codeKnown,
        unlocked: this.doorOpen,
        powerLevel: Math.round(p * 100)
      })
      this.mapScreen.refresh({
        powered: p > 0.5,
        solved: this.codeKnown
      })
    }

    this.look.yaw += (this.look.yawTarget - this.look.yaw) * Math.min(1, dt * 9)
    this.look.pitch += (this.look.pitchTarget - this.look.pitch) * Math.min(1, dt * 9)
    const sway = this.drag ? 0 : 1
    this.camera.rotation.y = this.look.yaw + Math.sin(t * 0.21) * 0.0035 * sway
    this.camera.rotation.x = this.look.pitch + Math.sin(t * 0.17) * 0.0022 * sway
    this.camera.position.y = 1.63 + Math.sin(t * 0.55) * 0.006 * sway

    this.updateMarkers()
    this.renderer.render(this.scene, this.camera)

    this.perfFrames += 1
    if (now - this.perfAt > 1800) {
      const fps = (this.perfFrames * 1000) / (now - this.perfAt)
      document.body.classList.toggle('low-perf', fps < 24)
      if (fps < 24 && this.renderScale > 0.7) {
        this.renderScale = 0.7
        this.resize()
      } else if (fps > 46 && this.renderScale < 1) {
        this.renderScale = 1
        this.resize()
      }
      this.perfAt = now
      this.perfFrames = 0
    }
  }

  destroy() {
    this.running = false
    this.resizeObserver?.disconnect()
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.canvas.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('keydown', this.onKeyDown)
    this.renderer.dispose()
  }
}
