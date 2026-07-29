import { Suspense } from "react";
import { MultiplayerHub } from "@/components/multiplayer/MultiplayerHub";
import { AppFooter } from "@/components/nav/AppFooter";

export default function FriendsPage() {
  return (
    <>
      <Suspense fallback={null}>
        <MultiplayerHub />
      </Suspense>
      <AppFooter />
    </>
  );
}
