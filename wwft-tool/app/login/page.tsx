"use client";

/**
 * Login page — two-step: (1) email + password, (2) TOTP if 2FA enabled.
 */

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("callbackUrl") ?? "/";
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/pre-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.valid) {
        setError("Ongeldig e-mailadres of wachtwoord");
        return;
      }

      if (data.requires2fa) {
        setStep("totp");
      } else {
        await finalizeLogin("");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await finalizeLogin(totpCode);
    setLoading(false);
  }

  async function finalizeLogin(code: string) {
    const result = await signIn("credentials", {
      email,
      password,
      totpCode: code,
      redirect: false,
      callbackUrl,
    });
    if (result?.ok) {
      router.push(callbackUrl);
    } else {
      setError(step === "totp" ? "Ongeldige 2FA-code" : "Inloggen mislukt");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center mb-3">
            {step === "totp" ? (
              <KeyRound className="h-6 w-6 text-white" />
            ) : (
              <Shield className="h-6 w-6 text-white" />
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">Wwft Compliance Tool</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === "totp" ? "Voer uw 2FA-code in" : "Inloggen bij uw kantoor"}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          {step === "credentials" ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@kantoor.nl"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Controleren…" : "Volgende"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTotp} className="space-y-4">
              <p className="text-sm text-gray-600">
                Open uw authenticator-app en voer de 6-cijferige code in voor <strong>{email}</strong>.
              </p>
              <div className="space-y-1">
                <Label htmlFor="totp">Authenticatiecode</Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setStep("credentials"); setError(""); }} className="flex-1">
                  Terug
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || totpCode.length !== 6}>
                  {loading ? "Verifiëren…" : "Inloggen"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
