"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar, Header } from "@/components/layout";
import { useServersStore } from "@/stores";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Check, Terminal, AlertCircle } from "lucide-react";

type Frequency = "5min" | "10min" | "15min" | "30min" | "hourly" | "daily" | "weekly";

const CRON_SCHEDULES: Record<Frequency, { cron: string; description: string }> = {
  "5min": { cron: "*/5 * * * *", description: "Every 5 minutes" },
  "10min": { cron: "*/10 * * * *", description: "Every 10 minutes" },
  "15min": { cron: "*/15 * * * *", description: "Every 15 minutes" },
  "30min": { cron: "*/30 * * * *", description: "Every 30 minutes" },
  "hourly": { cron: "0 * * * *", description: "At the start of every hour" },
  "daily": { cron: "0 0 * * *", description: "Once a day at midnight" },
  "weekly": { cron: "0 0 * * 0", description: "Once a week at midnight on Sunday" },
};

export default function MonitorPage() {
  // Base hooks
  const params = useParams();
  const router = useRouter();
  const { getServer } = useServersStore();
  const { user, loading: authLoading } = useAuth();
  const serverId = params?.id as string | undefined;
  const server = serverId ? getServer(serverId) : undefined;

  // State hooks
  const [frequency, setFrequency] = useState<Frequency>("5min");
  const [username, setUsername] = useState("");
  const [useSudo, setUseSudo] = useState(false);
  const [cronCommand, setCronCommand] = useState("");
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Generate cron command whenever settings change
  useEffect(() => {
    if (!server) return;
    const schedule = CRON_SCHEDULES[frequency];
    const scriptPath = `${server.installPath}/${server.name}`;
    const cronLine = `${schedule.cron} ${useSudo ? `su - ${username} -c` : ""} "${scriptPath} monitor" > /dev/null 2>&1`;
    setCronCommand(cronLine);
  }, [frequency, username, useSudo, server]);

  // Functions
  const handleCopy = async () => {
    await navigator.clipboard.writeText(cronCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddCron = async () => {
    if (!server) return;
    setAdding(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/servers/${server.id}/cron`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: server.sshConnection,
          server,
          cronLine: cronCommand,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Cron job added to crontab!" });
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to add cron job" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setAdding(false);
    }
  };

  // Auth guard effect
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role === "viewer") {
      router.push(`/server/${serverId}`);
    }
  }, [user, authLoading, router, serverId]);

  // Auth check
  if (authLoading || !user || user.role === "viewer") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading or unauthorized...</div>
      </div>
    );
  }

  // Server not found guard
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

  // Main content
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Monitor Setup</h1>
                <p className="text-muted-foreground">
                  {server.name} • Configure automated monitoring
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cron Job Configuration</CardTitle>
                <CardDescription>
                  Configure automatic monitoring using the <code>monitor</code> command. This will check server health and restart if needed.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Check Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CRON_SCHEDULES).map(([key, schedule]) => (
                        <SelectItem key={key} value={key}>
                          {schedule.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">SSH Username</Label>
                  <Input
                    id="username"
                    placeholder={server.local ? "Current user" : ((server.sshConnection as any)?.username || "")}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    The user that runs the game server. Usually matches the SSH user.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="useSudo"
                    checked={useSudo}
                    onCheckedChange={setUseSudo}
                  />
                  <Label htmlFor="useSudo">Use sudo (run as root)</Label>
                </div>

                <div className="space-y-2">
                  <Label>Cron Command</Label>
                  <p className="text-sm text-muted-foreground">
                    Add this line to the crontab of the user that will run the monitor.
                  </p>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={cronCommand}
                      className="w-full h-24 p-3 pr-12 font-mono text-sm border rounded-md bg-muted/50"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {message && (
                  <div className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-500/15 text-green-500" : "bg-destructive/15 text-destructive"}`}>
                    {message.text}
                  </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-500">Important</p>
                      <p className="text-muted-foreground mt-1">
                        The monitor command will automatically restart the server if it crashes or becomes unresponsive. Make sure to configure alert notifications to be notified of restarts.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button onClick={handleAddCron} disabled={adding || !username}>
                  <Terminal className="w-4 h-4 mr-2" />
                  {adding ? "Adding..." : "Add to Crontab via SSH"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
