import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, updateUserPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { oldPassword, newPassword } = body;

  if (!oldPassword || !newPassword) {
    return NextResponse.json(
      { error: "Old password and new password are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const result = await updateUserPassword(user.id, oldPassword, newPassword);
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to change password" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
