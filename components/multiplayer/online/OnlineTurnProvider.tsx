"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAutoMode } from "@/components/game/AutoModeContext";
import { TurnContext } from "@/components/game/TurnContext";
import { useOnlineSession } from "@/components/multiplayer/online/OnlineSessionContext";
import type { PlayerColor } from "@/lib/board/types";
import { secondsLeftForTurn } from "@/lib/game/online-types";
import {
  TURN_ANNOUNCEMENT_MS,
  type TurnPhase,
} from "@/lib/game/turns";

/** If the client AFK mover stalls, server bot-move via advance-turn. */
const AFK_WATCHDOG_MS = 4000;

export function OnlineTurnProvider({ children }: { children: ReactNode }) {
  const { game, isMyTurn, postAdvanceTurn, turnAdvanceBlockedRef } =
    useOnlineSession();
  const { setAfkTakeover } = useAutoMode();
  const [timeLeft, setTimeLeft] = useState(() => secondsLeftForTurn(game));
  const [announcement, setAnnouncement] = useState<PlayerColor | null>(null);
  const [localPhase, setLocalPhase] = useState<TurnPhase | null>(null);
  const [advanceTick, setAdvanceTick] = useState(0);
  const prevTurnRef = useRef(game.currentTurn);
  const advancingRef = useRef(false);

  const turnPhase: TurnPhase =
    localPhase === "rolling" && game.turnPhase === "playing"
      ? "rolling"
      : game.turnPhase;

  useEffect(() => {
    setAfkTakeover(game.afkTakeover);
  }, [game.afkTakeover, setAfkTakeover]);

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

  /* Enter AFK / skip turn when the clock hits 0. */
  useEffect(() => {
    if (!isMyTurn || game.turnPhase === "ended" || game.winner) return;
    if (timeLeft > 0) return;
    if (advancingRef.current) return;
    if (localPhase === "rolling") return;
    if (game.afkTakeover) return;

    if (turnAdvanceBlockedRef.current) {
      const retry = setTimeout(() => setAdvanceTick((n) => n + 1), 200);
      return () => clearTimeout(retry);
    }

    advancingRef.current = true;
    void postAdvanceTurn()
      .catch(() => undefined)
      .finally(() => {
        advancingRef.current = false;
      });
  }, [
    advanceTick,
    game.afkTakeover,
    game.turnPhase,
    game.winner,
    isMyTurn,
    localPhase,
    postAdvanceTurn,
    timeLeft,
    turnAdvanceBlockedRef,
  ]);

  /*
   * AFK watchdog: if no game update lands within the window, ask the server
   * to execute the bot move (or end the turn).
   */
  useEffect(() => {
    if (!isMyTurn || !game.afkTakeover) return;
    if (game.turnPhase !== "deciding") return;

    const timeout = setTimeout(() => {
      if (advancingRef.current || turnAdvanceBlockedRef.current) return;
      advancingRef.current = true;
      void postAdvanceTurn()
        .catch(() => undefined)
        .finally(() => {
          advancingRef.current = false;
        });
    }, AFK_WATCHDOG_MS);

    return () => clearTimeout(timeout);
  }, [
    game.afkTakeover,
    game.turnPhase,
    game.version,
    isMyTurn,
    postAdvanceTurn,
    turnAdvanceBlockedRef,
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
    /* Server resets turn_started_at on non-AFK moves. */
  }, []);

  const advanceTurn = useCallback(() => {
    if (!isMyTurn || advancingRef.current) return;
    if (turnAdvanceBlockedRef.current) return;
    advancingRef.current = true;
    void postAdvanceTurn()
      .catch(() => undefined)
      .finally(() => {
        advancingRef.current = false;
      });
  }, [isMyTurn, postAdvanceTurn, turnAdvanceBlockedRef]);

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
