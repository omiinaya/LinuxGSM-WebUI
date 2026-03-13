import { SSHClient } from "./client";
import { LinuxGSMService } from "../linuxgsm/commands";
import { LocalExecutor } from "./local-executor";
import { LocalLinuxGSMService } from "./local-lgsm-service";
import type { Server } from "@/types";

export async function getService(
  connection: any,
  server: Server
): Promise<{ service: any; cleanup: () => Promise<void> }> {
  if (connection?.type === "local") {
    const executor = new LocalExecutor({ workingDir: connection.workingDir || process.cwd() });
    const service = new LocalLinuxGSMService(executor, server);
    return { service, cleanup: async () => {} };
  } else {
    const client = new SSHClient(connection);
    await client.connect();
    const service = new LinuxGSMService(client, server);
    return {
      service,
      cleanup: async () => {
        await client.disconnect().catch(console.error);
      }
    };
  }
}
