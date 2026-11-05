"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, Check, CheckCheck, Search, X, ArrowUpRight, ChevronLeft, ChevronRight, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationSettings } from "@/components/dashboard/settings/notifications-settings";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useGetMyNotificationsQuery, useGetUnreadCountQuery, useMarkAsReadMutation, useMarkAllAsReadMutation } from "@/redux/features/notification/notificationApi";
import { formatRelativeTime, getNotificationText, getVisibleNotification, getNotificationIconConfig } from "@/components/shared/notifications/notification-helpers";
import { toast } from "sonner";

type Category = "all" | "account" | "roadtripeado";
const PAGE_SIZE = 15;

export default function Page() {
  const { t, language } = useLanguage();
  const copy = (en: string, es: string) => language === "es" ? es : en;
  const [category, setCategory] = useState<Category>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { currentData: profile } = useGetProfileQuery({});
  const { data: counts } = useGetUnreadCountQuery(undefined, { pollingInterval: 30000, refetchOnFocus: true, refetchOnReconnect: true });
  const { currentData: response, isLoading, isFetching, isError, refetch } = useGetMyNotificationsQuery({
    category: category === "all" ? undefined : category,
    isRead: unreadOnly ? false : undefined,
    searchTerm: debouncedSearch || undefined,
    page, limit: PAGE_SIZE,
  }, { pollingInterval: 30000, refetchOnFocus: true, refetchOnReconnect: true });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAsReadMutation();
  const notifications = (response?.data ?? []).map(item => getVisibleNotification(item, profile));
  const unread = category === "account" ? counts?.unreadAccount : category === "roadtripeado" ? counts?.unreadRoadtripeado : counts?.totalUnread;
  const totalPages = response?.meta?.totalPages;
  const hasNext = typeof totalPages === "number" ? page < totalPages : notifications.length === PAGE_SIZE;
  const busy = isLoading || (isFetching && !response);

  async function markOne(id: string) {
    setPendingIds(ids => [...ids, id]);
    try { await markAsRead(id).unwrap(); }
    catch { toast.error(t("notifications_page.mark_read_error")); }
    finally { setPendingIds(ids => ids.filter(value => value !== id)); }
  }

  async function markAll() {
    try {
      await markAllAsRead({ category: category === "all" ? undefined : category }).unwrap();
      toast.success(t("notifications_page.notifications_updated"));
    } catch { toast.error(t("notifications_page.mark_read_error")); }
  }

  const categories: { id: Category; label: string; count?: number }[] = [
    { id: "all", label: t("notifications_page.all_updates"), count: counts?.totalUnread },
    { id: "account", label: t("notifications_page.account"), count: counts?.unreadAccount },
    { id: "roadtripeado", label: t("notifications_page.roadtripeado"), count: counts?.unreadRoadtripeado },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-6 font-inter!">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"><BellRing size={23} /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5"><h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t("notifications_page.title")}</h1>{!!counts?.totalUnread && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{counts.totalUnread} {t("notifications_page.new")}</span>}</div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy("Your account activity and the latest Roadtripeado updates, in one place.", "Tu actividad y las novedades de Roadtripeado, en un solo lugar.")}</p>
          </div>
        </div>
        <Button variant="outline" className="shrink-0 gap-2 bg-white dark:bg-slate-900" onClick={() => setShowSettings(!showSettings)} aria-expanded={showSettings} aria-controls="notification-preferences"><Settings2 size={16} />{t("notifications_page.notification_settings")}</Button>
      </header>

      {showSettings && <div id="notification-preferences"><NotificationSettings /></div>}

      <section aria-label={copy("Notification inbox", "Bandeja de notificaciones")} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#131b2e]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 pt-2 dark:border-slate-800 sm:px-6">
          <div className="flex max-w-full gap-4 overflow-x-auto sm:gap-6" role="group" aria-label={copy("Filter by category", "Filtrar por categoría")}>
            {categories.map(tab => <button key={tab.id} onClick={() => { setCategory(tab.id); setPage(1); }} aria-pressed={category === tab.id} className={`flex shrink-0 items-center gap-2 border-b-2 py-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${category === tab.id ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>
              {tab.label}{!!tab.count && <span className={`rounded-full px-2 py-0.5 text-xs ${category === tab.id ? "bg-blue-50 dark:bg-blue-950" : "bg-slate-100 dark:bg-slate-800"}`}>{tab.count}</span>}
            </button>)}
          </div>
          <Button variant="ghost" size="sm" className="mb-2 gap-2 text-blue-600 dark:text-blue-400" onClick={markAll} disabled={!unread || isMarkingAll || !!debouncedSearch} title={debouncedSearch ? copy("Clear search to mark this category as read", "Borra la búsqueda para marcar esta categoría como leída") : undefined}>{isMarkingAll ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={17} />}{t("notifications_page.mark_all_read")}</Button>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/20 sm:flex-row sm:items-center sm:px-6">
          <div className="relative flex-1 sm:max-w-md">
            <Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input aria-label={t("notifications_page.search_placeholder")} placeholder={t("notifications_page.search_placeholder")} value={search} onChange={event => setSearch(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            {!!search && <button aria-label={copy("Clear search", "Borrar búsqueda")} onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>}
          </div>
          <div className="flex items-center justify-between gap-4 sm:ml-auto">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={unreadOnly} onChange={event => { setUnreadOnly(event.target.checked); setPage(1); }} className="size-4 accent-blue-600" />{t("notifications_page.unread_only")}</label>
            <Button variant="ghost" size="icon" aria-label={copy("Refresh notifications", "Actualizar notificaciones")} disabled={isFetching} onClick={() => refetch()}><RefreshCw size={16} className={isFetching ? "animate-spin" : ""} /></Button>
          </div>
        </div>

        <div aria-busy={isFetching}>
          {busy ? <div role="status" className="flex min-h-72 items-center justify-center gap-3 text-sm text-slate-500"><Loader2 size={20} className="animate-spin" />{t("notifications_page.loading")}</div>
            : isError ? <div role="alert" className="px-6 py-16 text-center"><p className="mb-4 text-slate-600 dark:text-slate-300">{copy("We couldn't load your notifications. Please try again.", "No pudimos cargar tus notificaciones. Inténtalo de nuevo.")}</p><Button variant="outline" onClick={() => refetch()}>{copy("Try again", "Reintentar")}</Button></div>
            : notifications.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center"><div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-slate-800"><Bell size={28} /></div><h2 className="font-semibold text-slate-900 dark:text-slate-100">{t("notifications_page.no_notifications")}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{search ? copy("Try a different keyword or clear your filters.", "Prueba otra palabra o borra los filtros.") : unreadOnly ? t("notifications_page.no_unread") : t("notifications_page.no_updates")}</p>{(search || unreadOnly || category !== "all" || page > 1) && <Button variant="outline" className="mt-5" onClick={() => { setSearch(""); setUnreadOnly(false); setCategory("all"); setPage(1); }}>{copy("Show all notifications", "Ver todas las notificaciones")}</Button>}</div>
            : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{notifications.map(item => {
              const config = getNotificationIconConfig(item.type, item.category, t);
              const Icon = config.icon;
              const title = getNotificationText(item.title, language);
              const pending = pendingIds.includes(item._id);
              return <li key={item._id} className={`relative flex gap-3 px-4 py-5 transition-colors sm:gap-4 sm:px-6 ${item.isRead ? "" : "bg-blue-50/40 dark:bg-blue-950/15"}`}>
                {!item.isRead && <span aria-hidden="true" className="absolute bottom-5 left-0 top-5 w-0.5 rounded-r bg-blue-500" />}
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl border sm:size-11 ${config.bgColor}`}><Icon size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"><span className="font-medium text-slate-500 dark:text-slate-400">{config.label}</span><span className="text-slate-300 dark:text-slate-600">·</span><time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString(language)} className="text-slate-500 dark:text-slate-400">{formatRelativeTime(item.createdAt, language)}</time>{!item.isRead && <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400"><span className="size-1.5 rounded-full bg-blue-500" />{t("notifications_page.new")}</span>}</div>
                  <h2 className={`break-words text-sm leading-6 text-slate-900 dark:text-slate-100 ${item.isRead ? "font-medium" : "font-semibold"}`}>{title}</h2>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-500 dark:text-slate-400">{getNotificationText(item.content, language)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                    {item.actionUrl && /^(\/(?!\/)|https?:\/\/)/i.test(item.actionUrl) && <Link href={item.actionUrl} onClick={() => { if (!item.isRead && !pending) void markOne(item._id); }} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">{getNotificationText(item.actionText, language) || t("notifications_page.view_details")}<ArrowUpRight size={14} /></Link>}
                    {!item.isRead && <button disabled={pending || isMarkingAll} onClick={() => void markOne(item._id)} className="inline-flex min-h-7 items-center gap-1.5 rounded text-xs font-medium text-slate-500 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 dark:text-slate-400">{pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{t("notifications_page.mark_read")}</button>}
                  </div>
                </div>
              </li>;
            })}</ul>}
        </div>
        {!busy && !isError && (notifications.length > 0 || page > 1) && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-6"><span role="status">{copy("Page", "Página")} {page}{typeof totalPages === "number" && totalPages > 0 ? ` / ${totalPages}` : ""} · {notifications.length} {copy("notifications", "notificaciones")}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1 || isFetching} onClick={() => setPage(value => value - 1)}><ChevronLeft size={15} />{copy("Previous", "Anterior")}</Button><Button variant="outline" size="sm" disabled={!hasNext || isFetching} onClick={() => setPage(value => value + 1)}>{copy("Next", "Siguiente")}<ChevronRight size={15} /></Button></div></footer>}
      </section>
    </div>
  );
}
