"use client";

import {
  useResendOtpMutation,
  useVerifyAccountMutation,
} from "@/redux/features/auth/authApi";
import { navigateAfterAuth, setUser } from "@/redux/features/auth/authSlice";
import { useAppDispatch } from "@/redux/hook";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { decodeJwtPayload } from "@/lib/utils";
import { isDashboardRole } from "@/lib/roles";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { baseApi } from "@/redux/api/baseApi";
import { persistor } from "@/redux/store";

type AuthFlow = "createAccount" | "resetPassword" | "invite" | "setPassword";

export default function OtpVerify() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const otpFromQuery = searchParams.get("otp") || "";
  const redirect = searchParams.get("redirect");

  const authFlow: AuthFlow = useMemo(() => {
    const raw = (searchParams.get("authType") || "").trim();
    if (raw === "resetPassword" || raw === "invite" || raw === "createAccount" || raw === "setPassword") {
      return raw;
    }
    return "createAccount";
  }, [searchParams]);

  // Invite uses the same verify API as signup; password is set on the next page.
  const resendAuthType =
    authFlow === "resetPassword" || authFlow === "setPassword" ? "resetPassword" : "createAccount";

  const [otp, setOtp] = useState(Array(6).fill(""));
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [verifyAccount, { isLoading: isVerifying }] =
    useVerifyAccountMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!email) {
      toast.error(t("auth.no_email_provided"));
      router.push("/login");
    }
  }, [email, router, t]);

  // Optional prefill if an older email link still includes ?otp=
  useEffect(() => {
    if (!otpFromQuery) return;
    const digits = otpFromQuery.replace(/\D/g, "").slice(0, 6).split("");
    if (digits.length === 6) {
      setOtp(digits);
    }
  }, [otpFromQuery]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handlePaste = (index: number, e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;

    const newOtp = [...otp];
    pasted
      .slice(0, 6 - index)
      .split("")
      .forEach((v, i) => (newOtp[index + i] = v));

    setOtp(newOtp);

    const nextIndex = Math.min(index + pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    if (value.length > 1) {
      value
        .slice(0, 6 - index)
        .split("")
        .forEach((v, i) => (newOtp[index + i] = v));
      setOtp(newOtp);
      inputRefs.current[Math.min(index + value.length, 5)]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && otp.every(Boolean) && !isVerifying) {
      void handleVerify();
    }
  };

  const redirectAfterLogin = (accessToken: string, role?: string) => {
    let userRole = role;
    if (!userRole) {
      const decoded = decodeJwtPayload(accessToken);
      userRole = decoded?.role;
    }

    if (redirect) {
      navigateAfterAuth(redirect);
    } else if (isDashboardRole(userRole)) {
      navigateAfterAuth("/dashboard");
    } else if (authFlow === "createAccount") {
      navigateAfterAuth("/catalog");
    } else {
      navigateAfterAuth("/maps");
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      toast.error(t("auth.enter_valid_otp"));
      return;
    }

    const toastId = toast.loading("Verifying OTP...");

    try {
      const response = await verifyAccount({
        email,
        oneTimeCode: otpCode,
      }).unwrap();

      if (!response.success) {
        toast.error(
          response.message || "Verification failed. Please try again.",
          { id: toastId },
        );
        return;
      }

      const userData = response.data;

      // Invite / forgot-password: OTP ok → go set password (step 2)
      if (userData?.token && !userData?.accessToken) {
        const nextPath =
          authFlow === "setPassword"
            ? `/reset-password?token=${userData.token}&flow=setup`
            : authFlow === "invite"
            ? `/reset-password?token=${userData.token}&flow=invite`
            : `/reset-password?token=${userData.token}`;

        toast.success(
          authFlow === "setPassword"
            ? t("auth.setup_code_verified")
            : authFlow === "invite"
            ? "Code verified! Set your password to finish."
            : authFlow === "resetPassword"
              ? "OTP verified! Please reset your password."
              : "OTP verified! Please set your password.",
          { id: toastId },
        );
        router.push(nextPath + (redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""));
        return;
      }

      // Normal account create (already has password) → logged in
      if (userData?.accessToken) {
        let currentUser = userData.user;

        if (!currentUser) {
          const decoded = decodeJwtPayload(userData.accessToken);
          currentUser = {
            id: decoded?.authId ?? "",
            name: decoded?.name ?? "",
            email: decoded?.email ?? "",
            role: decoded?.role ?? "user",
            image: "",
          };
        }

        dispatch(
          setUser({
            user: currentUser,
            accessToken: userData.accessToken,
          }),
        );
        dispatch(baseApi.util.resetApiState());
        await persistor.flush();

        toast.success(
          authFlow === "resetPassword"
            ? "Verified successfully!"
            : "Account verified successfully!",
          {
            id: toastId,
            description:
              authFlow === "createAccount"
                ? "Your account is now active."
                : undefined,
          },
        );

        redirectAfterLogin(
          userData.accessToken,
          userData?.user?.role || userData?.role,
        );
        return;
      }

      toast.error("Verification succeeded but no next step was returned.", {
        id: toastId,
      });
    } catch (err: any) {
      console.error("Verification error:", err);
      const errorMessage =
        err?.data?.message ||
        err?.data?.error ||
        "Verification failed. Please try again.";
      toast.error(errorMessage, { id: toastId });
      // Stale code from an older invite email — clear so user can type the latest
      if (
        typeof errorMessage === "string" &&
        /invalid|outdated|no active code/i.test(errorMessage)
      ) {
        setOtp(Array(6).fill(""));
        inputRefs.current[0]?.focus();
      }
    }
  };

  const handleResend = async () => {
    const toastId = toast.loading("Resending OTP...");

    try {
      const response = await resendOtp({
        email,
        authType: resendAuthType,
      }).unwrap();

      if (response.success) {
        toast.success("OTP resent successfully!", {
          id: toastId,
          description: "Please check your email.",
        });

        setOtp(Array(6).fill(""));
        setCountdown(60);
        inputRefs.current[0]?.focus();
      } else {
        toast.error(response.message || "Failed to resend OTP", {
          id: toastId,
        });
      }
    } catch (err: any) {
      console.error("Resend failed:", err);

      const errorMessage =
        err?.data?.message ||
        err?.data?.error ||
        "Failed to resend OTP. Please try again.";

      toast.error(errorMessage, { id: toastId });
    }
  };

  const isOtpComplete = otp.every(Boolean);
  const isLoading = isVerifying;

  const title =
    authFlow === "setPassword"
      ? t("auth.setup_verify_heading")
      : authFlow === "resetPassword"
      ? t("auth.otp_title_reset")
      : authFlow === "invite"
        ? t("auth.otp_title_invite")
        : t("auth.otp_title_create");

  const subtitle =
    authFlow === "setPassword"
      ? t("auth.setup_otp_subtitle")
      : authFlow === "resetPassword"
      ? t("auth.otp_subtitle_reset")
      : authFlow === "invite"
        ? t("auth.otp_subtitle_invite")
        : t("auth.otp_subtitle_create");

  const buttonLabel =
    authFlow === "setPassword"
      ? t("auth.verify_code")
      : authFlow === "invite"
      ? t("auth.continue")
      : authFlow === "resetPassword"
        ? t("auth.verify_code")
        : t("auth.verify_account");

  return (
    <div className="flex flex-col justify-center">
      <div className="mb-8 text-left">
        <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-slate-100 mb-2">{title}</h2>
        <p className="text-sm text-[#757575] dark:text-slate-400">
          {t("auth.otp_sent_to")}{" "}
          <span className="font-semibold text-[#1A1A1A] dark:text-slate-200 break-all">
            {email || "your email"}
          </span>
          .
          <br className="hidden md:block" /> {subtitle}
        </p>
      </div>

      {authFlow === "invite" && (
        <div className="flex items-center gap-2 mb-6 text-xs font-semibold">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FFC107] text-black">
            1
          </span>
          <span className="text-[#1A1A1A] dark:text-slate-200">{t("auth.verify_code_step")}</span>
          <span className="text-[#BDBDBD] dark:text-slate-600 mx-1">—</span>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-800 text-[#757575] dark:text-slate-400">
            2
          </span>
          <span className="text-[#9E9E9E] dark:text-slate-500">{t("auth.set_password_step")}</span>
        </div>
      )}

      {(authFlow === "resetPassword" || authFlow === "createAccount" || authFlow === "setPassword") && (
        <div className="flex items-center gap-2 mb-6 text-xs font-semibold">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FFC107] text-black">
            1
          </span>
          <span className="text-[#1A1A1A] dark:text-slate-200">
            {authFlow === "resetPassword" ? t("auth.verify_code_step") : t("auth.verify_email_step")}
          </span>
          {(authFlow === "resetPassword" || authFlow === "setPassword") && (
            <>
              <span className="text-[#BDBDBD] dark:text-slate-600 mx-1">—</span>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-800 text-[#757575] dark:text-slate-400">
                2
              </span>
              <span className="text-[#9E9E9E] dark:text-slate-500">{t(authFlow === "setPassword" ? "auth.set_password_step" : "auth.new_password_step")}</span>
            </>
          )}
        </div>
      )}

      <div className="flex justify-between gap-3 mb-6">
        {otp.map((digit, i) => (
          <Input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            className="w-full h-14 text-center text-lg font-semibold bg-gray-100/80 dark:bg-slate-900/60 border border-[#E0E0E0] dark:border-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:border-transparent transition-all"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      <Button
        onClick={handleVerify}
        disabled={!isOtpComplete || isLoading}
        className="w-full bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold rounded-lg px-10 h-14 text-base shadow-lg shadow-yellow-500/20 mb-4"
      >
        {isLoading ? t("auth.verifying") : buttonLabel}
      </Button>

      {countdown > 0 ? (
        <p className="text-sm text-[#757575] dark:text-slate-400 text-center">
          {t("auth.resend_code_in")} {countdown}s
        </p>
      ) : (
        <div className="text-center">
          <p className="text-sm text-[#757575] dark:text-slate-400 mb-2">{t("auth.didnt_receive_code")}</p>
          <button
            onClick={handleResend}
            disabled={isResending}
            className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? t("auth.resending") : t("auth.resend_code")}
          </button>
        </div>
      )}
    </div>
  );
}
