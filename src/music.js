// Tema musical de Vértigo, sintetizado en tiempo real con la Web Audio API (no hay archivos de audio).
// Estilo house / electro-pop a 120 BPM:
//   batería (bombo a negras, palmas, charles), bajo a contratiempo, acordes con "bombeo" (sidechain)
//   y un gancho melódico sobre Lam – Fa – Do – Sol, la progresión más pegadiza del pop.
// Además reacciona al scroll: setTension() apaga la música antes de la explosión (build-up) y drop() la hace estallar.

const BPM = 120;
// Volumen de la música (los efectos de sonido van aparte, un poco por encima)
const MUSIC_VOLUME = 0.22;
const STEP = 60 / BPM / 4; // semicorchea
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Acordes (Lam, Fa, Do, Sol) y raíz del bajo de cada compás
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [55, 60, 64],
  [55, 59, 62],
];
const BASS = [45, 41, 48, 43];

// Melodía: por compás, [paso, nota, duración en pasos]
const HOOK_A = [
  [[0, 76, 2], [2, 76, 2], [4, 74, 2], [6, 72, 3], [10, 69, 2], [12, 72, 2], [14, 74, 2]],
  [[0, 76, 4], [4, 72, 2], [6, 69, 5], [12, 67, 2], [14, 69, 2]],
  [[0, 76, 2], [2, 76, 2], [4, 79, 2], [6, 76, 2], [8, 74, 2], [10, 72, 3], [14, 74, 2]],
  [[0, 74, 4], [4, 71, 4], [8, 67, 6]],
];
// Respuesta: los dos últimos compases cambian para cerrar la frase hacia arriba
const HOOK_B = [
  HOOK_A[0],
  HOOK_A[1],
  [[0, 79, 2], [2, 76, 2], [4, 79, 2], [6, 81, 2], [8, 79, 2], [10, 76, 2], [12, 74, 2], [14, 72, 2]],
  [[0, 74, 3], [4, 74, 2], [6, 76, 2], [8, 74, 3], [12, 71, 4]],
];

const STABS = [3, 6, 10, 13];
const BASS_STEPS = [
  [2, 0, 2],
  [6, 0, 2],
  [10, 0, 1],
  [11, 12, 1],
  [14, 0, 2],
];
const HATS = [0.025, 0.014, 0.07, 0.014];

function impulse(ctx, seconds = 2.2) {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  return buffer;
}

export class Music {
  constructor(ctx, destination, noise) {
    this.ctx = ctx;
    this.noise = noise;

    // Cadena: instrumentos → filtro de intro → filtro de tensión → volumen → salida
    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(destination);

    this.tensionFilter = ctx.createBiquadFilter();
    this.tensionFilter.type = 'lowpass';
    this.tensionFilter.frequency.value = 20000;
    this.tensionFilter.Q.value = 1.2;
    this.tensionFilter.connect(this.out);

    this.introFilter = ctx.createBiquadFilter();
    this.introFilter.type = 'lowpass';
    this.introFilter.frequency.value = 20000;
    this.introFilter.connect(this.tensionFilter);
    this.bus = this.introFilter;

    // Los acordes pasan por un "bombeo" que baja el volumen en cada bombo
    this.pump = ctx.createGain();
    this.pump.connect(this.bus);

    // Eco a 3/16 para la melodía y reverb general
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = STEP * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const delayTone = ctx.createBiquadFilter();
    delayTone.type = 'lowpass';
    delayTone.frequency.value = 3200;
    this.delay.connect(delayTone).connect(feedback).connect(this.delay);
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.28;
    delayTone.connect(delayWet).connect(this.bus);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse(ctx);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0.2;
    this.reverb.connect(reverbWet).connect(this.bus);

    // Subida de ruido para el build-up
    this.riser = ctx.createBufferSource();
    this.riser.buffer = noise;
    this.riser.loop = true;
    this.riserFilter = ctx.createBiquadFilter();
    this.riserFilter.type = 'bandpass';
    this.riserFilter.Q.value = 2;
    this.riserFilter.frequency.value = 400;
    this.riserGain = ctx.createGain();
    this.riserGain.gain.value = 0;
    this.riser.connect(this.riserFilter).connect(this.riserGain).connect(this.out);
    this.riser.start();

    this.step = 0;
    this.playing = false;
    this.tension = 0;
  }

  // ---------- Transporte ----------

  start() {
    if (this.playing) return;
    const t = this.ctx.currentTime;
    this.playing = true;
    this.nextTime = t + 0.12;
    if (this.step === 0) {
      // Intro: el filtro se abre durante los 4 primeros compases
      this.introFilter.frequency.setValueAtTime(500, t);
      this.introFilter.frequency.exponentialRampToValueAtTime(20000, t + STEP * 64);
    }
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(MUSIC_VOLUME, t, 0.6);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.out.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
  }

  schedule() {
    const now = this.ctx.currentTime;
    // Si el reloj de audio se ha adelantado (pestaña en segundo plano, lag...), se retoma desde ahora
    if (this.nextTime < now - 0.25) this.nextTime = now + 0.05;
    // Como mucho un compás por llamada, para no bloquear nunca la página
    for (let i = 0; i < 16 && this.nextTime < now + 0.15; i++) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step++;
    }
  }

  playStep(step, t) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = bar % 4;
    const intro = bar < 4;
    const phraseB = Math.floor(bar / 4) % 2 === 1;

    // Batería
    if (s % 4 === 0) this.kick(t);
    if (!intro && (s === 4 || s === 12)) this.clap(t);
    // Redoble de palmas al final de cada frase de 8 compases
    if (!intro && bar % 8 === 7 && s >= 13) this.clap(t, 0.25 + (s - 13) * 0.1);
    this.hat(t, HATS[s % 4] * (intro ? 0.7 : 1), s === 14 && !intro);

    // Bajo
    for (const [at, octave, len] of BASS_STEPS) {
      if (s === at) this.bass(t, BASS[chord] + octave, len * STEP);
    }

    // Acordes
    if (STABS.includes(s)) this.stab(t, CHORDS[chord]);

    // Melodía (entra después de la intro)
    if (!intro) {
      const hook = phraseB ? HOOK_B : HOOK_A;
      for (const [at, note, len] of hook[chord]) {
        if (s === at) this.lead(t, note, len * STEP);
      }
    }
  }

  // ---------- Instrumentos ----------

  env(t, attack, peak, decay, destination) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(destination);
    return g;
  }

  noiseHit(t, type, freq, q, attack, peak, decay, destination = this.bus) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    src.connect(filter).connect(this.env(t, attack, peak, decay, destination));
    src.start(t, Math.random() * 1.5);
    src.stop(t + attack + decay + 0.05);
  }

  kick(t) {
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(165, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    osc.connect(this.env(t, 0.002, 0.75, 0.34, this.bus));
    osc.start(t);
    osc.stop(t + 0.45);
    this.noiseHit(t, 'highpass', 4000, 0.7, 0.001, 0.18, 0.012);

    // Bombeo: los acordes bajan de volumen con cada bombo y vuelven a subir
    this.pump.gain.cancelScheduledValues(t);
    this.pump.gain.setValueAtTime(0.25, t);
    this.pump.gain.linearRampToValueAtTime(1, t + 0.2);
  }

  clap(t, level = 0.32) {
    for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.011, 'bandpass', 1400, 0.9, 0.001, level, 0.03);
    this.noiseHit(t + 0.03, 'bandpass', 1300, 0.7, 0.002, level * 0.7, 0.16, this.reverb);
    this.noiseHit(t + 0.03, 'bandpass', 1300, 0.7, 0.002, level * 0.6, 0.14);
  }

  hat(t, level, open) {
    this.noiseHit(t, 'highpass', 8000, 0.6, 0.001, open ? level * 0.8 : level, open ? 0.22 : 0.035);
  }

  bass(t, note, duration) {
    const out = this.env(t, 0.005, 0.32, duration * 0.9, this.bus);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(1100, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + duration);
    filter.connect(out);
    const saw = this.ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = midi(note);
    const sub = this.ctx.createOscillator();
    sub.frequency.value = midi(note - 12);
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.9;
    saw.connect(filter);
    sub.connect(subGain).connect(out);
    for (const o of [saw, sub]) {
      o.start(t);
      o.stop(t + duration + 0.05);
    }
  }

  stab(t, notes) {
    const out = this.env(t, 0.004, 0.065, 0.26, this.pump);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(700, t + 0.25);
    filter.connect(out);
    const send = this.ctx.createGain();
    send.gain.value = 0.5;
    filter.connect(send).connect(this.reverb);
    for (const n of notes) {
      for (const detune of [-9, 9]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midi(n);
        o.detune.value = detune;
        o.connect(filter);
        o.start(t);
        o.stop(t + 0.32);
      }
    }
  }

  lead(t, note, duration) {
    const out = this.env(t, 0.01, 0.075, duration * 0.95 + 0.08, this.bus);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(4200, t);
    filter.frequency.exponentialRampToValueAtTime(1600, t + duration + 0.1);
    filter.connect(out);
    filter.connect(this.delay);
    const send = this.ctx.createGain();
    send.gain.value = 0.35;
    filter.connect(send).connect(this.reverb);

    // Onda cuadrada + sierra una octava arriba, con un pequeño vibrato
    const vibrato = this.ctx.createOscillator();
    vibrato.frequency.value = 5.5;
    const depth = this.ctx.createGain();
    depth.gain.value = 6;
    vibrato.connect(depth);
    const voices = [
      ['square', 0, 0.8],
      ['sawtooth', 12, 0.25],
    ].map(([type, octave, level]) => {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.value = midi(note + octave);
      depth.connect(o.detune);
      const g = this.ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(filter);
      return o;
    });
    for (const o of [vibrato, ...voices]) {
      o.start(t);
      o.stop(t + duration + 0.2);
    }
  }

  // ---------- Reacción al scroll ----------

  // t: 0 (normal) → 1 (tensión máxima justo antes de la explosión)
  setTension(t) {
    if (Math.abs(t - this.tension) < 0.005) return;
    this.tension = t;
    const now = this.ctx.currentTime;
    this.tensionFilter.frequency.setTargetAtTime(20000 * Math.pow(280 / 20000, t), now, 0.05);
    this.riserFilter.frequency.setTargetAtTime(400 + t * 5600, now, 0.05);
    this.riserGain.gain.setTargetAtTime(this.playing ? t * t * 0.12 : 0, now, 0.05);
  }

  // La explosión: platillo, se abre el filtro de golpe y la música vuelve a tope
  drop() {
    if (!this.playing) return;
    const t = this.ctx.currentTime;
    this.tension = 0;
    this.tensionFilter.frequency.cancelScheduledValues(t);
    this.tensionFilter.frequency.setValueAtTime(20000, t);
    this.riserGain.gain.cancelScheduledValues(t);
    this.riserGain.gain.setValueAtTime(0, t);
    this.noiseHit(t, 'highpass', 5000, 0.5, 0.002, 0.14, 1.6, this.out);
    this.noiseHit(t, 'highpass', 5000, 0.5, 0.002, 0.12, 2.2, this.reverb);
    this.kick(t);
  }
}
