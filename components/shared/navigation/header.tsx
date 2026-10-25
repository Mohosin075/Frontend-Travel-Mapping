"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Check,
  CheckCircle2,
  CircleDollarSign,
  Edit2,
  Grid2x2,
  Heart,
  Loader2,
  Map,
  Menu,
  Search,
  Share2,
  Star,
  Trophy,
  User,
  X,
  MapPin,
  Navigation,
  Compass,
} from "lucide-react";

import { getImageUrl, getLocalized } from "@/lib/utils";
import { useLogoutMutation } from "@/redux/features/auth/authApi";
import { logout } from "@/redux/features/auth/authSlice";
import { broadcastLogout } from "@/components/shared/cross-tab-logout-listener";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useGetPlacesQuery } from "@/redux/features/place/placeApi";
import { useGetLevelConfigsQuery } from "@/redux/features/award/awardApi";
import { getEffectiveLevels, calculateUserLevel } from "@/lib/level-utils";
import { useGetUnreadCountQuery } from "@/redux/features/notification/notificationApi";
import { getSocket, emitWhenReady } from "@/lib/socket";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { persistor } from "@/redux/store";
import { baseApi } from "@/redux/api/baseApi";
import Image from "next/image";
import logo from "@/public/logo.png";
import whiteLogo from "@/public/white-logo.png";
import Link from "next/link";
import { AuthLink } from "@/components/shared/auth-link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { NoImage } from "@/lib/others/others";
import { Progress } from "@/components/ui/progress";
import ProfileUpdateModal from "@/components/Common/profile/profile-update-modal";
import { shareProfile } from "@/lib/share-profile";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import NotificationBellDropdown from "@/components/shared/notification-bell-dropdown";

function getPlaceSearchHref(place: any, onMapsPage: boolean) {
  if (!onMapsPage) return `/places/${place._id || place.id}`;

  const coords =
    place?.location?.mapLocation?.coordinates ||
    place?.location?.coordinates ||
    place?.coordinates;
  const lng = Array.isArray(coords) ? coords[0] : place?.longitude;
  const lat = Array.isArray(coords) ? coords[1] : place?.latitude;
  const mapName =
    (typeof place?.map === "object" && (place.map?.name || place.map?.country)) ||
    place?.mapName ||
    place?.country ||
    "";
  const type =
    String(place?.type || place?.placeType || "").toLowerCase() === "business"
      ? "business"
      : "place";
  const params = new URLSearchParams({
    focus: String(place?._id || place?.id || ""),
    type,
  });
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  if (mapName) params.set("map", String(mapName));
  return `/maps?${params.toString()}`;
}

// navLinks moved inside component to support dynamic translation

// menuItems moved inside Header component to support dynamic translation

export default function Header() {
  const pathname = usePathname();
  const hideHeaderSearch = pathname === "/places" || pathname === "/offer";
  const onMapsPage = pathname === "/maps";
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t, language } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [mounted, setMounted] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when mobile menu or search drawer is open
  useEffect(() => {
    if (isMenuOpen || isSearchOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMenuOpen, isSearchOpen]);

  // Ensure search input in sidebar is never stale/cached when opening or closing
  useEffect(() => {
    setSearchTerm("");
  }, [isMenuOpen]);

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > 120;
      if (!past && headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
      setScrolled(past);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { name: t("nav.map"), href: "/maps" },
    { name: t("nav.places"), href: "/places" },
    { name: t("nav.offer"), href: "/offer" },
    { name: t("nav.catalog"), href: "/catalog" },
    { name: t("nav.for_business"), href: "/for-business" },
  ];

  const menuItems = [
    { label: t("nav.saved_routes") || "Mis Rutas", href: "/profile/saved-routes", icon: Compass },
    { label: t("nav.visited_places") || "Visited Places", href: "/profile/visited-places", icon: CheckCircle2 },
    { label: t("nav.favorite_places"), href: "/profile/favorite-places", icon: Heart },
    { label: t("nav.my_business"), href: "/profile/my-business", icon: Grid2x2 },
    { label: t("nav.contributions"), href: "/profile/contributions-reviews", icon: Star },
    { label: t("nav.subscription"), href: "/profile/subscription", icon: CircleDollarSign },
    { label: t("nav.awards"), href: "/profile/awards", icon: Trophy },
  ];


  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [enterSearching, setEnterSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: placesRes, isFetching } = useGetPlacesQuery(
    { searchTerm: debouncedSearch, limit: 5 },
    { skip: debouncedSearch.trim().length === 0 },
  );
  const rawPlaces = placesRes?.data || [];
  const places = useMemo(() => {
    const seen = new Set<string>();
    return rawPlaces.filter((p: any) => {
      const name = (typeof p.name === "string" ? p.name : p.name?.es || p.name?.en || "").trim().toLowerCase();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [rawPlaces]);
  const isSearchPending =
    enterSearching ||
    (searchTerm.trim().length > 0 &&
      (searchTerm !== debouncedSearch || isFetching));
  const isAuthenticated = useAppSelector((state) => state.auth.accessToken);

  const { data: user } = useGetProfileQuery({});

  const { data: unreadData, refetch: refetchUnread } = useGetUnreadCountQuery(
    undefined,
    {
      skip: !isAuthenticated,
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  useEffect(() => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated, user?._id, refetchUnread]);

  const dismissKeyboard = () => {
    if (typeof document !== "undefined") {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      try {
        const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
        inputs.forEach((input) => input.blur());
      } catch {
        // ignore
      }
    }
  };

  const submitHeaderSearch = () => {
    dismissKeyboard();
    const next = searchTerm.trim();
    if (!next) return;
    setEnterSearching(true);
    setDebouncedSearch(next);
    closeMenus();
    router.push(`/maps?q=${encodeURIComponent(next)}`, { scroll: false });
  };

  useEffect(() => {
    if (!enterSearching) return;
    if (isFetching) return;
    const timer = setTimeout(() => setEnterSearching(false), 500);
    return () => clearTimeout(timer);
  }, [enterSearching, isFetching]);

  const isAdminOrEditor = ["super_admin", "admin", "map_editor"].includes(user?.role || "");
  const visibleMenuItems = menuItems;
  const [logoutApi] = useLogoutMutation();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileProfileMenuOpen, setIsMobileProfileMenuOpen] = useState(false);
  const [isSharingProfile, setIsSharingProfile] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleEditProfile = () => {
    setIsProfileMenuOpen(false);
    setIsMobileProfileMenuOpen(false);
    // Let dropdown close before opening dialog (avoids focus trap conflicts)
    setTimeout(() => setIsUpdateModalOpen(true), 50);
  };

  const handleShareProfile = async () => {
    setIsSharingProfile(true);
    const result = await shareProfile({
      userId: user?._id,
      name: user?.name,
    });
    setIsSharingProfile(false);
    if (result === "copied" || result === "shared") {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const USER_LEVELS = [
    { level: 0, name: t("levels.explorador") || "Explorador", points: 0 },
    { level: 1, name: t("levels.aventurero") || "Aventurero", points: 100 },
    { level: 2, name: t("levels.tlacuilo") || "Tlacuilo", points: 200 },
    { level: 3, name: t("levels.expedicionario") || "Expedicionario", points: 400 },
    { level: 4, name: t("levels.viajero") || "Viajero", points: 700 },
    { level: 5, name: t("levels.chasqui") || "Chasqui", points: 1300 },
    { level: 6, name: t("levels.cronista") || "Cronista", points: 2200 },
    { level: 7, name: t("levels.baquiano") || "Baquiano", points: 3500 },
    { level: 8, name: t("levels.cartografo") || "Cartógrafo", points: 5500 },
    { level: 9, name: t("levels.maestro_ruta") || "Maestro Ruta", points: 8500 },
    { level: 10, name: t("levels.leyenda") || "Leyenda", points: 13000 },
    { level: 11, name: t("levels.gran_leyenda") || "Gran Leyenda", points: 20000 },
    { level: 12, name: t("levels.mitico") || "Mítico", points: 30000 },
    { level: 13, name: t("levels.inmortal") || "Inmortal", points: 45000 },
    { level: 14, name: t("levels.supremo") || "Supremo", points: 65000 }
  ];
  const currentLevelIndex = user?.level || 0;
  const nextLevelIndex = currentLevelIndex < 14 ? currentLevelIndex + 1 : 14;
  const maxPoints = USER_LEVELS[nextLevelIndex]?.points || 1000;
  const progress = maxPoints > 0 ? ((user?.points || 0) / maxPoints) * 100 : 100;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Must await API to clear httpOnly refreshToken cookie before clearing local state.
      // Otherwise, concurrent API calls on redirect will get 401 and refresh the token automatically!
      await logoutApi({}).unwrap();
    } catch {
      // Ignore errors
    } finally {
      broadcastLogout(); // signal all other tabs
      dispatch(logout());
      dispatch(baseApi.util.resetApiState());
      persistor.purge();
      localStorage.clear();
      closeMenus();
      router.push("/");
      setIsLoggingOut(false);
    }
  };

  const toggleMenu = () => {
    const next = !isMenuOpen;
    setIsMenuOpen(next);
    if (next) {
      setIsSearchOpen(false);
      setIsMobileProfileMenuOpen(false);
      setIsProfileMenuOpen(false);
      setSearchTerm("");
    }
  };

  const toggleSearch = () => {
    const next = !isSearchOpen;
    setIsSearchOpen(next);
    if (next) {
      setIsMenuOpen(false);
      setIsMobileProfileMenuOpen(false);
      setIsProfileMenuOpen(false);
    } else {
      setSearchTerm("");
    }
  };

  const closeMenus = () => {
    dismissKeyboard();
    setIsMenuOpen(false);
    setIsSearchOpen(false);
    setIsMobileProfileMenuOpen(false);
    setIsProfileMenuOpen(false);
    setSearchTerm("");
  };

  return (
    <div style={scrolled && headerHeight ? { height: headerHeight } : undefined}>
      <header
        ref={headerRef}
        className={`isolate border-b ${
          scrolled
            ? "fixed top-0 inset-x-0 z-[100] border-gray-200/60 dark:border-slate-800/80 shadow-md animate-in slide-in-from-top duration-300"
            : "relative z-[100] border-gray-100 dark:border-slate-800/60"
        }`}
      >
        {/* Background layer (separate so backdrop-filter doesn't trap fixed children) */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 transition-all duration-300 ${
            scrolled
              ? "bg-white/85 dark:bg-[#0b0f19]/85 backdrop-blur-xl border-b border-transparent dark:border-slate-800/80"
              : "bg-white dark:bg-[#0b0f19]"
          }`}
        />
        <nav className="flex items-center justify-between px-3 sm:px-6 py-3.5 sm:py-4 max-w-360 mx-auto gap-2 sm:gap-4">
          {/* Logo */}
          <div className="shrink-0">
            <Link href={isAuthenticated ? "/maps" : "/"}>
              <Image
                src={logo}
                alt="Dashboard Logo"
                height={200}
                width={200}
                className="w-32 sm:w-40 md:w-48 h-auto block dark:hidden"
                priority
              />
              <Image
                src={whiteLogo}
                alt="Dashboard Logo"
                height={200}
                width={200}
                className="w-32 sm:w-40 md:w-48 h-auto hidden dark:block"
                priority
              />
            </Link>
          </div>

          {/* Search Bar - Desktop — hidden on Places/Offers (page has its own) */}
          {!hideHeaderSearch && (
            <div className="hidden md:block flex-1 min-w-[150px] lg:min-w-[170px] xl:min-w-[280px] max-w-xl mx-2 xl:mx-4">
              <div className="relative group w-full">
                <button
                  type="button"
                  onClick={() => {
                    dismissKeyboard();
                    submitHeaderSearch();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors cursor-pointer"
                  aria-label="Search"
                >
                  <Search className="size-5" />
                </button>
                <input
                  type="text"
                  enterKeyHint="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLElement)?.blur();
                      dismissKeyboard();
                      submitHeaderSearch();
                    }
                  }}
                  placeholder={t("search.placeholder_full")}
                  className="w-full bg-[#F5F5F5] dark:bg-[#131b2e] border border-transparent dark:border-slate-800 rounded-full py-3 pl-11 pr-5 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#fabf13]/50 outline-none transition-all"
                />

                {/* Search Results Dropdown */}
                {searchTerm && (
                  <div className="absolute top-full mt-2 left-0 w-full min-w-[340px] sm:min-w-[420px] max-w-[min(90vw,540px)] bg-white dark:bg-[#131b2e]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in-0 zoom-in-95">
                    {isSearchPending ? (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400 flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                        {t("search.searching")}
                      </div>
                    ) : places.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto overflow-x-hidden">
                        {places.map((place: any) => (
                          <Link
                            key={place._id}
                            href={getPlaceSearchHref(place, onMapsPage)}
                            onClick={() => {
                              if (onMapsPage) {
                                const mapName =
                                  (typeof place.map === "object" &&
                                    (place.map?.name || place.map?.country)) ||
                                  place.country;
                                if (mapName) {
                                  localStorage.setItem(
                                    "selectedCountryFilter",
                                    String(mapName),
                                  );
                                }
                              }
                              setSearchTerm("");
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors border-b border-gray-50 dark:border-slate-800/60 last:border-0"
                          >
                            <div className="size-10 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                              {place.media?.[0] ? (
                                <img
                                  src={getImageUrl(place.media[0])}
                                  alt={place.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Map className="size-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                                {getLocalized(place.name, language)}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                {place.address}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">
                        {t("search.no_results")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-0.5 xl:gap-2 whitespace-nowrap">
            {navLinks.map((link, index) => {
              const isActive = pathname === link.href;

              return (
                <AuthLink
                  key={index}
                  href={link.href}
                  className={`font-semibold font-inter transition-all text-xs xl:text-sm rounded-xl py-1.5 px-2 xl:px-3.5 shrink-0 ${
                    isActive
                      ? "bg-primary text-black dark:text-slate-950 font-bold shadow-[0_2px_12px_rgba(250,191,19,0.35)]"
                      : "text-gray-700 dark:text-slate-300 hover:text-black dark:hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {link.name}
                </AuthLink>
              );
            })}

            <div className="h-8 w-px bg-gray-200 dark:bg-slate-800 mx-2"></div>

            {/* Auth Section - Desktop */}
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <NotificationBellDropdown
                  userId={user?._id}
                  viewAllHref="/notifications"
                />
              )}
              <ThemeToggle />
              <LanguageSwitcher />
              {isAuthenticated ? (
                <DropdownMenu
                  open={isProfileMenuOpen}
                  onOpenChange={setIsProfileMenuOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <button className="outline-none">
                      <Avatar className="h-10 w-10 cursor-pointer border">
                        {user?.profile ? (
                          <AvatarImage
                            src={getImageUrl(user.profile)}
                            width={500}
                            height={500}
                            className="object-cover"
                          />
                        ) : (
                          <AvatarFallback>
                            <User className="size-5" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-72 2overflow-hidden rounded-xl shadow-lg "
                  >
                    <div className="border p-3 rounded-md text-center">
                      {/* Avatar with Achievement Badge */}
                      <div className="relative w-32 h-32 mx-auto mb-4 overflow-hidden rounded-lg border">
                        {user?.profile ? (
                          <Image
                            src={getImageUrl(user?.profile)}
                            alt={"Logo"}
                            width={500}
                            height={500}
                            unoptimized
                            className="object-cover h-full"
                          />
                        ) : (
                          <NoImage />
                        )}

                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white">
                          ⭐
                        </div>
                      </div>

                      {/* User Name */}
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-0.5">
                        {user?.name}
                      </h2>

                      {/* User Email */}
                      {user?.email && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2 break-all">
                          {user.email}
                        </p>
                      )}

                      <div className="space-y-1 mb-4">
                        <p>
                          {t("levels.level")} <span className="font-bold">{user?.level}</span>
                        </p>

                        <Progress value={progress} className="h-2" />

                        <p className="text-sm text-gray-500">
                          {user?.points || 0} / {maxPoints} {t("levels.points")}
                        </p>
                      </div>

                      {/* Level Badge */}
                      {/* <div className="inline-block bg-yellow-50 px-3 py-0.5 rounded-full mb-2">
                        <span className="text-primary font-semibold capitalize">
                          {user?.role}
                        </span>
                      </div> */}

                      {/* Action Buttons */}
                      <div className="space-y-3">
                        <Button
                          type="button"
                          onClick={handleEditProfile}
                          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded flex items-center justify-center gap-2"
                        >
                          <Edit2 size={18} />
                          {t("profile.edit_profile")}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleShareProfile}
                          disabled={isSharingProfile || !user?._id}
                          className="w-full rounded flex items-center justify-center gap-2 border-gray-200 hover:bg-yellow-50"
                        >
                          {isSharingProfile ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : shareCopied ? (
                            <Check size={18} className="text-green-600" />
                          ) : (
                            <Share2 size={18} />
                          )}
                          {shareCopied ? t("common.copied") : t("profile.share_profile")}
                        </Button>
                      </div>
                    </div>
                    <div className="py-2">
                      {isAdminOrEditor && (
                        <Link href={"/dashboard"}>
                          <DropdownMenuItem className="px-4 py-3 cursor-pointer">
                            <Grid2x2 className="mr-3 size-5" />
                            {t("nav.dashboard") || "Dashboard"}
                          </DropdownMenuItem>
                        </Link>
                      )}
                      <div>
                        {visibleMenuItems.map((item, index) => {
                          const Icon = item.icon;

                          return (
                            <Link key={index} href={item.href}>
                              <DropdownMenuItem className="px-4 py-3 cursor-pointer">
                                <Icon className="mr-3 size-5" />
                                {item.label}
                              </DropdownMenuItem>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    <DropdownMenuSeparator />

                    {/* ✅ Logout button wired up */}
                    <Button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full bg-[#FFC107] hover:bg-[#FFB300] py-3 font-semibold text-center"
                    >
                      {isLoggingOut ? t("common.loading") : t("nav.logout")}
                    </Button>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold font-public-sans rounded-xl px-4 xl:px-8 py-2 xl:py-2.5 text-xs xl:text-base shadow-none h-auto">
                    {t("nav.login") || "Log In"}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile & Tablet Icons */}
          <div className="flex lg:hidden items-center gap-2">
            {!hideHeaderSearch && (
              <button
                type="button"
                onClick={toggleSearch}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-full transition-colors cursor-pointer"
                aria-label="Toggle search"
              >
                <Search className="size-5" />
              </button>
            )}

            {/* Notification Bell - Mobile */}
            {isAuthenticated && (
              <NotificationBellDropdown
                userId={user?._id}
                viewAllHref="/notifications"
              />
            )}

            {/* Profile Icon - Mobile */}
            {isAuthenticated ? (
              <DropdownMenu
                open={isMobileProfileMenuOpen}
                onOpenChange={(open) => {
                  setIsMobileProfileMenuOpen(open);
                  if (open) {
                    setIsMenuOpen(false);
                    setIsSearchOpen(false);
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    className="outline-none rounded-full ring-2 ring-yellow-400/70 ring-offset-2"
                    aria-label="Open profile"
                  >
                    <Avatar className="h-9 w-9 cursor-pointer">
                      {user?.profile ? (
                        <AvatarImage
                          src={getImageUrl(user.profile)}
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback className="bg-yellow-100">
                          <User className="size-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="w-[min(22rem,calc(100vw-1.25rem))] max-h-[min(32rem,80vh)] overflow-y-auto p-0 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xl"
                >
                  <div className="bg-gradient-to-b from-yellow-50 to-white dark:from-slate-900/90 dark:to-[#131b2e] px-4 pt-4 pb-3 border-b border-gray-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleEditProfile}
                        className="relative shrink-0"
                        aria-label="Edit photo and profile"
                      >
                        <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-white dark:border-slate-700 shadow-sm bg-gray-100 dark:bg-slate-800">
                          {user?.profile ? (
                            <Image
                              src={getImageUrl(user?.profile)}
                              alt=""
                              width={128}
                              height={128}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <NoImage />
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-black shadow border-2 border-white dark:border-[#131b2e]">
                          <Edit2 size={13} />
                        </span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold text-gray-900 dark:text-slate-100 leading-tight">
                          {user?.name || "Explorer"}
                        </h2>
                        {user?.email && (
                          <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                            {user.email}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-slate-400">
                          {t("levels.level")} {user?.level ?? 0}
                          {USER_LEVELS[user?.level ?? 0]?.name
                            ? ` · ${USER_LEVELS[user?.level ?? 0].name}`
                            : ""}
                        </p>
                        <div className="mt-2">
                          <Progress value={progress} className="h-1.5 dark:bg-slate-800" />
                          <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                            {user?.points || 0} / {maxPoints} {t("levels.points")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={handleEditProfile}
                        className="h-10 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-xl cursor-pointer"
                      >
                        <Edit2 size={15} />
                        {t("profile.edit_profile")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleShareProfile}
                        disabled={isSharingProfile || !user?._id}
                        className="h-10 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        {isSharingProfile ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : shareCopied ? (
                          <Check size={15} className="text-green-600" />
                        ) : (
                          <Share2 size={15} />
                        )}
                        {shareCopied ? t("common.copied") : t("profile.share_profile")}
                      </Button>
                    </div>
                  </div>

                  <div className="px-1.5 py-1.5">
                    {isAdminOrEditor && (
                      <Link
                        href="/dashboard"
                        onClick={() => setIsMobileProfileMenuOpen(false)}
                      >
                        <DropdownMenuItem className="rounded-xl px-3 py-3 cursor-pointer dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:text-white">
                          <Grid2x2 className="mr-3 size-5" />
                          {t("nav.dashboard") || "Dashboard"}
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {visibleMenuItems.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={index}
                          href={item.href}
                          onClick={() => setIsMobileProfileMenuOpen(false)}
                        >
                          <DropdownMenuItem className="rounded-xl px-3 py-3 cursor-pointer dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:text-white">
                            <Icon className="mr-3 size-5" />
                            {item.label}
                          </DropdownMenuItem>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-100 dark:border-slate-800 px-3 py-2.5">
                    <Button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      variant="ghost"
                      className="w-full h-10 rounded-xl text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold cursor-pointer"
                    >
                      {isLoggingOut ? t("common.loading") : t("nav.logout")}
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold font-public-sans rounded-xl px-4 py-2 text-sm shadow-none">
                  {t("nav.login")}
                </Button>
              </Link>
            )}

            {/* Hamburger Menu Button */}
            <button
              onClick={toggleMenu}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 rounded-full transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Portaled Mobile Overlays & Drawers (prevents trapping inside header stacking context/transforms) */}
      {mounted &&
        createPortal(
          <>
            {/* Mobile & Tablet Search Backdrop — keeps map visible underneath with soft blur */}
            {isSearchOpen && (
              <div
                className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[90] lg:hidden transition-opacity duration-300 animate-in fade-in"
                onClick={closeMenus}
                aria-hidden="true"
              />
            )}

            {/* Mobile & Tablet Search Header Drawer */}
            <div
              className={`fixed top-0 inset-x-0 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md shadow-2xl transition-all duration-300 ease-out z-[95] lg:hidden border-b border-gray-200/80 dark:border-slate-800 ${
                isSearchOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 -translate-y-8 pointer-events-none"
              }`}
            >
              <div className="p-4 sm:p-5 max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    {t("nav.map")}
                  </span>
                  <button
                    type="button"
                    onClick={closeMenus}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-600 dark:text-slate-300 transition-colors cursor-pointer"
                    aria-label="Close search"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                    dismissKeyboard();
                    submitHeaderSearch();
                  }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    aria-label="Search"
                  >
                    <Search className="size-5" />
                  </button>
                  <input
                  type="text"
                  enterKeyHint="search"
                  value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLElement)?.blur();
                      dismissKeyboard();
                      submitHeaderSearch();
                    }
                  }}
                    placeholder={t("search.placeholder_full")}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 border border-gray-200/70 dark:border-slate-800 rounded-full py-3 pl-12 pr-10 text-sm focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-inner"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  )}

                  {/* Search Results Dropdown Mobile */}
                  {searchTerm && (
                    <div className="mt-2 w-full bg-white dark:bg-[#131b2e] rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden max-h-[60vh] overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                    dismissKeyboard();
                    submitHeaderSearch();
                  }}
                        className="w-full flex items-center gap-3 p-3.5 text-left text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-950/60 border-b border-amber-100 dark:border-amber-900/50 transition-colors cursor-pointer"
                      >
                        <Search className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Search &ldquo;{searchTerm}&rdquo; on map</span>
                      </button>

                      {isSearchPending ? (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400 flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                          {t("search.searching")}
                        </div>
                      ) : places.length > 0 ? (
                        <div>
                          {places.map((place: any) => (
                            <Link
                              key={place._id}
                              href={getPlaceSearchHref(place, onMapsPage)}
                              onClick={() => {
                                if (onMapsPage) {
                                  const mapName =
                                    (typeof place.map === "object" &&
                                      (place.map?.name || place.map?.country)) ||
                                    place.country;
                                  if (mapName) {
                                    localStorage.setItem(
                                      "selectedCountryFilter",
                                      String(mapName)
                                    );
                                  }
                                }
                                setSearchTerm("");
                                closeMenus();
                              }}
                              className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors border-b border-gray-50 dark:border-slate-800/60 last:border-0"
                            >
                              <div className="size-10 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-slate-800">
                                {place.media?.[0] ? (
                                  <img
                                    src={getImageUrl(place.media[0])}
                                    alt={place.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center">
                                    <Map className="size-4 text-gray-400 dark:text-slate-500" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                                  {getLocalized(place.name, language)}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                  {place.address}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-gray-500 dark:text-slate-400">
                          Press enter or tap &ldquo;Search &lsquo;{searchTerm}&rsquo; on map&rdquo; to filter all matching spots.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Menu Backdrop */}
            {isMenuOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-[90] lg:hidden transition-opacity duration-300 animate-in fade-in"
                onClick={closeMenus}
                aria-hidden="true"
              />
            )}

            {/* Mobile & Tablet Menu Slide-in */}
            <div
              className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-[#0e1424] border-l border-transparent dark:border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-[100] lg:hidden ${
                isMenuOpen
                  ? "translate-x-0 pointer-events-auto"
                  : "translate-x-full pointer-events-none"
              }`}
            >
              <div className="p-6 h-full flex flex-col overflow-y-auto">
                <div className="flex justify-between items-center mb-5 shrink-0">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t("nav.menu")}</h2>
                  <div className="flex items-center gap-2">
                    <ThemeToggle size="sm" />
                    <LanguageSwitcher />
                    <button
                      type="button"
                      onClick={closeMenus}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-600 dark:text-slate-300 transition-colors cursor-pointer"
                      aria-label="Close menu"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-1">
                  {navLinks.map((link, index) => {
                    const isActive = pathname === link.href;

                    return (
                      <AuthLink
                        key={index}
                        href={link.href}
                        onClick={closeMenus}
                        className={`block px-4 py-2.5 font-semibold font-inter transition-colors rounded-xl ${
                          isActive
                            ? "bg-primary text-black dark:text-slate-950 font-bold shadow-sm"
                            : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        {link.name}
                      </AuthLink>
                    );
                  })}
                </div>

                {/* User Menu Items in Hamburger (Mobile) */}
                {isAuthenticated ? (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3 px-4">
                      {t("nav.profile")}
                    </h3>

                    <div className="space-y-1">
                      {isAdminOrEditor && (
                        <Link
                          href={"/dashboard"}
                          onClick={closeMenus}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-800/60 text-gray-900 dark:text-slate-100 rounded-lg transition-colors font-semibold"
                        >
                          <Grid2x2 className="size-5" />
                          {t("nav.dashboard") || "Dashboard"}
                        </Link>
                      )}
                      <div className="space-y-1">
                        {visibleMenuItems.map((item, index) => {
                          const Icon = item.icon;

                          return (
                            <Link
                              key={index}
                              href={item.href}
                              onClick={closeMenus}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800/60 text-gray-900 dark:text-slate-100 rounded-lg transition-colors"
                            >
                              <Icon className="size-5" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>

                      {/* ✅ Logout in hamburger menu */}
                      <button
                        type="button"
                        onClick={() => handleLogout()}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-left mt-4 font-semibold cursor-pointer"
                      >
                        <Map className="size-5" />
                        <span>{t("nav.logout")}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto pt-6 border-t border-gray-200 dark:border-slate-800">
                    <Link
                      href="/login"
                      onClick={closeMenus}
                      className="block w-full text-center bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold font-public-sans rounded-xl py-3 text-sm transition-colors shadow-none cursor-pointer"
                    >
                      {t("nav.login")}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}

      <ProfileUpdateModal
        data={user}
        open={isUpdateModalOpen}
        onOpenChange={setIsUpdateModalOpen}
      />
    </div>
  );
}
