import type { CellData } from "@/lib/board/types";
import { GamePiece } from "../GamePiece";
import type { BasicCellProps } from "./BasicCell";
import { BasicCell } from "./BasicCell";
import { ExitLabel } from "./ExitLabel";

export interface ExitCellProps extends BasicCellProps {
  cell: CellData;
}

/** Celda de salida — hereda de BasicCell (EXIT rotado o ficha en base) */
export function ExitCell({ cell, movement, style }: ExitCellProps) {
  const showNumber = cell.exit?.state === "empty";
  const showExitLabel =
    cell.exit?.state === "empty" && cell.exit.labelOrientation !== undefined;

  return (
    <BasicCell
      cell={cell}
      movement={movement}
      style={style}
      showNumber={showNumber}
    >
      {showExitLabel && (
        <ExitLabel orientation={cell.exit!.labelOrientation!} />
      )}
      {cell.exit?.state === "occupied" && cell.owner && (
        <GamePiece color={cell.owner} />
      )}
    </BasicCell>
  );
}
