"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, Header } from "@/components/layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download } from "lucide-react";

interface Game {
  id: string;
  name: string;
  description: string;
  defaultPort: number;
  steamAppId?: number;
}

export default function CataloguePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [installDir, setInstallDir] = useState("/home/games");
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installStatus, setInstallStatus] = useState<{ game: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/local/games", { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch games");
      const data = await res.json();
      setGames(data.games);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const installGame = async (gameId: string, gameName: string) => {
    if (!confirm(`Install ${gameName} to ${installDir}? This may take a while.`)) return;

    setInstallingId(gameId);
    setInstallStatus(null);
    try {
      const res = await fetch("/api/local/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gameId, installDir }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Installation failed");
      }

      setInstallStatus({ game: gameName, success: true, message: data.message });
    } catch (err: any) {
      setInstallStatus({ game: gameName, success: false, message: err.message });
    } finally {
      setInstallingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only administrators can access the game catalogue.</p>
          <Button onClick={() => router.push("/")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold">Game Catalogue</h1>
                  <p className="text-muted-foreground">
                    Deploy new game servers directly
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="installDir">Install Directory:</Label>
                  <Input
                    id="installDir"
                    value={installDir}
                    onChange={(e) => setInstallDir(e.target.value)}
                    className="w-60"
                  />
                </div>
              </div>
            </div>

            {installStatus && (
              <div className={`p-4 rounded-md ${installStatus.success ? "bg-green-500/15 text-green-500" : "bg-destructive/15 text-destructive"}`}>
                {installStatus.success
                  ? `Successfully installed ${installStatus.game}.`
                  : `Failed to install ${installStatus.game}: ${installStatus.message}`
                }
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map(game => (
                <Card key={game.id}>
                  <CardHeader>
                    <CardTitle>{game.name}</CardTitle>
                    <CardDescription>{game.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Default Port:</strong> {game.defaultPort}</p>
                      {game.steamAppId && <p><strong>Steam App ID:</strong> {game.steamAppId}</p>}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => installGame(game.id, game.name)}
                      disabled={installingId === game.id}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {installingId === game.id ? "Installing..." : "Install"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
