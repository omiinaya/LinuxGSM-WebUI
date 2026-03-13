import { NextRequest, NextResponse } from "next/server";
import { SSHClient } from "@/lib/ssh/client";
import { LinuxGSMService } from "@/lib/linuxgsm/commands";
import { getUserFromRequest } from "@/lib/auth";

// SSE endpoint for real-time console streaming
export async function GET(request: NextRequest) {
  // Auth check
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(request.url);
  const lines = searchParams.get("lines") || "100";

  const body = await request.json().catch(() => ({}));
  const { connection, server } = body;

  if (!connection || !server) {
    return new Response(JSON.stringify({ error: "Connection and server details required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Set SSE headers
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const client = new SSHClient(connection);
      try {
        await client.connect();
        const service = new LinuxGSMService(client, server);
        
        // Send initial log content
        try {
          const initialLog = await service.getConsoleLog(parseInt(lines));
          const eventData = `event: init\ndata: ${JSON.stringify({ log: initialLog })}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        } catch (e) {
          // Initial fetch may fail, continue anyway
        }

        // Now stream new lines using tail -F (follow)
        // We'll use a simple polling approach since SSH doesn't support persistent streaming easily
        let lastPosition = 0;
        let lastContent = "";
        
        const pollInterval = setInterval(async () => {
          if (server.status !== "running") {
            clearInterval(pollInterval);
            controller.close();
            await client.disconnect();
            return;
          }

          try {
            // Get full log and calculate what's new
            const fullLog = await service.getConsoleLog(parseInt(lines) * 2); // Get more lines
            const linesArr = fullLog.split('\n');
            
            // Find new lines since last poll
            const newLines = linesArr.slice(lastPosition);
            if (newLines.length > 0) {
              const eventData = `event: line\ndata: ${JSON.stringify({ 
                lines: newLines.filter(l => l.trim()),
                full: fullLog 
              })}\n\n`;
              controller.enqueue(encoder.encode(eventData));
              lastPosition = linesArr.length;
            }
            lastContent = fullLog;
          } catch (e) {
            // Ignore errors during polling
          }
        }, 1000); // Poll every second

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(pollInterval);
          client.disconnect();
          controller.close();
        });
      } catch (error) {
        const errorData = `event: error\ndata: ${JSON.stringify({ error: "SSH connection failed" })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
