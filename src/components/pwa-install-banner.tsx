"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Show banner after 5 seconds if not dismissed
    const timer = setTimeout(() => {
      if (deferredPrompt) setShowBanner(true);
    }, 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Remember dismissal for this session
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't show if already dismissed this session
  useEffect(() => {
    if (sessionStorage.getItem("pwa-install-dismissed") === "true") {
      setShowBanner(false);
    }
  }, []);

  if (!showBanner || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 max-w-md">
      <div className="flex-1">
        <p className="font-semibold">BeyCRM installieren</p>
        <p className="text-sm text-slate-300">Als App auf Ihrem Gerät nutzen</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          className="px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors"
        >
          Nicht jetzt
        </button>
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
        >
          Installieren
        </button>
      </div>
    </div>
  );
}