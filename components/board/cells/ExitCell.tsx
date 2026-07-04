import type { CellData } from "@/lib/board/types";
import { useGameState } from "@/components/game/GameStateContext";
import type { BasicCellProps } from "./BasicCell";
import { BasicCell } from "./BasicCell";
import { ExitLabel } from "./ExitLabel";
import { PathExitPieces } from "./PathExitPieces";

export interface ExitCellProps extends BasicCellProps {
  cell: CellData;
}

/** Casilla de salida al camino — muestra EXIT o las fichas que acaban de salir */
export function ExitCell({ cell, movement, style }: ExitCellProps) {
  const { getPiecesAtPathExit } = useGameState();
  const owner = cell.owner!;
  const piecesOnExit = getPiecesAtPathExit(owner);

  return (
    <BasicCell cell={cell} movement={movement} style={style}>
      {piecesOnExit.length === 0 && cell.exit?.labelOrientation && (
        <ExitLabel orientation={cell.exit.labelOrientation} />
      )}
      {piecesOnExit.length > 0 && (
        <PathExitPieces player={owner} pieces={piecesOnExit} />
      )}
    </BasicCell>
  );
}
