import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "캐치마인드 - 스트리머용 게임",
  description: "SOOP 방송 연동 캐치마인드 게임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#0a0a0f] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
