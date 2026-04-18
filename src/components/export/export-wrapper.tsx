"use client";

import { ExportButton } from "./export-button";

interface ExportWrapperProps {
  variant?: "default" | "outline";
  className?: string;
}

export function ExportWrapper({ variant = "default", className = "" }: ExportWrapperProps) {
  return <ExportButton variant={variant} className={className} />;
}