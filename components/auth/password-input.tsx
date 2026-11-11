"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Use inside the form's relative input container, alongside its lock icon.
export function PasswordInput({ className, disabled, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();
  const label = t(visible ? "auth.hide_password" : "auth.show_password");

  return (
    <>
      <Input {...props} disabled={disabled} type={visible ? "text" : "password"} className={cn(className, "pr-12")} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        disabled={disabled}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107] disabled:pointer-events-none disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100"
      >
        {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
      </button>
    </>
  );
}
