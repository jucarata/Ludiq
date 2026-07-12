import { NextResponse } from "next/server";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/room/code";
import { kickPlayer, resolveRoomIdentity } from "@/lib/room/service";

type KickBody = {
  code?: string;
  targetPlayerId?: string;
  guestSessionId?: string;
  guestName?: string;
};

export async function POST(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const body = (await request.json()) as KickBody;
    const code = normalizeRoomCode(body.code ?? "");
    const targetPlayerId = body.targetPlayerId?.trim() ?? "";

    if (!isValidRoomCode(code)) {
      return NextResponse.json(
        { error: "Invalid room code" },
        { status: 400 },
      );
    }

    if (!targetPlayerId) {
      return NextResponse.json(
        { error: "Player id is required" },
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

    const room = await kickPlayer({ code, targetPlayerId, identity });
    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
