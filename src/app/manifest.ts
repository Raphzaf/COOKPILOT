import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CookPilot",
    short_name: "CookPilot",
    description: "Your kitchen. Your appliances. Your AI chef.",
    start_url: "/en/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf6ee",
    theme_color: "#faf6ee",
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "AI Chef", url: "/en/dashboard/chef" },
      { name: "Recipes", url: "/en/dashboard/recipes" },
    ],
  };
}
