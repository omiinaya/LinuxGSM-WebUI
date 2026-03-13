import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export interface LocalExecutorOptions {
  workingDir?: string;
  username?: string;
}

export class LocalExecutor {
  private workingDir: string;

  constructor(options: LocalExecutorOptions = {}) {
    this.workingDir = options.workingDir || process.cwd();
  }

  async execute(command: string): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workingDir,
        maxBuffer: 1024 * 1024, // 1MB
      });
      return { success: true, output: stdout + (stderr ? stderr : "") };
    } catch (err: any) {
      return {
        success: false,
        output: err.stdout || "",
        error: err.stderr || err.message,
      };
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (err: any) {
      throw new Error(`Failed to read file ${filePath}: ${err.message}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, "utf-8");
    } catch (err: any) {
      throw new Error(`Failed to write file ${filePath}: ${err.message}`);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listDir(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath);
      return entries;
    } catch (err: any) {
      throw new Error(`Failed to list directory ${dirPath}: ${err.message}`);
    }
  }

  setWorkingDir(dir: string) {
    this.workingDir = dir;
  }

  getWorkingDir(): string {
    return this.workingDir;
  }
}

// Utility to detect LinuxGSM installations on the local machine
export async function discoverLocalLinuxGSM(basePaths: string[] = ["/home", "/opt"]): Promise<any[]> {
  const discovered: any[] = [];
  
  for (const basePath of basePaths) {
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const userName = entry.name;
          const possibleScripts = [
            path.join(basePath, userName, "*.server.sh"),
            path.join(basePath, userName, "*server"),
            path.join(basePath, userName, "linuxgsm.sh"),
          ];
          
          // Check each pattern by trying to list files
          for (const pattern of possibleScripts) {
            try {
              const files = await execAsync(`ls -1 ${pattern} 2>/dev/null`).then(r => r.stdout.trim().split('\n')).catch(() => []);
              
              for (const file of files) {
                if (file && file.endsWith(".server.sh") || file.endsWith("server")) {
                  const scriptName = path.basename(file);
                  const gameName = scriptName.replace(/.server.sh$/, "").replace(/server$/, "");
                  
                   // Basic details
                   discovered.push({
                     path: file,
                     name: scriptName,
                     gameName: gameName,
                     userId: userName,
                     installPath: path.dirname(file),
                     configPath: path.join(path.dirname(file), "config"),
                   });
                }
              }
            } catch {
              // ignore pattern errors
            }
          }
        }
      }
    } catch (err) {
      // Skip inaccessible base paths
      continue;
    }
  }

  return discovered;
}
