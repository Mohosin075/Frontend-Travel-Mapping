"use client";

import Link from "next/link";
import { useAppSelector } from "@/redux/hook";
import { selectAccessToken } from "@/redux/features/auth/authSlice";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function PurchaseAccountReminder() {
  const token = useAppSelector(selectAccessToken);
  const { data: profile } = useGetProfileQuery({}, { skip: !token });
  const { language } = useLanguage();
  if (!token || profile?.provider !== "guest_purchase" || profile?.verified) return null;
  return <aside className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm leading-relaxed text-amber-950 dark:border-amber-400/20 dark:bg-slate-900 dark:text-amber-200">
    <Link className="rounded-sm font-medium text-amber-900 underline decoration-amber-400 underline-offset-4 transition-colors hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:text-amber-200 dark:decoration-amber-500/60 dark:hover:text-amber-100 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-slate-900" href={`/set-password?email=${encodeURIComponent(profile.email || "")}&redirect=${encodeURIComponent("/profile/purchased-maps")}`}>
      {language === "es" ? "Verifica tu email y crea una contraseña para volver a acceder a tus mapas." : "Verify your email and set a password to access your maps again later."}
    </Link>
  </aside>;
}
