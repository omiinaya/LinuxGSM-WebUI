import { NextApiRequest, NextApiResponse } from "next";
import { getUserFromRequest, createUser, getAllUsers } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Only admin can list or create users
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method === "GET") {
    const allUsers = await getAllUsers();
    // Remove sensitive data
    const safeUsers = allUsers.map(u => {
      const { passwordHash, salt, ...rest } = u;
      return rest;
    });
    return res.status(200).json(safeUsers);
  }

  if (req.method === "POST") {
    const { username, password, role = "viewer", email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    try {
      const newUser = await createUser(username, password, role, email);
      const { passwordHash, salt, ...safeUser } = newUser;
      return res.status(201).json(safeUser);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}