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
import {
  useCreateSubscriptionPlanMutation,
  useUpdateSubscriptionPlanMutation,
} from "@/redux/features/subscription/subscriptionApi";
import { Loader2, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { toast } from "sonner";

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: any;
}

export function AddSubscriptionModal({
  isOpen,
  onClose,
  plan,
}: AddSubscriptionModalProps) {
  const { t } = useLanguage();
  const [createSubscriptionPlan, { isLoading: isCreating }] =
    useCreateSubscriptionPlanMutation();
  const [updateSubscriptionPlan, { isLoading: isUpdating }] =
    useUpdateSubscriptionPlanMutation();

  const isLoading = isCreating || isUpdating;

  const defaultFormData = {
    name: "",
    description: "",
    price: "",
    interval: "month" as "month" | "year" | "lifetime",
    features: [""],
    currency: "USD",
  };

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || "",
        description: plan.description || "",
        price: plan.price?.toString() || "",
        interval: plan.interval || "month",
        features:
          plan.features && plan.features.length > 0 ? plan.features : [""],
        currency: plan.currency || "USD",
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [plan, isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData((prev) => ({ ...prev, features: newFeatures }));
  };

  const addFeature = () => {
    setFormData((prev) => ({ ...prev, features: [...prev.features, ""] }));
  };

  const removeFeature = (index: number) => {
    if (formData.features.length === 1) return;
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, features: newFeatures }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      features: formData.features.filter((f) => f.trim() !== ""),
    };

    try {
      if (plan) {
        const res = await updateSubscriptionPlan({
          id: plan._id,
          data: payload,
        }).unwrap();
        if (res.success || res.data) {
          toast.success(t("subscriptions_admin.updated_successfully") || "Subscription plan updated successfully!");
          onClose();
        }
      } else {
        const res = await createSubscriptionPlan(payload).unwrap();
        if (res.success || res.data) {
          toast.success(t("subscriptions_admin.created_successfully") || "Subscription plan created successfully!");
          onClose();
        }
      }
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          t("subscriptions_admin.failed_to_save") ||
          `Failed to ${plan ? "update" : "create"} subscription plan`
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase text-gray-900 dark:text-slate-100">
            {plan ? t("subscriptions_admin.edit_plan") : t("subscriptions_admin.add_plan")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t("subscriptions_admin.plan_name")}</Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={t("subscriptions_admin.plan_name_placeholder")}
                className="rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t("maps_admin.price")} ($ USD)</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 font-bold text-sm">$</span>
                <Input
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  min={0}
                  className="pl-8 rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t("subscriptions_admin.billing_cycle")}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.interval === "month" ? "default" : "outline"}
                  onClick={() => setFormData(prev => ({ ...prev, interval: "month" }))}
                  className={`flex-1 rounded-xl font-bold h-12 transition-all ${
                    formData.interval === "month" 
                      ? "bg-yellow-400 text-black hover:bg-[#fabf13] border-none shadow-md" 
                      : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 dark:bg-slate-900/40 dark:hover:bg-slate-800"
                  }`}
                >
                  {t("subscriptions_admin.monthly_plan")}
                </Button>
                <Button
                  type="button"
                  variant={formData.interval === "year" ? "default" : "outline"}
                  onClick={() => setFormData(prev => ({ ...prev, interval: "year" }))}
                  className={`flex-1 rounded-xl font-bold h-12 transition-all ${
                    formData.interval === "year" 
                      ? "bg-yellow-400 text-black hover:bg-[#fabf13] border-none shadow-md" 
                      : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 dark:bg-slate-900/40 dark:hover:bg-slate-800"
                  }`}
                >
                  {t("subscriptions_admin.yearly_plan")}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t("subscriptions_admin.description")}</Label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={t("subscriptions_admin.description_placeholder")}
              className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
              required
            />
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t("subscriptions_admin.features")}</Label>
            {formData.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                  placeholder={`${t("subscriptions_admin.feature_placeholder")} ${index + 1}`}
                  className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  required
                />
                {formData.features.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFeature}
              className="mt-2 border-gray-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4 mr-2" /> {t("subscriptions_admin.add_feature")}
            </Button>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800">
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary text-black font-black uppercase"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {plan ? t("common.loading") : t("common.loading")}
                </>
              ) : plan ? (
                t("subscriptions_admin.edit_plan")
              ) : (
                t("subscriptions_admin.create_plan")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
