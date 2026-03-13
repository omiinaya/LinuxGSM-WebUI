import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getAllSessions, deleteSession } from "@/lib/auth";

// GET /api/sessions - List current user's sessions (or all sessions for admin)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await getAllSessions();
  const users = await (await import("@/lib/auth")).getAllUsers();

  // Enrich sessions with user info
  const enriched = sessions.map(session => {
    const sessionUser = users.find(u => u.id === session.userId);
    return {
      token: session.token,
      userId: session.userId,
      username: sessionUser?.username || "Unknown",
      userRole: sessionUser?.role,
      expiresAt: session.expiresAt,
      isCurrent: session.token === request.cookies?.get("session_token")?.value,
    };
  });

  // Admin sees all sessions, regular users only see their own
  const filtered = user.role === "admin" ? enriched : enriched.filter(s => s.userId === user.id);

  return NextResponse.json({ sessions: filtered });
}