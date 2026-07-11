import { Suspense } from "react";
import { MultiplayerHub } from "@/components/multiplayer/MultiplayerHub";

export default function MultiplayerPage() {
  return (
    <Suspense fallback={null}>
      <MultiplayerHub />
    </Suspense>
  );
}
