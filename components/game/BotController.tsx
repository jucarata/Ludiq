"use client";

import { useEffect, useRef, useState } from "react";
import { useAutoMode } from "@/components/game/AutoModeContext";
import { useDice } from "@/components/dice/DiceContext";
import { useGameState } from "@/components/game/GameStateContext";
import { useIsBot } from "@/components/game/PlayersContext";
import { useTurn } from "@/components/game/TurnContext";
import { ParquesBot } from "@/lib/game/bot";
import type { PlayerColor } from "@/lib/board/types";
import type { PieceState } from "@/lib/game/pieces";

const BOT_ROLL_DELAY_MS = 1600;
const BOT_MOVE_DELAY_SINGLE_MS = 1000;
const BOT_MOVE_DELAY_MULTI_MS = 2000;
const AFK_TAKEOVER_THRESHOLD_SECONDS = 2;

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
  const { currentPlayer, turnPhase, timeLeft, extendDecisionTime } = useTurn();
  const isBot = useIsBot();
  const { isAutoEnabled } = useAutoMode();
  const { canRoll, autoRollDice } = useDice();
  const { pieces, remainingDice, canInteractWithPieces, executeMove } =
    useGameState();
  const botRef = useRef(new ParquesBot());
  const actingRef = useRef(false);
  const [afkTakeover, setAfkTakeover] = useState(false);

  const currentIsBot = isBot(currentPlayer);
  const currentIsAutoHuman =
    !currentIsBot && isAutoEnabled(currentPlayer);
  const shouldAutoRoll = currentIsBot || currentIsAutoHuman;
  const shouldBotMove = currentIsBot || afkTakeover;

  useEffect(() => {
    setAfkTakeover(false);
    actingRef.current = false;
  }, [currentPlayer]);

  useEffect(() => {
    if (!shouldAutoRoll || turnPhase !== "playing" || !canRoll) return;

    const timeout = setTimeout(() => {
      autoRollDice();
    }, BOT_ROLL_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [shouldAutoRoll, turnPhase, canRoll, currentPlayer, autoRollDice]);

  useEffect(() => {
    if (currentIsBot || !currentIsAutoHuman) return;
    if (turnPhase !== "deciding" || !canInteractWithPieces) return;
    if (!remainingDice?.length) return;
    if (timeLeft > AFK_TAKEOVER_THRESHOLD_SECONDS) return;
    if (afkTakeover) return;

    setAfkTakeover(true);
    extendDecisionTime();
  }, [
    currentIsBot,
    currentIsAutoHuman,
    turnPhase,
    canInteractWithPieces,
    remainingDice,
    timeLeft,
    afkTakeover,
    extendDecisionTime,
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
    afkTakeover,
  ]);

  return null;
}
