import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, deleteUser, updateUser } from "@/lib/auth";
import { logAdminEvent } from "@/lib/audit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = params.id;

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const success = await deleteUser(userId);
  if (!success) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  
  // Log user deletion
  await logAdminEvent("user_delete", user.id, user.username, userId, {
    deletedUserId: userId
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return await handleUpdate(request, params.id);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return await handleUpdate(request, params.id);
}

async function handleUpdate(
  request: NextRequest,
  userId: string
) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const { role, email } = await request.json();

  if (role && !["admin", "operator", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const updated = await updateUser(userId, { role, email });
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Log role/email change
  await logAdminEvent("user_role_change", user.id, user.username, userId, {
    role: role,
    email: email,
  });

  const { passwordHash, salt, ...safeUser } = updated;
  return NextResponse.json(safeUser);
}
