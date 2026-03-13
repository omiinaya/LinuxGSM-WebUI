export interface LinuxGSMConfig {
  // Server Identity
  gamename?: string;
  servername?: string;
  
  // Network Settings
  ip?: string;
  port?: number;
  queryport?: number;
  rconport?: number;
  clientport?: number;
  sourcetvport?: number;
  displayip?: string;
  
  // Game Settings
  defaultmap?: string;
  gamemode?: string;
  maxplayers?: number;
  
  // Query Settings
  querydelay?: number;
  
  // Update Settings
  updateonstart?: boolean;
  branch?: string;
  betapassword?: string;
  
  // Backup Settings
  backupdir?: string;
  maxbackups?: number;
  maxbackupdays?: number;
  stoponbackup?: boolean;
  
  // Log Settings
  logdays?: number;
  consolelogging?: boolean;
  
  // Monitor Settings
  monitor?: boolean;
  
  // Stop Mode
  stopmode?: number;
  
  // Steam Settings
  steamuser?: string;
  steampass?: string;
  gslt?: string;
  
  // Alert Settings
  alert?: boolean;
  discordalert?: boolean;
  discordwebhook?: string;
  emailalert?: boolean;
  telegramalert?: boolean;
  slackalert?: boolean;
  pushoveralert?: boolean;
  pushbulletalert?: boolean;
  pushoverapptoken?: string;
  pushoveruserkey?: string;
  postalert?: boolean;
}

export interface GameConfig {
  name: string;
  path: string;
  content: string;
}

export interface ConfigFile {
  name: string;
  path: string;
  type: "lgsm" | "game" | "secrets";
  content: string;
  lastModified: string;
}

export interface ConfigSection {
  id: string;
  title: string;
  description: string;
  fields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "password";
  value: string | number | boolean;
  options?: { label: string; value: string }[];
  description?: string;
}
