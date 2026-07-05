"use client";

import type { CellData } from "@/lib/board/types";
import { useGameState } from "@/components/game/GameStateContext";
import type { BasicCellProps } from "./BasicCell";
import { BasicCell } from "./BasicCell";
import { ExitLabel } from "./ExitLabel";

export interface ExitCellProps extends BasicCellProps {
  cell: CellData;
}

/** Casilla de salida al camino — muestra EXIT o las fichas encima */
export function ExitCell({ cell, movement, style }: ExitCellProps) {
  const { getPiecesAtAnchor } = useGameState();
  const hasPieces =
    cell.anchor !== undefined && getPiecesAtAnchor(cell.anchor).length > 0;

  return (
    <BasicCell cell={cell} movement={movement} style={style}>
      {!hasPieces && cell.exit?.labelOrientation && (
        <ExitLabel orientation={cell.exit.labelOrientation} />
      )}
    </BasicCell>
  );
}
