import { NextRequest, NextResponse } from "next/server";
import { SSHClient } from "@/lib/ssh/client";
import { LinuxGSMService } from "@/lib/linuxgsm/commands";

// POST /api/servers/[id]/console - Get server console log
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { connection, server, lines = 100 } = body;

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
      const log = await service.getConsoleLog(lines);
      return NextResponse.json({ log });
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Console error:", error);
    return NextResponse.json(
      { error: "Failed to fetch console log" },
      { status: 500 }
    );
  }
}
