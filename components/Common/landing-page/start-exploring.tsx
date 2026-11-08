"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import bgImg from "@/public/landing/Playa-Vacia-Talega.png";
import Image from "next/image";
import Link from "next/link";
import { LazyMotion, m as motion } from "motion/react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

const loadAnimationFeatures = () => import("./animation-features").then(module => module.default);

export default function StartExploring() {
  const { t } = useLanguage();

  return (
    <LazyMotion features={loadAnimationFeatures}>
    <section className="w-full py-14 sm:py-18 lg:py-20 overflow-hidden font-inter">
      <div className="max-w-360 mx-auto px-3 sm:px-6 w-full">
        <motion.div
          className="relative isolate w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 shadow-xl"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
        <Image
          src={bgImg}
          alt=""
          fill
          sizes="(max-width: 639px) calc(100vw - 24px), (max-width: 1440px) calc(100vw - 48px), 1392px"
          className="object-cover object-[center_45%] sm:object-[center_40%]"
        />
        {/* Keep the beach visible while maintaining readable text. */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center py-14 sm:py-20 px-6 sm:px-10 text-white">
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 tracking-tight leading-tight"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {t("landing.start_title")}
          </motion.h2>

          <motion.p
            className="max-w-xl text-gray-200 text-sm sm:text-base leading-relaxed mb-6 sm:mb-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {t("landing.start_desc")}
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link href={"/catalog"} className="w-full sm:w-auto">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full"
              >
                <span className={cn(buttonVariants(), "w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-8 py-5 sm:py-6 rounded-xl cursor-pointer text-base shadow-lg")}>
                  {t("landing.browse_maps")}
                </span>
              </motion.div>
            </Link>

            <span className="text-xs sm:text-sm text-gray-300 font-medium">
              {t("landing.no_sub")}
            </span>
          </motion.div>
        </div>
      </motion.div>
      </div>
    </section>
    </LazyMotion>
  );
}
