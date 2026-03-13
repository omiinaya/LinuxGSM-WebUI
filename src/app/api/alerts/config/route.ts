import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "alerts.json");

async function readConfig(): Promise<any> {
  try {
    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {
      enabled: false,
      discord: { enabled: false, webhookUrl: "" },
      email: { enabled: false, host: "", port: 587, secure: false, user: "", pass: "", from: "", to: "" },
      events: {
        serverStart: true,
        serverStop: true,
        serverCrash: true,
        updateAvailable: true,
        lowDisk: false,
        highCpu: false,
        backup: true,
        update: true,
        configChange: false,
      },
    };
  }
}

async function writeConfig(config: any): Promise<void> {
  const dir = path.dirname(CONFIG_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Failed to write config:", error);
    throw error;
  }
}

// GET /api/alerts/config
export async function GET() {
  try {
    const config = await readConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Config read error:", error);
    return NextResponse.json(
      { error: "Failed to read alert config" },
      { status: 500 }
    );
  }
}

// POST /api/alerts/config
export async function POST(request: NextRequest) {
  try {
    const config = await request.json();
    await writeConfig(config);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Config write error:", error);
    return NextResponse.json(
      { error: "Failed to save alert config" },
      { status: 500 }
    );
  }
}
