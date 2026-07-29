import { Suspense } from "react";
import { JoinRoomView } from "@/components/multiplayer/JoinRoomView";

export default function JoinRoomPage() {
  return (
    <Suspense fallback={null}>
      <JoinRoomView />
    </Suspense>
  );
}
