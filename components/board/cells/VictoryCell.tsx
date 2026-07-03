import { VICTORY_COLOR } from "@/lib/board/types";
import { VictoryCrown } from "../VictoryCrown";
import { CellShell, GridNumber } from "./CellChrome";
import type { MovementCellProps } from "./MovementCell";
import { MovementCellRoot } from "./MovementCell";

export interface VictoryCellProps extends MovementCellProps {
  gridNumber: number;
}

/** Celda de victoria (centro): hereda de movimiento, siempre café con corona */
export function VictoryCell({ gridNumber, movement, style }: VictoryCellProps) {
  return (
    <MovementCellRoot movement={movement} style={style}>
      <CellShell
        className="flex h-full w-full items-center justify-center"
        style={{ backgroundColor: VICTORY_COLOR.fill }}
      >
        <GridNumber n={gridNumber} dark />
        <VictoryCrown />
      </CellShell>
    </MovementCellRoot>
  );
}
