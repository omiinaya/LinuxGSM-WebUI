import { SSHClient } from "../ssh/client";
import type { Server } from "@/types";

export interface DiscoveredServer {
  name: string;
  path: string;
  game: string;
}

export async function discoverServers(client: SSHClient, basePath: string = "/home"): Promise<DiscoveredServer[]> {
  const servers: DiscoveredServer[] = [];
  
  // Look for LinuxGSM scripts in /home
  const result = await client.execute(`find ${basePath} -maxdepth 3 -name "lgsm" -type d 2>/dev/null`);
  
  if (!result.success) return servers;
  
  const lgsmDirs = result.output.split("\n").filter(d => d.includes("/lgsm"));
  
  for (const lgsmDir of lgsmDirs) {
    // Find the main script
    const scriptResult = await client.execute(`ls ${lgsmDir}/../*.sh 2>/dev/null | head -1`);
    
    if (scriptResult.success && scriptResult.output) {
      const scriptName = scriptResult.output.split("/").pop()?.replace(".sh", "") || "";
      
      // Get game info from lgsm config
      const gameResult = await client.execute(
        `grep -E "^game=" ${lgsmDir}/../lgsm/config-lgsm/*/default.cfg 2>/dev/null | head -1`
      );
      
      const game = gameResult.success 
        ? gameResult.output.split("=")[1]?.trim().replace(/"/g, "") 
        : "Unknown";
      
      servers.push({
        name: scriptName,
        path: lgsmDir.replace("/lgsm", ""),
        game,
      });
    }
  }
  
  return servers;
}

export async function createServerFromDiscovery(
  client: SSHClient,
  discovered: DiscoveredServer
): Promise<Server> {
  // Get server details
  const detailsResult = await client.execute(`${discovered.path}/${discovered.name} details`);
  
  // Extract IP and port from details
  const ipMatch = detailsResult.output.match(/Server IP:\s*([^\n]+)/);
  const portMatch = detailsResult.output.match(/Game Port:\s*(\d+)/);
  const queryPortMatch = detailsResult.output.match(/Query Port:\s*(\d+)/);
  
  return {
    id: crypto.randomUUID(),
    name: discovered.name,
    game: discovered.game,
    gameName: discovered.game,
    status: "unknown",
    ip: ipMatch?.[1]?.trim() || "",
    port: parseInt(portMatch?.[1] || "27015"),
    queryPort: parseInt(queryPortMatch?.[1] || "27015"),
    rconPort: 0,
    maxPlayers: 0,
    currentPlayers: [],
    map: "",
    gamemode: "",
    uptime: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    installPath: discovered.path,
    configPath: `${discovered.path}/lgsm/config-lgsm/${discovered.name}`,
    lgsmVersion: "",
    lastUpdate: "",
    createdAt: new Date().toISOString(),
    sshConnection: {
      host: "",
      port: 22,
      username: "",
      authType: "password",
    },
  };
}
