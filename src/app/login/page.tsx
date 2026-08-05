"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Terminal, ShieldCheck, ArrowLeft } from "lucide-react";

type Step = "credentials" | "2fa";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading, refresh } = useAuth();
  const [step, setStep] = useState<Step>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 2FA state
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Redirect if already logged in
  if (!loading && user) {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.requires2FA) {
        // 2FA required — switch to the verification step.
        setPendingToken(data.pendingToken);
        setStep("2fa");
        return;
      }
      if (res.ok && data.user) {
        router.push("/");
        return;
      }
      setError(data.error || "Invalid username or password");
    } catch (err) {
      setError("Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pendingToken || code.length !== 6) {
      setError("Please enter the 6-digit code from your authenticator app");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pendingToken, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid verification code");
        return;
      }
      // Session established — refresh auth state and go to the dashboard.
      await refresh();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const backToCredentials = () => {
    setStep("credentials");
    setCode("");
    setError(null);
    setPendingToken(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            {step === "2fa" ? (
              <ShieldCheck className="w-8 h-8 text-primary" />
            ) : (
              <Terminal className="w-8 h-8 text-primary" />
            )}
            <CardTitle>LinuxGSM Web UI</CardTitle>
          </div>
          <CardDescription>
            {step === "2fa"
              ? "Two-factor authentication required. Enter the code from your authenticator app."
              : "Enter your credentials to access the dashboard."}
          </CardDescription>
        </CardHeader>

        {step === "credentials" ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !username || !password}
              >
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  maxLength={6}
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                  (Google Authenticator, Authy, etc.).
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={verifying || code.length !== 6}
              >
                {verifying ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={backToCredentials}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to credentials
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}