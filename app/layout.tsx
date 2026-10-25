import "./globals.css";
import type { Metadata, Viewport } from "next";
import SiteFrame from "@/components/SiteFrame";

export const metadata: Metadata = {
  title: "BlackWaves Finances",
  description:
    "Budget du club BlackWaves : prévisionnel, opérations, factures et suivi financier.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/blackwaves-logo.png", sizes: "558x560", type: "image/png" }],
    shortcut: [{ url: "/blackwaves-logo.png", sizes: "558x560", type: "image/png" }],
    apple: [{ url: "/blackwaves-logo.png", sizes: "558x560", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Black Waves",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1c3f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-slate-950 text-slate-50">
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}