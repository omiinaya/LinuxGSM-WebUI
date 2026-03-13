import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, generateTOTPSecret } from "@/lib/auth";

// GET /api/auth/2fa/setup - Generate a new TOTP secret for 2FA setup
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate a new secret
  const secret = generateTOTPSecret();

  // Return secret; do not enable yet
  return NextResponse.json({ secret });
}
