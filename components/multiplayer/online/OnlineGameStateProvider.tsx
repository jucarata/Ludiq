"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GameStateContext } from "@/components/game/GameStateContext";
import type {
  MenuAnchor,
  SelectedPiece,
} from "@/components/game/GameStateContext";
import { useTurn } from "@/components/game/TurnContext";
import { useOnlineSession } from "@/components/multiplayer/online/OnlineSessionContext";
import type { PlayerColor } from "@/lib/board/types";
import type { BotMoveDecision } from "@/lib/game/bot";
import {
  FINISH_CELEBRATION_MS,
  type CelebrationState,
} from "@/lib/game/celebration";
import {
  canMovePiece,
  consumeDice,
  getAutoMoveValue,
  getMoveOptions,
  MOVE_STEP_MS,
  resolveLanding,
  type DieMoveChoice,
  type MoveOption,
} from "@/lib/game/movement";
import type { PostRollAction } from "@/lib/game/roll-resolution";
import { playCaptureSound, playPieceStepSound } from "@/lib/game/sounds";
import {
  getFinishedPieces,
  getPiecesAtAnchor,
  getPiecesAtStart,
  isPieceAtStartSlot,
  type PieceIndex,
  type PieceState,
} from "@/lib/game/pieces";

interface MoveAnimation {
  player: PlayerColor;
  index: PieceIndex;
  from: number;
  target: number;
}

export function OnlineGameStateProvider({ children }: { children: ReactNode }) {
  const { game, selfColor, isMyTurn, postMove, applyGame } = useOnlineSession();
  const { currentPlayer, turnPhase, extendDecisionTime } = useTurn();
  const [displayPieces, setDisplayPieces] = useState<PieceState[]>(game.pieces);
  const [optimisticDice, setOptimisticDice] = useState<number[] | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece | null>(
    null,
  );
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [animation, setAnimation] = useState<MoveAnimation | null>(null);
  const [pendingServerPieces, setPendingServerPieces] = useState<
    PieceState[] | null
  >(null);
  const movingRef = useRef(false);
  const lastSyncedVersion = useRef(game.version);
  const postChainRef = useRef(Promise.resolve());
  const piecesBeforeMoveRef = useRef<PieceState[]>(game.pieces);
  const diceBeforeMoveRef = useRef<number[] | null>(game.remainingDice);

  const remainingDice = optimisticDice ?? game.remainingDice;
  const winner = game.winner;

  useEffect(() => {
    if (animation || movingRef.current) return;
    if (game.version < lastSyncedVersion.current) return;

    lastSyncedVersion.current = game.version;
    setDisplayPieces(game.pieces);
    setOptimisticDice(null);
    setSelectedPiece(null);
    setMenuAnchor(null);
  }, [game.pieces, game.version, game.remainingDice, animation]);

  useEffect(() => {
    if (!celebration) return;
    const timeout = setTimeout(
      () => setCelebration(null),
      FINISH_CELEBRATION_MS,
    );
    return () => clearTimeout(timeout);
  }, [celebration]);

  useEffect(() => {
    if (winner) {
      setCelebration({ player: winner, key: Date.now() });
    }
  }, [winner]);

  const canInteractWithPieces =
    turnPhase === "deciding" &&
    animation === null &&
    remainingDice !== null &&
    remainingDice.length > 0 &&
    !movingRef.current;

  const canHumanInteractWithPieces =
    canInteractWithPieces && isMyTurn && currentPlayer === selfColor;

  useEffect(() => {
    if (!animation) return;

    const interval = setInterval(() => {
      setDisplayPieces((prev) => {
        const moving = prev.find(
          (piece) =>
            piece.player === animation.player &&
            piece.index === animation.index,
        );

        if (
          !moving ||
          moving.routeIndex === undefined ||
          moving.routeIndex >= animation.target
        ) {
          return prev;
        }

        playPieceStepSound();

        return prev.map((piece) =>
          piece.player === animation.player &&
          piece.index === animation.index &&
          piece.routeIndex !== undefined &&
          piece.routeIndex < animation.target
            ? { ...piece, routeIndex: piece.routeIndex + 1 }
            : piece,
        );
      });
    }, MOVE_STEP_MS);

    return () => clearInterval(interval);
  }, [animation]);

  useEffect(() => {
    if (!animation) return;

    const piece = displayPieces.find(
      (p) => p.player === animation.player && p.index === animation.index,
    );

    if (!piece || piece.routeIndex === undefined) {
      setAnimation(null);
      return;
    }

    if (piece.routeIndex < animation.target) return;

    setAnimation(null);

    const applyLanded = (landed: PieceState[]) => {
      const captured = landed.some((next) => {
        if (next.location !== "start") return false;
        const before = displayPieces.find(
          (p) => p.player === next.player && p.index === next.index,
        );
        return before?.location === "route";
      });
      if (captured) playCaptureSound();

      const mover = landed.find(
        (p) => p.player === animation.player && p.index === animation.index,
      );
      if (mover?.location === "finished") {
        setCelebration({ player: animation.player, key: Date.now() });
      }

      setDisplayPieces(landed);
    };

    if (pendingServerPieces) {
      applyLanded(pendingServerPieces);
      setPendingServerPieces(null);
    } else {
      applyLanded(
        resolveLanding(displayPieces, animation.player, animation.index),
      );
    }

    movingRef.current = false;
  }, [animation, displayPieces, pendingServerPieces]);

  const handleRollResult = useCallback(
    (
      _player: PlayerColor,
      _roll: [number, number],
      _exitAttemptsUsed = 0,
    ): PostRollAction => "decision_phase",
    [],
  );

  const beginMovementPhase = useCallback((_roll: [number, number]) => {
    /* Server / realtime sets remaining dice. */
  }, []);

  const movePiece = useCallback(
    (target: SelectedPiece, choice: DieMoveChoice): boolean => {
      if (!canHumanInteractWithPieces || !remainingDice?.length || animation) {
        return false;
      }
      if (movingRef.current) return false;

      const piece = displayPieces.find(
        (p) => p.player === target.player && p.index === target.index,
      );
      if (!piece || piece.routeIndex === undefined) return false;
      if (piece.player !== selfColor) return false;
      if (!canMovePiece(displayPieces, piece, choice.value)) return false;

      piecesBeforeMoveRef.current = displayPieces;
      diceBeforeMoveRef.current = remainingDice;

      const nextRemaining = consumeDice(remainingDice, choice);
      setOptimisticDice(nextRemaining);

      movingRef.current = true;
      setSelectedPiece(null);
      setMenuAnchor(null);
      extendDecisionTime();

      const from = piece.routeIndex;
      const targetIndex = from + choice.value;
      setAnimation({
        player: piece.player,
        index: piece.index,
        from,
        target: targetIndex,
      });

      const pieceIndex = piece.index;
      const dieValue = choice.value;

      postChainRef.current = postChainRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const nextGame = await postMove(pieceIndex, dieValue);
            lastSyncedVersion.current = nextGame.version;
            setPendingServerPieces(nextGame.pieces);
            applyGame(nextGame);
            if (!movingRef.current) {
              setOptimisticDice(null);
            }
          } catch {
            setAnimation(null);
            setPendingServerPieces(null);
            setDisplayPieces(piecesBeforeMoveRef.current);
            setOptimisticDice(diceBeforeMoveRef.current);
            movingRef.current = false;
          }
        });

      return true;
    },
    [
      animation,
      applyGame,
      canHumanInteractWithPieces,
      displayPieces,
      extendDecisionTime,
      postMove,
      remainingDice,
      selfColor,
    ],
  );

  useEffect(() => {
    if (!canHumanInteractWithPieces || !remainingDice?.length) return;

    const routePieces = displayPieces.filter(
      (p) => p.player === selfColor && p.location === "route",
    );
    if (routePieces.length !== 1) return;

    const piece = routePieces[0];
    const value = getAutoMoveValue(displayPieces, piece, remainingDice);
    if (value === null) return;

    movePiece({ player: piece.player, index: piece.index }, { value });
  }, [
    canHumanInteractWithPieces,
    displayPieces,
    movePiece,
    remainingDice,
    selfColor,
  ]);

  const selectPiece = useCallback(
    (piece: SelectedPiece, anchor: MenuAnchor) => {
      if (!canHumanInteractWithPieces) return;
      if (piece.player !== selfColor) return;

      if (remainingDice?.length === 1) {
        if (movePiece(piece, { value: remainingDice[0] })) return;
      }

      setSelectedPiece(piece);
      setMenuAnchor(anchor);
    },
    [canHumanInteractWithPieces, movePiece, remainingDice, selfColor],
  );

  const clearSelection = useCallback(() => {
    setSelectedPiece(null);
    setMenuAnchor(null);
  }, []);

  const getMoveOptionsForSelection = useCallback((): MoveOption[] => {
    if (!selectedPiece || !remainingDice?.length) return [];

    const piece = displayPieces.find(
      (p) =>
        p.player === selectedPiece.player && p.index === selectedPiece.index,
    );
    if (!piece) return [];

    return getMoveOptions(remainingDice).filter((option) =>
      canMovePiece(displayPieces, piece, option.choice.value),
    );
  }, [selectedPiece, remainingDice, displayPieces]);

  const applyMoveChoice = useCallback(
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

  return (
    <GameStateContext.Provider
      value={{
        pieces: displayPieces,
        remainingDice,
        selectedPiece,
        menuAnchor,
        canInteractWithPieces,
        canHumanInteractWithPieces,
        winner,
        celebration,
        getFinishedPieces: (player) => getFinishedPieces(displayPieces, player),
        handleRollResult,
        beginMovementPhase,
        selectPiece,
        clearSelection,
        getMoveOptionsForSelection,
        applyMove: applyMoveChoice,
        executeMove,
        getPiecesAtStart: (player) => getPiecesAtStart(displayPieces, player),
        getPiecesAtAnchor: (anchor, half) =>
          getPiecesAtAnchor(displayPieces, anchor, half),
        isPieceAtStartSlot: (player, slot) =>
          isPieceAtStartSlot(displayPieces, player, slot),
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
}
