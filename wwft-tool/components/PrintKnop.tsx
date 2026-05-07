"use client";

import { Printer } from "lucide-react";

export function PrintKnop() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border rounded px-3 py-1.5"
    >
      <Printer className="h-4 w-4" />
      Afdrukken / PDF
    </button>
  );
}
