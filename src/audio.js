// Todo el sonido se sintetiza con la Web Audio API: no hace falta ningún archivo de audio.
// Los navegadores solo dejan sonar audio después de un clic, por eso start() se llama desde un botón.

import { Music } from './music.js';

const rand = (min, max) => min + Math.random() * (max - min);

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.listeners = new Set();

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (this.enabled) this.ctx.resume();
    });
  }

  onChange(fn) {
    this.listeners.add(fn);
  }

  setEnabled(value) {
    this.enabled = value;
    this.listeners.forEach((fn) => fn(value));
  }

  start() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;

      // Compresor al final para que ningún efecto sature
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.ratio.value = 4;
      compressor.connect(ctx.destination);

      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(compressor);

      // Ruido blanco reutilizable para siseos, golpes y barridos
      const length = ctx.sampleRate * 2;
      this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

      this.music = new Music(ctx, this.master, this.noise);
    }

    this.ctx.resume();
    this.music.start();
    this.master.gain.cancelScheduledValues(this.now);
    this.master.gain.setTargetAtTime(0.9, this.now, 0.1);
    this.setEnabled(true);
  }

  stop() {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(0.0001, this.now, 0.1);
    this.music.stop();
    this.setEnabled(false);
  }

  toggle() {
    if (this.enabled) this.stop();
    else this.start();
  }

  get now() {
    return this.ctx.currentTime;
  }

  get ready() {
    return this.enabled && this.ctx && this.ctx.state === 'running';
  }

  // ---------- Piezas básicas ----------

  envelope(t, attack, peak, decay) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    gain.connect(this.master);
    return gain;
  }

  tone(type, from, to, t, attack, peak, decay) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
    osc.connect(this.envelope(t, attack, peak, decay));
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  hiss(t, filterType, from, to, attack, peak, decay, q = 0.8) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
    src.connect(filter).connect(this.envelope(t, attack, peak, decay));
    src.start(t, Math.random());
    src.stop(t + attack + decay + 0.05);
  }

  // Burbujitas: muchos "blips" agudos y cortos repartidos en el tiempo
  fizz(t, duration, count, level = 1) {
    for (let i = 0; i < count; i++) {
      const at = t + Math.pow(Math.random(), 1.6) * duration;
      const f = rand(1800, 5200);
      this.tone('sine', f, f * 1.35, at, 0.002, rand(0.012, 0.045) * level, rand(0.02, 0.05));
    }
  }

  // ---------- Efectos ----------

  // Abrir la lata: clic metálico + pop + "psssht" + burbujas
  canOpen() {
    if (!this.ready) return;
    const t = this.now + 0.03;
    this.hiss(t, 'highpass', 3000, 3000, 0.002, 0.9, 0.04);
    this.tone('triangle', 1900, 950, t, 0.001, 0.22, 0.06);
    this.tone('sine', 230, 70, t + 0.012, 0.003, 0.7, 0.12);
    this.hiss(t + 0.02, 'bandpass', 7500, 2400, 0.015, 0.55, 1.25, 0.7);
    this.fizz(t + 0.15, 2, 80);
  }

  // Cuenta atrás 3 · 2 · 1
  tick(step) {
    if (!this.ready) return;
    const f = [620, 700, 840][step] || 840;
    const t = this.now;
    this.tone('sine', f, f, t, 0.004, 0.28, 0.2);
    this.tone('square', f * 2, f * 2, t, 0.002, 0.025, 0.06);
  }

  // La explosión: golpe grave, salpicadura y efervescencia
  burst() {
    if (!this.ready) return;
    const t = this.now;
    this.tone('sine', 150, 36, t, 0.004, 1, 1.1);
    this.hiss(t, 'lowpass', 1600, 180, 0.004, 0.8, 0.9);
    this.hiss(t + 0.02, 'bandpass', 2200, 900, 0.01, 0.4, 0.5, 1.2);
    this.fizz(t + 0.08, 1.8, 110, 1.2);
    this.music.drop();
  }

  // Build-up de la música antes de la explosión (0 → 1)
  setTension(t) {
    if (this.ready) this.music.setTension(t);
  }

  // Cambio de sabor: barrido de aire + pop
  swap() {
    if (!this.ready) return;
    const t = this.now;
    this.hiss(t, 'bandpass', 400, 2600, 0.12, 0.22, 0.28, 1.4);
    this.tone('sine', 540, 260, t + 0.3, 0.003, 0.3, 0.12);
    this.fizz(t + 0.32, 0.6, 18, 0.7);
  }
}
