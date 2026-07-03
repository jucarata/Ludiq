import type { CellData } from "@/lib/board/types";

/** Contenido central de una celda (SAFE, etc.) */
export function CellContent({ cell }: { cell: CellData }) {
  if (cell.kind === "safe" && cell.owner) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span
          className="select-none font-extrabold text-white"
          style={{ fontSize: "clamp(2px, 1.2vmin, 6px)" }}
        >
          SAFE
        </span>
      </div>
    );
  }

  return null;
}
