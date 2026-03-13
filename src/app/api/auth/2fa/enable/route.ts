import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, enable2FA, verifyTOTP } from "@/lib/auth";
import { logAuthEvent } from "@/lib/audit";

// POST /api/auth/2fa/enable - Enable 2FA with provided secret and verification code
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { secret, code } = await request.json();
  if (!secret || !code) {
    return NextResponse.json(
      { error: "Secret and verification code required" },
      { status: 400 }
    );
  }

  // Verify the code using the provided secret
  if (!verifyTOTP(secret, code)) {
    await logAuthEvent("2fa_enable_failed", user.id, user.username, { reason: "invalid_code" });
    return NextResponse.json(
      { error: "Invalid verification code" },
      { status: 400 }
    );
  }

  // Enable 2FA
  const success = await enable2FA(user.id, secret);
  if (!success) {
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 });
  }

  await logAuthEvent("2fa_enabled", user.id, user.username);
  return NextResponse.json({ success: true, enabled: true });
}
