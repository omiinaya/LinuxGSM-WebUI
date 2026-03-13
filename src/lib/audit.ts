import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const AUDIT_FILE = path.join(DATA_DIR, "audit-log.json");

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId?: string;
  username?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
}

async function readAuditLogs(): Promise<AuditEntry[]> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    return [];
  }
  try {
    const data = await fs.readFile(AUDIT_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeAuditLogs(logs: AuditEntry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(AUDIT_FILE, JSON.stringify(logs, null, 2));
}

export async function getAuditLogs(limit?: number): Promise<AuditEntry[]> {
  const logs = await readAuditLogs();
  if (limit) {
    return logs.slice(0, limit);
  }
  return logs;
}

export async function writeAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<AuditEntry> {
  const logs = await readAuditLogs();
  const newEntry: AuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newEntry);
  await writeAuditLogs(logs);
  return newEntry;
}

// Helper to log auth events
export async function logAuthEvent(
  action: string, // allow any string for flexibility
  userId?: string,
  username?: string,
  details?: Record<string, any>,
  ip?: string
) {
  await writeAuditEntry({
    userId,
    username,
    action,
    details,
    ip,
  });
}

// Helper to log server operations
export async function logServerEvent(
  action: "start" | "stop" | "restart" | "backup" | "restore" | "config_save" | "validate" | "port_check" | "update" | "cron_add" | "command",
  userId?: string,
  username?: string,
  resourceId?: string,
  details?: Record<string, any>,
  ip?: string
) {
  await writeAuditEntry({
    userId,
    username,
    action,
    resource: "server",
    resourceId,
    details,
    ip,
  });
}

// Helper to log admin actions
export async function logAdminEvent(
  action: "user_create" | "user_delete" | "user_role_change" | "session_revoke",
  userId?: string,
  username?: string,
  resourceId?: string,
  details?: Record<string, any>,
  ip?: string
) {
  await writeAuditEntry({
    userId,
    username,
    action,
    resource: "admin",
    resourceId,
    details,
    ip,
  });
}

// Purge old logs (e.g., keep last 90 days)
export async function purgeOldLogs(olderThanDays: number = 90): Promise<number> {
  const logs = await readAuditLogs();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  
  const before = logs.length;
  const filtered = logs.filter(entry => new Date(entry.timestamp) > cutoff);
  const deleted = before - filtered.length;
  
  await writeAuditLogs(filtered);
  return deleted;
}
