"use client";

import { useEffect, useRef } from "react";
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

/** Orquesta lanzamientos y movimientos automáticos cuando le toca a un bot */
export function BotController() {
  const { currentPlayer, turnPhase } = useTurn();
  const isBot = useIsBot();
  const { canRoll, autoRollDice } = useDice();
  const { pieces, remainingDice, canInteractWithPieces, executeMove } =
    useGameState();
  const botRef = useRef(new ParquesBot());
  const actingRef = useRef(false);

  const currentIsBot = isBot(currentPlayer);

  useEffect(() => {
    if (!currentIsBot || turnPhase !== "playing" || !canRoll) return;

    const timeout = setTimeout(() => {
      autoRollDice();
    }, BOT_ROLL_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [currentIsBot, turnPhase, canRoll, currentPlayer, autoRollDice]);

  useEffect(() => {
    if (!currentIsBot || !canInteractWithPieces || !remainingDice?.length) {
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
    currentIsBot,
    canInteractWithPieces,
    remainingDice,
    pieces,
    currentPlayer,
    executeMove,
  ]);

  return null;
}
