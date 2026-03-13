import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export function requireAuth(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return { error: "Unauthorized", status: 401 } as const;
  }
  return { user };
}

export function requireRole(user: any, allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    return { error: "Forbidden: insufficient permissions", status: 403 } as const;
  }
  return null;
}