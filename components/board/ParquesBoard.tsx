import { buildBoardLayout, BOARD_SIZE } from "@/lib/board/layout";
import { BoardCell } from "./BoardCell";

const layout = buildBoardLayout();

function gridAreaStyle(
  r: number,
  c: number,
  colSpan = 1,
  rowSpan = 1,
): React.CSSProperties {
  return {
    gridColumn: `${c + 1} / span ${colSpan}`,
    gridRow: `${r + 1} / span ${rowSpan}`,
  };
}

export function ParquesBoard({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`grid h-[var(--board-dim)] w-[var(--board-dim)] max-h-full max-w-full shrink-0 gap-[2px] rounded-2xl border-[6px] border-[#d4c5a0] bg-[#d4c5a0] p-[2px] shadow-2xl ${className ?? ""}`}
      style={{
        gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
      }}
      role="img"
      aria-label="Tablero de Parqués"
    >
      {layout.map(({ row, col, cell }) => (
        <BoardCell
          key={`${row}-${col}`}
          cell={cell}
          style={gridAreaStyle(row, col, cell.colSpan ?? 1, cell.rowSpan ?? 1)}
        />
      ))}
    </div>
  );
}
