import { NextResponse } from "next/server";

/** @deprecated Fixed competitive entry removed — use party contribute flow. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Competitive entry confirmation is no longer supported. Use party contribution instead.",
    },
    { status: 410 },
  );
}
