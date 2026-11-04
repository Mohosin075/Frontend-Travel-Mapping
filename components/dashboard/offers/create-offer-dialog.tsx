"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getImageUrl } from "@/lib/utils";
import { useGetBusinessesQuery } from "@/redux/features/business/businessApi";
import {
  useCreateOfferMutation,
  useUpdateOfferMutation,
} from "@/redux/features/offer/offerApi";
import { useGetPlacesQuery } from "@/redux/features/place/placeApi";
import { ChevronDown, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { toast } from "sonner";

interface CreateOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

interface FormData {
  title: string;
  business: string;
  place: string;
  description: string;
  discountType: string;
  discountValue: string;
  bogoSecondType: string;
  validFrom: string;
  validUntil?: string;
  noExpiration: boolean;
  maxRedemptions: string;
  totalRedemptionLimit?: string;
  redemptionFrequency: string;
  redemptionDuration: string;
  buttonLabel: string;
  status: string;
}

export function CreateOfferDialog({
  open,
  onOpenChange,
  initialData,
}: CreateOfferDialogProps) {
  const { t } = useLanguage();
  const isEdit = !!initialData;
  const { register, handleSubmit, reset, watch, control, setValue } =
    useForm<FormData>({
      defaultValues: {
        noExpiration: false,
      },
    });
  const [createOffer, { isLoading: isCreating }] = useCreateOfferMutation();
  const [updateOffer, { isLoading: isUpdating }] = useUpdateOfferMutation();
  const { data: businessesRes } = useGetBusinessesQuery({ limit: 100 });
  const businesses = businessesRes?.data || [];

  const { data: placeData, isLoading: placeLoading } = useGetPlacesQuery({ limit: 1000 });
  const places = useMemo(() => {
    return placeData?.data || [];
  }, [placeData]);

  const noExpiration = watch("noExpiration");
  const discountType = watch("discountType");
  const bogoSecondType = watch("bogoSecondType");

  // ── Image state — managed manually, NOT via register ─────────────────────
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const combinedOptions = useMemo(() => {
    const busOpts = businesses.map((b: any) => ({
      _id: b._id,
      name: b.name,
      type: "business" as const,
    }));
    const plcOpts = places.map((p: any) => ({
      _id: p._id,
      name: p.name,
      type: "place" as const,
    }));
    return [...busOpts, ...plcOpts];
  }, [businesses, places]);

  // ── Searchable dropdown state ───────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedId = watch("business");

  const selectedEntity = combinedOptions.find(
    (item: any) => item._id === selectedId,
  );

  const filteredOptions = combinedOptions.filter((item: any) =>
    (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ── Redemption rules state ────────────────────────────────────────────────
  const [ruleInput, setRuleInput] = useState("");
  const [ruleError, setRuleError] = useState("");
  const [rules, setRules] = useState<string[]>([]);

  const handleAddRule = () => {
    const trimmed = ruleInput.trim();
    if (!trimmed) {
      setRuleError("Please enter a redemption rule before adding.");
      return;
    }
    setRules((prev) => [...prev, trimmed]);
    setRuleInput("");
    setRuleError("");
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Populate form when editing ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return; // Only run when dialog is open

    if (initialData) {
      // Check for both place and business in initialData
      const placeId = initialData.place?._id || initialData.place;
      const businessId = initialData.business?._id || initialData.business;
      const id = placeId || businessId || "";

      reset({
        title: initialData.title,
        business: id || "",
        place: placeId ? (id || "") : "",
        description: initialData.description,
        discountType: initialData.discountType,
        discountValue: initialData.discountValue?.toString() || "",
        bogoSecondType: initialData.bogoSecondType || "",
        validFrom: initialData.validFrom
          ? new Date(initialData.validFrom).toISOString().split("T")[0]
          : "",
        validUntil: initialData.validUntil
          ? new Date(initialData.validUntil).toISOString().split("T")[0]
          : "",
        noExpiration: initialData.noExpiration || false,
        maxRedemptions: initialData.maxRedemptions?.toString() || "",
        totalRedemptionLimit:
          initialData.totalRedemptionLimit?.toString() || "",
        redemptionFrequency: initialData.redemptionFrequency || "daily",
        redemptionDuration:
          (initialData.redemptionDuration && Number(initialData.redemptionDuration) < 1440
            ? initialData.redemptionDuration
            : 15
          ).toString(),
        buttonLabel: initialData.buttonLabel || "Redeem Offer",
        status: initialData.status || "Active",
      });
      setPreview(getImageUrl(initialData.images || initialData.photo));
      setPhotoFile(null);
      setRules(
        Array.isArray(initialData.redemptionRules)
          ? initialData.redemptionRules
          : initialData.redemptionRules
            ? [initialData.redemptionRules]
            : [],
      );
    } else {
      reset({
        title: "",
        business: "",
        place: "",
        description: "",
        discountType: "",
        discountValue: "",
        bogoSecondType: "",
        validFrom: "",
        validUntil: "",
        noExpiration: false,
        maxRedemptions: "",
        totalRedemptionLimit: "",
        redemptionFrequency: "daily",
        redemptionDuration: "15",
        buttonLabel: "Redeem Offer",
        status: "Active",
      });
      setPreview(null);
      setPhotoFile(null);
      setRules([]);
      setRuleInput("");
      setRuleError("");
    }
  }, [initialData, reset, open, places, businesses]);

  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  const openFileWindow = () => fileRef.current?.click();

  const handleIncomingFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("offers_admin.select_valid_image"));
      return;
    }
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  // Store the actual File object in state so it's always available in onSubmit
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleIncomingFile(file);
    }
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setPhotoFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async (data: FormData) => {
    try {
      const offerData: any = {
        title: data.title,
        description: data.description,
        discountType: data.discountType,
        discountValue:
          data.discountType === "BOGO" && data.bogoSecondType !== "percentage"
            ? 100
            : Number(data.discountValue) || 0,
        ...(data.discountType === "BOGO"
          ? { bogoSecondType: data.bogoSecondType || "free" }
          : {}),
        validFrom: new Date(data.validFrom).toISOString(),
        validUntil: data.noExpiration
          ? null
          : data.validUntil
            ? new Date(data.validUntil).toISOString()
            : null,
        noExpiration: data.noExpiration,
        maxRedemptions: Number(data.maxRedemptions) || 0,
        totalRedemptionLimit: Number(data.totalRedemptionLimit) || null,
        redemptionFrequency: data.redemptionFrequency || "daily",
        redemptionDuration: Number(data.redemptionDuration) || 15,
        redemptionRules: rules,
        buttonLabel: data.buttonLabel,
        status: data.status || "Active",
        ...(isEdit && {
          redemptionsCount: initialData.redemptionsCount }),
      };

      // Set the correct ID field based on selection type
      const selectedOption = combinedOptions.find((o) => o._id === data.business);
      if (selectedOption?.type === "business") {
        offerData.business = data.business;
      } else {
        offerData.place = data.business;
      }

      const formDataPayload = new FormData();
      formDataPayload.append("data", JSON.stringify(offerData));

      // Append the file directly from state — not from react-hook-form
      if (photoFile) {
        formDataPayload.append("images", photoFile);
      }

      if (isEdit) {
        await updateOffer({
          id: initialData._id,
          data: formDataPayload,
        }).unwrap();
        toast.success(t("offers_admin.updated_successfully") || "Offer updated successfully!");
      } else {
        await createOffer(formDataPayload).unwrap();
        toast.success(t("offers_admin.created_successfully") || "Offer created successfully!");
      }

      onOpenChange(false);
      reset();
      setPreview(null);
      setPhotoFile(null);
      setRules([]);
      setRuleInput("");
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          `Failed to ${isEdit ? "update" : "create"} offer`,
      );
      console.error(`Failed to ${isEdit ? "update" : "create"} offer:`, error);
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {isEdit ? "Update Offer" : "Create New Offer"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          {/* Offer Photo */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2 block">
              Offer Photo
            </Label>

            <div
              onClick={openFileWindow}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingPhoto(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingPhoto(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingPhoto(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingPhoto(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleIncomingFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer relative ${
                isDraggingPhoto
                  ? "border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 ring-2 ring-blue-400/30 scale-[1.01]"
                  : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 bg-gray-50/50 dark:bg-slate-900/40"
              }`}
            >
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="preview"
                    className="mx-auto max-h-48 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 text-gray-400 dark:text-slate-500" size={32} />
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {t("offers_admin.upload_hint")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t("offers_admin.upload_format")}</p>
                </>
              )}

              {/* Plain file input — no register() spread to avoid ref/onChange conflicts */}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                ref={fileRef}
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Offer Title */}
          <div>
            <Label
              htmlFor="title"
              className="text-sm font-medium text-gray-700 dark:text-slate-200"
            >
              {t("offers_admin.offer_title")}
            </Label>
            <Input
              id="title"
              placeholder={t("offers_admin.title_placeholder")}
              className="mt-1 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              {...register("title", { required: t("offers_admin.title") + " is required" })}
            />
          </div>

          {/* Searchable location picker (business or place — same submit logic) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                {t("offers_admin.choose_location")}
              </Label>
            </div>

            {/* Hidden input keeps react-hook-form happy */}
            <input
              type="hidden"
              {...register("business", {
                required: t("offers_admin.choose_location"),
              })}
            />

            <div className="relative">
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <span
                  className={selectedEntity ? "text-gray-900 dark:text-slate-100" : "text-gray-400 dark:text-slate-500"}
                >
                  {selectedEntity ? selectedEntity.name : t("offers_admin.search_by_name")}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 dark:text-slate-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 rounded-md shadow-lg overflow-hidden">
                  {/* Search input */}
                  <div className="p-2 border-b border-gray-100 dark:border-slate-800">
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("offers_admin.type_name_to_search")}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>

                  {/* Options list */}
                  <ul className="max-h-48 overflow-y-auto">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setValue("business", "");
                          setSearchQuery("");
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                      >
                        {t("offers_admin.clear_selection")}
                      </button>
                    </li>

                    {filteredOptions.length === 0 ? (
                      <li className="px-3 py-3 text-sm text-gray-400 dark:text-slate-500 text-center">
                        {t("offers_admin.no_locations")}
                      </li>
                    ) : (
                      filteredOptions.map((item: any) => (
                        <li key={item._id}>
                          <button
                            type="button"
                            onClick={() => {
                              setValue("business", item._id, {
                                shouldValidate: true,
                              });
                              setSearchQuery("");
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-blue-50 dark:hover:bg-slate-800/60 ${
                              selectedId === item._id
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                                : "text-gray-700 dark:text-slate-200"
                            }`}
                          >
                            {item.name}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Offer Description */}
          <div>
            <Label
              htmlFor="description"
              className="text-sm font-medium text-gray-700 dark:text-slate-200"
            >
              {t("offers_admin.offer_description") || "Offer Description"}
            </Label>
            <textarea
              id="description"
              placeholder={t("offers_admin.offer_description_placeholder") || "Describe the offer..."}
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900/60 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
              rows={4}
              {...register("description", {
                required: "Description is required",
              })}
            />
          </div>

          {/* Redemption Frequency & Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="maxRedemptions"
                className="text-sm font-medium text-gray-700 dark:text-slate-200"
              >
                {t("offers_admin.redemptions_per_user")}
              </Label>
              <Input
                id="maxRedemptions"
                type="number"
                min={0}
                placeholder={t("offers_admin.e_g_1") || "e.g., 1"}
                className="mt-1 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                {...register("maxRedemptions", {
                  required: "Redemptions per user is required",
                })}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {t("offers_admin.redemptions_per_user_hint") || "How many times one customer can use this offer"}
              </p>
            </div>

            {/* Redemption Frequency */}
            <div>
              <Label
                htmlFor="redemptionFrequency"
                className="text-sm font-medium text-gray-700 dark:text-slate-200"
              >
                {t("offers_admin.redemption_frequency") || "Redemption Frequency"}
              </Label>
              <select
                id="redemptionFrequency"
                className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-900/60 text-gray-900 dark:text-slate-100"
                {...register("redemptionFrequency")}
              >
                <option value="daily">{t("offers_admin.freq_daily") || "Daily (Every 24 hours)"}</option>
                <option value="weekly">{t("offers_admin.freq_weekly") || "Weekly (Every 7 days)"}</option>
                <option value="monthly">{t("offers_admin.freq_monthly") || "Monthly (Every 30 days)"}</option>
                <option value="once">{t("offers_admin.freq_once") || "Once (Single use per customer)"}</option>
              </select>

              {(watch("redemptionFrequency") || "daily") === "daily" && (
                <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Customers can redeem this offer once every 24 hours
                </p>
              )}
              {watch("redemptionFrequency") === "weekly" && (
                <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Customers can redeem this offer once every 7 days
                </p>
              )}
              {watch("redemptionFrequency") === "monthly" && (
                <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Customers can redeem this offer once every 30 days
                </p>
              )}
              {watch("redemptionFrequency") === "once" && (
                <p className="mt-1.5 text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                  Each customer can only redeem this offer once
                </p>
              )}
            </div>
          </div>

          {/* Countdown Timer Duration for Verification */}
          <div className="rounded-2xl border border-yellow-200/80 dark:border-yellow-800/60 bg-yellow-50/50 dark:bg-yellow-950/20 p-4">
            <div className="flex items-center justify-between mb-1.5">
              <Label
                htmlFor="redemptionDuration"
                className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1.5"
              >
                <span>⏱️</span>
                <span>{t("offers_admin.countdown_timer_label") || "Countdown Timer Duration (Minutes)"}</span>
              </Label>
              <span className="text-xs font-black text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/60 px-2 py-0.5 rounded-md">
                {watch("redemptionDuration") || 15} {t("offers_admin.minutes") || "mins"}
              </span>
            </div>

            <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
              {t("offers_admin.countdown_timer_desc") ||
                "Duration of the active timer shown to staff when a customer redeems this offer (e.g., 15 minutes for staff verification)."}
            </p>

            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              {[5, 10, 15, 30, 45, 60, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setValue("redemptionDuration", mins.toString())}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    Number(watch("redemptionDuration")) === mins
                      ? "bg-[#fabf13] text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                id="redemptionDuration"
                type="number"
                min={1}
                max={1440}
                placeholder="15"
                className="text-xs bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 font-bold max-w-[140px]"
                {...register("redemptionDuration", {
                  required: "Countdown timer duration is required",
                  min: { value: 1, message: "Minimum 1 minute" },
                })}
              />
              <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                {t("offers_admin.minutes_custom") || "minutes (custom duration)"}
              </span>
            </div>
          </div>

          <div>
            <Label
              htmlFor="totalRedemptionLimit"
              className="text-sm font-medium text-gray-700 dark:text-slate-200"
            >
              {t("offers_admin.total_redemption_limit")}
            </Label>
            <Input
              id="totalRedemptionLimit"
              type="number"
              min={0}
              placeholder={t("offers_admin.leave_empty_unlimited")}
              className="mt-1 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              {...register("totalRedemptionLimit")}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              {t("offers_admin.total_limit_hint")}
            </p>
          </div>

          {/* Discount Type and Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="discountType"
                className="text-sm font-medium text-gray-700 dark:text-slate-200"
              >
                {t("offers_admin.discount_type")}
              </Label>
              <select
                id="discountType"
                className="w-full mt-1 px-3 py-1 border border-gray-300 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900/60 text-gray-900 dark:text-slate-100"
                {...register("discountType", { required: "Type is required" })}
                onChange={(e) => {
                  void register("discountType").onChange(e);
                  setValue("bogoSecondType", "");
                  if (e.target.value === "BOGO" || e.target.value === "Free item") {
                    setValue("discountValue", "");
                  }
                }}
              >
                <option value="">{t("offers_admin.select_discount_type") || "Select discount type"}</option>
                <option value="Percentage">{t("offers_admin.percentage") || "Percentage (%)"}</option>
                <option value="Flat">{t("offers_admin.flat_amount") || "Flat Amount ($)"}</option>
                <option value="Fixed Price">{t("offers_admin.fixed_price") || "Fixed Price (bundle total $)"}</option>
                <option value="BOGO">{t("offers_admin.bogo") || "BOGO (Buy 1 Get 1)"}</option>
                <option value="Free item">{t("offers_admin.free_item") || "Free Item"}</option>
              </select>
            </div>

            {discountType !== "BOGO" && discountType !== "Free item" && (
              <div>
                <Label
                  htmlFor="discountValue"
                  className="text-sm font-medium text-gray-700 dark:text-slate-200"
                >
                  {discountType === "Fixed Price"
                    ? "Total Bundle Price ($)"
                    : discountType === "Flat"
                    ? "Flat Amount ($)"
                    : "Discount Value"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min={0}
                  placeholder={discountType === "Fixed Price" ? "e.g. 25" : "20"}
                  className="mt-1 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  {...register("discountValue", {
                    required:
                      discountType !== "BOGO" && discountType !== "Free item"
                        ? "Discount value is required"
                        : false,
                    min: { value: 0, message: "Value cannot be negative" },
                  })}
                />
                {discountType === "Fixed Price" && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Enter the total fixed price for the bundle offer (e.g. 2 pizzas + 1 donut for $25).
                  </p>
                )}
              </div>
            )}
          </div>

          {discountType === "BOGO" && (
            <div className="space-y-3 rounded-lg border border-yellow-200 dark:border-yellow-500/20 bg-yellow-50/70 dark:bg-[#fabf13]/10 p-4">
              <div>
                <Label
                  htmlFor="bogoSecondType"
                  className="text-sm font-medium text-gray-700 dark:text-slate-200"
                >
                  {t("offers_admin.second_item")}
                </Label>
                <select
                  id="bogoSecondType"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("bogoSecondType", {
                    required:
                      discountType === "BOGO"
                        ? t("offers_admin.second_item_discount")
                        : false,
                  })}
                >
                  <option value="">{t("offers_admin.second_item_discount")}</option>
                  <option value="free">{t("offers_admin.second_item_free")}</option>
                  <option value="percentage">{t("offers_admin.second_item_pct")}</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {t("offers_admin.bogo_hint")}
                </p>
              </div>
              {bogoSecondType === "percentage" && (
                <div>
                  <Label
                    htmlFor="discountValue"
                    className="text-sm font-medium text-gray-700 dark:text-slate-200"
                  >
                    {t("offers_admin.pct_off_second_item") || "% off second item"}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min={1}
                    max={100}
                    placeholder="e.g., 50"
                    className="mt-1 bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                    {...register("discountValue", {
                      required:
                        bogoSecondType === "percentage"
                          ? "Enter 1–100% off the second item"
                          : false,
                      min: { value: 1, message: "Must be at least 1%" },
                      max: { value: 100, message: "Must be at most 100%" },
                    })}
                  />
                </div>
              )}
            </div>
          )}

          {/* Valid From and Valid Until */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="validFrom"
                className="text-sm font-medium text-gray-700 dark:text-slate-200"
              >
                {t("offers_admin.valid_from") || "Valid From"}
              </Label>
              <Input
                id="validFrom"
                type="date"
                className="mt-1 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100"
                {...register("validFrom", {
                  required: "Start date is required",
                })}
              />
            </div>

            <div className="flex items-end gap-2">
              {!noExpiration && (
                <div>
                  <Label
                    htmlFor="validUntil"
                    className="text-sm font-medium text-gray-700 dark:text-slate-200"
                  >
                    {t("offers_admin.valid_until")}
                  </Label>
                  <Input
                    id="validUntil"
                    type="date"
                    className="mt-1 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100"
                    {...register("validUntil", {
                      required: !noExpiration ? "End date is required" : false,
                    })}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <Controller
                  name="noExpiration"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="noExpiration"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label
                  htmlFor="noExpiration"
                  className="text-sm font-medium text-gray-700 dark:text-slate-200 cursor-pointer"
                >
                  {t("offers_admin.no_expiration") || "No Expiration"}
                </Label>
              </div>
            </div>
          </div>

          {/* Redemption Rules */}
          <div>
            <Label
              htmlFor="redemptionRules"
              className="text-sm font-medium text-gray-700 dark:text-slate-200"
            >
              {t("offers_admin.redemption_rules") || "Redemption Rules"}
            </Label>

            {/* Input row */}
            <div className="flex gap-2 mt-1">
              <Input
                id="redemptionRules"
                value={ruleInput}
                onChange={(e) => {
                  setRuleInput(e.target.value);
                  if (e.target.value.trim()) setRuleError("");
                }}
                placeholder={t("offers_admin.redemption_rule_placeholder") || "e.g., One per user per visit"}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
              <Button
                type="button"
                onClick={handleAddRule}
                className="self-start bg-primary hover:bg-primary/80 text-black font-semibold px-4 py-2 h-auto"
              >
                {t("common.add")}
              </Button>
            </div>

            {/* Inline error */}
            {ruleError && (
              <p className="text-sm text-red-500 mt-1">{ruleError}</p>
            )}

            {/* Added rules list */}
            {rules.length > 0 && (
              <ul className="mt-3 space-y-2">
                {rules.map((rule, index) => (
                  <li
                    key={index}
                    className="flex items-start justify-between gap-2 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-md px-3 py-2"
                  >
                    <span className="text-sm text-gray-700 dark:text-slate-200 leading-snug">
                      <span className="font-medium text-gray-400 dark:text-slate-500 mr-2">
                        {index + 1}.
                      </span>
                      {rule}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(index)}
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors mt-0.5"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Button Label */}
          <div>
            <Label
              htmlFor="buttonLabel"
              className="text-sm font-medium text-gray-700 dark:text-slate-200"
            >
              {t("offers_admin.button_label") || "Button Label"}
            </Label>
            <Input
              id="buttonLabel"
              placeholder={t("offers_admin.redeem_offer") || "Redeem Offer"}
              className="mt-1 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              {...register("buttonLabel")}
            />
          </div>

          {isEdit && (
            <div>
              <Label
                htmlFor="status"
                className="text-sm font-medium text-gray-700 dark:text-slate-200"
              >
                {t("offers_admin.status")}
              </Label>
              <select
                id="status"
                className="w-full mt-1 px-3 py-1 border border-gray-300 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900/60 text-gray-900 dark:text-slate-100"
                {...register("status")}
              >
                <option value="Active">{t("offers_admin.active")}</option>
                <option value="Expired">{t("offers_admin.expired")}</option>
                <option value="Paused">{t("offers_admin.paused")}</option>
              </select>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t("common.cancel")}
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/80 text-black dark:text-slate-950 font-bold min-w-32 flex items-center justify-center gap-2"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              )}
              {isLoading
                ? t("common.saving")
                : isEdit
                ? (t("offers_admin.update_offer") || "Update Offer")
                : (t("offers_admin.save_offer") || "Save Offer")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
