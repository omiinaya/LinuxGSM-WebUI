import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, disable2FA } from "@/lib/auth";
import { logAuthEvent } from "@/lib/audit";

// POST /api/auth/2fa/disable - Disable 2FA (requires password confirmation)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await request.json();
  if (!password) {
    return NextResponse.json(
      { error: "Password required to disable 2FA" },
      { status: 400 }
    );
  }

  const result = await disable2FA(user.id, password);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAuthEvent("2fa_disabled", user.id, user.username);
  return NextResponse.json({ success: true, enabled: false });
}
