"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, Header } from "@/components/layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  // Password change states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 2FA states
  const [showSetup, setShowSetup] = useState(false);
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [enableError, setEnableError] = useState<string | null>(null);
  const [enableLoading, setEnableLoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);

  // Fetch new secret for setup
  const fetchSecret = async () => {
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate secret");
      const data = await res.json();
      setSecret(data.secret);
      setShowSetup(true);
      setEnableError(null);
      setVerificationCode("");
    } catch (err: any) {
      setEnableError(err.message);
    }
  };

  // Enable 2FA
  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnableError(null);
    if (!verificationCode || verificationCode.length !== 6) {
      setEnableError("Please enter a valid 6-digit code");
      return;
    }
    setEnableLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ secret, code: verificationCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to enable 2FA");
      }
      // Refresh user to get updated totpEnabled
      await refresh();
      setShowSetup(false);
      setSecret("");
      setVerificationCode("");
    } catch (err: any) {
      setEnableError(err.message);
    } finally {
      setEnableLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisableError(null);
    if (!disablePassword) {
      setDisableError("Password required");
      return;
    }
    setDisableLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to disable 2FA");
      }
      await refresh();
      setShowDisableConfirm(false);
      setDisablePassword("");
    } catch (err: any) {
      setDisableError(err.message);
    } finally {
      setDisableLoading(false);
    }
  };

  // Password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      setSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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

  const is2FAEnabled = user.totpEnabled === true;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Profile</h1>
                <p className="text-muted-foreground">
                  {user.username} • {user.role}
                </p>
              </div>
            </div>

            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password. This will sign you out of all other sessions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-3 bg-green-500/15 text-green-500 rounded-md text-sm">
                      Password changed successfully
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">Current Password</Label>
                    <Input
                      id="oldPassword"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {is2FAEnabled ? (
                  <div>
                    <p className="text-sm text-green-600 font-medium mb-2">
                      Two-factor authentication is enabled.
                    </p>
                    {!showDisableConfirm ? (
                      <Button variant="destructive" onClick={() => setShowDisableConfirm(true)}>
                        Disable 2FA
                      </Button>
                    ) : (
                      <form onSubmit={handleDisable2FA} className="space-y-4 max-w-sm">
                        <div className="space-y-2">
                          <Label htmlFor="disablePassword">Confirm Password</Label>
                          <Input
                            id="disablePassword"
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            required
                          />
                        </div>
                        {disableError && (
                          <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                            {disableError}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button type="submit" variant="destructive" disabled={disableLoading}>
                            {disableLoading ? "Disabling..." : "Confirm Disable"}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setShowDisableConfirm(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Two-factor authentication is not enabled. Use an authenticator app to generate verification codes.
                    </p>
                    {!showSetup ? (
                      <Button onClick={fetchSecret}>Enable 2FA</Button>
                    ) : (
                      <form onSubmit={handleEnable2FA} className="space-y-4 max-w-sm">
                        <div className="space-y-2">
                          <Label>Secret</Label>
                          <code className="block p-3 bg-muted rounded text-sm font-mono break-all">
                            {secret}
                          </code>
                          <p className="text-xs text-muted-foreground">
                            Add this secret to your authenticator app (Google Authenticator, Authy, etc.)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="verificationCode">Verification Code</Label>
                          <Input
                            id="verificationCode"
                            type="text"
                            placeholder="123456"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            required
                            maxLength={6}
                          />
                        </div>
                        {enableError && (
                          <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                            {enableError}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button type="submit" disabled={enableLoading}>
                            {enableLoading ? "Verifying..." : "Verify and Enable"}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setShowSetup(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
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
