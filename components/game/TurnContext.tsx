"use client";

import {
  createContext,
  useCallback,
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
  TURN_DECISION_SECONDS,
  TURN_DURATION_SECONDS,
  type TurnPhase,
} from "@/lib/game/turns";

interface TurnState {
  playerIndex: number;
  timeLeft: number;
  phase: TurnPhase;
}

type TurnAction =
  | { type: "tick" }
  | { type: "pause_for_roll" }
  | { type: "start_decision" }
  | { type: "advance_turn" };

interface TurnContextValue {
  currentPlayer: PlayerColor;
  timeLeft: number;
  turnPhase: TurnPhase;
  announcement: PlayerColor | null;
  pauseForDiceRoll: () => void;
  startDecisionPhase: () => void;
  advanceTurn: () => void;
}

const TurnContext = createContext<TurnContextValue | null>(null);

function turnReducer(state: TurnState, action: TurnAction): TurnState {
  switch (action.type) {
    case "pause_for_roll":
      return { ...state, phase: "rolling" };

    case "start_decision":
      return {
        ...state,
        phase: "deciding",
        timeLeft: TURN_DECISION_SECONDS,
      };

    case "advance_turn":
      return {
        playerIndex: nextPlayerIndex(state.playerIndex),
        timeLeft: TURN_DURATION_SECONDS,
        phase: "playing",
      };

    case "tick":
      if (state.phase === "rolling") return state;

      if (state.timeLeft > 1) {
        return { ...state, timeLeft: state.timeLeft - 1 };
      }

      return {
        playerIndex: nextPlayerIndex(state.playerIndex),
        timeLeft: TURN_DURATION_SECONDS,
        phase: "playing",
      };

    default:
      return state;
  }
}

export function TurnProvider({ children }: { children: ReactNode }) {
  const [{ playerIndex, timeLeft, phase }, dispatch] = useReducer(turnReducer, {
    playerIndex: 0,
    timeLeft: TURN_DURATION_SECONDS,
    phase: "playing",
  });
  const [announcement, setAnnouncement] = useState<PlayerColor | null>(
    getPlayerAt(0),
  );

  const currentPlayer = getPlayerAt(playerIndex);

  const pauseForDiceRoll = useCallback(() => {
    dispatch({ type: "pause_for_roll" });
  }, []);

  const startDecisionPhase = useCallback(() => {
    dispatch({ type: "start_decision" });
  }, []);

  const advanceTurn = useCallback(() => {
    dispatch({ type: "advance_turn" });
  }, []);

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
    <TurnContext.Provider
      value={{
        currentPlayer,
        timeLeft,
        turnPhase: phase,
        announcement,
        pauseForDiceRoll,
        startDecisionPhase,
        advanceTurn,
      }}
    >
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
