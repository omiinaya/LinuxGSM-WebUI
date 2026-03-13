"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar, Header } from "@/components/layout";
import { useServersStore } from "@/stores";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";

interface ParamEntry {
  key: string;
  value: string;
  lineIndex: number;
  rawLine: string;
}

export default function ParametersPage() {
  const params = useParams();
  const router = useRouter();
  const { getServer } = useServersStore();
  const { user, loading: authLoading } = useAuth();
  const serverId = params?.id as string | undefined;
  const server = serverId ? getServer(serverId) : undefined;

  // State hooks
  const [paramsList, setParamsList] = useState<ParamEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load params from server
  const loadParams = useCallback(async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/servers/${server.id}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get",
          connection: server.sshConnection,
          server,
          configType: "lgsm",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load config");
      }

      const data = await response.json();
      const configText = data.config || "";

      // Parse key="value" lines
      const lines = configText.split('\n');
      const entries: ParamEntry[] = [];

      const regex = /^(\w+)\s*=\s*"([^"]*)"/;

      lines.forEach((line: string, index: number) => {
        const match = line.match(regex);
        if (match) {
          entries.push({
            key: match[1],
            value: match[2],
            lineIndex: index,
            rawLine: line,
          });
        }
      });

      setParamsList(entries);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [server]);

  // Load params when server changes
  useEffect(() => {
    if (server) {
      loadParams();
    }
  }, [server, loadParams]);

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

  // Auth check - after all hooks
  if (authLoading || !user || user.role === "viewer") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading or unauthorized...</div>
      </div>
    );
  }

  // Helper functions
  const handleValueChange = (key: string, newValue: string) => {
    setParamsList(prev => prev.map(p => p.key === key ? { ...p, value: newValue } : p));
  };

  const handleSave = async () => {
    if (!server) return;
    setSaving(true);
    try {
      // Reconstruct config: we need original full config to preserve other lines
      const response = await fetch(`/api/servers/${server.id}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get",
          connection: server.sshConnection,
          server,
          configType: "lgsm",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch original config");
      }

      const data = await response.json();
      const lines = (data.config || "").split('\n');

      // Update lines with new values
      paramsList.forEach(param => {
        lines[param.lineIndex] = `${param.key}="${param.value}"`;
      });

      const newConfig = lines.join('\n');

      // Save
      const saveResponse = await fetch(`/api/servers/${server.id}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          connection: server.sshConnection,
          server,
          config: newConfig,
          configType: "lgsm",
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save config");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

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
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Parameters</h1>
                <p className="text-muted-foreground">
                  {server.name} • {server.gameName}
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>LGSM Parameters</CardTitle>
                <CardDescription>
                  Edit start parameters for this server. Changes are saved directly to the LGSM config.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {error && (
                  <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm mb-4">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading parameters...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paramsList.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No editable parameters found in config.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paramsList.map(param => (
                          <div key={param.key} className="space-y-2">
                            <Label htmlFor={param.key}>{param.key}</Label>
                            <Input
                              id={param.key}
                              value={param.value}
                              onChange={(e) => handleValueChange(param.key, e.target.value)}
                              placeholder={`Enter ${param.key}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-between">
                {saved && (
                  <span className="text-sm text-green-500">Saved successfully</span>
                )}
                <Button onClick={handleSave} disabled={saving || loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Parameters"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
