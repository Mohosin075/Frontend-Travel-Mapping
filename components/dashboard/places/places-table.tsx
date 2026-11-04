"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/dashboard/shared/table-pagination";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDeletePlaceMutation,
  useGetPlacesQuery,
  useUpdatePlaceMutation,
  useReviewRecommendedPlaceMutation,
} from "@/redux/features/place/placeApi";
import {
  ArrowRight,
  Check,
  Clock,
  Edit,
  Eye,
  EyeOff,
  FileText,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";
import { ReviewModal } from "../../Common/maps/review-modal";
import { UpdatePlaceModal } from "./UpdatePlaceModal";
import { ViewPlaceModal } from "./view-place-modal";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { editorCanAccessMap } from "@/lib/editor-access";
import { useGetCategoriesQuery } from "@/redux/features/category/categoryApi";
import { useGetAvailableCountriesQuery } from "@/redux/features/map/mapApi";

const getSafeString = (val: any, lang: string = "es"): string => {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val[lang] || val.es || val.en || Object.values(val)[0] || "";
  }
  return String(val);
};

interface Place {
  _id: string;
  name: string;
  category: {
    name: string;
  } | null;
  map: {
    _id: string;
    name: string;
  } | null;
  status: string;
  rating: number;
  totalReview: number;
  address: string;
  discoveredByName?: string;
  discoveredBy?: {
    _id: string;
    name: string;
    level?: number;
  } | null;
  adminFeedback?: string;
  pointsAwarded?: number;
  isApproved?: boolean;
}

export function PlacesTable() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const urlSearch = searchParams?.get("search") || "";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState("");

  const [rejectTargetPlace, setRejectTargetPlace] = useState<Place | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
      setDebouncedSearch(urlSearch.trim());
    }
  }, [urlSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const { data: user } = useGetProfileQuery({});
  const { data: categoriesResponse } = useGetCategoriesQuery({ limit: 100 });
  const { data: countries } = useGetAvailableCountriesQuery(undefined);

  const { data: response, isLoading } = useGetPlacesQuery({
    page,
    limit,
    searchTerm: debouncedSearch,
    status: status || undefined,
    excludeStatus: status ? undefined : "Pending",
    category,
    country,
    type,
  });
  const { data: pendingStatsResponse } = useGetPlacesQuery({
    status: "Pending",
    limit: 1,
  });
  const pendingCount = pendingStatsResponse?.meta?.total || 0;

  const [deletePlace] = useDeletePlaceMutation();
  const [updatePlace] = useUpdatePlaceMutation();
  const [reviewRecommendedPlace, { isLoading: isReviewing }] =
    useReviewRecommendedPlaceMutation();

  const handleToggleStatus = async (place: Place) => {
    const nextStatus = place.status === "Published" ? "Draft" : "Published";
    try {
      await updatePlace({ id: place._id, data: { status: nextStatus } }).unwrap();
      toast.success(
        nextStatus === "Draft"
          ? (t("places_admin.draft_hidden_toast") || "Place set to Draft (hidden from map)")
          : (t("places_admin.published_successfully") || "Place published successfully (Live on map)")
      );
    } catch (error: any) {
      toast.error(
        error?.data?.message || error?.message || "Failed to update place status"
      );
    }
  };

  const handleApprovePlace = async (place: Place) => {
    const contributor =
      place.discoveredByName || place.discoveredBy?.name || "el usuario";
    const titleText = t("places_admin.approve_recommended_title") || "Approve recommended spot?";
    const bodyTemplate = t("places_admin.approve_recommended_prompt") || 'Do you want to approve "{name}" and award 25 points to {contributor}?';
    const bodyText = bodyTemplate
      .replace("{name}", getSafeString(place.name, language))
      .replace("{contributor}", contributor);

    appAlert
      .fire({
        title: titleText,
        text: bodyText,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("places_admin.approve_btn_pts") || "Yes, approve (+25 pts)",
        cancelButtonText: t("common.cancel") || "Cancel",
        confirmButtonColor: "#10B981",
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            await reviewRecommendedPlace({
              id: place._id,
              data: { status: "Published", pointsAwarded: 25 },
            }).unwrap();
            toast.success(
              t("places_admin.approve_success_toast") || "Spot approved, published, and 25 points awarded to contributor."
            );
          } catch (error: any) {
            toast.error(error?.data?.message || "Failed to approve place");
          }
        }
      });
  };

  const confirmRejectPlace = async () => {
    if (!rejectTargetPlace) return;
    try {
      await reviewRecommendedPlace({
        id: rejectTargetPlace._id,
        data: {
          status: "Rejected",
          adminFeedback: rejectFeedback.trim(),
        },
      }).unwrap();
      toast.success(
        t("places_admin.reject_success_toast") || "Place rejected successfully."
      );
      setRejectTargetPlace(null);
      setRejectFeedback("");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to reject place");
    }
  };

  const places: Place[] = (response?.data || []).filter(
    (place: any) => place.status !== "Pending"
  );
  const meta = response?.meta;

  const displayedPlaces =
    user?.role === "map_editor"
      ? places.filter((place: any) =>
          editorCanAccessMap(
            user,
            place.map?._id || place.map,
            place.country || place.map?.country,
          ),
        )
      : places;

  const handleDelete = async (id: string) => {
    appAlert.fire({
      title: t("common.are_you_sure"),
      text: t("places_admin.delete_confirm") || "You won't be able to revert this place deletion!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: t("common.yes_delete_it") || "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deletePlace(id).unwrap();
          toast.success(t("places_admin.deleted_successfully") || "Place deleted successfully");
        } catch (error: any) {
          toast.error(
            error?.data?.message || error?.message || "Failed to delete place",
          );
          console.error("Failed to delete place:", error);
        }
      }
    });
  };

  const getStatusColor = (status: string, isApprovedPlace: boolean = false) => {
    switch (status) {
      case "Active":
      case "Published":
        return "bg-green-100 text-green-800 dark:bg-emerald-500/10 dark:text-emerald-400";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-[#fabf13]/15 dark:text-yellow-400 font-semibold border border-yellow-300 dark:border-yellow-700/50";
      case "Rejected":
        return "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400 font-semibold border border-rose-300 dark:border-rose-700/50";
      case "Draft":
        if (isApprovedPlace) {
          return "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400 font-semibold border border-blue-300 dark:border-blue-700/50";
        }
        return "bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const tableHeaders = [
    t("places_admin.place_name"),
    t("common.categories"),
    t("nav.map"),
    t("promos_admin.status"),
    t("place.reviews"),
    t("rewards_admin.actions"),
  ];

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-white dark:bg-transparent">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
            <Input
              placeholder={t("search.search_places")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10 h-10 w-full dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white dark:bg-slate-900 dark:text-slate-200 min-w-[140px]"
          >
            <option value="">{t("places_admin.all_status")}</option>
            <option value="Published">{t("places_admin.published")}</option>
            <option value="Draft">{t("places_admin.draft")}</option>
            <option value="Rejected">
              {t("common.rejected") || "Rejected"}
            </option>
          </select>

          {pendingCount > 0 && (
            <Link
              href="/dashboard/reviews-verification"
              className="inline-flex items-center gap-2 px-3.5 h-10 rounded-lg text-xs font-bold transition-all border cursor-pointer bg-[#fabf13]/10 hover:bg-[#fabf13]/20 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700/60 shadow-xs"
              title={t("places_admin.pending_moderation_title") || "Go to Moderation to review pending tourist spots"}
            >
              <ShieldCheck size={15} className="text-yellow-500" />
              <span>
                {t("places_admin.pending_moderation") || "Pending Moderation:"}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-black bg-[#fabf13] text-black">
                {pendingCount}
              </span>
              <ArrowRight size={13} className="text-yellow-600 dark:text-yellow-400" />
            </Link>
          )}

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white dark:bg-slate-900 dark:text-slate-200 min-w-[140px]"
          >
            <option value="">{t("places_admin.all_categories")}</option>
            {categoriesResponse?.data?.map((cat: any) => (
              <option key={cat._id} value={cat._id}>
                {getSafeString(cat.name, language)}
              </option>
            ))}
          </select>

          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white dark:bg-slate-900 dark:text-slate-200 min-w-[140px]"
          >
            <option value="">{t("places_admin.all_countries")}</option>
            {countries?.map((c: any) => {
              const label = getSafeString(c, language);
              return (
                <option key={label} value={label}>
                  {label}
                </option>
              );
            })}
          </select>

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white dark:bg-slate-900 dark:text-slate-200 min-w-[140px]"
          >
            <option value="">{t("places_admin.all_types")}</option>
            <option value="Regular">{t("places_admin.regular_admin")}</option>
            <option value="Business">{t("places_admin.business_user")}</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
              {tableHeaders.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                  {t("places_admin.loading_places")}
                </td>
              </tr>
            ) : displayedPlaces.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                  {t("places_admin.no_places")}
                </td>
              </tr>
            ) : (
              displayedPlaces.map((place, index) => (
                <tr
                  key={place._id}
                  className={`${index !== displayedPlaces.length - 1
                      ? "border-b border-gray-100 dark:border-slate-800/60"
                      : ""
                    } hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span>{getSafeString(place.name, language)}</span>
                        {(place.discoveredByName || place.discoveredBy) && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#fabf13]/15 text-yellow-800 dark:text-yellow-300 border border-yellow-500/30"
                            title={`Discovered by: ${
                              place.discoveredByName ||
                              (typeof place.discoveredBy === "object"
                                ? place.discoveredBy?.name
                                : place.discoveredBy)
                            }`}
                          >
                            <Sparkles size={10} className="text-yellow-500" />
                            {place.discoveredByName ||
                              (typeof place.discoveredBy === "object"
                                ? place.discoveredBy?.name
                                : place.discoveredBy)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-[200px]">
                        {place.address}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                    {getSafeString(place.category?.name, language) || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                    {getSafeString(place.map?.name, language) || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {(() => {
                      const isApprovedPlace = !!(place.isApproved || (place.pointsAwarded && place.pointsAwarded > 0));
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            place.status,
                            isApprovedPlace
                          )}`}
                        >
                          {place.status === "Pending" && (
                            <Clock size={12} className="shrink-0" />
                          )}
                          {place.status === "Published"
                            ? (t("places_admin.published") || "Published")
                            : place.status === "Draft"
                            ? (isApprovedPlace
                                ? (t("places_admin.accepted_draft") || "Accepted (Draft)")
                                : (t("places_admin.draft") || "Draft"))
                            : place.status === "Pending"
                            ? (t("common.pending") || "Pending")
                            : place.status === "Rejected"
                            ? (t("common.rejected") || "Rejected")
                            : place.status}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                    <div className="flex items-center gap-1">
                      <span>⭐ {place.rating || 0}</span>
                      <span className="text-gray-400 dark:text-slate-500">
                        ({place.totalReview || 0})
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => {
                          setSelectedPlaceId(place._id);
                          setIsUpdateModalOpen(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        aria-label="Edit place"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(place)}
                        className={`${
                          place.status === "Published"
                            ? "text-green-500 hover:text-green-700"
                            : "text-yellow-500 hover:text-yellow-700"
                        } transition-colors`}
                        title={
                          place.status === "Published"
                            ? (t("places_admin.set_to_draft") || "Set to draft")
                            : (t("places_admin.published_successfully") || "Publish place")
                        }
                        aria-label={
                          place.status === "Published"
                            ? "Set to draft"
                            : "Publish place"
                        }
                      >
                        {place.status === "Published" ? (
                          <Eye size={18} />
                        ) : (
                          <EyeOff size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlaceId(place._id);
                          setIsViewModalOpen(true);
                        }}
                        className="text-slate-500 hover:text-slate-700 transition-colors"
                        aria-label="View place details"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlaceId(place._id);
                          setIsReviewModalOpen(true);
                        }}
                        className="text-yellow-500 hover:text-yellow-700 transition-colors flex items-center gap-2 border dark:border-slate-700 dark:hover:bg-slate-800 rounded-full px-2"
                        aria-label={t("place.reviews")}
                      >
                        {t("place.reviews")}
                        <MessageSquare size={18} />
                      </button>

                      {user?.role !== "map_editor" && (
                        <button
                          onClick={() => handleDelete(place._id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          aria-label="Delete place"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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

      <ViewPlaceModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        placeId={selectedPlaceId}
      />

      <UpdatePlaceModal
        open={isUpdateModalOpen}
        onOpenChange={setIsUpdateModalOpen}
        placeId={selectedPlaceId}
      />

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        placeId={selectedPlaceId || undefined}
      />

      {/* Reject Feedback Modal */}
      <Dialog
        open={!!rejectTargetPlace}
        onOpenChange={(open) => !open && setRejectTargetPlace(null)}
      >
        <DialogContent className="max-w-md bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <X className="text-rose-500 w-5 h-5" />
              {t("places_admin.reject_recommended_title") || "Reject Recommended Spot"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {(t("places_admin.reject_reason_prompt") || 'Let the user know why "{name}" was not approved:')
                .replace("{name}", getSafeString(rejectTargetPlace?.name, language))}
            </p>
            <textarea
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              rows={3}
              placeholder={t("places_admin.reject_feedback_placeholder") || "E.g., Photos are blurry or location coordinates are incorrect..."}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
            />
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setRejectTargetPlace(null)}
              className="dark:border-slate-700"
            >
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button
              onClick={confirmRejectPlace}
              disabled={isReviewing}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              {t("places_admin.confirm_rejection") || "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
