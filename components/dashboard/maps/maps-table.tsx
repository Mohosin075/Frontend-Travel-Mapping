"use client";

import { Input } from "@/components/ui/input";
import {
  useDeleteMapMutation,
  useGetManagedMapsQuery,
  useUpdateMapStatusMutation,
} from "@/redux/features/map/mapApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { Edit, Eye, EyeOff, Search, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";
import { TablePagination } from "@/components/dashboard/shared/table-pagination";

interface Map {
  _id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  status: "Published" | "Draft" | string;
  isActive: boolean;
  places: string[];
  updatedAt: string;
}

const tableHeaders = [
  "Map Name",
  "Description",
  "Status",
  "Price",
  "Last Updated",
  "Actions",
];

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";

export function MapsTable({ onEditMap }: { onEditMap?: (map: Map) => void }) {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const urlSearch = searchParams?.get("search") || "";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState(urlSearch);

  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [urlSearch]);

  const { data: user } = useGetProfileQuery({});

  const { data: response, isLoading } = useGetManagedMapsQuery({
    page,
    limit,
    searchTerm,
  });

  const [updateMapStatus] = useUpdateMapStatusMutation();

  const [deleteMap] = useDeleteMapMutation();

  const mapsData: Map[] = response?.data || [];
  const meta = response?.meta;

  const displayedMaps = mapsData;

  const handleDelete = async (id: string) => {
    appAlert.fire({
      title: t("common.are_you_sure"),
      text: t("maps_admin.delete_confirm") || "You won't be able to revert this map deletion!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: t("common.yes_delete_it") || "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteMap(id).unwrap();
          toast.success(t("maps_admin.deleted_successfully") || "Map deleted successfully");
        } catch (error: any) {
          toast.error(
            error?.data?.message || error?.message || "Failed to delete map",
          );
          console.error("Failed to delete map:", error);
        }
      }
    });
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Published" ? "Draft" : "Published";
    try {
      await updateMapStatus({
        id,
        data: { status: nextStatus, isActive: nextStatus === "Published" },
      }).unwrap();
      toast.success(
        nextStatus === "Draft"
          ? (t("places_admin.set_to_draft") || "Map saved as draft")
          : (t("places_admin.published_successfully") || "Map published successfully")
      );
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update map status");
      console.error("Failed to update map status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    return status === "Published"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300/60 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
      : "bg-yellow-100 text-yellow-800 border-yellow-300/60 hover:bg-yellow-200 dark:bg-[#fabf13]/10 dark:text-yellow-400 dark:border-yellow-500/20";
  };

  const tableHeaders = [
    t("maps_admin.map_name"),
    t("maps_admin.description"),
    t("offers_admin.status"),
    t("maps_admin.price"),
    t("common.page"),
    t("dashboard.table.actions"),
  ];

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-lg border overflow-hidden border-gray-200 dark:border-slate-800 flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-transparent">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder={t("maps_admin.search_maps")}
            className="pl-9 h-9 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1); // reset pagination on search
            }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
              {tableHeaders.map((header) => (
                <th
                  key={header}
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-200"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                  {t("maps_admin.loading_maps")}
                </td>
              </tr>
            ) : displayedMaps.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                  {t("maps_admin.no_maps")}
                </td>
              </tr>
            ) : (
              displayedMaps.map((map, index) => (
                <tr
                  key={map._id}
                  className={`${
                    index !== displayedMaps.length - 1
                      ? "border-b border-gray-100 dark:border-slate-800/60"
                      : ""
                  } hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">
                    {getLocalized(map.name, language)}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300 truncate max-w-xs">
                    {getLocalized(map.description, language) || "-"}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleToggleStatus(map._id, map.status || "Draft")}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs ${getStatusColor(
                        map.status || "Draft",
                      )}`}
                    >
                      {map.status === "Published" ? (t("places_admin.published") || "Published") : (t("places_admin.draft") || "Draft")}
                    </button>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                    ${map.price}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                    {new Date(map.updatedAt).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEditMap && onEditMap(map)}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        aria-label="Edit map"
                      >
                        <Edit size={18} />
                      </button>

                      <button
                        onClick={() =>
                          handleToggleStatus(map._id, map.status || "Draft")
                        }
                        className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 transition-colors"
                        aria-label={map.isActive ? "Hide map" : "Show map"}
                      >
                        {map.isActive ? (
                          <Eye size={18} />
                        ) : (
                          <EyeOff size={18} />
                        )}
                      </button>
                      {user?.role !== "map_editor" && (
                        <button
                          onClick={() => handleDelete(map._id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          aria-label="Delete map"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <TablePagination
        page={page}
        limit={limit}
        totalPage={meta?.totalPage}
        isLoading={isLoading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}
