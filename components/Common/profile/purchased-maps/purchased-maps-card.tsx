"use client";

import { useRouter } from "next/navigation";

export type PurchasedMap = {
  id: string | number;
  title: string;
  badge: string;
  badgeColor: string;
  info: string;
  image: string;
  status: string;
  isActive: boolean;
  icon: any;
  iconColor: string;
};

export default function PurchasedMapsCard({ map }: { map: PurchasedMap }) {
  const router = useRouter();

  const handleClick = () => {
    localStorage.setItem("selectedMapId", String(map.id));
    localStorage.setItem("selectedCountryFilter", map.title);
    router.push("/maps");
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white dark:bg-[#131b2e] rounded-xl p-4 flex items-center gap-6 shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md hover:border-gray-200/80 dark:hover:border-slate-700 transition-all duration-300 group font-public-sans cursor-pointer"
    >
      {/* Map Image */}
      <div className="w-40 h-24 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-900">
        <img
          src={map.image}
          alt={map.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Map Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <map.icon size={16} className={map.iconColor} />
          <h3 className="text-lg font-black text-gray-900 dark:text-slate-100 tracking-tight group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-colors">
            {map.title}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] font-black px-2 py-0.5 leading-4 rounded-md ${map.badgeColor}`}
          >
            {map.badge}
          </span>

          <span className="text-sm text-gray-400 dark:text-slate-400 font-medium">
            • {map.info}
          </span>
        </div>
      </div>
    </div>
  );
}
