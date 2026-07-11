import { Suspense } from "react";
import { MultiplayerHub } from "@/components/multiplayer/MultiplayerHub";
import { AppFooter } from "@/components/nav/AppFooter";

export default function MultiplayerPage() {
  return (
    <>
      <Suspense fallback={null}>
        <MultiplayerHub />
      </Suspense>
      <AppFooter />
    </>
  );
}
