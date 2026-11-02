"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, FileText, MapPin, UploadCloud, X } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { useCreateMapMutation, useUpdateMapMutation } from "@/redux/features/map/mapApi";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type FormValues = {
  name: string;
  description: string;
  price: number;
  features: string;
  tips: string;
  image?: FileList;
};

export default function CreateMapModal({
  open,
  setOpen,
  initialData,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialData?: any;
}) {
  const { t } = useLanguage();
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"Draft" | "Published">("Draft");
  const fileRef = useRef<HTMLInputElement | null>(null);
  
  const [createMap, { isLoading: isCreating }] = useCreateMapMutation();
  const [updateMap, { isLoading: isUpdating }] = useUpdateMapMutation();

  const isEditing = !!initialData;
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          name: initialData.name,
          description: initialData.description,
          price: initialData.price,
          features: initialData.features?.join(", "),
          tips: initialData.recommendations?.tips || "",
        });
        setStatus(initialData.status === "Published" ? "Published" : "Draft");

        // Resolve Image URL
        let imagePath = null;
        if (initialData.images && Array.isArray(initialData.images) && initialData.images.length > 0) {
          imagePath = initialData.images[0];
        } else if (typeof initialData.images === 'string') {
          imagePath = initialData.images;
        } else if (initialData.image) {
          imagePath = initialData.image;
        }
        
        setPreview(imagePath ? getImageUrl(imagePath) : null);
      } else {
        reset({ name: "", description: "", price: 0, features: "", tips: "" });
        setStatus("Draft");
        setPreview(null);
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = async (data: FormValues) => {
    const mapData = {
      name: data.name,
      description: data.description,
      price: Number(data.price) || 0,
      features: data.features ? data.features.split(",").map((f) => f.trim()).filter(Boolean) : [],
      recommendations: { tips: data.tips || "" },
      status: status,
      isActive: status === "Published",
      isPaid: true,
      rating: initialData?.rating ?? 0,
      totalReview: initialData?.totalReview ?? 0,
    };

    const formData = new FormData();
    formData.append("data", JSON.stringify(mapData));
    
    if (data.image && data.image.length > 0) {
      formData.append("images", data.image[0]);
    }

    try {
      if (isEditing) {
        await updateMap({ id: initialData._id, data: formData }).unwrap();
        toast.success(t("maps_admin.updated_successfully") || "Map updated successfully");
      } else {
        await createMap(formData).unwrap();
        toast.success(t("maps_admin.created_successfully") || "Map created successfully");
      }
      reset();
      setPreview(null);
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to save map");
    }
  };

  const handleImageChange = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const removeImage = () => {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="min-w-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-xl bg-white dark:bg-[#131b2e] dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold dark:text-slate-100">
            {isEditing ? (t("maps_admin.edit_map") || "Edit Map") : (t("maps_admin.create_new_map") || "Create New Map")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4">
          {/* Name */}
          <div className="space-y-2">
            <Label className="ml-1 dark:text-slate-200">{t("maps_admin.map_name")}</Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E9E9E]" />
              <Input
                placeholder={t("maps_admin.placeholder_name")}
                {...register("name", { required: true })}
                className="pl-12 py-6 bg-gray-100/80 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="ml-1 dark:text-slate-200">{t("maps_admin.description")}</Label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-5 h-5 text-[#9E9E9E]" />
              <Textarea
                placeholder={t("places_admin.description_placeholder")}
                {...register("description")}
                className="pl-12 bg-gray-100/80 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label className="ml-1 dark:text-slate-200">{t("maps_admin.price")}</Label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E9E9E]" />
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register("price", { min: 0 })}
                className="pl-12 py-6 bg-gray-100/80 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label className="ml-1 dark:text-slate-200">{t("maps_admin.features")}</Label>
            <Input
              placeholder={t("places_admin.features_placeholder")}
              {...register("features")}
              className="py-6 bg-gray-100/80 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Status (Draft / Published) */}
          <div className="space-y-2">
            <Label className="ml-1 dark:text-slate-200">{t("offers_admin.status") || "Status"}</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "Draft" | "Published")}
              className="w-full h-12 px-4 bg-gray-100/80 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="Draft">{t("places_admin.draft") || "Draft"}</option>
              <option value="Published">{t("places_admin.published") || "Published"}</option>
            </select>
          </div>

          {/* Tips */}
          <div className="space-y-2">
            <Label className="ml-1 dark:text-slate-200">{t("maps_admin.tips")}</Label>
            <Textarea
              placeholder={t("places_admin.tips_placeholder_map")}
              {...register("tips")}
              className="pl-12 bg-gray-100/80 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Image upload - updated field */}
          <div className="space-y-2">
            <Label className="ml-1 dark:text-slate-200">
              {t("offers_admin.offer_photo")} {!isEditing && <span className="text-red-500">*</span>}
            </Label>

            <div
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl bg-gray-100/60 dark:bg-slate-900/40 hover:bg-gray-100 dark:hover:bg-slate-900/80 transition flex flex-col items-center justify-center text-center p-8"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="preview"
                  className="max-h-40 object-contain rounded-md"
                />
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-gray-400 dark:text-slate-500 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {t("maps_admin.upload_hint")}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {t("maps_admin.upload_format")}
                  </p>
                </>
              )}
            </div>

            <Input
              type="file"
              accept="image/png, image/jpeg"
              className="hidden"
              {...register("image", { required: !isEditing })}
              ref={(e) => {
                register("image", { required: !isEditing }).ref(e);
                fileRef.current = e;
              }}
              onChange={(e) => {
                register("image", { required: !isEditing }).onChange(e);
                const file = e.target.files?.[0];
                if (file) handleImageChange(file);
              }}
            />

            {preview && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={removeImage}
                className="flex items-center gap-1"
              >
                <X size={14} />
                {t("maps_admin.remove_image")}
              </Button>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold h-12"
          >
            {isLoading ? "Saving..." : (isEditing ? "Update Map" : "Create Map")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
