import { getRouteCell, getVictoryRouteIndex } from "@/lib/board/player-path";
import { isProtectedAnchor } from "@/lib/board/cell-placements";
import type { PlayerColor } from "@/lib/board/types";
import {
  canMovePiece,
  canMovePieceSequence,
  consumeDice,
  getAutoMoveValue,
  getDestinationRouteIndex,
  resolveLanding,
  type DieMoveChoice,
} from "@/lib/game/movement";
import {
  getPiecesAtRouteCell,
  type PieceIndex,
  type PieceState,
} from "@/lib/game/pieces";

export interface BotMoveDecision {
  player: PlayerColor;
  index: PieceIndex;
  choice: DieMoveChoice;
}

/** Pesos de prioridad — ajustables para cambiar la estrategia del bot */
export interface BotStrategyWeights {
  capture: number;
  safeZone: number;
  victory: number;
  progress: number;
  sequenceBonus: number;
}

const DEFAULT_WEIGHTS: BotStrategyWeights = {
  capture: 1000,
  safeZone: 500,
  victory: 2000,
  progress: 10,
  sequenceBonus: 0.5,
};

/**
 * Bot de Parqués con heurísticas configurables.
 * Evalúa capturas, zonas seguras, victoria y avance en el recorrido.
 */
export class ParquesBot {
  constructor(private readonly weights: BotStrategyWeights = DEFAULT_WEIGHTS) {}

  chooseMove(
    pieces: PieceState[],
    player: PlayerColor,
    remainingDice: number[],
  ): BotMoveDecision | null {
    const routePieces = pieces.filter(
      (p) => p.player === player && p.location === "route",
    );
    if (routePieces.length === 0) return null;

    if (routePieces.length === 1) {
      const autoValue = getAutoMoveValue(
        pieces,
        routePieces[0],
        remainingDice,
      );
      if (autoValue !== null) {
        return {
          player: routePieces[0].player,
          index: routePieces[0].index,
          choice: { value: autoValue },
        };
      }
    }

    let best: BotMoveDecision | null = null;
    let bestScore = -Infinity;

    for (const piece of routePieces) {
      const uniqueValues = [...new Set(remainingDice)];

      for (const value of uniqueValues) {
        if (!canMovePiece(pieces, piece, value)) continue;

        let score = this.scoreMove(pieces, piece, value, player);

        if (remainingDice.length === 2) {
          const afterFirst = this.simulateMove(pieces, piece, value);
          const nextDice = consumeDice(remainingDice, { value });

          if (
            nextDice.length > 0 &&
            canMovePieceSequence(afterFirst, piece, remainingDice)
          ) {
            score += this.weights.sequenceBonus * 50;
          }

          const lookahead = this.chooseMove(afterFirst, player, nextDice);
          if (lookahead) {
            const nextPiece = afterFirst.find(
              (p) =>
                p.player === lookahead.player && p.index === lookahead.index,
            );
            if (nextPiece) {
              score +=
                this.weights.sequenceBonus *
                this.scoreMove(
                  afterFirst,
                  nextPiece,
                  lookahead.choice.value,
                  player,
                );
            }
          }
        }

        if (score > bestScore) {
          bestScore = score;
          best = {
            player: piece.player,
            index: piece.index,
            choice: { value },
          };
        }
      }
    }

    return best;
  }

  private scoreMove(
    pieces: PieceState[],
    piece: PieceState,
    steps: number,
    player: PlayerColor,
  ): number {
    const destination = getDestinationRouteIndex(piece, steps);
    if (destination === null) return -Infinity;

    let score = destination * this.weights.progress;

    if (destination === getVictoryRouteIndex(player)) {
      score += this.weights.victory;
      return score;
    }

    const destinationCell = getRouteCell(player, destination)!;

    if (isProtectedAnchor(destinationCell.anchor)) {
      score += this.weights.safeZone;
    } else {
      const victims = getPiecesAtRouteCell(pieces, destinationCell).filter(
        (other) => other.player !== player,
      );
      score += victims.length * this.weights.capture;
    }

    return score;
  }

  private simulateMove(
    pieces: PieceState[],
    piece: PieceState,
    steps: number,
  ): PieceState[] {
    const destination = piece.routeIndex! + steps;
    const moved = pieces.map((p) =>
      p.player === piece.player && p.index === piece.index
        ? { ...p, routeIndex: destination }
        : p,
    );
    return resolveLanding(moved, piece.player, piece.index);
  }
}
