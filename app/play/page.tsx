"use client";

import { useState } from "react";
import { GameView } from "@/components/game/GameView";
import { PlayerSetup } from "@/components/setup/PlayerSetup";
import type { GameSetup } from "@/lib/game/player-config";

export default function PlayPage() {
  const [gameSetup, setGameSetup] = useState<GameSetup | null>(null);

  if (!gameSetup) {
    return <PlayerSetup onStart={setGameSetup} />;
  }

  return (
    <GameView
      activePlayers={gameSetup.activePlayers}
      botPlayers={gameSetup.botPlayers}
    />
  );
}
