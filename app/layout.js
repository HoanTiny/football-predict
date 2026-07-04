import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import ConnectionBanner from "@/components/ConnectionBanner";
import { Analytics } from "@vercel/analytics/next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const TITLE = "Tiny Sports — Dự đoán World Cup 2026";
const DESC =
  "Dự đoán tỉ số World Cup 2026, tích điểm, leo bảng xếp hạng và đấu cùng bạn bè theo phòng. Chat trực tiếp, sơ đồ knockout, thống kê realtime.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: TITLE,
  description: DESC,
  applicationName: "Tiny Sports",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tiny Sports",
  },
  icons: {
    icon: "/football.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Tiny Sports",
    title: TITLE,
    description: DESC,
    locale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

export const viewport = {
  themeColor: "#0B1735",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${oswald.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ConnectionBanner />
        {children}
        <PWARegister />
        <Analytics />
      </body>
    </html>
  );
}
