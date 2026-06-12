import { Oswald, Inter } from "next/font/google";
import "./globals.css";

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
  icons: {
    icon: "/football.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${oswald.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
