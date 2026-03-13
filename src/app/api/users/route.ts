import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, createUser, getAllUsers } from "@/lib/auth";
import { logAdminEvent } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admin can list or create users
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await getAllUsers();
  // Remove sensitive data
  const safeUsers = allUsers.map(u => {
    const { passwordHash, salt, ...rest } = u;
    return rest;
  });
  return NextResponse.json(safeUsers);
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, password, role = "viewer", email } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  try {
    const newUser = await createUser(username, password, role, email);
    const { passwordHash, salt, ...safeUser } = newUser;
    
    // Log user creation
    await logAdminEvent("user_create", user.id, user.username, newUser.id, {
      createdUsername: newUser.username,
      createdRole: role,
      email: email || undefined,
    });
    
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
