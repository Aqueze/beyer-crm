"use client";
import { useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

interface ColumnMapping {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export default function ImportPage() {
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const wb = XLSX.read(f, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { header: 1 }) as any;
    if (data.length > 0) {
      setHeaders(data[0] as string[]);
      setRows(data.slice(1) as Record<string, string>[]);
    }
    setStep("mapping");
  }

  async function handleImport() {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));
    const res = await fetch("/api/imports/execute", { method: "POST", body: formData });
    if (res.ok) setStep("done");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Import Contacts from Excel</h1>
      {step === "upload" && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white" />
          <p className="mt-4 text-gray-500 text-sm">Accepts .xlsx, .xls, .csv from Outlook export</p>
        </div>
      )}
      {step === "mapping" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">Map Excel Columns to Fields</h2>
          <div className="grid grid-cols-2 gap-4">
            {(["firstName", "lastName", "email", "phone", "company", "street", "city", "postalCode", "country"] as const).map((field) => (
              <div key={field} className="flex items-center gap-2">
                <label className="w-32 text-sm font-medium">{field}</label>
                <select className="flex-1 border rounded px-2 py-1" value={mapping[field] || ""} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}>
                  <option value="">— skip —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-4">
            <button onClick={() => setStep("preview")} className="bg-blue-600 text-white px-6 py-2 rounded">Preview</button>
            <button onClick={handleImport} className="bg-green-600 text-white px-6 py-2 rounded">Import All</button>
          </div>
        </div>
      )}
      {step === "preview" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <p className="p-4 text-gray-500">{rows.length} rows found. Showing first 5:</p>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-t">
                  {headers.map((h) => <td key={h} className="px-3 py-2">{row[h]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4">
            <button onClick={handleImport} className="bg-green-600 text-white px-6 py-2 rounded">Start Import</button>
          </div>
        </div>
      )}
      {step === "done" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-green-800 mb-2">Import Complete!</h2>
          <p className="text-green-700">Your contacts have been imported successfully.</p>
          <Link href="/contacts" className="inline-block mt-4 bg-green-600 text-white px-6 py-2 rounded">View Contacts</Link>
        </div>
      )}
    </div>
  );
}
