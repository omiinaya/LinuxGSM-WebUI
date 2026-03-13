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
    const { connection, server, cronLine } = body;

    if (!connection || !server || !cronLine) {
      return NextResponse.json({ error: "Connection, server, and cronLine are required" }, { status: 400 });
    }

    const { service, cleanup } = await getService(connection, server);

    try {
      // Use generic execute to run cron commands
      const listResult = await service.execute("crontab -l");
      if (listResult.success && listResult.output.includes(cronLine)) {
        return NextResponse.json({ success: true, message: "Cron job already exists" });
      }

      const escapedLine = cronLine.replace(/'/g, `'\\''`);
      const addCmd = `(crontab -l 2>/dev/null; echo '${escapedLine}') | crontab -`;
      const result = await service.execute(addCmd);

      if (result.success) {
        await logServerEvent("cron_add", user.id, user.username, server.id, { cronLine });
        return NextResponse.json({ success: true, message: "Cron job added successfully" });
      } else {
        return NextResponse.json({ error: "Failed to add cron job", details: result.output }, { status: 500 });
      }
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error("Cron add error:", error);
    return NextResponse.json({ error: "Failed to add cron job" }, { status: 500 });
  }
}
