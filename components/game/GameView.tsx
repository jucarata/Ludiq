"use client";

import { ParquesBoard } from "@/components/board/ParquesBoard";
import { BoardDiceZone } from "@/components/board/BoardDiceZone";
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
      <TurnProvider>
        <GameStateProvider>
          <DiceProvider>
            <BotController />
            <main className="flex h-dvh w-full items-center justify-center overflow-hidden p-4">
              <div className="flex w-full flex-col items-center gap-4 [--turn-panel-width:var(--board-size)] [--board-size:min(calc(100dvw-2rem),calc(100dvh-13rem))] md:w-auto md:flex-row md:items-stretch md:[--turn-panel-width:17rem] md:[--board-size:min(calc(100dvw-2rem-var(--turn-panel-width)-1rem),calc(100dvh-2rem))]">
                <div className="relative shrink-0">
                  <BoardDiceZone>
                    <ParquesBoard size="var(--board-size)" />
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
    </PlayersProvider>
  );
}
