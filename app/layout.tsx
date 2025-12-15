import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://global-holdem-index.local";
const font = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Global Texas Hold'em Index",
  description:
    "Search poker rooms, live tournaments, and cash games worldwide with personalized recommendations.",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: "Global Texas Hold'em Index",
    description: "Live index of poker rooms, tournaments, and cash games worldwide.",
    url: appUrl,
    siteName: "Global TH Index",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", font.variable)}>
        <SiteHeader />
        <main className="min-h-[calc(100dvh-200px)]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
