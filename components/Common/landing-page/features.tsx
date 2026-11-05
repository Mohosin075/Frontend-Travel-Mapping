"use client";

import React from "react";
import { MapPin, Camera, Tag, LayoutGrid } from "lucide-react";
import Image from "next/image";
import { m as motion } from "motion/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } },
} as const;

const imageGridVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
} as const;

const imageVariantsLeft = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const imageVariantsRight = {
  hidden: { opacity: 0, y: -30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

export function Features() {
  const { t } = useLanguage();

  const features = [
    {
      title: t("landing.feat1_title"),
      description: t("landing.feat1_desc"),
      icon: MapPin,
      color: "bg-[#FFC107]",
    },
    {
      title: t("landing.feat2_title"),
      description: t("landing.feat2_desc"),
      icon: Camera,
      color: "bg-[#FFC107]",
    },
    {
      title: t("landing.feat3_title"),
      description: t("landing.feat3_desc"),
      icon: Tag,
      color: "bg-[#FFC107]",
    },
    {
      title: t("landing.feat4_title"),
      description: t("landing.feat4_desc"),
      icon: LayoutGrid,
      color: "bg-[#FFC107]",
    },
  ];

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden font-inter bg-white dark:bg-[#0b0f19] transition-colors">
      {/* Curved Background Shape */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-full h-full bg-[#FFFDF5] dark:bg-[#0e1424]/60 clip-path-hero transition-colors"></div>
      </div>

      <div className="relative z-10 max-w-360 mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        {/* Left Content */}
        <div>
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-4.5xl font-bold text-gray-900 dark:text-slate-100 leading-tight mb-4 sm:mb-6 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {t("landing.features_title")}
          </motion.h2>

          <motion.p
            className="text-gray-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed mb-8 sm:mb-12 max-w-lg"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {t("landing.features_desc")}
          </motion.p>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 sm:gap-y-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-start gap-3.5"
                variants={itemVariants}
              >
                <div
                  className={`${feature.color} p-2 rounded-lg text-black shrink-0 shadow-md shadow-amber-500/20 mt-0.5`}
                >
                  <feature.icon size={18} fill="currentColor" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-gray-900 dark:text-slate-100 mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right Content - Image Grid */}
        <motion.div
          className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 mt-4 lg:mt-0"
          variants={imageGridVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
        >
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <motion.div
              className="h-44 sm:h-56 md:h-64 rounded-2xl sm:rounded-[32px] overflow-hidden shadow-lg"
              variants={imageVariantsLeft}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src="/landing/La Playita - Cabo Rojo.png"
                alt="La Playita - Cabo Rojo"
                sizes="(max-width: 767px) 44vw, 23vw"
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            </motion.div>
            <motion.div
              className="h-44 sm:h-60 md:h-75 rounded-2xl sm:rounded-[32px] overflow-hidden shadow-lg"
              variants={imageVariantsLeft}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src="/landing/Cascada Barrio Perchgas - Morovis.png"
                alt="Cascada Barrio Perchas - Morovis"
                sizes="(max-width: 767px) 44vw, 23vw"
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
          <div className="space-y-3 sm:space-y-4 md:space-y-6 pt-6 sm:pt-8 md:pt-12">
            <motion.div
              className="h-52 sm:h-68 md:h-80 rounded-2xl sm:rounded-[32px] overflow-hidden shadow-lg"
              variants={imageVariantsRight}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src="/landing/Piscinas Naturales de Culebrita.png"
                alt="Piscinas Naturales de Culebrita"
                sizes="(max-width: 767px) 44vw, 23vw"
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            </motion.div>
            <motion.div
              className="h-44 sm:h-56 md:h-70 rounded-2xl sm:rounded-[32px] overflow-hidden shadow-lg"
              variants={imageVariantsRight}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src="/landing/Cueva de Punta Borinquen.png"
                alt="Cueva de Punta Borinquen"
                sizes="(max-width: 767px) 44vw, 23vw"
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
