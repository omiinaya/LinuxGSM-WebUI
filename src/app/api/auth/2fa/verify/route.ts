import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, createSession } from "@/lib/auth";
import { verifyTOTP } from "@/lib/auth";
import { logAuthEvent } from "@/lib/audit";
import { verifyPendingToken } from "@/lib/pending-2fa";

export async function POST(request: NextRequest) {
  try {
    const { pendingToken, code } = await request.json();

    if (!pendingToken || !code) {
      return NextResponse.json(
        { error: "Pending token and verification code required" },
        { status: 400 },
      );
    }

    // Verify pending token
    const pending = verifyPendingToken(pendingToken);
    if (!pending) {
      return NextResponse.json(
        { error: "Invalid or expired pending token" },
        { status: 400 },
      );
    }

    const user = await getUserById(pending.userId);
    if (!user || !user.totpSecret) {
      return NextResponse.json(
        { error: "User not found or 2FA not enabled" },
        { status: 400 },
      );
    }

    // Verify TOTP code
    if (!verifyTOTP(user.totpSecret, code)) {
      await logAuthEvent("login_2fa_failed", user.id, user.username, {
        reason: "invalid_code",
      });
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 },
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
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
