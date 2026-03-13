import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getService } from "@/lib/ssh/service-provider";
import { logServerEvent } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "viewer") {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { connection, server, backupFile } = body;

    if (!connection || !server || !backupFile) {
      return NextResponse.json({ error: "Connection, server, and backupFile required" }, { status: 400 });
    }

    const { service, cleanup } = await getService(connection, server);

    try {
      const result = await service.restore(backupFile);
      if (result.success) {
        await logServerEvent("restore", user.id, user.username, server.id, { serverName: server.name, backupFile });
      }
      return NextResponse.json(result);
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json({ error: "Failed to restore backup" }, { status: 500 });
  }
}
