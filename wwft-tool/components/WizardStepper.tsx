"use client";

/**
 * WizardStepper — 4-step wizard shell for client acceptance.
 * Steps: Bedrijfsverkenning → Wwft → Identificatie → Beoordeling
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionRow } from "@/components/QuestionRow";
import { DocumentUpload } from "@/components/DocumentUpload";
import { RisicoOordeel } from "@/components/RisicoOordeel";
import { useToast } from "@/hooks/use-toast";
import { getVragenPerCategorie } from "@/lib/wizardQuestions";
import type { WizardStap, WizardAntwoord, WizardAnswer } from "@/types";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface WizardStepperProps {
  clientId: string;
  clientNaam: string;
  isReadOnly?: boolean;
}

const STAP_LABELS: { stap: WizardStap | "IDENTIFICATIE"; label: string }[] = [
  { stap: "BEDRIJFSVERKENNING", label: "1. Bedrijfsverkenning" },
  { stap: "WWFT", label: "2. Wwft" },
  { stap: "IDENTIFICATIE", label: "3. Identificatie" },
  { stap: "BEOORDELING", label: "4. Beoordeling" },
];

export function WizardStepper({ clientId, clientNaam, isReadOnly }: WizardStepperProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { antwoord: WizardAntwoord; toelichting: string }>>({});
  const [eindOpmerkingen, setEindOpmerkingen] = useState("");
  const [risicoOordeel, setRisicoOordeel] = useState<string>("");
  const [risicoMotivatie, setRisicoMotivatie] = useState("");
  const [saving, setSaving] = useState(false);

  // Load existing answers
  useEffect(() => {
    fetch(`/api/wizard?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data: WizardAnswer[]) => {
        const map: Record<string, { antwoord: WizardAntwoord; toelichting: string }> = {};
        data.forEach((a) => {
          map[a.vraagKey] = { antwoord: a.antwoord, toelichting: a.toelichting ?? "" };
        });
        setAnswers(map);
      });
  }, [clientId]);

  const saveAnswer = useCallback(
    async (stap: WizardStap, key: string, antwoord: WizardAntwoord, toelichting: string) => {
      try {
        await fetch("/api/wizard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, stap, vraagKey: key, antwoord, toelichting }),
        });
      } catch {
        toast({ title: "Fout bij opslaan", variant: "destructive" });
      }
    },
    [clientId, toast]
  );

  function handleChange(stap: WizardStap, key: string, antwoord: WizardAntwoord, toelichting: string) {
    setAnswers((prev) => ({ ...prev, [key]: { antwoord, toelichting } }));
    saveAnswer(stap, key, antwoord, toelichting);
  }

  async function handleFinalize() {
    if (!risicoOordeel) {
      toast({ title: "Selecteer risicoprofiel", variant: "destructive" });
      return;
    }
    if (risicoMotivatie.trim().length < 50) {
      toast({ title: "Motivatie minimaal 50 tekens", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          risicoOordeel,
          risicoMotivatie,
          eindOpmerkingen,
          status: "IN_BEHANDELING",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Beoordeling opgeslagen", variant: "default" });
      router.push(`/dossier/${clientId}`);
    } catch (err: unknown) {
      toast({ title: "Fout", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const currentStap = STAP_LABELS[activeStep];

  function renderStep() {
    if (currentStap.stap === "IDENTIFICATIE") {
      return <DocumentUpload clientId={clientId} readOnly={isReadOnly} />;
    }

    if (currentStap.stap === "BEOORDELING") {
      const categories = getVragenPerCategorie("BEOORDELING");
      return (
        <div className="space-y-6">
          {Object.entries(categories).map(([cat, vragen]) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{cat}</h3>
              <div className="space-y-2">
                {vragen.map((v) => (
                  <QuestionRow
                    key={v.key}
                    vraag={v}
                    initial={answers[v.key]}
                    onChange={(key, antwoord, toelichting) => handleChange("BEOORDELING", key, antwoord, toelichting)}
                    readOnly={isReadOnly}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="border-t pt-4 space-y-4">
            <RisicoOordeel
              value={risicoOordeel as string}
              motivatie={risicoMotivatie}
              onChange={(v, m) => { setRisicoOordeel(v); setRisicoMotivatie(m); }}
              readOnly={isReadOnly}
            />
            <div className="space-y-1">
              <Label>Eindopmerkingen</Label>
              <Textarea
                placeholder="Vrij tekstveld voor eindopmerkingen…"
                value={eindOpmerkingen}
                onChange={(e) => setEindOpmerkingen(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </div>
      );
    }

    const stap = currentStap.stap as WizardStap;
    const categories = getVragenPerCategorie(stap);

    return (
      <div className="space-y-6">
        {Object.entries(categories).map(([cat, vragen]) => (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{cat}</h3>
            <div className="space-y-2">
              {vragen.map((v) => (
                <QuestionRow
                  key={v.key}
                  vraag={v}
                  initial={answers[v.key]}
                  onChange={(key, antwoord, toelichting) => handleChange(stap, key, antwoord, toelichting)}
                  readOnly={isReadOnly}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STAP_LABELS.map((s, i) => (
          <button
            key={s.stap}
            onClick={() => setActiveStep(i)}
            className={cn(
              "flex-1 min-w-[120px] text-xs py-2 px-3 rounded border transition-colors text-center",
              i === activeStep
                ? "bg-blue-600 text-white border-blue-600"
                : i < activeStep
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
            )}
          >
            {i < activeStep && <CheckCircle className="inline h-3 w-3 mr-1" />}
            {s.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[200px]">{renderStep()}</div>

      {/* Navigation */}
      {!isReadOnly && (
        <div className="flex justify-between pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
            disabled={activeStep === 0}
          >
            <ChevronLeft className="h-4 w-4" /> Vorige
          </Button>
          {activeStep < STAP_LABELS.length - 1 ? (
            <Button onClick={() => setActiveStep((s) => s + 1)}>
              Volgende <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinalize} disabled={saving}>
              {saving ? "Opslaan…" : "Beoordeling afronden"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
