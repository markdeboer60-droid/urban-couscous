"use client";

/**
 * UserManagement — PARTNER-only user management panel.
 * Create users and change roles within the organization.
 */

import { useState, useEffect } from "react";
import { UserPlus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { User, UserRole } from "@/types";

export function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ naam: "", email: "", wachtwoord: "", rol: "MEDEWERKER" as UserRole });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editRol, setEditRol] = useState<UserRole>("MEDEWERKER");

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  function passwordStrength(pw: string): { ok: boolean; message: string } {
    if (pw.length < 10) return { ok: false, message: "Minimaal 10 tekens" };
    if (!/[0-9]/.test(pw)) return { ok: false, message: "Minimaal één cijfer" };
    if (!/[^A-Za-z0-9]/.test(pw)) return { ok: false, message: "Minimaal één speciaal teken (!@#…)" };
    return { ok: true, message: "" };
  }

  const pwCheck = form.wachtwoord ? passwordStrength(form.wachtwoord) : null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (pwCheck && !pwCheck.ok) {
      toast({ title: "Wachtwoord te zwak", description: pwCheck.message, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const user = await res.json();
      setUsers((prev) => [...prev, user]);
      setAdding(false);
      setForm({ naam: "", email: "", wachtwoord: "", rol: "MEDEWERKER" });
      toast({ title: "Gebruiker aangemaakt" });
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRolChange(userId: string) {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rol: editRol }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setEditing(null);
      toast({ title: "Rol bijgewerkt" });
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Gebruikersbeheer</h2>
        <Button size="sm" onClick={() => setAdding(true)} className="flex items-center gap-1">
          <UserPlus className="h-3.5 w-3.5" /> Gebruiker toevoegen
        </Button>
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="border rounded-md p-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Naam *</Label>
              <Input value={form.naam} onChange={(e) => setForm((f) => ({ ...f, naam: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>E-mailadres *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Wachtwoord *</Label>
              <Input
                type="password"
                value={form.wachtwoord}
                onChange={(e) => setForm((f) => ({ ...f, wachtwoord: e.target.value }))}
                required
                className={pwCheck && !pwCheck.ok ? "border-red-400" : pwCheck?.ok ? "border-green-500" : ""}
              />
              {pwCheck && !pwCheck.ok && (
                <p className="text-xs text-red-600">{pwCheck.message}</p>
              )}
              {pwCheck?.ok && (
                <p className="text-xs text-green-600">Wachtwoord voldoet aan de eisen</p>
              )}
              <p className="text-xs text-gray-400">Min. 10 tekens, een cijfer en een speciaal teken</p>
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={form.rol} onValueChange={(v) => setForm((f) => ({ ...f, rol: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDEWERKER">Medewerker</SelectItem>
                  <SelectItem value="PARTNER">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Aanmaken…" : "Aanmaken"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>Annuleren</Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between border rounded p-3">
            <div>
              <p className="text-sm font-medium">{user.naam}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {editing === user.id ? (
                <div className="flex items-center gap-2">
                  <Select value={editRol} onValueChange={(v) => setEditRol(v as UserRole)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEDEWERKER">Medewerker</SelectItem>
                      <SelectItem value="PARTNER">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => handleRolChange(user.id)}>Opslaan</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>✕</Button>
                </div>
              ) : (
                <>
                  <Badge variant={user.rol === "PARTNER" ? "default" : "secondary"}>{user.rol}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(user.id); setEditRol(user.rol); }}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
