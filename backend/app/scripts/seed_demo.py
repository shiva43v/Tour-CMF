"""Seed safe development-only staff accounts.

Run after migrations with: python -m app.scripts.seed_demo
"""
import json
from datetime import date

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.package import Package, PackageVersion, SeasonalPrice

DEMO_PASSWORD = "DemoPass!2026"
DEMO_USERS = [
    ("Demo Admin", "admin@company-a.demo", UserRole.ADMIN),
    ("Demo Editor", "editor@company-a.demo", UserRole.EDITOR),
    ("Demo Consultant", "consultant@company-a.demo", UserRole.CONSULTANT),
]

SAMPLE_PACKAGES = [
    {
        "slug": "munnar-thekkady-alleppey-houseboat",
        "title": "Munnar, Thekkady and Alleppey houseboat",
        "content": {
            "duration_days": 6,
            "destination": "Kerala",
            "summary": "Tea-covered hills, spice country and a night drifting through Alleppey’s backwaters.",
            "image_url": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80",
            "hero_image_url": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1800&q=85",
            "inclusions": ["Private air-conditioned vehicle", "Daily breakfast and dinner", "4-star stays", "Alleppey houseboat stay"],
            "hotels": ["Munnar — 4-star hillside resort", "Thekkady — forest-facing hotel", "Alleppey — private houseboat"],
            "itinerary": [
                {"day": 1, "title": "Kochi to Munnar", "description": "A scenic climb through waterfalls, cardamom estates and tea gardens."},
                {"day": 2, "title": "Munnar at leisure", "description": "Tea museum, Eravikulam National Park and an unhurried evening."},
                {"day": 3, "title": "Munnar to Thekkady", "description": "Travel south into Kerala’s spice-growing highlands."},
                {"day": 4, "title": "Thekkady experiences", "description": "Choose a plantation walk, martial arts performance or lake cruise."},
                {"day": 5, "title": "Thekkady to Alleppey", "description": "Board your private houseboat for lunch and an evening on the backwaters."},
                {"day": 6, "title": "Departure", "description": "Disembark after breakfast and continue to Kochi airport or railway station."},
            ],
        },
        "prices": [("Peak · Oct–Mar", "2026-10-01", "2027-03-31", 32500), ("Monsoon · Jun–Sep", "2026-06-01", "2026-09-30", 24900)],
    },
    {
        "slug": "madurai-rameswaram-kanyakumari",
        "title": "Madurai, Rameswaram and Kanyakumari",
        "content": {
            "duration_days": 5,
            "destination": "Tamil Nadu",
            "summary": "Temples, island roads and India’s southernmost sunset in one thoughtful journey.",
            "image_url": "https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=1200&q=80",
            "inclusions": ["Private air-conditioned vehicle", "Daily breakfast", "3-star stays", "Guided temple visit"],
            "hotels": ["Madurai — heritage hotel", "Rameswaram — coastal stay", "Kanyakumari — sea-view hotel"],
            "itinerary": [
                {"day": 1, "title": "Arrive in Madurai", "description": "Settle in before an optional evening visit to Meenakshi Amman Temple."},
                {"day": 2, "title": "Madurai to Rameswaram", "description": "Cross the Pamban bridge and explore the island."},
                {"day": 3, "title": "Rameswaram", "description": "A gentle day for temple rituals, Dhanushkodi and the coast."},
                {"day": 4, "title": "Rameswaram to Kanyakumari", "description": "Travel along the coast to India’s southern tip."},
                {"day": 5, "title": "Departure", "description": "Watch the sunrise before your onward journey."},
            ],
        },
        "prices": [("All year", None, None, 18750)],
    },
]


def main() -> None:
    with SessionLocal() as db:
        for name, email, role in DEMO_USERS:
            if db.scalar(select(User).where(User.email == email)):
                continue
            db.add(User(name=name, email=email, password_hash=hash_password(DEMO_PASSWORD), role=role))
        db.commit()
        admin = db.scalar(select(User).where(User.email == "admin@company-a.demo"))
        for sample in SAMPLE_PACKAGES:
            if db.scalar(select(Package).where(Package.slug == sample["slug"])):
                continue
            package = Package(slug=sample["slug"], title=sample["title"], status="published")
            db.add(package)
            db.flush()
            version = PackageVersion(
                package_id=package.id,
                version_number=1,
                content=json.dumps(sample["content"]),
                created_by_id=admin.id,
            )
            db.add(version)
            db.flush()
            for season, start, end, price in sample["prices"]:
                db.add(SeasonalPrice(
                    package_version_id=version.id,
                    season_name=season,
                    start_date=date.fromisoformat(start) if start else None,
                    end_date=date.fromisoformat(end) if end else None,
                    price_per_person=price,
                ))
            package.published_version_id = version.id
        db.commit()
    print("Demo accounts seeded. Do not use these credentials in production.")


if __name__ == "__main__":
    main()
