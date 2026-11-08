"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tag } from "lucide-react";
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
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
} as const;

interface DealItem {
  id: string;
  name: string;
  badge: string;
  description: string;
  image: string;
}

function DealCard({ deal }: { deal: DealItem }) {
  return (
    <Card className="bg-white dark:bg-[#131b2e]/90 border border-gray-100/90 dark:border-slate-800/80 hover:dark:border-amber-400/40 rounded-2xl shadow-xs dark:shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col group p-0 backdrop-blur-md">
      {/* Business Image Container */}
      <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-gray-100 dark:bg-slate-800">
        <Image
          src={deal.image}
          alt={deal.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-108 transition-transform duration-500"
        />
        {/* Discount Badge */}
        <div className="absolute top-3 right-3 bg-[#fabf13] text-black font-extrabold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-[0_2px_10px_rgba(250,191,19,0.35)] flex items-center gap-1.5 uppercase tracking-wide">
          <Tag className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          <span>{deal.badge}</span>
        </div>
      </div>

      {/* Card Content */}
      <CardContent className="p-4 sm:p-5 text-left flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 group-hover:text-[#fabf13] transition-colors line-clamp-1 mb-1 sm:mb-1.5">
            {deal.name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {deal.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DealsSection() {
  const { t } = useLanguage();

  const deals: DealItem[] = [
    {
      id: "adventure-water",
      name: t("landing.deal1_business"),
      badge: t("landing.deal1_badge"),
      description: t("landing.deal1_desc"),
      image: "/offer/adventure-water-sport.png",
    },
    {
      id: "dokas",
      name: t("landing.deal2_business"),
      badge: t("landing.deal2_badge"),
      description: t("landing.deal2_desc"),
      image: "/offer/Dokas.png",
    },
    {
      id: "labranza",
      name: t("landing.deal3_business"),
      badge: t("landing.deal3_badge"),
      description: t("landing.deal3_desc"),
      image: "/offer/Labranza Rest.jpg",
    },
    {
      id: "best-ice-cream",
      name: t("landing.deal4_business"),
      badge: t("landing.deal4_badge"),
      description: t("landing.deal4_desc"),
      image: "/offer/Best Ice Cream Planet.png",
    },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gray-50/70 dark:bg-[#0b0f19] overflow-hidden font-inter transition-colors">
      <div className="max-w-360 mx-auto px-4 md:px-6 text-center space-y-8 sm:space-y-12">
        {/* Heading */}
        <motion.div
          className="space-y-2 sm:space-y-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-4.5xl font-bold text-gray-900 dark:text-slate-100 tracking-tight leading-tight">
            {t("landing.deals_title")}
          </h2>

          <p className="text-gray-500 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            {t("landing.deals_subtitle")}
          </p>
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
        >
          {deals.map((deal, index) => (
            <motion.div
              key={deal.id || index}
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.01 }}
              className="h-full"
            >
              <DealCard deal={deal} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
