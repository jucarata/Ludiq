"use client";

import { useEffect, useState } from "react";
import { useDice } from "@/components/dice/DiceContext";
import { DieFace } from "@/components/dice/DieFace";

export function DiceCursor() {
  const { isAiming, isRolling } = useDice();
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

  if (!visible || !isAiming) return null;

  return (
    <div
      className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2"
      style={{ left: position.x, top: position.y }}
      aria-hidden
    >
      <DieFace className="h-10 w-10 drop-shadow-lg" />
    </div>
  );
}
