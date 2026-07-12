"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { RoomLobby } from "@/components/multiplayer/RoomLobby";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { AppFooter } from "@/components/nav/AppFooter";
import type { PlayerColor } from "@/lib/board/types";
import type { Profile } from "@/lib/profile/types";
import { retroActionFont, retroPlayButtonClassName } from "@/lib/fonts";
import type { MessageKey } from "@/lib/i18n";
import {
  isValidRoomCode,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
} from "@/lib/room/code";
import { clearStoredHostRoomCode, getGuestIdentity } from "@/lib/room/guest";
import { withOptimisticColor } from "@/lib/room/optimistic";
import type { RoomView } from "@/lib/room/types";
import { useRoomRealtime } from "@/lib/room/use-room-realtime";

function mapJoinError(error: string | undefined): MessageKey {
  switch (error) {
    case "Room not found":
      return "room.notFound";
    case "Room is full":
      return "room.full";
    case "Room is not waiting":
      return "room.notWaiting";
    case "Invalid room code":
      return "room.invalidCode";
    default:
      return "room.joinError";
  }
}

export function JoinRoomView() {
  const { t } = useTranslations();
  const router = useRouter();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [codeInput, setCodeInput] = useState("");
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [changingColor, setChangingColor] = useState(false);
  const [closing, setClosing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [starting, setStarting] = useState(false);
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

  const handleCodeChange = (value: string) => {
    setCodeInput(normalizeRoomCode(value));
    setError(null);
  };

  const handleJoin = async () => {
    const code = normalizeRoomCode(codeInput);
    if (!isValidRoomCode(code)) {
      setError(t("room.invalidCode"));
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const guest = getGuestIdentity();

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

      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers,
        body: JSON.stringify(
          hasProfileUsername
            ? { code }
            : {
                code,
                guestSessionId: guest.guestSessionId,
                guestName: guest.guestName,
              },
        ),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(t(mapJoinError(data?.error)));
      }

      const data = (await res.json()) as { room: RoomView };
      setRoom(data.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("room.joinError"));
    } finally {
      setJoining(false);
    }
  };

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

  if (!ready) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-8">
        <p className="text-sm text-[var(--board-path-border)]">
          {t("room.joining")}
        </p>
      </main>
    );
  }

  if (room) {
    return (
      <RoomLobby
        title={t("room.lobbyTitle")}
        subtitle={t("room.lobbySubtitle")}
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

  const canJoin = isValidRoomCode(codeInput) && !joining;

  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-4xl font-black tracking-tight text-[var(--board-path)] sm:text-5xl">
            {t("room.joinTitle")}
          </h1>
          <p className="max-w-md text-sm text-[var(--board-path-border)]">
            {t("room.joinSubtitle")}
          </p>
        </div>

        <form
          className="flex w-full max-w-sm flex-col items-center gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleJoin();
          }}
        >
          <label className="flex w-full flex-col items-center gap-3">
            <span className="text-sm font-semibold uppercase tracking-wide text-[var(--board-path-border)]">
              {t("room.codeLabel")}
            </span>
            <input
              value={codeInput}
              onChange={(event) => handleCodeChange(event.target.value)}
              maxLength={ROOM_CODE_LENGTH}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              placeholder="ABCD"
              aria-label={t("room.codeLabel")}
              className={`${retroActionFont.className} w-full rounded-2xl border-4 border-[var(--board-path-border)] bg-[#2a2a3e] px-6 py-5 text-center text-3xl tracking-[0.35em] text-[var(--board-path)] outline-none placeholder:text-[var(--board-path-border)]/40 focus:border-[var(--board-green)] sm:text-4xl`}
            />
          </label>

          {error ? (
            <p className="text-center text-sm text-[var(--board-red)]">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={!canJoin}
            className={retroPlayButtonClassName}
          >
            {joining ? t("room.joining") : t("room.joinAction")}
          </button>
        </form>
      </main>
      <AppFooter />
    </>
  );
}
