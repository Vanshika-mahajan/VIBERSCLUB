import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vibers Club",
    short_name: "Vibers",
    description: "Find your people in Manali.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F2E8",
    theme_color: "#F7F2E8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
