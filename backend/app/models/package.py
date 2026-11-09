from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    published_version_id: Mapped[int | None] = mapped_column(ForeignKey("package_versions.id"), nullable=True)
    scheduled_publish_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    versions = relationship("PackageVersion", back_populates="package", foreign_keys="PackageVersion.package_id")
    published_version = relationship("PackageVersion", foreign_keys=[published_version_id], post_update=True)
    enquiries = relationship("Enquiry", back_populates="package")


class PackageVersion(Base):
    __tablename__ = "package_versions"
    __table_args__ = (UniqueConstraint("package_id", "version_number", name="uq_package_version_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    package_id: Mapped[int] = mapped_column(ForeignKey("packages.id", ondelete="CASCADE"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text, default="{}")
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    package = relationship("Package", back_populates="versions", foreign_keys=[package_id])
    created_by = relationship("User", back_populates="created_package_versions")
    seasonal_prices = relationship("SeasonalPrice", back_populates="package_version", cascade="all, delete-orphan")


class SeasonalPrice(Base):
    __tablename__ = "seasonal_prices"

    id: Mapped[int] = mapped_column(primary_key=True)
    package_version_id: Mapped[int] = mapped_column(ForeignKey("package_versions.id", ondelete="CASCADE"), index=True)
    season_name: Mapped[str] = mapped_column(String(100))
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    price_per_person: Mapped[float] = mapped_column(Numeric(12, 2))
    price_basis: Mapped[str] = mapped_column(String(50), default="twin_sharing")
    gst_note: Mapped[str] = mapped_column(String(255), default="GST applicable")

    package_version = relationship("PackageVersion", back_populates="seasonal_prices")
