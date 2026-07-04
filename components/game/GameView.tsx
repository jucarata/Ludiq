"use client";

import { ParquesBoard } from "@/components/board/ParquesBoard";
import { BoardDiceZone } from "@/components/board/BoardDiceZone";
import { DiceProvider } from "@/components/dice/DiceContext";
import { DiceCursor } from "@/components/dice/DiceCursor";
import { TurnProvider } from "@/components/game/TurnContext";
import { TurnAnnouncement } from "@/components/turn/TurnAnnouncement";
import { TurnPanel } from "@/components/turn/TurnPanel";

export function GameView() {
  return (
    <TurnProvider>
      <DiceProvider>
        <main className="flex h-dvh w-full items-center justify-center overflow-hidden p-4">
          <div className="flex w-full flex-col items-center gap-4 [--board-size:min(calc(100dvw-2rem),calc(100dvh-13rem))] md:w-auto md:flex-row md:items-stretch md:[--board-size:min(calc(100dvw-2rem-12rem),calc(100dvh-2rem))]">
            <div className="relative shrink-0">
              <BoardDiceZone>
                <ParquesBoard size="var(--board-size)" />
                <TurnAnnouncement />
              </BoardDiceZone>
            </div>
            <TurnPanel />
          </div>
        </main>
        <DiceCursor />
      </DiceProvider>
    </TurnProvider>
  );
}
