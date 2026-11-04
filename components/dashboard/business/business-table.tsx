"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MoreHorizontal, RotateCcw, Loader2 } from "lucide-react";
import {
  useGetBusinessesQuery,
  useUpdateBusinessStatusMutation,
  useDeleteBusinessMutation,
} from "@/redux/features/business/businessApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, getLocalized } from "@/lib/utils";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// businessTableHeaders defined inside component using i18n

export function BusinessTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams?.get("search") || "";
  const { t, language } = useLanguage();
  const [selected, setSelected] = useState<string[]>([]);

  const businessTableHeaders = [
    "",
    t("business_admin.business_name"),
    t("business_admin.category"),
    t("business_admin.physical_address"),
    t("offers_admin.status"),
    t("common.submit") || "Submitted",
    t("common.edit"),
  ];

  // Params State
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
      setDebouncedSearch(urlSearch.trim());
    }
  }, [urlSearch]);

  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateBusinessStatusMutation();
  const [deleteBusiness] = useDeleteBusinessMutation();

  // Simple debounce for search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const {
    data: response,
    isLoading,
    isFetching,
  } = useGetBusinessesQuery({
    page,
    limit,
    searchTerm: debouncedSearch,
    status: status === "all" ? "" : status,
  });

  const businesses = response?.data || [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPage: 1 };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selected.length === 0) return;

    const promise = Promise.all(
      selected.map((id) => updateStatus({ id, status: newStatus }).unwrap()),
    );

    toast.promise(promise, {
      loading: `Updating ${selected.length} businesses...`,
      success: `Successfully updated to ${newStatus}`,
      error: "Failed to update some businesses.",
    });

    try {
      await promise;
      setSelected([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await updateStatus({ id, status: newStatus }).unwrap();
      toast.success(`Business ${newStatus} successfully!`);
    } catch (err) {
      toast.error(t("business.update_status_failed"));
      console.error(err);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    const result = await appAlert.fire({
      title: t("common.are_you_sure"),
      text: t("places_admin.delete_confirm") || "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: t("common.yes_delete_it") || "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteBusiness(id).unwrap();
        toast.success(t("business.deleted_success"));
      } catch (err: any) {
        toast.error(err?.data?.message || "Failed to delete business");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-300 border border-transparent dark:border-emerald-800/60";
      case "Pending":
        return "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-transparent dark:border-yellow-800/60";
      case "Rejected":
        return "bg-red-100 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 border border-transparent dark:border-rose-800/60";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300";
    }
  };

  return (
    <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 rounded-xl mt-6 overflow-hidden">
      {/* FILTER BAR */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search size={16} className="absolute left-3 top-3 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder={t("search.placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("offers_admin.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("places_admin.all_status")}</SelectItem>
                <SelectItem value="Pending">{t("business_admin.pending")}</SelectItem>
                <SelectItem value="Approved">{t("business_admin.approve")}</SelectItem>
                <SelectItem value="Rejected">{t("business_admin.reject")}</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || status !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatus("all");
                  setPage(1);
                }}
                className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline"
              >
                {t("places_admin.clear_filters")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selected.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800 animate-in slide-in-from-top-2">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {selected.length} {t("business_admin.businesses_selected")}
          </p>
          <div className="flex gap-2">
            <button
              disabled={isUpdating}
              onClick={() => handleBulkStatusUpdate("Approved")}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm transition-colors disabled:opacity-50"
            >
              {t("business_admin.approve")}
            </button>
            <button
              disabled={isUpdating}
              onClick={() => handleBulkStatusUpdate("Rejected")}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm transition-colors disabled:opacity-50"
            >
              {t("business_admin.reject")}
            </button>
          </div>
          <button
            onClick={() => setSelected([])}
            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto relative">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
            <Loader2 size={32} className="text-blue-600 animate-spin" />
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-300">
              {businessTableHeaders.map((header, index) => (
                <th
                  key={index}
                  className={`px-6 py-4 font-semibold ${header ? "text-left" : ""}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
            {businesses.length > 0
              ? businesses.map((business: any) => (
                  <tr
                    key={business._id}
                    onClick={() =>
                      router.push(`/dashboard/business/${business._id}`)
                    }
                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(business._id)}
                        onChange={() => toggleSelect(business._id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                        {getLocalized(business.name, language)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-1 max-w-[200px]">
                        {getLocalized(business.description, language)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-2.5 py-1 rounded-md text-xs font-medium lowercase">
                        {getLocalized(business.category?.name, language) || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      <p className="truncate max-w-[150px]">
                        {business.location?.address}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold">
                        {business.location?.city}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider ${getStatusColor(
                          business.status,
                        )}`}
                      >
                        {business.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 font-medium">
                      {business.createdAt
                        ? formatDate(business.createdAt)
                        : "N/A"}
                    </td>
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-all">
                            <MoreHorizontal size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusUpdate(business._id, "Approved")
                            }
                            className="text-green-600 font-medium"
                          >
                            {t("business_admin.approve")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusUpdate(business._id, "Rejected")
                            }
                            className="text-red-600 font-medium"
                          >
                            {t("business_admin.reject")}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleDeleteSingle(business._id)}
                            className="text-red-600 font-bold focus:bg-red-50 dark:focus:bg-rose-950/40"
                          >
                            {t("business_admin.delete_business")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              : !isLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-slate-500">
                        <Search size={40} className="text-gray-200 dark:text-slate-700" />
                        <p className="font-medium text-gray-500 dark:text-slate-400">
                          {t("business_admin.no_businesses")}
                        </p>
                        <p className="text-xs">
                          {t("business_admin.no_businesses_hint")}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 text-sm text-gray-500 dark:text-slate-400 border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/60">
        <p>
          Showing {businesses.length > 0 ? (page - 1) * limit + 1 : 0}–
          {Math.min(page * limit, meta.total)} of {meta.total} results
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-1.5 border border-gray-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            Prev
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: meta.totalPage }, (_, i) => i + 1).map(
              (p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md border transition-all font-medium ${
                    page === p
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          </div>
          <button
            disabled={page === meta.totalPage}
            onClick={() => setPage(page + 1)}
            className="px-4 py-1.5 border border-gray-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
