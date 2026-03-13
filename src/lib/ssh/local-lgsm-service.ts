import { LocalExecutor } from "./local-executor";
import type { Server } from "@/types";

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

export class LocalLinuxGSMService {
  private executor: LocalExecutor;
  private server: Server;

  constructor(executor: LocalExecutor, server: Server) {
    this.executor = executor;
    this.server = server;
  }

  private getScriptPath(): string {
    return `${this.server.installPath}/${this.server.name}`;
  }

  async start(): Promise<CommandResult> {
    return await this.executor.execute(`${this.getScriptPath()} start`);
  }

  async stop(): Promise<CommandResult> {
    return await this.executor.execute(`${this.getScriptPath()} stop`);
  }

  async restart(): Promise<CommandResult> {
    return await this.executor.execute(`${this.getScriptPath()} restart`);
  }

  async getStatus(): Promise<{ status: string; output: string; success: boolean; error?: string }> {
    const result = await this.executor.execute(`${this.getScriptPath()} monitor`);
    let status = "unknown";
    if (result.output.includes("Server started")) status = "running";
    else if (result.output.includes("Server stopped")) status = "stopped";
    else if (result.output.includes("Installing")) status = "installing";
    else if (result.output.includes("Updating")) status = "updating";
    else if (result.output.includes("crashed")) status = "crashed";
    return { ...result, status };
  }

  async getDetails(): Promise<any> {
    const result = await this.executor.execute(`${this.getScriptPath()} details`);
    return this.parseDetails(result.output);
  }

  private parseDetails(output: string): any {
    const lines = output.split("\n");
    const details: any = {
      distro: {},
      performance: {},
      disk: {},
      server: {},
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

      if (line.includes(":")) {
        const [key, value] = line.split(":").map(s => s.trim());
        if (!value) continue;
        const keyLower = key.toLowerCase();
        if (currentSection === "distro") details.distro[keyLower] = value;
        else if (currentSection === "performance") details.performance[keyLower] = value;
        else if (currentSection === "disk") details.disk[keyLower] = value;
        else if (currentSection === "server") details.server[keyLower] = value;
      }
    }
    return details;
  }

  async query(): Promise<{ success: boolean; players?: number; maxPlayers?: number; map?: string; gamemode?: string; output: string; error?: string }> {
    const result = await this.executor.execute(`${this.getScriptPath()} query`);
    const playersMatch = result.output.match(/players?:?\s*(\d+)/i);
    const maxPlayersMatch = result.output.match(/maxplayers?:?\s*(\d+)/i);
    const mapMatch = result.output.match(/map:?\s*([^\n]+)/i);
    const gamemodeMatch = result.output.match(/gamemode:?\s*([^\n]+)/i);

    return {
      success: result.success,
      players: playersMatch ? parseInt(playersMatch[1]) : 0,
      maxPlayers: maxPlayersMatch ? parseInt(maxPlayersMatch[1]) : 0,
      map: mapMatch ? mapMatch[1].trim() : "",
      gamemode: gamemodeMatch ? gamemodeMatch[1].trim() : "",
      output: result.output,
      error: result.error,
    };
  }

  async validate(): Promise<CommandResult> {
    return await this.executor.execute(`${this.getScriptPath()} validate`);
  }

  async backup(name?: string): Promise<CommandResult & { backupFile?: string }> {
    const cmd = name 
      ? `${this.getScriptPath()} backup "${name}"`
      : `${this.getScriptPath()} backup`;
    const result = await this.executor.execute(cmd);
    const fileMatch = result.output.match(/(backup|\.tar\.gz)/i);
    return { ...result, backupFile: fileMatch ? fileMatch[0] : undefined };
  }

  async restore(backupFile: string): Promise<CommandResult> {
    return await this.executor.execute(`${this.getScriptPath()} restore "${backupFile}"`);
  }

  async sendCommand(command: string): Promise<CommandResult> {
    return await this.executor.execute(`tmux send-keys -t ${this.server.name} "${command}" Enter`);
  }

  async getConsoleLog(lines: number = 100): Promise<string> {
    const result = await this.executor.execute(`tail -n ${lines} "${this.server.installPath}/log/console"`);
    return result.output;
  }

  async getConfig(configType: "lgsm" | "game"): Promise<string> {
    if (configType === "lgsm") {
      const configPath = `${this.server.installPath}/lgsm/config-lgsm/${this.server.name}/${this.server.name}.cfg`;
      return await this.executor.readFile(configPath);
    } else {
      const configPath = `${this.server.installPath}/serverfiles/${this.server.name}/cfg`;
      const result = await this.executor.execute(`ls -la "${configPath}"`);
      return result.output;
    }
  }

  async saveConfig(configType: "lgsm" | "game", content: string, path: string): Promise<{ success: boolean }> {
    try {
      await this.executor.writeFile(path, content);
      return { success: true };
    } catch (err: any) {
      return { success: false };
    }
  }

  async checkPorts(): Promise<{ usedPorts: number[]; conflicts: any[] }> {
    const result = await this.executor.execute("netstat -tuln");
    const usedPorts = new Set<number>();
    const lines = result.output.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Proto') || trimmed.startsWith('Active')) continue;
      
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const localAddr = parts[3];
        const portStr = localAddr.split(':').pop();
        const port = parseInt(portStr || '0', 10);
        if (port > 0 && port < 65536) {
          usedPorts.add(port);
        }
      }
    }

    const portsToCheck = [
      { name: 'game', port: this.server.port },
      { name: 'query', port: this.server.queryPort },
      { name: 'rcon', port: this.server.rconPort },
    ].filter(p => p.port && p.port > 0);

    const conflicts = portsToCheck.filter(p => usedPorts.has(p.port as number));

    return {
      usedPorts: Array.from(usedPorts).sort((a,b) => a-b),
      conflicts,
    };
  }

  async updateCheck(): Promise<CommandResult> {
    return await this.executor.execute(`${this.getScriptPath()} check-update`);
  }

  async update(): Promise<CommandResult> {
    return await this.executor.execute(`${this.getScriptPath()} update`);
  }
}
