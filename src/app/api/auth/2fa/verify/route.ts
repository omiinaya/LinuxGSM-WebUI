import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, createSession } from "@/lib/auth";
import { verifyTOTP } from "@/lib/auth";
import { logAuthEvent } from "@/lib/audit";

// Simple in-memory pending 2FA tokens store
const pending2FATokens = new Map<string, { userId: string; expires: number }>();

function createPendingToken(userId: string): string {
  const token = crypto.randomUUID();
  pending2FATokens.set(token, { userId, expires: Date.now() + 5 * 60 * 1000 });
  return token;
}

function verifyPendingToken(token: string): { userId: string } | null {
  const entry = pending2FATokens.get(token);
  if (!entry || entry.expires < Date.now()) {
    pending2FATokens.delete(token);
    return null;
  }
  pending2FATokens.delete(token);
  return { userId: entry.userId };
}

export async function POST(request: NextRequest) {
  try {
    const { pendingToken, code } = await request.json();

    if (!pendingToken || !code) {
      return NextResponse.json(
        { error: "Pending token and verification code required" },
        { status: 400 }
      );
    }

    // Verify pending token
    const pending = verifyPendingToken(pendingToken);
    if (!pending) {
      return NextResponse.json(
        { error: "Invalid or expired pending token" },
        { status: 400 }
      );
    }

    const user = await getUserById(pending.userId);
    if (!user || !user.totpSecret) {
      return NextResponse.json(
        { error: "User not found or 2FA not enabled" },
        { status: 400 }
      );
    }

    // Verify TOTP code
    if (!verifyTOTP(user.totpSecret, code)) {
      await logAuthEvent("login_2fa_failed", user.id, user.username, { reason: "invalid_code" });
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    // Create session
    const session = await createSession(user.id);
    await logAuthEvent("login", user.id, user.username, { "2fa": true });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        totpEnabled: user.totpEnabled,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set("session_token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
