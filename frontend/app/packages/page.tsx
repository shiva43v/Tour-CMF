import type { Metadata } from "next";
import { PackageCard } from "@/components/package-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPackages } from "@/lib/packages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private Journeys | Tour CMF",
  description: "Explore curated private holidays across Kerala and South India.",
};

type SearchParams = Promise<{ q?: string; destination?: string; min_days?: string; max_days?: string } | undefined>;

export default async function PackagesPage({ searchParams }: { searchParams?: SearchParams }) {
  let params: { q?: string; destination?: string; min_days?: string; max_days?: string } = {};
  try {
    if (searchParams) {
      const resolved = await searchParams;
      if (resolved && typeof resolved === "object") {
        params = resolved;
      }
    }
  } catch {
    params = {};
  }
  const clean = new URLSearchParams(
    Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][]
  ).toString();
  const packages = await getPackages(clean ? `?${clean}` : "");

  return (
    <>
      <div style={{ background: "var(--ink)", color: "#fff", paddingBottom: "2rem" }}>
        <SiteHeader />
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "3rem 2rem 2rem" }}>
          <p className="eyebrow" style={{ color: "#f4a261" }}>
            Curated Private Travel
          </p>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2.8rem, 5vw, 4.5rem)",
              fontWeight: 500,
              margin: "0.25rem 0 1rem",
            }}
          >
            Find your journey.
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "1.1rem", maxWidth: "600px", margin: 0 }}>
            Every holiday includes a private chauffeured car, handpicked boutique estates, and flexible pacing.
          </p>
        </div>
      </div>

      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "3rem 2rem 6rem" }}>
        {/* Modern Filter Toolbar */}
        <form
          className="hero-search-card"
          action="/packages"
          style={{
            margin: "0 0 2.5rem",
            maxWidth: "100%",
            boxShadow: "var(--shadow-subtle)",
            border: "1px solid #ede8de",
          }}
        >
          <div className="hero-search-item" style={{ flex: 2 }}>
            <span>Search keyword or experience</span>
            <input
              name="q"
              type="search"
              defaultValue={params.q}
              placeholder="e.g. Houseboat, Munnar, temples..."
            />
          </div>

          <div className="hero-search-item">
            <span>Destination</span>
            <select name="destination" defaultValue={params.destination ?? ""}>
              <option value="">All Destinations</option>
              <option value="Kerala">Kerala</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
            </select>
          </div>

          <div className="hero-search-item">
            <span>Max Duration</span>
            <select name="max_days" defaultValue={params.max_days ?? ""}>
              <option value="">Any Duration</option>
              <option value="5">Up to 5 Days</option>
              <option value="6">Up to 6 Days</option>
              <option value="10">Up to 10 Days</option>
            </select>
          </div>

          <button type="submit" className="hero-search-btn" style={{ padding: "0.9rem 1.75rem" }}>
            Filter
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: ".95rem", color: "#64748b", fontWeight: 600 }}>
            Showing <strong>{packages.length}</strong> {packages.length === 1 ? "journey" : "journeys"} available
          </div>
          {(params.q || params.destination || params.max_days) && (
            <a href="/packages" style={{ color: "var(--coral)", fontSize: ".88rem", fontWeight: 700, textDecoration: "none" }}>
              Clear all filters ✕
            </a>
          )}
        </div>

        {packages.length > 0 ? (
          <div className="package-grid">
            {packages.map((item) => (
              <PackageCard key={item.slug} item={item} />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "5rem 2rem",
              textAlign: "center",
              background: "#fff",
              borderRadius: "20px",
              border: "1px solid #ede8de",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧭</div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.75rem", margin: "0 0 .5rem" }}>
              No journeys matched your search.
            </h2>
            <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
              Try searching another destination or clear the active duration filter.
            </p>
            <a href="/packages" className="hero-search-btn" style={{ display: "inline-flex" }}>
              Reset Filters
            </a>
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
