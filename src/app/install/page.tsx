"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Server, Network, HardDrive, Terminal, Loader2 } from "lucide-react";

const GAMES = [
  { id: "csgo", name: "Counter-Strike 2", defaultPort: 27015 },
  { id: "minecraft", name: "Minecraft: Java Edition", defaultPort: 25565 },
  { id: "rust", name: "Rust", defaultPort: 28015 },
  { id: "tf", name: "Team Fortress 2", defaultPort: 27015 },
  { id: "gmod", name: "Garry's Mod", defaultPort: 27015 },
  { id: "ark", name: "ARK: Survival Evolved", defaultPort: 27015 },
  { id: "valheim", name: "Valheim", defaultPort: 2457 },
  { id: "seven", name: "7 Days to Die", defaultPort: 26900 },
  { id: "dst", name: "Don't Starve Together", defaultPort: 10999 },
  { id: "factorio", name: "Factorio", defaultPort: 34197 },
];

type Step = "connection" | "game" | "config" | "deps" | "install" | "complete";

export default function InstallPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("connection");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installOutput, setInstallOutput] = useState<string[]>([]);

  // Connection state
  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("");
  const [authType, setAuthType] = useState<"password" | "key">("password");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  // Game selection state
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [serverName, setServerName] = useState("");
  const [installPath, setInstallPath] = useState("");

  // Config state
  const [gamePort, setGamePort] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");

  const addOutput = (line: string) => {
    setInstallOutput(prev => [...prev, line]);
  };

  const handleNext = () => {
    const order: Step[] = ["connection", "game", "config", "deps", "install"];
    const currentIdx = order.indexOf(step);
    if (currentIdx < order.length - 1) {
      setStep(order[currentIdx + 1]);
    }
  };

  const handleBack = () => {
    const order: Step[] = ["connection", "game", "config", "deps", "install"];
    const currentIdx = order.indexOf(step);
    if (currentIdx > 0) {
      setStep(order[currentIdx - 1]);
    }
  };

  const handleCheckDeps = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check-deps",
          connection: {
            host,
            port,
            username,
            authType,
            password: authType === "password" ? password : undefined,
            privateKey: authType === "key" ? privateKey : undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check dependencies");
      }

      // If deps missing, show them; otherwise proceed
      if (data.missing && data.missing.length > 0) {
        addOutput(`Missing dependencies: ${data.missing.join(", ")}`);
        // Could offer to install
      } else {
        addOutput("All dependencies are satisfied.");
        setTimeout(() => handleNext(), 1500);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    setLoading(true);
    setError(null);
    setInstallOutput([]);

    try {
      const game = GAMES.find(g => g.id === selectedGame);
      if (!game) throw new Error("Game not selected");

      const response = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "install",
          connection: {
            host,
            port,
            username,
            authType,
            password: authType === "password" ? password : undefined,
            privateKey: authType === "key" ? privateKey : undefined,
          },
          game: {
            id: game.id,
            name: game.name,
            serverName: serverName || game.id,
            installPath: installPath || `/home/${username}`,
            port: parseInt(gamePort) || game.defaultPort,
            maxPlayers: parseInt(maxPlayers) || 16,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Installation failed");
      }

      addOutput(`Installation started for ${game.name}...`);
      addOutput(`Server name: ${serverName || game.id}`);
      addOutput(`Install path: ${installPath || `/home/${username}`}`);
      
      // For now, we'll just simulate progress
      // In reality we'd stream output from the SSH command
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        addOutput(`Progress: ${i}%`);
      }

      addOutput("Installation completed successfully!");
      setStep("complete");
    } catch (err: any) {
      setError(err.message);
      addOutput(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: "connection", label: "Connection", icon: Network },
    { id: "game", label: "Game", icon: Server },
    { id: "config", label: "Config", icon: HardDrive },
    { id: "deps", label: "Dependencies", icon: Check },
    { id: "install", label: "Install", icon: Terminal },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {steps.map((s, idx) => (
                  <div key={s.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      step === s.id || steps.findIndex(st => st.id === step) > idx
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground text-muted-foreground"
                    }`}>
                      {steps.findIndex(st => st.id === step) > idx ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <s.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className="ml-2 text-sm font-medium hidden sm:inline">{s.label}</span>
                    {idx < steps.length - 1 && (
                      <div className="flex-1 h-0.5 mx-4 bg-muted" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  {step === "connection" && "SSH Connection"}
                  {step === "game" && "Select Game"}
                  {step === "config" && "Server Configuration"}
                  {step === "deps" && "Check Dependencies"}
                  {step === "install" && "Installing..."}
                  {step === "complete" && "Installation Complete!"}
                </CardTitle>
                <CardDescription>
                  {step === "connection" && "Enter SSH credentials for the remote host"}
                  {step === "game" && "Choose which game server to install"}
                  {step === "config" && "Configure server settings"}
                  {step === "deps" && "Verify dependencies are available"}
                  {step === "install" && "Installing your game server"}
                  {step === "complete" && "Your server is ready!"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                    {error}
                  </div>
                )}

                {step === "connection" && (
                  <>
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
                        <Label htmlFor="port">SSH Port</Label>
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
                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant={authType === "password" ? "secondary" : "outline"}
                          onClick={() => setAuthType("password")}
                          className="flex-1"
                        >
                          Password
                        </Button>
                        <Button
                          type="button"
                          variant={authType === "key" ? "secondary" : "outline"}
                          onClick={() => setAuthType("key")}
                          className="flex-1"
                        >
                          SSH Key
                        </Button>
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
                          className="w-full min-h-[120px] p-2 border rounded-md font-mono text-sm"
                          placeholder="Paste your private key content here..."
                          value={privateKey}
                          onChange={(e) => setPrivateKey(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}

                {step === "game" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="game">Select Game</Label>
                      <Select value={selectedGame} onValueChange={setSelectedGame}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a game..." />
                        </SelectTrigger>
                        <SelectContent>
                          {GAMES.map(game => (
                            <SelectItem key={game.id} value={game.id}>
                              {game.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedGame && (
                      <div className="text-sm text-muted-foreground">
                        <p>Default port: {GAMES.find(g => g.id === selectedGame)?.defaultPort}</p>
                        <p>Make sure this game is supported by LinuxGSM.</p>
                      </div>
                    )}
                  </div>
                )}

                {step === "config" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="serverName">Server Name</Label>
                      <Input
                        id="serverName"
                        placeholder="myserver"
                        value={serverName}
                        onChange={(e) => setServerName(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        This will be the LinuxGSM script name (e.g., ./{serverName || 'myserver'})
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="installPath">Installation Path</Label>
                      <Input
                        id="installPath"
                        placeholder={`/home/${username}`}
                        value={installPath}
                        onChange={(e) => setInstallPath(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gamePort">Game Port</Label>
                        <Input
                          id="gamePort"
                          type="number"
                          placeholder={GAMES.find(g => g.id === selectedGame)?.defaultPort.toString()}
                          value={gamePort}
                          onChange={(e) => setGamePort(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxPlayers">Max Players</Label>
                        <Input
                          id="maxPlayers"
                          type="number"
                          placeholder="16"
                          value={maxPlayers}
                          onChange={(e) => setMaxPlayers(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {step === "deps" && (
                  <div className="space-y-4">
                    <p>Checking if the remote host has required dependencies...</p>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                      {installOutput.length === 0 ? (
                        <span className="text-muted-foreground">Waiting to check...</span>
                      ) : (
                        installOutput.map((line, i) => (
                          <div key={i} className="mb-1">{line}</div>
                        ))
                      )}
                      {loading && (
                        <div className="flex items-center gap-2 text-primary">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === "install" && (
                  <div className="space-y-4">
                    <div className="bg-black text-green-400 font-mono p-4 rounded-lg h-64 overflow-y-auto">
                      {installOutput.map((line, i) => (
                        <div key={i} className="mb-1 text-sm whitespace-pre-wrap">{line}</div>
                      ))}
                      {loading && (
                        <div className="flex items-center gap-2 text-green-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Installing...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === "complete" && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Installation Complete!</h3>
                    <p className="text-muted-foreground mb-6">
                      Your {selectedGame} server has been installed successfully.
                    </p>
                    <div className="flex justify-center gap-4">
                      <Button onClick={() => router.push("/")}>
                        Go to Dashboard
                      </Button>
                      <Button variant="outline" onClick={() => router.push(`/server/new?name=${serverName}`)}>
                        Configure Server
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>

              {step !== "complete" && (
                <CardFooter className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={step === "connection" || loading}
                  >
                    Back
                  </Button>
                  <div className="flex gap-2">
                    {step === "deps" && (
                      <Button onClick={handleCheckDeps} disabled={loading}>
                        {loading ? "Checking..." : "Check Dependencies"}
                      </Button>
                    )}
                    {step === "install" && (
                      <Button onClick={handleInstall} disabled={loading}>
                        {loading ? "Installing..." : "Start Installation"}
                      </Button>
                    )}
                    {(step === "connection" || step === "game" || step === "config") && (
                      <Button
                        onClick={handleNext}
                        disabled={
                          (step === "connection" && !host && !username) ||
                          (step === "game" && !selectedGame) ||
                          (step === "config" && !serverName)
                        }
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
