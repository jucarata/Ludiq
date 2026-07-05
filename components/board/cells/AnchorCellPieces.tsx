"use client";

import type { BasicOrientation } from "@/lib/board/cell-shapes";
import type { CornerHalfRegion } from "@/lib/board/player-path";
import { useTurn } from "@/components/game/TurnContext";
import { useGameState } from "@/components/game/GameStateContext";
import type { PieceIndex } from "@/lib/game/pieces";
import { CellPieces, PieceSlot } from "./CellPieces";

export interface AnchorCellPiecesProps {
  anchor: number;
  /** Triángulo esquinal (solo celdas corner) */
  half?: 0 | 1;
  colSpan?: number;
  rowSpan?: number;
  orientation?: BasicOrientation;
}

/**
 * Centros de ficha dentro de cada triángulo esquinal (% de la celda 2×2).
 * Cada ficha ocupa una caja de 50% (= 1 unidad de grid, mismo tamaño que
 * en las casillas básicas) sin cruzar la diagonal del corte.
 */
const CORNER_PIECE_SPOTS: Record<
  CornerHalfRegion,
  { single: [number, number]; pair: [[number, number], [number, number]] }
> = {
  "upper-right": { single: [64, 36], pair: [[47.5, 19.5], [80.5, 52.5]] },
  "lower-left": { single: [36, 64], pair: [[19.5, 47.5], [52.5, 80.5]] },
  "upper-left": { single: [36, 36], pair: [[52.5, 19.5], [19.5, 52.5]] },
  "lower-right": { single: [64, 64], pair: [[47.5, 80.5], [80.5, 47.5]] },
};

export interface CornerHalfPiecesProps {
  anchor: number;
  half: 0 | 1;
  region: CornerHalfRegion;
}

/** Fichas de un triángulo esquinal, a tamaño normal y alineadas en diagonal */
export function CornerHalfPieces({ anchor, half, region }: CornerHalfPiecesProps) {
  const { currentPlayer } = useTurn();
  const {
    getPiecesAtAnchor,
    canInteractWithPieces,
    selectedPiece,
    selectPiece,
  } = useGameState();

  const pieces = getPiecesAtAnchor(anchor, half).slice(0, 2);
  if (pieces.length === 0) return null;

  const spots =
    pieces.length === 1
      ? [CORNER_PIECE_SPOTS[region].single]
      : CORNER_PIECE_SPOTS[region].pair;

  return (
    <>
      {pieces.map((piece, i) => {
        const [x, y] = spots[i];
        return (
          <div
            key={`${piece.player}-${piece.index}`}
            className="pointer-events-auto absolute z-10 grid h-1/2 w-1/2"
            style={{ left: `${x - 25}%`, top: `${y - 25}%` }}
          >
            <PieceSlot
              player={piece.player}
              index={piece.index}
              interactive={
                canInteractWithPieces && piece.player === currentPlayer
              }
              selected={
                selectedPiece?.index === piece.index &&
                selectedPiece?.player === piece.player
              }
              onClick={(menuAnchor) =>
                selectPiece(
                  { index: piece.index, player: piece.player },
                  menuAnchor,
                )
              }
            />
          </div>
        );
      })}
    </>
  );
}

/** Fichas presentes en una celda de movimiento, identificada por su ancla */
export function AnchorCellPieces({
  anchor,
  half,
  colSpan,
  rowSpan,
  orientation,
}: AnchorCellPiecesProps) {
  const { currentPlayer } = useTurn();
  const {
    getPiecesAtAnchor,
    canInteractWithPieces,
    selectedPiece,
    selectPiece,
  } = useGameState();

  const pieces = getPiecesAtAnchor(anchor, half);
  if (pieces.length === 0) return null;

  return (
    <CellPieces
      pieces={pieces.map((piece) => ({
        index: piece.index,
        player: piece.player,
      }))}
      colSpan={colSpan}
      rowSpan={rowSpan}
      orientation={orientation}
      interactive={canInteractWithPieces}
      activePlayer={currentPlayer}
      selectedPiece={selectedPiece}
      onPieceClick={(index, player, menuAnchor) =>
        selectPiece({ index: index as PieceIndex, player }, menuAnchor)
      }
    />
  );
}
