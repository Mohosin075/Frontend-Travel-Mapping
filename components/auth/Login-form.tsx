"use client";

import { useEffect, useState } from "react";
import { useLoginMutation } from "@/redux/features/auth/authApi";
import { setUser, navigateAfterAuth } from "@/redux/features/auth/authSlice";
import { Lock, Mail, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { decodeJwtPayload, getApiErrorMessage } from "@/lib/utils";
import { isDashboardRole } from "@/lib/roles";
import { persistor } from "@/redux/store";
import { baseApi } from "@/redux/api/baseApi";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean(),
});

type FormValues = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const emailParam = searchParams.get("email");
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const [login, { isLoading }] = useLoginMutation();
  const [passwordSetupEmail, setPasswordSetupEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const completeLogin = async (accessToken: string, successMessage?: string) => {
    const decoded = decodeJwtPayload(accessToken);
    const role = decoded?.role ?? "user";

    dispatch(
      setUser({
        user: {
          id: decoded?.authId ?? decoded?.userId ?? "",
          name: decoded?.name ?? "",
          email: decoded?.email ?? "",
          role,
          image: "",
        },
        accessToken,
      }),
    );

    dispatch(baseApi.util.resetApiState());
    await persistor.flush();
    toast.success(successMessage || "Logged in successfully!");

    const next = redirect
      ? redirect
      : isDashboardRole(role)
        ? "/dashboard"
        : "/maps";
    navigateAfterAuth(next);
  };

  useEffect(() => {
    // Never store passwords in localStorage — only remember email
    localStorage.removeItem("rememberedPassword");
    if (emailParam) {
      setValue("email", emailParam);
      return;
    }
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setValue("email", rememberedEmail);
      setValue("rememberMe", true);
    }
  }, [emailParam, setValue]);

  // Google OAuth callback lands on /login?accessToken=...
  useEffect(() => {
    const oauthToken = searchParams.get("accessToken");
    if (!oauthToken) return;

    completeLogin(oauthToken, "Logged in with Google successfully!");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- consume OAuth token once from URL
  }, [searchParams]);

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      }).unwrap();

      if (res?.data?.passwordSetupRequired) {
        setPasswordSetupEmail(data.email.trim().toLowerCase());
        setValue("password", "");
        return;
      }

      if (data.rememberMe) {
        localStorage.setItem("rememberedEmail", data.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      localStorage.removeItem("rememberedPassword");

      const accessToken = res?.data?.accessToken;

      // Unverified account: backend sends OTP and returns no accessToken
      if (!accessToken) {
        const message =
          res?.message ||
          "An OTP has been sent to your email. Please verify your account.";
        toast.success(message);
        const authType = res?.data?.needPassword ? "invite" : "createAccount";
        router.push(
          `/otp-verify?email=${encodeURIComponent(data.email)}&authType=${authType}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`,
        );
        return;
      }

      await completeLogin(accessToken, res.message || "Logged in successfully!");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col justify-center">
      {/* Welcome Text */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-slate-100 mb-2">{t("auth.login_title")}</h2>
        <p className="text-sm text-[#757575] dark:text-slate-400">
          {t("auth.login_subtitle")}
        </p>
      </div>

      {/* Form */}
      {passwordSetupEmail ? <div className="space-y-4">
        <p role="status" className="text-sm text-gray-700 dark:text-slate-300">{t("auth.login_password_not_set")}</p>
        <Button asChild className="w-full bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold h-14">
          <Link href={`/set-password?email=${encodeURIComponent(passwordSetupEmail)}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`}>
            {t("auth.login_verify_to_set_password")}
          </Link>
        </Button>
        <Button type="button" variant="ghost" onClick={() => setPasswordSetupEmail(null)}>{t("auth.login_use_another_email")}</Button>
      </div> : <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
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

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("rememberMe")}
              className="w-4 h-4 accent-[#FFC107] rounded"
            />
            <span className="text-sm text-[#757575] dark:text-slate-400">{t("auth.remember_me")}</span>
          </label>
          <Link
            href={`/forgot-password?email=${encodeURIComponent(emailParam || "")}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`}
            className="font-semibold text-primary font-public-sans cursor-pointer hover:underline text-sm"
          >
            {t("auth.forgot_password")}
          </Link>
        </div>

        {/* Login Button */}
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
            t("nav.login")
          )}
        </Button>
        <Link className="block text-center text-sm font-semibold text-primary hover:underline"
          href={`/set-password?email=${encodeURIComponent(watch("email") || "")}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`}>
          {t("auth.login_no_password_yet")}
        </Link>
      </form>}

      {/* Footer */}
      <div className="text-sm text-center mt-6">
        <span className="text-[#0A0A0A] dark:text-slate-300">{t("auth.don_t_have_account")} </span>
        <Link
          href={
            `/register?` +
            new URLSearchParams({
              ...(redirect ? { redirect } : {}),
              ...(emailParam ? { email: emailParam } : {}),
            }).toString()
          }
          className="text-base font-semibold text-primary font-public-sans cursor-pointer hover:underline"
        >
          {t("auth.sign_up")}
        </Link>
      </div>
    </div>
  );
};
