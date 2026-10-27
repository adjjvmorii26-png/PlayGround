import * as THREE from '../vendor/three/three.module.min.js'

const SRGB = THREE.SRGBColorSpace

function canvas2d(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: canvas.getContext('2d') }
}

function seeded(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function toTexture(canvas, { repeat, anisotropy = 8 } = {}) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = SRGB
  texture.anisotropy = anisotropy
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(repeat[0], repeat[1])
  }
  texture.needsUpdate = true
  return texture
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function metalTexture() {
  const { canvas, ctx } = canvas2d(512, 512)
  const random = seeded(7)
  ctx.fillStyle = '#18222c'
  ctx.fillRect(0, 0, 512, 512)

  const gradient = ctx.createLinearGradient(0, 0, 512, 512)
  gradient.addColorStop(0, 'rgba(120, 190, 220, 0.06)')
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.22)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)

  for (let i = 0; i < 2200; i += 1) {
    const y = random() * 512
    const x = random() * 512
    const length = 12 + random() * 150
    ctx.strokeStyle = `rgba(${random() > 0.6 ? '170,225,245' : '0,0,0'},${0.008 + random() * 0.03})`
    ctx.lineWidth = random() > 0.85 ? 1.4 : 0.65
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + length, y + (random() - 0.5) * 0.9)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 6
  roundedRect(ctx, 8, 8, 496, 496, 5)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(150,215,235,0.11)'
  ctx.lineWidth = 2
  roundedRect(ctx, 13, 13, 486, 486, 4)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(0,0,0,0.38)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 256)
  ctx.lineTo(512, 256)
  ctx.stroke()

  for (const [x, y] of [[28, 28], [484, 28], [28, 484], [484, 484]]) {
    const screw = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 8)
    screw.addColorStop(0, 'rgba(210,240,250,0.5)')
    screw.addColorStop(0.5, 'rgba(50,70,82,0.9)')
    screw.addColorStop(1, 'rgba(0,0,0,0.7)')
    ctx.fillStyle = screw
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x - 3, y - 1)
    ctx.lineTo(x + 3, y + 1)
    ctx.stroke()
  }
  return toTexture(canvas, { repeat: [2, 2] })
}

function floorTexture() {
  const { canvas, ctx } = canvas2d(512, 512)
  const random = seeded(21)
  ctx.fillStyle = '#0a1016'
  ctx.fillRect(0, 0, 512, 512)
  for (let ty = 0; ty < 4; ty += 1) {
    for (let tx = 0; tx < 4; tx += 1) {
      const shade = 8 + random() * 8
      const gradient = ctx.createLinearGradient(tx * 128, ty * 128, tx * 128 + 128, ty * 128 + 128)
      gradient.addColorStop(0, `rgb(${shade + 6},${shade + 12},${shade + 18})`)
      gradient.addColorStop(1, `rgb(${shade - 2},${shade + 3},${shade + 8})`)
      ctx.fillStyle = gradient
      ctx.fillRect(tx * 128 + 2, ty * 128 + 2, 124, 124)
      ctx.strokeStyle = 'rgba(96,170,200,0.09)'
      ctx.lineWidth = 1
      ctx.strokeRect(tx * 128 + 3, ty * 128 + 3, 122, 122)
    }
  }
  for (let i = 0; i < 420; i += 1) {
    const x = random() * 512
    const y = random() * 512
    const length = 4 + random() * 40
    ctx.strokeStyle = `rgba(${random() > 0.5 ? '170,220,240' : '0,0,0'},${0.01 + random() * 0.04})`
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + length, y + (random() - 0.5) * 4)
    ctx.stroke()
  }
  return toTexture(canvas, { repeat: [5, 5] })
}

function hazardTexture() {
  const { canvas, ctx } = canvas2d(256, 256)
  const random = seeded(33)
  ctx.fillStyle = '#d49a2e'
  ctx.fillRect(0, 0, 256, 256)
  ctx.save()
  ctx.rotate(-Math.PI / 4)
  ctx.fillStyle = '#0c0f13'
  for (let i = -320; i < 460; i += 64) ctx.fillRect(i, -100, 30, 520)
  ctx.restore()
  for (let i = 0; i < 700; i += 1) {
    ctx.fillStyle = `rgba(0,0,0,${random() * 0.16})`
    ctx.fillRect(random() * 256, random() * 256, 1 + random() * 5, 1 + random() * 3)
  }
  const shade = ctx.createLinearGradient(0, 0, 0, 256)
  shade.addColorStop(0, 'rgba(255,255,255,0.08)')
  shade.addColorStop(0.5, 'rgba(0,0,0,0.06)')
  shade.addColorStop(1, 'rgba(0,0,0,0.34)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, 256, 256)
  return toTexture(canvas)
}

function nebulaTexture() {
  const { canvas, ctx } = canvas2d(1024, 512)
  const random = seeded(54)
  const base = ctx.createLinearGradient(0, 0, 0, 512)
  base.addColorStop(0, '#040914')
  base.addColorStop(0.52, '#071426')
  base.addColorStop(1, '#02040a')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 1024, 512)

  ctx.globalCompositeOperation = 'lighter'
  const clouds = [
    [210, 170, 300, 'rgba(70,40,150,0.34)'],
    [420, 280, 250, 'rgba(13,118,168,0.32)'],
    [690, 150, 280, 'rgba(126,35,120,0.22)'],
    [820, 340, 220, 'rgba(18,90,140,0.26)'],
    [540, 100, 240, 'rgba(19,70,130,0.18)']
  ]
  for (const [x, y, radius, color] of clouds) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
    glow.addColorStop(0, color)
    glow.addColorStop(0.45, color.replace(/[\d.]+\)$/, '0.09)'))
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 1024, 512)
  }
  ctx.globalCompositeOperation = 'source-over'

  for (let i = 0; i < 900; i += 1) {
    const x = random() * 1024
    const y = random() * 512
    const radius = random() > 0.96 ? 1.8 : random() * 1.1
    const alpha = 0.2 + random() * 0.8
    ctx.fillStyle = `rgba(${random() > 0.8 ? '255,235,210' : '190,230,255'},${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const planetX = 770
  const planetY = 322
  const planetRadius = 118
  const planet = ctx.createRadialGradient(planetX - 42, planetY - 48, 8, planetX, planetY, planetRadius)
  planet.addColorStop(0, '#1d5a80')
  planet.addColorStop(0.35, '#0d3457')
  planet.addColorStop(0.76, '#061729')
  planet.addColorStop(1, '#02060c')
  ctx.fillStyle = planet
  ctx.beginPath()
  ctx.arc(planetX, planetY, planetRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(92,227,255,0.8)'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.arc(planetX, planetY, planetRadius - 1, Math.PI * 0.62, Math.PI * 1.42)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(80,190,235,0.18)'
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath()
    ctx.ellipse(planetX, planetY, planetRadius + 20 + i * 10, 24 + i * 7, -0.28, 0, Math.PI * 2)
    ctx.stroke()
  }
  return toTexture(canvas)
}

function plaqueTexture() {
  const { canvas, ctx } = canvas2d(512, 384)
  ctx.fillStyle = '#08111a'
  ctx.fillRect(0, 0, 512, 384)
  const edge = ctx.createLinearGradient(0, 0, 512, 384)
  edge.addColorStop(0, 'rgba(96,232,255,0.34)')
  edge.addColorStop(1, 'rgba(96,232,255,0.06)')
  ctx.strokeStyle = edge
  ctx.lineWidth = 3
  roundedRect(ctx, 12, 12, 488, 360, 8)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(96,232,255,0.12)'
  ctx.lineWidth = 1
  roundedRect(ctx, 22, 22, 468, 340, 6)
  ctx.stroke()

  ctx.fillStyle = '#63e6ff'
  ctx.font = '600 19px "JetBrains Mono", monospace'
  ctx.letterSpacing = '4px'
  ctx.fillText('CREW NOTICE // NAV-7', 38, 58)

  ctx.fillStyle = 'rgba(130,210,235,0.5)'
  ctx.fillRect(38, 74, 436, 1)

  ctx.fillStyle = '#e8f8ff'
  ctx.font = '700 34px Rajdhani, sans-serif'
  ctx.fillText('CONSTELLATION PROTOCOL', 38, 122)

  ctx.font = '400 25px Rajdhani, sans-serif'
  ctx.fillStyle = '#9fc7d9'
  ctx.fillText('From the RED GIANT,', 38, 176)
  ctx.fillText('follow the TWINS,', 38, 210)
  ctx.fillText('then the EYE.', 38, 244)

  ctx.fillStyle = 'rgba(130,210,235,0.22)'
  ctx.fillRect(38, 270, 230, 1)
  ctx.font = '400 16px "JetBrains Mono", monospace'
  ctx.fillStyle = 'rgba(130,210,235,0.58)'
  ctx.fillText('ORDER MATTERS. LAUNCH CODE FOLLOWS.', 38, 300)
  ctx.fillText('AUX POWER REQUIRED FOR PROJECTOR.', 38, 324)

  const points = [[364, 196], [418, 232], [448, 286], [386, 300]]
  ctx.strokeStyle = 'rgba(95,233,255,0.24)'
  ctx.lineWidth = 1
  ctx.beginPath()
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
  const colors = ['#ff8264', '#9fe8ff', '#9fe8ff', '#ffe27a']
  points.forEach(([x, y], index) => {
    ctx.fillStyle = colors[index]
    ctx.beginPath()
    ctx.arc(x, y, index === 0 ? 7 : 5, 0, Math.PI * 2)
    ctx.fill()
  })
  return toTexture(canvas)
}

function decalTexture() {
  const { canvas, ctx } = canvas2d(512, 512)
  ctx.clearRect(0, 0, 512, 512)
  ctx.translate(256, 256)
  ctx.strokeStyle = 'rgba(93,233,255,0.28)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, 218, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([10, 16])
  ctx.strokeStyle = 'rgba(93,233,255,0.18)'
  ctx.beginPath()
  ctx.arc(0, 0, 186, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(93,233,255,0.62)'
  ctx.font = '600 68px Rajdhani, sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '12px'
  ctx.fillText('ECHO-7', 0, 18)
  ctx.font = '400 18px "JetBrains Mono", monospace'
  ctx.fillStyle = 'rgba(93,233,255,0.4)'
  ctx.letterSpacing = '5px'
  ctx.fillText('CRYO BAY // DECK 04', 0, 54)
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2
    const inner = i % 3 === 0 ? 198 : 205
    ctx.strokeStyle = 'rgba(93,233,255,0.5)'
    ctx.lineWidth = i % 3 === 0 ? 3 : 1.4
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
    ctx.lineTo(Math.cos(angle) * 224, Math.sin(angle) * 224)
    ctx.stroke()
  }
  return toTexture(canvas)
}

function corridorTexture() {
  const { canvas, ctx } = canvas2d(512, 512)
  const bg = ctx.createLinearGradient(0, 0, 0, 512)
  bg.addColorStop(0, '#050b10')
  bg.addColorStop(0.55, '#071820')
  bg.addColorStop(1, '#0a2c36')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 512, 512)

  const vx = 256
  const vy = 340
  const glow = ctx.createRadialGradient(vx, vy, 4, vx, vy, 250)
  glow.addColorStop(0, 'rgba(150,245,255,0.95)')
  glow.addColorStop(0.18, 'rgba(60,200,230,0.55)')
  glow.addColorStop(0.55, 'rgba(20,90,120,0.22)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 512, 512)

  ctx.strokeStyle = 'rgba(120,225,250,0.4)'
  ctx.lineWidth = 2
  for (const [x1, y1, x2, y2] of [
    [0, 18, vx, vy], [512, 18, vx, vy],
    [0, 500, vx, vy], [512, 500, vx, vy],
    [74, 0, vx, vy], [438, 0, vx, vy]
  ]) {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  for (let i = 1; i <= 5; i += 1) {
    const t = i / 6
    const w = 500 * (1 - t) + 30
    const h = 500 * (1 - t) + 30
    ctx.strokeStyle = `rgba(110,220,245,${0.32 - t * 0.05})`
    ctx.lineWidth = 3 - t * 2
    ctx.strokeRect(vx - w / 2, vy - h / 2, w, h)
  }

  const floor = ctx.createLinearGradient(0, vy, 0, 512)
  floor.addColorStop(0, 'rgba(90,230,250,0.4)')
  floor.addColorStop(1, 'rgba(5,20,26,0)')
  ctx.fillStyle = floor
  ctx.beginPath()
  ctx.moveTo(vx - 16, vy)
  ctx.lineTo(vx + 16, vy)
  ctx.lineTo(470, 512)
  ctx.lineTo(42, 512)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'rgba(190,250,255,0.85)'
  ctx.font = '600 15px "JetBrains Mono", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('OUTER HATCH // CLEAR', vx, 84)
  ctx.fillStyle = 'rgba(150,240,255,0.55)'
  ctx.font = '400 11px "JetBrains Mono", monospace'
  ctx.fillText('KEPLER TRANSFER TUBE', vx, 104)

  return toTexture(canvas)
}

function glowTexture() {
  const { canvas, ctx } = canvas2d(128, 128)
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.16, 'rgba(255,255,255,0.62)')
  gradient.addColorStop(0.42, 'rgba(255,255,255,0.16)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  return toTexture(canvas)
}

function keypadTexture() {
  const { canvas, ctx } = canvas2d(256, 320)
  ctx.fillStyle = '#0a1219'
  ctx.fillRect(0, 0, 256, 320)
  ctx.strokeStyle = 'rgba(95,233,255,0.4)'
  ctx.lineWidth = 2
  roundedRect(ctx, 8, 8, 240, 304, 10)
  ctx.stroke()
  ctx.fillStyle = 'rgba(95,233,255,0.5)'
  ctx.font = '500 13px "JetBrains Mono", monospace'
  ctx.letterSpacing = '2px'
  ctx.fillText('AIRLOCK // 01', 22, 34)
  ctx.fillStyle = 'rgba(95,233,255,0.12)'
  ctx.fillRect(22, 44, 212, 38)
  ctx.fillStyle = '#63e6ff'
  ctx.font = '500 20px "JetBrains Mono", monospace'
  ctx.fillText('ACCESS', 36, 69)
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = 24 + col * 72
      const y = 102 + row * 42
      ctx.fillStyle = 'rgba(26,45,58,0.95)'
      roundedRect(ctx, x, y, 58, 32, 4)
      ctx.fill()
      ctx.strokeStyle = 'rgba(95,233,255,0.22)'
      ctx.lineWidth = 1
      roundedRect(ctx, x, y, 58, 32, 4)
      ctx.stroke()
      ctx.fillStyle = 'rgba(185,234,248,0.7)'
      ctx.font = '500 14px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
      ctx.fillText(labels[row * 3 + col], x + 29, y + 21)
      ctx.textAlign = 'left'
    }
  }
  ctx.fillStyle = 'rgba(95,233,255,0.14)'
  ctx.fillRect(22, 278, 212, 20)
  ctx.fillStyle = 'rgba(95,233,255,0.55)'
  ctx.font = '400 11px "JetBrains Mono", monospace'
  ctx.fillText('LAUNCH AUTHORIZATION', 46, 292)
  return toTexture(canvas)
}

function labelTexture(text, { width = 512, height = 128, color = '#63e6ff', size = 34 } = {}) {
  const { canvas, ctx } = canvas2d(width, height)
  ctx.fillStyle = 'rgba(7,13,19,0.92)'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(95,233,255,0.24)'
  ctx.lineWidth = 2
  ctx.strokeRect(4, 4, width - 8, height - 8)
  ctx.fillStyle = color
  ctx.font = `600 ${size}px Rajdhani, sans-serif`
  ctx.textAlign = 'center'
  ctx.letterSpacing = '4px'
  ctx.fillText(text, width / 2, height / 2 + size * 0.35)
  return toTexture(canvas)
}

function envTexture() {
  const { canvas, ctx } = canvas2d(1024, 512)
  const gradient = ctx.createLinearGradient(0, 0, 0, 512)
  gradient.addColorStop(0, '#0a1b29')
  gradient.addColorStop(0.42, '#123149')
  gradient.addColorStop(0.72, '#081420')
  gradient.addColorStop(1, '#020409')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 512)
  const blobs = [
    [190, 150, 220, 'rgba(95,233,255,0.42)'],
    [760, 130, 200, 'rgba(255,170,90,0.22)'],
    [520, 330, 260, 'rgba(30,120,180,0.3)'],
    [950, 380, 160, 'rgba(130,80,220,0.2)']
  ]
  for (const [x, y, radius, color] of blobs) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
    glow.addColorStop(0, color)
    glow.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'))
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 1024, 512)
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 7; i += 1) {
    ctx.fillRect(120 + i * 92, 146, 44, 3)
  }
  const texture = toTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  return texture
}

export function makeDynamicScreen(width, height, draw) {
  const { canvas, ctx } = canvas2d(width, height)
  const texture = toTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const refresh = (state) => {
    draw(ctx, width, height, state)
    texture.needsUpdate = true
  }
  return { canvas, ctx, texture, refresh }
}

export function drawStatusScreen(ctx, width, height, state) {
  ctx.fillStyle = '#031018'
  ctx.fillRect(0, 0, width, height)
  const scan = ctx.createLinearGradient(0, 0, 0, height)
  scan.addColorStop(0, 'rgba(25,80,100,0.24)')
  scan.addColorStop(1, 'rgba(2,10,16,0)')
  ctx.fillStyle = scan
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = state.powered ? 'rgba(95,233,255,0.55)' : 'rgba(255,110,90,0.5)'
  ctx.lineWidth = 2
  roundedRect(ctx, 8, 8, width - 16, height - 16, 5)
  ctx.stroke()

  ctx.fillStyle = state.powered ? '#8ff0ff' : '#ff7d6c'
  ctx.font = '500 17px "JetBrains Mono", monospace'
  ctx.fillText(state.powered ? 'ECHO-7 // LAUNCH CONTROL' : 'ECHO-7 // NO SIGNAL', 24, 38)

  ctx.fillStyle = 'rgba(120,200,225,0.2)'
  ctx.fillRect(24, 50, width - 48, 1)

  ctx.font = '400 15px "JetBrains Mono", monospace'
  const lines = state.powered
    ? [
        `POWER ......... ${state.powerLevel ?? 100}%`,
        `O2 ............ NOMINAL`,
        `AIRLOCK ....... ${state.unlocked ? 'OPEN' : 'SEALED'}`,
        `LAUNCH CODE ... ${state.codeKnown ? 'DECRYPTED' : 'LOCKED'}`,
        `CO-PILOT ...... ONLINE`
      ]
    : [
        'POWER ......... 00%',
        'O2 ............ 18%',
        'AIRLOCK ....... SEALED',
        'LAUNCH CODE ... LOCKED',
        'CO-PILOT ...... AUX POWER'
      ]
  lines.forEach((line, index) => {
    ctx.fillStyle = state.powered ? 'rgba(170,232,248,0.82)' : 'rgba(255,126,108,0.55)'
    ctx.fillText(line, 24, 82 + index * 27)
  })

  const blink = Math.floor(Date.now() / 480) % 2
  ctx.fillStyle = state.powered ? (blink ? '#5dffb0' : 'rgba(93,255,176,0.25)') : '#ff6c5c'
  ctx.beginPath()
  ctx.arc(width - 30, 33, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(95,233,255,0.12)'
  for (let y = 8; y < height; y += 4) ctx.fillRect(8, y, width - 16, 1)
}

export function drawMapScreen(ctx, width, height, state) {
  ctx.fillStyle = '#040d15'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(95,233,255,0.35)'
  ctx.lineWidth = 2
  roundedRect(ctx, 8, 8, width - 16, height - 16, 5)
  ctx.stroke()

  ctx.fillStyle = '#7fe9ff'
  ctx.font = '500 15px "JetBrains Mono", monospace'
  ctx.fillText('CONSTELLATION SCAN', 24, 36)
  ctx.fillStyle = 'rgba(120,200,225,0.16)'
  ctx.fillRect(24, 48, width - 48, 1)

  const random = seeded(88)
  for (let i = 0; i < 34; i += 1) {
    const x = 30 + random() * (width - 60)
    const y = 60 + random() * (height - 92)
    ctx.fillStyle = `rgba(150,225,250,${0.15 + random() * 0.6})`
    ctx.beginPath()
    ctx.arc(x, y, random() * 1.4 + 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  const color = state.solved ? '#5dffb0' : state.powered ? '#ffcf6a' : '#ff6c5c'
  ctx.strokeStyle = color
  ctx.lineWidth = 1.4
  const nodes = [[84, 92], [132, 126], [148, 158], [210, 170]]
  ctx.beginPath()
  nodes.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
  nodes.forEach(([x, y], index) => {
    ctx.fillStyle = index === 0 ? '#ff8264' : index === 3 ? '#ffe27a' : '#9fe8ff'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.fillStyle = state.solved ? '#5dffb0' : 'rgba(170,232,248,0.62)'
  ctx.font = '400 13px "JetBrains Mono", monospace'
  ctx.fillText(state.solved ? 'SEQUENCE VERIFIED // 7394' : 'SEQUENCE UNVERIFIED', 24, height - 20)
}

export function buildTextures() {
  return {
    metal: metalTexture(),
    floor: floorTexture(),
    hazard: hazardTexture(),
    nebula: nebulaTexture(),
    plaque: plaqueTexture(),
    decal: decalTexture(),
    corridor: corridorTexture(),
    glow: glowTexture(),
    keypad: keypadTexture(),
    env: envTexture(),
    label: labelTexture
  }
}
