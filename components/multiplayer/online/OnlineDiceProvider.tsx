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
  const { game, selfColor, isMyTurn, postRoll } = useOnlineSession();
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
    if (game.version === lastSeenVersion.current) return;
    lastSeenVersion.current = game.version;

    if (game.lastRoll) {
      setTurnRoll(game.lastRoll);
      const key = rollAnimKey(game.version, game.lastRoll);

      if (selfRollPendingRef.current) {
        lastAnimatedKeyRef.current = key;
        selfRollPendingRef.current = false;
        setHasRolledThisTurn(true);
      } else if (lastAnimatedKeyRef.current !== key) {
        lastAnimatedKeyRef.current = key;
        playRemoteRoll(game.lastRoll);
      } else {
        setHasRolledThisTurn(true);
      }
    } else if (game.turnPhase === "playing") {
      setTurnRoll(null);
      setHasRolledThisTurn(false);
      if (!rollingRef.current) {
        setActiveDice(null);
        settledDiceRef.current.clear();
      }
    }
  }, [game, playRemoteRoll]);

  const finishRollSession = useCallback(
    (values: [number, number]) => {
      setTurnRoll(values);
      setActiveDice(null);
      setIsRolling(false);
      rollingRef.current = false;
      settledDiceRef.current.clear();

      const latest = gameRef.current;

      /* Fase de decisión del rival (o propia): dejar el resultado visible. */
      if (latest.turnPhase === "deciding" || latest.turnPhase === "ended") {
        setHasRolledThisTurn(true);
        resumePlaying();
        return;
      }

      /* playing: reintento propio, o el rival perdió el turno y ahora es el mío. */
      if (latest.currentTurn === selfColor) {
        setHasRolledThisTurn(true);
        window.setTimeout(() => {
          if (rollingRef.current) return;
          const now = gameRef.current;
          if (now.currentTurn !== selfColor || now.turnPhase !== "playing") {
            return;
          }
          setHasRolledThisTurn(false);
          setTurnRoll(null);
          resumePlaying();
        }, 1200);
        return;
      }

      setHasRolledThisTurn(true);
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
      spawnDiceAnimation(roll, params);

      void postRoll(roll).catch(() => {
        selfRollPendingRef.current = false;
        setActiveDice(null);
        setIsRolling(false);
        rollingRef.current = false;
        settledDiceRef.current.clear();
        resumePlaying();
      });
    },
    [canRoll, postRoll, resumePlaying, spawnDiceAnimation],
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
