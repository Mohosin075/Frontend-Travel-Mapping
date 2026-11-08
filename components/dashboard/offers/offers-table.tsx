"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  useDeleteOfferMutation,
  useGetManagedOffersQuery,
} from "@/redux/features/offer/offerApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import {
  useGetAvailableCountriesQuery,
} from "@/redux/features/map/mapApi";
import { formatOfferDiscountLabel } from "@/lib/offer-label";
import { Input } from "@/components/ui/input";
import { Edit, Play, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";
import { TablePagination } from "@/components/dashboard/shared/table-pagination";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";

export function OffersTable({ onEdit }: { onEdit?: (offer: any) => void }) {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const urlSearch = searchParams?.get("search") || "";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [urlSearch]);

  const { data: user } = useGetProfileQuery({});
  const { data: countries } = useGetAvailableCountriesQuery(undefined);
  const { currentData: offersRes, isFetching: isLoading, isError, refetch } = useGetManagedOffersQuery({
    page,
    limit,
    searchTerm,
    country,
    status,
  }, { refetchOnMountOrArgChange: true });
  const [deleteOffer] = useDeleteOfferMutation();

  const offersData = offersRes?.data || [];
  const meta = offersRes?.meta;
  // Permission scoping happens on the server before pagination/counting.
  const displayedOffers = offersData;

  const handleDelete = (id: string, title?: string) => {
    appAlert.fire({
      title: t("offers_admin.delete_offer") || "Delete this offer?",
      text: t("common.are_you_sure"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: t("common.yes_delete_it") || "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteOffer(id).unwrap();
          appAlert.fire({
            title: t("offers_admin.deleted") || "Deleted!",
            text: t("offers_admin.deleted_successfully") || "The offer has been deleted.",
            icon: "success",
          });
        } catch (error: any) {
          toast.error(error?.data?.message || "Failed to delete offer");
        }
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 dark:bg-emerald-950/40 text-green-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800/60";
      case "Paused":
        return "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-transparent dark:border-yellow-800/60";
      case "Expired":
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border border-transparent dark:border-slate-700";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300";
    }
  };

  const getStatusText = (st: string) => {
    if (st === "Active") return t("offers_admin.active");
    if (st === "Paused") return t("offers_admin.paused");
    if (st === "Expired") return t("offers_admin.expired");
    return st;
  };

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-white dark:bg-[#131b2e]">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
            <Input
              placeholder={t("search.search_offers")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10 h-10 w-full"
            />
          </div>

          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 min-w-[150px]"
          >
            <option value="">{t("places_admin.all_countries")}</option>
            {countries?.map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 min-w-[140px]"
          >
            <option value="">{t("places_admin.all_status")}</option>
            <option value="Active">{t("offers_admin.active")}</option>
            <option value="Paused">{t("offers_admin.paused")}</option>
            <option value="Expired">{t("offers_admin.expired")}</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">
                {t("offers_admin.offer_title")}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">
                {t("offers_admin.place_business")}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">
                {t("offers_admin.discount")}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">
                {t("offers_admin.valid_until")}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">
                {t("offers_admin.status")}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">
                {t("offers_admin.redemptions_per_user")}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-200">
                {t("rewards_admin.actions")}
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-gray-400 dark:text-slate-500"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    {t("common.loading")}
                  </div>
                </td>
              </tr>
            ) : isError ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-red-600 dark:text-red-400">
                <p>{language === 'es' ? 'No se pudieron cargar las ofertas.' : 'Offers could not be loaded.'}</p>
                <button type="button" onClick={() => refetch()} className="mt-2 underline cursor-pointer">
                  {language === 'es' ? 'Reintentar' : 'Retry'}
                </button>
              </td></tr>
            ) : displayedOffers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-gray-500 dark:text-slate-400"
                >
                  {t("offers_admin.no_locations")}
                </td>
              </tr>
            ) : (
              displayedOffers.map((offer: any, index: number) => {
                const locationSubtitle =
                  offer.place?.address ||
                  offer.business?.location?.address ||
                  offer.place?.country ||
                  offer.business?.location?.country ||
                  "";

                return (
                  <tr
                    key={offer._id}
                    className={`${
                      index !== displayedOffers.length - 1
                        ? "border-b border-gray-100 dark:border-slate-800/80"
                        : ""
                    } hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">
                      {getLocalized(offer.title, language)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                          {getLocalized(offer.business?.name, language) || getLocalized(offer.place?.name, language) || "N/A"}
                        </span>
                        {locationSubtitle && (
                          <span
                            className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-[220px]"
                            title={locationSubtitle}
                          >
                            {locationSubtitle}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      {formatOfferDiscountLabel(offer)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      {offer.validUntil
                        ? new Date(offer.validUntil).toLocaleDateString()
                        : t("offer.no_expiration")}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          offer.status,
                        )}`}
                      >
                        {getStatusText(offer.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      {offer.redemptionsCount || 0}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        {/* Edit */}
                        <button
                          onClick={() => onEdit?.(offer)}
                          className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          aria-label="Edit offer"
                        >
                          <Edit size={18} />
                        </button>

                        {offer.status === "Paused" && (
                          <button
                            className="text-green-600 dark:text-emerald-400 hover:text-green-700 dark:hover:text-emerald-300 transition-colors"
                            aria-label="Resume offer"
                          >
                            <Play size={18} />
                          </button>
                        )}

                        {/* Delete */}
                        {user?.role !== "map_editor" && (
                          <button
                            onClick={() => handleDelete(offer._id, offer.title)}
                            className="text-red-500 dark:text-rose-400 hover:text-red-700 dark:hover:text-rose-300 transition-colors"
                            aria-label="Delete offer"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <TablePagination
        page={page}
        limit={limit}
        totalPage={meta?.totalPage}
        isLoading={isLoading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}
