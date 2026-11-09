import json
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from fastapi import Depends

from app.db.session import get_db
from app.models.package import Package
from app.schemas.packages import PackageCard, PackageDetail, PriceRead

router = APIRouter(prefix="/packages", tags=["public packages"])


def publish_due_packages(db: Session) -> None:
    """Publish scheduled package revisions when the public catalogue is read."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    due = db.scalars(select(Package).where(Package.status == "scheduled", Package.scheduled_publish_at <= now)).all()
    for package in due:
        package.status = "published"
        package.scheduled_publish_at = None
    if due:
        db.commit()


def serialize_package(package: Package) -> PackageDetail:
    version = package.published_version
    if not version:
        raise HTTPException(status_code=404, detail="Package content is unavailable")
    content = json.loads(version.content)
    prices = [
        PriceRead(
            season_name=price.season_name,
            start_date=price.start_date,
            end_date=price.end_date,
            price_per_person=price.price_per_person,
            price_basis=price.price_basis,
            gst_note=price.gst_note,
        )
        for price in version.seasonal_prices
    ]
    from_price = min((price.price_per_person for price in prices), default=None)
    return PackageDetail(
        slug=package.slug,
        title=package.title,
        duration_days=content["duration_days"],
        destination=content["destination"],
        summary=content["summary"],
        image_url=content["image_url"],
        # CMS drafts may leave the optional hero image blank. In that case the
        # public page should safely use the required card image instead.
        hero_image_url=content.get("hero_image_url") or content["image_url"],
        inclusions=content.get("inclusions", []),
        hotels=content.get("hotels", []),
        itinerary=content.get("itinerary", []),
        prices=prices,
        from_price=from_price,
        gallery_image_urls=content.get("gallery_image_urls", []),
        map_embed_url=content.get("map_embed_url"),
    )


@router.get("", response_model=list[PackageCard])
def list_packages(
    q: str | None = Query(default=None, max_length=100),
    destination: str | None = Query(default=None, max_length=100),
    min_days: int | None = Query(default=None, ge=1, le=30),
    max_days: int | None = Query(default=None, ge=1, le=30),
    db: Session = Depends(get_db),
) -> list[PackageCard]:
    publish_due_packages(db)
    packages = db.scalars(select(Package).where(Package.status == "published").order_by(Package.title)).unique().all()
    cards: list[PackageCard] = []
    search_terms = q.lower().split() if q else []
    for package in packages:
        detail = serialize_package(package)
        haystack = f"{detail.title} {detail.destination} {detail.summary}".lower()
        if search_terms and not all(term in haystack for term in search_terms):
            continue
        if destination and detail.destination.lower() != destination.lower():
            continue
        if min_days and detail.duration_days < min_days:
            continue
        if max_days and detail.duration_days > max_days:
            continue
        cards.append(PackageCard(**detail.model_dump()))
    return cards


@router.get("/{slug}", response_model=PackageDetail)
def get_package(slug: str, db: Session = Depends(get_db)) -> PackageDetail:
    publish_due_packages(db)
    package = db.scalar(select(Package).where(Package.slug == slug, Package.status == "published"))
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return serialize_package(package)
