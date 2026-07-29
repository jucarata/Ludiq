import { Suspense } from "react";
import { FriendsAuthGate } from "@/components/multiplayer/FriendsAuthGate";
import { CreateRoomView } from "@/components/multiplayer/CreateRoomView";

export default function CreateRoomPage() {
  return (
    <Suspense fallback={null}>
      <FriendsAuthGate>
        <CreateRoomView />
      </FriendsAuthGate>
    </Suspense>
  );
}
