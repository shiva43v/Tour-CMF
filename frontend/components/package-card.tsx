import Link from "next/link";
import { PackageCard as PackageCardData, formatINR } from "@/lib/packages";
import PackageImage from "@/components/package-image";

export function PackageCard({ item }: { item: PackageCardData }) {
  return (
    <article className="package-card">
      <Link href={`/packages/${item.slug}`} className="card-image-wrap" aria-label={`View ${item.title}`}>
        <PackageImage
          src={item.image_url}
          alt={item.title}
          className="card-image"
        />
        <span className="card-floating-badge">📍 {item.destination}</span>
        <span className="card-duration-badge">⏳ {item.duration_days} Days</span>
      </Link>

      <div className="card-copy">
        <h2>
          <Link href={`/packages/${item.slug}`}>{item.title}</Link>
        </h2>
        <p>{item.summary}</p>

        <div className="card-footer">
          <div className="card-price">
            <small>Starting from</small>
            <strong>{formatINR(item.from_price)}</strong>
          </div>

          <Link className="card-link-btn" href={`/packages/${item.slug}`}>
            Explore journey <span>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
