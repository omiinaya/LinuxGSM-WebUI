import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { discoverLocalLinuxGSM } from "@/lib/ssh/local-executor";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admin can discover servers
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Scan common paths for LinuxGSM installations
    const discovered = await discoverLocalLinuxGSM(["/home", "/opt", "/usr/local"]);

    // Transform to server objects matching our Server type (partial)
    const servers = discovered.map(d => ({
      id: `local-${crypto.randomUUID()}`,
      name: d.name,
      game: d.gameName.toLowerCase().replace(/\s+/g, ''),
      gameName: d.gameName,
      status: "unknown" as const,
      ip: "127.0.0.1",
      port: 0,
      queryPort: 0,
      rconPort: 0,
      maxPlayers: 0,
      currentPlayers: [],
      map: "",
      gamemode: "",
      uptime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      installPath: d.installPath,
      configPath: d.configPath,
      lgsmVersion: "",
      lastUpdate: "",
      createdAt: new Date().toISOString(),
      local: true,
      // sshConnection omitted for local
    }));

    return NextResponse.json({ servers });
  } catch (error) {
    console.error("Local discovery error:", error);
    return NextResponse.json(
      { error: "Discovery failed" },
      { status: 500 }
    );
  }
}
