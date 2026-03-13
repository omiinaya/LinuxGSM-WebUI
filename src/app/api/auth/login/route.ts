import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyUser, createSession, getSessionByToken, deleteSession } from "@/lib/auth";
import { logAuthEvent } from "@/lib/audit";

// In-memory pending 2FA tokens (userId -> expires)
// Note: In production with multiple instances, use Redis or DB
const pending2FATokens = new Map<string, { userId: string; expires: number }>();

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Get client IP
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown";

    if (!username || !password) {
      await logAuthEvent("login_failed", undefined, username, { reason: "missing_credentials" }, ip);
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    const user = await verifyUser(username, password);
    if (!user) {
      await logAuthEvent("login_failed", undefined, username, { reason: "invalid_credentials" }, ip);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check 2FA
    if (user.totpEnabled && user.totpSecret) {
      // Create pending token instead of session
      const pendingToken = crypto.randomUUID();
      pending2FATokens.set(pendingToken, {
        userId: user.id,
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      });
      await logAuthEvent("login_2fa_required", user.id, user.username, { ip }, ip);
      return NextResponse.json({
        requires2FA: true,
        pendingToken,
        username: user.username, // return for UI display
      });
    }

    // Create session
    const session = await createSession(user.id);
    
    // Log successful login
    await logAuthEvent("login", user.id, user.username, { ip }, ip);

    // Set cookie (httpOnly, secure in production)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        totpEnabled: user.totpEnabled || false,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set("session_token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
