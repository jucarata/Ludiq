import type { CellData } from "@/lib/board/types";
import { isPathExitCell, isSafeCell, isStartCell } from "@/lib/board/cell-roles";
import { PLAYER_COLORS, VICTORY_COLOR } from "@/lib/board/types";

export function CellShell({
  children,
  className = "",
  style,
  gridStyle,
  clipPath,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  gridStyle?: React.CSSProperties;
  clipPath?: string;
}) {
  return (
    <div className="relative h-full w-full min-h-0 min-w-0" style={gridStyle}>
      <div
        className={`relative h-full w-full overflow-hidden rounded-[2px] ${className}`}
        style={{ ...style, clipPath }}
      >
        {children}
      </div>
    </div>
  );
}

export function getCellAppearance(cell: CellData): {
  className?: string;
  style?: React.CSSProperties;
} {
  if (isSafeCell(cell)) {
    return {
      style: {
        backgroundColor: PLAYER_COLORS[cell.safe.owner].dark,
      },
    };
  }
  if (isStartCell(cell) && cell.owner) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].dark } };
  }
  if (isPathExitCell(cell) && cell.owner) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].dark } };
  }
  if (cell.kind === "void" && cell.owner) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].fill } };
  }
  if (cell.kind === "decoration" && cell.owner) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].fill } };
  }
  if (cell.kind === "base" && cell.owner !== undefined) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].dark } };
  }
  if (cell.kind === "victory") {
    return { style: { backgroundColor: VICTORY_COLOR.fill } };
  }
  if (cell.kind === "center") {
    return {
      style: {
        backgroundColor: cell.owner
          ? PLAYER_COLORS[cell.owner].fill
          : "var(--board-path)",
      },
    };
  }
  if (cell.kind === "home" && cell.owner) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].fill } };
  }
  return { className: "bg-[var(--board-path)]" };
}
