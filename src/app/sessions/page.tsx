"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, Header } from "@/components/layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2 } from "lucide-react";

interface Session {
  token: string;
  userId: string;
  username: string;
  userRole: string;
  expiresAt: string;
  isCurrent: boolean;
}

export default function SessionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions", { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const data = await res.json();
      setSessions(data.sessions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (token: string) => {
    if (!confirm("Revoke this session? The user will be logged out.")) return;

    try {
      const res = await fetch(`/api/sessions/${token}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to revoke session");
      }

      // Remove from list
      setSessions(sessions.filter(s => s.token !== token));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchSessions();
    }
  }, [user, authLoading]);

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

  // Only admin can view sessions (or we could allow users to see their own, but for now restrict to admin)
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only administrators can view sessions.</p>
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
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold">Active Sessions</h1>
                  <p className="text-muted-foreground">
                    Manage user sessions and revoke access
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Current Sessions</CardTitle>
                <CardDescription>
                  Review active sessions across the system
                </CardDescription>
              </CardHeader>

              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading sessions...
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-destructive">
                    {error}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active sessions
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div
                        key={session.token}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{session.username}</span>
                            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                              {session.userRole}
                            </span>
                            {session.isCurrent && (
                              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Expires: {new Date(session.expiresAt).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            Token: {session.token.slice(0, 8)}...
                          </div>
                        </div>
                        {!session.isCurrent && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => revokeSession(session.token)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Revoke
                          </Button>
                        )}
                        {session.isCurrent && (
                          <span className="text-sm text-muted-foreground italic">
                            This session
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
