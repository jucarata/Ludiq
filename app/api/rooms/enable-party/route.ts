import { NextResponse } from "next/server";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/room/code";
import { parseRoomMode } from "@/lib/room/mode";
import { enablePartyMode, resolveRoomIdentity } from "@/lib/room/service";

type EnablePartyBody = {
  code?: string;
  mode?: string;
  escrowRoomKey?: string;
  openTxHash?: string;
  guestSessionId?: string;
  guestName?: string;
};

export async function POST(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const body = (await request.json()) as EnablePartyBody;
    const code = normalizeRoomCode(body.code ?? "");
    const mode = parseRoomMode(body.mode);

    if (!isValidRoomCode(code)) {
      return NextResponse.json(
        { error: "Invalid room code" },
        { status: 400 },
      );
    }
    if (!body.escrowRoomKey || !body.openTxHash) {
      return NextResponse.json(
        { error: "escrowRoomKey and openTxHash are required" },
        { status: 400 },
      );
    }

    const identity = await resolveRoomIdentity({
      privyUserId,
      guestSessionId: body.guestSessionId,
      guestName: body.guestName,
    });

    if (!identity || identity.kind !== "profile") {
      return NextResponse.json(
        { error: "Authentication is required to enable Party mode" },
        { status: 401 },
      );
    }

    const room = await enablePartyMode({
      code,
      identity,
      mode,
      escrowRoomKey: body.escrowRoomKey,
      openTxHash: body.openTxHash,
    });

    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
