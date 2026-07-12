import { Suspense } from "react";
import { CreateRoomView } from "@/components/multiplayer/CreateRoomView";

export default function CreateRoomPage() {
  return (
    <Suspense fallback={null}>
      <CreateRoomView />
    </Suspense>
  );
}
