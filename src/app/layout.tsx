import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MINDFORM Stock",
  description: "ระบบจัดการสต็อกสินค้าและการรับประกัน MINDFORM",
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
