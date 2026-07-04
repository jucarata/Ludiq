import type { CellData } from "@/lib/board/types";
import { useGameState } from "@/components/game/GameStateContext";
import { GamePiece } from "../GamePiece";
import type { BasicCellProps } from "./BasicCell";
import { BasicCell } from "./BasicCell";

export interface StartCellProps extends BasicCellProps {
  cell: CellData;
}

/** Casilla de inicio — bloque 2×2 donde aguardan las fichas */
export function StartCell({ cell, movement, style }: StartCellProps) {
  const { isPieceAtStartSlot } = useGameState();
  const slot = cell.exit?.slot ?? 0;
  const owner = cell.owner!;
  const hasPiece = isPieceAtStartSlot(owner, slot);

  return (
    <BasicCell cell={cell} movement={movement} style={style}>
      {hasPiece && <GamePiece color={owner} />}
    </BasicCell>
  );
}
