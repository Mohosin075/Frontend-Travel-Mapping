"use client";

import { DEFAULT_AVATAR, getProfileImageUrl } from "@/lib/utils";
import { Mail, CheckCircle, X } from "lucide-react";
import Image from "next/image";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function OwnerInformation({
  user,
  privateInfo,
}: {
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    profile?: string;
    verified?: boolean;
  } | null;
  privateInfo?: {
    ownerPhone?: string;
    contactEmail?: string;
  } | null;
}) {
  const { t } = useLanguage();
  const phone = privateInfo?.ownerPhone || user?.phone || "N/A";
  const email = privateInfo?.contactEmail || user?.email || "N/A";

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-lg border border-gray-200 dark:border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Mail size={20} className="text-blue-600 dark:text-blue-400" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t("business_admin.owner_info")}</h2>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full overflow-hidden">
            <Image
              src={getProfileImageUrl(user?.profile)}
              alt={user?.name || "Owner"}
              width={48}
              height={48}
              onError={(event) => { event.currentTarget.src = DEFAULT_AVATAR; }}
              unoptimized
              className="rounded-full w-12 h-12 object-cover"
            />
        </div>

        <div>
          <p className="font-semibold text-gray-900 dark:text-slate-100">{user?.name || "N/A"}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            {t("business_admin.private_email")}
          </p>
          <p className="text-gray-700 dark:text-slate-300 mt-1">{email}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            {t("business_admin.mobile_phone")}
          </p>
          <p className="text-gray-700 dark:text-slate-300 mt-1">{phone}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            {t("business_admin.identity_verified")}
          </p>

          {user?.verified ? (
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-green-600 dark:text-green-400 font-medium">{t("business_admin.verified")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <X size={16} className="text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400 font-medium">{t("business_admin.not_verified")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
