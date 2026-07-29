import { Suspense } from "react";
import { FriendsAuthGate } from "@/components/multiplayer/FriendsAuthGate";
import { OnlineGameView } from "@/components/multiplayer/online/OnlineGameView";

type PlayPageProps = {
  params: Promise<{ code: string }>;
};

export default async function FriendsPlayPage({ params }: PlayPageProps) {
  const { code } = await params;

  return (
    <Suspense fallback={null}>
      <FriendsAuthGate>
        <OnlineGameView code={code.toUpperCase()} />
      </FriendsAuthGate>
    </Suspense>
  );
}
