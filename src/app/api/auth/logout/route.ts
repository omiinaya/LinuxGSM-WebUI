import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionByToken, deleteSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session_token")?.value;
    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ success: true });
    const cookieStore = await cookies();
    cookieStore.delete("session_token");
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
