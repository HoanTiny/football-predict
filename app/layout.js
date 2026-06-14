import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import { Analytics } from "@vercel/analytics/next";

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

export const metadata = {
  title: "Tiny Football — Predict & Win",
  description:
    "Nền tảng dự đoán kết quả bóng đá Tiny Football. Dự đoán tỉ số, tích điểm, leo BXH toàn cầu cùng bạn bè.",
  applicationName: "Tiny Football",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tiny Football",
  },
  icons: {
    icon: "/football.png",
    apple: "/apple-icon.png",
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
        {children}
        <PWARegister />
        <Analytics />
      </body>
    </html>
  );
}
