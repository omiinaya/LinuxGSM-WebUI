import { NextRequest, NextResponse } from "next/server";
import { SSHClient } from "@/lib/ssh/client";
import { getUserFromRequest } from "@/lib/auth";

// POST /api/servers/[id]/check-ports - Check if server ports are in use on the remote host
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
      // Run netstat to list listening ports
      const result = await client.execute("netstat -tuln");
      if (!result.success) {
        return NextResponse.json(
          { error: "Failed to run netstat", details: result.output },
          { status: 500 }
        );
      }

      // Parse used ports
      const usedPorts = new Set<number>();
      const lines = result.output.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Proto') || trimmed.startsWith('Active')) continue;
        
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4) {
          const localAddr = parts[3];
          // Extract port after last colon
          const portStr = localAddr.split(':').pop();
          const port = parseInt(portStr || '0', 10);
          if (port > 0 && port < 65536) {
            usedPorts.add(port);
          }
        }
      }

      // Check server ports
      const portsToCheck = [
        { name: 'game', port: server.port },
        { name: 'query', port: server.queryPort },
        { name: 'rcon', port: server.rconPort },
      ].filter(p => p.port && p.port > 0);

      const conflicts = portsToCheck.filter(p => usedPorts.has(p.port as number));

      return NextResponse.json({
        usedPorts: Array.from(usedPorts).sort((a,b) => a-b),
        conflicts,
        message: conflicts.length === 0 ? "No port conflicts detected" : `${conflicts.length} port(s) in use`,
      });
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Check ports error:", error);
    return NextResponse.json(
      { error: "Failed to check ports" },
      { status: 500 }
    );
  }
}
