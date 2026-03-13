import { NextRequest, NextResponse } from "next/server";
import { SSHClient } from "@/lib/ssh/client";
import { LinuxGSMService } from "@/lib/linuxgsm/commands";
import { getUserFromRequest } from "@/lib/auth";

// POST /api/servers/[id]/status - Get server status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth check
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { connection } = body;

    if (!connection) {
      return NextResponse.json(
        { error: "Connection details required" },
        { status: 400 }
      );
    }

    const client = new SSHClient(connection);
    await client.connect();

    try {
      const service = new LinuxGSMService(client, {} as any);
      const status = await service.getStatus();

      // Also fetch details if available
      let details = null;
      try {
        details = await service.getDetails();
      } catch (e) {
        // Details might fail if server not fully configured
      }

      return NextResponse.json({ status, details });
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Status error:", error);
    return NextResponse.json(
      { error: "Failed to get server status" },
      { status: 500 }
    );
  }
}
