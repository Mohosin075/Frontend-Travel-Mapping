"use client";

import React from "react";
import { CategoryIcon } from "../categories/category-icon";
import { Lock } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";

interface CategoryMarkerProps {
  icon: string;
  color?: string;
  name?: string | { en?: string; es?: string };
  isTemp?: boolean;
  isSelected?: boolean;
  isLocked?: boolean;
  isMobile?: boolean;
  status?: string;
  isVisited?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: (e: React.MouseEvent) => void;
}

export const CategoryMarker = React.memo(function CategoryMarker({
  icon,
  color = "#FA7B17",
  name,
  isTemp = false,
  isSelected = false,
  isLocked = false,
  isMobile = false,
  status,
  isVisited = false,
  size = "md",
  onClick,
}: CategoryMarkerProps) {
  const { language } = useLanguage();
  // Proportions for Google Maps POI Pin (size="sm" for dense dashboard map, "md" for default, "lg" for large)
  const isSmall = size === "sm";
  const isLarge = size === "lg";
  const width = isSmall
    ? (isMobile ? 24 : 28)
    : isLarge
      ? (isMobile ? 36 : 44)
      : (isMobile ? 30 : 37);
  const height = isSmall
    ? (isMobile ? 30 : 35)
    : isLarge
      ? (isMobile ? 45 : 55)
      : (isMobile ? 38 : 46);
  const badgeSize = isSmall
    ? (isMobile ? 19 : 22)
    : isLarge
      ? (isMobile ? 28 : 34)
      : (isMobile ? 24 : 29);

  const isCustomImage =
    icon?.startsWith("http") ||
    icon?.startsWith("data:") ||
    icon?.includes("/") ||
    icon?.includes(".");

  const iconSize = isCustomImage
    ? badgeSize
    : isSmall
      ? (isMobile ? 13 : 15)
      : isLarge
        ? (isMobile ? 20 : 24)
        : (isMobile ? 16 : 19);
  const displayName = isLocked
    ? (language === "es" ? "Ubicación Premium" : "Premium Location")
    : getLocalized(name, language);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      className={`cat-marker-root group relative select-none flex items-center justify-center ${isSelected ? "is-selected z-50" : "z-10"}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        cursor: "pointer",
        transformOrigin: "bottom center",
      }}
    >
      {/* ── Selection Beacon / Glowing Halo ── */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: `${badgeSize + (isSmall ? 12 : 16)}px`,
            height: `${badgeSize + (isSmall ? 12 : 16)}px`,
            borderRadius: "50%",
            border: "2.5px solid #FFC107",
            boxShadow: "0 0 16px rgba(255, 193, 7, 0.65)",
            animation: "ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

      {/* ── Name Tooltip (Pure CSS driven: 0 JS re-renders during mouse wheel zoom) ── */}
      {Boolean(displayName) && (
        <div
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap transition-opacity duration-150 z-[100] flex items-center gap-1.5 ${isSelected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
            }`}
          style={{
            bottom: `${height + (isSelected ? (isSmall ? 8 : 10) : (isSmall ? 4 : 6))}px`,
            backgroundColor: isSelected ? "#0F172A" : "rgba(15, 23, 42, 0.94)",
            color: "#FFFFFF",
            padding: isSmall ? "3px 8px" : "4px 10px",
            borderRadius: "8px",
            fontSize: isSmall ? (isSelected ? "11px" : "10px") : (isSelected ? "12px" : "11px"),
            fontWeight: isSelected ? "800" : "700",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.45)",
            border: isSelected ? "1.5px solid #FFC107" : isLocked ? "1.5px solid #F59E0B" : status === "Draft" ? "1.5px solid #F59E0B" : "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          {status === "Draft" && (
            <span
              style={{
                backgroundColor: "#F59E0B",
                color: "#FFFFFF",
                fontSize: "9px",
                fontWeight: "900",
                padding: "1px 5px",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {language === "es" ? "Borrador" : "Draft"}
            </span>
          )}
          {isLocked && <Lock size={11} className="text-amber-400 shrink-0" />}
          <span>{displayName}</span>
          {/* Arrow Triangle pointing down to pin */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `5px solid ${isSelected ? "#0F172A" : "rgba(15, 23, 42, 0.94)"}`,
            }}
          />
        </div>
      )}

      {/* ── Pin Visual Container with CSS-only hover scale ── */}
      <div
        className="pin-body w-full h-full relative transition-all duration-300 ease-out"
        style={{
          transform: isSelected ? "scale(1.2) translateY(-2px)" : undefined,
          filter: isSelected
            ? "drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5))"
            : isVisited
              ? "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.22))"
              : undefined,
        }}
      >
        {/* 100% Google Maps Replica SVG (Clean White Pin Body, Roadtripeado Yellow Border for Visited, or Warm Amber for Draft) */}
        <svg
          width={width}
          height={height}
          viewBox="0 0 40 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {/* Subtle drop shadow outline inside SVG */}
          <path
            d="M20 1C9.5 1 1 9.5 1 20C1 28.5 10.5 38.2 15.3 42.6C16.8 43.9 18.4 44.5 20 44.5C21.6 44.5 23.2 43.9 24.7 42.6C29.5 38.2 39 28.5 39 20C39 9.5 30.5 1 20 1Z"
            fill={status === "Draft" ? "#FFFBEB" : "#FFFFFF"}
            stroke={isVisited ? "#FFC107" : status === "Draft" ? "#D97706" : "rgba(0,0,0,0.08)"}
            strokeWidth={isVisited ? "2.5" : status === "Draft" ? (isSmall ? "2" : "2.5") : "1"}
            strokeDasharray={status === "Draft" ? "4 2" : "none"}
          />
        </svg>

        {/* Fixed Uniform Inner Badge (Guarantees Equal White Border on ALL Pins) */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: `${badgeSize}px`,
            height: `${badgeSize}px`,
            borderRadius: "50%",
            backgroundColor: isCustomImage ? "transparent" : (color || "#FA7B17"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          <CategoryIcon icon={icon} size={iconSize} color="#FFFFFF" />
        </div>

        {/* Draft Badge (if draft) */}
        {status === "Draft" && !isLocked && (
          isSmall ? (
            <div
              title={language === "es" ? "Borrador" : "Draft"}
              style={{
                position: "absolute",
                top: -1,
                right: -1,
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#F59E0B",
                border: "1.5px solid #FFFFFF",
                boxShadow: "0 1px 3px rgba(245, 158, 11, 0.45)",
                zIndex: 10,
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                top: -6,
                right: -10,
                background: "#F59E0B",
                color: "#FFFFFF",
                borderRadius: "5px",
                padding: "1px 4.5px",
                fontSize: "8.5px",
                fontWeight: "900",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid white",
                zIndex: 10,
                boxShadow: "0 2px 6px rgba(245, 158, 11, 0.45)",
                lineHeight: "11px",
              }}
            >
              {language === "es" ? "BORRADOR" : "DRAFT"}
            </div>
          )
        )}

        {/* Lock Badge (if locked) */}
        {isLocked && (
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: "#EF4444",
              color: "#fff",
              borderRadius: "50%",
              width: isSmall ? 14 : (isMobile ? 15 : 18),
              height: isSmall ? 14 : (isMobile ? 15 : 18),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid white",
              zIndex: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            <Lock size={isSmall ? 8 : (isMobile ? 8 : 10)} style={{ strokeWidth: 3 }} />
          </div>
        )}
      </div>

      {/* Pure CSS hover rules injected once */}
      <style jsx>{`
        .cat-marker-root:not(.is-selected):hover .pin-body {
          transform: scale(1.12);
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
        }
      `}</style>
    </div>
  );
});






