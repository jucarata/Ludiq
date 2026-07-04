"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { PlayerColor } from "@/lib/board/types";
import {
  createInitialPieces,
  exitAllPiecesFromStart,
  getPiecesAtPathExit,
  getPiecesAtStart,
  hasPiecesInStart,
  isDiceDoubles,
  isPieceAtStartSlot,
  type PieceState,
} from "@/lib/game/pieces";

interface GameStateContextValue {
  pieces: PieceState[];
  handleRollResult: (player: PlayerColor, roll: [number, number]) => void;
  getPiecesAtStart: (player: PlayerColor) => PieceState[];
  getPiecesAtPathExit: (player: PlayerColor) => PieceState[];
  isPieceAtStartSlot: (player: PlayerColor, slot: number) => boolean;
}

const GameStateContext = createContext<GameStateContextValue | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [pieces, setPieces] = useState<PieceState[]>(createInitialPieces);

  const handleRollResult = useCallback(
    (player: PlayerColor, roll: [number, number]) => {
      if (!isDiceDoubles(roll)) return;

      setPieces((prev) => {
        if (!hasPiecesInStart(prev, player)) return prev;
        return exitAllPiecesFromStart(prev, player);
      });
    },
    [],
  );

  const value: GameStateContextValue = {
    pieces,
    handleRollResult,
    getPiecesAtStart: (player) => getPiecesAtStart(pieces, player),
    getPiecesAtPathExit: (player) => getPiecesAtPathExit(pieces, player),
    isPieceAtStartSlot: (player, slot) =>
      isPieceAtStartSlot(pieces, player, slot),
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const value = useContext(GameStateContext);
  if (!value) {
    throw new Error("useGameState debe usarse dentro de GameStateProvider");
  }
  return value;
}
