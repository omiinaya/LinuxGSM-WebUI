import { NextRequest, NextResponse } from "next/server";
import { GAMES_CATALOG } from "@/lib/games";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admin can view games? Maybe all authenticated can view. Let's allow any logged in.
  return NextResponse.json({ games: GAMES_CATALOG });
}
