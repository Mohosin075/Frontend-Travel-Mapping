"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";

type Props = {
  plan: any;
  onEdit: (plan: any) => void;
  onDelete: (planId: string) => void;
  isLoading: boolean;
};

export function SubscriptionCard({ plan, onEdit, onDelete, isLoading }: Props) {
  const { language } = useLanguage();
  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:border-yellow-400/30 transition-all p-8 flex flex-col relative overflow-hidden group">
      {plan.isPopular && (
        <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-black uppercase px-4 py-1 rounded-bl-xl tracking-widest shadow-xs">
          Popular
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-slate-100 mb-2">
          {getLocalized(plan.name, language)}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-gray-900 dark:text-slate-100">
            ${plan.price}
          </span>
          <span className="text-gray-500 dark:text-slate-400 font-medium lowercase">
            /{plan.interval}
          </span>
        </div>
      </div>

      <div className="space-y-4 mb-10 flex-1">
        {plan.features?.map((feature: any, idx: number) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="mt-1 bg-green-100 dark:bg-green-950/50 p-0.5 rounded-full shrink-0">
              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 stroke-[3]" />
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300 font-medium">{getLocalized(feature, language)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 overflow-hidden">
        <Button onClick={() => onEdit(plan)} className="w-auto px-5 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest">
          Edit Plan
        </Button>
        <Button onClick={() => onDelete(plan._id)} className="w-auto px-5 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest">
          Delete Plan
        </Button>
      </div>
    </div>
  );
}
