import type { PlayerColor } from "@/lib/board/types";

/** Duración de la celebración al meter una ficha en la casilla café (ms) */
export const FINISH_CELEBRATION_MS = 2000;

export interface CelebrationState {
  player: PlayerColor;
  /** Cambia en cada celebración — fuerza el reinicio de la animación */
  key: number;
}

/**
 * Arpegio corto y brillante sintetizado con WebAudio.
 * No requiere archivos de audio; se reproduce tras un gesto del usuario
 * (el clic para mover la ficha), así que el navegador lo permite.
 */
export function playFinishSound() {
  if (typeof window === "undefined") return;

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);

  /* A5 → D6 → F#6 → A6: arpegio ascendente de ~0.8 s */
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

  window.setTimeout(() => {
    void ctx.close();
  }, 1500);
}
