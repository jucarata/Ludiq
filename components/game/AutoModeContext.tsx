"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlayerColor } from "@/lib/board/types";

interface AutoModeContextValue {
  isAutoEnabled: (color: PlayerColor) => boolean;
  setAutoEnabled: (color: PlayerColor, enabled: boolean) => void;
}

const AutoModeContext = createContext<AutoModeContextValue | null>(null);

export function AutoModeProvider({ children }: { children: ReactNode }) {
  const [autoByPlayer, setAutoByPlayer] = useState<
    Partial<Record<PlayerColor, boolean>>
  >({});

  const isAutoEnabled = useCallback(
    (color: PlayerColor) => autoByPlayer[color] === true,
    [autoByPlayer],
  );

  const setAutoEnabled = useCallback((color: PlayerColor, enabled: boolean) => {
    setAutoByPlayer((prev) => ({ ...prev, [color]: enabled }));
  }, []);

  const value = useMemo(
    () => ({ isAutoEnabled, setAutoEnabled }),
    [isAutoEnabled, setAutoEnabled],
  );

  return (
    <AutoModeContext.Provider value={value}>{children}</AutoModeContext.Provider>
  );
}

export function useAutoMode() {
  const value = useContext(AutoModeContext);
  if (!value) {
    throw new Error("useAutoMode must be used within AutoModeProvider");
  }
  return value;
}
