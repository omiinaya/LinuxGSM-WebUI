import { NextRequest, NextResponse } from "next/server";
import { SSHClient } from "@/lib/ssh/client";
import { LinuxGSMService } from "@/lib/linuxgsm/commands";
import { getUserFromRequest } from "@/lib/auth";
// No audit needed for read-only logs

// GET /api/servers/[id]/logs - Fetch log file content
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
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file") || "console"; // console, current, latest, debug
    const lines = parseInt(searchParams.get("lines") || "200");

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
      
      // Determine log path based on file parameter
      let logPath: string;
      switch (file) {
        case "current":
          logPath = `${server.installPath}/log/current`;
          break;
        case "latest":
          logPath = `${server.installPath}/log/latest`;
          break;
        case "debug":
          logPath = `${server.installPath}/log/debug.log`;
          break;
        case "console":
        default:
          logPath = `${server.installPath}/log/console`;
          break;
      }

      // Check if file exists first
      const checkResult = await client.execute(`test -f ${logPath} && echo "exists" || echo "missing"`);
      if (checkResult.output.trim() === "missing") {
        return NextResponse.json(
          { error: `Log file not found: ${file}` },
          { status: 404 }
        );
      }

      // Get the last N lines
      const result = await client.execute(`tail -n ${lines} "${logPath}"`);
      
      if (result.success) {
        return NextResponse.json({ 
          log: result.output,
          file,
          path: logPath
        });
      } else {
        return NextResponse.json(
          { error: "Failed to read log file", details: result.output },
          { status: 500 }
        );
      }
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
