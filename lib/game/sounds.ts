/** Utilidades de audio del juego — sintetizadas con Web Audio API. */

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedCtx) sharedCtx = new AudioCtx();
  if (sharedCtx.state === "suspended") void sharedCtx.resume();

  return sharedCtx;
}

function createMasterGain(ctx: AudioContext, volume: number): GainNode {
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  return master;
}

function scheduleNoiseBurst(
  ctx: AudioContext,
  master: GainNode,
  start: number,
  duration: number,
  volume: number,
  frequency: number,
  q = 2,
  filterType: BiquadFilterType = "bandpass",
) {
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = q;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(start);
  source.stop(start + duration + 0.05);
}

/**
 * Arpegio corto al meter una ficha en la casilla café.
 */
export function playFinishSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const master = createMasterGain(ctx, 0.32);

  const notes = [880, 1174.66, 1479.98, 1760];

  notes.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;

    const start = ctx.currentTime + i * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(1, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.6);
  });
}

let diceRollAudio: HTMLAudioElement | null = null;

function getDiceRollAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  if (!diceRollAudio) {
    diceRollAudio = new Audio("/sounds/dice-roll.mp3");
    diceRollAudio.preload = "auto";
    diceRollAudio.volume = 0.8;
  }

  return diceRollAudio;
}

/**
 * Dados rodando — clip real descargado de efecto de sonido.
 */
export function playDiceRollSound() {
  const audio = getDiceRollAudio();
  if (!audio) return;

  audio.currentTime = 0;
  void audio.play().catch(() => {});
}

/**
 * Impacto al capturar una ficha rival.
 */
export function playCaptureSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const master = createMasterGain(ctx, 0.28);
  const start = ctx.currentTime;

  scheduleNoiseBurst(ctx, master, start, 0.06, 0.7, 600, 1.5);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, start);
  osc.frequency.exponentialRampToValueAtTime(90, start + 0.18);

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.9, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + 0.25);

  const ping = ctx.createOscillator();
  const pingGain = ctx.createGain();
  ping.type = "square";
  ping.frequency.value = 880;
  pingGain.gain.setValueAtTime(0, start + 0.04);
  pingGain.gain.linearRampToValueAtTime(0.15, start + 0.05);
  pingGain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
  ping.connect(pingGain);
  pingGain.connect(master);
  ping.start(start + 0.04);
  ping.stop(start + 0.15);
}

/**
 * Celebración con fuegos artificiales al ganar la partida.
 */
export function playVictorySound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const master = createMasterGain(ctx, 0.42);
  const base = ctx.currentTime;

  const fireworkTimes = [0, 0.35, 0.7, 1.05, 1.45];

  fireworkTimes.forEach((offset, i) => {
    const t = base + offset;
    const freq = 900 + i * 180 + Math.random() * 200;

    scheduleNoiseBurst(ctx, master, t, 0.18, 0.55, freq, 1.2);
    scheduleNoiseBurst(ctx, master, t + 0.04, 0.12, 0.35, freq * 1.4, 2);

    const whistle = ctx.createOscillator();
    const whistleGain = ctx.createGain();
    whistle.type = "sine";
    whistle.frequency.setValueAtTime(400 + i * 80, t);
    whistle.frequency.exponentialRampToValueAtTime(1800 + i * 120, t + 0.22);

    whistleGain.gain.setValueAtTime(0, t);
    whistleGain.gain.linearRampToValueAtTime(0.25, t + 0.04);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    whistle.connect(whistleGain);
    whistleGain.connect(master);
    whistle.start(t);
    whistle.stop(t + 0.3);
  });

  const fanfareNotes = [523.25, 659.25, 783.99, 1046.5];
  const fanfareStart = base + 1.6;

  fanfareNotes.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i % 2 === 0 ? "triangle" : "sine";
    osc.frequency.value = frequency;

    const start = fanfareStart + i * 0.12;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.85, start + 0.03);
    gain.gain.setValueAtTime(0.7, start + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 1);
  });
}
