"use client";

/**
 * TwoFactorSetup — TOTP 2FA enable/disable UI on the profile page.
 * Uses /api/auth/2fa for setup, confirmation and disabling.
 */

import { useState, useEffect, useRef } from "react";
import { Shield, ShieldCheck, ShieldOff, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface TwoFactorSetupProps {
  totpEnabled: boolean;
}

export function TwoFactorSetup({ totpEnabled: initialEnabled }: TwoFactorSetupProps) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<"idle" | "setup" | "disable">("idle");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!uri || !canvasRef.current) return;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, uri, { width: 180, margin: 1 });
    });
  }, [uri]);

  async function startSetup() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa");
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setSecret(data.secret);
      setUri(data.uri);
      setStep("setup");
      setToken("");
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, secret }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEnabled(true);
      setStep("idle");
      toast({ title: "2FA ingeschakeld", description: "Uw account is beveiligd met authenticator-app" });
    } catch (err: unknown) {
      toast({ title: "Verificatie mislukt", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function disable2fa(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEnabled(false);
      setStep("idle");
      toast({ title: "2FA uitgeschakeld" });
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <Shield className="h-5 w-5 text-gray-400" />
          )}
          <h2 className="text-sm font-semibold text-gray-700">Twee-factor authenticatie (2FA)</h2>
        </div>
        <Badge variant={enabled ? "success" : "secondary"}>
          {enabled ? "Ingeschakeld" : "Uitgeschakeld"}
        </Badge>
      </div>

      <p className="text-xs text-gray-500">
        Beveilig uw account met een authenticator-app (Google Authenticator, Microsoft Authenticator, Authy, etc.).
        Bij elke inlog is naast uw wachtwoord ook een tijdelijke 6-cijferige code vereist.
      </p>

      {step === "idle" && (
        <div>
          {!enabled ? (
            <Button onClick={startSetup} disabled={loading} className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              {loading ? "Laden…" : "2FA instellen"}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-2"
              onClick={() => { setStep("disable"); setToken(""); }}
            >
              <ShieldOff className="h-4 w-4" />
              2FA uitschakelen
            </Button>
          )}
        </div>
      )}

      {step === "setup" && (
        <div className="space-y-4">
          <div className="rounded border p-3 bg-gray-50 space-y-2">
            <p className="text-xs font-medium text-gray-700">1. Scan de QR-code met uw authenticator-app</p>
            <div className="flex justify-center">
              <canvas ref={canvasRef} className="rounded border bg-white" />
            </div>
            <p className="text-xs text-gray-500">Lukt scannen niet? Voer deze sleutel handmatig in:</p>
            <code className="text-xs font-mono bg-gray-100 rounded px-2 py-1 select-all block text-center tracking-widest">{secret}</code>
          </div>

          <form onSubmit={confirmSetup} className="space-y-3">
            <div className="space-y-1">
              <Label>2. Voer de 6-cijferige code in uit de app *</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("idle")} disabled={loading}>
                Annuleren
              </Button>
              <Button type="submit" disabled={loading || token.length !== 6}>
                {loading ? "Verifiëren…" : "2FA activeren"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {step === "disable" && (
        <form onSubmit={disable2fa} className="space-y-3">
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
            Voer een geldige code in uit uw authenticator-app om 2FA uit te schakelen.
          </p>
          <div className="space-y-1">
            <Label>Authenticatiecode</Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("idle")} disabled={loading}>
              Annuleren
            </Button>
            <Button type="submit" variant="destructive" disabled={loading || token.length !== 6}>
              {loading ? "Uitschakelen…" : "2FA uitschakelen"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
