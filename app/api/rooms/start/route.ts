import { after, NextResponse } from "next/server";
import {
  lockCompetitivePotInBackground,
  startRoomGame,
} from "@/lib/game/online-service";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/room/code";
import { parseRoomMode } from "@/lib/room/mode";
import { resolveRoomIdentity } from "@/lib/room/service";

type StartBody = {
  code?: string;
  mode?: string;
  guestSessionId?: string;
  guestName?: string;
};

export async function POST(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const body = (await request.json()) as StartBody;
    const code = normalizeRoomCode(body.code ?? "");
    const mode = parseRoomMode(body.mode);

    if (!isValidRoomCode(code)) {
      return NextResponse.json(
        { error: "Invalid room code" },
        { status: 400 },
      );
    }

    const identity = await resolveRoomIdentity({
      privyUserId,
      guestSessionId: body.guestSessionId,
      guestName: body.guestName,
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Guest session is required" },
        { status: 400 },
      );
    }

    const { room, game, pendingLock } = await startRoomGame({
      code,
      identity,
      mode,
    });

    if (pendingLock) {
      after(() => lockCompetitivePotInBackground(pendingLock));
    }

    return NextResponse.json({ room, game });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
