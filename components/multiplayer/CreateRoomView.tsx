"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { RoomLobby } from "@/components/multiplayer/RoomLobby";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import type { PlayerColor } from "@/lib/board/types";
import type { Profile } from "@/lib/profile/types";
import { retroBackButtonClassName } from "@/lib/fonts";
import {
  clearStoredHostRoomCode,
  getGuestIdentity,
  getStoredHostRoomCode,
  setStoredHostRoomCode,
} from "@/lib/room/guest";
import { withOptimisticColor } from "@/lib/room/optimistic";
import type { RoomView } from "@/lib/room/types";
import { useRoomRealtime } from "@/lib/room/use-room-realtime";

export function CreateRoomView() {
  const { t } = useTranslations();
  const router = useRouter();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingColor, setChangingColor] = useState(false);
  const [closing, setClosing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const bootstrapped = useRef(false);
  const closingRef = useRef(false);
  const leavingRef = useRef(false);
  const startingRef = useRef(false);
  const pendingColorRef = useRef<PlayerColor | null>(null);

  const authHeaders = useCallback(async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authenticated) {
      const token = await getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }, [authenticated, getAccessToken]);

  const applyRoomUpdate = useCallback((next: RoomView) => {
    if (pendingColorRef.current) {
      setRoom(withOptimisticColor(next, pendingColorRef.current));
      return;
    }
    setRoom(next);
  }, []);

  useRoomRealtime({
    room,
    getAuthHeaders: authHeaders,
    onRoom: applyRoomUpdate,
    onClosed: () => {
      if (closingRef.current || leavingRef.current || startingRef.current) {
        return;
      }
      clearStoredHostRoomCode();
      setRoom(null);
      router.replace("/multiplayer?closed=1");
    },
    onGameStarted: (next) => {
      clearStoredHostRoomCode();
      router.replace(`/multiplayer/play/${next.code}`);
    },
  });

  const bootstrapRoom = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const guest = getGuestIdentity();
      const storedCode = getStoredHostRoomCode();

      if (storedCode) {
        const params = new URLSearchParams({ code: storedCode });
        params.set("guestSessionId", guest.guestSessionId);
        params.set("guestName", guest.guestName);

        const existingRes = await fetch(`/api/rooms?${params.toString()}`, {
          headers,
        });

        if (existingRes.ok) {
          const data = (await existingRes.json()) as { room: RoomView };
          if (
            data.room.status === "waiting" &&
            data.room.players.some((player) => player.isSelf)
          ) {
            setRoom(data.room);
            return;
          }
          if (
            data.room.status === "playing" &&
            data.room.players.some((player) => player.isSelf)
          ) {
            clearStoredHostRoomCode();
            router.replace(`/multiplayer/play/${data.room.code}`);
            return;
          }
          clearStoredHostRoomCode();
        } else {
          clearStoredHostRoomCode();
        }
      }

      let hasProfileUsername = false;
      if (authenticated) {
        const profileRes = await fetch("/api/profile", { headers });
        if (profileRes.ok) {
          const profileData = (await profileRes.json()) as {
            profile: Profile | null;
          };
          hasProfileUsername = Boolean(profileData.profile?.username);
        }
      }

      const createRes = await fetch("/api/rooms", {
        method: "POST",
        headers,
        body: JSON.stringify(
          hasProfileUsername
            ? {}
            : {
                guestSessionId: guest.guestSessionId,
                guestName: guest.guestName,
              },
        ),
      });

      if (!createRes.ok) {
        const data = (await createRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? t("room.createError"));
      }

      const data = (await createRes.json()) as { room: RoomView };
      setStoredHostRoomCode(data.room.code);
      setRoom(data.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("room.createError"));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, authenticated, router, t]);

  useEffect(() => {
    if (!ready || bootstrapped.current) return;
    bootstrapped.current = true;
    void bootstrapRoom();
  }, [ready, bootstrapRoom]);

  const handleSelectColor = async (color: PlayerColor) => {
    if (!room || changingColor || closing) return;
    const myColor = room.players.find((player) => player.isSelf)?.color;
    if (color === myColor) return;

    const taken = room.players.some(
      (player) => player.color === color && !player.isSelf,
    );
    if (taken) return;

    const previousRoom = room;
    pendingColorRef.current = color;
    setRoom(withOptimisticColor(room, color));
    setChangingColor(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const selfPlayer = previousRoom.players.find((player) => player.isSelf);
      const body: {
        code: string;
        color: PlayerColor;
        guestSessionId?: string;
        guestName?: string;
      } = {
        code: previousRoom.code,
        color,
      };

      if (selfPlayer?.isGuest) {
        const guest = getGuestIdentity();
        body.guestSessionId = guest.guestSessionId;
        body.guestName = selfPlayer.username || guest.guestName;
      }

      const res = await fetch("/api/rooms/color", {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? t("room.colorError"));
      }

      const data = (await res.json()) as { room: RoomView };
      pendingColorRef.current = null;
      setRoom(data.room);
    } catch (err) {
      pendingColorRef.current = null;
      setRoom(previousRoom);
      setError(err instanceof Error ? err.message : t("room.colorError"));
    } finally {
      setChangingColor(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!room || leaving || closing) return;

    leavingRef.current = true;
    setLeaving(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const selfPlayer = room.players.find((player) => player.isSelf);
      const body: {
        code: string;
        guestSessionId?: string;
        guestName?: string;
      } = {
        code: room.code,
      };

      if (selfPlayer?.isGuest) {
        const guest = getGuestIdentity();
        body.guestSessionId = guest.guestSessionId;
        body.guestName = selfPlayer.username || guest.guestName;
      }

      const res = await fetch("/api/rooms/leave", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? t("room.leaveError"));
      }

      clearStoredHostRoomCode();
      setRoom(null);
      router.replace("/multiplayer?mode=free");
    } catch (err) {
      leavingRef.current = false;
      setError(err instanceof Error ? err.message : t("room.leaveError"));
      setLeaving(false);
    }
  };

  const handleCloseRoom = async () => {
    if (!room || closing) return;

    closingRef.current = true;
    setClosing(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const selfPlayer = room.players.find((player) => player.isSelf);
      const body: {
        code: string;
        guestSessionId?: string;
        guestName?: string;
      } = {
        code: room.code,
      };

      if (selfPlayer?.isGuest) {
        const guest = getGuestIdentity();
        body.guestSessionId = guest.guestSessionId;
        body.guestName = selfPlayer.username || guest.guestName;
      }

      const res = await fetch("/api/rooms/close", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? t("room.closeError"));
      }

      clearStoredHostRoomCode();
      router.push("/multiplayer?mode=free");
    } catch (err) {
      closingRef.current = false;
      setError(err instanceof Error ? err.message : t("room.closeError"));
      setClosing(false);
    }
  };

  const handleStartGame = async () => {
    if (!room || starting || closing || leaving) return;
    if (room.players.length < 2) return;

    startingRef.current = true;
    setStarting(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const selfPlayer = room.players.find((player) => player.isSelf);
      const body: {
        code: string;
        guestSessionId?: string;
        guestName?: string;
      } = {
        code: room.code,
      };

      if (selfPlayer?.isGuest) {
        const guest = getGuestIdentity();
        body.guestSessionId = guest.guestSessionId;
        body.guestName = selfPlayer.username || guest.guestName;
      }

      const res = await fetch("/api/rooms/start", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? t("room.startError"));
      }

      clearStoredHostRoomCode();
      router.replace(`/multiplayer/play/${room.code}`);
    } catch (err) {
      startingRef.current = false;
      setError(err instanceof Error ? err.message : t("room.startError"));
      setStarting(false);
    }
  };

  if (!ready || loading) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-8">
        <p className="text-sm text-[var(--board-path-border)]">
          {t("room.creating")}
        </p>
      </main>
    );
  }

  if (error && !room) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
        <p className="max-w-md text-center text-sm text-[var(--board-red)]">
          {error}
        </p>
        <button
          type="button"
          className={retroBackButtonClassName}
          onClick={() => {
            bootstrapped.current = true;
            void bootstrapRoom();
          }}
        >
          {t("room.retry")}
        </button>
        <Link href="/multiplayer?mode=free" className={retroBackButtonClassName}>
          {t("room.back")}
        </Link>
      </main>
    );
  }

  if (!room) return null;

  return (
    <RoomLobby
      title={t("room.createTitle")}
      subtitle={t("room.createSubtitle")}
      room={room}
      changingColor={changingColor}
      closing={closing}
      leaving={leaving}
      starting={starting}
      error={error}
      onSelectColor={(color) => void handleSelectColor(color)}
      onLeave={() => void handleLeaveRoom()}
      onCloseRoom={() => void handleCloseRoom()}
      onStartGame={() => void handleStartGame()}
    />
  );
}
