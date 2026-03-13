import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// POST /api/alerts/email - Send a test email via SMTP
export async function POST(request: NextRequest) {
  try {
    const {
      host,
      port,
      secure,
      user,
      pass,
      from,
      to,
      subject = "Test Email from LinuxGSM Web UI",
      text = "This is a test email.",
    } = await request.json();

    if (!host || !port || !from || !to) {
      return NextResponse.json(
        { error: "host, port, from, and to are required" },
        { status: 400 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port.toString()),
      secure: secure || false,
      auth: user && pass ? { user, pass } : undefined,
      tls: secure ? { rejectUnauthorized: false } : undefined,
    });

    // Verify connection configuration
    await new Promise((resolve, reject) => {
      transporter.verify((error) => {
        if (error) reject(error);
        else resolve(true);
      });
    });

    // Send mail
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Email alert error:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: error.message },
      { status: 500 }
    );
  }
}
