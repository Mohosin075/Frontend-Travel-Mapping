"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Search, ShoppingBag, Box } from "lucide-react";
import { m as motion } from "motion/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
} as const;

export default function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      title: t("landing.step1_title"),
      description: t("landing.step1_desc"),
      icon: <Search className="w-6 h-6 text-amber-500" />,
    },
    {
      title: t("landing.step2_title"),
      description: t("landing.step2_desc"),
      icon: <ShoppingBag className="w-6 h-6 text-amber-500" />,
    },
    {
      title: t("landing.step3_title"),
      description: t("landing.step3_desc"),
      icon: <Box className="w-6 h-6 text-amber-500" />,
    },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white dark:bg-[#0e1424] overflow-hidden font-inter transition-colors relative">
      {/* Subtle Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-amber-500/5 blur-3xl pointer-events-none rounded-full hidden dark:block" />

      <div className="max-w-360 mx-auto px-4 md:px-6 relative z-10">
        {/* Section Title */}
        <motion.h2
          className="text-3xl sm:text-4xl lg:text-4.5xl font-bold text-center text-gray-900 dark:text-slate-100 mb-8 sm:mb-12 tracking-tight leading-tight"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {t("landing.how_it_works_title")}
        </motion.h2>

        {/* Cards */}
        <motion.div
          className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -6 }}
              className="h-full"
            >
              <Card className="border-gray-100/90 dark:border-slate-800/80 bg-white dark:bg-[#131b2e]/90 hover:dark:border-amber-400/40 shadow-xs dark:shadow-xl hover:shadow-xl transition-all duration-300 rounded-2xl py-1 sm:py-2 h-full backdrop-blur-md">
                <CardContent className="flex flex-col items-center text-center p-6 sm:p-8 md:p-10 space-y-3.5 sm:space-y-4">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-yellow-100/80 dark:bg-amber-950/40 dark:border dark:border-amber-500/20 shrink-0">
                    {step.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
