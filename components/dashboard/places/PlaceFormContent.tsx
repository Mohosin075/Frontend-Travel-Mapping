"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimeRangePicker } from "@/components/ui/time-range-picker";
import {
  composeEntryCost,
  composeHikeTime,
  getImageUrl,
  isVideoUrl,
  parseEntryCost,
  parseHikeTime,
} from "@/lib/utils";
import {
  Baby,
  Car,
  X as CloseIcon,
  Dog,
  MapPin,
  Upload,
  Users,
  Utensils,
  Wifi,
  FileText,
  Compass,
  Accessibility,
  Heart,
  Grid,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GripVertical,
} from "lucide-react";
import { CategoryIcon } from "@/components/shared/categories/category-icon";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { formatFileSize, optimizeMediaFiles } from "@/lib/image-compress";
import { asMediaUrls, isPlaceKind, normalizePlaceType, normalizeDifficulty, normalizeService } from "./place-payload";

interface PlaceFormContentProps {
  categories: any[];
  onSave: (data: any) => Promise<void>;
  isSaving: boolean;
  isFetchingAddress?: boolean;
  onClose: () => void;
  onDelete?: () => void;
  initialData?: {
    name: string;
    description: string;
    category: string;
    type?: string;
    address?: string;
    accessDescription?: string;
    tips?: string;
    services?: string[];
    accessibility?: any;
    images?: string[];
    menuImages?: string[];
    status?: string;
    isNew: boolean;
    phone?: string;
    website?: string;
    instagram?: string;
    schedules?: string;
    entryCost?: string | number;
    hikeTime?: string | number;
    atmosphere?: string;
    difficulty?: string;
    operatingHours?: Record<string, { open: string; close: string; closed: boolean }>;
    position?: { lat: number; lng: number };
  };
}

const TABS = [
  { label: "Basic Info", icon: FileText },
  { label: "Access", icon: Compass },
  { label: "Menu & Prices", icon: Utensils },
  { label: "Accessibility", icon: Accessibility },
  { label: "Recommendations", icon: Heart },
  { label: "Services", icon: Grid },
];

import { useLanguage } from "@/lib/i18n/LanguageContext";

export const PlaceFormContent = ({
  categories,
  onSave,
  isSaving,
  isFetchingAddress,
  onClose,
  onDelete,
  initialData,
}: PlaceFormContentProps) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuFileInputRef = useRef<HTMLInputElement>(null);
  const typeTouchedRef = useRef(false);
  const imagesTouchedRef = useRef(false);
  const menuImagesTouchedRef = useRef(false);
  const placeKey = (initialData as any)?._id || (initialData as any)?.id || initialData?.name;
  const prevPlaceKeyRef = useRef(placeKey);

  useEffect(() => {
    if (placeKey && placeKey !== prevPlaceKeyRef.current) {
      prevPlaceKeyRef.current = placeKey;
      imagesTouchedRef.current = false;
      menuImagesTouchedRef.current = false;
    }
  }, [placeKey]);

  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [menuFiles, setMenuFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(
    asMediaUrls(initialData?.images || (initialData as any)?.media),
  );
  const [existingMenuImages, setExistingMenuImages] = useState<string[]>(
    asMediaUrls(initialData?.menuImages),
  );
  const [previews, setPreviews] = useState<string[]>([]);
  const [menuPreviews, setMenuPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [isDraggingMenu, setIsDraggingMenu] = useState(false);
  const [isOptimizingMedia, setIsOptimizingMedia] = useState(false);

  // Drag & drop reordering states
  const [draggedExistingIdx, setDraggedExistingIdx] = useState<number | null>(null);
  const [dragOverExistingIdx, setDragOverExistingIdx] = useState<number | null>(null);
  const [draggedNewIdx, setDraggedNewIdx] = useState<number | null>(null);
  const [dragOverNewIdx, setDragOverNewIdx] = useState<number | null>(null);

  const moveArrayItem = <T,>(arr: T[], from: number, to: number): T[] => {
    if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
    const copy = [...arr];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    return copy;
  };

  const moveExistingImage = (from: number, to: number) => {
    imagesTouchedRef.current = true;
    setExistingImages((prev) => moveArrayItem(prev, from, to));
  };

  const moveNewMedia = (from: number, to: number) => {
    setMediaFiles((prev) => moveArrayItem(prev, from, to));
    setPreviews((prev) => moveArrayItem(prev, from, to));
  };

  const moveExistingMenuImage = (from: number, to: number) => {
    menuImagesTouchedRef.current = true;
    setExistingMenuImages((prev) => moveArrayItem(prev, from, to));
  };

  const moveNewMenuMedia = (from: number, to: number) => {
    setMenuFiles((prev) => moveArrayItem(prev, from, to));
    setMenuPreviews((prev) => moveArrayItem(prev, from, to));
  };

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    category: initialData?.category || "",
    type: normalizePlaceType(initialData),
    description: initialData?.description || "",
    address: initialData?.address || "",
    accessDescription: initialData?.accessDescription || "",
    accessibility: {
      wheelchair: !!(initialData?.accessibility?.wheelchair ?? (initialData?.accessibility?.features || []).includes("wheelchair")),
      children: !!(initialData?.accessibility?.children ?? (initialData?.accessibility?.features || []).includes("children")),
      pets: !!(initialData?.accessibility?.pets ?? (initialData?.accessibility?.features || []).includes("pets")),
      senior: !!(initialData?.accessibility?.senior ?? (initialData?.accessibility?.features || []).includes("senior")),
      notes: initialData?.accessibility?.notes || "",
    },
    tips: initialData?.tips || "",
    services: (initialData?.services || []).map(normalizeService),
    schedules: initialData?.schedules || "",
    entryCost: initialData?.entryCost !== undefined && initialData?.entryCost !== null ? String(initialData.entryCost) : "",
    hikeTime: initialData?.hikeTime !== undefined && initialData?.hikeTime !== null ? String(initialData.hikeTime) : "",
    atmosphere: initialData?.atmosphere || "",
    difficulty: normalizeDifficulty(initialData?.difficulty),
    phone: initialData?.phone || "",
    website: initialData?.website || "",
    instagram: initialData?.instagram || "",
    operatingHours: (initialData?.operatingHours && Object.keys(initialData.operatingHours).length > 0
      ? (initialData.operatingHours as Record<string, { open: string; close: string; closed: boolean }>)
      : null) || {
      Monday:    { open: "09:00", close: "18:00", closed: false },
      Tuesday:   { open: "09:00", close: "18:00", closed: false },
      Wednesday: { open: "09:00", close: "18:00", closed: false },
      Thursday:  { open: "09:00", close: "18:00", closed: false },
      Friday:    { open: "09:00", close: "18:00", closed: false },
      Saturday:  { open: "10:00", close: "16:00", closed: false },
      Sunday:    { open: "10:00", close: "16:00", closed: true },
    },
  });

  useEffect(() => {
    if (!initialData) return;
    setFormData((prev) => {
      const resolvedAccessibility = initialData.accessibility
        ? {
            wheelchair: !!(initialData.accessibility.wheelchair ?? (initialData.accessibility.features || []).includes("wheelchair")),
            children: !!(initialData.accessibility.children ?? (initialData.accessibility.features || []).includes("children")),
            pets: !!(initialData.accessibility.pets ?? (initialData.accessibility.features || []).includes("pets")),
            senior: !!(initialData.accessibility.senior ?? (initialData.accessibility.features || []).includes("senior")),
            notes: initialData.accessibility.notes !== undefined ? initialData.accessibility.notes : prev.accessibility.notes,
          }
        : prev.accessibility;

      return {
        ...prev,
        name: initialData.name || prev.name || "",
        description: initialData.description || prev.description || "",
        address: initialData.address || prev.address || "",
        category: initialData.category || prev.category || "",
        type: typeTouchedRef.current
          ? prev.type
          : normalizePlaceType(initialData),
        accessDescription: initialData.accessDescription || prev.accessDescription || "",
        tips: initialData.tips || prev.tips || "",
        phone: initialData.phone || prev.phone || "",
        website: initialData.website || prev.website || "",
        instagram: initialData.instagram || prev.instagram || "",
        schedules: initialData.schedules || prev.schedules || "",
        entryCost:
          initialData.entryCost !== undefined && initialData.entryCost !== null
            ? String(initialData.entryCost)
            : prev.entryCost,
        hikeTime:
          initialData.hikeTime !== undefined && initialData.hikeTime !== null
            ? String(initialData.hikeTime)
            : prev.hikeTime,
        atmosphere: initialData.atmosphere || prev.atmosphere || "",
        difficulty: initialData.difficulty ? normalizeDifficulty(initialData.difficulty) : prev.difficulty,
        operatingHours: initialData.operatingHours || prev.operatingHours,
        services: (initialData.services && initialData.services.length > 0)
          ? initialData.services.map(normalizeService)
          : prev.services,
        accessibility: resolvedAccessibility,
      };
    });
    if (!imagesTouchedRef.current) {
      const initImgs = initialData.images || (initialData as any).media;
      if (initImgs && Array.isArray(initImgs)) {
        setExistingImages(asMediaUrls(initImgs));
      }
    }
    if (!menuImagesTouchedRef.current) {
      if (initialData.menuImages && Array.isArray(initialData.menuImages)) {
        setExistingMenuImages(asMediaUrls(initialData.menuImages));
      }
    }
  }, [
    initialData,
    initialData?.name,
    initialData?.description,
    initialData?.address,
    initialData?.category,
    initialData?.type,
    initialData?.images,
    initialData?.menuImages,
    initialData?.entryCost,
    initialData?.hikeTime,
    initialData?.atmosphere,
    initialData?.difficulty,
    initialData?.schedules,
    initialData?.accessDescription,
    initialData?.tips,
    initialData?.accessibility,
    initialData?.services,
    initialData?.operatingHours,
    initialData?.phone,
    initialData?.website,
    initialData?.instagram,
  ]);

  const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024; // 200MB limit

  const isVideoFile = (file: File): boolean => {
    if (file.type && file.type.startsWith("video/")) return true;
    const ext = file.name.split(".").pop()?.toLowerCase();
    return !!ext && ["mp4", "webm", "ogv", "mov", "mkv", "3gp", "3gpp", "avi", "wmv", "flv", "m4v", "mpeg", "mpg"].includes(ext);
  };

  const handleIncomingMediaFiles = async (rawFiles: File[]) => {
    if (!rawFiles || rawFiles.length === 0) return;

    const validFiles: File[] = [];
    for (const file of rawFiles) {
      const isVideo = isVideoFile(file);
      const isImage = file.type.startsWith("image/");

      if (!isVideo && !isImage) {
        toast.error(`"${file.name}" is not a supported image or video format.`);
        continue;
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
        toast.error(
          `Video "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed video size is 200MB.`,
          { duration: 6000 }
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    try {
      setIsOptimizingMedia(true);
      // Auto-compress oversized photos for 20x faster uploads; videos remain untouched
      const processedFiles = await optimizeMediaFiles(validFiles);

      setMediaFiles((prev) => [...prev, ...processedFiles]);
      if (errors.media) setErrors((prev) => ({ ...prev, media: "" }));

      const newPreviews = processedFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    } catch (err) {
      console.error("Failed to optimize media:", err);
      setMediaFiles((prev) => [...prev, ...validFiles]);
      if (errors.media) setErrors((prev) => ({ ...prev, media: "" }));
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    } finally {
      setIsOptimizingMedia(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    handleIncomingMediaFiles(files);
  };

  const handleIncomingMenuFiles = async (rawFiles: File[]) => {
    if (!rawFiles || rawFiles.length === 0) return;

    const validFiles = rawFiles.filter(
      (file) => file.type.startsWith("image/") || file.type === "application/pdf"
    );

    if (validFiles.length === 0) {
      toast.error(t("places_admin.upload_menu_pdf_only") || "Please upload image or PDF files only for menus.");
      return;
    }

    try {
      const processed = await optimizeMediaFiles(validFiles);
      setMenuFiles((prev) => [...prev, ...processed]);
      const newPreviews = processed.map((file) => URL.createObjectURL(file));
      setMenuPreviews((prev) => [...prev, ...newPreviews]);
    } catch (err) {
      setMenuFiles((prev) => [...prev, ...validFiles]);
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setMenuPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleMenuFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    handleIncomingMenuFiles(files);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeMenuFile = (index: number) => {
    setMenuFiles((prev) => prev.filter((_, i) => i !== index));
    setMenuPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = (index: number) => {
    imagesTouchedRef.current = true;
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingMenuImage = (index: number) => {
    menuImagesTouchedRef.current = true;
    setExistingMenuImages((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
      menuPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews, menuPreviews]);

  useEffect(() => {
    if (initialData?.address !== undefined) {
      setFormData((prev) => ({ ...prev, address: initialData.address || "" }));
    }
  }, [initialData?.address]);

  const handleSave = async (publish: boolean = false) => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Place name is required";
    }
    if (!formData.category) {
      newErrors.category = "Category is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    if (publish && mediaFiles.length === 0 && existingImages.length === 0) {
      newErrors.media = "At least one media file (image/video) is required to publish";
    }
    if (!formData.type) {
      newErrors.type = "Location type is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setActiveTab(0); // Switch to Basic Info tab
      toast.error(t("places_admin.fill_required_fields") || "Please fill in all required fields.");
      return;
    }

    setErrors({});
    await onSave({
      ...formData,
      type: normalizePlaceType(formData),
      status: publish ? "Published" : "Draft",
      mediaFiles,
      existingImages,
      menuFiles,
      existingMenuImages,
    });
  };

  const { amount: entryCostAmount, type: entryCostType } = parseEntryCost(formData.entryCost);
  const { value: hikeTimeAmount, unit: hikeTimeUnit } = parseHikeTime(formData.hikeTime);

  const handleEntryCostAmountChange = (amount: string) => {
    const nextCost = composeEntryCost(amount, entryCostType);
    setFormData((prev) => ({ ...prev, entryCost: nextCost }));
  };

  const handleEntryCostTypeChange = (type: string) => {
    const nextCost = composeEntryCost(type === "Free" ? "" : (entryCostAmount || "10"), type);
    setFormData((prev) => ({ ...prev, entryCost: nextCost }));
  };

  const handleHikeTimeAmountChange = (val: string) => {
    const nextHike = composeHikeTime(val, hikeTimeUnit);
    setFormData((prev) => ({ ...prev, hikeTime: nextHike }));
  };

  const handleHikeTimeUnitChange = (unit: "mins" | "hours") => {
    const nextHike = composeHikeTime(hikeTimeAmount || "30", unit);
    setFormData((prev) => ({ ...prev, hikeTime: nextHike }));
  };

  const toggleService = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const updateOperatingHours = (
    day: string,
    patch: Partial<{ open: string; close: string; closed: boolean }>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: { ...prev.operatingHours[day], ...patch },
      },
    }));
  };

  const updateAccessibility = (
    key: keyof typeof formData.accessibility,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, [key]: value },
    }));
  };

  const servicesList = [
    { id: "Parking", key: "parking", icon: <Car size={14} /> },
    { id: "Restrooms", key: "restrooms", icon: <Users size={14} /> },
    { id: "Food Nearby", key: "food_nearby", icon: <Utensils size={14} /> },
    { id: "Guided Tour", key: "guided_tour", icon: <MapPin size={14} /> },
    { id: "Family Friendly", key: "family_friendly", icon: <Baby size={14} /> },
    { id: "Wifi", key: "wifi", icon: <Wifi size={14} /> },
    { id: "Pet Friendly", key: "pet_friendly", icon: <Dog size={14} /> },
  ];

  const isBasicInfoValid = formData.name.trim() !== "" && formData.category !== "" && formData.description.trim() !== "" && formData.address.trim() !== "";
  const hasBasicInfoErrors = !!(errors.name || errors.category || errors.description || errors.address);

  const isBusinessOrRestaurant = formData.type === "Business" || 
    categories.find((c: any) => c._id === formData.category)?.name?.toLowerCase() === "restaurant";

  const dynamicTabs = [
    { label: t("places_admin.tabs.basic_info") || (language === "es" ? "Información Básica" : "Basic Info"), icon: FileText, id: 0 },
    { label: t("places_admin.tabs.access") || (language === "es" ? "Acceso" : "Access"), icon: Compass, id: 1 },
    ...(isBusinessOrRestaurant ? [{ label: t("place.menu_and_prices") || (language === "es" ? "Menú y Precios" : "Menu & Prices"), icon: Utensils, id: 2 }] : []),
    { label: t("place.accessibility_features") || (language === "es" ? "Accesibilidad" : "Accessibility"), icon: Accessibility, id: 3 },
    { label: t("place.tips") || (language === "es" ? "Consejos Locales" : "Recommendations"), icon: Heart, id: 4 },
    { label: t("place.services_available") || (language === "es" ? "Servicios" : "Services"), icon: Grid, id: 5 },
  ];

  const currentTabIdx = dynamicTabs.findIndex((t) => t.id === activeTab);

  const checkScroll = () => {
    const container = scrollRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftArrow(scrollLeft > 2);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 2);
    }
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      checkScroll();
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScroll);
      }
      window.removeEventListener("resize", checkScroll);
    };
  }, [formData.type]);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
    setTimeout(checkScroll, 300);
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isBusinessOrRestaurant && activeTab === 2) {
      setActiveTab(0);
    }
  }, [isBusinessOrRestaurant, activeTab]);

  return (
    <div className="w-full h-full flex-1 flex flex-col overflow-hidden font-arial">
      {/* Navigation Header */}
      <div className="relative bg-gray-50/50 dark:bg-[#0e1424] border-b border-gray-200/80 dark:border-slate-800 px-4 flex items-center h-14 shrink-0">
        {/* Left Arrow & Fade */}
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 flex items-center pl-1 z-20 bg-gradient-to-r from-gray-50 dark:from-[#0e1424] via-gray-50/90 dark:via-[#0e1424]/90 to-transparent pr-8">
            <button
              type="button"
              onClick={() => {
                scrollRef.current?.scrollBy({ left: -150, behavior: "smooth" });
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto no-scrollbar scroll-smooth flex items-center h-full"
          onScroll={checkScroll}
        >
          <div className="flex items-center gap-1 bg-gray-200/50 dark:bg-slate-800/80 p-1 rounded-xl min-w-max relative select-none">
            {dynamicTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              
              // Validation indicator logic
              let indicator = null;
              if (tab.id === 0) {
                if (hasBasicInfoErrors) {
                  indicator = <AlertCircle size={12} className="text-red-500 animate-pulse flex-shrink-0" />;
                } else if (isBasicInfoValid) {
                  indicator = <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />;
                }
              }

              return (
                <button
                  key={tab.label}
                  ref={isSelected ? activeTabRef : null}
                  type="button"
                  onClick={() => {
                    if (tab.id > 0) {
                      const newErrors: Record<string, string> = {};
                      if (!formData.name.trim()) newErrors.name = "Place name is required";
                      if (!formData.category) newErrors.category = "Category is required";
                      if (!formData.description.trim()) newErrors.description = "Description is required";
                      if (!formData.address.trim()) newErrors.address = "Address is required";
                      if (mediaFiles.length === 0 && existingImages.length === 0) newErrors.media = "At least one media file (image/video) is required";
                      if (!formData.type) newErrors.type = "Location type is required";

                      if (Object.keys(newErrors).length > 0) {
                        setErrors(newErrors);
                        toast.error(t("places.fill_required_first"));
                        return;
                      }
                    }
                    setActiveTab(tab.id);
                  }}
                  className={`relative flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200 select-none whitespace-nowrap z-10 ${
                    isSelected
                      ? "text-blue-600 dark:text-amber-400 font-bold"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-white dark:bg-[#131b2e] border border-gray-200/80 dark:border-slate-700 shadow-sm rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <TabIcon size={14} className="flex-shrink-0" />
                  <span>{tab.label}</span>
                  {indicator}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Arrow & Fade */}
        {showRightArrow && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center pr-1 z-20 bg-gradient-to-l from-gray-50 dark:from-[#0e1424] via-gray-50/90 dark:via-[#0e1424]/90 to-transparent pl-8">
            <button
              type="button"
              onClick={() => {
                scrollRef.current?.scrollBy({ left: 150, behavior: "smooth" });
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition-all active:scale-95"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 0 && (
          <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("places_admin.place_name")} <span className="text-red-500">*</span></Label>
                <Input
                  placeholder={t("places_admin.place_name_placeholder")}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className={`w-full bg-white dark:bg-slate-900/60 dark:text-slate-100 rounded-lg h-9 text-sm italic ${errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-200 dark:border-slate-800"}`}
                />
                {errors.name && <p className="text-[11px] text-red-500 font-semibold">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("business_admin.category")} <span className="text-red-500">*</span>
                  {formData.type === "Business" && (
                    <span className="ml-2 text-[10px] bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">{t("places_admin.business_user")}</span>
                  )}
                </Label>
                <Select
                  value={formData.category || undefined}
                  onValueChange={(val) => {
                    setFormData({ ...formData, category: val });
                    if (errors.category) setErrors((prev) => ({ ...prev, category: "" }));
                  }}
                >
                  <SelectTrigger className={`w-full h-10 bg-white dark:bg-slate-900/60 dark:text-slate-100 rounded-lg text-sm italic ${errors.category ? "border-red-500 focus:ring-red-500" : "border-gray-200 dark:border-slate-800"}`}>
                    <div className="flex items-center gap-2">
                      {formData.category && (
                        <CategoryIcon
                          icon={
                            categories.find(
                              (c: any) => c._id === formData.category,
                            )?.icon
                          }
                          size={18}
                          color={
                            categories.find(
                              (c: any) => c._id === formData.category,
                            )?.color
                          }
                        />
                      )}
                      <SelectValue placeholder={formData.type === "Business" ? t("places_admin.choose_business_category") : t("places_admin.choose_category")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent position="popper" style={{ zIndex: 99999 }} className="bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100">
                    {categories.map((cat: any) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        <div className="flex items-center gap-2">
                          <CategoryIcon
                            icon={cat.icon}
                            size={20}
                            color={cat.color}
                          />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("places_admin.location_type")} <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => {
                    // Keep category — same list for Regular and Business
                    if (!isPlaceKind(val)) return;
                    typeTouchedRef.current = true;
                    setFormData({ ...formData, type: val });
                    if (errors.type) setErrors((prev) => ({ ...prev, type: "" }));
                  }}
                >
                  <SelectTrigger className={`w-full h-10 bg-white dark:bg-slate-900/60 dark:text-slate-100 rounded-lg text-sm italic ${errors.type ? "border-red-500 focus:ring-red-500" : "border-gray-200 dark:border-slate-800"}`}>
                    <SelectValue placeholder={t("places_admin.select_type")} />
                  </SelectTrigger>
                  <SelectContent position="popper" style={{ zIndex: 99999 }} className="bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100">
                    <SelectItem value="Regular">{t("places_admin.regular_location")}</SelectItem>
                    <SelectItem value="Business">{t("places_admin.business_user")}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-[11px] text-red-500 font-semibold">{errors.type}</p>}
              </div>
            </div>

             {/* Business Contact Info */}
            {formData.type === "Business" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-100 dark:border-slate-800 p-4 rounded-xl bg-gray-50/30 dark:bg-[#0e1424]">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t("places_admin.phone_number")}</Label>
                  <Input
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white dark:bg-slate-900/60 dark:text-slate-100 border-gray-200 dark:border-slate-800 text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t("places_admin.website_url")}</Label>
                  <Input
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="bg-white dark:bg-slate-900/60 dark:text-slate-100 border-gray-200 dark:border-slate-800 text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t("places_admin.instagram_username")}</Label>
                  <Input
                    placeholder="@username"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="bg-white dark:bg-slate-900/60 dark:text-slate-100 border-gray-200 dark:border-slate-800 text-xs h-9"
                  />
                </div>
              </div>
            )}

            {/* Operating Hours — shown only for Business type */}
            {formData.type === "Business" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{t("places_admin.operating_hours")}</Label>
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">{t("places_admin.business_user")}</span>
                </div>
                <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-800">
                  {Object.entries(formData.operatingHours).map(([day, hours]) => (
                    <div key={day} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${hours.closed ? "bg-gray-50 dark:bg-slate-900/40" : "bg-white dark:bg-[#131b2e]"}`}>
                      <span className={`w-24 text-xs font-semibold shrink-0 ${hours.closed ? "text-gray-400 dark:text-slate-500" : "text-gray-700 dark:text-slate-200"}`}>
                        {day}
                      </span>
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={hours.closed}
                          onChange={(e) => updateOperatingHours(day, { closed: e.target.checked })}
                          className="w-3.5 h-3.5 accent-red-500 cursor-pointer"
                        />
                        <span className="text-[11px] text-gray-500 dark:text-slate-400 select-none">{t("place.closed")}</span>
                      </label>
                      {!hours.closed ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => updateOperatingHours(day, { open: e.target.value })}
                            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-xs text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all cursor-pointer"
                          />
                          <span className="text-gray-400 text-xs font-bold">—</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => updateOperatingHours(day, { close: e.target.value })}
                            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-xs text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all cursor-pointer"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-red-400 font-semibold italic flex-1">{t("places_admin.closed_all_day")}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("places_admin.short_description")} <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder={t("places_admin.short_desc_placeholder")}
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
                }}
                className={`w-full bg-white dark:bg-slate-900/60 dark:text-slate-100 rounded-lg min-h-[120px]! text-sm resize-none italic ${errors.description ? "border-red-500 focus:ring-red-500" : "border-gray-200 dark:border-slate-800"}`}
              />
              {errors.description && <p className="text-[11px] text-red-500 font-semibold">{errors.description}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("for_business.steps.media")} <span className="text-red-500">*</span></Label>
              <div
                onClick={() => {
                  if (!isOptimizingMedia && !isSaving) fileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMedia(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMedia(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMedia(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMedia(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleIncomingMediaFiles(Array.from(e.dataTransfer.files));
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-6 bg-white dark:bg-[#0e1424] flex flex-col items-center justify-center gap-3 group transition-all cursor-pointer select-none ${
                  isDraggingMedia
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-400/30 scale-[1.01]"
                    : errors.media
                      ? "border-red-500 hover:border-red-600 bg-red-50/10 dark:bg-red-950/20"
                      : "border-gray-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-gray-50/50 dark:hover:bg-slate-900/60"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isDraggingMedia ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" : "bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-slate-700"
                }`}>
                  {isOptimizingMedia ? (
                    <Loader2 size={20} className="animate-spin text-blue-500" />
                  ) : (
                    <Upload size={20} />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-700 dark:text-slate-200">
                    {isOptimizingMedia
                      ? (language === "es" ? "Optimizando archivos..." : "Optimizing media for rapid upload...")
                      : isDraggingMedia
                        ? (language === "es" ? "Arrastra fotos o videos aquí" : "Drop photos or videos here")
                        : (language === "es" ? "Haz clic para subir o arrastra y suelta" : "Click to upload or drag and drop")}
                  </p>
                  <p className="text-[9px] text-gray-400 dark:text-slate-500 tracking-tight mt-0.5">
                    {language === "es"
                      ? "Imágenes y videos de hasta 200MB (arrastrar y soltar compatible)"
                      : "Images and videos up to 200MB (drag & drop supported)"}
                  </p>
                </div>
              </div>
              {errors.media && <p className="text-[11px] text-red-500 font-semibold">{errors.media}</p>}

              {/* Existing Images/Videos (from Server) */}
              {existingImages.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                    <span>{t("places_admin.existing_photos") || (language === "es" ? "Fotos y Videos Subidos" : "Uploaded Photos & Videos")} ({existingImages.length})</span>
                    <span className="text-[10px] text-gray-400 font-normal italic">
                      {language === "es"
                        ? "Arrastra o usa las flechas para reordenar • La 1.ª foto es la portada"
                        : "Drag or click arrows to reorder • 1st photo is Cover"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {existingImages.map((url, index) => {
                      const isVideo = isVideoUrl(url);
                      const isFirst = index === 0;
                      const isDragging = draggedExistingIdx === index;
                      const isOver = dragOverExistingIdx === index;

                      return (
                        <div
                          key={`existing-${url}`}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggedExistingIdx(index);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverExistingIdx(index);
                          }}
                          onDragEnd={() => {
                            setDraggedExistingIdx(null);
                            setDragOverExistingIdx(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedExistingIdx !== null && draggedExistingIdx !== index) {
                              moveExistingImage(draggedExistingIdx, index);
                            }
                            setDraggedExistingIdx(null);
                            setDragOverExistingIdx(null);
                          }}
                          className={`relative aspect-square rounded-xl overflow-hidden border transition-all group select-none cursor-grab active:cursor-grabbing ${
                            isDragging ? "opacity-30 border-blue-500 scale-95" : "border-gray-200 hover:border-blue-400"
                          } ${isOver && !isDragging ? "ring-2 ring-blue-500 scale-105 z-10" : ""}`}
                        >
                          {isVideo ? (
                            <video
                              key={`video-${url}`}
                              src={`${getImageUrl(url)}#t=0.1`}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              key={`img-${url}`}
                              src={getImageUrl(url)}
                              alt={`existing-${index}`}
                              draggable={false}
                              className="w-full h-full object-cover pointer-events-none"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null;
                                target.src = "/exploring-today.jpg";
                              }}
                            />
                          )}

                          {/* Cover badge for 1st image */}
                          {isFirst && (
                            <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-xs z-10">
                              Cover
                            </span>
                          )}

                          {/* Action Overlay Controls */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-1 z-20">
                            {index > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveExistingImage(index, index - 1);
                                }}
                                title="Move left"
                                className="p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-xs transition-transform hover:scale-110 cursor-pointer"
                              >
                                <ChevronLeft size={13} />
                              </button>
                            ) : <div />}

                            <div className="text-white/80 p-0.5">
                              <GripVertical size={16} />
                            </div>

                            {index < existingImages.length - 1 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveExistingImage(index, index + 1);
                                }}
                                title="Move right"
                                className="p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-xs transition-transform hover:scale-110 cursor-pointer"
                              >
                                <ChevronRight size={13} />
                              </button>
                            ) : <div />}
                          </div>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeExistingImage(index);
                            }}
                            title="Remove photo"
                            className="absolute top-1 right-1 bg-white/90 p-1 rounded-full shadow-sm text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                          >
                            <CloseIcon size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New Upload Previews (Blob URLs) */}
              {previews.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                    <span>New Uploads ({previews.length})</span>
                    <span className="text-[10px] text-gray-400 font-normal italic">Drag or click arrows to reorder</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {previews.map((url, index) => {
                      const file = mediaFiles[index];
                      const isVideo = file ? isVideoFile(file) : isVideoUrl(url);
                      const isFirst = existingImages.length === 0 && index === 0;
                      const isDragging = draggedNewIdx === index;
                      const isOver = dragOverNewIdx === index;

                      return (
                        <div
                          key={`new-${url}`}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggedNewIdx(index);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverNewIdx(index);
                          }}
                          onDragEnd={() => {
                            setDraggedNewIdx(null);
                            setDragOverNewIdx(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedNewIdx !== null && draggedNewIdx !== index) {
                              moveNewMedia(draggedNewIdx, index);
                            }
                            setDraggedNewIdx(null);
                            setDragOverNewIdx(null);
                          }}
                          className={`relative aspect-square rounded-xl overflow-hidden border transition-all group select-none cursor-grab active:cursor-grabbing bg-gray-900 ${
                            isDragging ? "opacity-30 border-blue-500 scale-95" : "border-gray-200 hover:border-blue-400"
                          } ${isOver && !isDragging ? "ring-2 ring-blue-500 scale-105 z-10" : ""}`}
                        >
                          {isVideo ? (
                            <video
                              key={`new-video-${url}`}
                              src={`${url}#t=0.1`}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              key={`new-img-${url}`}
                              src={url}
                              alt={`preview-${index}`}
                              draggable={false}
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          )}

                          {isFirst && (
                            <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-xs z-10">
                              Cover
                            </span>
                          )}

                          {file && !isFirst && (
                            <span className="absolute bottom-1 left-1 bg-black/75 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-medium tracking-tight pointer-events-none z-10">
                              {isVideo ? "🎬 " : ""}{formatFileSize(file.size)}
                            </span>
                          )}

                          {/* Action Overlay Controls */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-1 z-20">
                            {index > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveNewMedia(index, index - 1);
                                }}
                                title="Move left"
                                className="p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-xs transition-transform hover:scale-110 cursor-pointer"
                              >
                                <ChevronLeft size={13} />
                              </button>
                            ) : <div />}

                            <div className="text-white/80 p-0.5">
                              <GripVertical size={16} />
                            </div>

                            {index < previews.length - 1 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveNewMedia(index, index + 1);
                                }}
                                title="Move right"
                                className="p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-xs transition-transform hover:scale-110 cursor-pointer"
                              >
                                <ChevronRight size={13} />
                              </button>
                            ) : <div />}
                          </div>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMedia(index);
                            }}
                            title="Remove photo"
                            className="absolute top-1 right-1 bg-white/90 p-1 rounded-full shadow-sm text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer disabled:pointer-events-none"
                          >
                            <CloseIcon size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Input
                type="file"
                ref={fileInputRef}
                multiple
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">{t("places_admin.address") || "Address"} <span className="text-red-500">*</span></Label>
                {initialData?.position && (
                  <div className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono font-semibold">
                    GPS: {initialData.position.lat?.toFixed(5) || "—"}, {initialData.position.lng?.toFixed(5) || "—"}
                  </div>
                )}
              </div>
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  placeholder={
                    isFetchingAddress ? (t("common.loading") || "Fetching address...") : (t("places_admin.full_address") || "Full address")
                  }
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({ ...formData, address: e.target.value });
                    if (errors.address) setErrors((prev) => ({ ...prev, address: "" }));
                  }}
                  className={`bg-white dark:bg-slate-900/60 dark:text-slate-100 rounded-lg h-10 pl-10 text-sm italic ${isFetchingAddress ? "animate-pulse text-gray-400" : ""} ${errors.address ? "border-red-500 focus:ring-red-500" : "border-gray-200 dark:border-slate-800"}`}
                  disabled={isFetchingAddress}
                />
                {isFetchingAddress && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {errors.address && <p className="text-[11px] text-red-500 font-semibold">{errors.address}</p>}
            </div>

            {/* Conditionally Rendered New Fields */}
            {formData.category && (
              <div className="grid grid-cols-2 gap-4">
                {/* Schedules — hidden for Business type (uses Operating Hours instead) */}
                {formData.type !== "Business" && (
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-medium">{t("place.schedules") || "Schedules"}</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id="always-open"
                      checked={formData.schedules === "Always open"}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          schedules: checked ? "Always open" : "",
                        })
                      }
                    />
                    <Label
                      htmlFor="always-open"
                      className="text-sm cursor-pointer"
                    >
                      {t("place.always_open") || "Always open"}
                    </Label>
                  </div>
                  {formData.schedules !== "Always open" && (
                    <TimeRangePicker
                      value={formData.schedules}
                      onChange={(val) =>
                        setFormData({ ...formData, schedules: val })
                      }
                    />
                  )}
                </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("place.atmosphere") || "Atmosphere"}</Label>
                  <Input
                    placeholder='e.g., "Relaxing"'
                    value={formData.atmosphere}
                    onChange={(e) =>
                      setFormData({ ...formData, atmosphere: e.target.value })
                    }
                    className="w-full bg-white dark:bg-slate-900/60 dark:text-slate-100 border-gray-200 dark:border-slate-800 rounded-lg h-9 text-sm italic"
                  />
                </div>

                {categories
                  .find((c: any) => c._id === formData.category)
                  ?.name?.toLowerCase() !== "restaurant" && (
                    <>
                      {/* Entry Cost */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">{t("place.entry_cost") || "Entry Cost"}</Label>
                          {formData.entryCost && (
                            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400 px-2 py-0.5 rounded">
                              {formData.entryCost}
                            </span>
                          )}
                        </div>
                        <div className="flex rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 h-9 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                          {entryCostType !== "Free" && (
                            <span className="flex items-center pl-3 text-xs font-bold text-gray-500 dark:text-slate-400 select-none">
                              $
                            </span>
                          )}
                          <input
                            type="text"
                            placeholder={entryCostType === "Free" ? (t("places_admin.free_entry") || "Free") : "10"}
                            value={entryCostType === "Free" ? "" : entryCostAmount}
                            disabled={entryCostType === "Free"}
                            onChange={(e) => handleEntryCostAmountChange(e.target.value)}
                            className={`w-full bg-transparent ${entryCostType === "Free" ? "pl-3" : "pl-1.5"} pr-2 text-sm italic text-gray-900 dark:text-slate-100 focus:outline-none disabled:bg-gray-50 dark:disabled:bg-slate-900/40 disabled:text-gray-400`}
                          />
                          <select
                            value={entryCostType}
                            onChange={(e) => handleEntryCostTypeChange(e.target.value)}
                            className="border-l border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 px-2.5 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <option value="/ person">/ person</option>
                            <option value="/ vehicle">/ vehicle</option>
                            <option value="/ group">/ group</option>
                            <option value="flat">flat fee</option>
                            <option value="Free">{t("places_admin.free_entry") || "Free entry"}</option>
                          </select>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">
                          e.g., $10 / person, $15 / vehicle, or Free
                        </p>
                      </div>

                      {/* Difficulty */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">{t("place.difficulty") || "Difficulty"}</Label>
                        <Select
                          value={formData.difficulty || undefined}
                          onValueChange={(val) =>
                            setFormData({ ...formData, difficulty: val })
                          }
                        >
                          <SelectTrigger className="w-full h-9 bg-white dark:bg-slate-900/60 dark:text-slate-100 border-gray-200 dark:border-slate-800 rounded-lg text-sm italic">
                            <SelectValue placeholder={t("places_admin.select_difficulty") || "Select difficulty"} />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            style={{ zIndex: 99999 }}
                            className="bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100"
                          >
                            <SelectItem value="Easy">{t("place.easy") || "Easy"}</SelectItem>
                            <SelectItem value="Moderate">{t("place.medium") || "Moderate"}</SelectItem>
                            <SelectItem value="Hard">{t("place.hard") || "Hard"}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">
                          Trail or terrain difficulty level
                        </p>
                      </div>

                      {/* Walking Time */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">{t("place.walking_time") || "Walking Time"}</Label>
                          {formData.hikeTime && (
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded">
                              {formData.hikeTime}
                            </span>
                          )}
                        </div>
                        <div className="flex rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 h-9 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                          <input
                            type="text"
                            placeholder="e.g. 45"
                            value={hikeTimeAmount}
                            onChange={(e) => handleHikeTimeAmountChange(e.target.value)}
                            className="w-full bg-transparent px-3 text-sm italic text-gray-900 dark:text-slate-100 focus:outline-none"
                          />
                          <select
                            value={hikeTimeUnit}
                            onChange={(e) => handleHikeTimeUnitChange(e.target.value as "mins" | "hours")}
                            className="border-l border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 px-2.5 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <option value="mins">{t("places_admin.minutes") || "Minutes"}</option>
                            <option value="hours">{t("places_admin.hours") || "Hours"}</option>
                          </select>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">
                          Approx. time to walk/hike (e.g. 45 mins, 1.5 hours)
                        </p>
                      </div>
                    </>
                  )}
              </div>
            )}
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-[#0e1424] p-5 rounded-xl border border-gray-200 dark:border-slate-800 space-y-4">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  {t("places_admin.access_description") || (language === "es" ? "Descripción de Acceso" : "Access Description")}
                </Label>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  {language === "es"
                    ? "Escribe cómo llegar aquí (transporte público, taxi, notas de estacionamiento). Sé conciso."
                    : "Write how to get here (public transport, taxi, parking notes). Keep it simple."}
                </p>
              </div>
              <Textarea
                placeholder={language === "es"
                  ? "Ej: Toma la Línea 2 del Metro hasta la Estación Central. Salida B."
                  : "e.g., Take Metro Line 2 to Central Station. Exit B. Taxi cost approx $5 from downtown."}
                value={formData.accessDescription}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accessDescription: e.target.value,
                  })
                }
                className="min-h-[140px] border-gray-100 dark:border-slate-800 italic text-sm bg-gray-50 dark:bg-slate-900/60 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-[#0e1424] p-5 rounded-xl border border-gray-200 dark:border-slate-800 space-y-4">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  Menu & Prices Photos
                </Label>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Upload images of your menu, price list, or product listings.
                </p>
              </div>

              <div
                onClick={() => {
                  if (!isSaving) menuFileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMenu(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMenu(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMenu(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMenu(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleIncomingMenuFiles(Array.from(e.dataTransfer.files));
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-6 bg-white dark:bg-[#131b2e] flex flex-col items-center justify-center gap-3 transition-all cursor-pointer select-none ${
                  isDraggingMenu
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-400/30 scale-[1.01]"
                    : "border-gray-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-gray-50/50 dark:hover:bg-slate-900/60"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isDraggingMenu ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" : "bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-400"
                }`}>
                  <Upload size={20} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-700 dark:text-slate-200">
                    {isDraggingMenu ? "Drop menu photos here" : "Click to upload menu photos or drag and drop"}
                  </p>
                  <p className="text-[9px] text-gray-400 dark:text-slate-500 tracking-tight mt-0.5">
                    Images and PDF up to 20MB (drag & drop supported)
                  </p>
                </div>
              </div>

              {/* Existing Menu Images (from Server) */}
              {existingMenuImages.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                    <span>Existing Menu Photos ({existingMenuImages.length})</span>
                    <span className="text-[10px] text-gray-400 font-normal italic">Drag or click arrows to reorder</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {existingMenuImages.map((url, index) => (
                      <div
                        key={`existing-menu-${url}`}
                        className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 group select-none transition-all cursor-grab active:cursor-grabbing"
                      >
                        <img
                          key={`img-menu-${url}`}
                          src={getImageUrl(url)}
                          alt={`existing-menu-${index}`}
                          draggable={false}
                          className="w-full h-full object-cover pointer-events-none"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = "/exploring-today.jpg";
                          }}
                        />
                        {/* Action Overlay Controls */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-1 z-20">
                          {index > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveExistingMenuImage(index, index - 1);
                              }}
                              title="Move left"
                              className="p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-xs transition-transform hover:scale-110 cursor-pointer"
                            >
                              <ChevronLeft size={13} />
                            </button>
                          ) : <div />}

                          <div className="text-white/80 p-0.5">
                            <GripVertical size={16} />
                          </div>

                          {index < existingMenuImages.length - 1 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveExistingMenuImage(index, index + 1);
                              }}
                              title="Move right"
                              className="p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-xs transition-transform hover:scale-110 cursor-pointer"
                            >
                              <ChevronRight size={13} />
                            </button>
                          ) : <div />}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeExistingMenuImage(index);
                          }}
                          title="Remove photo"
                          className="absolute top-1 right-1 bg-white/90 p-1 rounded-full shadow-sm text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                        >
                          <CloseIcon size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Upload Previews */}
              {menuPreviews.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                    <span>New Menu Photos ({menuPreviews.length})</span>
                    <span className="text-[10px] text-gray-400 font-normal italic">Drag or click arrows to reorder</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {menuPreviews.map((url, index) => (
                      <div
                        key={`new-menu-${url}`}
                        className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 group select-none transition-all cursor-grab active:cursor-grabbing"
                      >
                        <img
                          key={`new-menu-img-${url}`}
                          src={url}
                          alt={`menu-preview-${index}`}
                          draggable={false}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        {/* Action Overlay Controls */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-1 z-20">
                          {index > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveNewMenuMedia(index, index - 1);
                              }}
                              title="Move left"
                              className="p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-xs transition-transform hover:scale-110 cursor-pointer"
                            >
                              <ChevronLeft size={13} />
                            </button>
                          ) : <div />}

                          <div className="text-white/80 p-0.5">
                            <GripVertical size={16} />
                          </div>

                          {index < menuPreviews.length - 1 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveNewMenuMedia(index, index + 1);
                              }}
                              title="Move right"
                              className="p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-xs transition-transform hover:scale-110 cursor-pointer"
                            >
                              <ChevronRight size={13} />
                            </button>
                          ) : <div />}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMenuFile(index);
                          }}
                          title="Remove photo"
                          className="absolute top-1 right-1 bg-white/90 p-1 rounded-full shadow-sm text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                        >
                          <CloseIcon size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Input
                type="file"
                ref={menuFileInputRef}
                multiple
                className="hidden"
                accept="image/*"
                onChange={handleMenuFileChange}
              />
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-[#0e1424] p-6 rounded-xl border border-gray-200 dark:border-slate-800 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="wheelchair"
                    checked={formData.accessibility.wheelchair}
                    onCheckedChange={(val) =>
                      updateAccessibility("wheelchair", !!val)
                    }
                  />
                  <Label
                    htmlFor="wheelchair"
                    className="text-sm font-medium text-gray-700 dark:text-slate-200 flex items-center gap-2"
                  >
                    {language === "es" ? "Acceso en Silla de Ruedas" : "Wheelchair Access"}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="children"
                    checked={formData.accessibility.children}
                    onCheckedChange={(val) =>
                      updateAccessibility("children", !!val)
                    }
                  />
                  <Label
                    htmlFor="children"
                    className="text-sm font-medium text-gray-700 dark:text-slate-200 flex items-center gap-2"
                  >
                    {language === "es" ? "Apto para Niños" : "Children"}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pets"
                    checked={formData.accessibility.pets}
                    onCheckedChange={(val) =>
                      updateAccessibility("pets", !!val)
                    }
                  />
                  <Label
                    htmlFor="pets"
                    className="text-sm font-medium text-gray-700 dark:text-slate-200 flex items-center gap-2"
                  >
                    {language === "es" ? "Mascotas Permitidas" : "Pets"}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="senior"
                    checked={formData.accessibility.senior}
                    onCheckedChange={(val) =>
                      updateAccessibility("senior", !!val)
                    }
                  />
                  <Label
                    htmlFor="senior"
                    className="text-sm font-medium text-gray-700 dark:text-slate-200 flex items-center gap-2"
                  >
                    {language === "es" ? "Acceso Adultos Mayores" : "Senior Access"}
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-800 dark:text-slate-200">
                  {language === "es" ? "Notas (opcional)" : "Notes (optional)"}
                </Label>
                <Textarea
                  placeholder={language === "es" ? "Información adicional de accesibilidad..." : "Additional accessibility information..."}
                  value={formData.accessibility.notes}
                  onChange={(e) => updateAccessibility("notes", e.target.value)}
                  className="min-h-[100px] border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 dark:text-slate-100 italic text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 4 && (
          <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-[#0e1424] p-6 rounded-xl border border-gray-200 dark:border-slate-800 space-y-4">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  {language === "es" ? "Qué Llevar / Consejos" : "What to Take / Tips"}
                </Label>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                  {language === "es"
                    ? "Agua, calzado cómodo, protector solar, chaqueta ligera..."
                    : "Water, comfortable shoes, sunscreen, light jacket..."}
                </p>
              </div>
              <Textarea
                placeholder={language === "es" ? "Lista de artículos recomendados para llevar..." : "List recommended items to bring..."}
                value={formData.tips}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tips: e.target.value,
                  })
                }
                className="min-h-[160px] border-gray-100 dark:border-slate-800 italic text-sm bg-gray-50 dark:bg-slate-900/60 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
          </div>
        )}

        {activeTab === 5 && (
          <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-1 mb-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                {language === "es" ? "Los servicios aparecerán en una cuadrícula compacta." : "Services will appear in a compact grid."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {servicesList.map((service) => {
                const label = (() => {
                  const trans = t(`services.${service.key}`);
                  if (trans && trans !== `services.${service.key}`) return trans;
                  if (language === "es") {
                    switch (service.key) {
                      case "parking": return "ESTACIONAMIENTO";
                      case "restrooms": return "BAÑOS";
                      case "food_nearby": return "COMIDA CERCA";
                      case "guided_tour": return "TOUR GUIADO";
                      case "family_friendly": return "FAMILIAR";
                      case "wifi": return "WIFI";
                      case "pet_friendly": return "PET FRIENDLY";
                      default: return service.id;
                    }
                  }
                  return service.id;
                })();

                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${formData.services.includes(service.id)
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300"
                      : "bg-white dark:bg-slate-900/60 border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 text-gray-700 dark:text-slate-200"
                      }`}
                  >
                    <Checkbox
                      checked={formData.services.includes(service.id)}
                      className="rounded-full"
                    />
                    <div className="space-y-1">
                      <div className="">{service.icon}</div>
                      <p className="text-xs leading-tight font-bold">{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upload & Saving Banner */}
      {isSaving && (
        <div className="mx-6 mb-2 p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Loader2 size={18} className="animate-spin text-blue-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-blue-950">
              {mediaFiles.length > 0
                ? mediaFiles.some((f) => isVideoFile(f))
                  ? "Uploading video and saving place..."
                  : "Uploading media and saving place..."
                : "Saving changes..."}
            </p>
            <p className="text-[11px] text-blue-700">
              {mediaFiles.length > 0
                ? "Please keep this window open while the upload finishes."
                : "Please wait a moment while your changes are saved."}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-gray-50 dark:bg-[#0e1424] border-t border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 h-10 bg-red-500 hover:bg-red-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            {t("common.cancel") || "Cancel"}
          </Button>
          {!initialData?.isNew && onDelete && (
            <Button
              variant="outline"
              type="button"
              onClick={onDelete}
              disabled={isSaving}
              className="px-5 h-10 border-red-200 dark:border-rose-900/60 text-red-500 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/30 font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
            >
              {t("common.delete") || "Delete"}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentTabIdx > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setActiveTab(dynamicTabs[currentTabIdx - 1].id)}
              className="px-5 h-10 border-gray-200 dark:border-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <ArrowLeft size={14} /> {t("common.previous") || "Back"}
            </Button>
          )}

          {(initialData?.isNew !== false || initialData?.status === "Draft") && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSaving || isOptimizingMedia}
              className="px-5 h-10 border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 hover:border-amber-400 font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {isSaving
                ? (t("common.saving") || "Saving...")
                : (t("common.save_as_draft") || "Save as Draft")}
            </Button>
          )}

          {(initialData?.isNew === false || currentTabIdx === dynamicTabs.length - 1) && (
            <Button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving || isOptimizingMedia}
              className="px-5 h-10 bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-green-100 flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {isSaving
                ? mediaFiles.length > 0
                  ? mediaFiles.some((f) => isVideoFile(f))
                    ? t("common.uploading") || "Uploading Video..."
                    : t("common.uploading") || "Uploading..."
                  : t("common.saving") || "Saving..."
                : initialData?.isNew === false
                  ? t("common.save_changes") || "Save Changes"
                  : t("common.save_and_publish") || "Save & Publish"}
            </Button>
          )}

          {currentTabIdx < dynamicTabs.length - 1 && (
            <Button
              type="button"
              onClick={() => {
                if (activeTab === 0) {
                  const newErrors: Record<string, string> = {};
                  if (!formData.name.trim()) newErrors.name = "Place name is required";
                  if (!formData.category) newErrors.category = "Category is required";
                  if (!formData.description.trim()) newErrors.description = "Description is required";
                  if (!formData.address.trim()) newErrors.address = "Address is required";
                  if (mediaFiles.length === 0 && existingImages.length === 0) newErrors.media = "At least one media file (image/video) is required";
                  if (!formData.type) newErrors.type = "Location type is required";

                  if (Object.keys(newErrors).length > 0) {
                    setErrors(newErrors);
                    toast.error(t("places.fill_required_first"));
                    return;
                  }
                }
                setActiveTab(dynamicTabs[currentTabIdx + 1].id);
              }}
              className="px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5"
            >
              {t("common.next") || "Next"} <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
