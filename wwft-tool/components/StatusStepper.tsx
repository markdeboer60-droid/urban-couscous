"use client";

/**
 * StatusStepper — clickable status progression bar for the dossier.
 * GESTART → IN_BEHANDELING → AFGEROND
 */

import { useTransition } from "react";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/types";

interface StatusStepperProps {
  clientId: string;
  current: ClientStatus;
  isReadOnly?: boolean;
  onUpdate?: (s: ClientStatus) => void;
}

const STEPS: { status: ClientStatus; label: string }[] = [
  { status: "GESTART", label: "Gestart" },
  { status: "IN_BEHANDELING", label: "In behandeling" },
  { status: "AFGEROND", label: "Afgerond" },
];

export function StatusStepper({ clientId, current, isReadOnly, onUpdate }: StatusStepperProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const currentIdx = STEPS.findIndex((s) => s.status === current);

  function handleClick(status: ClientStatus, idx: number) {
    if (isReadOnly || isPending || idx <= currentIdx) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/clients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, status }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast({ title: `Status gewijzigd naar ${status.toLowerCase().replace("_", " ")}` });
        onUpdate?.(status);
      } catch (err: unknown) {
        toast({ title: "Fout", description: String(err), variant: "destructive" });
      }
    });
  }

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        const isClickable = !isReadOnly && i === currentIdx + 1;

        return (
          <div key={step.status} className="flex items-center">
            <button
              onClick={() => handleClick(step.status, i)}
              disabled={!isClickable || isPending}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border transition-colors",
                isDone && "bg-green-100 text-green-700 border-green-200",
                isActive && "bg-blue-600 text-white border-blue-600",
                !isDone && !isActive && "bg-gray-50 text-gray-500 border-gray-200",
                isClickable && "hover:bg-blue-50 hover:border-blue-400 cursor-pointer",
                (!isClickable || isReadOnly) && "cursor-default"
              )}
            >
              {isDone && <Check className="h-3.5 w-3.5" />}
              {step.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px w-4", i < currentIdx ? "bg-green-400" : "bg-gray-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
