import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { ToastProvider } from "@/components/ui/Toast";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import { PREFS_INIT_SCRIPT, THEME_BG } from "@/lib/prefs";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["600", "700", "800"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — workout log`,
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  applicationName: APP_NAME,
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: THEME_BG.dark },
    { media: "(prefers-color-scheme: light)", color: THEME_BG.light },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" data-palette="sunrise" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: PREFS_INIT_SCRIPT }} />
      </head>
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        <PreferencesProvider>
          <AuthProvider>
            <ToastProvider>
              <ServiceWorkerRegistration />
              {children}
            </ToastProvider>
          </AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
