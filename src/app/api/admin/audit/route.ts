import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getAuditLogs } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || undefined;
  const username = searchParams.get("username") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

  let logs = await getAuditLogs(limit);

  // Apply filters
  if (action) {
    logs = logs.filter(log => log.action === action);
  }
  if (username) {
    logs = logs.filter(log => log.username && log.username.toLowerCase().includes(username.toLowerCase()));
  }

  return NextResponse.json({ logs, total: logs.length });
}
