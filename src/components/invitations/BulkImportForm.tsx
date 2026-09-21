"use client";

import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { parseMemberCsv, type ImportRow } from "@/lib/import/parseCsv";
import { bulkImportMembersAction, type BulkImportResult } from "@/app/(app)/beheer/leden-import/actions";

const FIELD_LABELS: { key: keyof ImportRow; label: string }[] = [
  { key: "firstName", label: "Voornaam" },
  { key: "lastName", label: "Achternaam" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefoon" },
  { key: "jobTitle", label: "Functie" },
  { key: "companyName", label: "Bedrijf" },
];

export function BulkImportForm() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    setRows(parseMemberCsv(text));
    setResult(null);
  }

  function updateRow(index: number, field: keyof ImportRow, value: string) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
  }

  async function handleImport() {
    setImporting(true);
    const outcome = await bulkImportMembersAction(rows);
    setImporting(false);
    setResult(outcome);
    if (outcome.imported > 0) {
      setRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm font-medium text-muted hover:border-voc-red hover:text-voc-red">
          <Upload size={18} />
          CSV-bestand kiezen
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>
        <p className="mt-2 text-xs text-muted">
          Verwachte kolommen (in elke volgorde): voornaam, achternaam, email, telefoon, functie, bedrijf.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{rows.length} rijen gevonden — controleer voor import</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted">
                  {FIELD_LABELS.map((f) => (
                    <th key={f.key} className="px-2 pb-2">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-2 pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-border">
                    {FIELD_LABELS.map((f) => (
                      <td key={f.key} className="px-2 py-1.5">
                        <Input
                          value={row[f.key]}
                          onChange={(e) => updateRow(index, f.key, e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        aria-label="Rij verwijderen"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-voc-red-light hover:text-voc-red"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Button type="button" onClick={handleImport} disabled={importing}>
              {importing ? "Importeren…" : `${rows.length} leden importeren`}
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          {result.imported > 0 && (
            <p className="text-sm text-green-600">
              {result.imported} uitnodiging{result.imported === 1 ? "" : "en"} aangemaakt (nog geen e-mail
              verstuurd) — te vinden bij{" "}
              <a href="/beheer/uitnodigingen" className="underline">
                Uitnodigingen
              </a>
              .
            </p>
          )}
          {result.skipped.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-voc-red">{result.skipped.length} rij(en) overgeslagen:</p>
              <ul className="mt-1 list-inside list-disc text-xs text-muted">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    Rij {s.row}
                    {s.email ? ` (${s.email})` : ""}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
