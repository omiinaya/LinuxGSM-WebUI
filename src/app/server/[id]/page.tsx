"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Sidebar, Header } from "@/components/layout";
import { useServersStore, useUIStore } from "@/stores";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Play, Square, RotateCcw, Terminal, Activity, Users, Cpu, HardDrive, Database, Download, Search, Archive, RotateCcw as Restart, RefreshCw, CheckCircle, FileText, Filter, Settings, ListFilter } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="text-center py-8 text-muted-foreground">Loading editor...</div>,
});
import { cn } from "@/lib/utils";

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { servers, getServer, selectServer, updateServer } = useServersStore();
  const { viewMode } = useUIStore();
  const { user, loading: authLoading } = useAuth();
  
  const serverId = params?.id as string | undefined;
  const server = serverId ? getServer(serverId) : undefined;

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const [activeTab, setActiveTab] = useState("overview");
  const [configContent, setConfigContent] = useState("");
  const [originalConfig, setOriginalConfig] = useState<string>("");
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [configType, setConfigType] = useState<"lgsm" | "game">("lgsm");
  const [showConfigDiff, setShowConfigDiff] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [queryData, setQueryData] = useState<{
    players: number;
    maxPlayers: number;
    map: string;
    gamemode: string;
  } | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "available" | "updating" | "complete">("idle");
  const [updateInfo, setUpdateInfo] = useState<{ current: string; latest: string; output: string } | null>(null);
  const [updateProgress, setUpdateProgress] = useState<string[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPortModal, setShowPortModal] = useState(false);
  const [portCheckLoading, setPortCheckLoading] = useState(false);
  const [portConflicts, setPortConflicts] = useState<Array<{name: string; port: number}>>([]);
  const [usedPortsList, setUsedPortsList] = useState<number[]>([]);
  const [consoleLog, setConsoleLog] = useState("");
  const [consoleCommand, setConsoleCommand] = useState("");
  const [showLogSettings, setShowLogSettings] = useState(false);
  const [consoleConnected, setConsoleConnected] = useState(false);
  const [consoleError, setConsoleError] = useState<string | null>(null);
  const [selectedLogFile, setSelectedLogFile] = useState<"console" | "current" | "latest" | "debug">("console");
  const [logContent, setLogContent] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!server) return;
    setConfigLoading(true);
    try {
      const response = await fetch(`/api/servers/${server.id}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get",
          connection: server.sshConnection,
          server,
          configType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfigContent(data.config || "");
        setOriginalConfig(data.config || "");
        setConfigSaved(false);
      }
    } catch (error) {
      console.error("Config load error:", error);
    } finally {
      setConfigLoading(false);
    }
  }, [server, configType]);

  useEffect(() => {
    if (activeTab === "config" && server) {
      loadConfig();
    }
  }, [activeTab, server, loadConfig]);

  useEffect(() => {
    // Reload config when type changes if we're on config tab
    if (activeTab === "config" && server) {
      loadConfig();
    }
  }, [configType, activeTab, server, loadConfig]);

  const fetchLogs = useCallback(async () => {
    if (!server) return;
    setLogsLoading(true);
    setLogError(null);
    try {
      const response = await fetch(`/api/servers/${server.id}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
          file: selectedLogFile,
          lines: 500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLogContent(data.log);
      } else {
        const err = await response.json();
        setLogError(err.error || "Failed to load logs");
        setLogContent("");
      }
    } catch (error) {
      console.error("Logs fetch error:", error);
      setLogError("Network error loading logs");
    } finally {
      setLogsLoading(false);
    }
  }, [server, selectedLogFile]);

  useEffect(() => {
    if (activeTab === "logs" && server) {
      fetchLogs();
    }
  }, [activeTab, server, selectedLogFile, fetchLogs]);

  useEffect(() => {
    if (autoRefreshLogs && server) {
      const interval = setInterval(() => {
        fetchLogs().catch(console.error);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefreshLogs, server, fetchLogs]);

   // Compute diff between current and original
  const configDiff = useMemo(() => {
    if (!originalConfig) return [];
    
    const originalLines = originalConfig.split('\n');
    const currentLines = configContent.split('\n');
    
    // Simple line-by-line diff
    const diff: { type: 'same' | 'added' | 'removed'; content: string }[] = [];
    const maxLines = Math.max(originalLines.length, currentLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const orig = originalLines[i] || '';
      const curr = currentLines[i] || '';
      
      if (orig === curr) {
        diff.push({ type: 'same', content: orig });
      } else if (curr && !orig) {
        diff.push({ type: 'added', content: curr });
      } else if (orig && !curr) {
        diff.push({ type: 'removed', content: orig });
      } else {
        // Both different - show as removed then added
        diff.push({ type: 'removed', content: orig });
        diff.push({ type: 'added', content: curr });
      }
    }
    
    return diff;
  }, [originalConfig, configContent]);

  const hasChanges = configContent !== originalConfig;

  const handleSaveConfig = async () => {
    if (!server) return;
    
    if (!hasChanges) {
      alert("No changes to save.");
      return;
    }
    
    // Show diff modal for confirmation
    setShowConfigDiff(true);
  };

  const confirmSaveConfig = async () => {
    if (!server) return;
    try {
      const response = await fetch(`/api/servers/${server.id}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          connection: server.sshConnection,
          server,
          config: configContent,
          configType,
        }),
      });

      if (response.ok) {
        setOriginalConfig(configContent);
        setConfigSaved(true);
        setShowConfigDiff(false);
        setTimeout(() => setConfigSaved(false), 3000);
        triggerAlert("configChange");
      } else {
        alert("Failed to save configuration.");
      }
    } catch (error) {
      console.error("Config save error:", error);
      alert("Failed to save configuration.");
    }
  };

  const triggerAlert = useCallback(async (event: string) => {
    if (!server) return;
    try {
      await fetch("/api/alerts/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          server: {
            id: server.id,
            name: server.name,
            gameName: server.gameName,
            ip: server.ip,
            port: server.port,
            status: server.status,
            cpuUsage: server.cpuUsage,
            memoryUsage: server.memoryUsage,
            diskUsage: server.diskUsage,
          },
        }),
      });
    } catch (error) {
      console.error("Alert trigger failed:", error);
    }
  }, [server]);

  const fetchBackups = useCallback(async () => {
    if (!server) return;
    setBackupsLoading(true);
    try {
      const response = await fetch(`/api/servers/${server.id}/backups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error("Backups fetch error:", error);
    } finally {
      setBackupsLoading(false);
    }
  }, [server]);

  const handleRestore = async (backupFile: string) => {
    if (!server || !confirm("Are you sure you want to restore this backup? Server will be stopped if running.")) {
      return;
    }

    setRestoringId(backupFile);
    try {
      const response = await fetch(`/api/servers/${server.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
          backupFile,
        }),
      });

      if (response.ok) {
        alert("Restore initiated. Check console for progress.");
        await refreshStatus(server);
      } else {
        const data = await response.json();
        alert(`Restore failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Restore error:", error);
      alert("Restore failed due to network error");
    } finally {
      setRestoringId(null);
    }
  };

  useEffect(() => {
    if (activeTab === "backups" && server) {
      fetchBackups();
    }
  }, [activeTab, server, fetchBackups]);

  const fetchConsoleLog = useCallback(async () => {
    if (!server) return;
    try {
      const response = await fetch(`/api/servers/${server.id}/console`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
          lines: 100,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConsoleLog((prev) => {
          // Append only new lines? For now replace
          return data.log;
        });
      }
    } catch (error) {
      console.error("Console fetch error:", error);
    }
  }, [server]);

  const sendCommand = useCallback(async (command: string) => {
    if (!server || !command) return;
    try {
      const response = await fetch(`/api/servers/${server.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
          command,
        }),
      });

      if (response.ok) {
        // Clear command input (handled by parent)
        // Refresh console after short delay
        setTimeout(fetchConsoleLog, 500);
      }
    } catch (error) {
      console.error("Command send error:", error);
    }
  }, [server, fetchConsoleLog]);

  useEffect(() => {
    if (server && server.status === "running") {
      // First, try SSE streaming
      const eventSource = new EventSource(
        `/api/servers/${server.id}/console/stream?lines=100`
      );

      eventSource.onopen = () => {
        setConsoleConnected(true);
        setConsoleError(null);
      };

      eventSource.addEventListener("init", (e: any) => {
        const data = JSON.parse(e.data);
        setConsoleLog(data.log || "");
      });

      eventSource.addEventListener("line", (e: any) => {
        const data = JSON.parse(e.data);
        if (data.full) {
          setConsoleLog(data.full);
        } else if (data.lines) {
          setConsoleLog(prev => {
            const combined = prev + '\n' + data.lines.join('\n');
            // Keep only last 500 lines
            const lines = combined.split('\n');
            return lines.slice(-500).join('\n');
          });
        }
      });

      eventSource.addEventListener("error", (e: any) => {
        const data = JSON.parse(e.data);
        setConsoleError(data.error || "SSE error");
        eventSource.close();
        setConsoleConnected(false);
        // Fallback to polling if SSE fails
        console.log("SSE failed, falling back to polling");
      });

      // Cleanup
      return () => {
        eventSource.close();
        setConsoleConnected(false);
      };
    }
  }, [server?.id, server?.status]);

  const refreshStatus = useCallback(async (srv: typeof server) => {
    if (!srv) return;
    try {
      const response = await fetch(`/api/servers/${srv.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: srv.sshConnection,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status) {
          updateServer(srv.id, { status: data.status });
        }
      }
    } catch (error) {
      console.error("Status refresh error:", error);
    }
  }, [updateServer]);

  const handleStart = useCallback(async () => {
    if (!server) return;
    try {
      const response = await fetch(`/api/servers/${server.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
        }),
      });

      if (response.ok) {
        await refreshStatus(server);
        triggerAlert("serverStart");
      }
    } catch (error) {
      console.error("Start error:", error);
    }
  }, [server, refreshStatus, triggerAlert]);

  const handleStop = useCallback(async () => {
    if (!server) return;
    try {
      const response = await fetch(`/api/servers/${server.id}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
        }),
      });

      if (response.ok) {
        await refreshStatus(server);
        triggerAlert("serverStop");
      }
    } catch (error) {
      console.error("Stop error:", error);
    }
  }, [server, refreshStatus, triggerAlert]);

  const handleRestart = useCallback(async () => {
    if (!server) return;
    try {
      const response = await fetch(`/api/servers/${server.id}/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
        }),
      });

      if (response.ok) {
        await refreshStatus(server);
      }
    } catch (error) {
      console.error("Restart error:", error);
    }
  }, [server, refreshStatus]);

  const handleBackup = useCallback(async () => {
    if (!server) return;
    try {
      await sendCommand("backup");
      triggerAlert("backup");
    } catch (error) {
      console.error("Backup error:", error);
    }
  }, [server, sendCommand, triggerAlert]);

  const handleCheckUpdate = useCallback(async () => {
    if (!server) return;
    setUpdateStatus("checking");
    try {
      const response = await fetch(`/api/servers/${server.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
          command: "check-update",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Parse output to determine if update available
        const hasUpdate = data.output?.includes("Update available") || data.output?.includes("new version");
        if (hasUpdate) {
          setUpdateInfo({
            current: data.output.match(/Current:\s*(.+)/)?.[1] || "unknown",
            latest: data.output.match(/Latest:\s*(.+)/)?.[1] || "unknown",
            output: data.output,
          });
          setUpdateStatus("available");
          setShowUpdateModal(true);
        } else {
          setUpdateStatus("complete");
          alert("No updates available. You are on the latest version.");
          setTimeout(() => setUpdateStatus("idle"), 2000);
        }
      }
    } catch (error) {
      console.error("Check update error:", error);
      setUpdateStatus("idle");
    }
  }, [server, sendCommand]);

  const handleValidate = useCallback(async () => {
    if (!server) return;
    try {
      const response = await fetch(`/api/servers/${server.id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Validation result:\n\n${data.output || "Validation completed"}`);
      } else {
        const err = await response.json();
        alert(`Validation failed: ${err.error}`);
      }
    } catch (error) {
      console.error("Validate error:", error);
      alert("Validation failed due to network error");
    }
  }, [server]);

  const handleCheckPorts = useCallback(async () => {
    if (!server) return;
    setPortCheckLoading(true);
    setShowPortModal(true);
    try {
      const response = await fetch(`/api/servers/${server.id}/check-ports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPortConflicts(data.conflicts || []);
        setUsedPortsList(data.usedPorts || []);
      } else {
        setPortConflicts([]);
        const err = await response.json();
        alert(`Failed to check ports: ${err.error}`);
      }
    } catch (error) {
      console.error("Port check error:", error);
      alert("Network error checking ports");
    } finally {
      setPortCheckLoading(false);
    }
  }, [server]);

  const fetchQueryData = useCallback(async () => {
    if (!server || server.status !== "running") {
      setQueryData(null);
      return;
    }
    setQueryLoading(true);
    try {
      const response = await fetch(`/api/servers/${server.id}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQueryData({
            players: data.players || 0,
            maxPlayers: data.maxPlayers || server.maxPlayers,
            map: data.map || "",
            gamemode: data.gamemode || "",
          });
        }
      }
    } catch (error) {
      console.error("Query error:", error);
    } finally {
      setQueryLoading(false);
    }
  }, [server]);

  useEffect(() => {
    if (server && server.status === "running") {
      fetchQueryData().catch(console.error);
      const interval = setInterval(() => {
        fetchQueryData().catch(console.error);
      }, 10000); // Query every 10 seconds for live data
      return () => clearInterval(interval);
    }
  }, [server?.id, fetchQueryData, server?.status]);

  const handlePerformUpdate = useCallback(async () => {
    if (!server || !updateInfo) return;
    setUpdateStatus("updating");
    setUpdateProgress([]);

    try {
      const response = await fetch(`/api/servers/${server.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
          command: "update",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // The command will run and return output
        // For streaming we'd need a different approach
        setUpdateProgress(prev => [...prev, data.output || "Update completed"]);
        setUpdateStatus("complete");
        triggerAlert("update");
        setTimeout(() => {
          setShowUpdateModal(false);
          setUpdateStatus("idle");
          // Refresh server status
          refreshStatus(server);
        }, 2000);
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error("Update error:", error);
      setUpdateStatus("idle");
      alert("Update failed. Check console for details.");
    }
  }, [server, updateInfo, refreshStatus, sendCommand, triggerAlert]);

  useEffect(() => {
    // Select this server when page loads
    if (serverId) {
      selectServer(serverId);
    }
  }, [serverId, selectServer]);

  useEffect(() => {
    // Initial refresh
    if (server) {
      refreshStatus(server).catch(console.error);
    }
  }, [server?.id, refreshStatus, server]);

  useEffect(() => {
    if (!server) return;
    const interval = setInterval(() => {
      refreshStatus(server).catch(console.error);
    }, 30000);

    return () => clearInterval(interval);
  }, [server, refreshStatus]);

  if (!server) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Server Not Found</h1>
                 <p className="text-muted-foreground mb-4">
                 The server you are looking for does not exist or has been removed.
               </p>
              <Button onClick={() => router.push("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Server not found guard
  if (!server) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Server Not Found</h1>
          <p className="text-gray-600 mb-4">The server you are looking for does not exist.</p>
          <button onClick={() => router.push("/")} className="px-4 py-2 bg-indigo-600 text-white rounded">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          
          <main className="flex-1 overflow-y-auto p-6">
            {/* Server Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/")}
                  className="mt-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold">{server.name}</h1>
                  <p className="text-muted-foreground">
                    {server.gameName} • {server.ip}:{server.port}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {server.status === "running" ? (
                  <>
                    <Button variant="outline" onClick={handleStop}>
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                    <Button variant="outline" onClick={handleRestart}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restart
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleStart}>
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
               )}
              <Button variant="secondary" onClick={handleBackup} disabled={server.status === "installing" || server.status === "updating"}>
                <Download className="w-4 h-4 mr-2" />
                Backup
              </Button>
              <Button variant="ghost" onClick={handleCheckUpdate} disabled={server.status === "installing"}>
                <Search className="w-4 h-4 mr-2" />
                Check Update
              </Button>
               <Button variant="ghost" onClick={handleValidate} disabled={server.status === "installing"}>
                 <CheckCircle className="w-4 h-4 mr-2" />
                 Validate
               </Button>
               <Button variant="ghost" onClick={handleCheckPorts} disabled={portCheckLoading || server.status === "installing"}>
                 <ListFilter className="w-4 h-4 mr-2" />
                 {portCheckLoading ? "Checking..." : "Check Ports"}
               </Button>
             </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">
                  <Activity className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="console">
                  <Terminal className="w-4 h-4 mr-2" />
                  Console
                </TabsTrigger>
                <TabsTrigger value="players">
                  <Users className="w-4 h-4 mr-2" />
                  Players
                </TabsTrigger>
                <TabsTrigger value="config">
                  <Database className="w-4 h-4 mr-2" />
                  Config
                </TabsTrigger>
                <TabsTrigger value="backups">
                  <Archive className="w-4 h-4 mr-2" />
                  Backups
                </TabsTrigger>
                <TabsTrigger value="logs">
                  <FileText className="w-4 h-4 mr-2" />
                  Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">CPU Usage</span>
                    </div>
                    <div className="text-2xl font-bold">{server.cpuUsage}%</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {server.uptime > 0 ? `Uptime: ${Math.floor(server.uptime / 3600000)}h` : "Offline"}
                    </div>
                  </div>
                  
                  <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Memory</span>
                    </div>
                    <div className="text-2xl font-bold">{server.memoryUsage}%</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {server.maxPlayers} max players
                    </div>
                  </div>
                  
                  <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Players</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {queryLoading ? (
                        <span className="text-muted-foreground">...</span>
                      ) : queryData ? (
                        `${queryData.players}/${queryData.maxPlayers}`
                      ) : (
                        `${server.currentPlayers.length}/${server.maxPlayers}`
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {queryLoading ? (
                        <span className="text-muted-foreground">Querying...</span>
                      ) : queryData?.map ? (
                        `${queryData.map}${queryData.gamemode ? ` • ${queryData.gamemode}` : ''}`
                      ) : server.map ? (
                        server.map
                      ) : (
                        "No map"
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Disk</span>
                    </div>
                    <div className="text-2xl font-bold">{server.diskUsage}%</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {server.lgsmVersion || "Unknown version"}
                    </div>
                  </div>
                </div>

                {/* Server Info */}
                <div className="bg-card rounded-lg border p-6">
                  <h2 className="text-lg font-semibold mb-4">Server Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Install Path</div>
                      <div className="font-mono text-sm">{server.installPath}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Config Path</div>
                      <div className="font-mono text-sm">{server.configPath}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div>{new Date(server.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Last Update</div>
                      <div>{server.lastUpdate || "Never"}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="console" className="space-y-4">
                <div className="bg-card rounded-lg border">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold">Console</h2>
                      <div className={`flex items-center gap-1 text-xs ${consoleConnected ? 'text-green-500' : consoleError ? 'text-red-500' : 'text-muted-foreground'}`}>
                        <div className={`w-2 h-2 rounded-full ${consoleConnected ? 'bg-green-500' : consoleError ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        {consoleConnected ? 'Live' : consoleError ? 'Error' : 'Polling...'}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('console-input')?.focus()}>
                      <Terminal className="w-4 h-4 mr-2" />
                      Focus Input
                    </Button>
                  </div>
                  <div className="bg-black text-green-400 font-mono p-4 h-[400px] overflow-y-auto" id="console-output">
                    <pre className="text-sm whitespace-pre-wrap">
                      {consoleLog || "Loading console..."}
                    </pre>
                  </div>
                  <div className="p-4 border-t flex gap-2">
                    <input
                      type="text"
                      id="console-input"
                      className="flex-1 bg-muted border rounded-md px-3 py-2 font-mono text-sm"
                      placeholder="Enter command..."
                      value={consoleCommand}
                      onChange={(e) => setConsoleCommand(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && consoleCommand.trim()) {
                          sendCommand(consoleCommand.trim()).then(() => setConsoleCommand(""));
                        }
                      }}
                    />
                    <Button onClick={() => sendCommand(consoleCommand.trim()).then(() => setConsoleCommand(""))}>
                      Send
                    </Button>
                    <Button variant="outline" onClick={() => setShowLogSettings(true)}>
                      Settings
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="players">
                <div className="bg-card rounded-lg border p-6">
                  <h2 className="text-lg font-semibold mb-4">Current Players</h2>
                  {server.currentPlayers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No players currently online
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Score</th>
                            <th className="text-left p-2">Time</th>
                            <th className="text-left p-2">Ping</th>
                          </tr>
                        </thead>
                        <tbody>
                          {server.currentPlayers.map((player, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-2">{player.name}</td>
                              <td className="p-2">{player.score}</td>
                              <td className="p-2">{player.time}</td>
                              <td className="p-2">{player.ping}ms</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="config" className="space-y-4">
                <div className="bg-card rounded-lg border">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-semibold">Configuration</h2>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={configType === "lgsm" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setConfigType("lgsm")}
                        >
                          LGSM Config
                        </Button>
                        <Button
                          variant={configType === "game" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setConfigType("game")}
                        >
                          Game Config
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {configSaved && (
                        <span className="text-sm text-green-500">
                          Saved successfully
                        </span>
                      )}
                       <Button variant="outline" size="sm" onClick={loadConfig} disabled={configLoading}>
                         {configLoading ? "Loading..." : "Reload"}
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => router.push(`/server/${server.id}/parameters`)}
                       >
                         <Settings className="w-4 h-4 mr-2" />
                         Visual Editor
                       </Button>
                       <Button size="sm" onClick={handleSaveConfig} disabled={configLoading}>
                         Save Changes
                       </Button>
                    </div>
                  </div>
                   <div className="p-4">
                     {configLoading ? (
                       <div className="text-center py-8 text-muted-foreground">
                         Loading configuration...
                       </div>
                     ) : (
                       <div className="border rounded-md">
                         <MonacoEditor
                           height="400px"
                           language="ini"
                           value={configContent}
                           onChange={(value) => setConfigContent(value || '')}
                           options={{
                             minimap: { enabled: false },
                             scrollBeyondLastLine: false,
                             fontSize: 14,
                             fontFamily: 'monospace',
                           }}
                         />
                       </div>
                     )}
                   </div>
                  <div className="p-4 border-t text-sm text-muted-foreground">
                    {configType === "lgsm" ? (
                      <>
                        Editing: <span className="font-mono">{server.name}.cfg</span>
                        <br />
                        Path: <span className="font-mono">{server.configPath}/{server.name}.cfg</span>
                      </>
                    ) : (
                      <>
                        Editing: <span className="font-mono">server.cfg</span>
                        <br />
                        Path: <span className="font-mono">{server.installPath}/serverfiles/{server.name}/cfg/server.cfg</span>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="backups" className="space-y-4">
                <div className="bg-card rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Backups</h2>
                    <Button variant="outline" size="sm" onClick={handleBackup} disabled={server.status === "installing"}>
                      <Download className="w-4 h-4 mr-2" />
                      Create Backup
                    </Button>
                  </div>

                  {backupsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading backups...
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No backups found. Create a backup to get started.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">File</th>
                            <th className="text-left p-2">Size</th>
                            <th className="text-right p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backups.map((backup, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-2">{backup.date}</td>
                              <td className="p-2 font-mono text-sm">{backup.file}</td>
                              <td className="p-2">{backup.size}</td>
                              <td className="p-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRestore(backup.file)}
                                  disabled={restoringId === backup.file}
                                >
                                  {restoringId === backup.file ? (
                                    "Restoring..."
                                  ) : (
                                    <>
                                      <Restart className="w-4 h-4 mr-2" />
                                      Restore
                                    </>
                                  )}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="space-y-4">
                <div className="bg-card rounded-lg border">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-semibold">Logs</h2>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={selectedLogFile === "console" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedLogFile("console")}
                        >
                          Console
                        </Button>
                        <Button
                          variant={selectedLogFile === "current" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedLogFile("current")}
                        >
                          Current
                        </Button>
                        <Button
                          variant={selectedLogFile === "latest" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedLogFile("latest")}
                        >
                          Latest
                        </Button>
                        <Button
                          variant={selectedLogFile === "debug" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedLogFile("debug")}
                        >
                          Debug
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLogs}
                        disabled={logsLoading}
                      >
                        {logsLoading ? "Loading..." : "Refresh"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                      >
                        {autoRefreshLogs ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    {logError ? (
                      <div className="p-4 bg-destructive/10 text-destructive rounded">
                        {logError}
                      </div>
                    ) : (
                      <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-[500px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap">
                          {logContent || (logsLoading ? "Loading logs..." : "No log data")}
                        </pre>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t text-sm text-muted-foreground">
                    Viewing: <span className="font-mono">{selectedLogFile}.log</span>
                    {autoRefreshLogs && <span className="ml-2 text-green-500">• Auto-refresh every 5s</span>}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Update Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {updateStatus === "checking" && "Checking for Updates"}
              {updateStatus === "available" && "Update Available"}
              {updateStatus === "updating" && "Updating..."}
              {updateStatus === "complete" && "Update Complete"}
            </DialogTitle>
            <DialogDescription>
              {updateStatus === "checking" && "Connecting to server..."}
              {updateStatus === "available" && "A new version of LinuxGSM is available."}
              {updateStatus === "updating" && "Installing update, please wait..."}
              {updateStatus === "complete" && "Update finished successfully."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {updateStatus === "available" && updateInfo && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-3 rounded">
                    <div className="text-sm text-muted-foreground">Current Version</div>
                    <div className="text-lg font-mono">{updateInfo.current}</div>
                  </div>
                  <div className="bg-green-500/10 p-3 rounded border border-green-500">
                    <div className="text-sm text-green-600">New Version</div>
                    <div className="text-lg font-mono text-green-600">{updateInfo.latest}</div>
                  </div>
                </div>
                <div className="bg-muted rounded p-3 text-sm">
                  <pre className="whitespace-pre-wrap font-mono">{updateInfo.output}</pre>
                </div>
              </div>
            )}

            {(updateStatus === "checking" || updateStatus === "updating") && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span>{updateStatus === "checking" ? "Checking server for updates..." : "Updating LinuxGSM..."}</span>
                </div>
                {updateProgress.length > 0 && (
                  <div className="bg-black text-green-400 font-mono p-3 rounded text-sm h-48 overflow-y-auto">
                    {updateProgress.map((line, i) => (
                      <div key={i} className="mb-1">{line}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {updateStatus === "complete" && (
              <div className="text-center py-4">
                <p>Update completed successfully!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Server status has been refreshed.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {updateStatus === "available" && (
              <>
                <Button variant="outline" onClick={() => setShowUpdateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePerformUpdate}>
                  <Download className="w-4 h-4 mr-2" />
                  Update Now
                </Button>
              </>
            )}
            {(updateStatus === "complete" || updateStatus === "checking" || updateStatus === "updating") && (
              <Button onClick={() => setShowUpdateModal(false)}>Close</Button>
            )}
           </DialogFooter>
         </DialogContent>
       </Dialog>

      {/* Config Diff Confirmation Modal */}
      <Dialog open={showConfigDiff} onOpenChange={setShowConfigDiff}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Confirm Configuration Changes</DialogTitle>
            <DialogDescription>
              Review the changes below before saving. This will modify {configType === "lgsm" ? server.name : "server.cfg"} on the remote server.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {configDiff.filter(l => l.type !== 'same').length} lines changed
              </span>
              <Button variant="outline" size="sm" onClick={() => setShowConfigDiff(false)}>
                Cancel
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-muted rounded p-3 font-mono text-sm">
              {configDiff.map((line, idx) => (
                <div key={idx} className={cn(
                  "whitespace-pre-wrap",
                  line.type === 'added' && "bg-green-500/20 text-green-400",
                  line.type === 'removed' && "bg-red-500/20 text-red-400",
                  line.type === 'same' && "text-muted-foreground"
                )}>
                  <span className="inline-block w-8 text-xs text-muted-foreground/50">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ''}
                  </span>
                  {line.content || '(empty line)'}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowConfigDiff(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSaveConfig}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Port Check Modal */}
      <Dialog open={showPortModal} onOpenChange={setShowPortModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Port Check</DialogTitle>
            <DialogDescription>
              Checks for port conflicts on the remote host.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {portCheckLoading ? (
              <div className="text-center py-4">Checking ports...</div>
            ) : (
              <div>
                {portConflicts.length === 0 ? (
                  <p className="text-green-500">No conflicts detected.</p>
                ) : (
                  <div>
                    <p className="text-destructive mb-2">Conflicts found on:</p>
                    <ul className="list-disc pl-5">
                      {portConflicts.map(c => (
                        <li key={c.name}>{c.name} port {c.port}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {usedPortsList.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">All listening ports:</p>
                    <div className="text-xs font-mono mt-1 max-h-40 overflow-y-auto">
                      {usedPortsList.sort((a,b) => a - b).map(p => (
                        <span key={p} className="inline-block mr-2">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPortModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
