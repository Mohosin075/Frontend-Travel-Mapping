"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useForgetPasswordMutation } from "@/redux/features/auth/authApi";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";

import { useLanguage } from "@/lib/i18n/LanguageContext";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

type FormValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordForm = ({ mode = "reset" }: { mode?: "reset" | "setup" } = {}) => {
  const { t } = useLanguage();
  const isSetup = mode === "setup";
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: searchParams.get("email") || "" },
  });

  const [forgetPassword, { isLoading }] = useForgetPasswordMutation();

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await forgetPassword({ email: data.email }).unwrap();

      if (res?.success) {
        toast.success(isSetup ? t("auth.setup_code_sent") : res.message || "Reset OTP sent successfully!");
        router.push(
          `/otp-verify?email=${encodeURIComponent(data.email)}&authType=${isSetup ? "setPassword" : "resetPassword"}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`,
        );
      } else {
        toast.error(res?.message || (isSetup ? t("auth.setup_code_failed") : "Failed to send reset link."));
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-col justify-center">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-slate-100 mb-2">
          {t(isSetup ? "auth.setup_verify_heading" : "auth.forgot_password")}
        </h2>
        <p className="text-sm text-[#757575] dark:text-slate-400">
          {t(isSetup ? "auth.setup_verify_subtitle" : "auth.forgot_subtitle")}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[#424242] dark:text-slate-300 ml-1">
            {t("auth.email")}
          </Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E9E9E] dark:text-slate-500" />
            <Input
              type="email"
              placeholder={t("auth.email_placeholder") || "your@email.com"}
              {...register("email")}
              className="w-full pl-12 pr-4 py-6 bg-gray-100/80 dark:bg-slate-900/60 border border-[#E0E0E0] dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:border-transparent transition-all shadow-none"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold rounded-lg px-10 h-14 text-base shadow-lg shadow-yellow-500/20 disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            t(isSetup ? "auth.send_verification_code" : "auth.send_reset_link")
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="text-sm text-center mt-6">
        {!isSetup && <span className="text-[#0A0A0A] dark:text-slate-300">{t("auth.remember_password_prompt")}{" "}</span>}
        <Link
          href="/login"
          className="text-base font-semibold text-primary font-public-sans hover:underline"
        >
          {t("auth.back_to_login")}
        </Link>
      </div>
    </div>
  );
};

