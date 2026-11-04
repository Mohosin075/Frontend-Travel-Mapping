"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCancelSubscriptionMutation,
  useGetMySubscriptionQuery,
} from "@/redux/features/subscription/subscriptionApi";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";
import { useAppSelector } from "@/redux/hook";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";

export function BillingSettings() {
  const { t, language } = useLanguage();
  const { data, isLoading } = useGetMySubscriptionQuery();
  const [cancelSubscription, { isLoading: isCanceling }] =
    useCancelSubscriptionMutation();
  
  const subs = Array.isArray(data?.data)
    ? data.data
    : data?.data
    ? [data.data]
    : [];

  const token = useAppSelector((state) => state.auth.accessToken);

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!subscriptionId || !token) return;

    const result = await appAlert.fire({
      title: t("common.are_you_sure"),
      text: t("settings_admin.cancel_notice") || "You will still have access until the end of your billing period.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: t("common.yes_cancel_it") || "Yes, cancel it!",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await cancelSubscription({
        subscriptionId,
        token,
      }).unwrap();

      toast.success(t("settings_admin.subscription_cancelled") || "Subscription cancelled successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to cancel subscription");
    }
  };

  const activeSubs = subs.filter((s: any) => s.status !== "canceled");

  return (
    <Card className="bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-slate-100">{t("nav.subscription")}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="p-4 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/40 flex items-center justify-center min-h-[80px]">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {t("settings_admin.billing_loading")}
            </p>
          </div>
        ) : activeSubs.length > 0 ? (
          activeSubs.map((sub: any) => (
            <div key={sub._id} className="p-4 rounded-lg border border-blue-500/40 dark:border-blue-500/30 bg-blue-500/10">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <p className="font-bold text-gray-900 dark:text-slate-100">
                    {getLocalized(sub.planId?.name, language) || "Premium Plan"}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-bold mt-0.5">
                    For Business: {getLocalized(sub.businessId?.name, language) || "Unknown Business"}
                  </p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                    sub.status === "active"
                      ? "bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300"
                      : "bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300"
                  }`}
                >
                  {sub.status === "active" ? t("offers_admin.active") : sub.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 font-medium mt-2">
                {sub.planId?.price != null ? `$${sub.planId.price}` : ""}
                {sub.planId?.interval ? `/${sub.planId.interval}` : ""}
                {sub.currentPeriodEnd
                  ? ` • ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                  : ""}
              </p>
              {sub.cancelAtPeriodEnd && (
                <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-2">
                  {t("settings_admin.cancel_notice")}
                </p>
              )}

              {!sub.cancelAtPeriodEnd && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelSubscription(sub._id)}
                    disabled={isCanceling}
                  >
                    {isCanceling && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("common.delete")}
                  </Button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-4 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/40 text-center">
            <p className="font-bold text-gray-700 dark:text-slate-200 mb-1">{t("settings_admin.no_active_subs")}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              {t("settings_admin.no_subs_desc")}
            </p>
            <Link href="/profile/my-business">
              <Button size="sm" className="bg-yellow-400 hover:bg-[#fabf13] text-black font-bold">
                {t("settings_admin.go_to_my_businesses")}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
