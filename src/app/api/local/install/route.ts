import { NextRequest, NextResponse } from "next/server";
import { LocalExecutor } from "@/lib/ssh/local-executor";
import { getUserFromRequest } from "@/lib/auth";
import { GAMES_CATALOG } from "@/lib/games";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admin can install games
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { gameId, installDir } = body;

    if (!gameId) {
      return NextResponse.json({ error: "gameId required" }, { status: 400 });
    }

    const game = GAMES_CATALOG.find(g => g.id === gameId);
    if (!game) {
      return NextResponse.json({ error: "Game not found in catalog" }, { status: 404 });
    }

    const targetDir = installDir || "/home/games";
    const executor = new LocalExecutor({ workingDir: targetDir });

    const scriptPath = `${targetDir}/${gameId}server`;

    try {
      // Ensure target directory exists
      await executor.execute(`mkdir -p ${targetDir}`);
    } catch (err) {
      // ignore if exists
    }

    // Check if script already exists
    const exists = await executor.fileExists(scriptPath);
    if (!exists) {
      // Download LinuxGSM and set up script
      await executor.execute(`cd ${targetDir} && curl -L https://github.com/GameServerManagers/LinuxGSM/archive/refs/heads/master.zip -o lgsm.zip`);
      await executor.execute(`cd ${targetDir} && unzip -o lgsm.zip`);
      await executor.execute(`cd ${targetDir} && mv LinuxGSM-master/linuxgsm.sh ${gameId}server`);
      await executor.execute(`chmod +x ${scriptPath}`);
    }

    // Run auto-install
    const result = await executor.execute(`${scriptPath} auto-install`);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Installation of ${game.name} completed.`,
        output: result.output,
        scriptPath,
      });
    } else {
      return NextResponse.json(
        { error: "Installation failed", details: result.error || result.output },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Local install error:", err);
    return NextResponse.json(
      { error: err.message || "Installation failed" },
      { status: 500 }
    );
  }
}
