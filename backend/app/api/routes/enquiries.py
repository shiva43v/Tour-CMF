import json
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.audit_log import ActivityLog
from app.models.enquiry import Enquiry, EnquiryNote, EnquiryReply
from app.models.package import Package, PackageVersion
from app.models.user import User, UserRole
from app.schemas.enquiries import (
    AIAnalysis,
    AIAnalysisUpdate,
    AIReplyDraft,
    AIReplyDraftUpdate,
    EnquiryCreate,
    EnquiryCreated,
    EnquiryRead,
    EnquiryUpdate,
    PackageRecommendationItem,
    RecommendationsResponse,
)
from app.services.ai import (
    draft_consultant_reply,
    extract_requirements,
    recommend_packages,
)

router = APIRouter(prefix="/enquiries", tags=["enquiries"])
Staff = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.CONSULTANT))]
Db = Annotated[Session, Depends(get_db)]
STATUSES = {"new", "contacted", "qualified", "quoted", "booked", "lost"}


def acknowledgement_template(traveller_name: str, package_title: str, reference: str) -> str:
    return (
        f"Hello {traveller_name}, thank you for your enquiry about {package_title}. "
        f"We have received your request (reference {reference}) and a travel consultant will be in touch shortly."
    )


def enquiry_query():
    return select(Enquiry).options(
        selectinload(Enquiry.package),
        selectinload(Enquiry.assigned_to),
        selectinload(Enquiry.notes).selectinload(EnquiryNote.author),
        selectinload(Enquiry.replies).selectinload(EnquiryReply.author),
    )


def read(e: Enquiry) -> EnquiryRead:
    return EnquiryRead(
        id=e.id,
        reference=e.reference or f"ENQ-{e.id}",
        status=e.status,
        traveller_name=e.traveller_name or "",
        phone=e.phone or "",
        email=e.email,
        package_title=e.package.title if e.package else None,
        adults=e.adults,
        children=e.children,
        travel_dates=e.travel_dates,
        budget=e.budget,
        original_message=e.original_message,
        assigned_to_id=e.assigned_to_id,
        assigned_to_name=e.assigned_to.name if e.assigned_to else None,
        created_at=e.created_at,
        notes=[
            {"body": n.body, "author": n.author.name, "created_at": n.created_at.isoformat()}
            for n in e.notes
        ],
        replies=[
            {"body": r.body, "author": r.author.name, "sent_at": r.sent_at.isoformat()}
            for r in e.replies
        ],
        ai_analysis=e.ai_analysis,
        ai_recommendations=e.ai_recommendations,
        ai_reply_draft=e.ai_reply_draft,
        acknowledgement_message=e.acknowledgement_message,
        acknowledgement_status=e.acknowledgement_status,
    )


def get_published_candidate_packages(db: Session) -> list[dict]:
    """Fetch only published packages from PostgreSQL. Never includes drafts."""
    packages = db.scalars(
        select(Package)
        .where(Package.status == "published", Package.published_version_id.is_not(None))
        .options(selectinload(Package.published_version).selectinload(PackageVersion.seasonal_prices))
    ).unique().all()

    candidates: list[dict] = []
    for pkg in packages:
        version = pkg.published_version
        if not version:
            continue
        try:
            content = json.loads(version.content)
        except Exception:
            content = {}
        from_price = min(
            (float(p.price_per_person) for p in version.seasonal_prices),
            default=None,
        )
        candidates.append({
            "id": pkg.id,
            "slug": pkg.slug,
            "title": pkg.title,
            "destination": content.get("destination", "Kerala"),
            "duration_days": content.get("duration_days", 1),
            "summary": content.get("summary", ""),
            "from_price": from_price,
        })
    return candidates


def run_full_ai_pipeline(enquiry: Enquiry, db: Session, author_name: str = "Our Travel Team") -> None:
    """Run extraction, package recommendation, and reply draft pipeline."""
    initial_data = {
        "adults": enquiry.adults,
        "children": enquiry.children,
        "travel_dates": enquiry.travel_dates,
        "budget": enquiry.budget,
        "traveller_name": enquiry.traveller_name,
    }
    analysis = extract_requirements(
        original_message=enquiry.original_message,
        traveller_name=enquiry.traveller_name,
        initial_data=initial_data,
    )
    enquiry.ai_analysis = analysis.model_dump()

    candidates = get_published_candidate_packages(db)
    recs = recommend_packages(analysis, candidates)
    enquiry.ai_recommendations = [r.model_dump() for r in recs]

    reply_body = draft_consultant_reply(
        traveller_name=enquiry.traveller_name or "Traveller",
        enquiry_reference=enquiry.reference or f"ENQ-{enquiry.id}",
        original_message=enquiry.original_message,
        analysis=analysis,
        recommendations=recs,
        consultant_name=author_name,
    )
    enquiry.ai_reply_draft = {
        "body": reply_body,
        "status": "draft",
        "generated_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }


@router.post("", response_model=EnquiryCreated, status_code=status.HTTP_201_CREATED)
def create(payload: EnquiryCreate, db: Db):
    package = db.scalar(select(Package).where(Package.slug == payload.package_slug, Package.status == "published"))
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    message = payload.message or "Package enquiry submitted from the website."
    e = Enquiry(
        source="web",
        traveller_name=payload.traveller_name,
        phone=payload.phone,
        email=str(payload.email) if payload.email else None,
        adults=payload.adults,
        children=payload.children,
        travel_dates=payload.travel_dates,
        budget=payload.budget,
        original_message=message,
        consent_whatsapp=payload.consent_whatsapp,
        package_id=package.id,
        package_version_id=package.published_version_id,
        status="new",
    )


    
    db.add(e)
    db.flush()

    e.reference = f"ENQ-{datetime.now().year}-{e.id:03d}"
    e.acknowledgement_message = acknowledgement_template(payload.traveller_name, package.title, e.reference)
    # Delivery is deliberately separate: no email/WhatsApp provider is configured.
    e.acknowledgement_status = "recorded"

    # Save the enquiry first. AI failure should not prevent enquiry creation.
    db.commit()
    db.refresh(e)

    # Run AI processing separately.
    try:
        run_full_ai_pipeline(e, db)
        db.commit()
    except Exception:
        db.rollback()
        # The enquiry is already saved.
        # AI processing can be retried later.
        import logging
        logging.exception("AI pipeline failed for enquiry %s", e.id)

    return EnquiryCreated(
        reference=e.reference,
        package_title=package.title
    )





@router.get("", response_model=list[EnquiryRead])
def list_enquiries(_: Staff, db: Db):
    return [read(e) for e in db.scalars(enquiry_query().order_by(Enquiry.created_at.desc())).unique().all()]


@router.get("/consultants")
def list_consultants(_: Staff, db: Db):
    return [
        {"id": u.id, "name": u.name}
        for u in db.scalars(select(User).where(User.role == UserRole.CONSULTANT, User.is_active.is_(True)))
    ]


@router.patch("/{enquiry_id}", response_model=EnquiryRead)
def update_enquiry(enquiry_id: int, payload: EnquiryUpdate, user: Staff, db: Db):
    e = db.scalar(enquiry_query().where(Enquiry.id == enquiry_id))
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    if payload.status:
        if payload.status not in STATUSES:
            raise HTTPException(status_code=422, detail="Invalid enquiry status")
        e.status = payload.status

    if payload.assigned_to_id is not None:
        assignee = db.get(User, payload.assigned_to_id)
        if not assignee or assignee.role != UserRole.CONSULTANT:
            raise HTTPException(status_code=422, detail="Assign enquiries to an active consultant")
        e.assigned_to_id = assignee.id

    if payload.note:
        db.add(EnquiryNote(enquiry_id=e.id, author_id=user.id, body=payload.note))
    if payload.reply:
        db.add(EnquiryReply(enquiry_id=e.id, author_id=user.id, body=payload.reply))

    db.add(
        ActivityLog(
            actor_id=user.id,
            entity_type="enquiry",
            entity_id=str(e.id),
            action="enquiry.updated",
            details={"status": e.status},
        )
    )
    db.commit()
    return read(db.scalar(enquiry_query().where(Enquiry.id == enquiry_id)))


# --- AI Endpoints ---


@router.post("/{enquiry_id}/analyze", response_model=AIAnalysis)
def start_ai_analysis(enquiry_id: int, user: Staff, db: Db) -> AIAnalysis:
    """Start AI analysis: extract travel requirements into structured JSON validated by Pydantic."""
    e = db.scalar(enquiry_query().where(Enquiry.id == enquiry_id))
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    initial_data = {
        "adults": e.adults,
        "children": e.children,
        "travel_dates": e.travel_dates,
        "budget": e.budget,
        "traveller_name": e.traveller_name,
    }
    analysis = extract_requirements(
        original_message=e.original_message,
        traveller_name=e.traveller_name,
        initial_data=initial_data,
    )
    e.ai_analysis = analysis.model_dump()
    db.add(
        ActivityLog(
            actor_id=user.id,
            entity_type="enquiry",
            entity_id=str(e.id),
            action="enquiry.ai_analyzed",
            details={"confidence": analysis.confidence_score},
        )
    )
    db.commit()
    return analysis


@router.get("/{enquiry_id}/analysis", response_model=AIAnalysis)
def get_ai_analysis(enquiry_id: int, _: Staff, db: Db) -> AIAnalysis:
    """Retrieve structured AI travel requirements extraction."""
    e = db.get(Enquiry, enquiry_id)
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if not e.ai_analysis:
        raise HTTPException(status_code=404, detail="AI analysis not found for this enquiry")
    return AIAnalysis.model_validate(e.ai_analysis)


@router.patch("/{enquiry_id}/analysis", response_model=AIAnalysis)
def patch_ai_analysis(enquiry_id: int, payload: AIAnalysisUpdate, user: Staff, db: Db) -> AIAnalysis:
    """Correct extracted fields (e.g., guests, budget, duration nights range)."""
    e = db.get(Enquiry, enquiry_id)
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    current = e.ai_analysis or AIAnalysis(traveller_name=e.traveller_name).model_dump()
    update_data = payload.model_dump(exclude_unset=True)

    # Deep merge nested models like budget and duration_nights
    for key, value in update_data.items():
        if isinstance(value, dict) and isinstance(current.get(key), dict):
            current[key].update(value)
        else:
            current[key] = value

    # Validates with Pydantic model (including duration_nights.min <= max)
    validated = AIAnalysis.model_validate(current)
    e.ai_analysis = validated.model_dump()
    db.add(
        ActivityLog(
            actor_id=user.id,
            entity_type="enquiry",
            entity_id=str(e.id),
            action="enquiry.ai_analysis_corrected",
            details={"updated_fields": list(update_data.keys())},
        )
    )
    db.commit()
    return validated


@router.post("/{enquiry_id}/recommendations", response_model=RecommendationsResponse)
def generate_recommendations(enquiry_id: int, user: Staff, db: Db) -> RecommendationsResponse:
    """Generate recommendations matched strictly from actual published packages in PostgreSQL."""
    e = db.scalar(enquiry_query().where(Enquiry.id == enquiry_id))
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    if not e.ai_analysis:
        initial_data = {
            "adults": e.adults,
            "children": e.children,
            "travel_dates": e.travel_dates,
            "budget": e.budget,
            "traveller_name": e.traveller_name,
        }
        analysis = extract_requirements(e.original_message, e.traveller_name, initial_data)
        e.ai_analysis = analysis.model_dump()
    else:
        analysis = AIAnalysis.model_validate(e.ai_analysis)

    candidates = get_published_candidate_packages(db)
    recs = recommend_packages(analysis, candidates)
    e.ai_recommendations = [r.model_dump() for r in recs]
    db.add(
        ActivityLog(
            actor_id=user.id,
            entity_type="enquiry",
            entity_id=str(e.id),
            action="enquiry.ai_recommended",
            details={"package_ids": [r.package_id for r in recs]},
        )
    )
    db.commit()
    return RecommendationsResponse(
        enquiry_id=e.id,
        recommendations=recs,
        generated_at=datetime.now().isoformat(),
    )


@router.get("/{enquiry_id}/recommendations", response_model=RecommendationsResponse)
def get_recommendations(enquiry_id: int, _: Staff, db: Db) -> RecommendationsResponse:
    """Retrieve saved package recommendations."""
    e = db.get(Enquiry, enquiry_id)
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if not e.ai_recommendations:
        raise HTTPException(status_code=404, detail="Recommendations have not been generated yet")
    return RecommendationsResponse(
        enquiry_id=e.id,
        recommendations=[PackageRecommendationItem.model_validate(r) for r in e.ai_recommendations],
        generated_at=e.updated_at.isoformat() if e.updated_at else datetime.now().isoformat(),
    )


@router.post("/{enquiry_id}/reply-draft", response_model=AIReplyDraft)
def generate_reply_draft(enquiry_id: int, user: Staff, db: Db) -> AIReplyDraft:
    """Generate a personalized consultant reply draft based on requirements & recommended packages."""
    e = db.scalar(enquiry_query().where(Enquiry.id == enquiry_id))
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    if not e.ai_analysis:
        analysis = extract_requirements(e.original_message, e.traveller_name)
        e.ai_analysis = analysis.model_dump()
    else:
        analysis = AIAnalysis.model_validate(e.ai_analysis)

    if not e.ai_recommendations:
        candidates = get_published_candidate_packages(db)
        recs = recommend_packages(analysis, candidates)
        e.ai_recommendations = [r.model_dump() for r in recs]
    else:
        recs = [PackageRecommendationItem.model_validate(r) for r in e.ai_recommendations]

    consultant_name = user.name or "Our Travel Consultant"
    body = draft_consultant_reply(
        traveller_name=e.traveller_name or "Traveller",
        enquiry_reference=e.reference or f"ENQ-{e.id}",
        original_message=e.original_message,
        analysis=analysis,
        recommendations=recs,
        consultant_name=consultant_name,
    )
    draft_data = {
        "body": body,
        "status": "draft",
        "generated_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    e.ai_reply_draft = draft_data
    db.add(
        ActivityLog(
            actor_id=user.id,
            entity_type="enquiry",
            entity_id=str(e.id),
            action="enquiry.ai_reply_drafted",
            details={"length": len(body)},
        )
    )
    db.commit()
    return AIReplyDraft.model_validate(draft_data)


@router.patch("/{enquiry_id}/reply-draft", response_model=AIReplyDraft)
def patch_reply_draft(enquiry_id: int, payload: AIReplyDraftUpdate, user: Staff, db: Db) -> AIReplyDraft:
    """Edit the generated reply draft before approving."""
    e = db.get(Enquiry, enquiry_id)
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if not e.ai_reply_draft:
        raise HTTPException(status_code=404, detail="No reply draft found to edit")

    draft = dict(e.ai_reply_draft)
    draft["body"] = payload.body
    draft["updated_at"] = datetime.now().isoformat()
    e.ai_reply_draft = draft
    db.add(
        ActivityLog(
            actor_id=user.id,
            entity_type="enquiry",
            entity_id=str(e.id),
            action="enquiry.ai_reply_draft_edited",
            details={"length": len(payload.body)},
        )
    )
    db.commit()
    return AIReplyDraft.model_validate(draft)


@router.post("/{enquiry_id}/reply-draft/approve", response_model=EnquiryRead)
def approve_reply_draft(enquiry_id: int, user: Staff, db: Db) -> EnquiryRead:
    """Approve the draft reply: records it as an official enquiry reply and advances status."""
    e = db.scalar(enquiry_query().where(Enquiry.id == enquiry_id))
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if not e.ai_reply_draft or not e.ai_reply_draft.get("body"):
        raise HTTPException(status_code=400, detail="No reply draft available to approve")

    reply_body = e.ai_reply_draft["body"]
    db.add(EnquiryReply(enquiry_id=e.id, author_id=user.id, body=reply_body))

    draft = dict(e.ai_reply_draft)
    draft["status"] = "approved"
    draft["updated_at"] = datetime.now().isoformat()
    e.ai_reply_draft = draft

    if e.status == "new":
        e.status = "contacted"

    db.add(
        ActivityLog(
            actor_id=user.id,
            entity_type="enquiry",
            entity_id=str(e.id),
            action="enquiry.reply_draft_approved",
            details={"reply_preview": reply_body[:100]},
        )
    )
    db.commit()
    return read(db.scalar(enquiry_query().where(Enquiry.id == enquiry_id)))
