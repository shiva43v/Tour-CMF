from datetime import datetime
from pydantic import BaseModel, Field, model_validator

try:
    import email_validator  # noqa: F401
    from pydantic import EmailStr
except Exception:
    EmailStr = str  # fallback to str when email_validator is not installed on host



class BudgetExtraction(BaseModel):
    amount: float | None = Field(default=None, description="Numeric budget amount")
    currency: str = Field(default="INR", description="Currency code (e.g. INR)")
    note: str | None = Field(default=None, description="Additional budget details or per-person note")


class DurationNightsExtraction(BaseModel):
    min: int | None = Field(default=None, ge=1, description="Minimum duration in nights")
    max: int | None = Field(default=None, ge=1, description="Maximum duration in nights")

    @model_validator(mode="after")
    def validate_duration_range(self) -> "DurationNightsExtraction":
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("duration_nights.min must not exceed duration_nights.max")
        return self


class AIAnalysis(BaseModel):
    traveller_name: str | None = None
    adults: int | None = Field(default=None, ge=1, description="Number of adults")
    children: int | None = Field(default=None, ge=0, description="Number of children")
    budget: BudgetExtraction = Field(default_factory=BudgetExtraction)
    duration_nights: DurationNightsExtraction = Field(default_factory=DurationNightsExtraction)
    preferred_destinations: list[str] = Field(default_factory=list)
    travel_dates: str | None = None
    travel_style: list[str] = Field(default_factory=list)
    special_requests: list[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.9, ge=0.0, le=1.0)
    summary: str = ""


class AIAnalysisUpdate(BaseModel):
    traveller_name: str | None = None
    adults: int | None = Field(default=None, ge=1)
    children: int | None = Field(default=None, ge=0)
    budget: BudgetExtraction | None = None
    duration_nights: DurationNightsExtraction | None = None
    preferred_destinations: list[str] | None = None
    travel_dates: str | None = None
    travel_style: list[str] | None = None
    special_requests: list[str] | None = None
    confidence_score: float | None = Field(default=None, ge=0.0, le=1.0)
    summary: str | None = None


class PackageRecommendationItem(BaseModel):
    package_id: int
    slug: str
    title: str
    destination: str
    duration_days: int
    from_price: float | None = None
    match_score: float = Field(default=0.85, ge=0.0, le=1.0)
    match_reasons: list[str] = Field(default_factory=list)
    fit_summary: str = ""


class RecommendationsResponse(BaseModel):
    enquiry_id: int
    recommendations: list[PackageRecommendationItem]
    generated_at: str


class AIReplyDraft(BaseModel):
    body: str
    status: str = "draft"
    generated_at: str | None = None
    updated_at: str | None = None


class AIReplyDraftUpdate(BaseModel):
    body: str = Field(min_length=1)


class EnquiryCreate(BaseModel):
    package_slug: str
    traveller_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=30)
    email: EmailStr | None = None
    adults: int | None = Field(default=None, ge=1, le=20)
    children: int | None = Field(default=None, ge=0, le=20)
    travel_dates: str | None = Field(default=None, max_length=120)
    budget: str | None = Field(default=None, max_length=80)
    message: str | None = Field(default=None, max_length=3000)
    consent_whatsapp: bool = False


class EnquiryCreated(BaseModel):
    reference: str
    package_title: str


class EnquiryUpdate(BaseModel):
    status: str | None = None
    assigned_to_id: int | None = None
    note: str | None = Field(default=None, max_length=3000)
    reply: str | None = Field(default=None, max_length=3000)


class EnquiryRead(BaseModel):
    id: int
    reference: str
    status: str
    traveller_name: str
    phone: str
    email: EmailStr | None
    package_title: str | None
    adults: int | None
    children: int | None
    travel_dates: str | None
    budget: str | None
    original_message: str
    assigned_to_id: int | None
    assigned_to_name: str | None
    created_at: datetime
    notes: list[dict] = []
    replies: list[dict] = []
    ai_analysis: dict | None = None
    ai_recommendations: list[dict] | None = None
    ai_reply_draft: dict | None = None
    acknowledgement_message: str | None = None
    acknowledgement_status: str = "recorded"
