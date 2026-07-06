"use client";

import { ParquesBoard } from "@/components/board/ParquesBoard";
import { BoardDiceZone } from "@/components/board/BoardDiceZone";
import { AutoModeProvider } from "@/components/game/AutoModeContext";
import { BotController } from "@/components/game/BotController";
import { DiceProvider } from "@/components/dice/DiceContext";
import { DiceCursor } from "@/components/dice/DiceCursor";
import { GameStateProvider } from "@/components/game/GameStateContext";
import { PlayersProvider } from "@/components/game/PlayersContext";
import { TurnProvider } from "@/components/game/TurnContext";
import { TurnAnnouncement } from "@/components/turn/TurnAnnouncement";
import { TurnPanel } from "@/components/turn/TurnPanel";
import { WinnerAnnouncement } from "@/components/turn/WinnerAnnouncement";
import type { PlayerColor } from "@/lib/board/types";

interface GameViewProps {
  activePlayers: PlayerColor[];
  botPlayers: PlayerColor[];
}

export function GameView({ activePlayers, botPlayers }: GameViewProps) {
  return (
    <PlayersProvider activePlayers={activePlayers} botPlayers={botPlayers}>
      <AutoModeProvider>
        <TurnProvider>
        <GameStateProvider>
          <DiceProvider>
            <BotController />
            <main className="flex h-dvh w-full max-w-full flex-col overflow-hidden py-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:py-4 sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]">
              <div className="flex min-h-0 w-full max-w-full flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-center md:gap-4 md:[--board-size:min(calc(100dvw-2rem-var(--turn-panel-width)-1rem),calc(100dvh-2rem))] md:[--turn-panel-width:17rem]">
                <div className="relative flex min-h-0 min-w-0 w-full max-w-full flex-1 items-center justify-center overflow-hidden [container-type:size] md:flex-none md:overflow-visible md:[container-type:normal]">
                  <BoardDiceZone>
                    <ParquesBoard className="[--board-dim:min(100cqw,100cqh)] md:[--board-dim:var(--board-size)]" />
                    <TurnAnnouncement />
                    <WinnerAnnouncement />
                  </BoardDiceZone>
                </div>
                <TurnPanel />
              </div>
            </main>
            <DiceCursor />
          </DiceProvider>
        </GameStateProvider>
      </TurnProvider>
      </AutoModeProvider>
    </PlayersProvider>
  );
}
