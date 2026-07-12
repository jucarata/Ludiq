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
import { useGameState } from "@/components/game/GameStateContext";
import { getVictoryCellCenter } from "@/lib/board/geometry";
import {
  createPairedSpawnPoints,
  createPairedThrowVelocities,
  DICE_COUNT,
  rollDicePair,
} from "@/lib/game/dice";
import { MAX_EXIT_ROLL_ATTEMPTS } from "@/lib/game/roll-resolution";
import { playDiceRollSound } from "@/lib/game/sounds";

export interface ActiveDieRoll {
  key: number;
  sessionId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  bounds: { width: number; height: number };
  /** Shared seed so peers render the same tumble/result. */
  seed?: string;
}

interface DiceContextValue {
  isAiming: boolean;
  isRolling: boolean;
  isBoardDragging: boolean;
  canRoll: boolean;
  hasRolledThisTurn: boolean;
  /** Tiradas de salida fallidas en este turno (0–2) */
  exitRollAttempts: number;
  maxExitRollAttempts: number;
  turnRoll: [number, number] | null;
  activeDice: ActiveDieRoll[] | null;
  armDice: () => void;
  cancelAim: () => void;
  setBoardDragging: (value: boolean) => void;
  throwDice: (params: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    bounds: { width: number; height: number };
  }) => void;
  autoRollDice: () => void;
  registerDiceZone: (element: HTMLDivElement | null) => void;
  reportDieSettled: (key: number, value: number) => void;
}

const DiceContext = createContext<DiceContextValue | null>(null);

export { DiceContext };

export function DiceProvider({ children }: { children: ReactNode }) {
  const {
    currentPlayer,
    pauseForDiceRoll,
    resumePlaying,
    startDecisionPhase,
    advanceTurn,
  } = useTurn();
  const { handleRollResult, beginMovementPhase } = useGameState();
  const [isAiming, setIsAiming] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isBoardDragging, setBoardDragging] = useState(false);
  const [hasRolledThisTurn, setHasRolledThisTurn] = useState(false);
  const [exitRollAttempts, setExitRollAttempts] = useState(0);
  const [turnRoll, setTurnRoll] = useState<[number, number] | null>(null);
  const [activeDice, setActiveDice] = useState<ActiveDieRoll[] | null>(null);
  const settledDiceRef = useRef<Map<number, number>>(new Map());
  const diceZoneRef = useRef<HTMLDivElement | null>(null);
  const exitRollAttemptsRef = useRef(0);

  const canRoll = !hasRolledThisTurn && !isRolling;

  useEffect(() => {
    setHasRolledThisTurn(false);
    setExitRollAttempts(0);
    exitRollAttemptsRef.current = 0;
    setTurnRoll(null);
    setIsAiming(false);
    setActiveDice(null);
    settledDiceRef.current.clear();
  }, [currentPlayer]);

  const finishRollSession = useCallback(
    (values: [number, number]) => {
      setTurnRoll(values);
      setActiveDice(null);
      setIsRolling(false);
      settledDiceRef.current.clear();

      const attemptsUsed = exitRollAttemptsRef.current;
      const action = handleRollResult(currentPlayer, values, attemptsUsed);

      if (action === "retry_roll") {
        const nextAttempts = attemptsUsed + 1;
        exitRollAttemptsRef.current = nextAttempts;
        setExitRollAttempts(nextAttempts);
        setHasRolledThisTurn(false);
        resumePlaying();
        return;
      }

      setHasRolledThisTurn(true);

      if (action === "skip_turn") {
        advanceTurn();
      } else {
        beginMovementPhase(values);
        startDecisionPhase();
      }
    },
    [
      currentPlayer,
      handleRollResult,
      beginMovementPhase,
      advanceTurn,
      startDecisionPhase,
      resumePlaying,
    ],
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
      if (!canRoll) return;

      const values = rollDicePair();
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
          value: values[index],
          bounds: params.bounds,
        })),
      );
    },
    [canRoll, pauseForDiceRoll],
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
        exitRollAttempts,
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

export function useDice() {
  const value = useContext(DiceContext);
  if (!value) {
    throw new Error("useDice must be used within DiceProvider");
  }
  return value;
}
