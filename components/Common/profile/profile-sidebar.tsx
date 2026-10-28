"use client";

import { Button } from "@/components/ui/button";
import { formatDate, getImageUrl, getProfileImageUrl } from "@/lib/utils";
import { shareProfile } from "@/lib/share-profile";
import {
  Bell,
  Check,
  CheckCircle2,
  Edit2,
  Heart,
  Loader2,
  Share2,
  Star,
  Trophy,
  MapPin,
  Compass,
  Lock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ProfileUpdateModal from "./profile-update-modal";
import { NoImage } from "@/lib/others/others";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useGetLevelConfigsQuery } from "@/redux/features/award/awardApi";
import { getEffectiveLevels, calculateUserLevel } from "@/lib/level-utils";
import { useMemo } from "react";

interface ProfileSidebar {
  _id?: string;
  name: string;
  role: string;
  createdAt: string;
  profile: string;
  level?: number;
  points?: number;
  totalReviewsApproved?: number;
  levelInfo?: any;
  visitedPlacesCount?: number;
  phone?: string;
  website?: string;
  instagram?: string;
}

interface ProfileProps {
  data: ProfileSidebar;
}

export function ProfileSidebar({ data }: ProfileProps) {
  const [open, setOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const { t, language } = useLanguage();
  const { data: profile } = useGetProfileQuery({});
  const purchasedMaps = Array.isArray((data as any)?.purchasedMaps)
    ? (data as any).purchasedMaps
    : Array.isArray((profile as any)?.purchasedMaps)
      ? (profile as any).purchasedMaps
      : [];
  const role = data?.role || (profile as any)?.role || "";
  const isAdminOrEditor = ["super_admin", "admin", "map_editor"].includes(role);
  const hasPurchasedMap = isAdminOrEditor || purchasedMaps.length > 0;

  const { data: levelsRes } = useGetLevelConfigsQuery();
  const effectiveLevels = useMemo(
    () => getEffectiveLevels(levelsRes, language),
    [levelsRes, language]
  );
  const levelCalc = useMemo(
    () => calculateUserLevel(data?.points || 0, data?.totalReviewsApproved || 0, effectiveLevels),
    [data?.points, data?.totalReviewsApproved, effectiveLevels]
  );
  const currentLevelNumber = levelCalc.currentLevelNumber;
  const currentLevelName = data?.levelInfo?.title || levelCalc.currentLevelName;

  const allProfileLinks = [
    {
      href: "/notifications",
      label: t("nav.notifications") || "Notifications",
      icon: Bell,
      roles: ["all"],
    },
    {
      href: "/profile/visited-places",
      label: t("nav.visited_places") || "Visited Places",
      icon: CheckCircle2,
      roles: ["all"],
    },
    {
      href: "/profile/favorite-places",
      label: t("nav.favorite_places"),
      icon: Heart,
      roles: ["all"],
    },
    {
      href: "/profile/saved-routes",
      label: t("nav.saved_routes") || "Mis Rutas",
      icon: Compass,
      roles: ["all"],
    },
    {
      href: "/profile/contributions-reviews",
      label: t("nav.contributions"),
      icon: Star,
      roles: ["all"],
    },
    {
      href: "/profile/awards",
      label: t("nav.awards"),
      icon: Trophy,
      roles: ["all"],
    },
  ];

  // Administrators see the same menu options that are shown to users
  const profileLinks = allProfileLinks;

  const handleShare = async () => {
    setIsSharing(true);
    const result = await shareProfile({
      userId: data?._id,
      name: data?.name,
    });
    setIsSharing(false);
    if (result === "copied" || result === "shared") {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white dark:bg-[#131b2e] rounded-xl p-3 border border-gray-200/70 dark:border-slate-800 text-center space-y-3 transition-colors">
        <div className="border border-gray-100 dark:border-slate-800/80 p-3 rounded-lg">
          {/* Avatar with Achievement Badge */}
          <div className="relative w-32 h-32 mx-auto mb-4 overflow-hidden rounded-lg border border-gray-100 dark:border-slate-800 bg-amber-50/40 dark:bg-slate-800">
            <Image
              src={getProfileImageUrl(data?.profile)}
              alt={"profile"}
              width={500}
              height={500}
              unoptimized
              className="object-cover h-full w-full"
            />

            <div className="absolute bottom-0 right-0 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold text-sm border-2 border-white dark:border-slate-900 shadow-sm">
              L{currentLevelNumber}
            </div>
          </div>

          {/* User Name */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-0.5">
            {data?.name}
          </h2>

          {/* Points / XP display */}
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center justify-center gap-1">
            ✨ {data?.points ?? 0} XP
          </div>

          {/* Level Name Badge */}
          <div className="inline-block bg-yellow-400 text-black px-3.5 py-1 rounded-full mb-3 shadow-xs">
            <span className="font-bold text-xs uppercase tracking-wider">
              ⭐ {currentLevelName}
            </span>
          </div>

          {/* Visited Places Counter Badge */}
          <div className="flex items-center justify-center mb-3">
            <span className="inline-flex items-center gap-1.5 bg-amber-400/15 border border-amber-400/40 text-amber-700 dark:text-amber-400 px-3.5 py-1 rounded-full text-xs font-bold shadow-xs">
              📍 {(t("visited.visited_places_count") || "Visited {count} places").replace("{count}", String(data?.visitedPlacesCount ?? (profile as any)?.data?.visitedPlacesCount ?? 0))}
            </span>
          </div>

          {/* Role Badge */}
          <div className="block mb-2">
            <span className="text-gray-400 dark:text-slate-500 font-semibold text-xs uppercase tracking-wider">
              {data?.role}
            </span>
          </div>

          {/* Join Date */}
          <p className="text-gray-500 dark:text-slate-400 text-sm flex items-center justify-center gap-1 mb-6">
            📅 {t("profile.joined")} {formatDate(data?.createdAt) || 0}
          </p>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <Button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded flex items-center justify-center gap-2"
            >
              <Edit2 size={18} />
              {t("profile.edit_profile")}
            </Button>

            {data?._id && (
              <Link href={`/explorer/${data._id}`} className="block w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded flex items-center justify-center gap-2 border-amber-400/50 bg-amber-500/10 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20 font-semibold"
                >
                  <Compass size={18} className="text-amber-600 dark:text-amber-400" />
                  {t("profile.view_public_profile") || "Ver mi perfil público"}
                </Button>
              </Link>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleShare}
              disabled={isSharing || !data?._id}
              className="w-full rounded flex items-center justify-center gap-2 border-gray-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 hover:bg-yellow-50 dark:hover:bg-slate-800"
            >
              {isSharing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : shareCopied ? (
                <Check size={18} className="text-green-600" />
              ) : (
                <Share2 size={18} />
              )}
              {shareCopied ? t("common.copied") : t("profile.share_profile")}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {profileLinks.map((item, index) => {
            const Icon = item.icon;

            return (
              <Link key={index} href={item.href}>
                <Button
                  variant="outline"
                  className="w-full rounded flex items-center justify-center gap-2 border-gray-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 hover:bg-primary dark:hover:bg-primary hover:text-black dark:hover:text-black"
                >
                  <Icon size={18} />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Milestones Card */}
      {hasPurchasedMap ? (
        <div className="bg-gray-900 dark:bg-[#0e1424] dark:border dark:border-slate-800 rounded-lg p-6 text-white overflow-hidden">
          <h3 className="font-bold text-lg mb-4 tracking-widest text-gray-400 dark:text-slate-400">
            {t("levels.progress").toUpperCase()}
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm mb-1">{t("levels.level")} {currentLevelNumber} · {currentLevelName}</p>
              <p className="text-yellow-400 font-bold">{data?.points ?? 0} {t("levels.points")}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 dark:bg-[#0e1424] dark:border dark:border-slate-800 rounded-xl p-5 text-white overflow-hidden text-left">
          <div className="flex items-center gap-2 mb-1.5 text-yellow-400">
            <Lock size={16} />
            <h3 className="font-bold text-sm tracking-wide">
              {t("levels.locked_title") || "Levels & Rewards Locked"}
            </h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-3">
            {t("levels.locked_sidebar_prompt") || "Purchase a map to level up and earn free rewards."}
          </p>
          <Link href="/catalog" className="block w-full">
            <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs h-9 rounded-lg cursor-pointer">
              {t("map.buy_map") || "Buy Map"}
            </Button>
          </Link>
        </div>
      )}
      <ProfileUpdateModal open={open} onOpenChange={setOpen} data={data} />
    </div>
  );
}
