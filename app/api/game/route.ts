import { NextResponse } from "next/server";
import { getOnlineGame } from "@/lib/game/online-service";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/room/code";
import { parseRoomMode } from "@/lib/room/mode";
import { resolveRoomIdentity } from "@/lib/room/service";

export async function GET(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const { searchParams } = new URL(request.url);
    const code = normalizeRoomCode(searchParams.get("code") ?? "");
    const mode = parseRoomMode(searchParams.get("mode"));

    if (!isValidRoomCode(code)) {
      return NextResponse.json(
        { error: "Invalid room code" },
        { status: 400 },
      );
    }

    const identity = await resolveRoomIdentity({
      privyUserId,
      guestSessionId: searchParams.get("guestSessionId"),
      guestName: searchParams.get("guestName"),
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Guest session is required" },
        { status: 400 },
      );
    }

    const result = await getOnlineGame({ code, identity, mode });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
