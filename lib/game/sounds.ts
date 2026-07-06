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
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    diceRollAudio = new Audio(`${basePath}/sounds/dice-roll.mp3`);
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
 * Clic al avanzar una casilla — ficha saltando sobre el tablero.
 */
export function playPieceStepSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const master = createMasterGain(ctx, 0.2);
  const start = ctx.currentTime;
  const pitch = 320 + Math.random() * 90;

  scheduleNoiseBurst(
    ctx,
    master,
    start,
    0.014,
    0.35,
    750 + Math.random() * 350,
    1.8,
    "bandpass",
  );

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(pitch, start);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.55, start + 0.045);

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.55, start + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);

  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + 0.055);
}

/**
 * Impacto al capturar una ficha rival.
 */
export function playCaptureSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const master = createMasterGain(ctx, 0.52);
  const start = ctx.currentTime;

  scheduleNoiseBurst(ctx, master, start, 0.09, 1, 280, 0.7, "bandpass");
  scheduleNoiseBurst(ctx, master, start, 0.035, 0.9, 2200, 4, "highpass");
  scheduleNoiseBurst(ctx, master, start + 0.05, 0.06, 0.55, 120, 0.8, "lowpass");

  const slam = ctx.createOscillator();
  const slamGain = ctx.createGain();
  slam.type = "square";
  slam.frequency.setValueAtTime(200, start);
  slam.frequency.exponentialRampToValueAtTime(40, start + 0.28);

  slamGain.gain.setValueAtTime(0, start);
  slamGain.gain.linearRampToValueAtTime(0.85, start + 0.003);
  slamGain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);

  slam.connect(slamGain);
  slamGain.connect(master);
  slam.start(start);
  slam.stop(start + 0.4);

  const snap = ctx.createOscillator();
  const snapGain = ctx.createGain();
  snap.type = "sawtooth";
  snap.frequency.setValueAtTime(720, start);
  snap.frequency.exponentialRampToValueAtTime(100, start + 0.16);

  snapGain.gain.setValueAtTime(0, start);
  snapGain.gain.linearRampToValueAtTime(0.55, start + 0.004);
  snapGain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

  snap.connect(snapGain);
  snapGain.connect(master);
  snap.start(start);
  snap.stop(start + 0.22);

  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = "sine";
  thud.frequency.value = 55;
  thudGain.gain.setValueAtTime(0, start);
  thudGain.gain.linearRampToValueAtTime(0.75, start + 0.006);
  thudGain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
  thud.connect(thudGain);
  thudGain.connect(master);
  thud.start(start);
  thud.stop(start + 0.32);
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
