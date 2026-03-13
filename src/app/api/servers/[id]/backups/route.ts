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
    const body = await request.json().catch(() => ({}));
    const { connection, server } = body;

    if (!connection || !server) {
      return NextResponse.json({ error: "Connection and server details required" }, { status: 400 });
    }

    const { service, cleanup } = await getService(connection, server);

    try {
      const details = await service.getDetails();
      return NextResponse.json({ backups: details.backups || [] });
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error("Backups error:", error);
    return NextResponse.json({ error: "Failed to fetch backups" }, { status: 500 });
  }
}
