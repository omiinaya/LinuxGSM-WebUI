import { NextRequest, NextResponse } from "next/server";
import { initializeAuth } from "@/lib/auth";

// POST /api/auth/init - Initialize auth system (create default admin if needed)
export async function POST(request: NextRequest) {
  try {
    await initializeAuth();
    return NextResponse.json({ initialized: true });
  } catch (error) {
    console.error("Auth init error:", error);
    return NextResponse.json({ error: "Initialization failed" }, { status: 500 });
  }
}

// Also allow GET for convenience
export async function GET(request: NextRequest) {
  return POST(request);
}