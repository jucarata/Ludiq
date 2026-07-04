"use client";

import { useEffect, useState } from "react";
import type { ActiveDiceRoll } from "@/components/dice/DiceContext";
import { DieFace } from "@/components/dice/DieFace";
import { DICE_ROLL_DURATION_MS, rollDie } from "@/lib/game/dice";

interface DiceRollOverlayProps {
  roll: ActiveDiceRoll;
}

export function DiceRollOverlay({ roll }: DiceRollOverlayProps) {
  const [displayValue, setDisplayValue] = useState(1);
  const [phase, setPhase] = useState<"rolling" | "result">("rolling");

  useEffect(() => {
    setPhase("rolling");
    setDisplayValue(rollDie());

    const shuffle = setInterval(() => {
      setDisplayValue(rollDie());
    }, 90);

    const reveal = setTimeout(() => {
      clearInterval(shuffle);
      setDisplayValue(roll.value);
      setPhase("result");
    }, DICE_ROLL_DURATION_MS);

    return () => {
      clearInterval(shuffle);
      clearTimeout(reveal);
    };
  }, [roll.id, roll.value]);

  return (
    <div
      className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2"
      style={{ left: roll.x, top: roll.y }}
      aria-live="polite"
      role="status"
      aria-label={`Dado: ${phase === "result" ? roll.value : "tirando"}`}
    >
      <div
        className={`dice-roll ${phase === "result" ? "dice-roll--result" : ""}`}
      >
        <DieFace
          value={displayValue}
          className="h-14 w-14 drop-shadow-2xl md:h-16 md:w-16"
        />
        {phase === "result" && (
          <span className="mt-1 block text-center font-mono text-sm font-black text-[#fcd34d] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {roll.value}
          </span>
        )}
      </div>
    </div>
  );
}
