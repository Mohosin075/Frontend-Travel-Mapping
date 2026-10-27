"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Droplets,
  Mountain,
  ShieldCheck,
} from "lucide-react";
import PurchasedMapsCard, { PurchasedMap } from "./purchased-maps-card";
import { useGetPurchasedMapsQuery } from "@/redux/features/map/mapApi";
import { getImageUrl, getLocalized } from "@/lib/utils";
import Link from "next/link";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function PurchasedMapsPage() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("All Maps");

  const { data, isLoading } = useGetPurchasedMapsQuery();

  const rawMaps = data?.data || [];

  const formattedMaps = rawMaps.map((map: any) => ({
    id: map._id,
    title: getLocalized(map.name, language) || map.name,
    badge: map.isActive
      ? (t("purchased_maps_page.active") || "ACTIVE")
      : (t("purchased_maps_page.inactive") || "INACTIVE"),
    badgeColor: map.isActive
      ? "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-transparent dark:border-green-800/40"
      : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400",
    info: `${t("common.save")} ${new Date(map.createdAt).toLocaleDateString()}`,
    image: getImageUrl(map.images?.[0]),
    status: map.isActive ? (t("common.active") || "Active") : (t("common.inactive") || "Inactive"),
    icon: map.isActive ? ShieldCheck : Compass,
    iconColor: map.isActive ? "text-green-500 dark:text-green-400" : "text-gray-400 dark:text-slate-500",
    isActive: !!map.isActive,
  }));

  const filteredMaps = formattedMaps.filter((map: any) => {
    if (activeTab === "Active") return map.isActive === true;
    if (activeTab === "Inactive") return map.isActive === false;
    return true;
  });

  const getTabLabel = (tab: string) => {
    if (tab === "All Maps") return t("common.all");
    if (tab === "Active") return t("offers_admin.active");
    if (tab === "Inactive") return t("users_admin.inactive");
    return tab;
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0b0f19] flex flex-col">
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 pt-4 pb-12 sm:pt-6 sm:pb-14 md:py-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 border-b dark:border-slate-800 pb-3 sm:pb-4 mb-3 sm:mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-public-sans text-gray-900 dark:text-slate-100 mb-1 sm:mb-2">
              {t("purchased_maps_page.title")}
            </h1>
            <p className="text-gray-500/80 dark:text-slate-400 text-sm sm:text-base md:text-lg font-public-sans">
              {t("purchased_maps_page.subtitle")}
            </p>
          </div>
          <Link href={"/catalog"}>
            <Button className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-extrabold rounded-lg px-10 h-12 text-base shadow-lg shadow-yellow-500/20">
              <Compass size={20} />
              {t("purchased_maps_page.browse_more")}
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-gray-200 dark:border-slate-800 mb-8">
          {["All Maps", "Active", "Inactive"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4  font-public-sans transition-all relative ${
                activeTab === tab
                  ? "text-yellow-500 font-bold"
                  : "text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 font-medium"
              }`}
            >
              {getTabLabel(tab)}{" "}
              {tab === "All Maps" && (
                <span className="ml-1 text-[10px] opacity-60">
                  {formattedMaps.length}
                </span>
              )}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Map List */}
        <div className="space-y-4 mb-12">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <p className="text-sm text-gray-500 dark:text-slate-400">{t("purchased_maps_page.loading")}</p>
            </div>
          ) : filteredMaps.length > 0 ? (
            filteredMaps.map((map: PurchasedMap) => (
              <PurchasedMapsCard key={map.id} map={map} />
            ))
          ) : (
            <div className="text-center py-10 text-gray-500 dark:text-slate-400">
              {t("purchased_maps_page.no_maps")}
            </div>
          )}
        </div>

        {/* Pagination */}
        {/* <div className="flex items-center justify-center gap-2">
          <button className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-white hover:shadow-sm transition-all">
            <ChevronLeft size={20} />
          </button>
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                page === 1
                  ? "bg-[#FFC107] text-black shadow-lg shadow-yellow-500/20"
                  : "bg-white border border-gray-100 text-gray-400 hover:border-gray-200"
              }`}
            >
              {page}
            </button>
          ))}
          <button className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-white hover:shadow-sm transition-all">
            <ChevronRight size={20} />
          </button>
        </div> */}
      </main>
    </div>
  );
}
