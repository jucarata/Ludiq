"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DICE_RESULT_HOLD_MS, DICE_ROLL_DURATION_MS, rollDie } from "@/lib/game/dice";

export interface ActiveDiceRoll {
  id: number;
  x: number;
  y: number;
  value: number;
}

interface DiceContextValue {
  isAiming: boolean;
  isRolling: boolean;
  lastResult: number | null;
  activeRoll: ActiveDiceRoll | null;
  armDice: () => void;
  cancelAim: () => void;
  rollAt: (x: number, y: number) => void;
  clearRoll: () => void;
}

const DiceContext = createContext<DiceContextValue | null>(null);

export function DiceProvider({ children }: { children: ReactNode }) {
  const [isAiming, setIsAiming] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [activeRoll, setActiveRoll] = useState<ActiveDiceRoll | null>(null);

  const armDice = useCallback(() => {
    if (isRolling) return;
    setIsAiming(true);
  }, [isRolling]);

  const cancelAim = useCallback(() => {
    if (isRolling) return;
    setIsAiming(false);
  }, [isRolling]);

  const rollAt = useCallback(
    (x: number, y: number) => {
      if (!isAiming || isRolling) return;

      const value = rollDie();
      setIsAiming(false);
      setIsRolling(true);
      setActiveRoll({
        id: Date.now(),
        x,
        y,
        value,
      });
    },
    [isAiming, isRolling],
  );

  const clearRoll = useCallback(() => {
    setActiveRoll(null);
    setIsRolling(false);
  }, []);

  useEffect(() => {
    if (!isAiming) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelAim();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAiming, cancelAim]);

  useEffect(() => {
    if (!activeRoll) return;

    const timeout = setTimeout(() => {
      setLastResult(activeRoll.value);
      clearRoll();
    }, DICE_ROLL_DURATION_MS + DICE_RESULT_HOLD_MS);

    return () => clearTimeout(timeout);
  }, [activeRoll, clearRoll]);

  return (
    <DiceContext.Provider
      value={{
        isAiming,
        isRolling,
        lastResult,
        activeRoll,
        armDice,
        cancelAim,
        rollAt,
        clearRoll,
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
