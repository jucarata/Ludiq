import { buildBoardLayout, BOARD_SIZE } from "@/lib/board/layout";
import { BoardCell } from "./BoardCell";

const layout = buildBoardLayout();

export function ParquesBoard() {
  const boardSize = "min(calc(100dvw - 2rem), calc(100dvh - 2rem))";

  return (
    <div
      className="grid shrink-0 gap-[2px] rounded-2xl border-[6px] border-[#d4c5a0] bg-[#d4c5a0] p-[2px] shadow-2xl"
      style={{
        width: boardSize,
        height: boardSize,
        gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
      }}
      role="img"
      aria-label="Tablero de Parqués"
    >
      {layout.flatMap((row, r) =>
        row.map((cell, c) => (
          <BoardCell key={`${r}-${c}`} cell={cell} />
        )),
      )}
    </div>
  );
}
