// Tema musical de Vértigo, sintetizado en tiempo real con la Web Audio API (no hay archivos de audio).
// Estilo tropical suave a 100 BPM, veraniego y tranquilo para escucharlo de fondo:
//   shaker, bombo suave y clic de madera, bajo redondo, acordes de piano eléctrico a contratiempo
//   y una melodía de marimba sobre Rem7 – Sim7 – Solmaj7 – La (en Re mayor).
// Estructura (se repite cada 32 compases, después de 4 de intro):
//   estrofa (8) → estribillo con arpegios y más percusión (8) → puente con otros acordes (8)
//   → bajada sin batería (4) → vuelta a la estrofa con redoble (4).
// Además reacciona al scroll: setTension() apaga la música antes de la explosión (build-up) y drop() la hace volver,
// y muffle() la amortigua (como detrás de una puerta) mientras hay un panel abierto encima.

const BPM = 100;
// Volumen de la música (los efectos de sonido van aparte, un poco por encima)
const MUSIC_VOLUME = 0.13;
const STEP = 60 / BPM / 4; // semicorchea
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Acordes (Remaj7, Sim7, Solmaj7, La6) y raíz del bajo de cada compás
const CHORDS = [
  [62, 66, 69, 73],
  [59, 62, 66, 69],
  [55, 59, 62, 66],
  [57, 61, 64, 66],
];
const BASS = [38, 35, 31, 33];

// Melodía de marimba: por compás, [paso, nota]
const HOOK_A = [
  [[0, 78], [3, 81], [6, 78], [8, 76], [10, 74], [14, 76]],
  [[0, 74], [3, 71], [6, 74], [8, 76], [14, 78]],
  [[0, 78], [3, 79], [6, 81], [10, 78], [12, 76], [14, 74]],
  [[0, 76], [6, 73], [8, 69]],
];
// Respuesta: los dos últimos compases suben y cierran la frase en Re
const HOOK_B = [
  HOOK_A[0],
  HOOK_A[1],
  [[0, 83], [3, 81], [6, 78], [8, 81], [10, 83], [14, 81]],
  [[0, 78], [4, 76], [6, 73], [8, 74]],
];

// Puente: Mim7 – La7 – Fa#m7 – Sim7, con una melodía más lenta. Su último compás vuelve a La para regresar a casa
const BRIDGE_CHORDS = [
  [59, 62, 64, 67],
  [57, 61, 64, 67],
  [54, 57, 61, 64],
  [59, 62, 66, 69],
];
const BRIDGE_BASS = [40, 33, 42, 35];
const BRIDGE_HOOK = [
  [[0, 79], [6, 78], [8, 76]],
  [[0, 76], [8, 73]],
  [[0, 73], [4, 76], [8, 81]],
  [[0, 78], [8, 74]],
];
const TURNAROUND_HOOK = [[0, 76], [6, 78], [8, 81], [12, 79]];

// Acordes a contratiempo (el "salto" típico del tropical)
const CHORD_STEPS = [0, 3, 6, 10];
// Bajo: [paso, intervalo sobre la raíz, duración en pasos]
const BASS_STEPS = [
  [0, 0, 3],
  [6, 0, 2],
  [10, 7, 2],
  [12, 0, 3],
];
const SHAKER = [0.006, 0.003, 0.011, 0.003];

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

    // Amortiguado: cierra los agudos cuando hay un panel abierto (carrito)
    this.muffleFilter = ctx.createBiquadFilter();
    this.muffleFilter.type = 'lowpass';
    this.muffleFilter.frequency.value = 20000;
    this.muffleFilter.connect(this.tensionFilter);

    this.introFilter = ctx.createBiquadFilter();
    this.introFilter.type = 'lowpass';
    this.introFilter.frequency.value = 20000;
    this.introFilter.connect(this.muffleFilter);
    this.bus = this.introFilter;

    // Los acordes pasan por un "bombeo" que baja un poco el volumen en cada bombo
    this.pump = ctx.createGain();
    this.pump.connect(this.bus);

    // Eco a 3/16 para la marimba y reverb general
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = STEP * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const delayTone = ctx.createBiquadFilter();
    delayTone.type = 'lowpass';
    delayTone.frequency.value = 2800;
    this.delay.connect(delayTone).connect(feedback).connect(this.delay);
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.3;
    delayTone.connect(delayWet).connect(this.bus);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse(ctx);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0.22;
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

    // Intro: shaker, colchón y acordes; el bajo entra en la segunda mitad para preparar la estrofa
    if (bar < 4) {
      this.shaker(t, SHAKER[s % 4] * 0.8);
      if (s === 0) this.pad(t, CHORDS[bar], 16 * STEP);
      if (CHORD_STEPS.includes(s)) this.keys(t, CHORDS[bar], s === 0 ? 1.2 : 0.9);
      if (bar >= 2) {
        for (const [at, interval, len] of BASS_STEPS) {
          if (s === at) this.bass(t, BASS[bar] + interval, len * STEP);
        }
      }
      return;
    }

    const c = (bar - 4) % 32; // compás dentro del ciclo de la canción
    const section = c < 8 ? 'verse' : c < 16 ? 'chorus' : c < 24 ? 'bridge' : c < 28 ? 'break' : 'verse';
    const chord = c % 4;
    const turnaround = c === 23;
    const inBridge = section === 'bridge' && !turnaround;
    const notes = inBridge ? BRIDGE_CHORDS[chord] : CHORDS[chord];
    const root = inBridge ? BRIDGE_BASS[chord] : BASS[chord];
    const drums = section !== 'break';

    // Percusión
    this.shaker(t, SHAKER[s % 4] * (section === 'chorus' ? 1.3 : drums ? 1 : 0.5));
    if (drums) {
      const kicks = section === 'chorus' ? [0, 8, 11] : [0, 8];
      if (kicks.includes(s)) this.kick(t);
      if (s === 4 || s === 12 || (s === 14 && bar % 2 === 1)) this.wood(t);
    }
    // Redoble de madera en el último compás del ciclo, para volver con fuerza
    if (c === 31 && s >= 8) this.wood(t, 0.5 + (s - 8) * 0.08);
    // Platillo suave al empezar el estribillo, el puente y la vuelta
    if (s === 0 && (c === 8 || c === 16 || c === 28 || (c === 0 && bar > 4))) this.cymbal(t);

    // Bajo (descansa en la bajada; en el estribillo añade saltos a la octava que empujan)
    if (drums) {
      for (const [at, interval, len] of BASS_STEPS) {
        if (s === at) this.bass(t, root + interval, len * STEP);
      }
      if (section === 'chorus' && (s === 3 || s === 15)) this.bass(t, root + 12, STEP);
    }

    // Acordes: a contratiempo, o un colchón largo en la bajada
    if (section === 'break') {
      if (s === 0) this.pad(t, notes, 16 * STEP);
      if (s === 0 || s === 8) this.keys(t, notes, 0.5);
    } else if (CHORD_STEPS.includes(s)) {
      const lift = section === 'chorus' ? 1.3 : 1;
      this.keys(t, notes, (s === 0 ? 1 : 0.7) * lift);
    }

    // Melodía
    let hook = null;
    if (section === 'verse' || section === 'chorus') hook = (c % 8 < 4 ? HOOK_A : HOOK_B)[chord];
    if (section === 'bridge') hook = turnaround ? TURNAROUND_HOOK : BRIDGE_HOOK[chord];
    if (section === 'break' && s === 0) this.marimba(t, HOOK_A[chord][0][1]);
    if (hook) {
      for (const [at, note] of hook) {
        if (s === at) this.marimba(t, note);
      }
    }
    // Estribillo: arpegio de campanitas por encima de la melodía
    if (section === 'chorus' && s % 4 === 2) this.bell(t, notes[(s >> 2) % notes.length] + 12);
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

  // Sinusoide con envolvente: la pieza básica de casi todos los instrumentos
  sine(t, freq, attack, peak, decay, destination) {
    const o = this.ctx.createOscillator();
    o.frequency.value = freq;
    o.connect(this.env(t, attack, peak, decay, destination));
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  // Bombo suave y redondo, sin clic
  kick(t) {
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(105, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    osc.connect(this.env(t, 0.006, 0.36, 0.28, this.bus));
    osc.start(t);
    osc.stop(t + 0.4);

    this.pump.gain.cancelScheduledValues(t);
    this.pump.gain.setValueAtTime(0.75, t);
    this.pump.gain.linearRampToValueAtTime(1, t + 0.25);
  }

  // Clic de madera (tipo claves), en lugar de caja
  wood(t, level = 1) {
    this.sine(t, 1750, 0.001, 0.05 * level, 0.035, this.bus);
    this.sine(t, 2600, 0.001, 0.02 * level, 0.02, this.reverb);
  }

  // Platillo muy suave (ruido agudo con cola larga)
  cymbal(t) {
    this.noiseHit(t, 'highpass', 7000, 0.6, 0.005, 0.03, 1.2);
    this.noiseHit(t, 'highpass', 6000, 0.6, 0.005, 0.02, 1.6, this.reverb);
  }

  // Campanita para los arpegios del estribillo
  bell(t, note) {
    const f = midi(note);
    const out = this.ctx.createGain();
    out.connect(this.bus);
    out.connect(this.delay);
    this.sine(t, f, 0.002, 0.05, 0.3, out);
    this.sine(t, f * 3, 0.001, 0.012, 0.08, out);
  }

  // Colchón para la bajada: triángulos un poco desafinados, entrada y salida lentas
  pad(t, notes, duration) {
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.02, t + 0.8);
    out.gain.setValueAtTime(0.02, t + duration - 0.4);
    out.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.6);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.connect(out);
    out.connect(this.bus);
    out.connect(this.reverb);
    for (const n of notes) {
      for (const detune of [-7, 7]) {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = midi(n);
        o.detune.value = detune;
        o.connect(filter);
        o.start(t);
        o.stop(t + duration + 0.7);
      }
    }
  }

  shaker(t, level) {
    this.noiseHit(t, 'bandpass', 9000, 1, 0.006, level, 0.04);
  }

  // Bajo de onda senoidal con un poco de cuerpo
  bass(t, note, duration) {
    const out = this.env(t, 0.015, 0.28, duration * 0.9, this.bus);
    const sine = this.ctx.createOscillator();
    sine.frequency.value = midi(note);
    const body = this.ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.value = midi(note + 12);
    const bodyGain = this.ctx.createGain();
    bodyGain.gain.value = 0.2;
    sine.connect(out);
    body.connect(bodyGain).connect(out);
    for (const o of [sine, body]) {
      o.start(t);
      o.stop(t + duration + 0.1);
    }
  }

  // Piano eléctrico: fundamental + armónico suave que se apaga antes (sonido "de campana" cálido)
  keys(t, notes, level) {
    const send = this.ctx.createGain();
    send.gain.value = 0.5;
    send.connect(this.reverb);
    for (const n of notes) {
      const f = midi(n);
      this.sine(t, f, 0.004, 0.022 * level, 0.5, this.pump);
      this.sine(t, f, 0.004, 0.012 * level, 0.5, send);
      this.sine(t, f * 2, 0.002, 0.006 * level, 0.12, this.pump);
    }
  }

  // Marimba: golpe corto con un armónico agudo (x4) que da el sonido de madera
  marimba(t, note) {
    const f = midi(note);
    const out = this.ctx.createGain();
    out.connect(this.bus);
    out.connect(this.delay);
    const send = this.ctx.createGain();
    send.gain.value = 0.4;
    out.connect(send).connect(this.reverb);
    this.sine(t, f, 0.003, 0.09, 0.5, out);
    this.sine(t, f * 4, 0.001, 0.02, 0.05, out);
  }

  // Como detrás de una puerta: se apagan los agudos (y vuelven al quitarlo)
  muffle(on) {
    this.muffleFilter.frequency.setTargetAtTime(on ? 650 : 20000, this.ctx.currentTime, on ? 0.12 : 0.25);
  }

  // Subidón: el volumen sube un momento (explosión, pedido hecho...) y vuelve solo a su nivel
  swell(boost = 1.6, hold = 1.2) {
    if (!this.playing) return;
    const gain = this.out.gain;
    const t = this.ctx.currentTime;
    gain.cancelScheduledValues(t);
    gain.setValueAtTime(gain.value, t);
    gain.linearRampToValueAtTime(MUSIC_VOLUME * boost, t + 0.2);
    gain.setValueAtTime(MUSIC_VOLUME * boost, t + 0.2 + hold);
    gain.linearRampToValueAtTime(MUSIC_VOLUME, t + 0.2 + hold + 1.6);
  }

  // ---------- Reacción al scroll ----------

  // t: 0 (normal) → 1 (tensión máxima justo antes de la explosión)
  setTension(t) {
    if (Math.abs(t - this.tension) < 0.005) return;
    this.tension = t;
    const now = this.ctx.currentTime;
    this.tensionFilter.frequency.setTargetAtTime(20000 * Math.pow(280 / 20000, t), now, 0.05);
    this.riserFilter.frequency.setTargetAtTime(400 + t * 5600, now, 0.05);
    this.riserGain.gain.setTargetAtTime(this.playing ? t * t * 0.05 : 0, now, 0.05);
  }

  // La explosión: platillo suave y el filtro se vuelve a abrir poco a poco
  drop() {
    if (!this.playing) return;
    const t = this.ctx.currentTime;
    this.tension = 0;
    this.tensionFilter.frequency.cancelScheduledValues(t);
    this.tensionFilter.frequency.setValueAtTime(this.tensionFilter.frequency.value, t);
    this.tensionFilter.frequency.exponentialRampToValueAtTime(20000, t + 0.8);
    this.riserGain.gain.cancelScheduledValues(t);
    this.riserGain.gain.setValueAtTime(0, t);
    this.noiseHit(t, 'highpass', 6000, 0.5, 0.01, 0.05, 1.6, this.out);
    this.noiseHit(t, 'highpass', 6000, 0.5, 0.01, 0.05, 2.2, this.reverb);
    this.kick(t);
  }
}
