"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Pencil, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getLocalized, getProfileImageUrl } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/** One layout for community reviews and the signed-in user's own reviews. */
export function ReviewItem({ review, fallbackReviewer, onEdit, children }: {
  review: any; fallbackReviewer?: any; onEdit?: () => void; children?: ReactNode;
}) {
  const { t, language } = useLanguage();
  const reviewer = review?.reviewer && typeof review.reviewer === "object"
    ? review.reviewer : fallbackReviewer || {};
  const reviewerId = !reviewer.isAnonymous && (reviewer._id || reviewer.id);
  const name = reviewer.username || reviewer.name || t("reviews.explorer");
  const rating = Math.max(0, Math.min(5, Number(review?.rating) || 0));
  const date = review?.createdAt ? new Date(review.createdAt) : null;
  const identity = (
    <>
      <Avatar className="w-11 h-11 border-2 border-white dark:border-slate-800 shrink-0">
        <AvatarImage src={getProfileImageUrl(reviewer.profile)} alt={name} />
        <AvatarFallback>{name?.slice(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="min-w-0 font-bold text-gray-900 dark:text-slate-100 text-sm [overflow-wrap:anywhere]">{name}</span>
          {!reviewer.isAnonymous && reviewer.level !== undefined && (
            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
              {t("reviews.level")} {reviewer.level}
            </span>
          )}
        </div>
        {date && Number.isFinite(date.getTime()) && (
          <time dateTime={date.toISOString()} className="text-[11px] text-gray-500 dark:text-slate-400">
            {date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
          </time>
        )}
      </div>
    </>
  );
  return (
    <article className="bg-gray-50/70 dark:bg-[#0e1424] border border-gray-100 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        {reviewerId ? (
          <Link href={`/explorer/${reviewerId}`} className="flex items-center gap-3 min-w-0 flex-1">{identity}</Link>
        ) : (
          <div className="flex items-center gap-3 min-w-0 flex-1">{identity}</div>
        )}
        {onEdit && (
          <Button type="button" onClick={onEdit} variant="outline" size="sm"
            className="shrink-0 h-8 rounded-lg gap-1.5 px-2 sm:px-3 text-xs font-semibold">
            <Pencil size={13} aria-hidden="true" />{t("reviews.edit_review")}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-1" aria-label={`${rating} / 5`}>
        {[1, 2, 3, 4, 5].map(star => {
          const fill = Math.max(0, Math.min(1, rating - star + 1));
          return (
            <span key={star} className="relative inline-flex w-3.5 h-3.5 shrink-0" aria-hidden="true">
              <Star size={14} className="text-gray-300 dark:text-slate-600" />
              {fill > 0 && <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
              </span>}
            </span>
          );
        })}
        <span className="ml-1 text-xs font-bold text-gray-700 dark:text-slate-300">{rating.toFixed(1)}</span>
      </div>
      <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
        {getLocalized(review?.review, language) || t("reviews.rated_stars_only").replace("{rating}", String(rating))}
      </p>
      {children && <div className="pt-2 border-t border-gray-200/70 dark:border-slate-800 space-y-2 text-xs text-gray-500 dark:text-slate-400">{children}</div>}
    </article>
  );
}
