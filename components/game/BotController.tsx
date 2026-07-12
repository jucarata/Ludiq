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
const AFK_FAIL_RETRY_MS = 500;

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
  const piecesRef = useRef(pieces);
  const remainingDiceRef = useRef(remainingDice);

  executeMoveRef.current = executeMove;
  advanceTurnRef.current = advanceTurn;
  piecesRef.current = pieces;
  remainingDiceRef.current = remainingDice;

  const currentIsBot = isBot(currentPlayer);
  const currentIsAutoHuman =
    !currentIsBot && isAutoEnabled(currentPlayer);

  /* Online AFK is authoritative on the shared game row. */
  const afkTakeover = online ? online.game.afkTakeover : isAfkTakeover;
  const isTurnOwnerOnline =
    !online ||
    (online.isMyTurn && online.selfColor === online.game.currentTurn);

  const shouldAutoRoll = currentIsBot || currentIsAutoHuman;

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

  /* CPU bots (local) — not AFK humans. */
  useEffect(() => {
    if (afkTakeover) return;
    if (!currentIsBot || !canInteractWithPieces || !remainingDice?.length) {
      return;
    }

    const decision = botRef.current.chooseMove(
      pieces,
      currentPlayer,
      remainingDice,
    );
    if (!decision) return;

    const moveDelay = getBotMoveDelayMs(pieces, currentPlayer);
    let cancelled = false;

    const timeout = setTimeout(() => {
      if (cancelled) return;
      executeMoveRef.current(decision);
    }, moveDelay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    afkTakeover,
    currentIsBot,
    canInteractWithPieces,
    diceKey(remainingDice),
    piecesKey(pieces),
    currentPlayer,
    remainingDice,
    pieces,
  ]);

  /*
   * AFK takeover loop (local + online turn owner).
   * Uses refs for executeMove so re-renders don't cancel the thinking delay.
   * Retries if executeMove fails instead of freezing the turn at 0.
   */
  useEffect(() => {
    if (!afkTakeover || !isTurnOwnerOnline) return;
    if (turnPhase !== "deciding") return;
    if (!canInteractWithPieces) return;

    const dice = remainingDiceRef.current;
    if (!dice?.length) {
      advanceTurnRef.current();
      return;
    }

    const board = piecesRef.current;
    const decision = botRef.current.chooseMove(board, currentPlayer, dice);
    if (!decision) {
      advanceTurnRef.current();
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const moveDelay = getBotMoveDelayMs(board, currentPlayer);

    const attempt = () => {
      if (cancelled) return;
      const ok = executeMoveRef.current(decision);
      if (!ok && !cancelled) {
        timeoutId = setTimeout(attempt, AFK_FAIL_RETRY_MS);
      }
    };

    timeoutId = setTimeout(attempt, moveDelay);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    afkTakeover,
    isTurnOwnerOnline,
    turnPhase,
    canInteractWithPieces,
    diceKey(remainingDice),
    piecesKey(pieces),
    currentPlayer,
  ]);

  return null;
}
