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
  return <aside className="border-b border-yellow-300 bg-yellow-50 px-4 py-3 text-center text-sm text-slate-900">
    <Link className="underline" href={`/set-password?email=${encodeURIComponent(profile.email || "")}&redirect=${encodeURIComponent("/profile/purchased-maps")}`}>
      {language === "es" ? "Verifica tu email y crea una contraseña para volver a acceder a tus mapas." : "Verify your email and set a password to access your maps again later."}
    </Link>
  </aside>;
}
