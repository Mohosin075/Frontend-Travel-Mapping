// "use client";

// import { useForm } from "react-hook-form";
// import {
//   useCreateCategoryMutation,
//   useUpdateCategoryMutation,
// } from "@/redux/features/category/categoryApi";
// import { useState, useEffect } from "react";
// import { toast } from "sonner";

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

// interface AddCategoryDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   initialData?: any;
//   isView?: boolean;
// }

// interface FormData {
//   categoryName: string;
//   color: string;
//   icon: string;
// }

// const colorPalette = [
//   "#8b1d5a",
//   "#d81b60",
//   "#e53935",
//   "#fb8c00",
//   "#fdd835",
//   "#7cb342",
//   "#2e7d32",
//   "#00796b",
//   "#1565c0",
//   "#283593",
//   "#6a1b9a",
//   "#5d4037",
//   "#ec407a",
//   "#ff7043",
//   "#ffca28",
//   "#ffeb3b",
//   "#9ccc65",
//   "#26a69a",
//   "#00acc1",
//   "#1e88e5",
//   "#5c6bc0",
//   "#8e24aa",
//   "#8d6e63",
//   "#bdbdbd",
//   "#9e9e9e",
//   "#616161",
//   "#000000",
// ];

// export function AddCategoryDialog({
//   open,
//   onOpenChange,
//   initialData,
//   isView = false,
// }: AddCategoryDialogProps) {
//   const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
//     defaultValues: {
//       color: "#3b82f6",
//       icon: "🔘",
//     },
//   });

//   const selectedColor = watch("color");
//   const selectedIcon = watch("icon");

//   const [createCategory, { isLoading: isCreating }] =
//     useCreateCategoryMutation();
//   const [updateCategory, { isLoading: isUpdating }] =
//     useUpdateCategoryMutation();

//   const isEditing = !!initialData;
//   const isLoading = isCreating || isUpdating;

//   useEffect(() => {
//     if (open) {
//       if (initialData) {
//         reset({
//           categoryName: initialData.name,
//           color: initialData.color,
//           icon: initialData.icon,
//         });
//       } else {
//         reset({ categoryName: "", color: "#3b82f6", icon: "🔘" });
//       }
//     }
//   }, [open, initialData, reset]);

//   const onSubmit = async (data: FormData) => {
//     if (isView) return; // Prevent submission in View Mode

//     try {
//       const payload = {
//         name: data.categoryName,
//         color: data.color,
//         icon: data.icon,
//         status: initialData?.status || "Active",
//       };

//       if (isEditing) {
//         await updateCategory({ id: initialData._id, data: payload }).unwrap();
//         toast.success("Category updated successfully");
//       } else {
//         await createCategory(payload).unwrap();
//         toast.success("Category created successfully");
//       }
//       onOpenChange(false);
//     } catch (error: any) {
//       toast.error(
//         error?.data?.message ||
//           error?.message ||
//           `Failed to ${isEditing ? "update" : "create"} category`,
//       );
//       console.error(
//         `Failed to ${isEditing ? "update" : "create"} category:`,
//         error,
//       );
//     }
//   };

//   const getDialogTitle = () => {
//     if (isView) return "View Category";
//     if (isEditing) return "Update Category";
//     return "Add New Category";
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-md overflow-visible">
//         <DialogHeader>
//           <DialogTitle className="text-xl font-semibold">
//             {getDialogTitle()}
//           </DialogTitle>
//         </DialogHeader>

//         <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
//           {/* Category Name */}
//           <div>
//             <Label className="text-sm font-medium text-gray-700">
//               Category Name
//             </Label>
//             <Input
//               placeholder="e.g., Parks & Nature"
//               className="mt-1 disabled:opacity-80 disabled:cursor-not-allowed"
//               disabled={isView}
//               {...register("categoryName", { required: true })}
//             />
//           </div>

//           {/* Color */}
//           <div>
//             <Label className="text-sm font-medium text-gray-700">
//               Color (for map pins)
//             </Label>

//             {/* Selected Color Preview */}
//             <div className="flex items-center gap-2 mt-2 mb-3">
//               <div
//                 className="w-10 h-10 rounded-md border border-gray-300"
//                 style={{ backgroundColor: selectedColor }}
//               />
//               <Input
//                 className="flex-1 font-mono disabled:opacity-80 disabled:cursor-not-allowed"
//                 disabled={isView}
//                 {...register("color")}
//               />
//             </div>

//             {/* Color Palette */}
//             {!isView && (
//               <div className="grid grid-cols-12 gap-1">
//                 {colorPalette.map((color) => (
//                   <div
//                     key={color}
//                     onClick={() => setValue("color", color)}
//                     className={`w-6 h-6 cursor-pointer border
//                     ${
//                       selectedColor === color
//                         ? "border-black ring-2 ring-gray-400"
//                         : "border-gray-200"
//                     }`}
//                     style={{ backgroundColor: color }}
//                   />
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Icon */}
//           <div className="relative">
//             <Label className="text-sm font-medium text-gray-700">
//               Icon (emoji)
//             </Label>

//             <div className="flex items-center gap-2 mt-1">
//               <div
//                 className={`w-10 h-10 rounded-md border border-gray-300 flex items-center justify-center text-xl`}
//               >
//                 {selectedIcon}
//               </div>

//               <Input
//                 className="flex-1 disabled:opacity-80 disabled:cursor-not-allowed"
//                 disabled={isView}
//                 {...register("icon")}
//               />
//             </div>

//             {!isView && (
//               <p className="text-xs text-gray-500 mt-1">
//                 Type or paste an emoji or unicode symbol
//               </p>
//             )}
//           </div>

//           {/* Buttons */}
//           <div className="flex justify-end gap-3 pt-4">
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() => onOpenChange(false)}
//               className="border-gray-300"
//             >
//               {isView ? "Close" : "Cancel"}
//             </Button>

//             {!isView && (
//               <Button
//                 type="submit"
//                 disabled={isLoading}
//                 className="bg-purple-600 hover:bg-purple-700 text-white"
//               >
//                 {isLoading
//                   ? "Saving..."
//                   : isEditing
//                     ? "Update Category"
//                     : "Add Category"}
//               </Button>
//             )}
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }

"use client";

import { useForm } from "react-hook-form";
import {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} from "@/redux/features/category/categoryApi";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getImageUrl } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  isView?: boolean;
}

interface FormData {
  categoryName: string;
  color: string;
  icon: string; // Iconify icon name OR base64 data URL for custom uploads
  iconType: "iconify" | "custom"; // track which kind is active
}

const colorPalette = [
  "#8b1d5a",
  "#d81b60",
  "#e53935",
  "#fb8c00",
  "#fdd835",
  "#7cb342",
  "#2e7d32",
  "#00796b",
  "#1565c0",
  "#283593",
  "#6a1b9a",
  "#5d4037",
  "#ec407a",
  "#ff7043",
  "#ffca28",
  "#ffeb3b",
  "#9ccc65",
  "#26a69a",
  "#00acc1",
  "#1e88e5",
  "#5c6bc0",
  "#8e24aa",
  "#8d6e63",
  "#bdbdbd",
  "#9e9e9e",
  "#616161",
  "#000000",
];

const POPULAR_ICONS = [
  "mdi:home",
  "mdi:silverware-fork-knife",
  "mdi:glass-cocktail",
  "mdi:flag",
  "mdi:mailbox",
  "mdi:hospital-building",
  "mdi:parking",
  "mdi:help-circle",
  "mdi:camera",
  "mdi:wrench",
  "mdi:walk",
  "mdi:shield-star",
  "mdi:map-marker",
];

const OTHER_ICONS = [
  "mdi:castle",
  "mdi:terrain",
  "mdi:church",
  "mdi:clock-outline",
  "mdi:fire",
  "mdi:tree",
  "mdi:recycle",
  "mdi:account-group",
  "mdi:lighthouse",
  "mdi:snake",
  "mdi:arrow-right-circle",
  "mdi:cog",
  "mdi:wifi",
  "mdi:leaf",
  "mdi:earth",
];

const ACCEPTED_FORMATS = ".svg,.png,.jpg,.jpeg,.webp,.gif";
const MAX_FILE_SIZE_MB = 2;

export function AddCategoryDialog({
  open,
  onOpenChange,
  initialData,
  isView = false,
}: AddCategoryDialogProps) {
  const { t } = useLanguage();
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      color: "#3b82f6",
      icon: "mdi:map-marker",
      iconType: "iconify",
    },
  });

  const selectedColor = watch("color");
  const selectedIcon = watch("icon");
  const iconType = watch("iconType");

  const [showMoreIcons, setShowMoreIcons] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Custom icon upload state
  const [customIconPreview, setCustomIconPreview] = useState<string | null>(
    null,
  );
  const [customIconName, setCustomIconName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active tab: "iconify" | "custom"
  const [activeTab, setActiveTab] = useState<"iconify" | "custom">("iconify");

  const [createCategory, { isLoading: isCreating }] =
    useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] =
    useUpdateCategoryMutation();

  const isEditing = !!initialData;
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (open) {
      if (initialData) {
        const isCustom =
          initialData.icon?.startsWith("http") ||
          initialData.icon?.startsWith("data:") ||
          initialData.icon?.includes("/") ||
          initialData.icon?.includes(".");
        reset({
          categoryName: initialData.name,
          color: initialData.color,
          icon: initialData.icon,
          iconType: isCustom ? "custom" : "iconify",
        });
        if (isCustom) {
          setCustomIconPreview(getImageUrl(initialData.icon));
          setCustomIconName(initialData.iconFileName || "custom-icon");
          setActiveTab("custom");
        } else {
          setActiveTab("iconify");
          setCustomIconPreview(null);
          setCustomIconName("");
        }
      } else {
        reset({
          categoryName: "",
          color: "#3b82f6",
          icon: "mdi:map-marker",
          iconType: "iconify",
        });
        setActiveTab("iconify");
        setCustomIconPreview(null);
        setCustomIconName("");
      }
      setShowMoreIcons(false);
      setSearchQuery("");
      setUploadError("");
      setSelectedFile(null);
    }
  }, [open, initialData, reset]);

  // Search icons via Iconify API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(searchQuery)}&limit=30`,
        );
        const data = await res.json();
        setSearchResults(data.icons || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError("");

    if (!file) return;

    // Validate size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setUploadError(`File too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    // Validate type
    const validTypes = [
      "image/svg+xml",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError("Unsupported format. Use SVG, PNG, JPG, WEBP, or GIF.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCustomIconPreview(dataUrl);
      setCustomIconName(file.name);
      setSelectedFile(file);
      setValue("icon", dataUrl);
      setValue("iconType", "custom");
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleRemoveCustomIcon = () => {
    setCustomIconPreview(null);
    setCustomIconName("");
    setSelectedFile(null);
    setValue("icon", "mdi:map-marker");
    setValue("iconType", "iconify");
    setActiveTab("iconify");
  };

  const handleSelectIconifyIcon = (iconName: string) => {
    setValue("icon", iconName);
    setValue("iconType", "iconify");
    setCustomIconPreview(null);
    setCustomIconName("");
  };

  const onSubmit = async (data: FormData) => {
    if (isView) return;
    try {
      const formData = new FormData();

      // 1. Add image if it's a custom icon and a new file was selected
      if (data.iconType === "custom" && selectedFile) {
        formData.append("images", selectedFile);
      }

      // 2. Prepare text data for the 'data' field
      const categoryData = {
        name: data.categoryName,
        color: data.color,
        status: initialData?.status || "Active",
        // If it's Iconify, send the icon name.
        // If it's custom and we have a new file, omit the icon field so backend uses the uploaded file.
        // If it's custom but NO new file, send the old URL.
        icon: data.iconType === "iconify" ? data.icon : (selectedFile ? undefined : initialData?.icon),
        iconType: data.iconType,
        iconFileName: data.iconType === "custom" ? customIconName : undefined,
      };

      formData.append("data", JSON.stringify(categoryData));

      if (isEditing) {
        await updateCategory({ id: initialData._id, data: formData }).unwrap();
        toast.success(t("categories_admin.updated_successfully") || "Category updated successfully");
      } else {
        await createCategory(formData).unwrap();
        toast.success(t("categories_admin.created_successfully") || "Category created successfully");
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          error?.message ||
          `Failed to ${isEditing ? "update" : "create"} category`,
      );
    }
  };

  const getDialogTitle = () => {
    if (isView) return t("common.view_more");
    if (isEditing) return t("categories_admin.add_category");
    return t("categories_admin.add_category");
  };

  // Renders the active icon (Iconify or custom image)
  const renderIconPreview = (size = 18) => {
    if (iconType === "custom" && customIconPreview) {
      return (
        <img
          src={customIconPreview}
          alt="custom icon"
          style={{ width: size, height: size, objectFit: "contain" }}
        />
      );
    }
    return (
      <Icon
        icon={selectedIcon || "mdi:map-marker"}
        width={size}
        height={size}
        color="#fff"
      />
    );
  };

  // Circular icon button for Iconify icons
  const IconButton = ({ iconName }: { iconName: string }) => {
    const isSelected = iconType === "iconify" && selectedIcon === iconName;
    return (
      <button
        type="button"
        title={iconName}
        disabled={isView}
        onClick={() => handleSelectIconifyIcon(iconName)}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
          ${isSelected ? "ring-2 ring-offset-1 ring-yellow-500 scale-110" : "hover:scale-110"}
          ${isView ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
        `}
        style={{ backgroundColor: isSelected ? selectedColor : "#4b5563" }}
      >
        <Icon icon={iconName} width={20} height={20} color="#ffffff" />
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-visible max-h-[90vh] overflow-y-auto bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
          {/* Category Name */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {t("categories_admin.category_name")}
            </Label>
            <Input
              placeholder={t("categories_admin.category_name_placeholder")}
              className="mt-1 bg-white dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 disabled:opacity-80 disabled:cursor-not-allowed"
              disabled={isView}
              {...register("categoryName", { required: true })}
            />
          </div>

          {/* Color Palette */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">{t("categories_admin.color")}</Label>
            <div className="grid grid-cols-12 gap-1 mt-2">
              {colorPalette.map((color) => (
                <div
                  key={color}
                  onClick={() => !isView && setValue("color", color)}
                  className={`w-6 h-6 cursor-pointer border transition-all
                    ${selectedColor === color ? "border-black dark:border-white ring-2 ring-gray-400 dark:ring-slate-500 scale-110" : "border-gray-200 dark:border-slate-700 hover:scale-105"}
                    ${isView ? "cursor-not-allowed" : ""}
                  `}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Icon Section */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">
              {t("categories_admin.icon")}
            </Label>

            {/* Tab switcher */}
            {!isView && (
              <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-slate-900/70 rounded-lg p-1 w-fit border border-transparent dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("iconify")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === "iconify"
                      ? "bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                  }`}
                >
                  🔍 {t("categories_admin.browse_icons")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("custom")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === "custom"
                      ? "bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                  }`}
                >
                  📁 {t("categories_admin.upload_custom")}
                </button>
              </div>
            )}

            {/* ── TAB: Iconify Icons ── */}
            {(activeTab === "iconify" || isView) && (
              <div className="space-y-4">
                {/* Popular Icons */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    {t("categories_admin.popular_icons")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_ICONS.map((icon) => (
                      <IconButton key={icon} iconName={icon} />
                    ))}
                  </div>
                </div>

                {/* Other Icons */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    {t("categories_admin.other_icons")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {OTHER_ICONS.map((icon) => (
                      <IconButton key={icon} iconName={icon} />
                    ))}
                  </div>
                </div>

                {/* Más iconos */}
                {!isView && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-900/60 text-gray-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      onClick={() => setShowMoreIcons((prev) => !prev)}
                    >
                      {showMoreIcons ? t("categories_admin.less_icons") : t("categories_admin.more_icons")}
                    </Button>

                    {showMoreIcons && (
                      <div className="border border-gray-200 dark:border-slate-800 rounded-lg p-3 bg-gray-50 dark:bg-slate-900/60 space-y-2">
                        <Input
                          autoFocus
                          placeholder={t("categories_admin.search_icons_placeholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100"
                        />
                        {isSearching && (
                          <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-2">
                            {t("categories_admin.searching")}
                          </p>
                        )}
                        {!isSearching && searchResults.length > 0 && (
                          <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pt-1">
                            {searchResults.map((icon) => (
                              <IconButton key={icon} iconName={icon} />
                            ))}
                          </div>
                        )}
                        {!isSearching &&
                          searchQuery &&
                          searchResults.length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-2">
                              {t("categories_admin.no_icons_found")}
                            </p>
                          )}
                        {!searchQuery && (
                          <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-1">
                            {t("categories_admin.type_to_search_icons")}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── TAB: Custom Upload ── */}
            {activeTab === "custom" && !isView && (
              <div className="space-y-3">
                {/* Drop zone / upload area */}
                {!customIconPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 flex items-center justify-center transition-all">
                      <Icon
                        icon="mdi:cloud-upload-outline"
                        width={24}
                        height={24}
                        className="text-gray-400 group-hover:text-purple-500 dark:text-slate-400 dark:group-hover:text-purple-300"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                        {t("categories_admin.click_to_upload_icon")}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        {t("categories_admin.custom_icon_format_hint")}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Preview of uploaded icon */
                  <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 bg-gray-50 dark:bg-slate-900/40">
                    {/* Icon preview on colored circle */}
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                      style={{ backgroundColor: selectedColor }}
                    >
                      <img
                        src={customIconPreview}
                        alt="custom"
                        className="w-8 h-8 object-contain"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                        {customIconName}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                        <Icon icon="mdi:check-circle" width={12} />
                        {t("categories_admin.custom_icon_ready")}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Replace button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1"
                      >
                        <Icon icon="mdi:pencil" width={12} />
                        {t("categories_admin.replace")}
                      </button>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={handleRemoveCustomIcon}
                        className="text-xs px-2 py-1 rounded-md border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all flex items-center gap-1"
                      >
                        <Icon icon="mdi:trash-can-outline" width={12} />
                        {t("categories_admin.remove")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {uploadError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <Icon icon="mdi:alert-circle-outline" width={14} />
                    {uploadError}
                  </p>
                )}

                {/* Supported formats badge list */}
                <div className="flex flex-wrap gap-1.5">
                  {["SVG", "PNG", "JPG", "WEBP", "GIF"].map((fmt) => (
                    <span
                      key={fmt}
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-mono border border-transparent dark:border-slate-700"
                    >
                      .{fmt.toLowerCase()}
                    </span>
                  ))}
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FORMATS}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Selected icon preview bar */}
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-900/40 rounded-lg border border-gray-100 dark:border-slate-800">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: selectedColor }}
            >
              {renderIconPreview(18)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-slate-400">{t("categories_admin.selected_icon")}</p>
              <p className="text-xs font-mono text-gray-700 dark:text-slate-200 truncate">
                {iconType === "custom"
                  ? customIconName || "custom-icon"
                  : selectedIcon}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                iconType === "custom"
                  ? "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                  : "bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
              }`}
            >
              {iconType === "custom" ? t("categories_admin.custom") : "Iconify"}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isView ? t("common.close") : t("common.cancel")}
            </Button>
            {!isView && (
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {isLoading
                  ? t("common.loading")
                  : isEditing
                    ? t("categories_admin.update_category")
                    : t("categories_admin.add_category")}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
