"use client";

import Link from "next/link";
import { ComponentProps } from "react";
import { useAppSelector } from "@/redux/hook";
import { useLoginRequired } from "@/components/shared/login-required-modal";

const PUBLIC_EXACT = new Set([
  "/",
  "/catalog",
  "/pricing",
  "/contact",
  "/how-it-works",
  "/privacy-policy",
  "/terms-of-service",
  "/claim-promo",
  "/login",
  "/register",
  "/forgot-password",
  "/set-password",
  "/reset-password",
  "/otp-verify",
]);

function isPathProtected(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return false;
  if (path.startsWith("/catalog")) return false;
  if (path.startsWith("/claim-promo")) return false;
  if (path.startsWith("/details")) return false;
  return true;
}

export function AuthLink({
  href,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const token = useAppSelector((state) => state.auth.accessToken);
  const { openLoginRequired } = useLoginRequired();
  const path = typeof href === "string" ? href : href.pathname || "/";
  const clickedName = typeof props.children === "string" ? props.children : undefined;

  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        if (!token && isPathProtected(path)) {
          event.preventDefault();
          openLoginRequired(path, clickedName);
        }
        onClick?.(event);
      }}
    />
  );
}
