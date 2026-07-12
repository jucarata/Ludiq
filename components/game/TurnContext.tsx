"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
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
import { useAutoMode } from "@/components/game/AutoModeContext";
import { useActivePlayers } from "@/components/game/PlayersContext";

interface TurnState {
  playerIndex: number;
  timeLeft: number;
  phase: TurnPhase;
}

type TurnAction =
  | { type: "tick"; holdOnExpiry?: boolean }
  | { type: "pause_for_roll" }
  | { type: "resume_playing" }
  | { type: "start_decision" }
  | { type: "extend_decision" }
  | { type: "advance_turn" }
  | { type: "end_game" };

interface TurnContextValue {
  currentPlayer: PlayerColor;
  timeLeft: number;
  turnPhase: TurnPhase;
  announcement: PlayerColor | null;
  pauseForDiceRoll: () => void;
  /** Vuelve a fase de tirada tras un intento de salida fallido */
  resumePlaying: () => void;
  startDecisionPhase: () => void;
  extendDecisionTime: () => void;
  advanceTurn: () => void;
  endGame: () => void;
}

const TurnContext = createContext<TurnContextValue | null>(null);

export { TurnContext };

function turnReducer(
  state: TurnState,
  action: TurnAction,
  activePlayers: PlayerColor[],
): TurnState {
  /* Juego terminado: se congela el estado de turnos */
  if (state.phase === "ended") return state;

  switch (action.type) {
    case "pause_for_roll":
      return { ...state, phase: "rolling" };

    case "resume_playing":
      return {
        ...state,
        phase: "playing",
        timeLeft: TURN_DURATION_SECONDS,
      };

    case "start_decision":
      return {
        ...state,
        phase: "deciding",
        timeLeft: TURN_DECISION_SECONDS,
      };

    case "extend_decision":
      if (state.phase !== "deciding") return state;
      return { ...state, timeLeft: TURN_DECISION_SECONDS };

    case "advance_turn":
      return {
        playerIndex: nextPlayerIndex(state.playerIndex, activePlayers),
        timeLeft: TURN_DURATION_SECONDS,
        phase: "playing",
      };

    case "end_game":
      return { ...state, phase: "ended" };

    case "tick":
      if (state.phase === "rolling") return state;

      if (state.timeLeft > 1) {
        return { ...state, timeLeft: state.timeLeft - 1 };
      }

      /*
       * Auto AFK hold: freeze at 0 during deciding so the bot can finish
       * moves without granting extra time or skipping the turn yet.
       */
      if (action.holdOnExpiry && state.phase === "deciding") {
        return { ...state, timeLeft: 0 };
      }

      return {
        playerIndex: nextPlayerIndex(state.playerIndex, activePlayers),
        timeLeft: TURN_DURATION_SECONDS,
        phase: "playing",
      };

    default:
      return state;
  }
}

export function TurnProvider({ children }: { children: ReactNode }) {
  const activePlayers = useActivePlayers();
  const { isAutoEnabled } = useAutoMode();
  const [{ playerIndex, timeLeft, phase }, dispatch] = useReducer(
    (state: TurnState, action: TurnAction) =>
      turnReducer(state, action, activePlayers),
    {
      playerIndex: 0,
      timeLeft: TURN_DURATION_SECONDS,
      phase: "playing",
    },
  );
  const [announcement, setAnnouncement] = useState<PlayerColor | null>(
    getPlayerAt(0, activePlayers),
  );

  const currentPlayer = getPlayerAt(playerIndex, activePlayers);
  const holdOnExpiryRef = useRef(
    phase === "deciding" && isAutoEnabled(currentPlayer),
  );
  holdOnExpiryRef.current =
    phase === "deciding" && isAutoEnabled(currentPlayer);

  const pauseForDiceRoll = useCallback(() => {
    dispatch({ type: "pause_for_roll" });
  }, []);

  const resumePlaying = useCallback(() => {
    dispatch({ type: "resume_playing" });
  }, []);

  const startDecisionPhase = useCallback(() => {
    dispatch({ type: "start_decision" });
  }, []);

  const extendDecisionTime = useCallback(() => {
    dispatch({ type: "extend_decision" });
  }, []);

  const advanceTurn = useCallback(() => {
    dispatch({ type: "advance_turn" });
  }, []);

  const endGame = useCallback(() => {
    dispatch({ type: "end_game" });
  }, []);

  useEffect(() => {
    setAnnouncement(currentPlayer);
    const timeout = setTimeout(() => setAnnouncement(null), TURN_ANNOUNCEMENT_MS);
    return () => clearTimeout(timeout);
  }, [currentPlayer]);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: "tick", holdOnExpiry: holdOnExpiryRef.current });
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
        resumePlaying,
        startDecisionPhase,
        extendDecisionTime,
        advanceTurn,
        endGame,
      }}
    >
      {children}
    </TurnContext.Provider>
  );
}

export function useTurn() {
  const value = useContext(TurnContext);
  if (!value) {
    throw new Error("useTurn must be used within TurnProvider");
  }
  return value;
}
