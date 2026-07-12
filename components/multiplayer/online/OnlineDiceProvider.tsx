"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DiceContext,
  type ActiveDieRoll,
} from "@/components/dice/DiceContext";
import { useTurn } from "@/components/game/TurnContext";
import { useOnlineSession } from "@/components/multiplayer/online/OnlineSessionContext";
import { getVictoryCellCenter } from "@/lib/board/geometry";
import { createActionId } from "@/lib/game/action-id";
import {
  createPairedSpawnPoints,
  createPairedThrowVelocities,
  DICE_COUNT,
  rollDicePair,
} from "@/lib/game/dice";
import { MAX_EXIT_ROLL_ATTEMPTS } from "@/lib/game/roll-resolution";
import { playDiceRollSound } from "@/lib/game/sounds";

export function OnlineDiceProvider({ children }: { children: ReactNode }) {
  const {
    game,
    selfColor,
    isMyTurn,
    postRoll,
    sendLiveRoll,
    subscribeLiveRoll,
  } = useOnlineSession();
  const { currentPlayer, turnPhase, pauseForDiceRoll, resumePlaying } =
    useTurn();
  const [isAiming, setIsAiming] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isBoardDragging, setBoardDragging] = useState(false);
  const [hasRolledThisTurn, setHasRolledThisTurn] = useState(false);
  const [turnRoll, setTurnRoll] = useState<[number, number] | null>(
    game.lastRoll,
  );
  const [activeDice, setActiveDice] = useState<ActiveDieRoll[] | null>(null);
  const settledDiceRef = useRef<Map<number, number>>(new Map());
  const diceZoneRef = useRef<HTMLDivElement | null>(null);
  const rollingRef = useRef(false);
  const selfRollPendingRef = useRef(false);
  const lastSeenVersion = useRef(game.version);
  /** actionIds already animated (live or DB). */
  const seenActionIdsRef = useRef<Set<string>>(
    new Set(game.actionId && game.lastAction === "roll" ? [game.actionId] : []),
  );
  const gameRef = useRef(game);
  gameRef.current = game;

  const markActionSeen = useCallback((actionId: string) => {
    seenActionIdsRef.current.add(actionId);
    if (seenActionIdsRef.current.size > 40) {
      const keep = [...seenActionIdsRef.current].slice(-20);
      seenActionIdsRef.current = new Set(keep);
    }
  }, []);

  const canRoll =
    isMyTurn &&
    currentPlayer === selfColor &&
    turnPhase === "playing" &&
    !hasRolledThisTurn &&
    !isRolling &&
    !game.winner;

  const spawnDiceAnimation = useCallback(
    (
      roll: [number, number],
      params: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        bounds: { width: number; height: number };
      },
    ) => {
      const velocities = createPairedThrowVelocities(params.vx, params.vy);
      const spawnPoints = createPairedSpawnPoints(params.x, params.y);
      const sessionId = Date.now();

      setIsAiming(false);
      setIsRolling(true);
      pauseForDiceRoll();
      playDiceRollSound();
      settledDiceRef.current.clear();

      setActiveDice(
        velocities.map((velocity, index) => ({
          key: index,
          sessionId,
          x: spawnPoints[index].x,
          y: spawnPoints[index].y,
          vx: velocity.vx,
          vy: velocity.vy,
          value: roll[index],
          bounds: params.bounds,
        })),
      );
    },
    [pauseForDiceRoll],
  );

  const playRemoteRoll = useCallback(
    (roll: [number, number]) => {
      if (rollingRef.current) return;

      const zone = diceZoneRef.current;
      const bounds = zone
        ? { width: zone.clientWidth, height: zone.clientHeight }
        : { width: 320, height: 320 };
      const center = getVictoryCellCenter(bounds);

      rollingRef.current = true;
      setHasRolledThisTurn(false);
      setTurnRoll(roll);
      spawnDiceAnimation(roll, {
        x: center.x,
        y: center.y,
        vx: 420,
        vy: -380,
        bounds,
      });
    },
    [spawnDiceAnimation],
  );

  useEffect(() => {
    return subscribeLiveRoll((payload) => {
      const latest = gameRef.current;
      /* DB already applied this action (or a later one). */
      if (latest.version > payload.basedOnVersion) return;
      if (seenActionIdsRef.current.has(payload.actionId)) return;

      markActionSeen(payload.actionId);
      playRemoteRoll(payload.roll);
    });
  }, [markActionSeen, playRemoteRoll, subscribeLiveRoll]);

  useEffect(() => {
    if (game.version === lastSeenVersion.current) return;
    lastSeenVersion.current = game.version;

    /* Nuevo turno limpio: no arrastrar el marcador del jugador anterior. */
    if (game.turnPhase === "playing" && !game.lastRoll) {
      if (!rollingRef.current) {
        setTurnRoll(null);
        setHasRolledThisTurn(false);
        setActiveDice(null);
        settledDiceRef.current.clear();
      }
      return;
    }

    if (game.lastRoll) {
      setTurnRoll(game.lastRoll);
    }

    if (game.turnPhase === "deciding") {
      setHasRolledThisTurn(true);
    }

    /* Solo animar desde DB si fue una tirada nueva que no llegó por live. */
    if (game.lastAction !== "roll" || !game.lastRoll || !game.actionId) {
      return;
    }

    if (selfRollPendingRef.current) {
      markActionSeen(game.actionId);
      selfRollPendingRef.current = false;
      return;
    }

    if (seenActionIdsRef.current.has(game.actionId)) {
      return;
    }

    markActionSeen(game.actionId);
    playRemoteRoll(game.lastRoll);
  }, [game, markActionSeen, playRemoteRoll]);

  const finishRollSession = useCallback(
    (values: [number, number]) => {
      setActiveDice(null);
      setIsRolling(false);
      rollingRef.current = false;
      settledDiceRef.current.clear();

      const latest = gameRef.current;

      if (latest.turnPhase === "deciding" || latest.turnPhase === "ended") {
        setTurnRoll(values);
        setHasRolledThisTurn(true);
        resumePlaying();
        return;
      }

      /* playing: reintento de salida o el turno ya pasó al siguiente. */
      if (latest.currentTurn === selfColor) {
        setHasRolledThisTurn(false);
        /* Mantener el valor solo si aún hay reintentos de sacar ficha. */
        if (latest.exitRollAttempts > 0) {
          setTurnRoll(values);
        } else {
          setTurnRoll(null);
        }
        resumePlaying();
        return;
      }

      /* Turno de otro: limpiar marcador (p. ej. tras 3 intentos sin par). */
      setTurnRoll(null);
      setHasRolledThisTurn(false);
      resumePlaying();
    },
    [resumePlaying, selfColor],
  );

  const reportDieSettled = useCallback(
    (key: number, value: number) => {
      settledDiceRef.current.set(key, value);
      if (settledDiceRef.current.size < DICE_COUNT) return;

      const ordered = Array.from({ length: DICE_COUNT }, (_, index) => {
        return settledDiceRef.current.get(index)!;
      }) as [number, number];

      finishRollSession(ordered);
    },
    [finishRollSession],
  );

  const armDice = useCallback(() => {
    if (!canRoll) return;
    setIsAiming(true);
  }, [canRoll]);

  const cancelAim = useCallback(() => {
    if (isRolling) return;
    setIsAiming(false);
  }, [isRolling]);

  const startRollSession = useCallback(
    (params: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      bounds: { width: number; height: number };
    }) => {
      if (!canRoll || rollingRef.current) return;
      rollingRef.current = true;
      selfRollPendingRef.current = true;

      const roll = rollDicePair();
      const actionId = createActionId();
      const basedOnVersion = gameRef.current.version;
      markActionSeen(actionId);
      sendLiveRoll({ roll, actionId, basedOnVersion });
      spawnDiceAnimation(roll, params);

      void postRoll(roll, actionId).catch(() => {
        selfRollPendingRef.current = false;
        setActiveDice(null);
        setIsRolling(false);
        rollingRef.current = false;
        settledDiceRef.current.clear();
        resumePlaying();
      });
    },
    [
      canRoll,
      markActionSeen,
      postRoll,
      resumePlaying,
      sendLiveRoll,
      spawnDiceAnimation,
    ],
  );

  const throwDice = useCallback(
    (params: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      bounds: { width: number; height: number };
    }) => {
      if (!isAiming || !canRoll) return;
      startRollSession(params);
    },
    [isAiming, canRoll, startRollSession],
  );

  const registerDiceZone = useCallback((element: HTMLDivElement | null) => {
    diceZoneRef.current = element;
  }, []);

  const autoRollDice = useCallback(() => {
    if (!canRoll) return;
    const zone = diceZoneRef.current;
    if (!zone) return;

    const bounds = {
      width: zone.clientWidth,
      height: zone.clientHeight,
    };
    const center = getVictoryCellCenter(bounds);

    startRollSession({
      x: center.x,
      y: center.y,
      vx: 420,
      vy: -380,
      bounds,
    });
  }, [canRoll, startRollSession]);

  useEffect(() => {
    if (!isAiming) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelAim();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAiming, cancelAim]);

  return (
    <DiceContext.Provider
      value={{
        isAiming,
        isRolling,
        isBoardDragging,
        canRoll,
        hasRolledThisTurn,
        exitRollAttempts: game.exitRollAttempts,
        maxExitRollAttempts: MAX_EXIT_ROLL_ATTEMPTS,
        turnRoll,
        activeDice,
        armDice,
        cancelAim,
        setBoardDragging,
        throwDice,
        autoRollDice,
        registerDiceZone,
        reportDieSettled,
      }}
    >
      {children}
    </DiceContext.Provider>
  );
}
