import { NextResponse } from "next/server";
import { getWeeklyLeaderboard } from "@/lib/leaderboard/service";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";

export async function GET(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const leaderboard = await getWeeklyLeaderboard({ privyUserId });
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("[api/leaderboard]", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
