"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GameView } from "@/components/game/GameView";
import {
  parseGameSetupFromSearchParams,
  TUTORIAL_PRACTICE_SETUP,
  type GameSetup,
} from "@/lib/game/player-config";

function TutorialPlayInner() {
  const searchParams = useSearchParams();
  const fromParams = useMemo(
    () => parseGameSetupFromSearchParams(searchParams),
    [searchParams],
  );
  const [gameSetup, setGameSetup] = useState<GameSetup>(
    fromParams ?? TUTORIAL_PRACTICE_SETUP,
  );

  useEffect(() => {
    setGameSetup(fromParams ?? TUTORIAL_PRACTICE_SETUP);
  }, [fromParams]);

  return (
    <GameView
      activePlayers={gameSetup.activePlayers}
      botPlayers={gameSetup.botPlayers}
    />
  );
}

/** Tutorial-only practice match. Extra tutorial behaviors will land here later. */
export default function TutorialPlayPage() {
  return (
    <Suspense fallback={null}>
      <TutorialPlayInner />
    </Suspense>
  );
}
