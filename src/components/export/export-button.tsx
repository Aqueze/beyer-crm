"use client";

import { useState } from "react";
import { ExportDialog } from "./export-dialog";

interface ExportButtonProps {
  variant?: "default" | "outline";
  className?: string;
}

export function ExportButton({ variant = "default", className = "" }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const baseClasses =
    variant === "outline"
      ? "border px-3 py-1.5 rounded hover:bg-gray-50"
      : "bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700";

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={`${baseClasses} ${className}`}>
        Export
      </button>
      {isOpen && <ExportDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}