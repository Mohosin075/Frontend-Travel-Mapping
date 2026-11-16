"use client";

import {
  useAddToFavouriteMutation,
  useGetFavouritesQuery,
} from "@/redux/features/favourite/favouriteApi";
import { TFavouriteItem, TAddFavouritePayload } from "@/lib/types/favourite";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/hook";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";

type Props = {
  placeId: string;
  type: "Map" | "Place" | "Offer" | "Business";
  Style?: string;
};

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function FavouriteButton({ placeId, type, Style }: Props) {
  const { t } = useLanguage();
  const [addToFavourite, { isLoading }] = useAddToFavouriteMutation();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const { currentData: favouritesData } = useGetFavouritesQuery(undefined, { skip: !accessToken });
  const favouritesList: TFavouriteItem[] = favouritesData?.data || [];

  const existingFav: any = favouritesList.find((fav: any) => {
    const placeRef = fav.place?._id || fav.place;
    const businessRef = fav.business?._id || fav.business;
    const mapRef = fav.map?._id || fav.map;
    const offerRef = fav.offer?._id || fav.offer;

    if (type === "Map") return String(mapRef) === String(placeId);
    if (type === "Offer") return String(offerRef) === String(placeId);
    return (
      String(placeRef) === String(placeId) ||
      String(businessRef) === String(placeId)
    );
  });

  const isFavourite = Boolean(existingFav);

  const router = useRouter();

  const handleFavourite = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!accessToken) {
      toast.error(t("login_required.title") || "Login Required", {
        description: t("login_required.description") || "You must be logged in to add items to favorites.",
      });
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }

    try {
      const payload: TAddFavouritePayload = existingFav
        ? existingFav.place
          ? { type: existingFav.type || "Place", place: placeId }
          : existingFav.business
            ? { type: existingFav.type || "Business", business: placeId }
            : existingFav.map
              ? { type: "Map", map: placeId }
              : { type: "Offer", offer: placeId }
        : type === "Map"
          ? { type, map: placeId }
          : type === "Offer"
            ? { type, offer: placeId }
            : type === "Business"
              ? { type: "Business", business: placeId }
              : { type: "Place", place: placeId };

      await addToFavourite(payload).unwrap();

      toast.success(
        isFavourite ? (t("common.removed_from_favourites") || "Removed from favourites") : (t("common.added_to_favourites") || "Added to favourites"),
      );
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
        !Style?.includes("bg-") ? "bg-white dark:bg-[#131b2e] border border-gray-200/80 dark:border-slate-700/80 shadow-sm hover:bg-gray-50 dark:hover:bg-[#1c263d]" : ""
      } ${Style || ""}`}
      onClick={handleFavourite}
      disabled={isLoading}
      aria-label="Toggle favourite"
    >
      <Heart
        size={20}
        className={
          isFavourite
            ? "text-red-500 fill-red-500"
            : isLoading
              ? "animate-pulse text-gray-400 dark:text-slate-500"
              : "text-slate-700 dark:text-white/90 hover:text-red-500 dark:hover:text-red-400 hover:fill-red-500/20 transition-all duration-200"
        }
      />
    </button>
  );
}
