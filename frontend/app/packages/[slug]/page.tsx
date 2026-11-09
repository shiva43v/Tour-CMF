import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { formatINR, getPackage } from "@/lib/packages";
import { EnquiryForm } from "@/components/enquiry-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const resolved = await params;
    const item = resolved?.slug ? await getPackage(resolved.slug) : null;
    if (!item) return { title: "Journey Details | Tour CMF" };
    return { title: `${item.title} | Tour CMF`, description: item.summary, openGraph: { images: [item.hero_image_url] } };
  } catch {
    return { title: "Journey Details | Tour CMF" };
  }
}

export default async function PackagePage({ params }: { params: Promise<{ slug: string }> }) {
  let item = null;
  try {
    const resolved = await params;
    item = resolved?.slug ? await getPackage(resolved.slug) : null;
  } catch {
    item = null;
  }
  if (!item) notFound();

  return (
    <>
      {/* High-Impact Cinematic Hero */}
      <div
        className="package-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(8, 28, 25, 0.65) 0%, rgba(8, 28, 25, 0.45) 50%, rgba(8, 28, 25, 0.95) 100%), url(${item.hero_image_url})`,
        }}
      >
        <SiteHeader />

        <main className="package-hero-copy">
          <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem" }}>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(8px)",
                color: "#fed7aa",
                fontSize: ".8rem",
                fontWeight: 700,
                padding: ".3rem .8rem",
                borderRadius: "999px",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              📍 {item.destination}
            </span>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(8px)",
                color: "#fff",
                fontSize: ".8rem",
                fontWeight: 700,
                padding: ".3rem .8rem",
                borderRadius: "999px",
              }}
            >
              ⏳ {item.duration_days} Days / {item.duration_days - 1} Nights
            </span>
          </div>

          <h1>{item.title}</h1>
          <p>{item.summary}</p>
        </main>
      </div>

      {/* Main Details Body */}
      <main className="detail-shell">
        <section className="detail-overview">
          <div>
            <p className="eyebrow">The Experience</p>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.2rem, 4vw, 3.2rem)", fontWeight: 500, margin: "0.25rem 0 1.25rem" }}>
              Unhurried, beautiful, entirely yours.
            </h2>
            <p style={{ fontSize: "1.1rem", lineHeight: 1.8, color: "#556b66", margin: "0 0 2rem" }}>
              From the moment your chauffeur greets you at the airport, every detail is orchestrated for effortless
              relaxation. Experience the authentic spirit of {item.destination} with private tours, handpicked boutique
              resorts, and stories you will cherish forever.
            </p>

            {/* Quick Experience Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginBottom: "3rem" }}>
              <span style={{ padding: ".4rem .85rem", background: "#f1ece1", borderRadius: "999px", fontSize: ".82rem", fontWeight: 700, color: "var(--ink)" }}>
                🚗 Private Chauffeur Included
              </span>
              <span style={{ padding: ".4rem .85rem", background: "#f1ece1", borderRadius: "999px", fontSize: ".82rem", fontWeight: 700, color: "var(--ink)" }}>
                ☕ Daily Curated Breakfast
              </span>
              <span style={{ padding: ".4rem .85rem", background: "#f1ece1", borderRadius: "999px", fontSize: ".82rem", fontWeight: 700, color: "var(--ink)" }}>
                ✨ 100% Flexible Pacing
              </span>
            </div>

            {/* Day-by-Day Interactive Timeline */}
            <section style={{ paddingTop: "2rem", borderTop: "1px solid #ede8de" }}>
              <p className="eyebrow">Day by Day</p>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2.4rem", fontWeight: 500, margin: "0.25rem 0" }}>
                Your itinerary
              </h2>

              <div className="itinerary-timeline">
                {item.itinerary.map((day) => (
                  <article key={day.day} className="timeline-step">
                    <div className="timeline-node">{day.day}</div>
                    <div className="timeline-content">
                      <h3>{day.title}</h3>
                      <p>{day.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {(item.gallery_image_urls?.length ?? 0) > 0 && (
              <section style={{ paddingTop: "4rem", marginTop: "4rem", borderTop: "1px solid #ede8de" }}>
                <p className="eyebrow">In Pictures</p>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", margin: "0.25rem 0 1.5rem" }}>A glimpse of your journey</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                  {(item.gallery_image_urls ?? []).map((url: string) => <img key={url} src={url} alt={`${item.title} travel moment`} style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "14px" }} />)}
                </div>
              </section>
            )}

            {item.map_embed_url && (
              <section style={{ paddingTop: "4rem", marginTop: "4rem", borderTop: "1px solid #ede8de" }}>
                <p className="eyebrow">Route & Location</p>
                <iframe title={`${item.title} map`} src={item.map_embed_url} loading="lazy" style={{ border: 0, width: "100%", minHeight: "360px", borderRadius: "16px" }} referrerPolicy="no-referrer-when-downgrade" />
              </section>
            )}

            {/* Stays & Inclusions */}
            <section style={{ paddingTop: "4rem", marginTop: "4rem", borderTop: "1px solid #ede8de" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
                <div>
                  <p className="eyebrow">Where You Stay</p>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", margin: "0.25rem 0 1.25rem" }}>
                    Boutique Stays
                  </h3>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {item.hotels.map((hotel) => (
                      <div
                        key={hotel}
                        style={{
                          padding: "1rem 1.25rem",
                          background: "#fff",
                          borderRadius: "14px",
                          border: "1px solid #ede8de",
                          display: "flex",
                          alignItems: "center",
                          gap: ".75rem",
                        }}
                      >
                        <span style={{ fontSize: "1.4rem" }}>🏡</span>
                        <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: ".95rem" }}>{hotel}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="eyebrow">Included In Journey</p>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", margin: "0.25rem 0 1.25rem" }}>
                    What&apos;s Included
                  </h3>
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {item.inclusions.map((inclusion) => (
                      <div
                        key={inclusion}
                        style={{
                          padding: ".85rem 1rem",
                          background: "#fff",
                          borderRadius: "12px",
                          border: "1px solid #ede8de",
                          display: "flex",
                          alignItems: "center",
                          gap: ".65rem",
                          fontSize: ".9rem",
                        }}
                      >
                        <span style={{ color: "#10b981", fontWeight: 800 }}>✓</span>
                        <span style={{ color: "#334155" }}>{inclusion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Seasonal Pricing Comparison Cards */}
            <section style={{ paddingTop: "4rem", marginTop: "4rem", borderTop: "1px solid #ede8de" }}>
              <p className="eyebrow">Rates & Seasons</p>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", margin: "0.25rem 0 1.5rem" }}>
                Seasonal pricing matrix
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
                {item.prices.map((price) => (
                  <div
                    key={price.season_name}
                    style={{
                      background: "#fff",
                      border: "1px solid #ede8de",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      boxShadow: "var(--shadow-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--coral)", fontWeight: 700 }}>
                        Season
                      </div>
                      <h4 style={{ margin: "0.25rem 0 0.5rem", fontSize: "1.15rem", fontWeight: 700 }}>
                        {price.season_name}
                      </h4>
                      {(price.start_date || price.end_date) && (
                        <div style={{ fontSize: ".82rem", color: "#64748b", marginBottom: "1rem" }}>
                          {price.start_date ?? "Start"} to {price.end_date ?? "End"}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f1ece1" }}>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)" }}>
                        {formatINR(price.price_per_person)}
                      </div>
                      <small style={{ color: "#718782", fontSize: ".76rem", display: "block" }}>
                        per person · twin sharing ({price.gst_note})
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sticky Booking Panel */}
          <aside className="price-panel">
            <small style={{ textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>
              Private Journey From
            </small>
            <strong>{formatINR(item.from_price)}</strong>
            <span>per person · twin sharing basis</span>
            <small style={{ marginTop: ".4rem" }}>Includes private car, stays & taxes</small>

            <a className="cta" href="#enquire">
              Enquire About This Journey →
            </a>

            <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid #ede8de", fontSize: ".82rem", color: "#64748b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".4rem" }}>
                <span>🔒</span>
                <span>No commitment required</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                <span>⚡</span>
                <span>AI-Assisted quick quotation</span>
              </div>
            </div>
          </aside>
        </section>

        {/* Tailored Booking Enquiry Section */}
        <EnquiryForm slug={item.slug} title={item.title} />
      </main>

      <SiteFooter />
    </>
  );
}
