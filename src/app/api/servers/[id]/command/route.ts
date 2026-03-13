import { NextRequest, NextResponse } from "next/server";
import { SSHClient } from "@/lib/ssh/client";
import { LinuxGSMService } from "@/lib/linuxgsm/commands";
import { getUserFromRequest } from "@/lib/auth";

// POST /api/servers/[id]/command - Send command to server console
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
    const { connection, server, command } = body;

    if (!connection || !command) {
      return NextResponse.json(
        { error: "Connection and command required" },
        { status: 400 }
      );
    }

    const client = new SSHClient(connection);
    await client.connect();

    try {
      const service = new LinuxGSMService(client, server);
      const result = await service.sendCommand(command);
      return NextResponse.json(result);
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Command error:", error);
    return NextResponse.json(
      { error: "Failed to send command" },
      { status: 500 }
    );
  }
}
