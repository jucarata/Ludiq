"use client";

import { useEffect, useRef, useState } from "react";
import type { ActiveDiceRoll } from "@/components/dice/DiceContext";
import { DieFace } from "@/components/dice/DieFace";
import {
  createDicePhysics,
  DICE_RESULT_HOLD_MS,
  isDiceSettled,
  normalizeThrowVelocity,
  rollDie,
  stepDicePhysics,
  type DicePhysicsState,
} from "@/lib/game/dice";

interface DiceRollOverlayProps {
  roll: ActiveDiceRoll;
  onComplete: (value: number) => void;
}

export function DiceRollOverlay({ roll, onComplete }: DiceRollOverlayProps) {
  const [displayValue, setDisplayValue] = useState(1);
  const [phase, setPhase] = useState<"rolling" | "result">("rolling");
  const [renderState, setRenderState] = useState<DicePhysicsState>(() => {
    const velocity = normalizeThrowVelocity(roll.vx, roll.vy);
    return createDicePhysics(roll.x, roll.y, velocity.vx, velocity.vy);
  });
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setPhase("rolling");
    setDisplayValue(rollDie());

    const velocity = normalizeThrowVelocity(roll.vx, roll.vy);
    const physics = createDicePhysics(roll.x, roll.y, velocity.vx, velocity.vy);
    setRenderState(physics);

    let frame = 0;
    let resultTimeout = 0;
    let previous = performance.now();
    let lastShuffle = 0;
    let settled = false;

    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.032);
      previous = now;

      const next = stepDicePhysics(physics, roll.bounds, dt);
      Object.assign(physics, next);
      setRenderState({ ...next });

      const speed = Math.hypot(next.vx, next.vy);

      if (now - lastShuffle > 80 && speed > 20) {
        lastShuffle = now;
        setDisplayValue(rollDie());
      }

      if (!settled && isDiceSettled(next)) {
        settled = true;
        setDisplayValue(roll.value);
        setPhase("result");
        resultTimeout = window.setTimeout(() => {
          onCompleteRef.current(roll.value);
        }, DICE_RESULT_HOLD_MS);
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resultTimeout);
    };
  }, [roll.id, roll.value, roll.x, roll.y, roll.vx, roll.vy, roll.bounds]);

  return (
    <div
      className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2"
      style={{ left: renderState.x, top: renderState.y }}
      aria-live="polite"
      role="status"
      aria-label={`Dado: ${phase === "result" ? roll.value : "rodando"}`}
    >
      <div style={{ transform: `rotate(${renderState.rotation}deg)` }}>
        <div className={phase === "result" ? "dice-roll--result" : ""}>
          <DieFace
            value={displayValue}
            className="h-14 w-14 drop-shadow-2xl md:h-16 md:w-16"
          />
        </div>
      </div>
    </div>
  );
}
