"use client";

import { useEffect, useRef } from "react";
import { useAutoMode } from "@/components/game/AutoModeContext";
import { useDice } from "@/components/dice/DiceContext";
import { useGameState } from "@/components/game/GameStateContext";
import { useIsBot } from "@/components/game/PlayersContext";
import { useTurn } from "@/components/game/TurnContext";
import { useOptionalOnlineSession } from "@/components/multiplayer/online/OnlineSessionContext";
import { ParquesBot } from "@/lib/game/bot";
import type { PlayerColor } from "@/lib/board/types";
import type { PieceState } from "@/lib/game/pieces";

const BOT_ROLL_DELAY_MS = 1600;
const BOT_MOVE_DELAY_SINGLE_MS = 1000;
const BOT_MOVE_DELAY_MULTI_MS = 2000;

function getBotMoveDelayMs(
  pieces: PieceState[],
  player: PlayerColor,
): number {
  const routePieces = pieces.filter(
    (p) => p.player === player && p.location === "route",
  );
  return routePieces.length <= 1
    ? BOT_MOVE_DELAY_SINGLE_MS
    : BOT_MOVE_DELAY_MULTI_MS;
}

/** Orquesta lanzamientos y movimientos automáticos para bots y humanos en modo auto */
export function BotController() {
  const { currentPlayer, turnPhase, timeLeft } = useTurn();
  const isBot = useIsBot();
  const { isAutoEnabled, isAfkTakeover, setAfkTakeover } = useAutoMode();
  const online = useOptionalOnlineSession();
  const { canRoll, autoRollDice } = useDice();
  const { pieces, remainingDice, canInteractWithPieces, executeMove } =
    useGameState();
  const botRef = useRef(new ParquesBot());
  const actingRef = useRef(false);

  const currentIsBot = isBot(currentPlayer);
  const currentIsAutoHuman =
    !currentIsBot && isAutoEnabled(currentPlayer);
  const shouldAutoRoll = currentIsBot || currentIsAutoHuman;
  const shouldBotMove = currentIsBot || isAfkTakeover;

  useEffect(() => {
    if (online) return;
    setAfkTakeover(false);
    actingRef.current = false;
  }, [currentPlayer, online, setAfkTakeover]);

  useEffect(() => {
    if (!shouldAutoRoll || turnPhase !== "playing" || !canRoll) return;

    const timeout = setTimeout(() => {
      autoRollDice();
    }, BOT_ROLL_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [shouldAutoRoll, turnPhase, canRoll, currentPlayer, autoRollDice]);

  /*
   * Local Auto AFK: when the decision timer hits 0, take over without adding
   * time. Online AFK is set by the server (game.afkTakeover) instead.
   */
  useEffect(() => {
    if (online) return;
    if (currentIsBot || !currentIsAutoHuman) return;
    if (turnPhase !== "deciding") return;
    if (!remainingDice?.length) return;
    if (timeLeft > 0) return;
    if (isAfkTakeover) return;

    setAfkTakeover(true);
  }, [
    online,
    currentIsBot,
    currentIsAutoHuman,
    turnPhase,
    remainingDice,
    timeLeft,
    isAfkTakeover,
    setAfkTakeover,
  ]);

  useEffect(() => {
    if (!shouldBotMove || !canInteractWithPieces || !remainingDice?.length) {
      actingRef.current = false;
      return;
    }

    if (actingRef.current) return;

    const decision = botRef.current.chooseMove(
      pieces,
      currentPlayer,
      remainingDice,
    );
    if (!decision) return;

    actingRef.current = true;

    const moveDelay = getBotMoveDelayMs(pieces, currentPlayer);

    const timeout = setTimeout(() => {
      executeMove(decision);
      actingRef.current = false;
    }, moveDelay);

    return () => {
      clearTimeout(timeout);
      actingRef.current = false;
    };
  }, [
    shouldBotMove,
    canInteractWithPieces,
    remainingDice,
    pieces,
    currentPlayer,
    executeMove,
  ]);

  return null;
}
