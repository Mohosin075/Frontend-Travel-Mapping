"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar } from "@/components/ui/avatar";
import { DEFAULT_AVATAR, getProfileImageUrl } from "@/lib/utils";
import { useLogoutMutation } from "@/redux/features/auth/authApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useGetUnreadCountQuery } from "@/redux/features/notification/notificationApi";
import { getSocket, emitWhenReady } from "@/lib/socket";
import ProfileUpdateModal from "../Common/profile/profile-update-modal";
import { SidebarTrigger } from "../ui/sidebar";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/redux/hook";
import { logout } from "@/redux/features/auth/authSlice";
import { broadcastLogout } from "@/components/shared/cross-tab-logout-listener";
import { persistor } from "@/redux/store";
import { baseApi } from "@/redux/api/baseApi";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import NotificationBellDropdown from "@/components/shared/notification-bell-dropdown";

export default function DashTopHeader() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { data: user } = useGetProfileQuery({});
  const { data: unreadData, refetch: refetchUnread } = useGetUnreadCountQuery();
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (user?._id) {
      emitWhenReady("join-room", user._id);
    }

    const handleUpdate = () => {
      refetchUnread();
    };

    socket.on("unread_count_update", handleUpdate);
    socket.on("notification", handleUpdate);

    return () => {
      socket.off("unread_count_update", handleUpdate);
      socket.off("notification", handleUpdate);
    };
  }, [user?._id, refetchUnread]);

  const [logoutApi] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutApi({}).unwrap();
    } catch {
    } finally {
      broadcastLogout(); // signal all other tabs
      dispatch(logout());
      dispatch(baseApi.util.resetApiState());
      await persistor.purge();
      localStorage.clear();
      router.push("/");
    }
  };

  return (
    <div className="p-4 md:px-8 border-b border-gray-300/50 dark:border-slate-800 bg-white dark:bg-[#0b0f19] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="lg:hidden text-gray-700 dark:text-slate-200" />
          <h1 className="text-xl font-bold font-arial text-gray-900 dark:text-slate-100">{t("dashboard.admin_panel")}</h1>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBellDropdown
            userId={user?._id}
            viewAllHref="/dashboard/notification"
          />
          <ThemeToggle />
          <LanguageSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <Avatar className="w-10 h-10 cursor-pointer">
                <Image
                  src={getProfileImageUrl(user?.profile)}
                  alt="Profile"
                  width={40}
                  height={40}
                  onError={(event) => { event.currentTarget.src = DEFAULT_AVATAR; }}
                  unoptimized
                  className="object-cover"
                />
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>{user?.name}</DropdownMenuItem>
              <DropdownMenuItem>{user?.email}</DropdownMenuItem>
              <DropdownMenuItem>{user?.role}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpen(true)}>
                {t("dashboard.edit_profile")}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                {t("dashboard.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ProfileUpdateModal open={open} onOpenChange={setOpen} data={user} />
    </div>
  );
}
