"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { reportClientError } from "@/lib/report-client-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();
  useEffect(() => {
    console.error("Global Error Caught by Boundary:", error);
    reportClientError(error);
    // If it's a stale deployment chunk error, automatically reload to fetch the new build
    const msg = error?.message || "";
    const name = error?.name || "";
    if (
      /Loading chunk .* failed/i.test(msg) ||
      /ChunkLoadError/i.test(name) ||
      /Failed to fetch dynamically imported module/i.test(msg)
    ) {
      window.location.reload();
    } else if (/getRootNode/i.test(msg)) {
      // Auto-recover from transient Google Maps DOM unmount race condition
      const hasRetried = sessionStorage.getItem("maps_unmount_recovered");
      if (!hasRetried) {
        sessionStorage.setItem("maps_unmount_recovered", "1");
        setTimeout(() => reset(), 50);
      } else {
        sessionStorage.removeItem("maps_unmount_recovered");
      }
    }
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 font-inter">
      <div className="max-w-md w-full bg-white dark:bg-[#131b2e] rounded-3xl p-8 border border-gray-200 dark:border-slate-800 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
          <AlertTriangle size={28} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-black">{t("error_page.title") || "Something went wrong"}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {t("error_page.desc") || "A temporary client error occurred. Please refresh the page to reload the latest version."}
          </p>
          {error?.message && (
            <p className="text-[11px] font-mono text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl break-words text-left">
              {error.message}
            </p>
          )}
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <Button
            onClick={() => window.location.reload()}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-xl h-11 text-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={14} />
            <span>{t("error_page.reload") || "Reload Page"}</span>
          </Button>
          <Button
            onClick={() => reset()}
            variant="outline"
            className="flex-1 border-gray-200 dark:border-slate-700 font-bold rounded-xl h-11 text-xs cursor-pointer"
          >
            {t("error_page.try_again") || "Try Again"}
          </Button>
        </div>
      </div>
    </div>
  );
}
