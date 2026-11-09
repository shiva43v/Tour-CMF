export type PackageCard = {
  slug: string;
  title: string;
  duration_days: number;
  destination: string;
  summary: string;
  image_url: string;
  from_price: number | null;
};

export type PackageDetail = PackageCard & {
  hero_image_url: string;
  inclusions: string[];
  hotels: string[];
  itinerary: { day: number; title: string; description: string }[];
  prices: {
    season_name: string;
    start_date: string | null;
    end_date: string | null;
    price_per_person: number;
    price_basis: string;
    gst_note: string;
  }[];
  gallery_image_urls?: string[];
  map_embed_url?: string | null;
};

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Fallback seed packages so the public site never crashes if the backend is booting
export const FALLBACK_PACKAGES: PackageCard[] = [
  {
    slug: "munnar-thekkady-alleppey-houseboat",
    title: "Munnar, Thekkady and Alleppey Houseboat",
    duration_days: 6,
    destination: "Kerala",
    summary: "Tea-covered hills, spice country and a night drifting through Alleppey’s backwaters.",
    image_url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80",
    from_price: 24900,
  },
  {
    slug: "madurai-rameswaram-kanyakumari",
    title: "Madurai, Rameswaram and Kanyakumari",
    duration_days: 5,
    destination: "Tamil Nadu",
    summary: "Temples, island roads and India’s southernmost sunset in one thoughtful journey.",
    image_url: "https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=1200&q=80",
    from_price: 18750,
  },
];

const FALLBACK_DETAILS: Record<string, PackageDetail> = {
  "munnar-thekkady-alleppey-houseboat": {
    slug: "munnar-thekkady-alleppey-houseboat",
    title: "Munnar, Thekkady and Alleppey Houseboat",
    duration_days: 6,
    destination: "Kerala",
    summary: "Tea-covered hills, spice country and a night drifting through Alleppey’s backwaters.",
    image_url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80",
    hero_image_url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1800&q=85",
    from_price: 24900,
    inclusions: [
      "Private air-conditioned SUV with chauffeur",
      "Daily breakfast and dinner at resorts",
      "4-star hillside stays in Munnar & Thekkady",
      "Private Alleppey backwaters luxury houseboat stay with chef",
    ],
    hotels: [
      "Munnar — 4-star hillside tea estate resort",
      "Thekkady — forest-facing plantation lodge",
      "Alleppey — private luxury houseboat",
    ],
    itinerary: [
      { day: 1, title: "Kochi to Munnar", description: "Scenic climb through waterfalls, cardamom estates and tea gardens." },
      { day: 2, title: "Munnar at Leisure", description: "Tea museum, Eravikulam National Park and an unhurried evening." },
      { day: 3, title: "Munnar to Thekkady", description: "Travel south into Kerala’s spice-growing highlands." },
      { day: 4, title: "Thekkady Experiences", description: "Plantation walk, martial arts performance and Periyar lake cruise." },
      { day: 5, title: "Thekkady to Alleppey", description: "Board your private houseboat for lunch and an evening on the backwaters." },
      { day: 6, title: "Departure", description: "Disembark after breakfast and transfer to Kochi airport or railway station." },
    ],
    prices: [
      {
        season_name: "Peak · Oct–Mar",
        start_date: "2026-10-01",
        end_date: "2027-03-31",
        price_per_person: 32500,
        price_basis: "twin_sharing",
        gst_note: "GST applicable",
      },
      {
        season_name: "Monsoon · Jun–Sep",
        start_date: "2026-06-01",
        end_date: "2026-09-30",
        price_per_person: 24900,
        price_basis: "twin_sharing",
        gst_note: "GST applicable",
      },
    ],
  },
  "madurai-rameswaram-kanyakumari": {
    slug: "madurai-rameswaram-kanyakumari",
    title: "Madurai, Rameswaram and Kanyakumari",
    duration_days: 5,
    destination: "Tamil Nadu",
    summary: "Temples, island roads and India’s southernmost sunset in one thoughtful journey.",
    image_url: "https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=1200&q=80",
    hero_image_url: "https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=1800&q=85",
    from_price: 18750,
    inclusions: [
      "Private air-conditioned vehicle with chauffeur",
      "Daily breakfast at hotels",
      "3-star & heritage stays",
      "Guided Meenakshi Amman temple visit",
    ],
    hotels: [
      "Madurai — heritage hotel",
      "Rameswaram — coastal stay",
      "Kanyakumari — ocean-view hotel",
    ],
    itinerary: [
      { day: 1, title: "Arrive in Madurai", description: "Settle in before an evening visit to the iconic Meenakshi Amman Temple." },
      { day: 2, title: "Madurai to Rameswaram", description: "Cross the historic Pamban bridge and explore the island coast." },
      { day: 3, title: "Rameswaram & Dhanushkodi", description: "Temple rituals, Dhanushkodi ruins and pristine beaches." },
      { day: 4, title: "Rameswaram to Kanyakumari", description: "Travel south along the Coromandel coast to India’s tip." },
      { day: 5, title: "Departure", description: "Watch the sunrise over three oceans before onward transfer." },
    ],
    prices: [
      {
        season_name: "All Year",
        start_date: null,
        end_date: null,
        price_per_person: 18750,
        price_basis: "twin_sharing",
        gst_note: "GST applicable",
      },
    ],
  },
};

export async function getPackages(params = ""): Promise<PackageCard[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${apiUrl}/api/v1/packages${params}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return FALLBACK_PACKAGES;
    }
    const data = await response.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_PACKAGES;
  } catch (error) {
    // If backend is booting or temporarily unreachable, gracefully return fallback packages
    return FALLBACK_PACKAGES;
  }
}

export async function getPackage(slug: string): Promise<PackageDetail | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${apiUrl}/api/v1/packages/${slug}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return FALLBACK_DETAILS[slug] || null;
    }
    return await response.json();
  } catch (error) {
    return FALLBACK_DETAILS[slug] || null;
  }
}

export function formatINR(value: number | null | undefined) {
  if (value === null || value === undefined) return "On request";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}
