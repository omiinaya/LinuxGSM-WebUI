import { NextRequest, NextResponse } from "next/server";
import { SSHClient } from "@/lib/ssh/client";
import { LinuxGSMService } from "@/lib/linuxgsm/commands";
import { getUserFromRequest } from "@/lib/auth";

// GET /api/servers/[id]/backups - List available backups
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth check
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { connection, server } = body;

    if (!connection || !server) {
      return NextResponse.json(
        { error: "Connection and server details required" },
        { status: 400 }
      );
    }

    const client = new SSHClient(connection);
    await client.connect();

    try {
      const service = new LinuxGSMService(client, server);
      const details = await service.getDetails();
      return NextResponse.json({ backups: details.backups || [] });
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Backups error:", error);
    return NextResponse.json(
      { error: "Failed to fetch backups" },
      { status: 500 }
    );
  }
}
