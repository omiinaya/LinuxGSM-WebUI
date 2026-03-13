import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

// Ensure directory exists before file operations
async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  salt: string;
  role: "admin" | "operator" | "viewer";
  createdAt: string;
  lastLogin?: string;
  // 2FA fields
  totpSecret?: string;
  totpEnabled?: boolean;
}

// Public user type (no sensitive data)
export type PublicUser = Pick<User, 'id' | 'username' | 'email' | 'role' | 'createdAt' | 'lastLogin' | 'totpEnabled'>;

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

async function readJson<T>(filepath: string, defaultValue: T): Promise<T> {
  try {
    const data = await fs.readFile(filepath, "utf-8");
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function writeJson<T>(filepath: string, data: T): Promise<void> {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

export async function getAllUsers(): Promise<User[]> {
  return readJson(USERS_FILE, []);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getAllUsers();
  return users.find(u => u.id === id);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const users = await getAllUsers();
  return users.find(u => u.username === username);
}

export async function createUser(
  username: string,
  password: string,
  role: User["role"] = "viewer",
  email?: string
): Promise<User> {
  const users = await getAllUsers();
  
  if (users.some(u => u.username === username)) {
    throw new Error("Username already exists");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password + (process.env.PEPPER || ""), salt, 64).toString("hex");
  
  const user: User = {
    id: crypto.randomUUID(),
    username,
    email,
    passwordHash: hash,
    salt,
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await writeJson(USERS_FILE, users);
  return user;
}

export async function verifyUser(username: string, password: string): Promise<User | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;

  const hash = crypto.scryptSync(password + (process.env.PEPPER || ""), user.salt, 64).toString("hex");
  if (hash === user.passwordHash) {
    return user;
  }
  return null;
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const users = await getAllUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.lastLogin = new Date().toISOString();
    await writeJson(USERS_FILE, users);
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getAllUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return false;

  users.splice(index, 1);
  await writeJson(USERS_FILE, users);

  // Delete all sessions for this user
  await deleteUserSessions(id);

  return true;
}

export async function getAllSessions(): Promise<Session[]> {
  return readJson(SESSIONS_FILE, []);
}

export async function createSession(userId: string, ttlHours: number = 24): Promise<Session> {
  const sessions = await getAllSessions();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  
  const session: Session = { token, userId, expiresAt };
  sessions.push(session);
  await writeJson(SESSIONS_FILE, sessions);
  return session;
}

export async function getSessionByToken(token: string): Promise<Session | undefined> {
  const sessions = await getAllSessions();
  // Clean up expired sessions
  const now = new Date();
  const active = sessions.filter(s => new Date(s.expiresAt) > now);
  if (active.length !== sessions.length) {
    await writeJson(SESSIONS_FILE, active);
  }
  return active.find(s => s.token === token);
}

export async function deleteSession(token: string): Promise<void> {
  const sessions = await getAllSessions();
  const filtered = sessions.filter(s => s.token !== token);
  await writeJson(SESSIONS_FILE, filtered);
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const sessions = await getAllSessions();
  const filtered = sessions.filter(s => s.userId !== userId);
  await writeJson(SESSIONS_FILE, filtered);
}

export function generateToken(): string {
  return crypto.randomUUID();
}

// Helper to get user from request (cookies)
export async function getUserFromRequest(request: any): Promise<PublicUser | null> {
  try {
    const token = request.cookies?.get("session_token")?.value;
    if (!token) return null;
    const session = await getSessionByToken(token);
    if (!session) return null;
    const user = await getUserById(session.userId);
    if (!user) return null;
    // Return safe user without password/salt
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  } catch {
    return null;
  }
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(password + (process.env.PEPPER || ""), s, 64).toString("hex");
  return { hash: h, salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const h = crypto.scryptSync(password + (process.env.PEPPER || ""), salt, 64).toString("hex");
  return h === hash;
}

// Initialize auth system - create default admin if no users exist
export async function initializeAuth(): Promise<void> {
  const users = await getAllUsers();

  if (users.length === 0) {
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
    await createUser("admin", defaultAdminPassword, "admin", "admin@localhost");
    console.log("Created default admin user (username: admin)");
  }
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'role' | 'email'>>
): Promise<User | null> {
  const users = await getAllUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;

  const user = users[index];
  if (updates.role) user.role = updates.role;
  if (updates.email !== undefined) user.email = updates.email;

  await writeJson(USERS_FILE, users);
  return user;
}

export async function updateUserPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getAllUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  // Verify old password
  if (!verifyPassword(oldPassword, user.passwordHash, user.salt)) {
    return { success: false, error: "Incorrect old password" };
  }

  // Hash new password
  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  await writeJson(USERS_FILE, users);
  return { success: true };
}

// 2FA functions
export function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString("hex");
}

export function getTOTPCode(secret: string, timeStep?: number): string {
  if (!timeStep) timeStep = Math.floor(Date.now() / 1000 / 30);
  const key = Buffer.from(secret, "hex");
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(0, timeStep, false);
  timeView.setUint32(4, 0, false);
  
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(Buffer.from(timeBuffer));
  const digest = hmac.digest();
  
  const offset = digest[digest.length - 1] & 0x0f;
  const code = ((digest[offset] & 0x7f) << 24) |
               ((digest[offset + 1] & 0xff) << 16) |
               ((digest[offset + 2] & 0xff) << 8) |
               (digest[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, "0");
}

export function verifyTOTP(secret: string, code: string): boolean {
  // Allow code to be valid for current and previous time step (for clock skew)
  const now = Math.floor(Date.now() / 1000 / 30);
  const expected = getTOTPCode(secret, now);
  const expectedPrev = getTOTPCode(secret, now - 1);
  return code === expected || code === expectedPrev;
}

// Enable 2FA for user
export async function enable2FA(userId: string, secret: string): Promise<boolean> {
  const users = await getAllUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return false;
  user.totpSecret = secret;
  user.totpEnabled = true;
  await writeJson(USERS_FILE, users);
  return true;
}

// Disable 2FA for user
export async function disable2FA(userId: string, password: string): Promise<{ success: boolean; error?: string }> {
  const users = await getAllUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: "User not found" };
  }
  if (!user.totpEnabled) {
    return { success: false, error: "2FA not enabled" };
  }
  // If password is provided and matches, we can disable
  if (!verifyPassword(password, user.passwordHash, user.salt)) {
    return { success: false, error: "Invalid password" };
  }
  user.totpSecret = undefined;
  user.totpEnabled = false;
  await writeJson(USERS_FILE, users);
  return { success: true };
}
