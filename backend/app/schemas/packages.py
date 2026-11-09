from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PriceRead(BaseModel):
    season_name: str
    start_date: date | None
    end_date: date | None
    price_per_person: Decimal
    price_basis: str
    gst_note: str


class PackageCard(BaseModel):
    slug: str
    title: str
    duration_days: int
    destination: str
    summary: str
    image_url: str
    from_price: Decimal | None


class PackageDetail(PackageCard):
    hero_image_url: str
    inclusions: list[str]
    hotels: list[str]
    itinerary: list[dict]
    prices: list[PriceRead]
    gallery_image_urls: list[str] = Field(default_factory=list)
    map_embed_url: str | None = None


class PriceInput(BaseModel):
    season_name: str = Field(min_length=1, max_length=100)
    start_date: date | None = None
    end_date: date | None = None
    price_per_person: Decimal = Field(gt=0)
    price_basis: str = "twin_sharing"
    gst_note: str = "GST applicable"


class ItineraryItem(BaseModel):
    day: int = Field(ge=1, le=60)
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)


class PackageContentInput(BaseModel):
    duration_days: int = Field(ge=1, le=60)
    destination: str = Field(min_length=1, max_length=120)
    summary: str = Field(min_length=1, max_length=1000)
    image_url: str = Field(min_length=1, max_length=1000)
    hero_image_url: str | None = Field(default=None, max_length=1000)
    gallery_image_urls: list[str] = Field(default_factory=list, max_length=12)
    map_embed_url: str | None = Field(default=None, max_length=2000)
    inclusions: list[str] = Field(default_factory=list)
    hotels: list[str] = Field(default_factory=list)
    itinerary: list[ItineraryItem] = Field(default_factory=list)


class PackageWrite(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=180)
    content: PackageContentInput
    prices: list[PriceInput] = Field(default_factory=list)
    publish: bool = False
    scheduled_publish_at: datetime | None = None


class AdminPackageRead(BaseModel):
    id: int
    title: str
    slug: str
    status: str
    version_number: int
    content: PackageContentInput
    prices: list[PriceRead]
    scheduled_publish_at: datetime | None = None


class PackageVersionRead(BaseModel):
    id: int
    version_number: int
    created_at: datetime
    created_by_name: str | None = None
    is_published: bool = False


class DuplicatePackageInput(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=180)
