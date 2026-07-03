import type { CellData } from "@/lib/board/types";
import { isSafeMovementCell } from "@/lib/board/cell-roles";
import { PLAYER_COLORS, VICTORY_COLOR } from "@/lib/board/types";
import type { TriangleCorner } from "@/lib/board/cell-shapes";

const LABEL_POSITION: Record<TriangleCorner, string> = {
  "upper-left": "top-[8%] left-[10%]",
  "upper-right": "top-[8%] right-[10%] left-auto",
  "lower-left": "bottom-[8%] left-[10%] top-auto",
  "lower-right": "bottom-[8%] right-[10%] top-auto left-auto",
};

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
        className={`relative h-full w-full rounded-[2px] ${className}`}
        style={{ ...style, clipPath }}
      >
        {children}
      </div>
    </div>
  );
}

export function GridNumber({
  n,
  dark = false,
  labelCorner = "upper-left",
}: {
  n: number;
  dark?: boolean;
  labelCorner?: TriangleCorner;
}) {
  return (
    <span
      className={`pointer-events-none absolute ${LABEL_POSITION[labelCorner]} z-10 select-none font-bold leading-none ${
        dark ? "text-[#5c4a3a]" : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
      }`}
      style={{ fontSize: "clamp(3px, 1.5vmin, 8px)" }}
    >
      {n}
    </span>
  );
}

export function isDarkLabel(cell: CellData): boolean {
  if (isSafeMovementCell(cell)) return false;
  return cell.kind === "path" || (cell.kind === "center" && !cell.owner);
}

export function getCellAppearance(cell: CellData): {
  className?: string;
  style?: React.CSSProperties;
} {
  if (isSafeMovementCell(cell)) {
    return {
      style: {
        backgroundColor: PLAYER_COLORS[cell.movement.safeOwner].fill,
      },
    };
  }
  if (cell.kind === "void" && cell.owner) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].fill } };
  }
  if (cell.kind === "decoration" && cell.owner) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].fill } };
  }
  if (cell.kind === "start" && cell.owner) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].dark } };
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
