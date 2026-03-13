import { NextRequest, NextResponse } from "next/server";
import { LocalExecutor } from "@/lib/ssh/local-executor";
import { getUserFromRequest } from "@/lib/auth";
import { GAMES_CATALOG } from "@/lib/games";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Step 1: Create target directory
    await executor.execute(`mkdir -p ${targetDir}`);

    // Step 2: Download and extract LinuxGSM if script doesn't exist
    const exists = await executor.fileExists(scriptPath);
    if (!exists) {
      const downloadRes = await executor.execute(`curl -L https://github.com/GameServerManagers/LinuxGSM/archive/refs/heads/master.zip -o lgsm.zip`);
      if (!downloadRes.success) {
        return NextResponse.json({ 
          error: "Failed to download LinuxGSM", 
          details: downloadRes.error || downloadRes.output 
        }, { status: 500 });
      }

      const unzipRes = await executor.execute(`unzip -o lgsm.zip`);
      if (!unzipRes.success) {
        return NextResponse.json({ 
          error: "Failed to unzip LinuxGSM", 
          details: unzipRes.error || unzipRes.output 
        }, { status: 500 });
      }

      const mvRes = await executor.execute(`mv LinuxGSM-master/linuxgsm.sh ${scriptPath}`);
      if (!mvRes.success) {
        return NextResponse.json({ 
          error: "Failed to prepare script", 
          details: mvRes.error || mvRes.output 
        }, { status: 500 });
      }

      await executor.execute(`chmod +x ${scriptPath}`);
    }

    // Step 3: Run auto-install
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
        { 
          error: "Installation failed", 
          details: result.error || result.output,
          command: `${scriptPath} auto-install`
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Local install error:", err);
    return NextResponse.json(
      { error: err.message || "Installation failed", stack: err.stack },
      { status: 500 }
    );
  }
}
