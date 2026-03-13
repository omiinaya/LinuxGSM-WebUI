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

  try {
    const body = await request.json();
    const { connection, server, config, configType = "lgsm", path, action = "get" } = body;

    if (!connection || !server) {
      return NextResponse.json({ error: "Connection and server details required" }, { status: 400 });
    }

    if (action === "save" && user.role === "viewer") {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { service, cleanup } = await getService(connection, server);

    try {
      if (action === "get") {
        const actualType = configType === "game" ? "game" : "lgsm";
        const configContent = await service.getConfig(actualType);
        return NextResponse.json({ config: configContent });
      }

      if (action === "save") {
        if (!config) {
          return NextResponse.json({ error: "Config content required for save" }, { status: 400 });
        }

        let configPath = path;
        if (!configPath) {
          if (configType === "lgsm") {
            configPath = `${server.installPath}/lgsm/config-lgsm/${server.name}/${server.name}.cfg`;
          } else {
            const possiblePaths = [
              `${server.installPath}/serverfiles/${server.name}/cfg/server.cfg`,
              `${server.installPath}/serverfiles/cfg/server.cfg`,
              `${server.installPath}/cfg/server.cfg`,
            ];
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

      return NextResponse.json({ error: "Invalid action. Use 'get' or 'save'." }, { status: 400 });
    } finally {
      await cleanup();
    }
  } catch (error) {
    console.error("Config error:", error);
    return NextResponse.json({ error: "Failed to process config" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return POST(request, { params });
}
