"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthLink } from "@/components/shared/auth-link";
import { m as motion } from "motion/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Target, Tag, BarChart3 } from "lucide-react";

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
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
} as const;

export default function PromoteBusiness() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Target,
      title: t("landing.promote_f1_title"),
      description: t("landing.promote_f1_desc"),
    },
    {
      icon: Tag,
      title: t("landing.promote_f2_title"),
      description: t("landing.promote_f2_desc"),
    },
    {
      icon: BarChart3,
      title: t("landing.promote_f3_title"),
      description: t("landing.promote_f3_desc"),
    },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gray-50 dark:bg-[#0b0f19] overflow-hidden font-inter transition-colors">
      <div className="max-w-360 mx-auto px-4 md:px-6">
        {/* Brand Yellow Container */}
        <motion.div
          className="relative bg-[#fabf13] dark:bg-[#fabf13] rounded-3xl sm:rounded-[44px] p-6 sm:p-12 md:py-16 text-center shadow-xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Subtle Ambient Background Highlight */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 dark:bg-black/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          {/* Heading */}
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-4.5xl font-black mb-3 sm:mb-4 text-gray-950 tracking-tight leading-tight"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {t("landing.promote_title")}
          </motion.h2>

          <motion.p
            className="text-gray-900 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {t("landing.promote_desc")}
          </motion.p>

          {/* Feature Cards Grid */}
          <motion.div
            className="grid gap-5 sm:gap-6 md:grid-cols-3 mb-8 sm:mb-12 max-w-5xl mx-auto relative z-10"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="h-full"
                >
                  <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300 text-center flex flex-col items-center group h-full">
                    <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-[#fabf13]/15 border border-[#fabf13]/30 flex items-center justify-center mb-4 text-gray-950 group-hover:bg-[#fabf13] transition-all duration-300 shadow-sm">
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <h3 className="font-bold text-base sm:text-lg text-gray-950 mb-2 leading-snug">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-block w-full sm:w-auto relative z-10"
          >
            <AuthLink href={"/for-business"} className="block w-full sm:w-auto">
              <span className={cn(buttonVariants(), "w-full sm:w-auto bg-black hover:bg-gray-900 text-white font-bold px-8 sm:px-10 h-12 sm:h-13 rounded-xl cursor-pointer text-sm sm:text-base shadow-lg")}>
                {t("landing.add_business")}
              </span>
            </AuthLink>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}


