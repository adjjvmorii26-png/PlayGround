import { PALETTES } from "./palettes.js";
import { clamp, rand } from "./utils.js";

export class Soundscape {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.nextAmbient = 0;
    this.lastSing = 0;
  }

  async start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.62;
    master.connect(ctx.destination);
    this.master = master;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.4;
    comp.connect(master);
    this.bus = comp;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.makeImpulse(3.8, 2.6);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.42;
    reverb.connect(reverbGain);
    reverbGain.connect(comp);
    this.reverb = reverb;

    const padGain = ctx.createGain();
    padGain.gain.value = 0.13;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 940;
    padFilter.Q.value = 0.8;
    padGain.connect(padFilter);
    padFilter.connect(comp);
    padFilter.connect(reverb);
    this.padGain = padGain;

    this.oscs = [];
    const types = ["sine", "triangle", "sine", "triangle", "sine"];
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      osc.type = types[i];
      osc.frequency.value = 110 + i * 30;
      const gain = ctx.createGain();
      gain.gain.value = i === 0 ? 0.055 : 0.032;
      osc.connect(gain);
      gain.connect(padGain);
      osc.start();
      this.oscs.push({ osc, gain });
    }

    const noise = this.makeNoiseBuffer(2.4);
    this.noiseBuffer = noise;

    const engineSource = ctx.createBufferSource();
    engineSource.buffer = noise;
    engineSource.loop = true;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = "bandpass";
    engineFilter.frequency.value = 160;
    engineFilter.Q.value = 0.9;
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineSource.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(comp);
    engineSource.start();
    this.engineFilter = engineFilter;
    this.engineGain = engineGain;

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 52;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.045;
    sub.connect(subGain);
    subGain.connect(comp);
    sub.start();
    this.sub = sub;

    const windSource = ctx.createBufferSource();
    windSource.buffer = noise;
    windSource.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "highpass";
    windFilter.frequency.value = 520;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(comp);
    windSource.start();
    this.windFilter = windFilter;
    this.windGain = windGain;

    this.nextAmbient = ctx.currentTime + 8;
    this.ready = true;
    this.setChord(0, true);
  }

  makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (0.7 + Math.random() * 0.3);
      }
    }
    return buffer;
  }

  makeNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.018 * white) / 1.018;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  setChord(index, instant = false) {
    if (!this.ready) return;
    const palette = PALETTES[clamp(index, 0, PALETTES.length - 1)];
    const now = this.ctx.currentTime;
    this.oscs.forEach((item, i) => {
      const freq = palette.notes[i % palette.notes.length] * (i === 4 ? 2 : 1);
      const param = item.osc.frequency;
      param.cancelScheduledValues(now);
      if (instant) {
        param.setValueAtTime(freq, now);
      } else {
        param.setValueAtTime(param.value, now);
        param.exponentialRampToValueAtTime(freq, now + 3.2);
      }
      item.gain.gain.cancelScheduledValues(now);
      item.gain.gain.setTargetAtTime(i === 0 ? 0.055 : 0.032, now, 0.6);
    });
    if (this.sub) {
      this.sub.frequency.cancelScheduledValues(now);
      this.sub.frequency.setTargetAtTime(palette.notes[0] / 2, now, 0.8);
    }
  }

  update(speed, boost, dt) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const ratio = clamp(Math.abs(speed) / 820, 0, 1);
    this.engineGain.gain.setTargetAtTime(0.012 + ratio * 0.1, now, 0.16);
    this.engineFilter.frequency.setTargetAtTime(130 + ratio * 980, now, 0.2);
    this.windGain.gain.setTargetAtTime(boost ? 0.11 : 0, now, 0.3);
    this.windFilter.frequency.setTargetAtTime(boost ? 900 : 480, now, 0.3);
    this.sub.frequency.setTargetAtTime(48 + ratio * 22, now, 0.4);

    if (now > this.nextAmbient) {
      this.nextAmbient = now + rand(11, 23);
      const palette = PALETTES[clamp(this.lastPalette || 0, 0, PALETTES.length - 1)];
      const note = palette.notes[Math.floor(Math.random() * palette.notes.length)] * (Math.random() > 0.6 ? 2 : 1);
      this.tone(note, now + 0.1, 7.5, 0.018, "sine");
    }
  }

  tone(freq, when, duration, volume, type = "sine", destination = null) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(destination || this.bus);
    if (!destination) gain.connect(this.reverb);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  chime(paletteIndex) {
    if (!this.ready) return;
    this.lastPalette = paletteIndex;
    const palette = PALETTES[clamp(paletteIndex, 0, PALETTES.length - 1)];
    const now = this.ctx.currentTime;
    palette.notes.forEach((freq, i) => {
      this.tone(freq * (i === 4 ? 2 : 1), now + 0.03 + i * 0.105, 2.8 + i * 0.35, 0.075, i % 2 ? "sine" : "triangle");
    });
    this.tone(palette.notes[2] * 4, now + 0.62, 4.5, 0.028, "sine");
    this.tone(palette.notes[0] / 2, now, 3.6, 0.05, "sine");
  }

  collect() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const base = 880 + Math.random() * 320;
    this.tone(base, now, 0.35, 0.03, "sine");
    this.tone(base * 1.5, now + 0.05, 0.5, 0.022, "triangle");
  }

  pulse() {
    if (!this.ready) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.3);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    osc.connect(gain);
    gain.connect(this.bus);
    gain.connect(this.reverb);
    osc.start(now);
    osc.stop(now + 1.6);

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(1800, now + 0.7);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.04, now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    src.connect(filter);
    filter.connect(ng);
    ng.connect(this.bus);
    src.start(now);
    src.stop(now + 1.2);
  }

  sing() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (now - this.lastSing < 3.5) return;
    this.lastSing = now;
    const palette = PALETTES[clamp(this.lastPalette || 0, 0, PALETTES.length - 1)];
    const note = palette.notes[Math.floor(Math.random() * palette.notes.length)] * 2;
    this.tone(note, now + 0.02, 2.2, 0.02, "sine");
    this.tone(note * 1.5, now + 0.16, 1.8, 0.012, "sine");
  }

  toggle() {
    this.muted = !this.muted;
    if (this.ready) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.62, this.ctx.currentTime, 0.15);
    }
    return this.muted;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ready) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.62, this.ctx.currentTime, 0.15);
    }
  }
}
