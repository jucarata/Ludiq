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

/** Delay between AFK bot moves (server-executed). */
const AFK_BOT_GAP_MS = 1600;

export function OnlineTurnProvider({ children }: { children: ReactNode }) {
  const { game, isMyTurn, postAdvanceTurn, turnAdvanceBlockedRef } =
    useOnlineSession();
  const { isAutoEnabled, setAfkTakeover } = useAutoMode();
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

  /*
   * Timeout / AFK pump: while the clock is expired (or AFK is active) keep
   * calling advance-turn until the turn actually changes. The server either
   * plays the bot move (auto) or skips. Never single-shot — retries survive
   * network blips and stale turnAdvanceBlockedRef locks.
   */
  useEffect(() => {
    if (!isMyTurn || game.turnPhase === "ended" || game.winner) return;
    if (localPhase === "rolling") return;
    if (game.turnPhase !== "deciding" && game.turnPhase !== "playing") return;

    const expired = timeLeft <= 0 || game.afkTakeover;
    if (!expired) return;

    const auto = isAutoEnabled(game.currentTurn);
    let cancelled = false;

    const pump = () => {
      if (cancelled || advancingRef.current) return;
      /* Stale optimistic locks must not block timeout forever. */
      turnAdvanceBlockedRef.current = false;
      advancingRef.current = true;
      void postAdvanceTurn({ autoEnabled: auto })
        .catch(() => undefined)
        .finally(() => {
          advancingRef.current = false;
        });
    };

    const firstDelay = game.afkTakeover || auto ? AFK_BOT_GAP_MS : 120;
    const first = setTimeout(pump, firstDelay);
    const interval = setInterval(pump, AFK_BOT_GAP_MS);

    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [
    game.afkTakeover,
    game.currentTurn,
    game.turnPhase,
    game.version,
    game.winner,
    isAutoEnabled,
    isMyTurn,
    localPhase,
    postAdvanceTurn,
    timeLeft,
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
    turnAdvanceBlockedRef.current = false;
    advancingRef.current = true;
    void postAdvanceTurn({
      autoEnabled: isAutoEnabled(game.currentTurn),
    })
      .catch(() => undefined)
      .finally(() => {
        advancingRef.current = false;
      });
  }, [
    game.currentTurn,
    isAutoEnabled,
    isMyTurn,
    postAdvanceTurn,
    turnAdvanceBlockedRef,
  ]);

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
