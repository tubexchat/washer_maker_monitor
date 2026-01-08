import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "交易量查询工具 | Renance Trade Volume Monitor",
  description: "Renance平台交易量统计数据可视化工具 - 实时查询和分析交易数据",
  keywords: ["交易量", "Renance", "加密货币", "数据分析", "交易统计"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
