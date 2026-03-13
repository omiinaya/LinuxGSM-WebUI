import { Client, ConnectConfig } from "ssh2";
import type { SSHConnection, CommandResult } from "@/types";

export class SSHClient {
  private client: Client;
  private connection: SSHConnection;
  private connected: boolean = false;

  constructor(connection: SSHConnection) {
    this.client = new Client();
    this.connection = connection;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const config: ConnectConfig = {
        host: this.connection.host,
        port: this.connection.port || 22,
        username: this.connection.username,
      };

      if (this.connection.authType === "password") {
        config.password = this.connection.password;
      } else if (this.connection.authType === "key") {
        config.privateKey = this.connection.privateKey;
      }

      this.client.on("ready", () => {
        this.connected = true;
        resolve();
      });

      this.client.on("error", (err) => {
        this.connected = false;
        reject(err);
      });

      this.client.connect(config);
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.client.end();
      this.connected = false;
      resolve();
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async execute(command: string): Promise<CommandResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      this.client.exec(command, (err, stream) => {
        if (err) {
          resolve({
            success: false,
            output: "",
            error: err.message,
            duration: Date.now() - startTime,
          });
          return;
        }

        let output = "";
        let errorOutput = "";

        stream.on("data", (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          errorOutput += data.toString();
        });

        stream.on("close", (code: number) => {
          resolve({
            success: code === 0,
            output: output.trim(),
            error: errorOutput.trim() || undefined,
            exitCode: code,
            duration: Date.now() - startTime,
          });
        });
      });
    });
  }

  async executeWithProgress(
    command: string,
    onData: (data: string) => void
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let output = "";

      this.client.exec(command, (err, stream) => {
        if (err) {
          resolve({
            success: false,
            output: "",
            error: err.message,
            duration: Date.now() - startTime,
          });
          return;
        }

        stream.on("data", (data: Buffer) => {
          const chunk = data.toString();
          output += chunk;
          onData(chunk);
        });

        stream.stderr.on("data", (data: Buffer) => {
          const chunk = data.toString();
          output += chunk;
          onData(chunk);
        });

        stream.on("close", (code: number) => {
          resolve({
            success: code === 0,
            output: output.trim(),
            exitCode: code,
            duration: Date.now() - startTime,
          });
        });
      });
    });
  }

  async getFile(remotePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let content = "";

      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.readFile(remotePath, (err, data) => {
          if (err) {
            reject(err);
            return;
          }
          content = data.toString();
          resolve(content);
        });
      });
    });
  }

  async writeFile(remotePath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.writeFile(remotePath, content, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }
}

export async function createSSHClient(connection: SSHConnection): Promise<SSHClient> {
  const client = new SSHClient(connection);
  await client.connect();
  return client;
}
