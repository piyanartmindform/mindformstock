import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MINDFORM Stock",
  description: "ระบบจัดการสต็อกสินค้าและการรับประกัน MINDFORM",
  appleWebApp: { capable: true, title: "MF Stock", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2B9ED4",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
