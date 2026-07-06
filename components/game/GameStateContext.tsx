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
import { useActivePlayers, useIsBot } from "@/components/game/PlayersContext";
import type { PlayerColor } from "@/lib/board/types";
import {
  canMovePiece,
  consumeDice,
  getAutoMoveValue,
  getMoveOptions,
  hasAnyValidMove,
  MOVE_STEP_MS,
  resolveLanding,
  type DieMoveChoice,
  type MoveOption,
} from "@/lib/game/movement";
import type { BotMoveDecision } from "@/lib/game/bot";
import { resolveRoll, type PostRollAction } from "@/lib/game/roll-resolution";
import {
  FINISH_CELEBRATION_MS,
  type CelebrationState,
} from "@/lib/game/celebration";
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
  celebration: CelebrationState | null;
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
  executeMove: (decision: BotMoveDecision) => boolean;
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
  const activePlayers = useActivePlayers();
  const isBot = useIsBot();
  const { currentPlayer, turnPhase, advanceTurn, endGame } = useTurn();
  const [pieces, setPieces] = useState<PieceState[]>(() =>
    createInitialPieces(activePlayers),
  );
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [celebration, setCelebration] = useState<CelebrationState | null>(
    null,
  );
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

  /** La celebración dura 2 s y se limpia sola */
  useEffect(() => {
    if (!celebration) return;
    const timeout = setTimeout(
      () => setCelebration(null),
      FINISH_CELEBRATION_MS,
    );
    return () => clearTimeout(timeout);
  }, [celebration]);

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

      /* La ficha llegó a la casilla café → ráfaga de celebración */
      const mover = landed.find(
        (p) => p.player === animation.player && p.index === animation.index,
      );
      if (mover?.location === "finished") {
        setCelebration({ player: animation.player, key: Date.now() });
      }

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

  const movePiece = useCallback(
    (target: SelectedPiece, choice: DieMoveChoice): boolean => {
      if (!remainingDice?.length || animation) return false;

      const piece = pieces.find(
        (p) => p.player === target.player && p.index === target.index,
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
    [remainingDice, pieces, animation],
  );

  /*
   * Ninguna ficha puede mover los valores restantes (p. ej. tras gastar el
   * primer dado): se pierde el resto del turno de inmediato.
   */
  useEffect(() => {
    if (!canInteractWithPieces || !remainingDice?.length) return;
    if (hasAnyValidMove(pieces, currentPlayer, remainingDice)) return;

    setRemainingDice(null);
    setSelectedPiece(null);
    setMenuAnchor(null);
    advanceTurn();
  }, [canInteractWithPieces, remainingDice, pieces, currentPlayer, advanceTurn]);

  /*
   * Una sola ficha en juego (las demás en inicio o terminadas): se mueve sola
   * todo lo que se pueda. Si mover ambos valores es imposible y cada uno es
   * jugable por separado, la elección queda en manos del usuario.
   */
  useEffect(() => {
    if (!canInteractWithPieces || !remainingDice?.length) return;
    if (isBot(currentPlayer)) return;

    const routePieces = pieces.filter(
      (p) => p.player === currentPlayer && p.location === "route",
    );
    if (routePieces.length !== 1) return;

    const piece = routePieces[0];
    const value = getAutoMoveValue(pieces, piece, remainingDice);
    if (value === null) return;

    movePiece({ player: piece.player, index: piece.index }, { value });
  }, [
    canInteractWithPieces,
    remainingDice,
    pieces,
    currentPlayer,
    movePiece,
    isBot,
  ]);

  const selectPiece = useCallback(
    (piece: SelectedPiece, anchor: MenuAnchor) => {
      const { canInteract, currentPlayer: activePlayer } =
        interactionRef.current;
      if (!canInteract) return;
      if (piece.player !== activePlayer) return;

      /* Queda un solo valor por mover: se aplica directo, sin menú */
      if (remainingDice?.length === 1) {
        if (movePiece(piece, { value: remainingDice[0] })) return;
      }

      setSelectedPiece(piece);
      setMenuAnchor(anchor);
    },
    [remainingDice, movePiece],
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
      if (!selectedPiece) return false;
      return movePiece(selectedPiece, choice);
    },
    [selectedPiece, movePiece],
  );

  const executeMove = useCallback(
    (decision: BotMoveDecision): boolean => {
      return movePiece(
        { player: decision.player, index: decision.index },
        decision.choice,
      );
    },
    [movePiece],
  );

  const value: GameStateContextValue = {
    pieces,
    remainingDice,
    selectedPiece,
    menuAnchor,
    canInteractWithPieces,
    winner,
    celebration,
    getFinishedPieces: (player) => getFinishedPieces(pieces, player),
    handleRollResult,
    beginMovementPhase,
    selectPiece,
    clearSelection,
    getMoveOptionsForSelection,
    applyMove,
    executeMove,
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
