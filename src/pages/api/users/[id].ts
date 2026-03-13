import { NextApiRequest, NextApiResponse } from "next";
import { getUserFromRequest, deleteUser, updateUser } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Only admin can manage users
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const userId = req.query.id as string;

  if (!userId) {
    return res.status(400).json({ error: "User ID required" });
  }

  if (req.method === "DELETE") {
    // Prevent self-deletion
    if (userId === user.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }
    const success = await deleteUser(userId);
    if (!success) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({ success: true });
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    const { role, email } = req.body;

    if (role && !["admin", "operator", "viewer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const updated = await updateUser(userId, { role, email });
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return safe user (no password/salt)
    const { passwordHash, salt, ...safeUser } = updated;
    return res.status(200).json(safeUser);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
