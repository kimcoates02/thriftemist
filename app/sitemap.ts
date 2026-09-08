import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://thriftemist.com";

  const staticPages = [
    "",
    "/shop",
    "/latest-drop",
    "/drops",
    "/sold",
    "/about",
    "/contact",
    "/request",
    "/shipping",
    "/returns",
    "/privacy",
    "/terms",
  ];

  const products = await getProducts({});

  return [
    ...staticPages.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: path === "" || path === "/shop" ? "daily" as const : "weekly" as const,
      priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.6,
    })),
    ...products
      .filter((p) => p.status !== "archived")
      .map((p) => ({
        url: `${base}/shop/${p.slug}`,
        lastModified: p.created_at ? new Date(p.created_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: p.status === "available" ? 0.8 : 0.4,
      })),
  ];
}
