import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Great_Vibes,
  Ma_Shan_Zheng,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: "400",
});

const maShanZheng = Ma_Shan_Zheng({
  variable: "--font-ma-shan-zheng",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Star Tales",
  description: "Star Tales — 欢迎页（前端演示）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} ${greatVibes.variable} ${maShanZheng.variable} h-full overflow-hidden antialiased`}
    >
      <body className="flex min-h-dvh flex-col overflow-hidden bg-[#0c0612] text-stone-200 antialiased">
        {children}
      </body>
    </html>
  );
}
