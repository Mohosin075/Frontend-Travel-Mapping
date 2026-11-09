"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_AVATAR, getImageUrl, getProfileImageUrl, isUnusableMediaPath } from "@/lib/utils";
import { useChangePasswordMutation } from "@/redux/features/auth/authApi";
import { NoImage } from "@/lib/others/others";
import { useUpdateProfileMutation } from "@/redux/features/user/userApi";
import {
  Camera,
  Compass,
  ExternalLink,
  Globe,
  Instagram,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_BIO_LENGTH = 250;

export default function ProfileUpdateModal({
  data,
  open,
  onOpenChange,
}: {
  data: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, language } = useLanguage();
  const isEs = language === "es";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [profileStatus, setProfileStatus] = useState<"public" | "private">("public");

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const userId = data?._id || data?.id;

  useEffect(() => {
    if (data) {
      setName(data.name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setWebsite(data.website || "");
      setInstagram(data.instagram || "");
      setDescription(data.description || "");
      setCity(data.address?.city || data.city || "");
      setProfileStatus(data.settings?.profileStatus || data.profileStatus || "public");
    }
  }, [data, open]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t("profile.upload_valid_format") || (isEs ? "Por favor sube una imagen en formato JPG, PNG o WebP." : "Please upload an image in JPG, PNG, or WebP format."));
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("profile.image_max_size") || (isEs ? "El tamaño de la imagen no debe superar los 5MB." : "Image size must not exceed 5MB."));
      e.target.value = "";
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Password change state
  const [changePasswordApi, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error(t("auth.current_password_required") || (isEs ? "Ingresa tu contraseña actual." : "Current password is required."));
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error(t("auth.password_min_length") || (isEs ? "La nueva contraseña debe tener al menos 8 caracteres." : "New password must be at least 8 characters."));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("auth.password_mismatch") || (isEs ? "Las contraseñas no coinciden." : "Passwords do not match."));
      return;
    }

    try {
      await changePasswordApi({
        currentPassword,
        newPassword,
        confirmPassword,
      }).unwrap();
      toast.success(t("auth.password_change_success") || (isEs ? "¡Contraseña actualizada exitosamente!" : "Password updated successfully!"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || (isEs ? "Error al cambiar la contraseña." : "Failed to change password.");
      toast.error(msg);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(t("profile.name_required") || (isEs ? "Tu nombre no puede estar vacío." : "Your name cannot be empty."));
      nameInputRef.current?.focus();
      return;
    }

    const formData = new FormData();
    formData.append("name", trimmedName);
    formData.append("phone", phone.trim());
    formData.append("website", website.trim());
    formData.append(
      "instagram",
      instagram.trim() ? instagram.trim().replace(/^@/, "") : "",
    );
    formData.append("description", description.trim());
    formData.append("city", city.trim());
    formData.append("profileStatus", profileStatus);

    if (imageFile) {
      const safeFile = new File([imageFile], imageFile.name, {
        type: imageFile.type || "image/jpeg",
      });
      formData.append("images", safeFile);
    }

    try {
      await updateProfile(formData).unwrap();
      toast.success(t("profile.update_success") || (isEs ? "¡Perfil actualizado exitosamente!" : "Profile updated successfully!"));
      onOpenChange(false);
    } catch (err: any) {
      const message =
        err?.data?.message || err?.message || (isEs ? "Error al actualizar el perfil." : "Profile update failed.");
      toast.error(message);
    }
  };

  const currentImage = preview || getProfileImageUrl(data?.profile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-lg md:max-w-xl max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-3xl max-sm:rounded-b-none max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 shadow-2xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-gray-200 dark:bg-slate-700 sm:hidden" />

        <DialogHeader className="relative shrink-0 px-5 pt-12 pb-3 sm:px-6 sm:pt-14 border-b border-gray-100 dark:border-slate-800/80 text-left">
          <DialogTitle className="text-xl font-bold pr-10 text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <span>{t("profile.edit_profile") || (isEs ? "Editar Perfil" : "Edit Profile")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {t("profile.edit_desc") || (isEs ? "Personaliza tu información de explorador y presencia en Roadtripeado." : "Customize your explorer information and presence in Roadtripeado.")}
          </DialogDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            aria-label={t("common.close") || (isEs ? "Cerrar" : "Close")}
          >
            <X size={18} />
          </button>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-6">
            {/* Quick View Public Profile Banner */}
            {userId && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-linear-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-black shadow-xs font-bold">
                    <Compass size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-gray-900 dark:text-slate-100 truncate">
                        {t("profile.public_explorer_card") || (isEs ? "Perfil Público de Explorador" : "Public Explorer Profile")}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        profileStatus === "public"
                          ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border border-green-300/40"
                          : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {profileStatus === "public" ? (isEs ? "Público" : "Public") : (isEs ? "Privado" : "Private")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                      {profileStatus === "public"
                        ? (t("profile.status_public_hint") || (isEs ? "Visible para la comunidad de exploradores" : "Visible to the explorer community"))
                        : (t("profile.status_private_hint") || (isEs ? "Tu perfil está en modo privado" : "Your profile is private"))}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/explorer/${userId}`}
                  target="_blank"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs transition-colors shrink-0 shadow-xs w-full sm:w-auto"
                >
                  <span>{t("profile.view_public") || (isEs ? "Ver mi perfil" : "View Profile")}</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            )}

            {/* Profile Avatar Upload */}
            <div className="flex flex-col items-center pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-28 w-28 rounded-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-yellow-400 transition-transform hover:scale-105 active:scale-95"
                aria-label="Change profile photo"
              >
                <div className="h-full w-full overflow-hidden rounded-full border-4 border-yellow-400 dark:border-yellow-400/80 bg-gray-100 dark:bg-slate-800 shadow-md">
                  <Image
                    src={currentImage || DEFAULT_AVATAR}
                    alt="profile"
                    width={224}
                    height={224}
                    unoptimized
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                    className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                </div>
                <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-black shadow-md border-2 border-white dark:border-slate-900 group-hover:bg-yellow-500 transition-colors">
                  <Camera size={16} />
                </span>
              </button>

              {preview && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-2.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                  {t("profile.remove_new_photo") || (isEs ? "Eliminar nueva foto" : "Remove new photo")}
                </button>
              )}

              <p className="mt-2 text-center text-xs text-gray-400 dark:text-slate-500">
                JPEG, PNG or WebP · max 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
                <User size={13} />
                <span>{t("profile.personal_info") || (isEs ? "Información Personal" : "Personal Information")}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-name" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t("contact_form.name") || (isEs ? "Nombre" : "Name")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                    <Input
                      id="profile-name"
                      ref={nameInputRef}
                      placeholder={t("profile.display_name_placeholder") || (isEs ? "Tu nombre de explorador" : "Your explorer name")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={80}
                      className="h-11 pl-9 rounded-xl bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm"
                    />
                  </div>
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-city" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t("profile.city") || (isEs ? "Ciudad / Ubicación" : "City / Location")}
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                    <Input
                      id="profile-city"
                      placeholder={t("profile.city_placeholder") || (isEs ? "Ej. San Juan, Puerto Rico" : "e.g. San Juan, Puerto Rico")}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      maxLength={60}
                      className="h-11 pl-9 rounded-xl bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Email (Read-Only) */}
              {email && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="profile-email" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                      {t("profile.email_label") || (isEs ? "Correo electrónico" : "Email Address")}
                    </label>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400">
                      <ShieldCheck size={12} />
                      {t("profile.email_verified") || (isEs ? "Verificado" : "Verified")}
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                    <Input
                      id="profile-email"
                      value={email}
                      readOnly
                      disabled
                      className="h-11 pl-9 rounded-xl bg-gray-100 dark:bg-slate-900/40 border-gray-200 dark:border-slate-800/60 text-gray-500 dark:text-slate-400 text-sm cursor-not-allowed select-none opacity-80"
                    />
                    <Lock className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={14} />
                  </div>
                </div>
              )}

              {/* Bio / Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="profile-description" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t("profile.bio") || (isEs ? "Biografía / Sobre mí" : "Bio / About Me")}
                  </label>
                  <span className={`text-[11px] font-medium ${description.length >= MAX_BIO_LENGTH ? "text-red-500" : "text-gray-400 dark:text-slate-500"}`}>
                    {description.length}/{MAX_BIO_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="profile-description"
                  placeholder={t("profile.bio_placeholder") || (isEs ? "Cuéntale a la comunidad sobre ti, tus viajes favoritos o tu estilo de ruta..." : "Tell the community about yourself and your travel adventures...")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_BIO_LENGTH))}
                  rows={3}
                  className="rounded-xl bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm resize-none focus-visible:ring-yellow-400"
                />
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  {t("profile.bio_helper") || (isEs ? "Esta descripción se mostrará en tu tarjeta de explorador y en tu perfil público." : "This description will be displayed on your explorer card and public profile.")}
                </p>
              </div>
            </div>

            {/* Social & Contact */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
                <Globe size={13} />
                <span>{t("profile.contact_links") || (isEs ? "Contacto y Enlaces" : "Contact & Links")}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-phone" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t("places_admin.phone_number") || (isEs ? "Teléfono" : "Phone")}
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                    <Input
                      id="profile-phone"
                      placeholder="+1 787 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      inputMode="tel"
                      className="h-11 pl-9 rounded-xl bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm"
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-website" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t("places_admin.website_url") || (isEs ? "Sitio Web" : "Website")}
                  </label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                    <Input
                      id="profile-website"
                      placeholder="https://tusitio.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      type="url"
                      inputMode="url"
                      className="h-11 pl-9 rounded-xl bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Instagram */}
              <div className="space-y-1.5">
                <label htmlFor="profile-instagram" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  {t("places_admin.instagram_username") || "Instagram"}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 dark:text-slate-500">
                    @
                  </span>
                  <Input
                    id="profile-instagram"
                    placeholder={isEs ? "usuario" : "username"}
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                    className="h-11 pl-8 rounded-xl bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm"
                  />
                  <Instagram className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                </div>
              </div>
            </div>

            {/* Profile Visibility / Privacy */}
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
                <Eye size={13} />
                <span>{t("profile.profile_visibility") || (isEs ? "Visibilidad del Perfil" : "Profile Visibility")}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Public Option */}
                <button
                  type="button"
                  onClick={() => setProfileStatus("public")}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    profileStatus === "public"
                      ? "border-yellow-400 bg-amber-500/10 dark:bg-amber-400/10 shadow-xs"
                      : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-transparent"
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    profileStatus === "public"
                      ? "bg-yellow-400 text-black font-bold"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-500"
                  }`}>
                    <Globe size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-slate-100">
                      {t("profile.visibility_public") || (isEs ? "Público (Recomendado)" : "Public (Recommended)")}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {t("profile.visibility_public_desc") || (isEs ? "Otros viajeros pueden ver tus aportes, nivel y rutas." : "Other explorers can see your contributions, level, and routes.")}
                    </p>
                  </div>
                </button>

                {/* Private Option */}
                <button
                  type="button"
                  onClick={() => setProfileStatus("private")}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    profileStatus === "private"
                      ? "border-yellow-400 bg-amber-500/10 dark:bg-amber-400/10 shadow-xs"
                      : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-transparent"
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    profileStatus === "private"
                      ? "bg-yellow-400 text-black font-bold"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-500"
                  }`}>
                    <EyeOff size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-slate-100">
                      {t("profile.visibility_private") || (isEs ? "Privado" : "Private")}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {t("profile.visibility_private_desc") || (isEs ? "Solo tú puedes ver tus estadísticas y rutas." : "Only you can see your statistics and routes.")}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Password & Security Section */}
            {data?.provider === "guest_purchase" && !data?.verified && (
              <p className="text-sm rounded-lg border border-yellow-300 p-4">
                <Link className="underline" href={`/set-password?email=${encodeURIComponent(data?.email || "")}&redirect=${encodeURIComponent("/profile")}`}>
                  {isEs ? "Verifica tu email y crea una contraseña para volver a acceder a tu cuenta." : "Verify your email and set a password to access your account again later."}
                </Link>
              </p>
            )}
            <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                    <Lock size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200">
                      {t("settings_admin.change_password") || (isEs ? "Cambiar Contraseña" : "Change Password")}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">
                      {isEs ? "Actualiza la contraseña de tu cuenta" : "Update your account password"}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="rounded-xl border-gray-200 dark:border-slate-700 text-xs font-bold hover:bg-yellow-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {showPasswordSection ? (isEs ? "Cancelar" : "Cancel") : (isEs ? "Modificar" : "Change")}
                </Button>
              </div>

              {showPasswordSection && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-800 space-y-3 animate-in fade-in-50 duration-200">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                      {isEs ? "Contraseña actual" : "Current Password"}
                    </label>
                    <div className="relative">
                      <Input
                        type={showCurrentPass ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 pr-9 rounded-xl bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-700 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                      {isEs ? "Nueva contraseña (mínimo 8 caracteres)" : "New Password (min 8 characters)"}
                    </label>
                    <div className="relative">
                      <Input
                        type={showNewPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 pr-9 rounded-xl bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-700 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                      {isEs ? "Confirmar nueva contraseña" : "Confirm New Password"}
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPass ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 pr-9 rounded-xl bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-700 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="h-9 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold cursor-pointer"
                    >
                      {isChangingPassword ? <Loader2 size={14} className="animate-spin" /> : (isEs ? "Guardar Contraseña" : "Save Password")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Action Buttons */}
          <div className="shrink-0 border-t border-gray-100 dark:border-slate-800 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-xs px-5 py-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-colors">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800 font-semibold text-sm cursor-pointer"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t("common.cancel") || (isEs ? "Cancelar" : "Cancel")}
              </Button>
              <Button
                type="submit"
                className="h-11 flex-1 rounded-xl bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-sm shadow-sm transition-transform active:scale-[0.99] cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.saving") || (isEs ? "Guardando..." : "Saving...")}
                  </>
                ) : (
                  t("common.save") || (isEs ? "Guardar Cambios" : "Save Changes")
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
