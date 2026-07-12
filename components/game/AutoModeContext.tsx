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
  canControlAuto: (color: PlayerColor) => boolean;
  /** Timer expired with auto on — bot is finishing the turn for the human. */
  isAfkTakeover: boolean;
  setAfkTakeover: (value: boolean) => void;
}

const AutoModeContext = createContext<AutoModeContextValue | null>(null);

export function AutoModeProvider({
  children,
  canControlAuto,
  initialAutoByPlayer,
  onAutoEnabledChange,
}: {
  children: ReactNode;
  /** Local: all humans. Online: only your own color. */
  canControlAuto?: (color: PlayerColor) => boolean;
  initialAutoByPlayer?: Partial<Record<PlayerColor, boolean>>;
  onAutoEnabledChange?: (color: PlayerColor, enabled: boolean) => void;
}) {
  const [autoByPlayer, setAutoByPlayer] = useState<
    Partial<Record<PlayerColor, boolean>>
  >(() => initialAutoByPlayer ?? {});
  const [isAfkTakeover, setAfkTakeover] = useState(false);

  const canControl = useCallback(
    (color: PlayerColor) => (canControlAuto ? canControlAuto(color) : true),
    [canControlAuto],
  );

  const isAutoEnabled = useCallback(
    (color: PlayerColor) =>
      canControl(color) && autoByPlayer[color] === true,
    [autoByPlayer, canControl],
  );

  const setAutoEnabled = useCallback(
    (color: PlayerColor, enabled: boolean) => {
      if (!canControl(color)) return;
      setAutoByPlayer((prev) => ({ ...prev, [color]: enabled }));
      onAutoEnabledChange?.(color, enabled);
    },
    [canControl, onAutoEnabledChange],
  );

  const value = useMemo(
    () => ({
      isAutoEnabled,
      setAutoEnabled,
      canControlAuto: canControl,
      isAfkTakeover,
      setAfkTakeover,
    }),
    [isAutoEnabled, setAutoEnabled, canControl, isAfkTakeover],
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
