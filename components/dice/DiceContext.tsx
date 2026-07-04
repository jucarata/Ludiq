"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useTurn } from "@/components/game/TurnContext";
import { rollDie } from "@/lib/game/dice";

export interface ActiveDiceRoll {
  id: number;
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
  turnRoll: number | null;
  activeRoll: ActiveDiceRoll | null;
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
  completeRoll: (value: number) => void;
}

const DiceContext = createContext<DiceContextValue | null>(null);

export function DiceProvider({ children }: { children: ReactNode }) {
  const { currentPlayer, pauseForDiceRoll, startDecisionPhase } = useTurn();
  const [isAiming, setIsAiming] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isBoardDragging, setBoardDragging] = useState(false);
  const [hasRolledThisTurn, setHasRolledThisTurn] = useState(false);
  const [turnRoll, setTurnRoll] = useState<number | null>(null);
  const [activeRoll, setActiveRoll] = useState<ActiveDiceRoll | null>(null);

  const canRoll = !hasRolledThisTurn && !isRolling;

  useEffect(() => {
    setHasRolledThisTurn(false);
    setTurnRoll(null);
    setIsAiming(false);
  }, [currentPlayer]);

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

      const value = rollDie();
      setIsAiming(false);
      setIsRolling(true);
      pauseForDiceRoll();
      setActiveRoll({
        id: Date.now(),
        value,
        ...params,
      });
    },
    [isAiming, canRoll, pauseForDiceRoll],
  );

  const completeRoll = useCallback(
    (value: number) => {
      setTurnRoll(value);
      setHasRolledThisTurn(true);
      setActiveRoll(null);
      setIsRolling(false);
      startDecisionPhase();
    },
    [startDecisionPhase],
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
        activeRoll,
        armDice,
        cancelAim,
        setBoardDragging,
        throwDice,
        completeRoll,
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
