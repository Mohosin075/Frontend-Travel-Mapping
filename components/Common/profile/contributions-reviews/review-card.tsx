"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getLocalized } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ReviewModal } from "../../maps/review-modal";
import { ReviewItem } from "../../reviews/review-item";

export function ReviewCard({ review }: { review: any }) {
  const { t, language } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isBusinessReview = Boolean(review?.businessId);
  const target = isBusinessReview ? review.businessId : review.placeId;
  const targetId = target?._id || target?.id || (typeof target === "string" ? target : "");
  const href = targetId ? `/places/${targetId}${isBusinessReview ? "?type=business" : ""}` : "";
  const status = review?.status;
  return (
    <>
      <ReviewItem review={review} onEdit={() => setIsModalOpen(true)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {href && <Link href={href} className="inline-flex items-center gap-1.5 font-semibold text-gray-700 dark:text-slate-300 hover:underline">
            <MapPin size={13} aria-hidden="true" />{getLocalized(target?.name, language) || t("place.view_details")}
          </Link>}
          {status && <span className="rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 text-[11px] font-semibold">
            {status === "Approved" ? t("common.approved") : status === "Rejected" ? t("common.rejected") : t("common.pending")}
          </span>}
        </div>
      </ReviewItem>
      <ReviewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        placeId={isBusinessReview ? undefined : targetId} businessId={isBusinessReview ? targetId : undefined}
        initialData={{ _id: review?._id, rating: review?.rating, review: getLocalized(review?.review, language) || "" }} />
    </>
  );
}
