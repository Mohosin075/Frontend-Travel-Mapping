"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ReviewCard } from "./contributions-reviews/review-card";

export function ReviewsSection({ reviews }: { reviews: any[] }) {
  const { t } = useLanguage();
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("reviews.my_reviews")} ({reviews?.length || 0})</h2>
        <Link href="/profile/contributions-reviews" className="shrink-0 text-green-600 dark:text-green-400 font-semibold text-sm hover:underline">{t("reviews.view_all")}</Link>
      </div>
      {!reviews?.length ? (
        <div className="py-16 text-center text-gray-500 dark:text-slate-400 text-sm">{t("reviews.no_reviews_yet")}</div>
      ) : (
        <div className="space-y-4">{reviews.map(review => <ReviewCard key={review._id} review={review} />)}</div>
      )}
    </section>
  );
}
