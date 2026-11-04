"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useGetCategoriesQuery } from "@/redux/features/category/categoryApi";
import {
  useGetPlaceDetailsQuery,
  useUpdatePlaceMutation,
} from "@/redux/features/place/placeApi";
import { X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { PlaceFormContent } from "./PlaceFormContent";
import { asId, asMediaUrls, buildPlaceRequestBody, normalizePlaceType } from "./place-payload";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface UpdatePlaceModalProps {
  placeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdatePlaceModal({
  placeId,
  open,
  onOpenChange,
}: UpdatePlaceModalProps) {
  const { t } = useLanguage();
  const { currentData: placeRes, isFetching: isLoadingPlace } = useGetPlaceDetailsQuery(
    placeId as string,
    { skip: !placeId || !open, refetchOnMountOrArgChange: true },
  );

  const { data: categoriesRes } = useGetCategoriesQuery({ limit: 100 });
  const [updatePlace, { isLoading: isUpdating }] = useUpdatePlaceMutation();

  const place = placeRes?.data;
  const categories = categoriesRes?.data || [];
  const defaultMapId = asId(place?.map);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleUpdate = async (finalData: any) => {
    if (!placeId) return;

    try {
      const placeKind = normalizePlaceType(finalData);
      const placeData = {
        name: finalData.name,
        map: asId(finalData.map || place.map || defaultMapId),
        category: asId(finalData.category),
        type: placeKind,
        description: finalData.description,
        address: finalData.address,
        status: finalData.status,
        services: finalData.services,
        accessibility: {
          features: finalData.accessibility
            ? Object.entries(finalData.accessibility)
              .filter(([k, v]) => v === true && k !== "notes")
              .map(([k]) => k)
            : [],
          notes: finalData.accessibility?.notes || "",
        },
        access: finalData.accessDescription || "",
        recommendations: { tips: finalData.tips || "" },
        schedules: placeKind === "Business" ? undefined : (finalData.schedules || ""),
        operatingHours: placeKind === "Business" ? (finalData.operatingHours || undefined) : undefined,
        phone: placeKind === "Business" ? (finalData.phone || "") : undefined,
        website: placeKind === "Business" ? (finalData.website || "") : undefined,
        instagram: placeKind === "Business" ? (finalData.instagram || "") : undefined,
        entryCost: finalData.entryCost || "",
        hikeTime: finalData.hikeTime || "",
        atmosphere: finalData.atmosphere || "",
        difficulty: finalData.difficulty || undefined,
        media: asMediaUrls(finalData.existingImages),
        menuImages: asMediaUrls(finalData.existingMenuImages),
      };

      const payload = buildPlaceRequestBody(
        placeData,
        finalData.mediaFiles || [],
        finalData.menuFiles || [],
      );

      await updatePlace({ id: placeId, data: payload }).unwrap();
      toast.success(t("places_admin.updated_successfully") || "Place updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.data?.message || t("places_admin.failed_update") || "Failed to update place");
      console.error("Failed to update place error detail:", error);
    }
  };

  if (!open) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      {/* Modal Box */}
      <div
        className="relative w-full max-w-5xl h-[85vh] max-h-[780px] min-h-[580px] bg-white dark:bg-[#131b2e] border border-transparent dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-gray-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-[#131b2e] shrink-0">
          <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-slate-100">
            {t("places_admin.update_place") || "Update Place"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm p-1 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {isLoadingPlace ? (
          <div className="p-8 space-y-6 flex-1 overflow-y-auto">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : place ? (
          <div className="w-full flex-1 flex flex-col overflow-hidden">
            <PlaceFormContent
              key={placeId}
              categories={categories}
              isSaving={isUpdating}
              onClose={() => onOpenChange(false)}
              onSave={handleUpdate}
              initialData={{
                name: place.name || "",
                description: place.description || "",
                category:
                  typeof place.category === "object"
                    ? place.category?._id
                    : place.category || "",
                type: normalizePlaceType(place),
                address: place.address || "",
                accessDescription: place.access || place.details?.access || "",
                tips:
                  place.recommendations?.tips || place.details?.recommendations || "",
                services: place.services || [],
                accessibility: {
                  wheelchair:
                    (place.accessibility?.features || []).includes("wheelchair"),
                  children: (place.accessibility?.features || []).includes("children"),
                  pets: (place.accessibility?.features || []).includes("pets"),
                  senior: (place.accessibility?.features || []).includes("senior"),
                  notes: place.accessibility?.notes || "",
                },
                images: asMediaUrls(place.media),
                menuImages: asMediaUrls(place.menuImages),
                isNew: false,
                status: place.status,
                phone: place.phone || "",
                website: place.website || "",
                instagram: place.instagram || "",
                // New fields pre-populated from existing place data
                schedules: place.schedules || "",
                entryCost: place.entryCost ?? "",
                hikeTime: place.hikeTime ?? "",
                atmosphere: place.atmosphere || "",
                difficulty: place.difficulty || "",
                operatingHours: place.operatingHours || undefined,
              }}
            />
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Failed to load place details.
          </div>
        )}
      </div>
    </div>
  );
}
