"use client";

import Link from "next/link";
import { Trash2, Search, Map, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  useGetAllUsersQuery,
  useDeleteUserMutation,
  useUpdateUserRoleMutation,
  useGetProfileQuery,
  useAssignEditorAccessMutation,
} from "@/redux/features/user/userApi";
import { useGetMapsQuery } from "@/redux/features/map/mapApi";
import { useState } from "react";
import { appAlert } from "@/lib/app-alert";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  normalizeId,
  normalizeIdList,
  toggleMapAssignment,
  countriesFromSelectedMaps,
} from "@/lib/editor-access";
import {
  assignableRolesFor,
  canDeleteUser,
  canManageUserRole,
  type AppRole,
} from "@/lib/roles";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";

export function UsersTable(): React.ReactElement {
  const { t, language } = useLanguage();

  const ROLE_LABELS: Record<AppRole, string> = {
    user: t("users_admin.user"),
    map_editor: t("users_admin.map_editor"),
    admin: t("users_admin.admin"),
    super_admin: t("users_admin.super_admin"),
  };

  const userTableHeaders = [
    t("categories_admin.category_name"),
    t("settings_admin.email_address"),
    t("users_admin.role"),
    t("offers_admin.status"),
    t("profile.joined"),
    "Actions",
  ];

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [role, setRole] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State for Map Editor access control
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"change_role" | "edit_access">("change_role");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [tempRole, setTempRole] = useState("");
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);

  // Search state for Modal
  const [modalMapSearch, setModalMapSearch] = useState("");

  const { data: currentUser } = useGetProfileQuery({});
  const { data: mapsRes } = useGetMapsQuery({ limit: 100 });
  const [assignEditorAccess] = useAssignEditorAccessMutation();

  const maps = mapsRes?.data || [];

  // Filtered list for Modal
  const filteredModalMaps = maps.filter((map: any) =>
    getLocalized(map.name, language)?.toLowerCase().includes(modalMapSearch.toLowerCase()) ||
    (map.country && map.country.toLowerCase().includes(modalMapSearch.toLowerCase()))
  );

  const selectedCountries = countriesFromSelectedMaps(selectedMaps, maps);

  const queryParams: any = {
    page,
    limit,
  };

  if (role !== "all") queryParams.role = role;
  if (status !== "all") queryParams.status = status;
  if (searchTerm) queryParams.searchTerm = searchTerm;

  const {
    data: response,
    isLoading,
    isError,
  } = useGetAllUsersQuery(queryParams);
  const [deleteUser] = useDeleteUserMutation();
  const [updateUserRole] = useUpdateUserRoleMutation();

  const users = response?.data || [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1, totalPage: 1 };
  const totalPages = Math.max(1, meta.totalPages || meta.totalPage || Math.ceil((meta.total || 0) / limit));

  const handleDelete = async (userId: string) => {
    const result = await appAlert.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteUser(userId).unwrap();
        toast.success(t("users_admin.user_deleted_success"));
      } catch (error: any) {
        toast.error(error?.data?.message || "Failed to delete user");
      }
    }
  };

  const allowedRoles = assignableRolesFor(currentUser?.role);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const userToUpdate = users.find((u: any) => u._id === userId);

    if (!canManageUserRole(currentUser?.role, userToUpdate?.role)) {
      toast.error(t("users_admin.cannot_change_role"));
      return;
    }
    if (!allowedRoles.includes(newRole as AppRole)) {
      toast.error(t("users_admin.not_allowed_assign_role"));
      return;
    }

    if (newRole === "map_editor") {
      setModalMode("change_role");
      setSelectedUser(userToUpdate);
      setTempRole(newRole);
      setSelectedMaps(normalizeIdList(userToUpdate?.assignedMaps));
      setIsAccessModalOpen(true);
      return;
    }

    const result = await appAlert.fire({
      title: t("common.are_you_sure"),
      text: `Are you sure you want to change this user's role to ${newRole}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, change it!",
    });

    if (result.isConfirmed) {
      try {
        await updateUserRole({ userId, role: newRole }).unwrap();
        toast.success(t("users_admin.user_role_updated_success"));
      } catch (error: any) {
        toast.error(error?.data?.message || "Failed to update user role");
      }
    }
  };

  const handleEditAccess = (user: any) => {
    setModalMode("edit_access");
    setSelectedUser(user);
    setTempRole(user.role);
    setSelectedMaps(normalizeIdList(user.assignedMaps));
    setIsAccessModalOpen(true);
  };

  const handleModalMapToggle = (map: any, checked: boolean) => {
    const next = toggleMapAssignment(
      map,
      checked,
      selectedMaps,
      selectedCountries,
      maps,
    );
    setSelectedMaps(next.maps);
  };

  const handleSaveAccess = async () => {
    if (!selectedUser) return;

    if (selectedMaps.length === 0) {
      toast.error(t("users_admin.assign_map_editor_error"));
      return;
    }

    try {
      if (modalMode === "change_role") {
        await updateUserRole({
          userId: selectedUser._id,
          role: tempRole,
          assignedMaps: selectedMaps,
          assignedCountries: selectedCountries,
        }).unwrap();
        toast.success(t("users_admin.user_role_updated_assignments_success"));
      } else {
        await assignEditorAccess({
          userId: selectedUser._id,
          assignedMaps: selectedMaps,
          assignedCountries: selectedCountries,
        }).unwrap();
        toast.success(t("users_admin.editor_access_updated_success"));
      }
      setIsAccessModalOpen(false);
      setSelectedUser(null);
      setSelectedMaps([]);
      setModalMapSearch("");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to save editor access");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
          <Input
            placeholder={t("users_admin.search_users_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder={t("users_admin.role")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("users_admin.all_roles")}</SelectItem>
              <SelectItem value="user">{t("users_admin.user")}</SelectItem>
              <SelectItem value="admin">{t("users_admin.admin")}</SelectItem>
              <SelectItem value="map_editor">{t("users_admin.map_editor")}</SelectItem>
              <SelectItem value="super_admin">{t("users_admin.super_admin")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder={t("users_admin.active")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("users_admin.all_status")}</SelectItem>
              <SelectItem value="active">{t("users_admin.active")}</SelectItem>
              <SelectItem value="inactive">{t("users_admin.inactive")}</SelectItem>
              <SelectItem value="deleted">{t("users_admin.deleted")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] py-0 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
              <tr>
                {userTableHeaders.map((header) => (
                  <th
                    key={header}
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-200"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-500 dark:text-slate-400"
                  >
                    {t("users_admin.loading_users")}
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-red-500 dark:text-rose-400"
                  >
                    Failed to load users.
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-500 dark:text-slate-400"
                  >
                    {t("users_admin.no_maps")}
                  </td>
                </tr>
              ) : (
                users.map((user: any) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-100 font-medium">
                      <div className="flex flex-col">
                        <Link
                          href={`/dashboard/users-roles/${user._id}`}
                          className="hover:underline font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {user.name || "Unknown User"}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      {currentUser?._id === user._id ||
                        !canManageUserRole(currentUser?.role, user.role) ? (
                        <div className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800/60 inline-block text-[10px] font-bold uppercase tracking-wider">
                          {user.role}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Select
                            value={user.role}
                            onValueChange={(newRole) =>
                              handleRoleChange(user._id, newRole)
                            }
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedRoles.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </SelectItem>
                              ))}
                              {/* Keep current role visible even if actor can't re-assign it */}
                              {!allowedRoles.includes(user.role) && (
                                <SelectItem value={user.role}>
                                  {ROLE_LABELS[user.role as AppRole] || user.role}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {user.role === "map_editor" && (
                            <div className="text-[10px] text-gray-500 dark:text-slate-400 flex flex-col gap-0.5 mt-1 font-semibold bg-gray-50 dark:bg-slate-900/60 p-1.5 rounded border border-gray-150 dark:border-slate-800">
                              <span>Maps: {user.assignedMaps?.length || 0} assigned</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      <div
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${user.status === "active"
                            ? "bg-green-100 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-300 border border-transparent dark:border-emerald-800/60"
                            : user.status === "inactive"
                              ? "bg-yellow-100 dark:bg-amber-950/40 text-yellow-700 dark:text-amber-300 border border-transparent dark:border-amber-800/60"
                              : "bg-red-100 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 border border-transparent dark:border-rose-800/60"
                          }`}
                      >
                        {user.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/users-roles/${user._id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded inline-flex items-center"
                          title={t("users_admin.view_profile") || "View User Profile"}
                          aria-label={t("users_admin.view_profile") || "View User Profile"}
                        >
                          <Eye size={18} />
                        </Link>
                        {user.role === "map_editor" &&
                          canManageUserRole(currentUser?.role, user.role) && (
                            <button
                              onClick={() => handleEditAccess(user)}
                              className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded"
                              title={t("users_admin.edit_editor_access")}
                              aria-label={t("users_admin.edit_editor_access")}
                            >
                              <Map size={18} />
                            </button>
                          )}
                        {canDeleteUser(currentUser?.role, user.role) &&
                          currentUser?._id !== user._id && (
                            <button
                              onClick={() => handleDelete(user._id)}
                              className="text-red-500 dark:text-rose-400 hover:text-red-700 dark:hover:text-rose-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-rose-950/40 rounded"
                              aria-label={t("common.delete")}
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

        {/* Pagination & Rows per page */}
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-900/60 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-slate-400">
            <div>
              Showing{" "}
              <span className="font-bold text-gray-900 dark:text-slate-200">
                {(meta.total || 0) > 0 ? (page - 1) * limit + 1 : 0}
              </span>
              –
              <span className="font-bold text-gray-900 dark:text-slate-200">
                {Math.min(page * limit, meta.total || 0)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-gray-900 dark:text-slate-200">
                {meta.total || 0}
              </span>{" "}
              users
            </div>

            {/* Entries per page selector */}
            <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-slate-700 pl-4">
              <span>Show</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[75px] h-8 text-xs font-semibold bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 dark:text-slate-200 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
          </div>

          {/* Navigation Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft size={14} />
              </button>

              {/* Previous Page */}
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 h-8 flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Page Number Buttons with Smart Windowing */}
              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <div key={p} className="flex items-center gap-1">
                        {showEllipsis && (
                          <span className="px-1 text-xs text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            page === p
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Next Page */}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2.5 h-8 flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Editor Access Control Modal */}
      <Dialog open={isAccessModalOpen} onOpenChange={setIsAccessModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-slate-100 font-bold text-lg">
              {modalMode === "change_role" ? "Assign Map Editor Access" : "Edit Map Editor Access"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2">
              <p className="text-sm text-gray-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/60 rounded-lg px-3 py-2">
                {t("users_admin.assign_at_least_one")} <strong>{t("maps_admin.map_name").toLowerCase()}</strong>. {t("users_admin.scoped_access")}
              </p>

            {/* Maps list */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                  Assign Maps ({selectedMaps.length} selected)
                </label>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMaps(maps.map((m: any) => normalizeId(m._id)));
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    {t("users_admin.select_all")}
                  </button>
                  <span className="text-gray-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMaps([])}
                    className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
                  >
                    {t("users_admin.clear_all")}
                  </button>
                </div>
              </div>

              <Input
                placeholder={t("common.search_maps")}
                value={modalMapSearch}
                onChange={(e) => setModalMapSearch(e.target.value)}
                className="h-9 text-xs"
              />

              <div className="border border-gray-200 dark:border-slate-800 rounded-lg p-2 max-h-56 overflow-y-auto space-y-1.5 bg-gray-50/50 dark:bg-slate-900/40">
                {filteredModalMaps.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-slate-400 py-4 text-center">No maps found.</p>
                ) : (
                  filteredModalMaps.map((map: any) => {
                    const mapId = normalizeId(map._id);
                    const isChecked = selectedMaps.includes(mapId);
                    return (
                      <label
                        key={mapId}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer select-none transition-all ${isChecked
                            ? "bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/60"
                            : "text-gray-700 dark:text-slate-300 border border-transparent hover:bg-gray-100/70 dark:hover:bg-slate-800/60"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            handleModalMapToggle(map, e.target.checked)
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="truncate">{getLocalized(map.name, language)} {map.country ? `(${map.country})` : ""}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAccessModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveAccess} className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
              {t("users_admin.save_access")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
