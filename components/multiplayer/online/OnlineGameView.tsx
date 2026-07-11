"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ParquesBoard } from "@/components/board/ParquesBoard";
import { BoardDiceZone } from "@/components/board/BoardDiceZone";
import { AutoModeProvider } from "@/components/game/AutoModeContext";
import { BotController } from "@/components/game/BotController";
import { DiceCursor } from "@/components/dice/DiceCursor";
import { PlayersProvider } from "@/components/game/PlayersContext";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { OnlineDiceProvider } from "@/components/multiplayer/online/OnlineDiceProvider";
import { OnlineGameStateProvider } from "@/components/multiplayer/online/OnlineGameStateProvider";
import { OnlineSessionProvider } from "@/components/multiplayer/online/OnlineSessionContext";
import { OnlineTurnProvider } from "@/components/multiplayer/online/OnlineTurnProvider";
import { TurnAnnouncement } from "@/components/turn/TurnAnnouncement";
import { TurnPanel } from "@/components/turn/TurnPanel";
import { WinnerAnnouncement } from "@/components/turn/WinnerAnnouncement";
import type { OnlineGameStateView } from "@/lib/game/online-types";
import { useGameRealtime } from "@/lib/game/use-game-realtime";
import { retroBackButtonClassName } from "@/lib/fonts";
import { getGuestIdentity } from "@/lib/room/guest";
import type { RoomView } from "@/lib/room/types";

export function OnlineGameView({ code }: { code: string }) {
  const { t } = useTranslations();
  const router = useRouter();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [game, setGame] = useState<OnlineGameStateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const applyGame = useCallback((next: OnlineGameStateView) => {
    setGame((prev) => {
      if (prev && next.version < prev.version) return prev;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = await authHeaders();
        const guest = getGuestIdentity();
        const params = new URLSearchParams({ code });
        params.set("guestSessionId", guest.guestSessionId);
        params.set("guestName", guest.guestName);

        const res = await fetch(`/api/game?${params.toString()}`, { headers });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? t("room.gameError"));
        }

        const data = (await res.json()) as {
          room: RoomView;
          game: OnlineGameStateView;
        };
        if (cancelled) return;
        setRoom(data.room);
        setGame(data.game);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("room.gameError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authHeaders, code, ready, t]);

  useGameRealtime({
    roomId: room?.id ?? null,
    onGame: applyGame,
  });

  if (!ready || loading) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-8">
        <p className="text-sm text-[var(--board-path-border)]">
          {t("room.loadingGame")}
        </p>
      </main>
    );
  }

  if (error || !room || !game) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
        <p className="max-w-md text-center text-sm text-[var(--board-red)]">
          {error ?? t("room.gameError")}
        </p>
        <button
          type="button"
          className={retroBackButtonClassName}
          onClick={() => router.replace("/multiplayer")}
        >
          {t("room.back")}
        </button>
      </main>
    );
  }

  const self = room.players.find((player) => player.isSelf);
  if (!self) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
        <p className="max-w-md text-center text-sm text-[var(--board-red)]">
          {t("room.gameError")}
        </p>
        <button
          type="button"
          className={retroBackButtonClassName}
          onClick={() => router.replace("/multiplayer")}
        >
          {t("room.back")}
        </button>
      </main>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <OnlineSessionProvider
        code={code}
        room={room}
        game={game}
        selfColor={self.color}
        applyGame={applyGame}
        getAuthHeaders={authHeaders}
      >
        <PlayersProvider activePlayers={game.activePlayers} botPlayers={[]}>
          <AutoModeProvider canControlAuto={(color) => color === self.color}>
            <OnlineTurnProvider>
              <OnlineGameStateProvider>
                <OnlineDiceProvider>
                  <BotController />
                  <main className="flex min-h-0 flex-1 w-full max-w-full flex-col overflow-hidden py-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:py-4 sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:items-center md:justify-center">
                    <div className="flex min-h-0 w-full max-w-full flex-1 flex-col gap-2 md:w-auto md:flex-none md:flex-row md:items-stretch md:gap-4 md:[--board-size:min(calc(100dvw-2rem-var(--turn-panel-width)-1rem),calc(100dvh-2rem))] md:[--turn-panel-width:17rem]">
                      <div className="relative flex min-h-0 min-w-0 w-full max-w-full flex-1 items-center justify-center overflow-hidden [container-type:size] md:w-auto md:flex-none md:shrink-0 md:overflow-visible md:[container-type:normal]">
                        <BoardDiceZone>
                          <ParquesBoard className="[--board-dim:min(100cqw,100cqh)] md:[--board-dim:var(--board-size)]" />
                          <TurnAnnouncement />
                          <WinnerAnnouncement />
                        </BoardDiceZone>
                      </div>
                      <TurnPanel />
                    </div>
                  </main>
                  <DiceCursor />
                </OnlineDiceProvider>
              </OnlineGameStateProvider>
            </OnlineTurnProvider>
          </AutoModeProvider>
        </PlayersProvider>
      </OnlineSessionProvider>
    </div>
  );
}
