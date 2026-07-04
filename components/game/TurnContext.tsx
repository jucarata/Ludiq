"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { PlayerColor } from "@/lib/board/types";
import {
  getPlayerAt,
  nextPlayerIndex,
  TURN_ANNOUNCEMENT_MS,
  TURN_DURATION_SECONDS,
} from "@/lib/game/turns";

interface TurnState {
  playerIndex: number;
  timeLeft: number;
}

type TurnAction = { type: "tick" };

interface TurnContextValue {
  currentPlayer: PlayerColor;
  timeLeft: number;
  announcement: PlayerColor | null;
}

const TurnContext = createContext<TurnContextValue | null>(null);

function turnReducer(state: TurnState, action: TurnAction): TurnState {
  if (action.type !== "tick") return state;

  if (state.timeLeft > 1) {
    return { ...state, timeLeft: state.timeLeft - 1 };
  }

  return {
    playerIndex: nextPlayerIndex(state.playerIndex),
    timeLeft: TURN_DURATION_SECONDS,
  };
}

export function TurnProvider({ children }: { children: ReactNode }) {
  const [{ playerIndex, timeLeft }, dispatch] = useReducer(turnReducer, {
    playerIndex: 0,
    timeLeft: TURN_DURATION_SECONDS,
  });
  const [announcement, setAnnouncement] = useState<PlayerColor | null>(
    getPlayerAt(0),
  );

  const currentPlayer = getPlayerAt(playerIndex);

  useEffect(() => {
    setAnnouncement(currentPlayer);
    const timeout = setTimeout(() => setAnnouncement(null), TURN_ANNOUNCEMENT_MS);
    return () => clearTimeout(timeout);
  }, [currentPlayer]);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: "tick" });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <TurnContext.Provider value={{ currentPlayer, timeLeft, announcement }}>
      {children}
    </TurnContext.Provider>
  );
}

export function useTurn() {
  const value = useContext(TurnContext);
  if (!value) {
    throw new Error("useTurn debe usarse dentro de TurnProvider");
  }
  return value;
}
