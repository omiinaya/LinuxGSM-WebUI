"use client";

import { useState, useEffect } from "react";
import { Sidebar, Header } from "@/components/layout";
import { useUIStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Bell, Webhook, Mail, MessageSquare, Save, TestTube, Play, Square, Download, Cpu, RefreshCw, Database } from "lucide-react";

interface AlertConfig {
  enabled: boolean;
  discord: {
    enabled: boolean;
    webhookUrl: string;
  };
  email: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
    to: string;
  };
  events: {
    serverStart: boolean;
    serverStop: boolean;
    serverCrash: boolean;
    updateAvailable: boolean;
    lowDisk: boolean;
    highCpu: boolean;
    backup: boolean;
    update: boolean;
    configChange: boolean;
  };
}

const defaultConfig: AlertConfig = {
  enabled: false,
  discord: {
    enabled: false,
    webhookUrl: "",
  },
  email: {
    enabled: false,
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    from: "",
    to: "",
  },
  events: {
    serverStart: true,
    serverStop: true,
    serverCrash: true,
    updateAvailable: true,
    lowDisk: false,
    highCpu: false,
    backup: true,
    update: true,
    configChange: false,
  },
};

export default function AlertsPage() {
  const [config, setConfig] = useState<AlertConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const { setActiveTab } = useUIStore();

  useEffect(() => {
    // Load from API
    fetch("/api/alerts/config")
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error("Failed to load alert config:", err));
  }, []);

  const saveConfig = async () => {
    try {
      await fetch("/api/alerts/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("Failed to save configuration.");
    }
  };

  const testDiscord = async () => {
    if (!config.discord.webhookUrl) return;
    setTesting(true);
    try {
      await fetch("/api/alerts/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: config.discord.webhookUrl,
          message: "🔔 This is a test notification from LinuxGSM Web UI",
        }),
      });
      alert("Discord test message sent!");
    } catch (error) {
      alert("Failed to send Discord test message");
    } finally {
      setTesting(false);
    }
  };

  const testEmail = async () => {
    if (!config.email.host) return;
    setTesting(true);
    try {
      await fetch("/api/alerts/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config.email,
          subject: "Test Email from LinuxGSM Web UI",
          text: "This is a test email to verify your SMTP settings.",
        }),
      });
      alert("Test email sent!");
    } catch (error) {
      alert("Failed to send test email");
    } finally {
      setTesting(false);
    }
  };

  const updateEvent = (event: keyof AlertConfig["events"], value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      events: { ...prev.events, [event]: value },
    }));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Alert Configuration</h1>
              <p className="text-muted-foreground">
                Configure notifications for server events.
              </p>
            </div>

            <div className="bg-card rounded-lg border p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications when events occur.
                  </p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              <Separator />

               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="space-y-0.5">
                     <Label>Discord Alerts</Label>
                     <p className="text-sm text-muted-foreground">
                       Send notifications to a Discord channel via webhook.
                     </p>
                   </div>
                   <Switch
                     checked={config.discord.enabled}
                     onCheckedChange={(checked) =>
                       setConfig((prev) => ({ ...prev, discord: { ...prev.discord, enabled: checked } }))
                     }
                   />
                 </div>
                 <div className="flex gap-2">
                   <Webhook className="w-5 h-5 text-muted-foreground" />
                   <Input
                     placeholder="https://discord.com/api/webhooks/..."
                     value={config.discord.webhookUrl}
                     onChange={(e) =>
                       setConfig((prev) => ({ ...prev, discord: { ...prev.discord, webhookUrl: e.target.value } }))
                     }
                     className="flex-1"
                   />
                   <Button
                     variant="outline"
                     onClick={testDiscord}
                     disabled={testing || !config.discord.enabled || !config.discord.webhookUrl}
                   >
                     <TestTube className="w-4 h-4 mr-2" />
                     Test
                   </Button>
                 </div>
                 <p className="text-sm text-muted-foreground">
                   Webhook URL from your Discord channel integrations.
                 </p>
               </div>

               <Separator />

               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="space-y-0.5">
                     <Label>Email Alerts</Label>
                     <p className="text-sm text-muted-foreground">
                       Send email notifications via SMTP.
                     </p>
                   </div>
                   <Switch
                     checked={config.email.enabled}
                     onCheckedChange={(checked) =>
                       setConfig((prev) => ({ ...prev, email: { ...prev.email, enabled: checked } }))
                     }
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="smtp-host">SMTP Host</Label>
                     <Input
                       id="smtp-host"
                       placeholder="smtp.gmail.com"
                       value={config.email.host}
                       onChange={(e) =>
                         setConfig((prev) => ({ ...prev, email: { ...prev.email, host: e.target.value } }))
                       }
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="smtp-port">Port</Label>
                     <Input
                       id="smtp-port"
                       type="number"
                       placeholder="587"
                       value={config.email.port || 587}
                       onChange={(e) =>
                         setConfig((prev) => ({ ...prev, email: { ...prev.email, port: parseInt(e.target.value) || 587 } }))
                       }
                     />
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   <Switch
                     id="smtp-secure"
                     checked={config.email.secure}
                     onCheckedChange={(checked) =>
                       setConfig((prev) => ({ ...prev, email: { ...prev.email, secure: checked } }))
                     }
                   />
                   <Label htmlFor="smtp-secure">Use SSL/TLS</Label>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="smtp-user">Username</Label>
                   <Input
                     id="smtp-user"
                     placeholder="user@example.com"
                     value={config.email.user}
                     onChange={(e) =>
                       setConfig((prev) => ({ ...prev, email: { ...prev.email, user: e.target.value } }))
                     }
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="smtp-pass">Password</Label>
                   <Input
                     id="smtp-pass"
                     type="password"
                     placeholder="••••••••"
                     value={config.email.pass}
                     onChange={(e) =>
                       setConfig((prev) => ({ ...prev, email: { ...prev.email, pass: e.target.value } }))
                     }
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="smtp-from">From Email</Label>
                     <Input
                       id="smtp-from"
                       placeholder="alerts@yourserver.com"
                       value={config.email.from}
                       onChange={(e) =>
                         setConfig((prev) => ({ ...prev, email: { ...prev.email, from: e.target.value } }))
                       }
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="smtp-to">To Email</Label>
                     <Input
                       id="smtp-to"
                       placeholder="admin@example.com"
                       value={config.email.to}
                       onChange={(e) =>
                         setConfig((prev) => ({ ...prev, email: { ...prev.email, to: e.target.value } }))
                       }
                     />
                   </div>
                 </div>
                 <Button
                   variant="outline"
                   onClick={testEmail}
                   disabled={testing || !config.email.enabled || !config.email.host || !config.email.to}
                 >
                   <TestTube className="w-4 h-4 mr-2" />
                   Test Email
                 </Button>
                 <p className="text-sm text-muted-foreground">
                   SMTP server for sending email notifications. Ensure the server allows external connections.
                 </p>
               </div>

               <Separator />

               <div className="space-y-4">
                 <Label>Event Types</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-green-500" />
                      <span>Server Started</span>
                    </div>
                    <Switch
                      checked={config.events.serverStart}
                      onCheckedChange={(checked) => updateEvent("serverStart", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Square className="w-4 h-4 text-gray-500" />
                      <span>Server Stopped</span>
                    </div>
                    <Switch
                      checked={config.events.serverStop}
                      onCheckedChange={(checked) => updateEvent("serverStop", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Crash</Badge>
                      <span>Server Crashed</span>
                    </div>
                    <Switch
                      checked={config.events.serverCrash}
                      onCheckedChange={(checked) => updateEvent("serverCrash", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      <span>Update Available</span>
                    </div>
                    <Switch
                      checked={config.events.updateAvailable}
                      onCheckedChange={(checked) => updateEvent("updateAvailable", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>Low Disk Space</span>
                    </div>
                    <Switch
                      checked={config.events.lowDisk}
                      onCheckedChange={(checked) => updateEvent("lowDisk", checked)}
                    />
                  </div>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Cpu className="w-4 h-4" />
                       <span>High CPU Usage</span>
                     </div>
                     <Switch
                       checked={config.events.highCpu}
                       onCheckedChange={(checked) => updateEvent("highCpu", checked)}
                     />
                   </div>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Download className="w-4 h-4" />
                       <span>Backup Created</span>
                     </div>
                     <Switch
                       checked={config.events.backup}
                       onCheckedChange={(checked) => updateEvent("backup", checked)}
                     />
                   </div>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <RefreshCw className="w-4 h-4" />
                       <span>Server Updated</span>
                     </div>
                     <Switch
                       checked={config.events.update}
                       onCheckedChange={(checked) => updateEvent("update", checked)}
                     />
                   </div>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Database className="w-4 h-4" />
                       <span>Configuration Changed</span>
                     </div>
                     <Switch
                       checked={config.events.configChange}
                       onCheckedChange={(checked) => updateEvent("configChange", checked)}
                     />
                   </div>
                 </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div></div>
                <div className="flex items-center gap-2">
                  {saved && (
                    <Badge variant="secondary" className="bg-green-500 text-white">
                      Saved!
                    </Badge>
                  )}
                  <Button onClick={saveConfig}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-2">Supported Channels</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Discord
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email (coming soon)
                </div>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Telegram (coming soon)
                </div>
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4" />
                  Slack (coming soon)
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
