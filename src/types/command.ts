export interface Command {
  id: string;
  name: string;
  description: string;
  short: string;
  long: string;
  category: CommandCategory;
  requiresServer?: boolean;
}

export type CommandCategory = 
  | "control"
  | "info"
  | "maintenance"
  | "install"
  | "developer";

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  duration?: number;
}

export interface CommandHistoryItem {
  id: string;
  serverId: string;
  command: string;
  executedAt: string;
  duration: number;
  success: boolean;
  output: string;
}

export const LINUXGSM_COMMANDS: Command[] = [
  // Control Commands
  { id: "start", name: "Start", description: "Start the game server", short: "st", long: "start", category: "control", requiresServer: true },
  { id: "stop", name: "Stop", description: "Stop the game server", short: "sp", long: "stop", category: "control", requiresServer: true },
  { id: "restart", name: "Restart", description: "Restart the game server", short: "r", long: "restart", category: "control", requiresServer: true },
  
  // Info Commands
  { id: "details", name: "Details", description: "Show server details", short: "dt", long: "details", category: "info", requiresServer: true },
  { id: "postdetails", name: "Post Details", description: "Share server details (hide sensitive info)", short: "pd", long: "postdetails", category: "info", requiresServer: true },
  { id: "console", name: "Console", description: "Access server console", short: "c", long: "console", category: "info", requiresServer: true },
  
  // Maintenance Commands
  { id: "update", name: "Update", description: "Check and apply updates", short: "u", long: "update", category: "maintenance", requiresServer: true },
  { id: "check-update", name: "Check Update", description: "Check for updates only", short: "cu", long: "check-update", category: "maintenance", requiresServer: true },
  { id: "force-update", name: "Force Update", description: "Force update and restart", short: "fu", long: "force-update", category: "maintenance", requiresServer: true },
  { id: "validate", name: "Validate", description: "Validate game files", short: "v", long: "validate", category: "maintenance", requiresServer: true },
  { id: "backup", name: "Backup", description: "Create server backup", short: "b", long: "backup", category: "maintenance", requiresServer: true },
  { id: "update-lgsm", name: "Update LinuxGSM", description: "Update LinuxGSM scripts", short: "ul", long: "update-lgsm", category: "maintenance", requiresServer: true },
  { id: "monitor", name: "Monitor", description: "Run monitor check", short: "m", long: "monitor", category: "maintenance", requiresServer: true },
  { id: "test-alert", name: "Test Alert", description: "Send test alert", short: "ta", long: "test-alert", category: "maintenance", requiresServer: true },
  
  // Install Commands
  { id: "install", name: "Install", description: "Install game server", short: "i", long: "install", category: "install" },
  { id: "auto-install", name: "Auto Install", description: "Auto install (no prompts)", short: "ai", long: "auto-install", category: "install" },
  
  // Developer Commands
  { id: "debug", name: "Debug", description: "Run in debug mode", short: "d", long: "debug", category: "developer", requiresServer: true },
  { id: "skeleton", name: "Skeleton", description: "Create skeleton directory", short: "sk", long: "skeleton", category: "developer", requiresServer: true },
];
