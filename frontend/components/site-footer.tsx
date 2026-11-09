import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h3>Tour CMF<span style={{ color: "#f4a261" }}>.</span></h3>
          <p>
            Private, considered journeys across Kerala and South India. Slow mornings in hillside tea estates,
            sun-drenched backwater houseboats, and experiences tailored around you.
          </p>
          <div style={{ display: "flex", gap: ".5rem", marginTop: "1rem" }}>
            <span style={{ fontSize: ".8rem", color: "#34d399", fontWeight: 700 }}>
              ● 2026 Season Open for Bookings
            </span>
          </div>
        </div>

        <div className="footer-col">
          <h4>Destinations</h4>
          <ul>
            <li><Link href="/packages?destination=Kerala">Kerala Backwaters</Link></li>
            <li><Link href="/packages?destination=Kerala">Munnar Tea Highlands</Link></li>
            <li><Link href="/packages?destination=Tamil+Nadu">Madurai & Temples</Link></li>
            <li><Link href="/packages?destination=Tamil+Nadu">Rameswaram Island</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Experience</h4>
          <ul>
            <li><Link href="/packages">All Curated Journeys</Link></li>
            <li><Link href="/blogs">Travel Stories &amp; Blogs</Link></li>
            <li><Link href="/#experiences">Private Houseboats</Link></li>
            <li><Link href="/#experiences">Heritage Tea Estates</Link></li>
            <li><Link href="/#experiences">Chauffeured Travel</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Platform</h4>
          <ul>
            <li><Link href="/login">Staff Studio Login</Link></li>
            <li><Link href="/admin">Package CMS</Link></li>
            <li><Link href="/admin/enquiries">Consultant CRM</Link></li>
            <li><Link href="/api/v1/health" target="_blank">API Health Status</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div>© 2026 Tour CMF Operations. All rights reserved.</div>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <span>Private Travel Concierge</span>
          <span>Kerala · Tamil Nadu</span>
        </div>
      </div>
    </footer>
  );
}
