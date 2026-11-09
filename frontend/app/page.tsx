import Link from "next/link";
import { PackageCard } from "@/components/package-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPackages } from "@/lib/packages";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const packages = (await getPackages()) || [];

  return (
    <>
      {/* Cinematic Hero */}
      <div className="hero">
        <SiteHeader />

        <main className="hero-content">
          <div className="hero-pill-badge">
            <span>✦</span> Curated Luxury Holidays Across South India
          </div>

          <h1>
            Journeys that <em>stay with you</em>.
          </h1>

          <p>
            Misty tea-covered hills, private houseboats drifting through backwater lagoons, and bespoke holidays
            crafted quietly around your pace.
          </p>

          {/* Quick Filter Bar */}
          <form className="hero-search-card" action="/packages">
            <div className="hero-search-item">
              <span>Destination</span>
              <select name="destination" defaultValue="">
                <option value="">All South India</option>
                <option value="Kerala">Kerala (Munnar & Alleppey)</option>
                <option value="Tamil Nadu">Tamil Nadu (Heritage & Coast)</option>
              </select>
            </div>

            <div className="hero-search-item">
              <span>Duration</span>
              <select name="max_days" defaultValue="">
                <option value="">Any Duration</option>
                <option value="5">Short Escape (Up to 5 Days)</option>
                <option value="6">Classic Circuit (6 Days)</option>
                <option value="10">Grand Journey (7–10 Days)</option>
              </select>
            </div>

            <button type="submit" className="hero-search-btn">
              <span>Explore Journeys</span>
              <span>→</span>
            </button>
          </form>
        </main>
      </div>

      {/* Trust Highlights Strip */}
      <section className="trust-strip">
        <div className="trust-grid">
          <div className="trust-item">
            <div className="trust-icon">🚗</div>
            <div>
              <h3>100% Private Travel</h3>
              <p>Chauffeur-driven private air-conditioned vehicle throughout your holiday.</p>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon">🚤</div>
            <div>
              <h3>Signature Houseboats</h3>
              <p>Exclusive private backwater houseboats with onboard master chefs.</p>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon">🏡</div>
            <div>
              <h3>Boutique Estates</h3>
              <p>Handpicked heritage tea bungalows and hillside luxury rainforest lodges.</p>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon">⚡</div>
            <div>
              <h3>Quick Enquiry Response</h3>
              <p>Get a fast, personalized response from our travel experts to plan your perfect holiday.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Journeys Section */}
      <section className="section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Handpicked Journeys</p>
            <h2 className="section-title">Considered itineraries.</h2>
            <p className="section-desc">
              Every itinerary is privately hosted, meticulously planned, and ready to be customized around your wishes.
            </p>
          </div>
          <Link className="card-link-btn" href="/packages" style={{ fontSize: "1.05rem" }}>
            View all {packages.length} journeys <span>→</span>
          </Link>
        </div>

        <div className="package-grid">
          {packages.slice(0, 3).map((item) => (
            <PackageCard key={item.slug} item={item} />
          ))}
        </div>
      </section>

      {/* Destination Inspiration Showcase */}
      <section style={{ background: "var(--sand-tint)", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Iconic Landscapes</p>
              <h2 className="section-title">Where would you like to wander?</h2>
            </div>
          </div>

          <div className="destinations-grid">
            <Link href="/packages?destination=Kerala" className="dest-card">
              <img
                src="https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80"
                alt="Munnar Tea Hills"
              />
              <div className="dest-overlay">
                <h3>Munnar & High Ranges</h3>
                <p>Misty mornings, emerald tea slopes & waterfalls</p>
              </div>
            </Link>

            <Link href="/packages?destination=Kerala" className="dest-card">
              <img
                src="https://images.unsplash.com/photo-1593693411515-c20261bcad6e?auto=format&fit=crop&w=800&q=80"
                alt="Alleppey Backwaters"
              />
              <div className="dest-overlay">
                <h3>Alleppey Backwaters</h3>
                <p>Private luxury houseboats under palm-lined waterways</p>
              </div>
            </Link>

            <Link href="/packages?destination=Tamil+Nadu" className="dest-card">
              <img
                src="https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=800&q=80"
                alt="Tamil Nadu Temples"
              />
              <div className="dest-overlay">
                <h3>Madurai & Rameswaram</h3>
                <p>Dravidian temple architecture & sacred ocean islands</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="section" style={{ textAlign: "center" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <p className="eyebrow">The Tour CMF Difference</p>
          <h2 className="section-title" style={{ margin: "0.5rem 0 1.5rem" }}>
            A little more room for wonder.
          </h2>
          <p style={{ fontSize: "1.2rem", lineHeight: 1.8, color: "#556b66", margin: "0 0 2rem" }}>
            We believe the greatest journeys are unhurried. When you travel privately with us, there are no rigid bus
            timetables or crowded tour groups. You stop when a valley view catches your eye, linger over cardamom tea,
            and drift off to sleep on water.
          </p>
          <Link
            href="/packages"
            className="hero-search-btn"
            style={{ display: "inline-flex", margin: "0 auto" }}
          >
            <span>Browse All Journeys</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Modern Footer */}
      <SiteFooter />
    </>
  );
}
