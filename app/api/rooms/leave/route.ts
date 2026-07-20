import { NextResponse } from "next/server";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/room/code";
import { parseRoomMode } from "@/lib/room/mode";
import { leaveRoom, resolveRoomIdentity } from "@/lib/room/service";

type LeaveBody = {
  code?: string;
  mode?: string;
  guestSessionId?: string;
  guestName?: string;
  refundTxHash?: string;
};

export async function POST(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const body = (await request.json()) as LeaveBody;
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

    const result = await leaveRoom({
      code,
      identity,
      mode,
      refundTxHash: body.refundTxHash,
    });
    return NextResponse.json({ ok: true, closed: result.closed });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
