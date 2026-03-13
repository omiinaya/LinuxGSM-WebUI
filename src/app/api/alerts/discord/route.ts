import { NextRequest, NextResponse } from "next/server";

// POST /api/alerts/discord - Send a test Discord message
export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, message } = await request.json();

    if (!webhookUrl || !message) {
      return NextResponse.json(
        { error: "webhookUrl and message are required" },
        { status: 400 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Discord webhook failed: ${response.status}`, details: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Discord alert error:", error);
    return NextResponse.json(
      { error: "Failed to send Discord alert" },
      { status: 500 }
    );
  }
}
