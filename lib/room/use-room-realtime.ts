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

type RoomStatusPayload = {
  status?: RoomView["status"];
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
  const closedRef = useRef(false);

  getAuthHeadersRef.current = getAuthHeaders;
  onRoomRef.current = onRoom;
  onClosedRef.current = onClosed;

  const emitClosed = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    onClosedRef.current?.();
  }, []);

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
      if (closedRef.current) return;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        void (async () => {
          if (closedRef.current) return;
          const next = await refreshRoom(code);
          if (closedRef.current) return;

          // Room gone or no longer joinable → kick everyone out.
          if (!next || next.status !== "waiting") {
            emitClosed();
            return;
          }

          onRoomRef.current(next);
        })();
      }, 80);
    },
    [emitClosed, refreshRoom],
  );

  useEffect(() => {
    closedRef.current = false;
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
        (payload) => {
          const nextStatus = (payload.new as RoomStatusPayload | null)?.status;
          if (nextStatus && nextStatus !== "waiting") {
            emitClosed();
            return;
          }
          scheduleRefresh(room.code);
        },
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [room?.id, room?.code, room?.status, scheduleRefresh, emitClosed]);
}
