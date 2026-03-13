import { SSHClient } from "../ssh/client";
import type { Server, ServerStatus, ServerDetails, Player } from "@/types";

export class LinuxGSMService {
  private client: SSHClient;
  private server: Server;

  constructor(client: SSHClient, server: Server) {
    this.client = client;
    this.server = server;
  }

  private getScriptPath(): string {
    return `${this.server.installPath}/${this.server.name}`;
  }

  async start(): Promise<{ success: boolean; output: string }> {
    const result = await this.client.execute(`${this.getScriptPath()} start`);
    return { success: result.success, output: result.output };
  }

  async stop(): Promise<{ success: boolean; output: string }> {
    const result = await this.client.execute(`${this.getScriptPath()} stop`);
    return { success: result.success, output: result.output };
  }

  async restart(): Promise<{ success: boolean; output: string }> {
    const result = await this.client.execute(`${this.getScriptPath()} restart`);
    return { success: result.success, output: result.output };
  }

  async forceStop(): Promise<{ success: boolean; output: string }> {
    const result = await this.client.execute(`${this.getScriptPath()} stop -f`);
    return { success: result.success, output: result.output };
  }

  async getStatus(): Promise<ServerStatus> {
    const result = await this.client.execute(`${this.getScriptPath()} monitor`);
    
    if (result.output.includes("Server started")) return "running";
    if (result.output.includes("Server stopped")) return "stopped";
    if (result.output.includes("Installing")) return "installing";
    if (result.output.includes("Updating")) return "updating";
    if (result.output.includes("crashed")) return "crashed";
    
    // Check if process is running
    const processResult = await this.client.execute(
      `ps aux | grep -v grep | grep -q ${this.server.name} && echo "running" || echo "stopped"`
    );
    
    return processResult.output.includes("running") ? "running" : "stopped";
  }

  async getDetails(): Promise<ServerDetails> {
    const result = await this.client.execute(`${this.getScriptPath()} details`);
    return this.parseDetails(result.output);
  }

  private parseDetails(output: string): ServerDetails {
    const lines = output.split("\n");
    
    const details: ServerDetails = {
      distro: { distro: "", arch: "", kernel: "", hostname: "", tmux: "", glibc: "" },
      performance: { uptime: "", avgLoad: [], memTotal: "", memUsed: "", memFree: "", swapTotal: "", swapUsed: "", swapFree: "" },
      disk: { available: "", serverfiles: "", backups: "" },
      server: { name: "", ip: "", status: "", rconPassword: "", serviceName: "", user: "", location: "", configFile: "" },
      ports: [],
      backups: [],
      parameters: [],
    };

    let currentSection = "";

    for (const line of lines) {
      if (line.includes("Distro Details")) currentSection = "distro";
      else if (line.includes("Performance")) currentSection = "performance";
      else if (line.includes("Disk Usage")) currentSection = "disk";
      else if (line.includes("Server Details") || line.includes("Server name:")) currentSection = "server";
      else if (line.includes("Ports")) currentSection = "ports";
      else if (line.includes("Backups")) currentSection = "backups";
      else if (line.includes("Command-line Parameters")) currentSection = "params";
      
      // Parse each section
      if (currentSection === "distro") {
        if (line.includes("Distro:")) details.distro.distro = line.split(":").pop()?.trim() || "";
        if (line.includes("Arch:")) details.distro.arch = line.split(":").pop()?.trim() || "";
        if (line.includes("Kernel:")) details.distro.kernel = line.split(":").pop()?.trim() || "";
        if (line.includes("Hostname:")) details.distro.hostname = line.split(":").pop()?.trim() || "";
        if (line.includes("tmux:")) details.distro.tmux = line.split(":").pop()?.trim() || "";
        if (line.includes("GLIBC:")) details.distro.glibc = line.split(":").pop()?.trim() || "";
      }
      
      if (currentSection === "performance") {
        if (line.includes("Uptime:")) details.performance.uptime = line.split(":").slice(1).join(":").trim();
        if (line.includes("Avg Load:")) details.performance.avgLoad = line.split(":").pop()?.trim().split(",") || [];
        if (line.includes("Physical:")) {
          const parts = line.split(":").pop()?.trim().split(/\s+/) || [];
          details.performance.memTotal = parts[0] || "";
          details.performance.memUsed = parts[1] || "";
          details.performance.memFree = parts[2] || "";
        }
      }
      
      if (currentSection === "disk") {
        if (line.includes("Disk available:")) details.disk.available = line.split(":").pop()?.trim() || "";
        if (line.includes("Serverfiles:")) details.disk.serverfiles = line.split(":").pop()?.trim() || "";
        if (line.includes("Backups:")) details.disk.backups = line.split(":").pop()?.trim() || "";
      }
    }

    return details;
  }

  async update(): Promise<{ success: boolean; output: string }> {
    const result = await this.client.execute(`${this.getScriptPath()} update`);
    return { success: result.success, output: result.output };
  }

  async checkUpdate(): Promise<{ available: boolean; output: string }> {
    const result = await this.client.execute(`${this.getScriptPath()} check-update`);
    return { 
      available: result.output.includes("Update available"),
      output: result.output 
    };
  }

  async validate(): Promise<{ success: boolean; output: string }> {
    const result = await this.client.execute(`${this.getScriptPath()} validate`);
    return { success: result.success, output: result.output };
  }

  async backup(name?: string): Promise<{ success: boolean; output: string }> {
    const backupName = name ? `name=${name}` : "";
    const result = await this.client.execute(`${this.getScriptPath()} backup ${backupName}`);
    return { success: result.success, output: result.output };
  }

  async query(): Promise<{ 
    success: boolean; 
    players: number; 
    maxPlayers: number; 
    map: string; 
    gamemode: string;
    output: string;
  }> {
    // Use the query command if available, or fall back to gamedig directly
    const result = await this.client.execute(`${this.getScriptPath()} query`);
    
    if (!result.success) {
      return { success: false, players: 0, maxPlayers: 0, map: "", gamemode: "", output: result.output };
    }

    // Parse query output
    // Example output varies by game, but we can extract common info
    const playersMatch = result.output.match(/players?:?\s*(\d+)/i);
    const maxPlayersMatch = result.output.match(/maxplayers?:?\s*(\d+)/i);
    const mapMatch = result.output.match(/map:?\s*([^\n]+)/i);
    const gamemodeMatch = result.output.match(/gamemode:?\s*([^\n]+)/i);

    return {
      success: true,
      players: playersMatch ? parseInt(playersMatch[1]) : 0,
      maxPlayers: maxPlayersMatch ? parseInt(maxPlayersMatch[1]) : 0,
      map: mapMatch ? mapMatch[1].trim() : "",
      gamemode: gamemodeMatch ? gamemodeMatch[1].trim() : "",
      output: result.output,
    };
  }

  async restore(backupFile: string): Promise<{ success: boolean; output: string }> {
    const result = await this.client.execute(`${this.getScriptPath()} restore ${backupFile}`);
    return { success: result.success, output: result.output };
  }

  async getConsoleLog(lines: number = 100): Promise<string> {
    const logPath = `${this.server.installPath}/log/console`;
    const result = await this.client.execute(`tail -n ${lines} ${logPath}`);
    return result.output;
  }

  async sendCommand(command: string): Promise<{ success: boolean; output: string }> {
    const result = await this.client.execute(
      `tmux send-keys -t ${this.server.name} "${command}" Enter`
    );
    return { success: result.success, output: result.output };
  }

  async getConfig(configType: "lgsm" | "game"): Promise<string> {
    if (configType === "lgsm") {
      const configPath = `${this.server.installPath}/lgsm/config-lgsm/${this.server.name}/${this.server.name}.cfg`;
      return await this.client.getFile(configPath);
    } else {
      const configPath = `${this.server.installPath}/serverfiles/${this.server.name}/cfg`;
      const result = await this.client.execute(`ls -la ${configPath}`);
      return result.output;
    }
  }

   async saveConfig(configType: "lgsm" | "game", content: string, path: string): Promise<{ success: boolean }> {
     try {
       await this.client.writeFile(path, content);
       return { success: true };
     } catch {
       return { success: false };
     }
   }

   // Generic command execution
   async execute(command: string): Promise<{ success: boolean; output: string; error?: string }> {
     return await this.client.execute(command);
   }
 }
