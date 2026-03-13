import { NextRequest, NextResponse } from "next/server";
import { SSHClient } from "@/lib/ssh/client";
import { LinuxGSMService } from "@/lib/linuxgsm/commands";
import { getUserFromRequest } from "@/lib/auth";
import { logServerEvent } from "@/lib/audit";

// POST /api/servers/[id]/config - Get or save server config
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
    const { connection, server, config, configType = "lgsm", path, action = "get" } = body;

    if (!connection || !server) {
      return NextResponse.json(
        { error: "Connection and server details required" },
        { status: 400 }
      );
    }

    // Role check for save action
    if (action === "save" && user.role === "viewer") {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const client = new SSHClient(connection);
    await client.connect();

    try {
      const service = new LinuxGSMService(client, server);

      if (action === "get") {
        // Get config content
        const actualType = configType === "game" ? "game" : "lgsm";
        const configContent = await service.getConfig(actualType);
        return NextResponse.json({ config: configContent });
      }

      if (action === "save") {
        if (!config) {
          return NextResponse.json(
            { error: "Config content required for save" },
            { status: 400 }
          );
        }

        // Determine path to write
        let configPath = path;
        if (!configPath) {
          if (configType === "lgsm") {
            configPath = `${server.installPath}/lgsm/config-lgsm/${server.name}/${server.name}.cfg`;
          } else {
            // For game config, try common locations
            const possiblePaths = [
              `${server.installPath}/serverfiles/${server.name}/cfg/server.cfg`,
              `${server.installPath}/serverfiles/cfg/server.cfg`,
              `${server.installPath}/cfg/server.cfg`,
            ];
            // We'll use the first path; in reality we'd need to detect
            configPath = possiblePaths[0];
          }
        }

        const result = await service.saveConfig("lgsm", config, configPath);
        if (result.success) {
          await logServerEvent("config_save", user.id, user.username, server.id, {
            serverName: server.name,
            configType: configType,
            path: configPath,
          });
        }
        return NextResponse.json(result);
      }

      return NextResponse.json(
        { error: "Invalid action. Use 'get' or 'save'." },
        { status: 400 }
      );
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Config error:", error);
    return NextResponse.json(
      { error: "Failed to process config" },
      { status: 500 }
    );
  }
}

// PUT kept for compatibility, but we use POST for everything now
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return POST(request, { params });
}
