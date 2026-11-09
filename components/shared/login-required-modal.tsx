"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/redux/hook";
import {
  navigateAfterAuth,
  selectAccessToken,
  selectCurrentUser,
  syncAuthCookies,
} from "@/redux/features/auth/authSlice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useLanguage } from "@/lib/i18n/LanguageContext";

type LoginRequiredContextValue = {
  openLoginRequired: (redirectTo?: string, featureName?: string) => void;
};

const LoginRequiredContext = createContext<LoginRequiredContextValue>({
  openLoginRequired: () => {},
});

const PATH_LABELS: Record<string, string> = {
  "/maps": "Maps",
  "/places": "Places",
  "/offer": "Offers",
  "/catalog": "Catalog",
  "/for-business": "For Business",
  "/pricing": "Pricing",
  "/contact": "Contact",
  "/how-it-works": "How it Works",
  "/profile": "your profile",
  "/dashboard": "Dashboard",
};

function labelFromPath(path: string): string {
  const base = path.split("?")[0].replace(/\/$/, "") || "/";
  if (PATH_LABELS[base]) return PATH_LABELS[base];
  const first = `/${base.split("/").filter(Boolean)[0] || ""}`;
  return PATH_LABELS[first] || "this page";
}

function isPublicPath(pathname: string): boolean {
  const guestAllowedExact = new Set([
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/set-password",
    "/otp-verify",
    "/reset-password",
    "/privacy-policy",
    "/terms-of-service",
    "/success",
    "/cancel",
    "/payment-failed",
    "/claim-promo",
    "/pricing",
    "/contact",
    "/how-it-works",
  ]);

  return (
    guestAllowedExact.has(pathname) ||
    pathname === "/catalog" ||
    pathname.startsWith("/catalog/") ||
    pathname === "/details" ||
    pathname.startsWith("/details/") ||
    pathname === "/claim-promo" ||
    pathname.startsWith("/claim-promo")
  );
}

export function useLoginRequired() {
  return useContext(LoginRequiredContext);
}

export function LoginRequiredProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const accessToken = useAppSelector(selectAccessToken);
  const role = useAppSelector(selectCurrentUser)?.role;
  const [open, setOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/");
  const [featureName, setFeatureName] = useState("this page");
  const isNavigatingRef = useRef(false);

  const openLoginRequired = useCallback((next?: string, name?: string) => {
    let path = "/";
    let feature = name;
    if (next) {
      if (next.startsWith("/") && !next.startsWith("//")) {
        path = next;
      } else {
        path = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
        feature = next;
      }
    } else {
      path = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    }
    setRedirectTo(path);
    setFeatureName(feature?.trim() || labelFromPath(path));
    setOpen(true);
  }, []);

  useEffect(() => {
    if (accessToken) setOpen(false);
  }, [accessToken]);

  useEffect(() => {
    if (searchParams.get("loginRequired") !== "1") return;
    const raw = searchParams.get("redirect") || "/maps";
    const next =
      raw.startsWith("/") && !raw.startsWith("//") ? raw : "/maps";

    // Clean up loginRequired and redirect parameters from the current URL to keep other params intact
    const cleanParams = new URLSearchParams(searchParams.toString());
    cleanParams.delete("loginRequired");
    cleanParams.delete("redirect");
    const qs = cleanParams.toString();
    const cleanUrl = qs ? `${pathname}?${qs}` : pathname;

    if (accessToken) {
      setOpen(false);
      syncAuthCookies(accessToken, role);

      const guardKey = "auth_redirect_guard";
      try {
        const prev = sessionStorage.getItem(guardKey);
        if (prev) {
          const parsed = JSON.parse(prev) as { path?: string; at?: number };
          if (parsed.path === next && Date.now() - (parsed.at || 0) < 4000) {
            sessionStorage.removeItem(guardKey);
            router.replace(cleanUrl, { scroll: false });
            return;
          }
        }
        sessionStorage.setItem(
          guardKey,
          JSON.stringify({ path: next, at: Date.now() }),
        );
      } catch {
        // private mode — still try the redirect
      }

      navigateAfterAuth(next);
      return;
    }

    openLoginRequired(next);
    if (isPublicPath(pathname)) {
      router.replace(cleanUrl, { scroll: false });
    }
  }, [
    accessToken,
    role,
    openLoginRequired,
    pathname,
    router,
    searchParams,
  ]);

  const goTo = (path: string) => {
    isNavigatingRef.current = true;
    const target =
      redirectTo && redirectTo !== "/"
        ? `${path}?redirect=${encodeURIComponent(redirectTo)}`
        : path;
    setOpen(false);
    router.push(target);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      if (isNavigatingRef.current) {
        isNavigatingRef.current = false;
        return;
      }
      if (!isPublicPath(pathname)) {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }
    }
  };

  return (
    <LoginRequiredContext.Provider value={{ openLoginRequired }}>
      {children}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          overlayClassName="backdrop-blur-sm bg-black/40"
          className="max-w-md bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 rounded-2xl text-gray-900 dark:text-slate-100"
        >
          <DialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <LogIn size={22} />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
              {t("login_required.title")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-600 dark:text-slate-400">
              {t("login_required.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <Button
              className="h-11 w-full rounded-xl bg-[#FFC107] font-bold text-black hover:bg-[#FFB300]"
              onClick={() => goTo("/login")}
            >
              {t("login_required.login")}
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full rounded-xl font-semibold dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => goTo("/register")}
            >
              {t("login_required.create_account")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </LoginRequiredContext.Provider>
  );
}
