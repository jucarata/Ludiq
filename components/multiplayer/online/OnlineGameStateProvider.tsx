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
import { useAutoMode } from "@/components/game/AutoModeContext";
import { useOnlineSession } from "@/components/multiplayer/online/OnlineSessionContext";
import type { PlayerColor } from "@/lib/board/types";
import { createActionId } from "@/lib/game/action-id";
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
  hasAnyValidMove,
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


function piecesSignature(pieces: PieceState[]): string {
  return pieces
    .map(
      (piece) =>
        `${piece.player}:${piece.index}:${piece.location}:${piece.routeIndex ?? "-"}`,
    )
    .sort()
    .join("|");
}

/** Detect a forward route step so AFK/server moves can animate cell-by-cell. */
function findRouteAdvance(
  before: PieceState[],
  after: PieceState[],
): MoveAnimation | null {
  for (const next of after) {
    if (next.location !== "route" || next.routeIndex === undefined) continue;
    const prev = before.find(
      (piece) => piece.player === next.player && piece.index === next.index,
    );
    if (!prev || prev.location !== "route" || prev.routeIndex === undefined) {
      continue;
    }
    if (next.routeIndex > prev.routeIndex) {
      return {
        player: next.player,
        index: next.index,
        from: prev.routeIndex,
        target: next.routeIndex,
      };
    }
  }
  return null;
}


export function OnlineGameStateProvider({ children }: { children: ReactNode }) {
  const {
    game,
    selfColor,
    isMyTurn,
    postMove,
    applyGame,
    sendLiveMove,
    subscribeLiveMove,
    turnAdvanceBlockedRef,
  } = useOnlineSession();
  const { currentPlayer, turnPhase, timeLeft, extendDecisionTime, advanceTurn } =
    useTurn();
  const { isAfkTakeover, isAutoEnabled } = useAutoMode();
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
  /** True until server version confirms the in-flight (own or live) move. */
  const unconfirmedMoveRef = useRef(false);
  /** True while our own postMove request has not settled. */
  const ownMovePendingRef = useRef(false);
  const [holdOptimisticBoard, setHoldOptimisticBoard] = useState(false);
  const lastSyncedVersion = useRef(game.version);
  const seenMoveActionIdsRef = useRef<Set<string>>(
    new Set(game.actionId && game.lastAction === "move" ? [game.actionId] : []),
  );
  const gameRef = useRef(game);
  gameRef.current = game;
  const postChainRef = useRef(Promise.resolve());
  const piecesBeforeMoveRef = useRef<PieceState[]>(game.pieces);
  const diceBeforeMoveRef = useRef<number[] | null>(game.remainingDice);
  const displayPiecesRef = useRef(displayPieces);
  const remainingDiceRef = useRef(optimisticDice ?? game.remainingDice);
  const pendingServerPiecesRef = useRef<PieceState[] | null>(null);
  displayPiecesRef.current = displayPieces;
  remainingDiceRef.current = holdOptimisticBoard
    ? (optimisticDice ?? game.remainingDice)
    : (game.remainingDice ?? optimisticDice);
  pendingServerPiecesRef.current = pendingServerPieces;

  const markMoveActionSeen = useCallback((actionId: string) => {
    seenMoveActionIdsRef.current.add(actionId);
    if (seenMoveActionIdsRef.current.size > 40) {
      const keep = [...seenMoveActionIdsRef.current].slice(-20);
      seenMoveActionIdsRef.current = new Set(keep);
    }
  }, []);

  const remainingDice = holdOptimisticBoard
    ? (optimisticDice ?? game.remainingDice)
    : (game.remainingDice ?? optimisticDice);
  const winner = game.winner;

  const confirmServerPieces = useCallback(
    (pieces: PieceState[], version: number) => {
      lastSyncedVersion.current = version;
      unconfirmedMoveRef.current = false;
      pendingServerPiecesRef.current = null;
      setPendingServerPieces(null);
      setHoldOptimisticBoard(false);
      setOptimisticDice(null);
      turnAdvanceBlockedRef.current = false;
      /* Solo reemplazar si el server discrepa: evita un “salto” visual innecesario. */
      setDisplayPieces((prev) =>
        piecesSignature(prev) === piecesSignature(pieces) ? prev : pieces,
      );
    },
    [turnAdvanceBlockedRef],
  );

  useEffect(() => {
    const serverNewer = game.version > lastSyncedVersion.current;

    if (animation || movingRef.current) {
      if (serverNewer && unconfirmedMoveRef.current) {
        /*
         * While our own POST is in flight, ignore timeout/skip snapshots —
         * they would snap the piece back. postMove success/failure settles it.
         */
        if (ownMovePendingRef.current && game.lastAction !== "move") {
          return;
        }
        lastSyncedVersion.current = game.version;
        pendingServerPiecesRef.current = game.pieces;
        setPendingServerPieces(game.pieces);
      }
      return;
    }

    /* Animación ya terminó en local: no volver al snapshot viejo. */
    if (unconfirmedMoveRef.current) {
      if (serverNewer) {
        if (ownMovePendingRef.current && game.lastAction !== "move") {
          return;
        }
        confirmServerPieces(game.pieces, game.version);
      }
      return;
    }

    if (game.version < lastSyncedVersion.current) return;
    if (game.version === lastSyncedVersion.current) return;

    /*
     * Server-driven moves (AFK bot, missed live broadcast): animate the
     * route advance instead of teleporting the piece.
     */
    if (game.lastAction === "move") {
      const advance = findRouteAdvance(
        displayPiecesRef.current,
        game.pieces,
      );
      if (advance) {
        lastSyncedVersion.current = game.version;
        if (game.actionId) markMoveActionSeen(game.actionId);
        pendingServerPiecesRef.current = game.pieces;
        setPendingServerPieces(game.pieces);
        unconfirmedMoveRef.current = true;
        movingRef.current = true;
        turnAdvanceBlockedRef.current = true;
        setHoldOptimisticBoard(true);
        setOptimisticDice(game.remainingDice);
        setSelectedPiece(null);
        setMenuAnchor(null);
        setAnimation(advance);
        return;
      }
    }

    lastSyncedVersion.current = game.version;
    setDisplayPieces(game.pieces);
    setOptimisticDice(null);
    setSelectedPiece(null);
    setMenuAnchor(null);
  }, [
    animation,
    confirmServerPieces,
    game.actionId,
    game.lastAction,
    game.pieces,
    game.remainingDice,
    game.version,
    markMoveActionSeen,
    turnAdvanceBlockedRef,
  ]);

  useEffect(() => {
    return subscribeLiveMove((payload) => {
      const latest = gameRef.current;
      if (latest.version > payload.basedOnVersion) return;
      if (seenMoveActionIdsRef.current.has(payload.actionId)) return;
      if (movingRef.current || unconfirmedMoveRef.current) return;

      const pieces = displayPiecesRef.current;
      const piece = pieces.find(
        (p) =>
          p.player === payload.color && p.index === payload.pieceIndex,
      );
      if (!piece || piece.location !== "route") return;

      markMoveActionSeen(payload.actionId);

      const from = piece.routeIndex ?? payload.fromRouteIndex;
      const dice = remainingDiceRef.current;
      if (dice?.length) {
        setOptimisticDice(consumeDice(dice, { value: payload.dieValue }));
      }

      unconfirmedMoveRef.current = true;
      movingRef.current = true;
      setHoldOptimisticBoard(true);
      setSelectedPiece(null);
      setMenuAnchor(null);
      setAnimation({
        player: payload.color,
        index: payload.pieceIndex,
        from,
        target: from + payload.dieValue,
      });
    });
  }, [markMoveActionSeen, subscribeLiveMove]);

  /* Marcar actionIds de move confirmados por DB (live pudo haberse perdido). */
  useEffect(() => {
    if (game.lastAction === "move" && game.actionId) {
      markMoveActionSeen(game.actionId);
    }
  }, [game.actionId, game.lastAction, markMoveActionSeen]);

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

  useEffect(() => {
    if (!game.afkTakeover) return;
    setSelectedPiece(null);
    setMenuAnchor(null);
    /*
     * Stale optimistic locks (e.g. a cancelled last-second click) would keep
     * canInteractWithPieces false forever and freeze AFK. Clear them when the
     * server hands control to the bot and nothing is mid-animation.
     */
    if (!movingRef.current && !animation) {
      unconfirmedMoveRef.current = false;
      ownMovePendingRef.current = false;
      turnAdvanceBlockedRef.current = false;
      pendingServerPiecesRef.current = null;
      setPendingServerPieces(null);
      setHoldOptimisticBoard(false);
      setOptimisticDice(null);
    }
  }, [game.afkTakeover, animation]);

  useEffect(() => {
    if (!isAfkTakeover) return;
    setSelectedPiece(null);
    setMenuAnchor(null);
  }, [isAfkTakeover]);

  const canInteractWithPieces =
    turnPhase === "deciding" &&
    animation === null &&
    remainingDice !== null &&
    remainingDice.length > 0 &&
    !movingRef.current &&
    !holdOptimisticBoard;

  const canMoveOwnPieces =
    canInteractWithPieces && isMyTurn && currentPlayer === selfColor;

  /* Humans lose control once the timer expires and AFK bot takes over. */
  const afkLocked =
    game.afkTakeover ||
    isAfkTakeover ||
    (isAutoEnabled(selfColor) && timeLeft <= 0);

  const canHumanInteractWithPieces = canMoveOwnPieces && !afkLocked;

  useEffect(() => {
    if (!canMoveOwnPieces || !remainingDice?.length) return;
    if (hasAnyValidMove(displayPieces, selfColor, remainingDice)) return;
    advanceTurn();
  }, [
    advanceTurn,
    canMoveOwnPieces,
    displayPieces,
    remainingDice,
    selfColor,
  ]);

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
      movingRef.current = false;
      turnAdvanceBlockedRef.current = false;
      return;
    }

    if (piece.routeIndex < animation.target) return;

    const serverPieces = pendingServerPiecesRef.current;
    const landed = serverPieces
      ? serverPieces
      : resolveLanding(displayPieces, animation.player, animation.index);

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
    setAnimation(null);
    movingRef.current = false;

    if (serverPieces) {
      pendingServerPiecesRef.current = null;
      setPendingServerPieces(null);
      unconfirmedMoveRef.current = false;
      setHoldOptimisticBoard(false);
      turnAdvanceBlockedRef.current = false;
    }
    /* Si aún no hay confirmación del server, holdOptimisticBoard sigue true
       para no pisar con game.pieces viejo. */
  }, [animation, displayPieces, turnAdvanceBlockedRef]);

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
    (
      target: SelectedPiece,
      choice: DieMoveChoice,
      options?: { forceAfk?: boolean },
    ): boolean => {
      const forceAfk = options?.forceAfk === true;
      const latest = gameRef.current;

      if (forceAfk) {
        if (!latest.afkTakeover) return false;
        if (!isMyTurn || latest.currentTurn !== selfColor) return false;
        if (animation || movingRef.current) return false;
        /* Drop any stale optimistic locks so AFK can always act. */
        unconfirmedMoveRef.current = false;
        ownMovePendingRef.current = false;
        turnAdvanceBlockedRef.current = false;
        pendingServerPiecesRef.current = null;
        setPendingServerPieces(null);
        setHoldOptimisticBoard(false);
      } else {
        if (!canMoveOwnPieces || !remainingDice?.length || animation) {
          return false;
        }
        if (movingRef.current || unconfirmedMoveRef.current) return false;
      }

      const board = forceAfk ? latest.pieces : displayPieces;
      const dice =
        forceAfk
          ? latest.remainingDice
          : remainingDice;

      if (!dice?.length) return false;

      const piece = board.find(
        (p) => p.player === target.player && p.index === target.index,
      );
      if (!piece || piece.routeIndex === undefined) return false;
      if (piece.player !== selfColor) return false;
      if (!canMovePiece(board, piece, choice.value)) return false;

      piecesBeforeMoveRef.current = board;
      diceBeforeMoveRef.current = dice;

      const nextRemaining = consumeDice(dice, choice);
      setOptimisticDice(nextRemaining);

      unconfirmedMoveRef.current = true;
      ownMovePendingRef.current = true;
      turnAdvanceBlockedRef.current = true;
      movingRef.current = true;
      setHoldOptimisticBoard(true);
      setSelectedPiece(null);
      setMenuAnchor(null);
      setDisplayPieces(board);
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
      const actionId = createActionId();
      const basedOnVersion = latest.version;
      markMoveActionSeen(actionId);
      sendLiveMove({
        pieceIndex,
        dieValue,
        fromRouteIndex: from,
        actionId,
        basedOnVersion,
      });

      postChainRef.current = postChainRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const nextGame = await postMove(pieceIndex, dieValue, actionId);
            applyGame(nextGame);

            if (movingRef.current) {
              lastSyncedVersion.current = nextGame.version;
              pendingServerPiecesRef.current = nextGame.pieces;
              setPendingServerPieces(nextGame.pieces);
            } else {
              confirmServerPieces(nextGame.pieces, nextGame.version);
            }
          } catch {
            const after = gameRef.current;
            setAnimation(null);
            pendingServerPiecesRef.current = null;
            setPendingServerPieces(null);
            unconfirmedMoveRef.current = false;
            movingRef.current = false;
            setHoldOptimisticBoard(false);
            lastSyncedVersion.current = after.version;
            setDisplayPieces(after.pieces);
            setOptimisticDice(after.remainingDice);
          } finally {
            ownMovePendingRef.current = false;
            turnAdvanceBlockedRef.current = false;
          }
        });

      return true;
    },
    [
      animation,
      applyGame,
      canMoveOwnPieces,
      confirmServerPieces,
      displayPieces,
      extendDecisionTime,
      isMyTurn,
      markMoveActionSeen,
      postMove,
      remainingDice,
      selfColor,
      sendLiveMove,
      turnAdvanceBlockedRef,
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
