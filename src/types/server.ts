export type ServerStatus = 
  | "running" 
  | "stopped" 
  | "starting" 
  | "stopping" 
  | "installing" 
  | "updating" 
  | "crashed"
  | "unknown";

export interface Server {
  id: string;
  name: string;
  game: string;
  gameName: string;
  status: ServerStatus;
  ip: string;
  port: number;
  queryPort: number;
  rconPort: number;
  maxPlayers: number;
  currentPlayers: Player[];
  map: string;
  gamemode: string;
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  installPath: string;
  configPath: string;
  lgsmVersion: string;
  lastUpdate: string;
  createdAt: string;
  sshConnection?: SSHConnection | { type: "local"; workingDir?: string };
  local?: boolean; // flag for local management
}

export interface Player {
  name: string;
  score: number;
  time: string;
  ping: number;
}

export interface SSHConnection {
  host: string;
  port: number;
  username: string;
  authType: "password" | "key";
  password?: string;
  privateKey?: string;
}

export interface ServerDetails {
  distro: DistroDetails;
  performance: PerformanceDetails;
  disk: DiskDetails;
  server: ServerInfo;
  ports: PortInfo[];
  backups: BackupInfo[];
  parameters: string[];
}

export interface DistroDetails {
  distro: string;
  arch: string;
  kernel: string;
  hostname: string;
  tmux: string;
  glibc: string;
}

export interface PerformanceDetails {
  uptime: string;
  avgLoad: string[];
  memTotal: string;
  memUsed: string;
  memFree: string;
  swapTotal: string;
  swapUsed: string;
  swapFree: string;
}

export interface DiskDetails {
  available: string;
  serverfiles: string;
  backups: string;
}

export interface ServerInfo {
  name: string;
  ip: string;
  status: string;
  rconPassword: string;
  serviceName: string;
  user: string;
  location: string;
  configFile: string;
}

export interface PortInfo {
  description: string;
  port: number;
  protocol: string;
  direction: string;
}

export interface BackupInfo {
  date: string;
  file: string;
  size: string;
}
