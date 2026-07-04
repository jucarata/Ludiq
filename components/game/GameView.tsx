"use client";

import { ParquesBoard } from "@/components/board/ParquesBoard";
import { TurnProvider } from "@/components/game/TurnContext";
import { TurnAnnouncement } from "@/components/turn/TurnAnnouncement";
import { TurnPanel } from "@/components/turn/TurnPanel";

export function GameView() {
  return (
    <TurnProvider>
      <main className="flex h-dvh w-full items-center justify-center overflow-hidden p-4">
        <div className="flex w-full flex-col items-center gap-4 [--board-size:min(calc(100dvw-2rem),calc(100dvh-13rem))] md:w-auto md:flex-row md:items-stretch md:[--board-size:min(calc(100dvw-2rem-12rem),calc(100dvh-2rem))]">
          <div className="relative shrink-0">
            <ParquesBoard size="var(--board-size)" />
            <TurnAnnouncement />
          </div>
          <TurnPanel />
        </div>
      </main>
    </TurnProvider>
  );
}
