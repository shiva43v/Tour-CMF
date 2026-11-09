
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Enquiry(Base):
    __tablename__ = "enquiries"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(30), default="web")
    original_message: Mapped[str] = mapped_column(Text)
    traveller_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    consent_whatsapp: Mapped[bool] = mapped_column(default=False)
    status: Mapped[str] = mapped_column(String(30), default="new", index=True)

    package_id: Mapped[int | None] = mapped_column(
        ForeignKey("packages.id"), nullable=True
    )
    assigned_to_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    package_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("package_versions.id"), nullable=True
    )

    adults: Mapped[int | None] = mapped_column(Integer, nullable=True)
    children: Mapped[int | None] = mapped_column(Integer, nullable=True)
    travel_dates: Mapped[str | None] = mapped_column(String(120), nullable=True)
    budget: Mapped[str | None] = mapped_column(String(80), nullable=True)
    reference: Mapped[str | None] = mapped_column(
        String(40), unique=True, nullable=True
    )

    ai_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_recommendations: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    ai_reply_draft: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    acknowledgement_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    acknowledgement_status: Mapped[str] = mapped_column(String(30), default="recorded")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    package = relationship("Package", back_populates="enquiries")
    assigned_to = relationship("User", back_populates="assigned_enquiries")
    notes = relationship(
        "EnquiryNote", back_populates="enquiry", cascade="all, delete-orphan"
    )
    replies = relationship(
        "EnquiryReply", back_populates="enquiry", cascade="all, delete-orphan"
    )


class EnquiryNote(Base):
    __tablename__ = "enquiry_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    enquiry_id: Mapped[int] = mapped_column(
        ForeignKey("enquiries.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    enquiry = relationship("Enquiry", back_populates="notes")
    author = relationship("User")


class EnquiryReply(Base):
    __tablename__ = "enquiry_replies"

    id: Mapped[int] = mapped_column(primary_key=True)
    enquiry_id: Mapped[int] = mapped_column(
        ForeignKey("enquiries.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    enquiry = relationship("Enquiry", back_populates="replies")
    author = relationship("User")
