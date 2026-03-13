"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, Header } from "@/components/layout";
import { ServerCard } from "@/components/servers";
import { SSHConnectionModal } from "@/components/modals/ssh-connection-modal";
import { useServersStore, useUIStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Server } from "@/types";

export default function Home() {
  const router = useRouter();
  const { servers, selectedServerId, selectServer, addServer, updateServer } = useServersStore();
  const { viewMode, setViewMode, sidebarOpen } = useUIStore();

  const handleStart = async (server: Server) => {
    try {
      const response = await fetch(`/api/servers/${server.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh server status after action
        await refreshServerStatus(server);
      } else {
        console.error("Failed to start:", data.error);
      }
    } catch (error) {
      console.error("Start error:", error);
    }
  };

  const handleStop = async (server: Server) => {
    try {
      const response = await fetch(`/api/servers/${server.id}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await refreshServerStatus(server);
      } else {
        console.error("Failed to stop:", data.error);
      }
    } catch (error) {
      console.error("Stop error:", error);
    }
  };

  const handleRestart = async (server: Server) => {
    try {
      const response = await fetch(`/api/servers/${server.id}/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await refreshServerStatus(server);
      } else {
        console.error("Failed to restart:", data.error);
      }
    } catch (error) {
      console.error("Restart error:", error);
    }
  };

  const refreshServerStatus = useCallback(async (server: Server) => {
    try {
      const response = await fetch(`/api/servers/${server.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status) {
          updateServer(server.id, { status: data.status });
        }
      }
    } catch (error) {
      console.error("Status refresh error:", error);
    }
  }, [updateServer]);

  const handleRefreshAll = useCallback(async () => {
    // Refresh status for all servers
    await Promise.all(
      servers.map(server => refreshServerStatus(server))
    );
  }, [servers, refreshServerStatus]);

  // Initial refresh when servers are loaded
  useEffect(() => {
    if (servers.length > 0) {
      handleRefreshAll().catch(console.error);
    }
  }, [servers.length, handleRefreshAll]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (servers.length > 0) {
        handleRefreshAll().catch(console.error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [servers.length, handleRefreshAll]);

   const runningCount = servers.filter(s => s.status === "running").length;
  const stoppedCount = servers.filter(s => s.status === "stopped").length;

  return (
    <>
      <SSHConnectionModal 
        open={useUIStore.getState().showConnectionModal}
        onOpenChange={(open) => useUIStore.getState().setShowConnectionModal(open)}
      />
      
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          
          <main className="flex-1 overflow-y-auto p-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-card rounded-lg border p-4">
                <div className="text-2xl font-bold">{servers.length}</div>
                <div className="text-sm text-muted-foreground">Total Servers</div>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <div className="text-2xl font-bold text-green-500">{runningCount}</div>
                <div className="text-sm text-muted-foreground">Running</div>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <div className="text-2xl font-bold text-red-500">{stoppedCount}</div>
                <div className="text-sm text-muted-foreground">Stopped</div>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <Button
                  variant="outline"
                  onClick={handleRefreshAll}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh All
                </Button>
              </div>
            </div>

            {/* Server List Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Game Servers
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={() => useUIStore.getState().setShowConnectionModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Server
                </Button>
              </div>
            </div>

            {/* Server Grid */}
            {servers.length > 0 ? (
              <div className={cn(
                "grid gap-4",
                viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
              )}>
                {servers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    onSelect={(s) => {
                      selectServer(s.id);
                      router.push(`/server/${s.id}`);
                    }}
                    onStart={() => handleStart(server)}
                    onStop={() => handleStop(server)}
                    onRestart={() => handleRestart(server)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  No servers configured yet
                </div>
                <Button onClick={() => useUIStore.getState().setShowConnectionModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Server
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
