"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppAuth } from "@/lib/auth/useAppAuth";
import { DiceWaitScreen } from "@/components/multiplayer/DiceWaitScreen";
import { RoomLobby } from "@/components/multiplayer/RoomLobby";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import type { PlayerColor } from "@/lib/board/types";
import { isPotOpenStatus } from "@/lib/celo/constants";
import {
  contributeParty,
  fullRefundParty,
  kickRefundParty,
  openPartyRoom,
  refundPartyPool,
  withdrawPartyContribution,
} from "@/lib/celo/wallet-client";
import { resolveCompetitiveWallet } from "@/lib/celo/resolve-competitive-wallet";
import type { Profile } from "@/lib/profile/types";
import { retroBackButtonClassName } from "@/lib/fonts";
import {
  clearStoredHostRoomCode,
  getGuestIdentity,
  getStoredHostRoom,
  setStoredHostRoomCode,
} from "@/lib/room/guest";
import { isPartyMode, parseRoomMode, type RoomMode } from "@/lib/room/mode";
import { withOptimisticColor } from "@/lib/room/optimistic";
import type { RoomView } from "@/lib/room/types";
import { useRoomRealtime } from "@/lib/room/use-room-realtime";
import type { Address, Hex } from "viem";

export function CreateRoomView() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseRoomMode(searchParams.get("mode"));
  const hubHref = "/friends";
  const { ready, authenticated, getAccessToken, competitiveWallets } =
    useAppAuth();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingColor, setChangingColor] = useState(false);
  const [closing, setClosing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [kicking, setKicking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [enablingParty, setEnablingParty] = useState(false);
  const [contributing, setContributing] = useState(false);
  const bootstrapped = useRef(false);
  const closingRef = useRef(false);
  const leavingRef = useRef(false);
  const kickingRef = useRef(false);
  const startingRef = useRef(false);
  const enablingPartyRef = useRef(false);
  const contributingRef = useRef(false);
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

  const playHref = useCallback(
    (code: string, roomMode: RoomMode = mode) =>
      `/friends/play/${code}?mode=${roomMode}`,
    [mode],
  );

  useRoomRealtime({
    room,
    getAuthHeaders: authHeaders,
    onRoom: applyRoomUpdate,
    onClosed: () => {
      if (
        closingRef.current ||
        leavingRef.current ||
        kickingRef.current ||
        startingRef.current ||
        enablingPartyRef.current ||
        contributingRef.current
      ) {
        return;
      }
      clearStoredHostRoomCode(room?.mode ?? mode);
      setRoom(null);
      router.replace(`${hubHref}?closed=1`);
    },
    onKicked: () => {
      if (
        closingRef.current ||
        leavingRef.current ||
        startingRef.current ||
        enablingPartyRef.current ||
        contributingRef.current
      ) {
        return;
      }
      clearStoredHostRoomCode(room?.mode ?? mode);
      setRoom(null);
      router.replace(`${hubHref}?kicked=1`);
    },
    onGameStarted: (next) => {
      clearStoredHostRoomCode(next.mode);
      router.replace(playHref(next.code, next.mode));
    },
  });

  const bootstrapRoom = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const guest = getGuestIdentity();
      const stored = getStoredHostRoom();

      if (stored) {
        const params = new URLSearchParams({
          code: stored.code,
          mode: stored.mode,
        });
        params.set("guestSessionId", guest.guestSessionId);
        params.set("guestName", guest.guestName);

        const existingRes = await fetch(`/api/rooms?${params.toString()}`, {
          headers,
        });

        if (existingRes.ok) {
          const data = (await existingRes.json()) as { room: RoomView };
          const isMember = data.room.players.some((player) => player.isSelf);

          if (data.room.status === "waiting" && isMember) {
            setStoredHostRoomCode(data.room.code, data.room.mode);
            setRoom(data.room);
            return;
          }
          if (data.room.status === "playing" && isMember) {
            clearStoredHostRoomCode(data.room.mode);
            router.replace(playHref(data.room.code, data.room.mode));
            return;
          }
          // Finished / not a member — drop pointer and create a fresh room.
          clearStoredHostRoomCode(stored.mode);
        } else {
          clearStoredHostRoomCode(stored.mode);
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

      const createBody: {
        mode: typeof mode;
        guestSessionId?: string;
        guestName?: string;
      } = { mode };

      if (!hasProfileUsername) {
        createBody.guestSessionId = guest.guestSessionId;
        createBody.guestName = guest.guestName;
      }

      const createRes = await fetch("/api/rooms", {
        method: "POST",
        headers,
        body: JSON.stringify(createBody),
      });

      if (!createRes.ok) {
        const data = (await createRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? t("room.createError"));
      }

      const data = (await createRes.json()) as { room: RoomView };
      setStoredHostRoomCode(data.room.code, data.room.mode);
      setRoom(data.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("room.createError"));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, authenticated, mode, playHref, router, t]);

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
    const roomMode = previousRoom.mode;
    pendingColorRef.current = color;
    setRoom(withOptimisticColor(room, color));
    setChangingColor(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const selfPlayer = previousRoom.players.find((player) => player.isSelf);
      const body: {
        code: string;
        mode: RoomMode;
        color: PlayerColor;
        guestSessionId?: string;
        guestName?: string;
      } = {
        code: previousRoom.code,
        mode: roomMode,
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

  const refundIfNeeded = async (
    current: RoomView,
    options?: { full?: boolean },
  ): Promise<string | undefined> => {
    const selfPlayer = current.players.find((player) => player.isSelf);
    if (
      !isPartyMode(current.mode) ||
      !isPotOpenStatus(current.potStatus) ||
      !current.escrowRoomKey ||
      !selfPlayer?.isHost
    ) {
      return undefined;
    }

    // Full refund after pot lock failure / cancelled game with open pot.
    const useFullRefund =
      options?.full === true || current.status === "finished";

    try {
      const headers = await authHeaders();
      const profileRes = await fetch("/api/profile", { headers });
      let profileWallet: string | null = null;
      if (profileRes.ok) {
        const profileData = (await profileRes.json()) as {
          profile: Profile | null;
        };
        profileWallet = profileData.profile?.wallet_address ?? null;
      }
      if (!profileWallet) throw new Error(t("room.refundError"));

      const wallet = await resolveCompetitiveWallet({
        profileWallet,
        privyWallets: competitiveWallets,
      });
      const roomKey = current.escrowRoomKey as Hex;
      if (useFullRefund) {
        return await fullRefundParty({ wallet, roomKey });
      }
      return await refundPartyPool({ wallet, roomKey });
    } catch {
      throw new Error(t("room.refundError"));
    }
  };

  const resolveProfileWalletAddress = async (): Promise<string> => {
    const headers = await authHeaders();
    const profileRes = await fetch("/api/profile", { headers });
    let profileWallet: string | null = null;
    if (profileRes.ok) {
      const profileData = (await profileRes.json()) as {
        profile: Profile | null;
      };
      profileWallet = profileData.profile?.wallet_address ?? null;
    }
    if (!profileWallet) throw new Error(t("room.depositWalletRequired"));
    return profileWallet;
  };

  const handleLeaveRoom = async () => {
    if (!room || leaving || closing) return;

    leavingRef.current = true;
    setLeaving(true);
    setError(null);

    try {
      const roomMode = room.mode;
      const headers = await authHeaders();
      const selfPlayer = room.players.find((player) => player.isSelf);
      const body: {
        code: string;
        mode: RoomMode;
        guestSessionId?: string;
        guestName?: string;
        refundTxHash?: string;
        withdrawTxHash?: string;
      } = {
        code: room.code,
        mode: roomMode,
      };

      if (selfPlayer?.isHost) {
        const refundTxHash = await refundIfNeeded(room);
        if (refundTxHash) body.refundTxHash = refundTxHash;
      } else if (
        isPartyMode(room.mode) &&
        isPotOpenStatus(room.potStatus) &&
        room.escrowRoomKey &&
        selfPlayer &&
        selfPlayer.contributedPoolUsdt > 0
      ) {
        try {
          const profileWallet = await resolveProfileWalletAddress();
          const wallet = await resolveCompetitiveWallet({
            profileWallet,
            privyWallets: competitiveWallets,
          });
          body.withdrawTxHash = await withdrawPartyContribution({
            wallet,
            roomKey: room.escrowRoomKey as Hex,
          });
        } catch (err) {
          throw new Error(
            err instanceof Error ? err.message : t("room.leaveWithdrawError"),
          );
        }
      }

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

      clearStoredHostRoomCode(roomMode);
      setRoom(null);
      router.replace(hubHref);
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
      const roomMode = room.mode;
      const refundTxHash = await refundIfNeeded(room);
      const headers = await authHeaders();
      const selfPlayer = room.players.find((player) => player.isSelf);
      const body: {
        code: string;
        mode: RoomMode;
        guestSessionId?: string;
        guestName?: string;
        refundTxHash?: string;
      } = {
        code: room.code,
        mode: roomMode,
      };

      if (refundTxHash) body.refundTxHash = refundTxHash;

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

      clearStoredHostRoomCode(roomMode);
      router.push(hubHref);
    } catch (err) {
      closingRef.current = false;
      setError(err instanceof Error ? err.message : t("room.closeError"));
      setClosing(false);
    }
  };

  const handleKickPlayer = async (targetPlayerId: string) => {
    if (!room || kicking || closing || leaving) return;

    kickingRef.current = true;
    setKicking(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const selfPlayer = room.players.find((player) => player.isSelf);
      const target = room.players.find((player) => player.id === targetPlayerId);
      const body: {
        code: string;
        mode: RoomMode;
        targetPlayerId: string;
        kickRefundTxHash?: string;
        guestSessionId?: string;
        guestName?: string;
      } = {
        code: room.code,
        mode: room.mode,
        targetPlayerId,
      };

      if (
        isPartyMode(room.mode) &&
        isPotOpenStatus(room.potStatus) &&
        room.escrowRoomKey &&
        target &&
        target.contributedPoolUsdt > 0
      ) {
        if (!target.walletAddress) {
          throw new Error(t("room.kickError"));
        }
        const profileWallet = await resolveProfileWalletAddress();
        const wallet = await resolveCompetitiveWallet({
          profileWallet,
          privyWallets: competitiveWallets,
        });
        body.kickRefundTxHash = await kickRefundParty({
          wallet,
          roomKey: room.escrowRoomKey as Hex,
          player: target.walletAddress as Address,
        });
      }

      if (selfPlayer?.isGuest) {
        const guest = getGuestIdentity();
        body.guestSessionId = guest.guestSessionId;
        body.guestName = selfPlayer.username || guest.guestName;
      }

      const res = await fetch("/api/rooms/kick", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? t("room.kickError"));
      }

      const data = (await res.json()) as { room: RoomView };
      setRoom(data.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("room.kickError"));
    } finally {
      kickingRef.current = false;
      setKicking(false);
    }
  };

  const handleEnableParty = async () => {
    if (!room || enablingParty || closing || leaving || contributing) return;

    if (!authenticated) {
      setError(t("room.enablePartyAuth"));
      return;
    }

    enablingPartyRef.current = true;
    setEnablingParty(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const profileRes = await fetch("/api/profile", { headers });
      let profileWallet: string | null = null;
      if (profileRes.ok) {
        const profileData = (await profileRes.json()) as {
          profile: Profile | null;
        };
        profileWallet = profileData.profile?.wallet_address ?? null;
      }
      if (!profileWallet) {
        throw new Error(t("room.depositWalletRequired"));
      }

      const wallet = await resolveCompetitiveWallet({
        profileWallet,
        privyWallets: competitiveWallets,
      });
      const { escrowRoomKey, openTxHash } = await openPartyRoom({
        wallet,
        walletAddress: profileWallet,
      });

      const previousMode = room.mode;
      const res = await fetch("/api/rooms/enable-party", {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: room.code,
          mode: previousMode,
          escrowRoomKey,
          openTxHash,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? t("room.enablePartyError"));
      }

      const data = (await res.json()) as { room: RoomView };
      setStoredHostRoomCode(data.room.code, data.room.mode);
      setRoom(data.room);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("room.enablePartyError"),
      );
    } finally {
      enablingPartyRef.current = false;
      setEnablingParty(false);
    }
  };

  const handleContribute = async (poolAmountUsdt: string) => {
    if (!room || contributing || closing || leaving || enablingParty) return;
    if (!isPartyMode(room.mode) || !room.escrowRoomKey) return;

    if (!authenticated) {
      setError(t("room.enablePartyAuth"));
      return;
    }

    contributingRef.current = true;
    setContributing(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const profileRes = await fetch("/api/profile", { headers });
      let profileWallet: string | null = null;
      if (profileRes.ok) {
        const profileData = (await profileRes.json()) as {
          profile: Profile | null;
        };
        profileWallet = profileData.profile?.wallet_address ?? null;
      }
      if (!profileWallet) {
        throw new Error(t("room.depositWalletRequired"));
      }

      const wallet = await resolveCompetitiveWallet({
        profileWallet,
        privyWallets: competitiveWallets,
      });
      const contributeTxHash = await contributeParty({
        wallet,
        roomKey: room.escrowRoomKey as Hex,
        poolAmountUsdt,
        walletAddress: profileWallet,
      });

      const res = await fetch("/api/rooms/contribute", {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: room.code,
          mode: room.mode,
          contributeTxHash,
          poolAmountUsdt,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? t("room.contributeError"));
      }

      const data = (await res.json()) as { room: RoomView };
      setRoom(data.room);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("room.contributeError"),
      );
    } finally {
      contributingRef.current = false;
      setContributing(false);
    }
  };

  const handleStartGame = async () => {
    if (!room || starting || closing || leaving) return;
    if (room.players.length < 2) return;

    startingRef.current = true;
    setStarting(true);
    setError(null);

    try {
      const roomMode = room.mode;
      const headers = await authHeaders();
      const selfPlayer = room.players.find((player) => player.isSelf);
      const body: {
        code: string;
        mode: RoomMode;
        guestSessionId?: string;
        guestName?: string;
      } = {
        code: room.code,
        mode: roomMode,
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

      clearStoredHostRoomCode(roomMode);
      router.replace(playHref(room.code, roomMode));
    } catch (err) {
      startingRef.current = false;
      setError(err instanceof Error ? err.message : t("room.startError"));
      setStarting(false);
    }
  };

  if (!ready || loading) {
    return (
      <DiceWaitScreen
        title={t("room.waitShuffle")}
        hint={t("room.creating")}
      />
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
        <Link href={hubHref} className={retroBackButtonClassName}>
          {t("room.back")}
        </Link>
      </main>
    );
  }

  if (!room) return null;

  return (
    <RoomLobby
      room={room}
      changingColor={changingColor}
      closing={closing}
      leaving={leaving}
      kicking={kicking}
      starting={starting}
      enablingParty={enablingParty}
      contributing={contributing}
      error={error}
      onSelectColor={(color) => void handleSelectColor(color)}
      onLeave={() => void handleLeaveRoom()}
      onCloseRoom={() => void handleCloseRoom()}
      onKickPlayer={(playerId) => void handleKickPlayer(playerId)}
      onStartGame={() => void handleStartGame()}
      onEnableParty={() => void handleEnableParty()}
      onContribute={(amount) => void handleContribute(amount)}
    />
  );
}
