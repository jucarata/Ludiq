"use client";

import { useCallback, useEffect, useRef } from "react";
import { getGuestIdentity } from "@/lib/room/guest";
import type { RoomView } from "@/lib/room/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type UseRoomRealtimeOptions = {
  room: RoomView | null;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onRoom: (room: RoomView) => void;
  onClosed?: () => void;
};

export function useRoomRealtime({
  room,
  getAuthHeaders,
  onRoom,
  onClosed,
}: UseRoomRealtimeOptions) {
  const getAuthHeadersRef = useRef(getAuthHeaders);
  const onRoomRef = useRef(onRoom);
  const onClosedRef = useRef(onClosed);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  getAuthHeadersRef.current = getAuthHeaders;
  onRoomRef.current = onRoom;
  onClosedRef.current = onClosed;

  const refreshRoom = useCallback(async (code: string) => {
    const headers = await getAuthHeadersRef.current();
    const guest = getGuestIdentity();
    const params = new URLSearchParams({ code });
    params.set("guestSessionId", guest.guestSessionId);
    params.set("guestName", guest.guestName);

    const res = await fetch(`/api/rooms?${params.toString()}`, { headers });
    if (!res.ok) return null;

    const data = (await res.json()) as { room: RoomView };
    return data.room;
  }, []);

  const scheduleRefresh = useCallback(
    (code: string) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        void (async () => {
          const next = await refreshRoom(code);
          if (!next) return;

          if (next.status !== "waiting") {
            onClosedRef.current?.();
            return;
          }

          onRoomRef.current(next);
        })();
      }, 120);
    },
    [refreshRoom],
  );

  useEffect(() => {
    if (!room?.id || room.status !== "waiting") return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`room-lobby:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_room_players",
          filter: `room_id=eq.${room.id}`,
        },
        () => scheduleRefresh(room.code),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${room.id}`,
        },
        () => scheduleRefresh(room.code),
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [room?.id, room?.code, room?.status, scheduleRefresh]);
}
