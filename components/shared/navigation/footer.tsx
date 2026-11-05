"use client";

import { Instagram, Globe, Facebook, Youtube } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/public/logo.png";
import whiteLogo from "@/public/white-logo.png";
import { usePathname } from "next/navigation";
import { AuthLink } from "@/components/shared/auth-link";
import { useAppSelector } from "@/redux/hook";
import LanguageSwitcher from "@/components/shared/language-switcher";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Footer() {
  const pathname = usePathname();
  const isAuthenticated = useAppSelector((state) => state.auth.accessToken);
  const { t } = useLanguage();

  if (pathname === "/maps") return null;

  return (
    <footer className="bg-gray-100 dark:bg-[#070a12] text-gray-600 dark:text-slate-400 border-t border-transparent dark:border-slate-800/80 transition-colors">
      <div className="max-w-360 mx-auto px-4 md:px-6 py-16">
        {/* Top Footer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div>
              <Link href={isAuthenticated ? "/maps" : "/"}>
                <Image
                  src={logo}
                  alt="Dashboard Logo"
                  width={200}
                  height={200}
                  className="w-48 h-auto -ml-3 block dark:hidden"
                  priority
                />
                <Image
                  src={whiteLogo}
                  alt="Dashboard Logo"
                  width={200}
                  height={200}
                  className="w-48 h-auto -ml-3 hidden dark:block"
                  priority
                />
              </Link>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-slate-400">
              {t("footer.tagline")}
            </p>

            {/* Social Icons */}
            <div className="flex gap-4 mt-6">
              <a
                aria-label="Roadtripeado on Facebook"
                href="https://www.facebook.com/share/19EaG6cYHv/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-200 dark:bg-[#131b2e] border border-transparent dark:border-slate-800 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-slate-800 cursor-pointer text-gray-600 dark:text-slate-300 hover:text-black dark:hover:text-[#fabf13] transition-colors"
              >
                <Facebook size={18} />
              </a>

              <a
                aria-label="Roadtripeado on Instagram"
                href="https://www.instagram.com/roadtripeado?igsh=MTNra3VwbGdwNzd5bw=="
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-200 dark:bg-[#131b2e] border border-transparent dark:border-slate-800 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-slate-800 cursor-pointer text-gray-600 dark:text-slate-300 hover:text-black dark:hover:text-[#fabf13] transition-colors"
              >
                <Instagram size={18} />
              </a>

              <a
                aria-label="Roadtripeado on YouTube"
                href="https://youtube.com/@roadtripeado?si=hKx3FtiXlL5dTFzQ"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-200 dark:bg-[#131b2e] border border-transparent dark:border-slate-800 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-slate-800 cursor-pointer text-gray-600 dark:text-slate-300 hover:text-black dark:hover:text-[#fabf13] transition-colors"
              >
                <Youtube size={18} />
              </a>

              <a
                aria-label="Roadtripeado on TikTok"
                href="https://www.tiktok.com/@roadtripeado?_r=1&_t=ZT-989KjXNc92E"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-200 dark:bg-[#131b2e] border border-transparent dark:border-slate-800 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-slate-800 cursor-pointer text-gray-600 dark:text-slate-300 hover:text-black dark:hover:text-[#fabf13] transition-colors flex items-center justify-center"
              >
                <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.21-.42-.45-.61-.7-.02 3.68-.03 7.36-.04 11.04-.01 1.25-.33 2.51-.95 3.6-1.39 2.5-4.22 3.97-7.07 3.77-3-.21-5.75-2.42-6.52-5.36-.93-3.21.36-6.84 3.09-8.49.88-.53 1.88-.83 2.9-.91.02.13.04.26.06.39v4.09c-.44.07-.88.23-1.27.47-1.12.67-1.76 1.99-1.57 3.28.18 1.13.97 2.13 2.05 2.5 1.15.4 2.45.15 3.37-.62.86-.71 1.28-1.84 1.24-2.96-.02-3.87-.02-7.74-.02-11.61.9-.01 1.8.01 2.69-.02z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-semibold text-black dark:text-slate-100 tracking-wide mb-4 uppercase">
              {t("footer.platform")}
            </h3>

            <ul className="space-y-3 text-sm">
              <li className="hover:text-black dark:hover:text-[#fabf13] transition-colors cursor-pointer">
                <AuthLink href="/catalog">{t("footer.map_catalog")}</AuthLink>
              </li>
              <li className="hover:text-black dark:hover:text-[#fabf13] transition-colors cursor-pointer">
                <AuthLink href="/how-it-works">{t("footer.how_it_works")}</AuthLink>
              </li>
            </ul>
          </div>

          {/* Business */}
          <div>
            <h3 className="text-sm font-semibold text-black dark:text-slate-100 tracking-wide mb-4 uppercase">
              {t("footer.for_businesses")}
            </h3>

            <ul className="space-y-3 text-sm">
              <li className="hover:text-black dark:hover:text-[#fabf13] transition-colors cursor-pointer">
                <AuthLink href={"/for-business"}>{t("footer.add_business")}</AuthLink>
              </li>
              <li className="hover:text-black dark:hover:text-[#fabf13] transition-colors cursor-pointer">
                <AuthLink href={"/pricing"}>{t("footer.pricing_plan")}</AuthLink>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-black dark:text-slate-100 tracking-wide mb-4 uppercase">
              {t("footer.company")}
            </h3>

            <ul className="space-y-3 text-sm">
              <li className="hover:text-black dark:hover:text-[#fabf13] transition-colors cursor-pointer">
                <AuthLink href={"/contact"}>{t("footer.contact")}</AuthLink>
              </li>
              <li className="hover:text-black dark:hover:text-[#fabf13] transition-colors cursor-pointer">
                <Link href={"/privacy-policy"}>{t("footer.privacy_policy")}</Link>
              </li>
              <li className="hover:text-black dark:hover:text-[#fabf13] transition-colors cursor-pointer">
                <Link href={"/terms-of-service"}>{t("footer.terms_of_service")}</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-slate-800 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500 dark:text-slate-400">
          <p>
            © {new Date().getFullYear()} Roadtripeado Inc. {t("footer.all_rights_reserved")}
          </p>

          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="flex items-center gap-2">
              <Globe size={16} />
              <LanguageSwitcher />
            </div>
            <span>USD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
