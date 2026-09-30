import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CyberNet Training",
    short_name: "CyberNet",
    description: "Learn how computers, networks and security really work.",
    start_url: "/",
    display: "standalone",
    background_color: "#061630",
    theme_color: "#061630",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/logo-tile.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
