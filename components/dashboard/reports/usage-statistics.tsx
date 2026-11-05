"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";
import {
  Store,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Map,
  Ticket,
  ArrowRight,
  Globe,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EntityUsersModal } from "./entity-users-modal";

interface StatItem {
  countMetric?: "unique_viewers";
  totalViews?: number;
  entityType?: "map" | "place" | "offer" | "business";
  id?: string;
  name: string;
  count: number;
  businessName?: string;
  businessId?: string;
  placeId?: string;
  placesCount?: number;
  country?: string;
}

function StatColumn({
  title,
  items,
  type,
  forceExpand,
  onSelectEntityUsers,
}: {
  title: string;
  items: StatItem[];
  type: "map" | "place" | "offer" | "business";
  forceExpand?: boolean;
  onSelectEntityUsers?: (entity: {
    type: "map" | "place" | "offer" | "business";
    id: string;
    name: string;
    count: number;
  }) => void;
}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const effectiveExpanded = forceExpand ?? isExpanded;
  const visibleItems = effectiveExpanded ? items : items.slice(0, 5);

  const getItemUrl = (item: StatItem) => {
    const localized = getLocalized(item.name, language);
    const query = encodeURIComponent(localized);

    switch (item.entityType || type) {
      case "map":
        return item.id ? `/catalog/${item.id}` : `/dashboard/maps?search=${query}`;
      case "place":
        return item.id ? `/places/${item.id}` : `/dashboard/places?search=${query}`;
      case "offer":
        return item.id ? `/offer/${item.id}` : `/dashboard/offers?search=${query}`;
      case "business":
        return item.id ? `/dashboard/business/${item.id}` : `/dashboard/business?search=${query}`;
      default:
        return "/dashboard";
    }
  };

  const getBusinessUrl = (item: StatItem) => {
    if (item.businessId) {
      return `/dashboard/business/${item.businessId}`;
    }
    if (item.placeId) {
      return `/places/${item.placeId}`;
    }
    const query = encodeURIComponent(getLocalized(item.businessName || "", language));
    return `/dashboard/business?search=${query}`;
  };

  const getAllDestinationUrl = () => {
    switch (type) {
      case "map":
        return "/dashboard/maps";
      case "place":
        return "/dashboard/places";
      case "offer":
        return "/dashboard/offers";
      case "business":
        return "/dashboard/business";
      default:
        return "/dashboard";
    }
  };

  const getAllDestinationLabel = () => {
    switch (type) {
      case "map":
        return t("reports_admin.explore_all_maps") || "View all maps";
      case "place":
        return t("reports_admin.explore_all_places") || "View all places";
      case "offer":
        return t("reports_admin.explore_all_offers") || "View all offers";
      case "business":
        return t("reports_admin.explore_all_businesses") || "View all businesses";
      default:
        return t("common.view_all") || "View all";
    }
  };

  const getSectionIcon = () => {
    switch (type) {
      case "map":
        return <Map size={16} className="text-[#fabf13]" />;
      case "place":
        return <MapPin size={16} className="text-[#fabf13]" />;
      case "offer":
        return <Ticket size={16} className="text-[#fabf13]" />;
      case "business":
        return <Store size={16} className="text-[#fabf13]" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getSectionIcon()}
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
            {title}
          </h3>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
          {items.length}
        </span>
      </div>

      {/* Items List */}
      <div
        className={`space-y-2.5 transition-all ${
          effectiveExpanded
            ? "max-h-[380px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-yellow-200 dark:scrollbar-thumb-slate-700 hover:scrollbar-thumb-yellow-300"
            : ""
        }`}
      >
        {items.length > 0 ? (
          visibleItems.map((item, idx) => {
            const itemUrl = getItemUrl(item);
            const localizedName = getLocalized(item.name, language);
            const localizedBusinessName = item.businessName
              ? getLocalized(item.businessName, language)
              : "";

            const targetId = item.id || item.placeId || "";

            return (
              <div
                key={item.id || idx}
                onClick={() => router.push(itemUrl)}
                className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-slate-900/60 hover:bg-yellow-50/40 dark:hover:bg-slate-800/80 hover:border-yellow-300 dark:hover:border-slate-700 p-3 rounded-lg border border-gray-100 dark:border-slate-800 transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                title={`${t("common.view_details") || "View details"}: ${localizedName}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 group-hover:text-yellow-700 dark:group-hover:text-yellow-400 transition-colors truncate">
                      {localizedName}
                    </span>
                    <ExternalLink
                      size={11}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-[#fabf13]"
                    />
                  </div>

                  {/* Meta: spots count per map / Country / Business Name */}
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {item.totalViews !== undefined && (
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">
                        {language === 'es' ? 'Vistas totales' : 'Total views'}: {item.totalViews.toLocaleString()}
                      </span>
                    )}
                    {type === "map" && item.placesCount !== undefined && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-300/50 dark:border-yellow-800/40 px-1.5 py-0.5 rounded">
                        <MapPin size={9} />
                        <span>
                          {item.placesCount}{" "}
                          {item.placesCount === 1
                            ? t("reports_admin.place_singular") || "spot"
                            : t("reports_admin.places_plural") || "spots"}
                        </span>
                      </span>
                    )}

                    {type === "map" && item.country && (
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium inline-flex items-center gap-0.5">
                        <Globe size={9} />
                        <span>{item.country}</span>
                      </span>
                    )}

                    {localizedBusinessName && (
                      <Link
                        href={getBusinessUrl(item)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-yellow-700 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 font-medium inline-flex items-center gap-1 max-w-full truncate hover:underline"
                        title={`${t("business_admin.view_business") || "View details"}: ${localizedBusinessName}`}
                      >
                        {item.placeId && !item.businessId ? (
                          <MapPin size={11} className="shrink-0" />
                        ) : (
                          <Store size={11} className="shrink-0" />
                        )}
                        <span className="truncate">{localizedBusinessName}</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Count Badge - Clickable to see who these users are */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectEntityUsers && targetId) {
                      onSelectEntityUsers({
                        type: item.entityType || type,
                        id: targetId,
                        name: localizedName,
                        count: item.count,
                      });
                    }
                  }}
                  className="text-xs font-bold text-yellow-900 dark:text-yellow-300 shrink-0 bg-yellow-100 hover:bg-[#fabf13] hover:text-black dark:bg-yellow-950/60 dark:hover:bg-[#fabf13] dark:hover:text-black px-2.5 py-1 rounded-md border border-yellow-300 dark:border-yellow-700/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs group/btn"
                  title={t("reports_admin.click_to_view_users") || "Click to view interacting users"}
                >
                  <Users size={12} className="opacity-70 group-hover/btn:opacity-100" />
                  <span>{item.count.toLocaleString()}</span>
                </button>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-gray-400 dark:text-slate-500 text-xs bg-gray-50 dark:bg-slate-900/40 rounded-lg border border-gray-100 dark:border-slate-800 border-dashed">
            {t("reports_admin.no_data") || "No data available"}
          </div>
        )}
      </div>

      {/* Footer: View More / View Less & Explore Table Link */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-2">
        {items.length > 5 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!effectiveExpanded)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg text-yellow-800 dark:text-yellow-300 bg-yellow-50 hover:bg-yellow-100/80 dark:bg-yellow-950/40 dark:hover:bg-yellow-900/60 border border-yellow-300/60 dark:border-yellow-800/60 transition-all cursor-pointer"
          >
            <span>
              {effectiveExpanded
                ? t("reports_admin.view_less") || "View Less"
                : `${t("reports_admin.view_more") || "View More"} (${items.length - 5} ${t("reports_admin.more") || "more"})`}
            </span>
            {effectiveExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}

        <Link
          href={getAllDestinationUrl()}
          className="inline-flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-yellow-600 dark:hover:text-[#fabf13] px-2 py-1 rounded-md transition-colors"
        >
          <span>{getAllDestinationLabel()}</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

interface UsageData {
  mostViewedMaps: StatItem[];
  mostOpenedPlaces: StatItem[];
  mostRedeemedOffers: StatItem[];
}

export function UsageStatistics({
  data,
  timeFilterActive,
  timeFilter,
  placeColumnTitle = "Most Opened Places",
}: {
  data?: UsageData;
  timeFilterActive?: boolean;
  timeFilter?: string;
  placeColumnTitle?: string;
}) {
  const { t, language } = useLanguage();
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);

  const [selectedEntity, setSelectedEntity] = useState<{
    type: "map" | "place" | "offer" | "business";
    id: string;
    name: string;
    count: number;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenEntityUsers = (entity: {
    type: "map" | "place" | "offer" | "business";
    id: string;
    name: string;
    count: number;
  }) => {
    setSelectedEntity(entity);
    setIsModalOpen(true);
  };

  const mapsCount = data?.mostViewedMaps?.length || 0;
  const placesCount = data?.mostOpenedPlaces?.length || 0;
  const offersCount = data?.mostRedeemedOffers?.length || 0;
  const hasMoreThanFive = mapsCount > 5 || placesCount > 5 || offersCount > 5;

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            {t("reports_admin.usage_title") || "Usage Statistics & Rankings"}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
            {timeFilterActive
              ? t("reports_admin.usage_desc_filtered") || "Showing statistics for the selected time filter."
              : t("reports_admin.usage_desc") ||
                "Rankings of most viewed maps (with spots count), opened places, and claimed offers."}
          </p>
        </div>

        {hasMoreThanFive && (
          <button
            type="button"
            onClick={() => setExpandAll((prev) => (prev ? false : true))}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <span>
              {expandAll
                ? t("reports_admin.collapse_all") || "Collapse All Sections"
                : t("reports_admin.expand_all") || "View More in All Sections"}
            </span>
            {expandAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">
        {language === 'es'
          ? 'Mapas y lugares: visitantes únicos registrados (cuentas y visitantes sin sesión). Pulsa la cifra para ver todas las cuentas identificadas. Las ofertas muestran canjes.'
          : 'Maps and places: recorded unique viewers (accounts and guests). Click a count to see all identified accounts. Offers show redemptions.'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <StatColumn
          title={t("reports_admin.most_viewed_maps") || "Most Viewed Maps"}
          items={data?.mostViewedMaps || []}
          type="map"
          forceExpand={expandAll}
          onSelectEntityUsers={handleOpenEntityUsers}
        />
        <StatColumn
          title={
            placeColumnTitle === "Most Opened Places"
              ? t("reports_admin.most_opened_places") || "Most Opened Places"
              : placeColumnTitle
          }
          items={data?.mostOpenedPlaces || []}
          type={placeColumnTitle === "Business visits" ? "business" : "place"}
          forceExpand={expandAll}
          onSelectEntityUsers={handleOpenEntityUsers}
        />
        <StatColumn
          title={t("reports_admin.most_redeemed_offers") || "Most Redeemed Offers"}
          items={data?.mostRedeemedOffers || []}
          type="offer"
          forceExpand={expandAll}
          onSelectEntityUsers={handleOpenEntityUsers}
        />
      </div>

      {/* Modal to view interacting users */}
      <EntityUsersModal
        key={`${selectedEntity?.type}:${selectedEntity?.id}:${isModalOpen}`}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        entity={selectedEntity}
        timeFilter={timeFilter}
      />
    </div>
  );
}
