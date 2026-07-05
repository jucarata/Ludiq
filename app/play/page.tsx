"use client";

import { useState } from "react";
import { GameView } from "@/components/game/GameView";
import { PlayerSetup } from "@/components/setup/PlayerSetup";
import type { PlayerColor } from "@/lib/board/types";

export default function PlayPage() {
  const [activePlayers, setActivePlayers] = useState<PlayerColor[] | null>(
    null,
  );

  if (!activePlayers) {
    return <PlayerSetup onStart={setActivePlayers} />;
  }

  return <GameView activePlayers={activePlayers} />;
}
