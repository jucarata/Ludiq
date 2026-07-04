"use client";

import { useEffect, useState } from "react";
import { useDice } from "@/components/dice/DiceContext";
import { DicePairVisual } from "@/components/dice/DicePairVisual";

export function DiceCursor() {
  const { isAiming, isRolling, isBoardDragging } = useDice();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAiming || isRolling) {
      document.body.style.cursor = "";
      setVisible(false);
      return;
    }

    document.body.style.cursor = "none";

    const onMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
      setVisible(true);
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.body.style.cursor = "";
    };
  }, [isAiming, isRolling]);

  if (!visible || !isAiming || isBoardDragging) return null;

  return (
    <div
      className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2"
      style={{ left: position.x, top: position.y }}
      aria-hidden
    >
      <DicePairVisual sizeClass="h-9 w-9" gapClass="gap-1.5" />
    </div>
  );
}
