export class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.muted = false
    this.started = false
    this.ambientNodes = []
  }

  init() {
    if (this.started) return
    const Context = window.AudioContext || window.webkitAudioContext
    if (!Context) return
    this.ctx = new Context()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.62
    this.master.connect(this.ctx.destination)
    this.started = true
    this.startAmbience()
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume()
  }

  setMuted(muted) {
    this.muted = muted
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime)
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.62, this.ctx.currentTime + 0.15)
    }
  }

  noiseBuffer(seconds = 2) {
    const length = Math.floor(this.ctx.sampleRate * seconds)
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1
      last = last * 0.96 + white * 0.04
      data[i] = last * 2.4
    }
    return buffer
  }

  startAmbience() {
    if (!this.ctx) return
    const ambient = this.ctx.createGain()
    ambient.gain.value = 0.05
    ambient.connect(this.master)

    const low = this.ctx.createOscillator()
    low.type = 'sine'
    low.frequency.value = 48
    const lowGain = this.ctx.createGain()
    lowGain.gain.value = 0.3
    low.connect(lowGain).connect(ambient)
    low.start()

    const high = this.ctx.createOscillator()
    high.type = 'triangle'
    high.frequency.value = 96.5
    const highGain = this.ctx.createGain()
    highGain.gain.value = 0.06
    high.connect(highGain).connect(ambient)
    high.start()

    const noise = this.ctx.createBufferSource()
    noise.buffer = this.noiseBuffer(3)
    noise.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 540
    const noiseGain = this.ctx.createGain()
    noiseGain.gain.value = 0.16
    noise.connect(filter).connect(noiseGain).connect(ambient)
    noise.start()

    const hum = this.ctx.createOscillator()
    hum.type = 'sawtooth'
    hum.frequency.value = 120
    const humFilter = this.ctx.createBiquadFilter()
    humFilter.type = 'lowpass'
    humFilter.frequency.value = 180
    const humGain = this.ctx.createGain()
    humGain.gain.value = 0.02
    hum.connect(humFilter).connect(humGain).connect(this.master)
    hum.start()

    this.ambientNodes.push(low, high, noise, hum, ambient)
  }

  tone({ frequency = 440, duration = 0.16, type = 'sine', volume = 0.12, endFrequency, delay = 0 }) {
    if (!this.ctx || this.muted) return
    const now = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, now)
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    osc.connect(gain).connect(this.master)
    osc.start(now)
    osc.stop(now + duration + 0.03)
  }

  noise({ duration = 0.3, volume = 0.1, frequency = 700, type = 'lowpass', delay = 0 }) {
    if (!this.ctx || this.muted) return
    const now = this.ctx.currentTime + delay
    const source = this.ctx.createBufferSource()
    source.buffer = this.noiseBuffer(duration + 0.1)
    const filter = this.ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(filter).connect(gain).connect(this.master)
    source.start(now)
    source.stop(now + duration + 0.15)
  }

  click() {
    this.tone({ frequency: 620, endFrequency: 760, duration: 0.055, type: 'square', volume: 0.035 })
  }

  hover() {
    this.tone({ frequency: 980, duration: 0.03, type: 'sine', volume: 0.014 })
  }

  pickup() {
    this.tone({ frequency: 660, duration: 0.12, type: 'triangle', volume: 0.1 })
    this.tone({ frequency: 990, duration: 0.18, type: 'triangle', volume: 0.08, delay: 0.08 })
  }

  success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      this.tone({ frequency, duration: 0.28, type: 'triangle', volume: 0.09, delay: index * 0.09 })
    })
  }

  error() {
    this.tone({ frequency: 150, endFrequency: 92, duration: 0.3, type: 'sawtooth', volume: 0.09 })
    this.noise({ duration: 0.18, volume: 0.05, frequency: 420 })
  }

  powerUp() {
    this.tone({ frequency: 65, endFrequency: 460, duration: 1.4, type: 'sawtooth', volume: 0.06 })
    this.tone({ frequency: 120, endFrequency: 980, duration: 1.1, type: 'sine', volume: 0.05, delay: 0.3 })
    this.noise({ duration: 0.8, volume: 0.09, frequency: 1400, type: 'bandpass', delay: 0.2 })
  }

  door() {
    this.noise({ duration: 1.5, volume: 0.14, frequency: 260, type: 'lowpass' })
    this.tone({ frequency: 40, endFrequency: 28, duration: 1.6, type: 'sine', volume: 0.12 })
    this.tone({ frequency: 440, duration: 0.2, type: 'triangle', volume: 0.06, delay: 1.1 })
    this.tone({ frequency: 660, duration: 0.3, type: 'triangle', volume: 0.06, delay: 1.28 })
  }

  scan() {
    this.tone({ frequency: 320, endFrequency: 1500, duration: 0.42, type: 'sine', volume: 0.05 })
    this.tone({ frequency: 1600, endFrequency: 300, duration: 0.55, type: 'sine', volume: 0.03, delay: 0.15 })
  }

  speak() {
    this.tone({ frequency: 540, endFrequency: 720, duration: 0.08, type: 'sine', volume: 0.025 })
    this.tone({ frequency: 880, duration: 0.06, type: 'sine', volume: 0.018, delay: 0.07 })
  }

  type() {
    this.tone({ frequency: 300 + Math.random() * 160, duration: 0.018, type: 'square', volume: 0.008 })
  }
}
