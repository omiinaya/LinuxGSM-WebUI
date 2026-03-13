import { NextRequest, NextResponse } from "next/server";
import { SSHClient } from "@/lib/ssh/client";
import { LinuxGSMService } from "@/lib/linuxgsm/commands";
import { getUserFromRequest } from "@/lib/auth";

// POST /api/servers/[id]/restore - Restore a backup
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth check
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
      return NextResponse.json(
        { error: "Connection, server, and backupFile required" },
        { status: 400 }
      );
    }

    const client = new SSHClient(connection);
    await client.connect();

    try {
      const service = new LinuxGSMService(client, server);
      const result = await service.restore(backupFile);
      return NextResponse.json(result);
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: "Failed to restore backup" },
      { status: 500 }
    );
  }
}
