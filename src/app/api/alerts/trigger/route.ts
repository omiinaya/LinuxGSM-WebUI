import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
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
      },
    };
  }
}

// POST /api/alerts/trigger - Send alerts based on event and server status
export async function POST(request: NextRequest) {
  try {
    const { event, server } = await request.json();

    if (!event || !server) {
      return NextResponse.json(
        { error: "event and server are required" },
        { status: 400 }
      );
    }

    const config = await readConfig();
    const { enabled, discord, email, events } = config;

    if (!enabled) {
      return NextResponse.json({ success: true, message: "Alerts disabled" });
    }

    // Check if this event is enabled
    if (events && !events[event as keyof typeof events]) {
      return NextResponse.json({ success: true, message: `Event ${event} disabled` });
    }

    const results: string[] = [];

    // Send Discord alert
    if (discord?.enabled && discord.webhookUrl) {
      try {
        const message = formatDiscordMessage(event, server);
        const response = await fetch(discord.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          results.push(`Discord failed: ${response.status}`);
        } else {
          results.push("Discord sent");
        }
      } catch (error: any) {
        results.push(`Discord error: ${error.message}`);
      }
    }

    // Send Email alert
    if (email?.enabled && email.host && email.to) {
      try {
        const transporter = nodemailer.createTransport({
          host: email.host,
          port: parseInt(email.port.toString()),
          secure: email.secure || false,
          auth: email.user && email.pass ? { user: email.user, pass: email.pass } : undefined,
          tls: email.secure ? { rejectUnauthorized: false } : undefined,
        });

        await new Promise((resolve, reject) => {
          transporter.verify((error: any) => {
            if (error) reject(error);
            else resolve(true);
          });
        });

        const { subject, text } = formatEmailMessage(event, server);
        await transporter.sendMail({
          from: email.from || email.user,
          to: email.to,
          subject,
          text,
        });

        results.push("Email sent");
      } catch (error: any) {
        results.push(`Email error: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: results.length > 0,
      results,
    });
  } catch (error) {
    console.error("Alert trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger alerts" },
      { status: 500 }
    );
  }
}

function formatDiscordMessage(event: string, server: any) {
  const statusColors: Record<string, number> = {
    serverStart: 65280,
    serverStop: 16711680,
    serverCrash: 16711680,
    updateAvailable: 65535,
    lowDisk: 16711680,
    highCpu: 16711680,
  };

  const color = statusColors[event] || 3447003;

  return {
    embeds: [
      {
        title: `🐧 Server Event: ${event.replace(/([A-Z])/g, ' $1').trim()}`,
        color,
        fields: [
          { name: "Server", value: `${server.name} (${server.gameName})`, inline: true },
          { name: "Status", value: server.status || "unknown", inline: true },
          { name: "Address", value: `${server.ip}:${server.port}`, inline: false },
          ...(server.cpuUsage !== undefined ? [{ name: "CPU", value: `${server.cpuUsage}%`, inline: true }] : []),
          ...(server.memoryUsage !== undefined ? [{ name: "Memory", value: `${server.memoryUsage}%`, inline: true }] : []),
          ...(server.diskUsage !== undefined ? [{ name: "Disk", value: `${server.diskUsage}%`, inline: true }] : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

function formatEmailMessage(event: string, server: any) {
  const eventReadable = event.replace(/([A-Z])/g, ' $1').trim();
  const subject = `[LinuxGSM] ${eventReadable} - ${server.name}`;

  const text = `
Alert Details:
- Event: ${eventReadable}
- Server: ${server.name} (${server.gameName})
- Status: ${server.status || "unknown"}
- Address: ${server.ip}:${server.port}
${server.cpuUsage !== undefined ? `- CPU: ${server.cpuUsage}%\n` : ''}
${server.memoryUsage !== undefined ? `- Memory: ${server.memoryUsage}%\n` : ''}
${server.diskUsage !== undefined ? `- Disk: ${server.diskUsage}%\n` : ''}
- Time: ${new Date().toLocaleString()}

This alert was generated by LinuxGSM Web UI.
`.trim();

  return { subject, text };
}
