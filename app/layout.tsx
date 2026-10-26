import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Suspense } from "react";
import { ReduxProvider } from "@/redux/ReduxProvider";
import { SocketProvider } from "@/components/shared/socket-provider";
import { LoginRequiredProvider } from "@/components/shared/login-required-modal";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/components/theme-provider";

const poppins = localFont({
  src: [
    { path: "./fonts/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

const inter = localFont({
  src: [
    { path: "./fonts/inter-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const publicSans = localFont({
  src: [
    { path: "./fonts/public-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/public-sans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/public-sans-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/public-sans-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/public-sans-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-public-sans",
  display: "swap",
});

const arial = localFont({
  src: [
    {
      path: "./fonts/arial.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-arial",
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "Roadtripeado – Discover Cities Like a Local | Interactive Travel Maps",
  description:
    "Discover cities like a local with curated interactive travel maps. Explore hidden gems, exclusive local deals, and authentic experiences through Roadtripeado.",
  keywords: [
    "travel maps",
    "interactive city maps",
    "discover cities",
    "hidden gems travel",
    "local city guides",
    "tourist maps",
    "travel planning",
    "city exploration",
  ],

  authors: [{ name: "Roadtripeado Team" }],

  openGraph: {
    title: "Discover Cities Like a Local – Roadtripeado",
    description:
      "Explore curated interactive travel maps, hidden gems, and exclusive local experiences. Travel smarter with Roadtripeado.",
    url: "https://roadtripeado.com",
    siteName: "Roadtripeado",
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Discover Cities Like a Local – Roadtripeado",
    description:
      "Interactive travel maps to discover hidden gems and authentic local experiences in cities around the world.",
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener("touchstart", function(){}, {passive:true});`,
          }}
        />
      </head>
      <body
        className={`${poppins.variable} ${inter.variable} ${arial.variable} ${publicSans.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ReduxProvider>
            <LanguageProvider>
              <Suspense fallback={null}>
                <LoginRequiredProvider>
                  <SocketProvider>{children}</SocketProvider>
                </LoginRequiredProvider>
              </Suspense>
            </LanguageProvider>
          </ReduxProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
