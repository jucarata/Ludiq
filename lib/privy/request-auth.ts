import { verifyPrivyAuthToken } from "@/lib/privy/server";

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

/** Returns Privy user id when a valid Bearer token is present; otherwise null. */
export async function getOptionalPrivyUserId(
  request: Request,
): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  try {
    const claims = await verifyPrivyAuthToken(token);
    return claims.user_id;
  } catch {
    return null;
  }
}

export async function requirePrivyUserId(request: Request): Promise<string> {
  const token = getBearerToken(request);
  if (!token) {
    throw new Response(JSON.stringify({ error: "Missing auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const claims = await verifyPrivyAuthToken(token);
    return claims.user_id;
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
