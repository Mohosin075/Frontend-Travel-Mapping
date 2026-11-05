"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGetEntityUsersQuery } from "@/redux/features/stats/statsApi";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getProfileImageUrl } from "@/lib/utils";
import { Loader2, Users, MapPin, Ticket, Map, ExternalLink, Calendar } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface EntityUsersModalProps {
  timeFilter?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: {
    type: "map" | "place" | "offer" | "business";
    id: string;
    name: string;
    count: number;
  } | null;
}

export function EntityUsersModal({
  open,
  onOpenChange,
  entity,
  timeFilter,
}: EntityUsersModalProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");

  const { currentData: response, isFetching, isError, refetch } = useGetEntityUsersQuery(
    { type: entity?.type || "place", id: entity?.id || "", timeFilter },
    { skip: !open || !entity?.id, refetchOnMountOrArgChange: true, pollingInterval: 30000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true }
  );

  const payload = response?.data || {};
  const users: any[] = payload.users || [];
  const guestCount: number = payload.guestCount || 0;
  const unavailableCount: number = payload.unavailableCount || 0;
  const visibleUsers = users.filter(user => `${user.name || ""} ${user.email || ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  const getEntityIcon = () => {
    switch (entity?.type) {
      case "map":
        return <Map size={18} className="text-[#fabf13]" />;
      case "place":
      case "business":
        return <MapPin size={18} className="text-[#fabf13]" />;
      case "offer":
        return <Ticket size={18} className="text-[#fabf13]" />;
      default:
        return <Users size={18} className="text-[#fabf13]" />;
    }
  };

  const getModalTitle = () => {
    switch (entity?.type) {
      case "map":
        return t("reports_admin.users_who_used_map") || "Users Who Viewed This Map";
      case "place":
      case "business":
        return t("reports_admin.users_who_viewed_place") || "Users Who Viewed This Place";
      case "offer":
        return t("reports_admin.users_who_redeemed_offer") || "Users Who Redeemed This Offer";
      default:
        return "Interacted Users";
    }
  };

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full h-[min(85dvh,44rem)] max-h-[85dvh] min-h-0 flex flex-col bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-0 overflow-hidden">
        {/* Header with yellow accent border */}
        <div className="p-6 shrink-0 border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/40">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-950/60 flex items-center justify-center border border-yellow-300 dark:border-yellow-700/50 shrink-0">
                {getEntityIcon()}
              </div>
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-slate-100">
                {getModalTitle()}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between gap-2 pt-1">
              <span className="font-semibold text-gray-800 dark:text-slate-200 truncate">
                {entity?.name}
              </span>
              <span className="shrink-0 bg-yellow-100 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-300 font-bold px-2 py-0.5 rounded-full border border-yellow-300 dark:border-yellow-700/50 text-[11px]">
                {isFetching && !response ? "…" : users.length} {language === "es" ? "cuentas identificadas" : "identified accounts"}
              </span>
            </DialogDescription>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              {language === "es"
                ? "Los administradores pueden identificar los perfiles privados. Los visitantes sin sesión no tienen una cuenta identificable. El historial anterior al registro detallado puede estar incompleto."
                : "Private profiles remain identifiable to administrators. Guests have no account identity. Records predating detailed tracking may be incomplete."}
            </p>
          </DialogHeader>
          {response && !isError && <p className="mt-2 text-xs text-gray-600 dark:text-slate-300" aria-live="polite">
            {language === 'es' ? 'Total registrado' : 'Recorded total'}: {payload.totalCount ?? users.length}
            {' · '}{users.length} {language === 'es' ? 'cuentas identificadas' : 'identified accounts'}
            {' · '}{guestCount} {language === 'es' ? 'visitantes sin sesión' : 'guests'}
            {' · '}{unavailableCount} {language === 'es' ? 'cuentas no disponibles' : 'unavailable accounts'}
          </p>}
          <Input value={search} onChange={event => setSearch(event.target.value)}
            aria-label={language === "es" ? "Buscar usuarios" : "Search users"}
            placeholder={language === "es" ? "Buscar por nombre o correo" : "Search by name or email"}
            className="mt-3" />
          {unavailableCount > 0 && <p className="mt-2 text-xs text-gray-500">{unavailableCount} {language === "es" ? "cuentas no disponibles" : "unavailable accounts"}</p>}
        </div>

        {/* User list */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-3">
          {isFetching && !response ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#fabf13]" />
              <p className="text-xs font-medium">{t("common.loading") || "Loading users..."}</p>
            </div>
          ) : isError ? (
            <div role="alert" className="py-8 text-center text-sm">
              <p>{language === 'es' ? 'No se pudieron cargar los usuarios.' : 'Unable to load users.'}</p>
              <button type="button" onClick={() => refetch()} className="mt-3 underline">{language === 'es' ? 'Reintentar' : 'Retry'}</button>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-slate-500 space-y-2">
              <Users size={32} className="mx-auto opacity-30 text-[#fabf13]" />
              <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">
                {t("reports_admin.no_registered_users") || "No registered user records found for this item."}
              </p>
              {guestCount > 0 && (
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  {guestCount} {guestCount === 1 ? "guest recorded." : "guests recorded."}
                </p>
              )}
            </div>
          ) : (
            <>
              {visibleUsers.length === 0 && <p className="text-sm text-gray-500">{language === "es" ? "Sin resultados" : "No matching users"}</p>}
              {visibleUsers.map((u: any, idx: number) => {
                const avatar = getProfileImageUrl(u.profile);
                return (
                  <div
                    key={u._id || idx}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50/70 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 hover:border-yellow-300 dark:hover:border-yellow-700/50 hover:bg-yellow-50/30 dark:hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-9 h-9 border border-gray-200 dark:border-slate-700 shrink-0">
                        <AvatarImage src={avatar || undefined} alt={u.name} />
                        <AvatarFallback />
                      </Avatar>

                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/users-roles/${u._id}`}
                          className="font-bold text-xs text-gray-900 dark:text-slate-100 hover:text-yellow-600 dark:hover:text-yellow-400 hover:underline flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{u.name}</span>
                          <ExternalLink size={10} className="shrink-0 opacity-60" />
                        </Link>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                          {u.email || "No email available"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 mb-1"
                      >
                        {u.action || "Interacted"}
                      </Badge>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1 justify-end font-medium">
                        <Calendar size={9} />
                        <span>{formatDate(u.date)}</span>
                      </p>
                    </div>
                  </div>
                );
              })}

              {guestCount > 0 && (
                <div className="p-3 bg-gray-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-center text-xs text-gray-500 dark:text-slate-400 font-medium">
                  + {guestCount} {guestCount === 1 ? "guest viewer" : "guest viewers"}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

