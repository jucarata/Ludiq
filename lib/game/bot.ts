import { getRouteCell, getVictoryRouteIndex } from "@/lib/board/player-path";
import { isProtectedAnchor } from "@/lib/board/cell-placements";
import type { PlayerColor } from "@/lib/board/types";
import {
  canMovePiece,
  consumeDice,
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

/**
 * Calidad de un movimiento con prioridad estricta:
 * 1. Victoria (meta)
 * 2. Captura rival
 * 3. Aterrizar en casilla segura (SAFE / EXIT)
 * 4. Avanzar lo máximo posible (más pasos, luego más lejos en el recorrido)
 */
interface MoveQuality {
  isVictory: boolean;
  captures: number;
  landsSafe: boolean;
  steps: number;
  destination: number;
}

const NO_MOVE: MoveQuality = {
  isVictory: false,
  captures: 0,
  landsSafe: false,
  steps: 0,
  destination: -1,
};

function isBetterMove(a: MoveQuality, b: MoveQuality): boolean {
  if (a.isVictory !== b.isVictory) return a.isVictory;
  if (a.captures !== b.captures) return a.captures > b.captures;
  if (a.landsSafe !== b.landsSafe) return a.landsSafe;
  if (a.steps !== b.steps) return a.steps > b.steps;
  return a.destination > b.destination;
}

function mergeSequenceQuality(
  first: MoveQuality,
  second: MoveQuality,
): MoveQuality {
  return {
    isVictory: first.isVictory || second.isVictory,
    captures: first.captures + second.captures,
    landsSafe: second.landsSafe,
    steps: first.steps + second.steps,
    destination: second.destination,
  };
}

/**
 * Bot de Parqués con prioridades en orden estricto.
 * Puede mover varias fichas en un turno: elige un movimiento por llamada
 * y vuelve a evaluar con los dados restantes.
 */
export class ParquesBot {
  chooseMove(
    pieces: PieceState[],
    player: PlayerColor,
    remainingDice: number[],
  ): BotMoveDecision | null {
    const routePieces = pieces.filter(
      (p) => p.player === player && p.location === "route",
    );
    if (routePieces.length === 0) return null;

    let best: BotMoveDecision | null = null;
    let bestQuality = NO_MOVE;

    for (const piece of routePieces) {
      for (const value of [...new Set(remainingDice)]) {
        if (!canMovePiece(pieces, piece, value)) continue;

        const quality = this.evaluateOption(
          pieces,
          piece,
          value,
          player,
          remainingDice,
        );

        if (isBetterMove(quality, bestQuality)) {
          bestQuality = quality;
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

  /** Evalúa un movimiento y, si queda un dado encadenable en la misma ficha, la secuencia completa. */
  private evaluateOption(
    pieces: PieceState[],
    piece: PieceState,
    value: number,
    player: PlayerColor,
    remainingDice: number[],
  ): MoveQuality {
    let quality = this.evaluateMove(pieces, piece, value, player);

    if (remainingDice.length <= 1) return quality;

    const afterFirst = this.simulateMove(pieces, piece, value);
    const nextDice = consumeDice(remainingDice, { value });
    const movedPiece = afterFirst.find(
      (p) => p.player === piece.player && p.index === piece.index,
    );
    if (!movedPiece || movedPiece.location !== "route") return quality;

    for (const second of [...new Set(nextDice)]) {
      if (!canMovePiece(afterFirst, movedPiece, second)) continue;

      const secondQuality = this.evaluateMove(
        afterFirst,
        movedPiece,
        second,
        player,
      );
      const sequenceQuality = mergeSequenceQuality(quality, secondQuality);

      if (isBetterMove(sequenceQuality, quality)) {
        quality = sequenceQuality;
      }
    }

    return quality;
  }

  private evaluateMove(
    pieces: PieceState[],
    piece: PieceState,
    steps: number,
    player: PlayerColor,
  ): MoveQuality {
    const destination = getDestinationRouteIndex(piece, steps);
    if (destination === null) return NO_MOVE;

    if (destination === getVictoryRouteIndex(player)) {
      return {
        isVictory: true,
        captures: 0,
        landsSafe: false,
        steps,
        destination,
      };
    }

    const destinationCell = getRouteCell(player, destination)!;
    const landsSafe = isProtectedAnchor(destinationCell.anchor);

    let captures = 0;
    if (!landsSafe) {
      captures = getPiecesAtRouteCell(pieces, destinationCell).filter(
        (other) => other.player !== player,
      ).length;
    }

    return {
      isVictory: false,
      captures,
      landsSafe,
      steps,
      destination,
    };
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
