"use client";

import { useEffect } from "react";
import { Lock, Mail, User, Loader2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRegisterMutation } from "@/redux/features/auth/authApi";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import SocialLogin from "../shared/social-login/social-login";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { getApiErrorMessage } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the Terms & Service and Privacy Policy",
    }),
  });

type FormValues = z.infer<typeof registerSchema>;

export const RegisterForm = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const emailParam = searchParams.get("email");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms: false },
  });
  const [registerUser, { isLoading }] = useRegisterMutation();

  useEffect(() => {
    if (emailParam) {
      setValue("email", emailParam);
    }
  }, [emailParam, setValue]);

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await registerUser({
        name: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      }).unwrap();

      if (res?.data?.email) {
        toast.success(res.message || "User created successfully!");
        router.push(
          `/otp-verify?email=${encodeURIComponent(res.data.email)}&authType=createAccount` +
            (redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""),
        );
      } else {
        toast.error(t("auth.registration_failed_no_email"));
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col justify-center">
      {/* Header Text (same style as login) */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-slate-100 mb-2">
          {t("auth.register_title")}
        </h2>
        <p className="text-sm text-[#757575] dark:text-slate-400">
          {t("auth.register_subtitle")}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
        {/* Full Name */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[#424242] dark:text-slate-300 ml-1">
            {t("auth.name")}
          </Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E9E9E] dark:text-slate-500" />
            <Input
              placeholder={t("auth.name_placeholder") || "John Doe"}
              {...register("fullName")}
              className="w-full pl-12 pr-4 py-6 bg-gray-100/80 dark:bg-slate-900/60 border border-[#E0E0E0] dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:border-transparent transition-all shadow-none"
            />
          </div>
          {errors.fullName && (
            <p className="text-xs text-red-500 ml-1">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[#424242] dark:text-slate-300 ml-1">
            {t("auth.email")}
          </Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E9E9E] dark:text-slate-500" />
            <Input
              type="email"
              placeholder={t("auth.email_placeholder") || "example@gmail.com"}
              {...register("email")}
              className="w-full pl-12 pr-4 py-6 bg-gray-100/80 dark:bg-slate-900/60 border border-[#E0E0E0] dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:border-transparent transition-all shadow-none"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[#424242] dark:text-slate-300 ml-1">
            {t("auth.password")}
          </Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E9E9E] dark:text-slate-500" />
            <Input
              type="password"
              placeholder="••••••••"
              {...register("password")}
              className="w-full pl-12 pr-4 py-6 bg-gray-100/80 dark:bg-slate-900/60 border border-[#E0E0E0] dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:border-transparent transition-all shadow-none"
            />
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>
          )}
        </div>

        {/* Terms */}
        <div className="flex flex-col gap-1 py-2">
          <div className="flex items-center gap-3">
            <Checkbox
              onCheckedChange={(checked) => setValue("terms", Boolean(checked), { shouldValidate: true })}
              className="w-5 h-5 border-[#E0E0E0] dark:border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <p className="text-sm text-[#757575] dark:text-slate-400">
              {t("auth.i_agree_to")}{" "}
              <Link
                href={"/terms-of-service"}
                className="font-semibold text-[#1A1A1A] dark:text-slate-200 cursor-pointer hover:underline"
              >
                {t("nav.terms_of_service")}
              </Link>{" "}
              {t("auth.and")}{" "}
              <Link
                href={"/privacy-policy"}
                className="font-semibold text-[#1A1A1A] dark:text-slate-200 cursor-pointer hover:underline"
              >
                {t("nav.privacy_policy")}
              </Link>
            </p>
          </div>
          {errors.terms && (
            <p className="text-xs text-red-500 ml-1 mt-1">{errors.terms.message}</p>
          )}
        </div>

        {/* Button */}
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
            t("auth.sign_up")
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="text-sm text-center mt-6">
        <span className="text-[#0A0A0A] dark:text-slate-300">{t("auth.already_have_account")}{" "}</span>
        <Link
          href={
            `/login?` +
            new URLSearchParams({
              ...(redirect ? { redirect } : {}),
              ...(emailParam ? { email: emailParam } : {}),
            }).toString()
          }
          className="text-base font-semibold text-primary font-public-sans hover:underline"
        >
          {t("nav.login")}
        </Link>
      </div>
    </div>
  );
};

