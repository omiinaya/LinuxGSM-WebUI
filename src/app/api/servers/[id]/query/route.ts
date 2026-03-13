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
      const result = await service.query();
      return NextResponse.json(result);
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json({ error: "Failed to query server" }, { status: 500 });
  }
}
