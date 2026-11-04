"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useGetProfileQuery,
  useInviteUserMutation,
} from "@/redux/features/user/userApi";
import { useGetManagedMapsQuery } from "@/redux/features/map/mapApi";
import {
  normalizeId,
  toggleMapAssignment,
  countriesFromSelectedMaps,
} from "@/lib/editor-access";
import { assignableRolesFor, type AppRole } from "@/lib/roles";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// ROLE_LABELS is now defined inside the component using useLanguage

interface FormData {
  email: string;
  role: string;
}

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";

export function InviteUserForm(): React.ReactElement {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    email: "",
    role: "user",
  });

  const ROLE_LABELS: Record<AppRole, string> = {
    user: t("users_admin.user"),
    map_editor: t("users_admin.map_editor"),
    admin: t("users_admin.admin"),
    super_admin: t("users_admin.super_admin"),
  };
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  const [mapSearch, setMapSearch] = useState("");

  const [inviteUser, { isLoading }] = useInviteUserMutation();
  const { data: currentUser } = useGetProfileQuery({});
  const { data: mapsRes, isLoading: isLoadingMaps } = useGetManagedMapsQuery({
    limit: 100,
  });

  const maps = mapsRes?.data || [];
  const allowedRoles = assignableRolesFor(currentUser?.role);
  const selectedCountries = countriesFromSelectedMaps(selectedMaps, maps);

  const filteredMaps = maps.filter(
    (map: any) =>
      getLocalized(map.name, language)?.toLowerCase().includes(mapSearch.toLowerCase()) ||
      (map.country &&
        map.country.toLowerCase().includes(mapSearch.toLowerCase())),
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear editor assignments when leaving map_editor role
    if (name === "role" && value !== "map_editor") {
      setSelectedMaps([]);
      setMapSearch("");
    }
  };

  const handleMapToggle = (map: any, checked: boolean) => {
    const next = toggleMapAssignment(
      map,
      checked,
      selectedMaps,
      selectedCountries,
      maps,
    );
    setSelectedMaps(next.maps);
  };

  const resetForm = () => {
    setFormData({ email: "", role: "user" });
    setSelectedMaps([]);
    setMapSearch("");
  };

  const handleSubmit = async () => {
    const email = formData.email.trim().toLowerCase();
    if (!email) {
      toast.error(t("users_admin.enter_email"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("users_admin.invalid_email"));
      return;
    }
    if (!formData.role) {
      toast.error(t("users_admin.select_role"));
      return;
    }
    if (!allowedRoles.includes(formData.role as AppRole)) {
      toast.error(t("users_admin.not_allowed_role"));
      return;
    }

    if (formData.role === "map_editor") {
      if (selectedMaps.length === 0) {
        toast.error(t("users_admin.assign_map_editor_error"));
        return;
      }
    }

    const payload: {
      email: string;
      role: string;
      assignedMaps?: string[];
      assignedCountries?: string[];
    } = {
      email,
      role: formData.role,
    };

    if (formData.role === "map_editor") {
      payload.assignedMaps = selectedMaps;
      payload.assignedCountries = selectedCountries;
    }

    try {
      await inviteUser(payload).unwrap();
      toast.success(t("users_admin.invitation_sent_success"), {
        description: "They will receive an email with a code to set their password.",
      });
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to send invitation");
    }
  };

  const isEditor = formData.role === "map_editor";

  return (
    <Card className="p-6 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100">
      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">{t("users_admin.invite_user")}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            {t("users_admin.email_address")} <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            name="email"
            placeholder="user@example.com"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            {t("users_admin.role")} <span className="text-red-500">*</span>
          </label>
          <select
            name="role"
            value={
              allowedRoles.includes(formData.role as AppRole)
                ? formData.role
                : allowedRoles[0] || "user"
            }
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-gray-900 [&>option]:dark:text-slate-100"
            disabled={isLoading || allowedRoles.length === 0}
          >
            {allowedRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        {isEditor && (
          <div className="col-span-1 md:col-span-2 space-y-3">
            <p className="text-sm text-gray-600 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-100 dark:border-yellow-900/40 rounded-lg px-3 py-2">
              {t("users_admin.assign_map")}. {t("users_admin.scoped_access")}
            </p>

            {isLoadingMaps ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("users_admin.loading_maps")}
              </div>
            ) : (
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
                    <span className="text-gray-300 dark:text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMaps([])}
                      className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                    >
                      {t("users_admin.clear_all")}
                    </button>
                  </div>
                </div>

                <Input
                  placeholder={t("common.search_maps")}
                  value={mapSearch}
                  onChange={(e) => setMapSearch(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100"
                />

                <div className="border border-gray-200 dark:border-slate-800 rounded-lg p-2 max-h-56 overflow-y-auto space-y-1.5 bg-gray-50/50 dark:bg-[#0e1424]">
                  {filteredMaps.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-slate-400 py-4 text-center">
                      {t("users_admin.no_maps")}
                    </p>
                  ) : (
                    filteredMaps.map((map: any) => {
                      const mapId = normalizeId(map._id);
                      const isChecked = selectedMaps.includes(mapId);
                      return (
                        <label
                          key={mapId}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer select-none transition-all ${
                            isChecked
                              ? "bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40"
                              : "text-gray-700 dark:text-slate-300 border border-transparent hover:bg-gray-100/70 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              handleMapToggle(map, e.target.checked)
                            }
                            className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="truncate">
                            {getLocalized(map.name, language)}{" "}
                            {map.country ? `(${map.country})` : ""}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button
          onClick={resetForm}
          variant="outline"
          className="px-6 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
          disabled={isLoading}
        >
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          className="bg-primary hover:bg-primary/95 text-black px-6 min-w-[140px]"
          disabled={isLoading || (isEditor && isLoadingMaps)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("contact_form.sending")}
            </>
          ) : (
            t("users_admin.send_invitation")
          )}
        </Button>
      </div>
    </Card>
  );
}
