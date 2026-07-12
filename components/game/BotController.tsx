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

function diceKey(dice: number[] | null | undefined): string {
  return dice?.join(",") ?? "";
}

function piecesKey(pieces: PieceState[]): string {
  return pieces
    .map(
      (p) =>
        `${p.player}:${p.index}:${p.location}:${p.routeIndex ?? "-"}`,
    )
    .join("|");
}

/** Orquesta lanzamientos y movimientos automáticos para bots y humanos en modo auto */
export function BotController() {
  const { currentPlayer, turnPhase, timeLeft, advanceTurn } = useTurn();
  const isBot = useIsBot();
  const { isAutoEnabled, isAfkTakeover, setAfkTakeover } = useAutoMode();
  const online = useOptionalOnlineSession();
  const { canRoll, autoRollDice } = useDice();
  const { pieces, remainingDice, canInteractWithPieces, executeMove } =
    useGameState();
  const botRef = useRef(new ParquesBot());
  const executeMoveRef = useRef(executeMove);
  const advanceTurnRef = useRef(advanceTurn);

  executeMoveRef.current = executeMove;
  advanceTurnRef.current = advanceTurn;

  const currentIsBot = isBot(currentPlayer);
  const currentIsAutoHuman =
    !currentIsBot && isAutoEnabled(currentPlayer);
  const shouldAutoRoll = currentIsBot || currentIsAutoHuman;

  /* Online AFK is handled by OnlineGameStateProvider + server advance-turn. */
  const localAfk = !online && isAfkTakeover;

  useEffect(() => {
    if (online) return;
    setAfkTakeover(false);
  }, [currentPlayer, online, setAfkTakeover]);

  useEffect(() => {
    if (!shouldAutoRoll || turnPhase !== "playing" || !canRoll) return;

    const timeout = setTimeout(() => {
      autoRollDice();
    }, BOT_ROLL_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [shouldAutoRoll, turnPhase, canRoll, currentPlayer, autoRollDice]);

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

  /* CPU bots + local AFK humans. */
  useEffect(() => {
    if (online && !currentIsBot) return;
    if (!currentIsBot && !localAfk) return;
    if (!canInteractWithPieces || !remainingDice?.length) return;

    const decision = botRef.current.chooseMove(
      pieces,
      currentPlayer,
      remainingDice,
    );
    if (!decision) {
      if (localAfk) advanceTurnRef.current();
      return;
    }

    let cancelled = false;
    const moveDelay = getBotMoveDelayMs(pieces, currentPlayer);

    const timeout = setTimeout(() => {
      if (cancelled) return;
      const ok = executeMoveRef.current(decision);
      if (!ok && localAfk) advanceTurnRef.current();
    }, moveDelay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    online,
    currentIsBot,
    localAfk,
    canInteractWithPieces,
    diceKey(remainingDice),
    piecesKey(pieces),
    currentPlayer,
    remainingDice,
    pieces,
  ]);

  return null;
}
