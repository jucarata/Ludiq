"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TurnContext } from "@/components/game/TurnContext";
import { useOnlineSession } from "@/components/multiplayer/online/OnlineSessionContext";
import type { PlayerColor } from "@/lib/board/types";
import { secondsLeftForTurn } from "@/lib/game/online-types";
import {
  TURN_ANNOUNCEMENT_MS,
  type TurnPhase,
} from "@/lib/game/turns";

export function OnlineTurnProvider({ children }: { children: ReactNode }) {
  const { game, isMyTurn, postAdvanceTurn } = useOnlineSession();
  const [timeLeft, setTimeLeft] = useState(() => secondsLeftForTurn(game));
  const [announcement, setAnnouncement] = useState<PlayerColor | null>(null);
  const [localPhase, setLocalPhase] = useState<TurnPhase | null>(null);
  const prevTurnRef = useRef(game.currentTurn);
  const advancingRef = useRef(false);

  const turnPhase: TurnPhase =
    localPhase === "rolling" && game.turnPhase === "playing"
      ? "rolling"
      : game.turnPhase;

  useEffect(() => {
    if (prevTurnRef.current !== game.currentTurn) {
      prevTurnRef.current = game.currentTurn;
      setAnnouncement(game.currentTurn);
      const timeout = setTimeout(
        () => setAnnouncement(null),
        TURN_ANNOUNCEMENT_MS,
      );
      return () => clearTimeout(timeout);
    }
  }, [game.currentTurn]);

  useEffect(() => {
    setLocalPhase(null);
  }, [game.version, game.currentTurn, game.turnPhase]);

  useEffect(() => {
    setTimeLeft(secondsLeftForTurn(game));
    const interval = setInterval(() => {
      setTimeLeft(secondsLeftForTurn(game));
    }, 250);
    return () => clearInterval(interval);
  }, [game]);

  useEffect(() => {
    if (!isMyTurn || game.turnPhase === "ended" || game.winner) return;
    if (timeLeft > 0) return;
    if (advancingRef.current) return;
    if (localPhase === "rolling") return;

    advancingRef.current = true;
    void postAdvanceTurn()
      .catch(() => undefined)
      .finally(() => {
        advancingRef.current = false;
      });
  }, [
    game.turnPhase,
    game.winner,
    isMyTurn,
    localPhase,
    postAdvanceTurn,
    timeLeft,
  ]);

  const pauseForDiceRoll = useCallback(() => {
    setLocalPhase("rolling");
  }, []);

  const resumePlaying = useCallback(() => {
    setLocalPhase(null);
  }, []);

  const startDecisionPhase = useCallback(() => {
    setLocalPhase(null);
  }, []);

  const extendDecisionTime = useCallback(() => {
    /* Server resets turn_started_at on moves. */
  }, []);

  const advanceTurn = useCallback(() => {
    if (!isMyTurn || advancingRef.current) return;
    advancingRef.current = true;
    void postAdvanceTurn()
      .catch(() => undefined)
      .finally(() => {
        advancingRef.current = false;
      });
  }, [isMyTurn, postAdvanceTurn]);

  const endGame = useCallback(() => {
    /* Winner is set by the server. */
  }, []);

  return (
    <TurnContext.Provider
      value={{
        currentPlayer: game.currentTurn,
        timeLeft,
        turnPhase,
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
