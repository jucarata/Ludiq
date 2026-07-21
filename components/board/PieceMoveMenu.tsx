"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DieMoveChoice } from "@/lib/game/movement";
import { useGameState } from "@/components/game/GameStateContext";
import { useTranslations } from "@/components/i18n/LocaleProvider";

interface PieceMoveMenuProps {
  options: { id: string; label: string; choice: DieMoveChoice }[];
  onSelect: (choice: DieMoveChoice) => void;
}

/** Mini-menú con los valores de dado disponibles para mover la ficha */
export function PieceMoveMenu({ options, onSelect }: PieceMoveMenuProps) {
  const { t } = useTranslations();

  return (
    <div
      className="flex gap-1"
      role="menu"
      aria-label={t("board.diceValues")}
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

const VIEWPORT_EDGE_PAD = 8;

/** Menú flotante junto a la ficha (arriba por defecto; abajo si no cabe en el viewport) */
export function PieceMoveMenuOverlay() {
  const {
    selectedPiece,
    menuAnchor,
    getMoveOptionsForSelection,
    applyMove,
    clearSelection,
  } = useGameState();
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [placeBelow, setPlaceBelow] = useState(false);
  const [ready, setReady] = useState(false);

  const options =
    selectedPiece && menuAnchor ? getMoveOptionsForSelection() : [];
  const visible =
    mounted && Boolean(selectedPiece && menuAnchor && options.length > 0);

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

  useLayoutEffect(() => {
    if (!visible || !menuAnchor) {
      setReady(false);
      setPlaceBelow(false);
      return;
    }

    const el = menuRef.current;
    if (!el) return;

    /* Si no cabe arriba de la ficha, abrir debajo para no salir del viewport */
    setPlaceBelow(menuAnchor.y < el.offsetHeight + VIEWPORT_EDGE_PAD);
    setReady(true);
  }, [visible, menuAnchor, options.length]);

  if (!visible || !menuAnchor) return null;

  return createPortal(
    <div
      ref={menuRef}
      data-piece-move-menu
      className={[
        "pointer-events-auto fixed z-[70] -translate-x-1/2",
        placeBelow ? "pt-2" : "-translate-y-full pb-2",
        ready ? "opacity-100" : "opacity-0",
      ].join(" ")}
      style={{
        left: menuAnchor.x,
        top: placeBelow ? menuAnchor.bottom : menuAnchor.y,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <PieceMoveMenu options={options} onSelect={applyMove} />
    </div>,
    document.body,
  );
}
