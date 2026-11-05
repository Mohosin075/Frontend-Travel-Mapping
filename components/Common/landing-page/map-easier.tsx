"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, Compass, SlidersHorizontal, BadgePercent, MapPin } from "lucide-react";
import { m as motion } from "motion/react";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, x: -25 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } },
} as const;

export default function MapEasier() {
  const { t } = useLanguage();

  const benefits = [
    {
      title: t("landing.map_easier_b1_title"),
      description: t("landing.map_easier_b1_desc"),
      icon: <Clock className="w-5 h-5" />,
    },
    {
      title: t("landing.map_easier_b2_title"),
      description: t("landing.map_easier_b2_desc"),
      icon: <Compass className="w-5 h-5" />,
    },
    {
      title: t("landing.map_easier_b3_title"),
      description: t("landing.map_easier_b3_desc"),
      icon: <SlidersHorizontal className="w-5 h-5" />,
    },
    {
      title: t("landing.map_easier_b4_title"),
      description: t("landing.map_easier_b4_desc"),
      icon: <BadgePercent className="w-5 h-5" />,
    },
  ];

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden font-inter">
      {/* Background Shape */}
      <div className="absolute inset-0 bg-primary/20 rounded-none md:rounded-tr-[200px] z-0" />

      {/* Ambient Background Radial Lights */}
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-yellow-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-300/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-360 mx-auto px-4 md:px-6 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        {/* LEFT SIDE: Heading & Clean Horizontal Cards */}
        <div className="space-y-8 w-full lg:w-1/2">
          <motion.h2
            className="text-3xl md:text-4xl lg:text-4.5xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {t("landing.map_easier_title")}
          </motion.h2>

          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ x: 6, scale: 1.01 }}
                className="w-full"
              >
                <Card className="rounded-2xl shadow-xs dark:shadow-xl bg-white dark:bg-[#131b2e]/90 py-0 border border-gray-100/80 dark:border-slate-800/80 hover:shadow-md hover:border-yellow-200 dark:hover:border-amber-400/40 transition-all duration-300 group cursor-default backdrop-blur-md">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-50 dark:bg-amber-950/40 dark:border dark:border-amber-500/20 text-yellow-600 dark:text-amber-400 shrink-0 group-hover:scale-108 group-hover:bg-[#fabf13] group-hover:text-black transition-all duration-300">
                      {benefit.icon}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-gray-900 dark:text-slate-100 group-hover:text-black dark:group-hover:text-[#fabf13] transition-colors">
                        {benefit.title}
                      </h3>

                      <p className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* RIGHT SIDE: Premium Multi-Layered Photo Showcase */}
        <motion.div
          className="relative flex justify-center w-full lg:w-1/2"
          initial={{ opacity: 0, scale: 0.95, x: 30 }}
          whileInView={{ opacity: 1, scale: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="relative w-full max-w-md lg:max-w-lg group">
            {/* 1. Ambient Backlight Glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-yellow-400/40 via-amber-300/30 to-teal-400/30 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* 2. Rotated Backdrop Layer Card for 3D Depth */}
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-850/80 rounded-3xl rotate-3 scale-98 border border-white/80 dark:border-slate-700/80 shadow-xl pointer-events-none transition-transform duration-500 group-hover:rotate-6" />

            {/* 3. Main Premium Frame */}
            <div className="relative aspect-4/5 rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 ring-1 ring-black/5 dark:ring-white/10 z-10">
              <Image
                src="/landing/Isla Desecheo - Aguadilla 1.png"
                alt="Isla Desecheo — Aguadilla"
                fill
                className="object-cover group-hover:scale-106 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              {/* Cinematic Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15 pointer-events-none" />

              {/* Light Reflection Sheen on Hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              {/* Ultra-Slick Glassmorphism Location Card at Bottom */}
              <div className="absolute bottom-5 left-5 right-5 bg-white/85 dark:bg-[#131b2e]/90 backdrop-blur-xl p-4.5 rounded-2xl shadow-2xl border border-white/60 dark:border-slate-700/60 flex items-center justify-between gap-3 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#fabf13] flex items-center justify-center text-black shrink-0 shadow-md">
                    <MapPin className="w-5 h-5 fill-black/10" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-base text-gray-900 dark:text-slate-100 truncate tracking-tight">
                      Isla Desecheo — Aguadilla
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate font-medium">
                      Puerto Rico
                    </p>
                  </div>
                </div>

                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shrink-0" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
