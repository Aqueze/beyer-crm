"use client";

import { useState } from "react";

interface ExportDialogProps {
  onClose: () => void;
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<"vcard" | "csv" | "pdf">("vcard");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/contacts/export?format=${format}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const extension = format === "vcard" ? "vcf" : format;
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `contacts.${extension}`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Export Contacts</h2>

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 cursor-pointer p-3 border rounded hover:bg-gray-50">
            <input
              type="radio"
              name="format"
              value="vcard"
              checked={format === "vcard"}
              onChange={() => setFormat("vcard")}
              className="w-4 h-4"
            />
            <div>
              <div className="font-medium">vCard (.vcf)</div>
              <div className="text-sm text-gray-500">Standard contact format for phones and email clients</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 border rounded hover:bg-gray-50">
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === "csv"}
              onChange={() => setFormat("csv")}
              className="w-4 h-4"
            />
            <div>
              <div className="font-medium">CSV (.csv)</div>
              <div className="text-sm text-gray-500">Spreadsheet format for Excel and data analysis</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 border rounded hover:bg-gray-50">
            <input
              type="radio"
              name="format"
              value="pdf"
              checked={format === "pdf"}
              onChange={() => setFormat("pdf")}
              className="w-4 h-4"
            />
            <div>
              <div className="font-medium">PDF Labels (.pdf)</div>
              <div className="text-sm text-gray-500">Printable address labels for mailing</div>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}