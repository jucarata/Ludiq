"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { useDice } from "@/components/dice/DiceContext";
import { DiceRollOverlay } from "@/components/dice/DiceRollOverlay";

interface BoardDiceZoneProps {
  children: ReactNode;
}

export function BoardDiceZone({ children }: BoardDiceZoneProps) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const { isAiming, isRolling, rollAt, activeRoll } = useDice();

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isAiming || isRolling || !zoneRef.current) return;

    const rect = zoneRef.current.getBoundingClientRect();
    rollAt(event.clientX - rect.left, event.clientY - rect.top);
  };

  return (
    <div
      ref={zoneRef}
      className={`relative ${isAiming ? "cursor-none" : ""}`}
      onClick={handleClick}
      data-dice-zone={isAiming ? "armed" : undefined}
    >
      {children}
      {activeRoll && <DiceRollOverlay roll={activeRoll} />}
      {isAiming && (
        <div
          className="pointer-events-none absolute inset-0 z-30 rounded-2xl ring-2 ring-[#fcd34d]/60 ring-offset-2 ring-offset-transparent"
          aria-hidden
        />
      )}
    </div>
  );
}
