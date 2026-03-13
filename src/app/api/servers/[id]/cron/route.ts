import { NextRequest, NextResponse } from "next/server";
import { SSHClient } from "@/lib/ssh/client";
import { getUserFromRequest } from "@/lib/auth";

// POST /api/servers/[id]/cron - Add a cron job to the remote host's crontab
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
    const { connection, server, cronLine } = body;

    if (!connection || !server || !cronLine) {
      return NextResponse.json(
        { error: "Connection, server, and cronLine are required" },
        { status: 400 }
      );
    }

    const client = new SSHClient(connection);
    await client.connect();

    try {
      // Check if this exact line already exists in crontab
      const listResult = await client.execute("crontab -l");
      if (listResult.success && listResult.output.includes(cronLine)) {
        return NextResponse.json({
          success: true,
          message: "Cron job already exists",
        });
      }

      // Add the new line to crontab
      // This handles both empty crontab and existing entries
      const escapedLine = cronLine.replace(/'/g, `'\\''`);
      const addCmd = `(crontab -l 2>/dev/null; echo '${escapedLine}') | crontab -`;
      const result = await client.execute(addCmd);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: "Cron job added successfully",
        });
      } else {
        return NextResponse.json(
          { error: "Failed to add cron job", details: result.output },
          { status: 500 }
        );
      }
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Cron add error:", error);
    return NextResponse.json(
      { error: "Failed to add cron job" },
      { status: 500 }
    );
  }
}
