"use client";

import * as React from "react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useUIStore, useServersStore } from "@/stores";
import { Button } from "@/components/ui/button";
import {
  Play,
  Square,
  RotateCcw,
  Terminal,
  Settings,
  Download,
  Upload,
  FileJson,
  Activity,
  Plus,
  Server,
} from "lucide-react";

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const { servers, selectedServerId, getServer } = useServersStore();
  const selectedServer = selectedServerId ? getServer(selectedServerId) : null;

  const runCommand = async (command: string) => {
    if (!selectedServer) return;
    try {
      await fetch(`/api/servers/${selectedServer.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: selectedServer.sshConnection,
          server: selectedServer,
          command: command,
        }),
      });
    } catch (error) {
      console.error(`Failed to run ${command}:`, error);
    }
  };

  const handleAction = async (action: string) => {
    if (!selectedServer) return;

    switch (action) {
      case "start":
        await fetch(`/api/servers/${selectedServer.id}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connection: selectedServer.sshConnection,
            server: selectedServer,
          }),
        });
        break;
      case "stop":
        await fetch(`/api/servers/${selectedServer.id}/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connection: selectedServer.sshConnection,
            server: selectedServer,
          }),
        });
        break;
      case "restart":
        await fetch(`/api/servers/${selectedServer.id}/restart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connection: selectedServer.sshConnection,
            server: selectedServer,
          }),
        });
        break;
      case "update":
        await runCommand("update");
        break;
      case "check-update":
        await runCommand("check-update");
        break;
      case "validate":
        await runCommand("validate");
        break;
      case "backup":
        await runCommand("backup");
        break;
      case "console":
        // Navigate to console tab? Not implemented yet
        break;
      case "config":
        // Navigate to config?
        break;
      case "add-server":
        setCommandPaletteOpen(false);
        useUIStore.getState().setShowConnectionModal(true);
        break;
    }

    setCommandPaletteOpen(false);
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {selectedServer && (
          <CommandGroup heading="Server Actions">
            <CommandItem onSelect={() => handleAction("start")}>
              <Play className="mr-2 h-4 w-4" />
              <span>Start Server</span>
            </CommandItem>
            <CommandItem onSelect={() => handleAction("stop")}>
              <Square className="mr-2 h-4 w-4" />
              <span>Stop Server</span>
            </CommandItem>
            <CommandItem onSelect={() => handleAction("restart")}>
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>Restart Server</span>
            </CommandItem>
          </CommandGroup>
        )}

        {selectedServer && (
          <CommandGroup heading="Maintenance">
            <CommandItem onSelect={() => handleAction("check-update")}>
              <Download className="mr-2 h-4 w-4" />
              <span>Check for Updates</span>
              <span className="ml-auto text-xs text-muted-foreground">check-update</span>
            </CommandItem>
            <CommandItem onSelect={() => handleAction("update")}>
              <Upload className="mr-2 h-4 w-4" />
              <span>Update Server</span>
              <span className="ml-auto text-xs text-muted-foreground">update</span>
            </CommandItem>
            <CommandItem onSelect={() => handleAction("validate")}>
              <Activity className="mr-2 h-4 w-4" />
              <span>Validate Server</span>
              <span className="ml-auto text-xs text-muted-foreground">validate</span>
            </CommandItem>
            <CommandItem onSelect={() => handleAction("backup")}>
              <FileJson className="mr-2 h-4 w-4" />
              <span>Create Backup</span>
              <span className="ml-auto text-xs text-muted-foreground">backup</span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading="Navigation">
          {selectedServer && (
            <CommandItem onSelect={() => {
              setCommandPaletteOpen(false);
              window.location.href = `/server/${selectedServer.id}`;
            }}>
              <Server className="mr-2 h-4 w-4" />
              <span>View Server Details</span>
            </CommandItem>
          )}
          <CommandItem onSelect={() => handleAction("add-server")}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Add New Server</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => {
            setCommandPaletteOpen(false);
            // Navigate to settings page
          }}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Open Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
