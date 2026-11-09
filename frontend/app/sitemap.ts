import type { MetadataRoute } from "next";
import { getPackages } from "@/lib/packages";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const packages = (await getPackages()) || [];
  return [
    { url: "http://localhost:3000", changeFrequency: "weekly", priority: 1 },
    { url: "http://localhost:3000/packages", changeFrequency: "weekly", priority: 0.9 },
    ...packages.map((item) => ({ url: `http://localhost:3000/packages/${item.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
