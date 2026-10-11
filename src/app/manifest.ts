import type { MetadataRoute } from "next";

// lets staff "Add to Home Screen" so the app opens full screen without browser toolbars
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MINDFORM Stock",
    short_name: "MF Stock",
    description: "ระบบจัดการสต็อกสินค้าและการรับประกัน MINDFORM",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F9FAFB",
    theme_color: "#2B9ED4",
    lang: "th",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
