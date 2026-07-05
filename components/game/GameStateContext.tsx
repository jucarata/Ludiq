"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTurn } from "@/components/game/TurnContext";
import type { PlayerColor } from "@/lib/board/types";
import {
  canMovePiece,
  consumeDice,
  getMoveOptions,
  MOVE_STEP_MS,
  resolveLanding,
  type DieMoveChoice,
  type MoveOption,
} from "@/lib/game/movement";
import { resolveRoll, type PostRollAction } from "@/lib/game/roll-resolution";
import {
  createInitialPieces,
  getFinishedPieces,
  getPiecesAtAnchor,
  getPiecesAtStart,
  hasPlayerWon,
  isPieceAtStartSlot,
  type PieceIndex,
  type PieceState,
} from "@/lib/game/pieces";

export interface SelectedPiece {
  player: PlayerColor;
  index: PieceIndex;
}

export interface MenuAnchor {
  x: number;
  y: number;
}

interface GameStateContextValue {
  pieces: PieceState[];
  remainingDice: number[] | null;
  selectedPiece: SelectedPiece | null;
  menuAnchor: MenuAnchor | null;
  canInteractWithPieces: boolean;
  winner: PlayerColor | null;
  getFinishedPieces: (player: PlayerColor) => PieceState[];
  handleRollResult: (
    player: PlayerColor,
    roll: [number, number],
  ) => PostRollAction;
  beginMovementPhase: (roll: [number, number]) => void;
  selectPiece: (piece: SelectedPiece, anchor: MenuAnchor) => void;
  clearSelection: () => void;
  getMoveOptionsForSelection: () => MoveOption[];
  applyMove: (choice: DieMoveChoice) => boolean;
  getPiecesAtStart: (player: PlayerColor) => PieceState[];
  getPiecesAtAnchor: (anchor: number, half?: 0 | 1) => PieceState[];
  isPieceAtStartSlot: (player: PlayerColor, slot: number) => boolean;
}

interface MoveAnimation {
  player: PlayerColor;
  index: PieceIndex;
  target: number;
  advanceAfter: boolean;
}

const GameStateContext = createContext<GameStateContextValue | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const { currentPlayer, turnPhase, advanceTurn, endGame } = useTurn();
  const [pieces, setPieces] = useState<PieceState[]>(createInitialPieces);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [remainingDice, setRemainingDice] = useState<number[] | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece | null>(
    null,
  );
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [animation, setAnimation] = useState<MoveAnimation | null>(null);
  const interactionRef = useRef({
    canInteract: false,
    currentPlayer: currentPlayer,
  });

  const canInteractWithPieces =
    turnPhase === "deciding" &&
    animation === null &&
    remainingDice !== null &&
    remainingDice.length > 0;

  interactionRef.current = {
    canInteract: canInteractWithPieces,
    currentPlayer,
  };

  useEffect(() => {
    setRemainingDice(null);
    setSelectedPiece(null);
    setMenuAnchor(null);
  }, [currentPlayer]);

  /** Avanza la ficha una casilla por tick — la ficha recorre el camino */
  useEffect(() => {
    if (!animation) return;

    const interval = setInterval(() => {
      setPieces((prev) =>
        prev.map((piece) =>
          piece.player === animation.player &&
          piece.index === animation.index &&
          piece.routeIndex !== undefined &&
          piece.routeIndex < animation.target
            ? { ...piece, routeIndex: piece.routeIndex + 1 }
            : piece,
        ),
      );
    }, MOVE_STEP_MS);

    return () => clearInterval(interval);
  }, [animation]);

  useEffect(() => {
    if (!animation) return;

    const piece = pieces.find(
      (p) => p.player === animation.player && p.index === animation.index,
    );

    if (!piece || piece.routeIndex === undefined) {
      setAnimation(null);
      return;
    }

    if (piece.routeIndex >= animation.target) {
      setAnimation(null);
      /*
       * Captura: enemigas en la casilla final (no SAFE/EXIT) vuelven a inicio.
       * Si la ficha cayó exacto en la casilla café, queda terminada (sale del
       * juego); con las 4 terminadas, el jugador gana y el juego se detiene.
       */
      const landed = resolveLanding(pieces, animation.player, animation.index);
      setPieces(landed);

      if (hasPlayerWon(landed, animation.player)) {
        setWinner(animation.player);
        endGame();
        return;
      }

      if (
        animation.advanceAfter &&
        interactionRef.current.currentPlayer === animation.player
      ) {
        advanceTurn();
      }
    }
  }, [pieces, animation, advanceTurn, endGame]);

  const handleRollResult = useCallback(
    (player: PlayerColor, roll: [number, number]): PostRollAction => {
      let resolution!: ReturnType<typeof resolveRoll>;

      setPieces((prev) => {
        resolution = resolveRoll(prev, player, roll);
        return resolution.nextPieces;
      });
      setSelectedPiece(null);
      setMenuAnchor(null);

      return resolution.action;
    },
    [],
  );

  const beginMovementPhase = useCallback((roll: [number, number]) => {
    setRemainingDice([...roll]);
    setSelectedPiece(null);
    setMenuAnchor(null);
  }, []);

  const selectPiece = useCallback(
    (piece: SelectedPiece, anchor: MenuAnchor) => {
      const { canInteract, currentPlayer: activePlayer } =
        interactionRef.current;
      if (!canInteract) return;
      if (piece.player !== activePlayer) return;
      setSelectedPiece(piece);
      setMenuAnchor(anchor);
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedPiece(null);
    setMenuAnchor(null);
  }, []);

  const getMoveOptionsForSelection = useCallback((): MoveOption[] => {
    if (!selectedPiece || !remainingDice?.length) return [];

    const piece = pieces.find(
      (p) =>
        p.player === selectedPiece.player && p.index === selectedPiece.index,
    );
    if (!piece) return [];

    return getMoveOptions(remainingDice).filter((option) =>
      canMovePiece(pieces, piece, option.choice.value),
    );
  }, [selectedPiece, remainingDice, pieces]);

  const applyMove = useCallback(
    (choice: DieMoveChoice): boolean => {
      if (!selectedPiece || !remainingDice?.length || animation) return false;

      const piece = pieces.find(
        (p) =>
          p.player === selectedPiece.player && p.index === selectedPiece.index,
      );
      if (!piece || piece.routeIndex === undefined) return false;

      const steps = choice.value;
      if (!canMovePiece(pieces, piece, steps)) return false;

      const nextRemaining = consumeDice(remainingDice, choice);
      setRemainingDice(nextRemaining.length > 0 ? nextRemaining : null);
      setSelectedPiece(null);
      setMenuAnchor(null);
      setAnimation({
        player: piece.player,
        index: piece.index,
        target: piece.routeIndex + steps,
        advanceAfter: nextRemaining.length === 0,
      });

      return true;
    },
    [selectedPiece, remainingDice, pieces, animation],
  );

  const value: GameStateContextValue = {
    pieces,
    remainingDice,
    selectedPiece,
    menuAnchor,
    canInteractWithPieces,
    winner,
    getFinishedPieces: (player) => getFinishedPieces(pieces, player),
    handleRollResult,
    beginMovementPhase,
    selectPiece,
    clearSelection,
    getMoveOptionsForSelection,
    applyMove,
    getPiecesAtStart: (player) => getPiecesAtStart(pieces, player),
    getPiecesAtAnchor: (anchor, half) =>
      getPiecesAtAnchor(pieces, anchor, half),
    isPieceAtStartSlot: (player, slot) =>
      isPieceAtStartSlot(pieces, player, slot),
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const value = useContext(GameStateContext);
  if (!value) {
    throw new Error("useGameState debe usarse dentro de GameStateProvider");
  }
  return value;
}
