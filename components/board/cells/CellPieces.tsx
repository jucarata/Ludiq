"use client";

import type { BasicOrientation } from "@/lib/board/cell-shapes";
import type { PlayerColor } from "@/lib/board/types";
import type { MenuAnchor } from "@/components/game/GameStateContext";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { MAX_PIECES_PER_CELL } from "@/lib/game/pieces";
import { GamePiece } from "../GamePiece";

export interface CellPiecesProps {
  pieces: { index: number; player: PlayerColor }[];
  colSpan?: number;
  rowSpan?: number;
  /** Respaldo si no hay span explícito */
  orientation?: BasicOrientation;
  interactive?: boolean;
  activePlayer?: PlayerColor | null;
  onPieceClick?: (index: number, player: PlayerColor, anchor: MenuAnchor) => void;
  selectedPiece?: { index: number; player: PlayerColor } | null;
}

function resolveSlotGrid(
  colSpan: number,
  rowSpan: number,
  orientation?: BasicOrientation,
): { cols: number; rows: number } {
  if (colSpan > 1 || rowSpan > 1) {
    return { cols: colSpan, rows: rowSpan };
  }

  if (orientation === "vertical") return { cols: 1, rows: 2 };
  if (orientation === "horizontal") return { cols: 2, rows: 1 };
  return { cols: 1, rows: 1 };
}

export function PieceSlot({
  player,
  index,
  interactive,
  selected,
  onClick,
}: {
  player: PlayerColor;
  index: number;
  interactive?: boolean;
  selected?: boolean;
  onClick?: (anchor: MenuAnchor) => void;
}) {
  const { t } = useTranslations();
  const content = (
    <GamePiece
      color={player}
      className={`h-[78%] w-[78%] ${selected ? "ring-2 ring-amber-400 ring-offset-1 rounded-full" : ""}`}
    />
  );

  if (!interactive) {
    return (
      <div className="relative flex min-h-0 min-w-0 items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="relative z-10 flex min-h-0 min-w-0 items-center justify-center">
      <button
        type="button"
        className="relative flex h-full w-full cursor-pointer items-center justify-center transition hover:scale-105 active:scale-95"
        onClick={(event) => {
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          onClick?.({
            x: rect.left + rect.width / 2,
            y: rect.top,
          });
        }}
        aria-label={t("board.movePiece", { n: index + 1 })}
        data-piece-button
      >
        {content}
      </button>
    </div>
  );
}

/**
 * Hasta 2 fichas en una celda básica (2×1 o 1×2).
 * Cada ficha ocupa un slot de 1×1 — mismo tamaño que en casilla de inicio.
 */
export function CellPieces({
  colSpan = 1,
  rowSpan = 1,
  orientation,
  pieces,
  interactive = false,
  activePlayer = null,
  onPieceClick,
  selectedPiece = null,
}: CellPiecesProps) {
  const { tp } = useTranslations();

  if (pieces.length === 0) return null;

  const visible = pieces.slice(0, MAX_PIECES_PER_CELL);
  const { cols, rows } = resolveSlotGrid(colSpan, rowSpan, orientation);
  const isSingle = visible.length === 1;

  if (isSingle) {
    const slotClass =
      cols >= 2
        ? "h-full w-1/2"
        : rows >= 2
          ? "h-1/2 w-full"
          : "h-full w-full";

    return (
      <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center overflow-visible">
        <div className={`flex items-center justify-center ${slotClass}`}>
          <PieceSlot
            player={visible[0].player}
            index={visible[0].index}
            interactive={
              interactive &&
              activePlayer !== null &&
              visible[0].player === activePlayer
            }
            selected={
              selectedPiece?.index === visible[0].index &&
              selectedPiece?.player === visible[0].player
            }
            onClick={(anchor) =>
              onPieceClick?.(visible[0].index, visible[0].player, anchor)
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-10 grid overflow-visible"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
      aria-label={tp("board.piece", visible.length)}
    >
      {visible.map((piece) => (
        <PieceSlot
          key={`${piece.player}-${piece.index}`}
          player={piece.player}
          index={piece.index}
          interactive={
            interactive &&
            activePlayer !== null &&
            piece.player === activePlayer
          }
          selected={
            selectedPiece?.index === piece.index &&
            selectedPiece?.player === piece.player
          }
          onClick={(anchor) =>
            onPieceClick?.(piece.index, piece.player, anchor)
          }
        />
      ))}
    </div>
  );
}
