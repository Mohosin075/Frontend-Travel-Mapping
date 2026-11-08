"use client";

import MapPage from "@/components/Common/maps/map";
import { Suspense } from "react";

export default function page() {
  return (
    <div>
      <Suspense
        fallback={
          <div className="flex h-[calc(100vh-90px)] items-center justify-center bg-gray-100 dark:bg-[#0b0f19]">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          </div>
        }
      >
        <MapPage />
      </Suspense>
    </div>
  );
}
