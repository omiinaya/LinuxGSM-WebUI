import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getService } from "@/lib/ssh/service-provider";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file") || "console";
    const lines = parseInt(searchParams.get("lines") || "200");

    const body = await request.json().catch(() => ({}));
    const { connection, server } = body;

    if (!connection || !server) {
      return NextResponse.json({ error: "Connection and server details required" }, { status: 400 });
    }

    const { service, cleanup } = await getService(connection, server);

    try {
      const log = await service.getConsoleLog(lines);
      // Determine same log path for reference
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
        default:
          logPath = `${server.installPath}/log/console`;
      }
      return NextResponse.json({ log, file, path: logPath });
    } finally {
      await cleanup();
    }
  } catch (error: any) {
    console.error("Logs error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch logs", 
      details: error.message 
    }, { status: 500 });
  }
}
