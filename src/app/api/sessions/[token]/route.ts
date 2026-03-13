import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, deleteSession } from "@/lib/auth";

// DELETE /api/sessions/[token] - Revoke a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = params.token;
  const sessions = await (await import("@/lib/auth")).getAllSessions();
  const session = sessions.find(s => s.token === token);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Users can only revoke their own sessions unless admin
  if (user.role !== "admin" && session.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteSession(token);
  return NextResponse.json({ success: true });
}