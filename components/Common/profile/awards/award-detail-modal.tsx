"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getImageUrl, getLocalized, downloadFileWithCustomName } from "@/lib/utils";
import {
  Check,
  Lock,
  FileText,
  Map as MapIcon,
  Tag,
  Copy,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface AwardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  award: any;
  user?: any;
}

export function AwardDetailModal({
  isOpen,
  onClose,
  award,
  user,
}: AwardDetailModalProps) {
  const { t, language } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!award) return null;

  const isUnlocked = !!award.isUnlocked;
  const rawTitle = award.config?.title || award.title || award.type;
  const title = getLocalized(rawTitle, language);
  const rawDesc = award.config?.description || award.description || "";
  const description = getLocalized(rawDesc, language);
  const rawCover = award.config?.coverPhoto || award.coverPhoto;
  const coverPhoto = rawCover ? getImageUrl(rawCover) : null;
  const rawFile = award.config?.fileUrl || award.fileUrl;
  const fileUrl = rawFile ? getImageUrl(rawFile) : null;
  const downloadFileName =
    award.config?.originalFileName ||
    award.originalFileName ||
    `${(title || "Itinerario").replace(/[<>:"/\\|?*]/g, "_").trim()}.pdf`;
  const discountPercentage =
    award.config?.discountPercentage ||
    award.discountPercentage ||
    (award.type?.includes("10%") ? 10 : award.type?.includes("Discount") ? 15 : null);
  const promoCode =
    award.config?.promoCode ||
    award.promoCode ||
    (discountPercentage ? `ROADTRIP${discountPercentage}` : "ROADTRIP10");

  const current = award.progress || 0;
  const total = award.target || 100;
  const percent = Math.min(
    100,
    Math.max(0, Math.round((current / (total || 1)) * 100))
  );

  const mapAwardCount = Number(award.config?.mapCount) || 1;
  const redeemedCount = Array.isArray(user?.redeemedFreeMaps) && user.redeemedFreeMaps.length > 0
    ? user.redeemedFreeMaps.length
    : (user?.redeemedFreeMap ? 1 : 0);
  const hasRedeemedMap = Boolean(redeemedCount >= mapAwardCount && (user?.redeemedFreeMap || (user?.redeemedFreeMaps && user.redeemedFreeMaps.length > 0)));

  const handleCopyDiscount = () => {
    navigator.clipboard.writeText(promoCode);
    setCopiedCode(true);
    toast.success(
      t("promos.code_copied") || "Discount code copied to clipboard!"
    );
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleDownloadPdf = async () => {
    if (!fileUrl || isDownloading) return;
    setIsDownloading(true);
    const configId = award.config?._id || award.configId;
    const downloadTarget = configId
      ? getImageUrl(`/api/v1/awards/configs/${configId}/download`)
      : getImageUrl(fileUrl);
    try {
      await downloadFileWithCustomName(downloadTarget, downloadFileName);
      toast.success(
        t("awards.download_started") || "Download started..."
      );
    } catch {
      window.open(getImageUrl(fileUrl), "_blank");
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
      }, 1500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-32px)] sm:max-w-[520px] p-0 overflow-hidden rounded-3xl border-0 dark:border dark:border-slate-800 shadow-2xl bg-white dark:bg-[#131b2e] max-h-[88vh] flex flex-col">
        {/* Header Banner */}
        <div className="relative h-44 sm:h-56 bg-slate-900 shrink-0 overflow-hidden flex items-center justify-center">
          {coverPhoto && !imgFailed ? (
            <img
              src={coverPhoto}
              alt={title}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
              <Trophy size={48} className="mb-2 text-amber-400 drop-shadow-md" />
              <span className="font-extrabold uppercase tracking-widest text-xs text-amber-200/90">
                {award.type}
              </span>
            </div>
          )}

          {/* Gradient Overlay for Top Badges */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/30 pointer-events-none" />

          {/* Top-Left Status Badge */}
          <div className="absolute top-3 left-3 z-20">
            {isUnlocked ? (
              <div className="bg-[#fabf13] text-black font-extrabold text-[11px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
                <Check size={13} className="stroke-[3]" />
                <span>{t("awards.unlocked") || "Unlocked"}</span>
              </div>
            ) : (
              <div className="bg-slate-900/90 backdrop-blur-md text-[#fabf13] font-bold text-[11px] px-3 py-1 rounded-full shadow-lg border border-[#fabf13]/40 flex items-center gap-1.5 uppercase tracking-wider">
                <Lock size={12} />
                <span>{percent}% {t("awards.completed") || "PROGRESS"}</span>
              </div>
            )}
          </div>

          {/* Top-Right Explicit Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white/90 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer border border-white/10"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1 font-public-sans">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-[#fabf13] bg-[#fabf13]/15 border border-[#fabf13]/30 px-2.5 py-1 rounded-md">
                {award.type}
              </span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
              {title}
            </DialogTitle>
          </DialogHeader>

          {/* Description */}
          {description && (
            <div className="bg-gray-50 dark:bg-[#0b0f19] border border-gray-200/70 dark:border-slate-800 p-4 rounded-2xl">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
                {description}
              </p>
            </div>
          )}

          {/* Progress Tracker */}
          <div className="space-y-2 bg-gray-50 dark:bg-[#0b0f19] p-4 rounded-2xl border border-gray-200/70 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                {t("awards.trophy_progress") || "TROPHY PROGRESS"}
              </span>
              <span className="text-amber-600 dark:text-[#fabf13] font-black">
                {current.toLocaleString()} / {total.toLocaleString()} ({percent}%)
              </span>
            </div>
            <Progress value={percent} className="h-2 bg-gray-200 dark:bg-slate-800" />
          </div>

          {/* Action Buttons */}
          <div className="pt-1 space-y-3">
            {isUnlocked ? (
              <>
                {/* 1. Free Map Reward Button */}
                {award.type === "Free Map" && (
                  hasRedeemedMap ? (
                    <Button
                      disabled
                      className="w-full h-12 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl cursor-not-allowed border-0"
                    >
                      {t("awards.map_claimed") || "Map Claimed"}
                    </Button>
                  ) : (
                    <Link href="/catalog?redeemFreeMap=1" className="block w-full" onClick={onClose}>
                      <Button className="w-full h-12 bg-[#fabf13] hover:bg-[#e0ac10] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-amber-500/20 gap-2 border-0 cursor-pointer">
                        <MapIcon size={16} />
                        {t("awards.choose_free_map") || "CHOOSE FREE MAP"}
                      </Button>
                    </Link>
                  )
                )}

                {/* 2. Download PDF Button */}
                {(fileUrl || award.type === "PDF Itinerary") && fileUrl && (
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="w-full h-12 bg-[#fabf13] hover:bg-[#e0ac10] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-amber-500/20 gap-2 border-0 cursor-pointer"
                  >
                    <FileText size={16} />
                    {isDownloading
                      ? (t("awards.downloading") || "DOWNLOADING...")
                      : (t("awards.download_pdf") || "DOWNLOAD PDF")}
                  </Button>
                )}

                {/* 3. Use Discount / Coupon Button */}
                {(discountPercentage || award.type?.includes("Discount") || award.type?.includes("10%")) && (
                  <div className="space-y-3">
                    <div className="bg-[#fabf13]/10 dark:bg-[#fabf13]/5 border border-[#fabf13]/30 rounded-2xl p-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-amber-800 dark:text-[#fabf13] uppercase tracking-widest">
                          {t("awards.discount_promo_code") || "Discount Promo Code"}
                        </p>
                        <p className="text-base font-black font-mono text-slate-900 dark:text-slate-100 tracking-wider">
                          {promoCode}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleCopyDiscount}
                        variant="outline"
                        className="bg-white dark:bg-slate-900 border-[#fabf13] text-gray-900 dark:text-slate-100 font-bold text-xs gap-1.5 h-9 px-3 rounded-xl cursor-pointer"
                      >
                        <Copy size={13} />
                        {copiedCode
                          ? (t("awards.copied") || "Copied!")
                          : (t("awards.copy_code") || "Copy Code")}
                      </Button>
                    </div>

                    <Link href="/catalog" className="block w-full" onClick={onClose}>
                      <Button className="w-full h-12 bg-[#fabf13] hover:bg-[#e0ac10] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-amber-500/20 gap-2 border-0 cursor-pointer">
                        <Tag size={16} />
                        {t("awards.use_discount_catalog") || "USE DISCOUNT IN CATALOG"}
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Default Claimed status if unlocked but no specific action */}
                {award.type !== "Free Map" && !fileUrl && !discountPercentage && !award.type?.includes("Discount") && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-3.5 text-center">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                      <Sparkles size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      {t("awards.reward_unlocked_xp") || "Reward unlocked! Your XP points have been credited."}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-50 dark:bg-[#0b0f19] border border-gray-200/80 dark:border-slate-800 rounded-2xl p-4 text-center space-y-1">
                <p className="text-xs font-bold text-gray-900 dark:text-slate-200 flex items-center justify-center gap-1.5">
                  <Lock size={14} className="text-amber-500 shrink-0" />
                  {t("awards.trophy_in_progress") || "Trophy In Progress"}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed font-medium">
                  {(t("awards.keep_exploring_prompt") || "Keep exploring places, leaving reviews, and earning XP to reach {points} points and unlock this perk.")
                    .replace("{points}", total.toLocaleString())}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
