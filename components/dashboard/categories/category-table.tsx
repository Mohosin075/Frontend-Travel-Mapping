"use client";

import {
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
} from "@/redux/features/category/categoryApi";
import { Edit, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";
import { CategoryIcon } from "@/components/shared/categories/category-icon";
import { TablePagination } from "@/components/dashboard/shared/table-pagination";

interface Category {
  _id: string;
  icon: string;
  name: string;
  color: string;
  status: "Active" | "Hidden" | string;
}

interface CategoryTableProps {
  onEdit?: (category: Category) => void;
  onView?: (category: Category) => void;
}

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";

export function CategoryTable({ onEdit, onView }: CategoryTableProps) {
  const { t, language } = useLanguage();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: response, isLoading } = useGetCategoriesQuery({ page, limit });
  const [deleteCategory] = useDeleteCategoryMutation();

  const categories: Category[] = response?.data || [];
  const meta = response?.meta;

  const handleDelete = async (id: string) => {
    appAlert.fire({
      title: t("common.are_you_sure"),
      text: t("categories_admin.delete_confirm") || "You won't be able to revert this category deletion!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: t("common.yes_delete_it") || "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteCategory(id).unwrap();
          toast.success(t("categories_admin.deleted_successfully") || "Category deleted successfully");
        } catch (error: any) {
          toast.error(
            error?.data?.message ||
              error?.message ||
              "Failed to delete category",
          );
          console.error("Failed to delete category:", error);
        }
      }
    });
  };

  const getStatusColor = (status: string) => {
    return status === "Active"
      ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300"
      : "bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300";
  };

  const categoryTableHeaders = [
    t("categories_admin.icon") || "Icon",
    t("categories_admin.category_name"),
    t("categories_admin.color"),
    t("offers_admin.status"),
    t("dashboard.table.actions"),
  ];

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
              {categoryTableHeaders.map((header) => (
                <th
                  key={header}
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-200"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                  {t("categories_admin.loading")}
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                  {t("categories_admin.no_categories")}
                </td>
              </tr>
            ) : (
              categories.map((category, index) => (
                <tr
                  key={category._id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Icon */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      {(() => {
                        const isCustomImage =
                          category.icon?.startsWith("http") ||
                          category.icon?.startsWith("data:") ||
                          category.icon?.includes("/") ||
                          category.icon?.includes(".");
                        return (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden border border-gray-100 dark:border-slate-700"
                            style={{
                              backgroundColor: isCustomImage
                                ? "transparent"
                                : category.color || "#fabf13",
                            }}
                          >
                            <CategoryIcon
                              icon={category.icon}
                              size={isCustomImage ? 28 : 22}
                              color="#FFFFFF"
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </td>

                  {/* Category Name */}
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">
                    {getLocalized(category.name, language)}
                  </td>

                  {/* Color */}
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border border-black/10 dark:border-white/10"
                        style={{ backgroundColor: category.color }}
                      />

                      <span>{category.color}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        category.status,
                      )}`}
                    >
                      {category.status === "Active" ? t("offers_admin.active") : category.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEdit && onEdit(category)}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        aria-label="Edit category"
                      >
                        <Edit size={18} />
                      </button>

                      <button
                        onClick={() => onView && onView(category)}
                        className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 transition-colors"
                        aria-label="View category"
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(category._id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        aria-label="Delete category"
                      >
                        <Trash2 size={18} />
                      </button>
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
