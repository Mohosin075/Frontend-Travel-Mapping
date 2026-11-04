"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetMapsQuery } from "@/redux/features/map/mapApi";
import {
  useGetAwardConfigsQuery,
  useUpdateAwardConfigMutation,
  useCreateAwardConfigMutation,
  useDeleteAwardConfigMutation,
  useGetLevelConfigsQuery,
  useCreateLevelConfigMutation,
  useUpdateLevelConfigMutation,
  useDeleteLevelConfigMutation,
} from "@/redux/features/award/awardApi";
import { getImageUrl, getLocalized } from "@/lib/utils";
import {
  Edit,
  Image as ImageIcon,
  Plus,
  Upload,
  X,
  MapPin,
  FileText,
  Trash2,
  Award,
  Percent,
  FileCode,
  Gift,
  Layers,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const DEFAULT_LEVEL_THRESHOLDS = [
  { level: 0, title: "Explorador", name: "Explorador", xp: 0, points: 0, reviews: 0 },
  { level: 1, title: "Aventurero", name: "Aventurero", xp: 100, points: 100, reviews: 6 },
  { level: 2, title: "Tlacuilo", name: "Tlacuilo", xp: 250, points: 250, reviews: 13 },
  { level: 3, title: "Expedicionario", name: "Expedicionario", xp: 400, points: 400, reviews: 26 },
  { level: 4, title: "Viajero", name: "Viajero", xp: 700, points: 700, reviews: 46 },
  { level: 5, title: "Chasqui", name: "Chasqui", xp: 1300, points: 1300, reviews: 86 },
  { level: 6, title: "Cronista", name: "Cronista", xp: 2200, points: 2200, reviews: 146 },
  { level: 7, title: "Baquiano", name: "Baquiano", xp: 3500, points: 3500, reviews: 233 },
  { level: 8, title: "Cartógrafo", name: "Cartógrafo", xp: 5500, points: 5500, reviews: 366 },
  { level: 9, title: "Maestro Ruta", name: "Maestro Ruta", xp: 8500, points: 8500, reviews: 566 },
  { level: 10, title: "Leyenda", name: "Leyenda", xp: 13000, points: 13000, reviews: 866 },
  { level: 11, title: "Gran Leyenda", name: "Gran Leyenda", xp: 20000, points: 20000, reviews: 1333 },
  { level: 12, title: "Mítico", name: "Mítico", xp: 30000, points: 30000, reviews: 2000 },
  { level: 13, title: "Inmortal", name: "Inmortal", xp: 45000, points: 45000, reviews: 3000 },
  { level: 14, title: "Supremo", name: "Supremo", xp: 65000, points: 65000, reviews: 4333 },
];

function getLevelInfoFromList(targetXp: number, levels: any[]) {
  const sorted = [...levels].sort(
    (a, b) => (Number(a.points ?? a.xp) || 0) - (Number(b.points ?? b.xp) || 0)
  );
  const exact = sorted.find((l) => (Number(l.points ?? l.xp) || 0) === targetXp);
  if (exact) return exact;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (targetXp >= (Number(sorted[i].points ?? sorted[i].xp) || 0)) {
      return sorted[i];
    }
  }
  return sorted[0] || { level: 0, title: "Explorador", name: "Explorador", xp: 0, points: 0, reviews: 0 };
}

export default function RewardsAdminPage() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"rewards" | "tiers">("rewards");

  // API Queries
  const { data: configsRes, isLoading: isLoadingConfigs } = useGetAwardConfigsQuery();
  const { data: levelsRes, isLoading: isLoadingLevels } = useGetLevelConfigsQuery();
  const { data: mapsRes } = useGetMapsQuery({ limit: 100 });

  // Reward mutations
  const [updateAwardConfig, { isLoading: isUpdating }] = useUpdateAwardConfigMutation();
  const [createAwardConfig, { isLoading: isCreating }] = useCreateAwardConfigMutation();
  const [deleteAwardConfig] = useDeleteAwardConfigMutation();

  // Level / Tier mutations
  const [createLevelConfig, { isLoading: isCreatingLevel }] = useCreateLevelConfigMutation();
  const [updateLevelConfig, { isLoading: isUpdatingLevel }] = useUpdateLevelConfigMutation();
  const [deleteLevelConfig] = useDeleteLevelConfigMutation();

  const configs = configsRes?.data || [];
  const maps = mapsRes?.data || [];

  const levelsData = levelsRes?.data;

  // Active tiers list (DB or fallback)
  const allLevels = useMemo(() => {
    if (levelsData && Array.isArray(levelsData) && levelsData.length > 0) {
      return [...levelsData].sort((a, b) => Number(a.level) - Number(b.level));
    }
    return DEFAULT_LEVEL_THRESHOLDS;
  }, [levelsData]);

  // Reward modal & filter states
  const [open, setOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("all");

  // Tier modal states
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [isTierCreateMode, setIsTierCreateMode] = useState(false);
  const [tierLevel, setTierLevel] = useState<number>(0);
  const [tierName, setTierName] = useState<string>("");
  const [tierPoints, setTierPoints] = useState<number>(0);
  const [tierReviews, setTierReviews] = useState<number>(0);
  const [tierDescription, setTierDescription] = useState<string>("");

  const sortedAndFilteredConfigs = useMemo(() => {
    const list = [...configs];
    list.sort((a, b) => (Number(a.target) || 0) - (Number(b.target) || 0));

    if (levelFilter === "all") return list;
    return list.filter((r) => {
      const info = getLevelInfoFromList(Number(r.target) || 0, allLevels);
      return String(info.level) === levelFilter;
    });
  }, [configs, levelFilter, allLevels]);

  // Form states for Reward
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [mapId, setMapId] = useState("");
  const [type, setType] = useState("PDF Itinerary");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [mapCount, setMapCount] = useState<number>(1);

  // File upload states for Reward
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // ----------------------------------------------------
  // Reward Handlers
  // ----------------------------------------------------
  const handleOpenCreateReward = () => {
    setSelectedReward(null);
    setTitle("");
    setDescription("");
    setTarget("100");
    setMapId("");
    setType("PDF Itinerary");
    setDiscountPercentage("");
    setMapCount(1);
    setCoverPreview(null);
    setCoverFile(null);
    setPdfFile(null);
    setIsCreateMode(true);
    setOpen(true);
  };

  const handleOpenEditReward = (reward: any) => {
    setSelectedReward(reward);
    setTitle(getLocalized(reward.title, language) || "");
    setDescription(getLocalized(reward.description, language) || "");
    setTarget(reward.target?.toString() || "0");
    setMapId(reward.mapId?._id || reward.mapId || "");
    setType(reward.type || "PDF Itinerary");
    setDiscountPercentage(reward.discountPercentage?.toString() || "");
    setMapCount(Number(reward.mapCount) || 1);
    setCoverPreview(getImageUrl(reward.coverPhoto));
    setCoverFile(null);
    setPdfFile(null);
    setIsCreateMode(false);
    setOpen(true);
  };

  const handleDeleteReward = async (id: string) => {
    appAlert
      .fire({
        title: t("common.are_you_sure") || "Are you sure?",
        text: t("rewards_admin.delete_confirm") || "You won't be able to revert this reward deletion!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        confirmButtonText: t("common.yes_delete_it") || "Yes, delete it!",
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            await deleteAwardConfig(id).unwrap();
            toast.success(t("rewards_admin.deleted_successfully") || "Reward deleted successfully");
          } catch (error: any) {
            toast.error(error?.data?.message || error?.message || "Failed to delete reward");
            console.error("Failed to delete reward:", error);
          }
        }
      });
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
    }
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const rewardData: any = {
        type,
        title,
        description,
        target: Number(target) || 0,
        mapId: type === "Free Map" ? null : mapId || null,
        mapCount: type === "Free Map" ? Number(mapCount) || 1 : undefined,
        discountPercentage:
          type === "Exclusive Discount" || type === "Permanent Discount"
            ? Number(discountPercentage) || 0
            : undefined,
      };

      if (!isCreateMode && selectedReward) {
        rewardData.fileUrl = selectedReward.fileUrl || "";
        if (selectedReward.originalFileName) {
          rewardData.originalFileName = selectedReward.originalFileName;
        }
      }

      const formData = new FormData();
      formData.append("data", JSON.stringify(rewardData));

      if (coverFile) {
        formData.append("icon", coverFile);
      }
      if (pdfFile) {
        formData.append("documents", pdfFile);
      }

      if (isCreateMode) {
        await createAwardConfig(formData).unwrap();
        toast.success(t("rewards_admin.created_successfully") || "Reward created successfully");
      } else {
        await updateAwardConfig({
          id: selectedReward._id,
          data: formData,
        }).unwrap();
        toast.success(t("rewards_admin.updated_successfully") || "Reward updated successfully");
      }

      setOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || "Failed to save reward");
      console.error("Failed to save reward:", error);
    }
  };

  // ----------------------------------------------------
  // Tier / Level Handlers
  // ----------------------------------------------------
  const handleOpenCreateTier = () => {
    setSelectedTier(null);
    const maxLevel = allLevels.length > 0 ? Math.max(...allLevels.map((l: any) => Number(l.level) || 0)) : -1;
    setTierLevel(maxLevel + 1);
    setTierName("");
    setTierPoints(maxLevel >= 0 ? (allLevels[allLevels.length - 1].points || allLevels[allLevels.length - 1].xp || 0) + 15000 : 0);
    setTierReviews(0);
    setTierDescription("");
    setIsTierCreateMode(true);
    setTierModalOpen(true);
  };

  const handleOpenEditTier = (tier: any) => {
    setSelectedTier(tier);
    setTierLevel(Number(tier.level) || 0);
    setTierName(getLocalized(tier.name, language) || tier.title || tier.name || "");
    setTierPoints(Number(tier.points ?? tier.xp) || 0);
    setTierReviews(Number(tier.reviews) || 0);
    setTierDescription(getLocalized(tier.description, language) || "");
    setIsTierCreateMode(false);
    setTierModalOpen(true);
  };

  const handleDeleteTier = async (tier: any) => {
    if (!tier._id) {
      toast.error(t("rewards_admin.cannot_delete_default") || "Default initial tier cannot be deleted.");
      return;
    }

    appAlert
      .fire({
        title: t("common.are_you_sure") || "Are you sure?",
        text: `Delete Level ${tier.level} (${getLocalized(tier.name, language) || tier.title || tier.name})? This may affect users progressing to this tier!`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        confirmButtonText: t("common.yes_delete_it") || "Yes, delete it!",
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            await deleteLevelConfig(tier._id).unwrap();
            toast.success(t("rewards_admin.tier_deleted") || "Level tier deleted successfully");
          } catch (error: any) {
            toast.error(error?.data?.message || error?.message || "Failed to delete tier");
          }
        }
      });
  };

  const handleSubmitTier = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        level: Number(tierLevel),
        name: tierName,
        points: Number(tierPoints) || 0,
        reviews: Number(tierReviews) || 0,
        description: tierDescription,
      };

      if (isTierCreateMode) {
        await createLevelConfig(payload).unwrap();
        toast.success(t("rewards_admin.tier_created") || `Level ${tierLevel} (${tierName}) created successfully!`);
      } else if (selectedTier?._id) {
        await updateLevelConfig({ id: selectedTier._id, data: payload }).unwrap();
        toast.success(t("rewards_admin.tier_updated") || `Level ${tierLevel} updated successfully!`);
      } else {
        // Default tier being edited for the first time
        await createLevelConfig(payload).unwrap();
        toast.success(t("rewards_admin.tier_updated") || `Level ${tierLevel} saved to database!`);
      }

      setTierModalOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || "Failed to save tier/level");
      console.error("Failed to save level config:", error);
    }
  };

  // Helper Badge Renderers
  const getTypeBadge = (rewardType: string) => {
    if (rewardType === "PDF Itinerary" || rewardType === "Gourmet Guide") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
          <FileText size={12} />
          {rewardType}
        </span>
      );
    }
    if (rewardType === "Free Map") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
          <MapPin size={12} />
          {rewardType}
        </span>
      );
    }
    if (rewardType === "Exclusive Discount" || rewardType === "Permanent Discount") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/60">
          <Percent size={12} />
          {rewardType}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200/60 dark:border-yellow-900/60">
        <Award size={12} />
        {rewardType}
      </span>
    );
  };

  const isPdfType = type === "PDF Itinerary" || type === "Gourmet Guide";
  const isDiscountType = type === "Exclusive Discount" || type === "Permanent Discount";
  const isMapType = type === "Free Map";

  return (
    <div className="bg-gray-100 dark:bg-[#0b0f19] min-h-screen p-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">
            {t("rewards_admin.title") || "Rewards & Tiers Management"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {t("rewards_admin.subtitle") ||
              "Configure gamification levels, progression tiers, unlockable gifts, discounts, and PDF itineraries"}
          </p>
        </div>

        {/* Action Buttons based on Active Tab */}
        <div className="flex items-center gap-3">
          {activeTab === "rewards" ? (
            <>
              {/* Level Filter Dropdown */}
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="h-10 px-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Levels ({allLevels.length} Tiers)</option>
                {allLevels.map((item: any) => {
                  const name = getLocalized(item.name, language) || item.title || item.name;
                  const xp = Number(item.points ?? item.xp) || 0;
                  return (
                    <option key={item.level} value={String(item.level)}>
                      Level {item.level}: {name} ({xp.toLocaleString()} XP)
                    </option>
                  );
                })}
              </select>

              <Button
                onClick={handleOpenCreateReward}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl px-5 py-2.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={16} />
                {t("rewards_admin.add_reward") || "Add New Reward"}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleOpenCreateTier}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl px-5 py-2.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} />
              {t("rewards_admin.add_tier") || "Add New Tier / Level"}
            </Button>
          )}
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-3 mb-6">
        <button
          onClick={() => setActiveTab("rewards")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "rewards"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
              : "bg-white dark:bg-[#131b2e] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60 border border-gray-200 dark:border-slate-800"
          }`}
        >
          <Gift size={15} />
          <span>{t("rewards_admin.rewards_tab") || "Rewards Catalog"}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "rewards" ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
            }`}
          >
            {configs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("tiers")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "tiers"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
              : "bg-white dark:bg-[#131b2e] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60 border border-gray-200 dark:border-slate-800"
          }`}
        >
          <Award size={15} />
          <span>{t("rewards_admin.tiers_tab") || "Tiers & Progression Levels"}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "tiers" ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
            }`}
          >
            {allLevels.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REWARDS CATALOG */}
      {/* ========================================================================= */}
      {activeTab === "rewards" && (
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/60 text-[11px] uppercase font-bold text-gray-500 dark:text-slate-400 tracking-wider">
                  <th className="px-6 py-4 text-left">{t("rewards_admin.level_rank") || "Level & Rank"}</th>
                  <th className="px-6 py-4 text-left">{t("rewards_admin.cover") || "Icon"}</th>
                  <th className="px-6 py-4 text-left">
                    {t("rewards_admin.reward_name") || "Reward & Description"}
                  </th>
                  <th className="px-6 py-4 text-left">
                    {t("rewards_admin.reward_type") || "Category / Type"}
                  </th>
                  <th className="px-6 py-4 text-left">
                    {t("rewards_admin.points_target") || "XP Target"}
                  </th>
                  <th className="px-6 py-4 text-left">
                    {t("rewards_admin.attached_map_file") || "Attachments & Details"}
                  </th>
                  <th className="px-6 py-4 text-right">
                    {t("rewards_admin.actions") || "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                {isLoadingConfigs ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        {t("rewards_admin.loading_configs") || "Loading reward configurations..."}
                      </div>
                    </td>
                  </tr>
                ) : sortedAndFilteredConfigs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400 font-medium text-sm">
                      {t("rewards_admin.no_rewards") || "No rewards found. Click 'Add New Reward' to create one."}
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredConfigs.map((reward: any) => {
                    const levelInfo = getLevelInfoFromList(Number(reward.target) || 0, allLevels);
                    const levelTitle = getLocalized(levelInfo.name, language) || levelInfo.title || levelInfo.name;
                    return (
                      <tr key={reward._id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Level Badge */}
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 shadow-2xs">
                            <Award size={13} className="text-blue-600 dark:text-blue-400" />
                            <span>Level {levelInfo.level}</span>
                          </div>
                          <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400 mt-1">
                            {levelTitle}
                          </div>
                        </td>

                        {/* Cover photo */}
                        <td className="px-6 py-4">
                          {reward.coverPhoto ? (
                            <img
                              src={getImageUrl(reward.coverPhoto)}
                              alt={getLocalized(reward.title, language)}
                              className="w-12 h-12 object-cover rounded-xl border border-gray-200 dark:border-slate-800 shadow-2xs"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 flex items-center justify-center rounded-xl text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </td>

                        {/* Title & Description */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-slate-100 text-sm">
                            {getLocalized(reward.title, language)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 max-w-md mt-0.5 font-normal leading-relaxed">
                            {getLocalized(reward.description, language)}
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="px-6 py-4">{getTypeBadge(reward.type)}</td>

                        {/* Points target */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-extrabold text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/40 px-2.5 py-1 rounded-lg border border-yellow-200/50 dark:border-yellow-900/50 inline-block">
                            {reward.target?.toLocaleString()} XP
                          </div>
                          {reward.discountPercentage !== undefined && (
                            <div className="text-xs text-purple-700 dark:text-purple-300 font-bold mt-1">
                              Discount: {reward.discountPercentage}%
                            </div>
                          )}
                        </td>

                        {/* Attached elements */}
                        <td className="px-6 py-4 text-xs space-y-1">
                          {reward.type === "Free Map" && (
                            <div className="space-y-0.5">
                              <div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                <MapPin size={13} />
                                <span>{reward.mapCount ? `${reward.mapCount} Free Maps` : "1 Free Map"}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                                User&apos;s choice from catalog
                              </div>
                            </div>
                          )}
                          {reward.mapId && (
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                              <MapPin size={13} />
                              <span>Map: {reward.mapId?.name || reward.mapId?.title}</span>
                            </div>
                          )}
                          {reward.fileUrl && (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[200px]">
                              <FileText size={13} />
                              <a
                                href={getImageUrl(reward.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline truncate"
                              >
                                {reward.originalFileName || reward.fileUrl.split("/").pop()}
                              </a>
                            </div>
                          )}
                          {reward.type !== "Free Map" && !reward.mapId && !reward.fileUrl && (
                            <span className="text-gray-400 dark:text-slate-500 italic">{t("rewards_admin.none") || "None"}</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditReward(reward)}
                              className="h-9 w-9 p-0 rounded-xl text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                              title={t("rewards_admin.edit_reward") || "Edit Reward"}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReward(reward._id)}
                              className="h-9 w-9 p-0 rounded-xl text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 cursor-pointer"
                              title={t("rewards_admin.delete_reward") || "Delete Reward"}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TIERS & PROGRESSION LEVELS */}
      {/* ========================================================================= */}
      {activeTab === "tiers" && (
        <div className="space-y-4">
          {/* Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-[#131b2e] border border-blue-200/70 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-blue-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Award size={16} className="text-blue-600 dark:text-blue-400" />
                Gamification Tiers & Milestones
              </h3>
              <p className="text-xs text-blue-700/80 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Users automatically level up by collecting XP points from reviews, photos, and visits. You can add new tiers or edit existing thresholds here.
              </p>
            </div>
            <Button
              onClick={handleOpenCreateTier}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl px-4 py-2 cursor-pointer shadow-sm flex items-center gap-2 self-start sm:self-auto shrink-0"
            >
              <Plus size={15} />
              {t("rewards_admin.add_tier") || "Add Tier / Level"}
            </Button>
          </div>

          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/60 text-[11px] uppercase font-bold text-gray-500 dark:text-slate-400 tracking-wider">
                    <th className="px-6 py-4 text-left">{t("rewards_admin.level_num") || "Level #"}</th>
                    <th className="px-6 py-4 text-left">{t("rewards_admin.rank_tier_name") || "Rank & Tier Name"}</th>
                    <th className="px-6 py-4 text-left">{t("rewards_admin.min_xp_required") || "Minimum XP Required"}</th>
                    <th className="px-6 py-4 text-left">{t("rewards_admin.attached_rewards") || "Attached Rewards"}</th>
                    <th className="px-6 py-4 text-right">{t("rewards_admin.actions") || "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                  {isLoadingLevels ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          {t("rewards_admin.loading_tiers") || "Loading tiers & levels..."}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    allLevels.map((lvl: any) => {
                      const tierDisplayName = getLocalized(lvl.name, language) || lvl.title || lvl.name;
                      const xpRequired = Number(lvl.points ?? lvl.xp) || 0;

                      // Count rewards assigned to this level
                      const attachedRewards = configs.filter((c: any) => {
                        const info = getLevelInfoFromList(Number(c.target) || 0, allLevels);
                        return info.level === lvl.level;
                      });

                      return (
                        <tr key={lvl.level} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Level Number */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 shadow-2xs">
                              {lvl.level}
                            </span>
                          </td>

                          {/* Tier Name */}
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-gray-900 dark:text-slate-100 text-sm flex items-center gap-2">
                              <span>{tierDisplayName}</span>
                              {lvl.level >= 10 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900/40">
                                  Elite
                                </span>
                              )}
                            </div>
                            {lvl.description && (
                              <div className="text-xs text-gray-400 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {getLocalized(lvl.description, language)}
                              </div>
                            )}
                          </td>

                          {/* Points / XP */}
                          <td className="px-6 py-4">
                            <span className="font-bold text-xs text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/40 px-2.5 py-1 rounded-lg border border-yellow-200/60 dark:border-yellow-900/50">
                              {xpRequired.toLocaleString()} XP
                            </span>
                          </td>

                          {/* Attached Rewards Count */}
                          <td className="px-6 py-4">
                            {attachedRewards.length > 0 ? (
                              <button
                                onClick={() => {
                                  setLevelFilter(String(lvl.level));
                                  setActiveTab("rewards");
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer border border-blue-200 dark:border-blue-900/40"
                              >
                                <Gift size={12} />
                                <span>{attachedRewards.length} reward{attachedRewards.length > 1 ? "s" : ""}</span>
                                <ChevronRight size={12} />
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-slate-500 italic">No rewards set</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditTier(lvl)}
                                className="h-9 px-3 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </Button>

                              {lvl._id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTier(lvl)}
                                  className="h-9 w-9 p-0 rounded-xl text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Delete Tier"
                                >
                                  <Trash2 size={15} />
                                </Button>
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT REWARD */}
      {/* ========================================================================= */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl sm:max-w-3xl md:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#131b2e] dark:border-slate-800 text-gray-900 dark:text-slate-100 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-100 dark:border-slate-800">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Gift size={22} className="text-blue-600 dark:text-blue-400" />
              {isCreateMode
                ? t("rewards_admin.add_new_reward") || "Add New Reward"
                : t("rewards_admin.edit_reward") || "Edit Reward"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitReward} className="space-y-5 pt-3">
            {/* Category / Type & Reward Title (2-Column Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category / Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  {t("rewards_admin.reward_category") || "Reward Category / Type"}
                </Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <optgroup label="Content & Downloadables" className="dark:bg-slate-900">
                    <option value="PDF Itinerary">PDF Itinerary</option>
                    <option value="Gourmet Guide">Gourmet Guide</option>
                  </optgroup>
                  <optgroup label="Map Perks & Unlocks" className="dark:bg-slate-900">
                    <option value="Free Map">Free Map Unlock</option>
                    <option value="Exclusive Discount">Exclusive Discount (Level Specific)</option>
                    <option value="Permanent Discount">Permanent Map Discount</option>
                  </optgroup>
                  <optgroup label="Gamification & Status" className="dark:bg-slate-900">
                    <option value="Top Reviewer">Top Reviewer Badge</option>
                    <option value="Trail Master">Trail Master Perk</option>
                    <option value="History Buff">History Buff Perk</option>
                    <option value="Legendary Explorer">Legendary Explorer Status</option>
                  </optgroup>
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  {t("rewards_admin.reward_title") || "Reward Title"}
                </Label>
                <Input
                  placeholder="e.g. San Juan Heritage Tour PDF Itinerary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl h-11 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            {/* Free Map Options (Specify Map Quantity: 1 or 2 maps) */}
            {isMapType && (
              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <MapPin size={14} className="text-blue-600 dark:text-blue-400" />
                    <span>Number of Free Maps Included</span>
                  </Label>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    {mapCount} {mapCount > 1 ? "Maps Awarded" : "Map Awarded"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={mapCount}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value) || 1);
                      setMapCount(val);
                      if (!title || title === "1 Free Map" || title === "2 Free Maps" || title === "Free Map Unlock") {
                        setTitle(val === 1 ? "1 Free Map" : `${val} Free Maps`);
                      }
                    }}
                    className="rounded-xl h-11 w-32 font-bold text-center text-blue-950 dark:text-blue-100 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800"
                    required
                  />

                  {/* Quick toggle pills */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMapCount(1);
                        if (!title || title === "2 Free Maps" || title === "Free Map Unlock") {
                          setTitle("1 Free Map");
                        }
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        mapCount === 1
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      1 Map
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMapCount(2);
                        if (!title || title === "1 Free Map" || title === "Free Map Unlock") {
                          setTitle("2 Free Maps");
                        }
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        mapCount === 2
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      2 Maps (e.g. Level 14)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1.5 border-t border-blue-200/60 dark:border-blue-900/40 text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                  <span className="px-2 py-0.5 rounded-md bg-blue-200/70 dark:bg-blue-900/80 font-bold text-[10px] uppercase tracking-wide">
                    User&apos;s Choice
                  </span>
                  <span>
                    Users will select their {mapCount} free {mapCount > 1 ? "maps" : "map"} of their choice from the catalog.
                  </span>
                </div>
              </div>
            )}

            {/* Discount Percentage field (Shown ONLY for Discount Types) */}
            {isDiscountType && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <Label className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  {t("rewards_admin.discount_percentage") || "Discount Percentage (%)"}
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 15"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  min="1"
                  max="100"
                  className="rounded-xl h-11 font-bold text-purple-900 dark:text-purple-200 bg-purple-50/30 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50"
                  required
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                {t("rewards_admin.description") || "Description"}
              </Label>
              <textarea
                rows={3}
                placeholder="Describe what the user gets when unlocking this reward..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
                required
              />
            </div>

            {/* Quick Tier Assignment & Target XP */}
            <div className="bg-gray-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-gray-200/80 dark:border-slate-800 space-y-3">
              {(() => {
                const matchedTier = allLevels.find(
                  (l: any) => String(l.points ?? l.xp) === String(target)
                );
                return (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 flex items-center justify-between">
                        <span>Assign to Tier / Level</span>
                        {matchedTier ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            Requirement: {(Number(matchedTier.points ?? matchedTier.xp) || 0).toLocaleString()} XP
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-400">
                            Custom XP Requirement
                          </span>
                        )}
                      </Label>
                      <select
                        value={matchedTier ? String(matchedTier.level) : "custom"}
                        onChange={(e) => {
                          const selectedVal = e.target.value;
                          if (selectedVal !== "custom") {
                            const found = allLevels.find((l: any) => String(l.level) === selectedVal);
                            if (found) {
                              setTarget(String(found.points ?? found.xp ?? 0));
                            }
                          } else {
                            setTarget("");
                          }
                        }}
                        className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        {allLevels.map((lvl: any) => {
                          const name = getLocalized(lvl.name, language) || lvl.title || lvl.name;
                          const xp = Number(lvl.points ?? lvl.xp) || 0;
                          return (
                            <option key={lvl.level} value={String(lvl.level)}>
                              Level {lvl.level}: {name} ({xp.toLocaleString()} XP)
                            </option>
                          );
                        })}
                        <option value="custom">-- Custom XP Target --</option>
                      </select>
                    </div>

                    {!matchedTier && (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        {/* Custom Target XP threshold */}
                        <Label className="text-xs font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-300">
                          {t("rewards_admin.points_target") || "Custom XP Points Required"}
                        </Label>
                        <Input
                          type="number"
                          placeholder="e.g. 500"
                          value={target}
                          onChange={(e) => setTarget(e.target.value)}
                          className="rounded-xl h-11 font-bold text-yellow-900 dark:text-yellow-200 bg-white dark:bg-slate-900 border-yellow-200 dark:border-yellow-900/50"
                          required
                        />
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Optional Attach Map for Non-Free-Map rewards (e.g. PDF Itinerary, Gourmet Guide, etc.) */}
            {!isMapType && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 flex items-center justify-between">
                  <span>{t("rewards_admin.attach_map_optional") || "Attach Destination Map (Optional)"}</span>
                  {mapId && (
                    <button
                      type="button"
                      onClick={() => setMapId("")}
                      className="text-[11px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </Label>
                <select
                  value={mapId}
                  onChange={(e) => setMapId(e.target.value)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="" className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                    -- No Specific Map Attached --
                  </option>
                  {maps.map((map: any) => (
                    <option key={map._id} value={map._id} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                      {map.name || map.title || map.country}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  Optional: Associate this itinerary or reward with a specific country/destination map.
                </p>
              </div>
            )}

            {/* File uploads section */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              {/* Cover Image / Badge Icon Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  {t("rewards_admin.cover_photo") || "Icon / Badge Image"}
                </Label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors bg-gray-50/50 dark:bg-slate-900/40"
                >
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-xl border border-gray-200 dark:border-slate-800 shadow-2xs"
                    />
                  ) : (
                    <>
                      <ImageIcon size={22} className="text-gray-400 dark:text-slate-500" />
                      <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                        {t("rewards_admin.click_to_upload") || "Click to upload image"}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    ref={coverInputRef}
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* PDF Document Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  {t("rewards_admin.downloadable_pdf") || "Downloadable PDF"}
                </Label>
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  className="relative border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors bg-gray-50/50 dark:bg-slate-900/40 h-[102px]"
                >
                  {(pdfFile || selectedReward?.fileUrl) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                        if (pdfInputRef.current) pdfInputRef.current.value = "";
                        if (selectedReward) setSelectedReward({ ...selectedReward, fileUrl: "", originalFileName: "" });
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-500 rounded-full transition-colors cursor-pointer z-10"
                      title="Remove PDF"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {pdfFile || selectedReward?.fileUrl ? (
                    <div className="text-center">
                      <FileText size={22} className="text-emerald-600 dark:text-emerald-400 mx-auto" />
                      <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300 block truncate max-w-[130px] mt-1">
                        {pdfFile
                          ? pdfFile.name
                          : (selectedReward?.originalFileName || selectedReward?.fileUrl?.split("/").pop())}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload size={22} className="text-gray-400 dark:text-slate-500" />
                      <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                        {t("rewards_admin.click_to_upload_pdf") || "Upload PDF File"}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    ref={pdfInputRef}
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-11 px-5 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("common.cancel") || "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer"
              >
                {isCreating || isUpdating
                  ? t("profile.saving") || "Saving..."
                  : t("profile.save_changes") || "Save Reward"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT TIER / LEVEL */}
      {/* ========================================================================= */}
      <Dialog open={tierModalOpen} onOpenChange={setTierModalOpen}>
        <DialogContent className="max-w-xl sm:max-w-xl w-[95vw] rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#131b2e] dark:border-slate-800 text-gray-900 dark:text-slate-100 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-gray-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Award size={20} className="text-emerald-600 dark:text-emerald-400" />
              {isTierCreateMode
                ? "Add New Gamification Tier / Level"
                : `Edit Tier (Level ${tierLevel})`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitTier} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Level Number */}
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Level Number
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={tierLevel}
                  onChange={(e) => setTierLevel(Number(e.target.value))}
                  disabled={!isTierCreateMode}
                  className="rounded-xl h-11 font-extrabold text-gray-900 dark:text-slate-100 bg-gray-50/50 dark:bg-slate-900/50 dark:border-slate-800"
                  required
                />
              </div>

              {/* Tier Name */}
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Tier / Rank Name
                </Label>
                <Input
                  placeholder="e.g. Gran Maestro"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  className="rounded-xl h-11 font-semibold dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              {/* Min XP Required */}
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Required XP Points
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 5000"
                value={tierPoints}
                onChange={(e) => setTierPoints(Number(e.target.value))}
                className="rounded-xl h-11 font-bold text-yellow-800 dark:text-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/50"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Description (Optional)
              </Label>
              <textarea
                rows={2}
                placeholder="Brief description of this achievement level..."
                value={tierDescription}
                onChange={(e) => setTierDescription(e.target.value)}
                className="w-full text-sm p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
              />
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTierModalOpen(false)}
                className="h-11 px-5 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("common.cancel") || "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={isCreatingLevel || isUpdatingLevel}
                className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer"
              >
                {isCreatingLevel || isUpdatingLevel ? "Saving..." : "Save Tier"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
