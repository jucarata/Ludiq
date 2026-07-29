"use client";

import { useMemo } from "react";
import { ParquesBoard } from "@/components/board/ParquesBoard";
import { BoardDiceZone } from "@/components/board/BoardDiceZone";
import { AutoModeProvider } from "@/components/game/AutoModeContext";
import { BotController } from "@/components/game/BotController";
import { DiceProvider } from "@/components/dice/DiceContext";
import { DiceCursor } from "@/components/dice/DiceCursor";
import { GameSessionNav } from "@/components/game/GameSessionNav";
import { GameStateProvider } from "@/components/game/GameStateContext";
import { PlayersProvider } from "@/components/game/PlayersContext";
import { TurnProvider } from "@/components/game/TurnContext";
import { TurnAnnouncement } from "@/components/turn/TurnAnnouncement";
import { BoardPlayerDocks } from "@/components/turn/BoardPlayerDocks";
import { WinnerAnnouncement } from "@/components/turn/WinnerAnnouncement";
import {
  InGameTutorialEffects,
  InGameTutorialProvider,
} from "@/components/tutorial/InGameTutorialContext";
import { InGameTutorialOverlay } from "@/components/tutorial/InGameTutorialOverlay";
import type { PlayerColor } from "@/lib/board/types";
import { createTutorialDiceBag } from "@/lib/game/tutorial-dice";

interface GameViewProps {
  activePlayers: PlayerColor[];
  botPlayers: PlayerColor[];
  /** Enables the `/tuto` guided first-match flow. */
  tutorial?: boolean;
  /** Leave the match (local / tutorial only — not used in online). */
  onExit: () => void;
}

export function GameView({
  activePlayers,
  botPlayers,
  tutorial = false,
  onExit,
}: GameViewProps) {
  const tutorialDiceFn = useMemo(
    () => (tutorial ? createTutorialDiceBag() : undefined),
    [tutorial],
  );

  const gameTree = (
    <PlayersProvider activePlayers={activePlayers} botPlayers={botPlayers}>
      <AutoModeProvider>
        <TurnProvider>
          <GameStateProvider>
            <DiceProvider rollDicePairFn={tutorialDiceFn}>
              {tutorial ? <InGameTutorialEffects /> : null}
              <BotController />
              <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                <GameSessionNav onExit={onExit} />
                <main className="flex min-h-0 flex-1 w-full max-w-full flex-col overflow-hidden py-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:py-4 sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:items-center md:justify-center">
                  <div className="flex min-h-0 w-full max-w-full flex-1 flex-col items-center justify-center md:w-auto md:flex-none md:[--board-size:min(calc(100dvw-2rem-4.5rem),calc(100dvh-2rem-9.5rem))]">
                    <div className="relative flex min-h-0 min-w-0 w-full max-w-full flex-1 items-center justify-center overflow-hidden [container-type:size] md:w-auto md:flex-none md:shrink-0 md:overflow-visible md:[container-type:normal]">
                      <BoardPlayerDocks>
                        <BoardDiceZone>
                          <ParquesBoard className="[--board-dim:min(100cqw,calc(100cqh-7.5rem))] md:[--board-dim:var(--board-size)]" />
                          <TurnAnnouncement />
                          <WinnerAnnouncement />
                          {tutorial ? <InGameTutorialOverlay /> : null}
                        </BoardDiceZone>
                      </BoardPlayerDocks>
                    </div>
                  </div>
                </main>
              </div>
              <DiceCursor />
            </DiceProvider>
          </GameStateProvider>
        </TurnProvider>
      </AutoModeProvider>
    </PlayersProvider>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tutorial ? (
        <InGameTutorialProvider>{gameTree}</InGameTutorialProvider>
      ) : (
        gameTree
      )}
    </div>
  );
}
