import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getService } from "@/lib/ssh/service-provider";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { connection, server } = body;

    if (!connection || !server) {
      return NextResponse.json({ error: "Connection and server details required" }, { status: 400 });
    }

    const { service, cleanup } = await getService(connection, server);

    try {
      const status = await service.getStatus();
      // For status we just return string; could also get details but keep simple
      return NextResponse.json({ status });
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error("Status error:", error);
    return NextResponse.json({ error: "Failed to get server status" }, { status: 500 });
  }
}
