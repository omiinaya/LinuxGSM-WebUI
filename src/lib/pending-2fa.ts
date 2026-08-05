/**
 * Pending 2FA tokens — shared across route modules.
 *
 * Next.js App Router compiles each route.ts into a separate module instance,
 * so module-level state declared inside login/route.ts is NOT visible to
 * 2fa/verify/route.ts. The original code declared `pending2FATokens` in both
 * files, which meant the token created at login could never be verified —
 * 2FA-enabled users were permanently locked out.
 *
 * This module is imported by BOTH routes so they share one Map. Note: in
 * serverless/multi-instance deployments this would need Redis or a DB; for
 * the file-backed single-process deployment it is correct.
 */
const pending2FATokens = new Map<string, { userId: string; expires: number }>();

export function createPendingToken(userId: string): string {
  const token = crypto.randomUUID();
  pending2FATokens.set(token, { userId, expires: Date.now() + 5 * 60 * 1000 });
  return token;
}

export function verifyPendingToken(
  token: string,
): { userId: string } | null {
  const entry = pending2FATokens.get(token);
  if (!entry || entry.expires < Date.now()) {
    pending2FATokens.delete(token);
    return null;
  }
  pending2FATokens.delete(token);
  return { userId: entry.userId };
}

export function cleanupExpiredPendingTokens(): void {
  const now = Date.now();
  const expired: string[] = [];
  pending2FATokens.forEach((entry, token) => {
    if (entry.expires < now) expired.push(token);
  });
  expired.forEach((token) => pending2FATokens.delete(token));
}