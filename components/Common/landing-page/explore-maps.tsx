"use client";

import Image from "next/image";
import { Star, TrendingUp, Compass, Trophy } from "lucide-react";
import { m as motion } from "motion/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const listVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } },
} as const;

export default function ExploreMaps() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Star,
      text: t("landing.interactive_f1"),
    },
    {
      icon: TrendingUp,
      text: t("landing.interactive_f2"),
    },
    {
      icon: Compass,
      text: t("landing.interactive_f3"),
    },
    {
      icon: Trophy,
      text: t("landing.interactive_f4"),
    },
  ];

  return (
    <section className="bg-[#0f0f0f] text-white py-16 sm:py-20 lg:py-24 overflow-hidden font-inter">
      <div className="max-w-360 mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Map Image Container */}
        <motion.div
          className="w-full max-w-lg mx-auto lg:max-w-none relative rounded-3xl p-3 sm:p-4 bg-blue-900/30 border border-blue-500/20"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="rounded-2xl overflow-hidden w-full h-72 sm:h-96 md:h-115 relative">
            <Image
              src="/offer/Landing Page Reward - Dark.png"
              alt={t("landing.interactive_title")}
              sizes="(max-width: 1023px) calc(100vw - 32px), 46vw"
              fill
              className="object-cover"
            />
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          className="space-y-4 sm:space-y-6"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-4.5xl font-bold tracking-tight leading-tight">
            {t("landing.interactive_title")}
          </h2>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            {t("landing.interactive_desc")}
          </p>

          {/* Features List */}
          <motion.div
            className="space-y-3.5 pt-2 sm:pt-4"
            variants={listVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  className="flex items-start gap-3"
                  variants={itemVariants}
                >
                  <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="text-yellow-400 w-4 h-4" />
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-medium">
                    {feature.text}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
