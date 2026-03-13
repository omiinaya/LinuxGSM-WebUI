import { NextRequest, NextResponse } from "next/server";
import { useServersStore } from "@/stores";
import { SSHClient } from "@/lib/ssh/client";
import { LinuxGSMService } from "@/lib/linuxgsm/commands";
import { discoverServers, createServerFromDiscovery } from "@/lib/linuxgsm/detector";
import { getUserFromRequest } from "@/lib/auth";

// GET /api/servers - List all configured servers
export async function GET(request: NextRequest) {
  // Auth check
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // In a real implementation, this would fetch from a persistent store
    // For now, return empty array - client manages via zustand
    return NextResponse.json({ servers: [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch servers" },
      { status: 500 }
    );
  }
}

// POST /api/servers - Add server or scan for servers
export async function POST(request: NextRequest) {
  // Auth check
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Role check: mutating actions require at least operator
  const isMutating = true; // all current POST actions are mutating
  if (isMutating && user.role === "viewer") {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, connection, basePath } = body;

    if (action === "discover" && connection) {
      // Scan for LinuxGSM servers on remote host
      const client = new SSHClient(connection);
      await client.connect();

      try {
        const discovered = await discoverServers(client, basePath || "/home");
        
        const servers = await Promise.all(
          discovered.map(d => createServerFromDiscovery(client, d))
        );

        // Update SSH connection info for each server
        servers.forEach(server => {
          server.sshConnection = connection;
        });

        return NextResponse.json({ servers });
      } finally {
        await client.disconnect();
      }
    }

    if (action === "add" && connection) {
      // Add a manually configured server
      // Return the connection config for client to store
      return NextResponse.json({ 
        success: true, 
        server: {
          id: crypto.randomUUID(),
          name: connection.serverName || "Unknown",
          game: connection.game || "custom",
          gameName: connection.gameName || "Custom Server",
          status: "unknown" as const,
          ip: connection.host,
          port: connection.port || 27015,
          queryPort: connection.queryPort || 27015,
          rconPort: connection.rconPort || 0,
          maxPlayers: connection.maxPlayers || 0,
          currentPlayers: [],
          map: "",
          gamemode: "",
          uptime: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
          installPath: connection.installPath || "",
          configPath: connection.configPath || "",
          lgsmVersion: "",
          lastUpdate: "",
          createdAt: new Date().toISOString(),
          sshConnection: connection,
        }
      });
    }

    if (action === "check-deps" && connection) {
      // Check if dependencies are installed on remote host
      const client = new SSHClient(connection);
      await client.connect();

      try {
        // Run dependency check (LinuxGSM has detect-deps command)
        // For now we simulate or run a basic check
        const result = await client.execute("which steamcmd && which tmux && which git");
        const missing: string[] = [];
        
        if (!result.output.includes("steamcmd")) missing.push("steamcmd");
        if (!result.output.includes("tmux")) missing.push("tmux");
        if (!result.output.includes("git")) missing.push("git");

        return NextResponse.json({ 
          success: missing.length === 0,
          missing 
        });
      } finally {
        await client.disconnect();
      }
    }

    if ((action === "install" || action === "auto-install") && connection && body.game) {
      // Install a new game server
      const { game } = body;
      const scriptPath = `/home/${connection.username}/${game.id}server`;
      
      // For auto-install, we'd bypass prompts
      // For now, use the standard install command
      const client = new SSHClient(connection);
      await client.connect();

      try {
        // Download the LinuxGSM script if it doesn't exist
        const downloadScript = `
          if [ ! -f ${scriptPath} ]; then
            cd /home/${connection.username}
            curl -L https://github.com/GameServerManagers/LinuxGSM/archive/refs/heads/master.zip -o lgsm.zip
            unzip lgsm.zip
            mv LinuxGSM-master/linuxgsm.sh ${game.id}server
            chmod +x ${game.id}server
          fi
        `;
        await client.execute(downloadScript);

        // Run install or auto-install
        const installCmd = action === "auto-install" 
          ? `${scriptPath} auto-install`
          : `${scriptPath} install`;
        
        // Execute install with streaming (not implemented yet)
        await client.execute(installCmd);

        return NextResponse.json({ 
          success: true,
          message: "Installation completed",
          scriptPath
        });
      } finally {
        await client.disconnect();
      }
    }

    return NextResponse.json(
      { error: "Invalid action or missing parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
