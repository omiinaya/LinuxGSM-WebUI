"use client";

import { useState } from "react";
import { useServersStore } from "@/stores";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Server, Scan, Plus } from "lucide-react";

interface SSHConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SSHConnectionModal({ open, onOpenChange }: SSHConnectionModalProps) {
  const { addServer } = useServersStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Connection form state
  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("");
  const [authType, setAuthType] = useState<"password" | "key">("password");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [basePath, setBasePath] = useState("/home");
  
  // Server form state (manual add)
  const [serverName, setServerName] = useState("");
  const [game, setGame] = useState("");
  const [gameName, setGameName] = useState("");
  const [installPath, setInstallPath] = useState("");
  
  const handleDiscover = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "discover",
          connection: {
            host,
            port: parseInt(port.toString()),
            username,
            authType,
            password: authType === "password" ? password : undefined,
            privateKey: authType === "key" ? privateKey : undefined,
          },
          basePath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Discovery failed");
      }

      // Add discovered servers to store
      data.servers.forEach((server: any) => {
        addServer(server);
      });

      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          connection: {
            host,
            port: parseInt(port.toString()),
            username,
            authType,
            password: authType === "password" ? password : undefined,
            privateKey: authType === "key" ? privateKey : undefined,
            serverName,
            game,
            gameName,
            installPath,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add server");
      }

      addServer(data.server);
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setHost("");
    setPort(22);
    setUsername("");
    setAuthType("password");
    setPassword("");
    setPrivateKey("");
    setBasePath("/home");
    setServerName("");
    setGame("");
    setGameName("");
    setInstallPath("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add Server Connection</DialogTitle>
          <DialogDescription>
            Connect to a remote host to manage LinuxGSM servers
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discover">
              <Scan className="w-4 h-4 mr-2" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Plus className="w-4 h-4 mr-2" />
              Manual Add
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  placeholder="192.168.1.100"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Authentication</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="password"
                    checked={authType === "password"}
                    onChange={() => setAuthType("password")}
                  />
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="key"
                    checked={authType === "key"}
                    onChange={() => setAuthType("key")}
                  />
                  <Label htmlFor="key">SSH Key</Label>
                </div>
              </div>
            </div>

            {authType === "password" ? (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="privateKey">Private Key</Label>
                <textarea
                  id="privateKey"
                  className="w-full min-h-[100px] p-2 border rounded-md"
                  placeholder="Paste your private key content here"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="basePath">Base Path for Discovery</Label>
              <Input
                id="basePath"
                value={basePath}
                onChange={(e) => setBasePath(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Path to search for LinuxGSM servers (default: /home)
              </p>
            </div>

            {error && (
              <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleDiscover} disabled={loading || !host || !username}>
                {loading ? "Scanning..." : "Scan for Servers"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  placeholder="192.168.1.100"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Authentication</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="password-manual"
                    checked={authType === "password"}
                    onChange={() => setAuthType("password")}
                  />
                  <Label htmlFor="password-manual">Password</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="key-manual"
                    checked={authType === "key"}
                    onChange={() => setAuthType("key")}
                  />
                  <Label htmlFor="key-manual">SSH Key</Label>
                </div>
              </div>
            </div>

            {authType === "password" ? (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="privateKey">Private Key</Label>
                <textarea
                  id="privateKey"
                  className="w-full min-h-[100px] p-2 border rounded-md"
                  placeholder="Paste your private key content here"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="serverName">Server Name (LGSM script name)</Label>
              <Input
                id="serverName"
                placeholder="myserver"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="game">Game ID</Label>
                <Input
                  id="game"
                  placeholder="csgo, minecraft, rust"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameName">Game Name</Label>
                <Input
                  id="gameName"
                  placeholder="Counter-Strike 2"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installPath">Install Path</Label>
              <Input
                id="installPath"
                placeholder="/home/myserver"
                value={installPath}
                onChange={(e) => setInstallPath(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleManualAdd} disabled={loading || !host || !username || !serverName}>
                {loading ? "Adding..." : "Add Server"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
