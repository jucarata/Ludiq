import { Suspense } from "react";
import { FriendsAuthGate } from "@/components/multiplayer/FriendsAuthGate";
import { JoinRoomView } from "@/components/multiplayer/JoinRoomView";

export default function JoinRoomPage() {
  return (
    <Suspense fallback={null}>
      <FriendsAuthGate>
        <JoinRoomView />
      </FriendsAuthGate>
    </Suspense>
  );
}
