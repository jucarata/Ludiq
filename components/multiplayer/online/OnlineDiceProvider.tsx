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
import {
  createPairedSpawnPoints,
  createPairedThrowVelocities,
  DICE_COUNT,
  rollDicePair,
} from "@/lib/game/dice";
import { MAX_EXIT_ROLL_ATTEMPTS } from "@/lib/game/roll-resolution";
import { playDiceRollSound } from "@/lib/game/sounds";

function rollAnimKey(version: number, roll: [number, number]): string {
  return `${version}:${roll[0]}x${roll[1]}`;
}

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
  const lastAnimatedKeyRef = useRef<string | null>(
    game.lastRoll ? rollAnimKey(game.version, game.lastRoll) : null,
  );
  const lastLiveRollRef = useRef<[number, number] | null>(null);
  /** lastRoll / exitAttempts del estado ya procesado — un move no cambia lastRoll. */
  const prevLastRollRef = useRef<[number, number] | null>(game.lastRoll);
  const prevExitAttemptsRef = useRef(game.exitRollAttempts);
  const gameRef = useRef(game);
  gameRef.current = game;

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
      lastLiveRollRef.current = payload.roll;
      lastAnimatedKeyRef.current = `live:${payload.roll[0]}x${payload.roll[1]}`;
      playRemoteRoll(payload.roll);
    });
  }, [playRemoteRoll, subscribeLiveRoll]);

  useEffect(() => {
    if (game.version === lastSeenVersion.current) return;
    lastSeenVersion.current = game.version;

    const prevRoll = prevLastRollRef.current;
    const prevAttempts = prevExitAttemptsRef.current;
    prevLastRollRef.current = game.lastRoll;
    prevExitAttemptsRef.current = game.exitRollAttempts;

    /* Nuevo turno limpio: no arrastrar el marcador del jugador anterior. */
    if (game.turnPhase === "playing" && !game.lastRoll) {
      lastLiveRollRef.current = null;
      if (!rollingRef.current) {
        setTurnRoll(null);
        setHasRolledThisTurn(false);
        setActiveDice(null);
        settledDiceRef.current.clear();
      }
      return;
    }

    if (!game.lastRoll) return;

    setTurnRoll(game.lastRoll);

    const sameRollValues =
      prevRoll != null &&
      prevRoll[0] === game.lastRoll[0] &&
      prevRoll[1] === game.lastRoll[1];
    /* Move / consume die: version↑ pero lastRoll igual. Reintento de salida: attempts↑. */
    const isNewRollEvent =
      !sameRollValues || game.exitRollAttempts > prevAttempts;

    const key = rollAnimKey(game.version, game.lastRoll);
    const live = lastLiveRollRef.current;
    const alreadyLive =
      live != null &&
      live[0] === game.lastRoll[0] &&
      live[1] === game.lastRoll[1];

    if (!isNewRollEvent) {
      /* p. ej. movió un dado del par: no re-animar la tirada. */
      if (game.turnPhase === "deciding") {
        setHasRolledThisTurn(true);
      }
      return;
    }

    if (selfRollPendingRef.current) {
      lastAnimatedKeyRef.current = key;
      selfRollPendingRef.current = false;
      if (game.turnPhase === "deciding") {
        setHasRolledThisTurn(true);
      }
    } else if (alreadyLive || lastAnimatedKeyRef.current === key) {
      lastAnimatedKeyRef.current = key;
      lastLiveRollRef.current = null;
      if (!rollingRef.current && game.turnPhase === "deciding") {
        setHasRolledThisTurn(true);
      }
    } else if (lastAnimatedKeyRef.current !== key) {
      lastAnimatedKeyRef.current = key;
      playRemoteRoll(game.lastRoll);
    } else if (game.turnPhase === "deciding") {
      setHasRolledThisTurn(true);
    }
  }, [game, playRemoteRoll]);

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
      lastLiveRollRef.current = null;
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
      lastAnimatedKeyRef.current = `local:${roll[0]}x${roll[1]}`;
      lastLiveRollRef.current = roll;
      sendLiveRoll(roll);
      spawnDiceAnimation(roll, params);

      void postRoll(roll).catch(() => {
        selfRollPendingRef.current = false;
        lastLiveRollRef.current = null;
        setActiveDice(null);
        setIsRolling(false);
        rollingRef.current = false;
        settledDiceRef.current.clear();
        resumePlaying();
      });
    },
    [canRoll, postRoll, resumePlaying, sendLiveRoll, spawnDiceAnimation],
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
