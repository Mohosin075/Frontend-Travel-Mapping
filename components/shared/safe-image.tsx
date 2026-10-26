"use client";

import { NoImage } from "@/lib/others/others";
import { useEffect, useRef, useState } from "react";

type SafeImageProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  unoptimized?: boolean;
  sizes?: string;
  priority?: boolean;
};

// Global in-memory cache of already loaded images to prevent re-flashing skeletons
const loadedImageCache = new Set<string>();

export function SafeImage({
  src,
  alt = "",
  className = "",
  fill,
  priority = true,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isCached = Boolean(src && loadedImageCache.has(src));
  const [loaded, setLoaded] = useState(isCached);

  useEffect(() => {
    setFailed(false);
    if (!src) {
      setLoaded(false);
      return;
    }
    if (loadedImageCache.has(src)) {
      setLoaded(true);
      return;
    }
    // Check if the DOM image is already complete in browser cache
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      loadedImageCache.add(src);
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  if (!src || failed) {
    return <NoImage />;
  }

  return (
    <div className={`relative overflow-hidden ${fill ? "absolute inset-0 h-full w-full" : "h-full w-full"}`}>
      {/* Background shimmer that gracefully fades out instead of abruptly unmounting */}
      <div
        className={`absolute inset-0 z-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 transition-opacity duration-500 ease-out ${
          loaded ? "opacity-0 pointer-events-none" : "opacity-100 animate-pulse"
        }`}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => {
          if (src) loadedImageCache.add(src);
          setLoaded(true);
        }}
        onError={() => setFailed(true)}
        className={`relative z-[1] ${
          fill ? "absolute inset-0 h-full w-full object-cover object-center" : "h-full w-full object-cover object-center"
        } transition-all duration-500 ease-out ${
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.01] blur-[2px]"
        } ${className}`}
      />
    </div>
  );
}

