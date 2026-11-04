"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export default function RouteModalLayer({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" onClick={onDismiss}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      {children}
    </div>,
    document.body,
  );
}
