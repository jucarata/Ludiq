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
import {
  createPairedSpawnPoints,
  createPairedThrowVelocities,
  DICE_COUNT,
  rollDicePair,
} from "@/lib/game/dice";
import {
  hasAllPiecesInStart,
  isDiceDoubles,
} from "@/lib/game/pieces";

export interface ActiveDieRoll {
  key: number;
  sessionId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  bounds: { width: number; height: number };
}

interface DiceContextValue {
  isAiming: boolean;
  isRolling: boolean;
  isBoardDragging: boolean;
  canRoll: boolean;
  hasRolledThisTurn: boolean;
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
  reportDieSettled: (key: number, value: number) => void;
}

const DiceContext = createContext<DiceContextValue | null>(null);

export function DiceProvider({ children }: { children: ReactNode }) {
  const { currentPlayer, pauseForDiceRoll, startDecisionPhase, advanceTurn } =
    useTurn();
  const { handleRollResult, pieces } = useGameState();
  const [isAiming, setIsAiming] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isBoardDragging, setBoardDragging] = useState(false);
  const [hasRolledThisTurn, setHasRolledThisTurn] = useState(false);
  const [turnRoll, setTurnRoll] = useState<[number, number] | null>(null);
  const [activeDice, setActiveDice] = useState<ActiveDieRoll[] | null>(null);
  const settledDiceRef = useRef<Map<number, number>>(new Map());

  const canRoll = !hasRolledThisTurn && !isRolling;

  useEffect(() => {
    setHasRolledThisTurn(false);
    setTurnRoll(null);
    setIsAiming(false);
    setActiveDice(null);
    settledDiceRef.current.clear();
  }, [currentPlayer]);

  const finishRollSession = useCallback(
    (values: [number, number]) => {
      const skipDecision =
        !isDiceDoubles(values) && hasAllPiecesInStart(pieces, currentPlayer);

      setTurnRoll(values);
      setHasRolledThisTurn(true);
      setActiveDice(null);
      setIsRolling(false);
      settledDiceRef.current.clear();
      handleRollResult(currentPlayer, values);

      if (skipDecision) {
        advanceTurn();
      } else {
        startDecisionPhase();
      }
    },
    [
      currentPlayer,
      pieces,
      handleRollResult,
      advanceTurn,
      startDecisionPhase,
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

  const throwDice = useCallback(
    (params: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      bounds: { width: number; height: number };
    }) => {
      if (!isAiming || !canRoll) return;

      const values = rollDicePair();
      const velocities = createPairedThrowVelocities(params.vx, params.vy);
      const spawnPoints = createPairedSpawnPoints(params.x, params.y);
      const sessionId = Date.now();

      setIsAiming(false);
      setIsRolling(true);
      pauseForDiceRoll();
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
    [isAiming, canRoll, pauseForDiceRoll],
  );

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
        turnRoll,
        activeDice,
        armDice,
        cancelAim,
        setBoardDragging,
        throwDice,
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
    throw new Error("useDice debe usarse dentro de DiceProvider");
  }
  return value;
}
