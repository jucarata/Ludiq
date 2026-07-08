"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface HomePlayMode {
  id: string;
  title: string;
}

interface HomePlayContextValue {
  activeMode: HomePlayMode | null;
  setActiveMode: (mode: HomePlayMode) => void;
}

const HomePlayContext = createContext<HomePlayContextValue | null>(null);

export function HomePlayProvider({ children }: { children: ReactNode }) {
  const [activeMode, setActiveMode] = useState<HomePlayMode | null>(null);

  const value = useMemo(
    () => ({ activeMode, setActiveMode }),
    [activeMode],
  );

  return (
    <HomePlayContext.Provider value={value}>{children}</HomePlayContext.Provider>
  );
}

export function useHomePlay() {
  const context = useContext(HomePlayContext);
  if (!context) {
    throw new Error("useHomePlay must be used within HomePlayProvider");
  }
  return context;
}

export function useHomePlayOptional() {
  return useContext(HomePlayContext);
}
