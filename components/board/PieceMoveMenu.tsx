"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { DieMoveChoice } from "@/lib/game/movement";
import { useGameState } from "@/components/game/GameStateContext";

interface PieceMoveMenuProps {
  options: { id: string; label: string; choice: DieMoveChoice }[];
  onSelect: (choice: DieMoveChoice) => void;
}

/** Mini-menú con los valores de dado disponibles para mover la ficha */
export function PieceMoveMenu({ options, onSelect }: PieceMoveMenuProps) {
  return (
    <div
      className="flex gap-1"
      role="menu"
      aria-label="Dice values"
      onClick={(event) => event.stopPropagation()}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="menuitem"
          className="flex h-10 min-w-10 items-center justify-center rounded-lg border-2 border-amber-400 bg-white px-2.5 text-base font-bold text-zinc-900 shadow-lg transition hover:scale-105 hover:bg-amber-50 active:scale-95"
          onClick={() => onSelect(option.choice)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Menú flotante encima de la ficha seleccionada (fuera del overflow de la celda) */
export function PieceMoveMenuOverlay() {
  const {
    selectedPiece,
    menuAnchor,
    getMoveOptionsForSelection,
    applyMove,
    clearSelection,
  } = useGameState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedPiece) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-piece-move-menu]")) return;
      if (target.closest("[data-piece-button]")) return;
      clearSelection();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selectedPiece, clearSelection]);

  if (!mounted || !selectedPiece || !menuAnchor) return null;

  const options = getMoveOptionsForSelection();
  /* Sin movimientos válidos: la ficha queda seleccionada pero no sale menú */
  if (options.length === 0) return null;

  return createPortal(
    <div
      data-piece-move-menu
      className="pointer-events-auto fixed z-[70] -translate-x-1/2 -translate-y-full pb-2"
      style={{ left: menuAnchor.x, top: menuAnchor.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <PieceMoveMenu options={options} onSelect={applyMove} />
    </div>,
    document.body,
  );
}
