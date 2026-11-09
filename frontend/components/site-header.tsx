import Link from "next/link";

export function SiteHeader({ light = false }: { light?: boolean }) {
  return (
    <header className={`site-header ${light ? "light-nav" : ""}`}>
      <Link className="brand" href="/">
        <span>Tour CMF</span>
        <span className="brand-dot">.</span>
        <span className="brand-badge">South India</span>
      </Link>

      <nav aria-label="Main navigation">
        <Link href="/packages">Explore Journeys</Link>
        <Link href="/packages?destination=Kerala">Kerala</Link>
        <Link href="/packages?destination=Tamil+Nadu">Tamil Nadu</Link>
        <Link href="/blogs">Blogs</Link>
        <Link href="/login" className="header-cta-pill">
          Staff Studio →
        </Link>
      </nav>
    </header>
  );
}
