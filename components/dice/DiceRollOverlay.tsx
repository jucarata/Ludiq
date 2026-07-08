"use client";

import { useEffect, useRef, useState } from "react";
import type { ActiveDieRoll } from "@/components/dice/DiceContext";
import { Die3D, getFaceRotation } from "@/components/dice/Die3D";
import {
  createDicePhysics,
  DICE_RESULT_HOLD_MS,
  normalizeThrowVelocity,
  stepDicePhysics,
  type DicePhysicsState,
} from "@/lib/game/dice";

const DIE_SIZE_PX = 56;
const SETTLE_TRANSITION_MS = 260;
const FLIP_MIN_MS = 150;
const FLIP_MAX_MS = 420;
/** Bajo esta velocidad el dado ya "cayó": se muestra el resultado sin más giros. */
const RESULT_TRIGGER_SPEED = 110;
/** Frenado extra por frame (a 60 fps) para el deslizamiento residual tras caer. */
const POST_RESULT_DAMPING = 0.82;
const REST_SPEED = 3;

interface DiceRollOverlayProps {
  roll: ActiveDieRoll;
  onSettled: (value: number) => void;
}

type FlipAxis = "X" | "Y";

interface Flip {
  axis: FlipAxis;
  direction: 1 | -1;
  durationMs: number;
  elapsedMs: number;
}

/**
 * Elige la siguiente voltereta de 90°: el eje se pondera según la dirección
 * del movimiento para que el dado "ruede" hacia donde se desliza
 * (movimiento horizontal → voltereta sobre el eje Y y viceversa).
 */
function pickFlip(physics: DicePhysicsState): Flip {
  const speed = Math.hypot(physics.vx, physics.vy);
  const absVx = Math.abs(physics.vx);
  const absVy = Math.abs(physics.vy);
  const horizontalBias = absVx / Math.max(absVx + absVy, 1);

  const axis: FlipAxis = Math.random() < horizontalBias ? "Y" : "X";
  const direction: 1 | -1 =
    axis === "Y" ? (physics.vx >= 0 ? 1 : -1) : (physics.vy >= 0 ? -1 : 1);

  const durationMs = Math.min(
    FLIP_MAX_MS,
    Math.max(FLIP_MIN_MS, 460 - speed * 0.26),
  );

  return { axis, direction, durationMs, elapsedMs: 0 };
}

/** Pausa breve en cada cara y caída sobre la arista (suaviza inicio y fin). */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function randomBakedFlips(): string[] {
  const flips: string[] = [];
  const count = Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i += 1) {
    const axis = Math.random() > 0.5 ? "X" : "Y";
    const direction = Math.random() > 0.5 ? 90 : -90;
    flips.unshift(`rotate${axis}(${direction}deg)`);
  }
  return flips;
}

export function DiceRollOverlay({ roll, onSettled }: DiceRollOverlayProps) {
  const [phase, setPhase] = useState<"rolling" | "result">("rolling");
  const [orientation, setOrientation] = useState("rotateX(0deg)");
  const [renderState, setRenderState] = useState<DicePhysicsState>(() => {
    const velocity = normalizeThrowVelocity(roll.vx, roll.vy);
    return createDicePhysics(roll.x, roll.y, velocity.vx, velocity.vy);
  });
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    setPhase("rolling");

    const velocity = normalizeThrowVelocity(roll.vx, roll.vy);
    const physics = createDicePhysics(roll.x, roll.y, velocity.vx, velocity.vy);
    setRenderState(physics);

    // Volteretas completadas, exactas a 90°; la más reciente va primero
    // (la primera del transform se aplica en el marco de la pantalla).
    const bakedFlips = randomBakedFlips();
    let flip = pickFlip(physics);
    setOrientation(bakedFlips.join(" ") || "rotateX(0deg)");

    let frame = 0;
    let resultTimeout = 0;
    let previous = performance.now();
    let settled = false;

    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.032);
      previous = now;

      const next = stepDicePhysics(physics, roll.bounds, dt);
      Object.assign(physics, next);

      const speed = Math.hypot(next.vx, next.vy);

      // En cuanto pierde impulso, el dado "cae": se corta el giro de inmediato
      // y se muestra la cara final mientras se frena el deslizamiento residual.
      if (!settled && speed < RESULT_TRIGGER_SPEED) {
        settled = true;
        setPhase("result");

        const face = getFaceRotation(roll.value);
        setOrientation(`rotateX(${face.x}deg) rotateY(${face.y}deg)`);

        resultTimeout = window.setTimeout(() => {
          onSettledRef.current(roll.value);
        }, DICE_RESULT_HOLD_MS);
      }

      if (settled) {
        const damping = Math.pow(POST_RESULT_DAMPING, dt * 60);
        physics.vx *= damping;
        physics.vy *= damping;
        setRenderState({ ...physics });

        if (Math.hypot(physics.vx, physics.vy) < REST_SPEED) return;

        frame = requestAnimationFrame(tick);
        return;
      }

      setRenderState({ ...next });

      flip.elapsedMs += dt * 1000;
      const progress = Math.min(flip.elapsedMs / flip.durationMs, 1);
      const angle = 90 * flip.direction * smoothstep(progress);
      setOrientation(
        [`rotate${flip.axis}(${angle}deg)`, ...bakedFlips].join(" "),
      );

      if (progress >= 1) {
        bakedFlips.unshift(`rotate${flip.axis}(${90 * flip.direction}deg)`);
        flip = pickFlip(physics);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resultTimeout);
    };
  }, [roll.sessionId, roll.key, roll.value, roll.x, roll.y, roll.vx, roll.vy, roll.bounds]);

  return (
    <div
      className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2"
      style={{ left: renderState.x, top: renderState.y }}
      aria-live="polite"
      role="status"
      aria-label={`Die: ${phase === "result" ? roll.value : "rolling"}`}
    >
      <div className={phase === "result" ? "dice-roll--result" : ""}>
        <Die3D
          sizePx={DIE_SIZE_PX}
          orientation={orientation}
          transitionMs={phase === "result" ? SETTLE_TRANSITION_MS : 0}
          className="drop-shadow-2xl"
        />
      </div>
    </div>
  );
}
