"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, Header } from "@/components/layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Filter } from "lucide-react";

interface AuditEntry {
  id: string;
  timestamp: string;
  userId?: string;
  username?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
}

const actionColors: Record<string, string> = {
  login: "bg-green-100 text-green-800",
  logout: "bg-gray-100 text-gray-800",
  password_change: "bg-blue-100 text-blue-800",
  session_revoke: "bg-orange-100 text-orange-800",
  login_failed: "bg-red-100 text-red-800",
  start: "bg-green-100 text-green-800",
  stop: "bg-red-100 text-red-800",
  restart: "bg-yellow-100 text-yellow-800",
  backup: "bg-purple-100 text-purple-800",
  restore: "bg-indigo-100 text-indigo-800",
  config_save: "bg-cyan-100 text-cyan-800",
  user_create: "bg-green-100 text-green-800",
  user_delete: "bg-red-100 text-red-800",
  user_role_change: "bg-blue-100 text-blue-800",
  default: "bg-gray-100 text-gray-800",
};

export default function AuditPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: "",
    username: "",
  });

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append("action", filters.action);
      if (filters.username) params.append("username", filters.username);

      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        credentials: "include",
      });

      if (res.status === 403 || res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      const data = await res.json();
      setLogs(data.logs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchLogs();
    }
  }, [user, authLoading]);

  const getActionColor = (action: string) => {
    return actionColors[action] || actionColors.default;
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
          <p className="text-gray-600 mb-4">Only administrators can view audit logs.</p>
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
                  <h1 className="text-3xl font-bold">Audit Log</h1>
                  <p className="text-muted-foreground">
                    System activity and security events
                  </p>
                </div>
              </div>
              <Button onClick={fetchLogs} variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  Recent actions across the system. Admin actions are logged.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading audit logs...
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-destructive">
                    {error}
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No audit logs found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Timestamp</th>
                          <th className="text-left p-2">User</th>
                          <th className="text-left p-2">Action</th>
                          <th className="text-left p-2">Resource</th>
                          <th className="text-left p-2">Details</th>
                          <th className="text-left p-2">IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b">
                            <td className="p-2 text-sm whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-2 text-sm">
                              {log.username || log.userId || "system"}
                            </td>
                            <td className="p-2">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-2 text-sm">
                              {log.resource || (log.resourceId ? `ID: ${log.resourceId}` : "-")}
                            </td>
                            <td className="p-2 text-sm">
                              {log.details && Object.keys(log.details).length > 0 ? (
                                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-w-xs">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="p-2 text-sm font-mono text-muted-foreground">
                              {log.ip || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
