import json
import logging
import re
import urllib.request
import urllib.error
from typing import Any

from app.core.config import get_settings
from app.schemas.enquiries import (
    AIAnalysis,
    BudgetExtraction,
    DurationNightsExtraction,
    PackageRecommendationItem,
)

logger = logging.getLogger(__name__)


def _clean_json_text(text: str) -> str:
    """Strip markdown code fence if LLM returned ```json ... ```."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


def _parse_budget_amount(raw: str | None, is_free_text: bool = False) -> tuple[float | None, str | None]:
    if not raw:
        return None, None

    text = raw.lower()

    # If parsing from entire message body, strictly look for monetary cues
    if is_free_text:
        budget_pattern = re.search(
            r"(?:budget|cost|spend|around|approx|upto|up to)?\s*(?:(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:lakh|lac|k)s?))|"
            r"([\d,]+(?:\.\d+)?)\s*(?:inr|rs\.?|₹|rupees)|"
            r"(?:budget|cost|spend)(?:\s*(?:is|of|around|approx))?\s*[:\s]*([\d,]+(?:\.\d+)?)",
            text,
        )
        if not budget_pattern:
            return None, None
        matched_str = next(g for g in budget_pattern.groups() if g is not None)
        return _parse_budget_amount(matched_str, is_free_text=False)

    cleaned = text.replace(",", "").replace("₹", "").replace("inr", "").replace("rs.", "").replace("rs", "").strip()

    # Match patterns like "1.5 lakh", "2 lakhs"
    lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lac)s?", cleaned)
    if lakh_match:
        try:
            return float(lakh_match.group(1)) * 100000, raw.strip()
        except ValueError:
            pass

    # Match "50k", "75 k"
    k_match = re.search(r"(\d+(?:\.\d+)?)\s*k\b", cleaned)
    if k_match:
        try:
            return float(k_match.group(1)) * 1000, raw.strip()
        except ValueError:
            pass

    # Match pure numbers
    num_match = re.search(r"(\d+(?:\.\d+)?)", cleaned)
    if num_match:
        try:
            return float(num_match.group(1)), raw.strip()
        except ValueError:
            pass

    return None, raw.strip()


def _parse_duration_nights(text: str) -> tuple[int | None, int | None]:
    low = text.lower()

    # "X to Y nights / days"
    range_match = re.search(r"(\d+)\s*(?:-|to)\s*(\d+)\s*(?:nights?|days?)", low)
    if range_match:
        val1, val2 = int(range_match.group(1)), int(range_match.group(2))
        return min(val1, val2), max(val1, val2)

    # "1 week"
    if "week" in low:
        return 6, 7

    # "X nights"
    nights_match = re.search(r"(\d+)\s*nights?", low)
    if nights_match:
        n = int(nights_match.group(1))
        return max(1, n), max(1, n)

    # "X days"
    days_match = re.search(r"(\d+)\s*days?", low)
    if days_match:
        d = int(days_match.group(1))
        return max(1, d - 1), max(1, d)

    return None, None


def _heuristic_extract(
    original_message: str,
    traveller_name: str | None = None,
    initial_data: dict[str, Any] | None = None,
) -> AIAnalysis:
    """Deterministic natural language extraction when offline or LLM is not configured."""
    initial = initial_data or {}
    combined_text = f"{original_message} {initial.get('travel_dates', '')} {initial.get('budget', '')}".lower()

    # Adults extraction
    adults = initial.get("adults")
    if adults is None:
        adults_match = re.search(r"(\d+)\s*(?:adults?|grown-ups?|people|pax|persons?)", combined_text)
        if adults_match:
            adults = int(adults_match.group(1))
        elif any(phrase in combined_text for phrase in ["couple", "me and my wife", "me and my husband", "partner"]):
            adults = 2
        elif "solo" in combined_text:
            adults = 1

    # Children extraction
    children = initial.get("children")
    if children is None:
        children_match = re.search(r"(\d+)\s*(?:children|kids?|infants?)", combined_text)
        if children_match:
            children = int(children_match.group(1))
        elif re.search(r"(?:with|along with|travelling with)\s+(?:our|a|my)?\s*(?:\d+\s*(?:year[- ]old|\-yo)?\s*)?(?:child|kid|son|daughter|infant|baby)", combined_text):
            children = 1
        elif any(phrase in combined_text for phrase in ["with kid", "with our child", "with our son", "with our daughter"]):
            children = 1

    # Budget extraction
    raw_budget = initial.get("budget") or ""
    amount, note = _parse_budget_amount(raw_budget, is_free_text=False)
    if amount is None:
        amount, note = _parse_budget_amount(original_message, is_free_text=True)

    # Duration extraction
    min_nights, max_nights = _parse_duration_nights(combined_text)

    # Destinations
    known_destinations = [
        "Munnar",
        "Alleppey",
        "Alappuzha",
        "Thekkady",
        "Kochi",
        "Cochin",
        "Wayanad",
        "Kumarakom",
        "Varkala",
        "Kovalam",
        "Madurai",
        "Rameswaram",
        "Kanyakumari",
        "Kerala",
        "Tamil Nadu",
    ]
    preferred_destinations = [d for d in known_destinations if d.lower() in combined_text]

    # Travel style
    styles = []
    if "houseboat" in combined_text or "backwater" in combined_text:
        styles.append("houseboat")
    if "tea" in combined_text or "plantation" in combined_text:
        styles.append("tea plantation")
    if "temple" in combined_text or "heritage" in combined_text or "culture" in combined_text:
        styles.append("cultural heritage")
    if "luxury" in combined_text or "5-star" in combined_text or "resort" in combined_text:
        styles.append("luxury")
    if "relax" in combined_text or "slow" in combined_text or "peaceful" in combined_text:
        styles.append("unhurried relaxation")
    if children and children > 0 or "family" in combined_text:
        styles.append("family-friendly")

    # Dates
    travel_dates = initial.get("travel_dates")
    if not travel_dates:
        month_match = re.search(
            r"\b(january|february|march|april|may|june|july|august|september|october|november|december|diwali|christmas|new year)\b",
            combined_text,
        )
        if month_match:
            travel_dates = month_match.group(0).capitalize()

    # Summary
    summary_parts = []
    if traveller_name:
        summary_parts.append(f"{traveller_name} is planning a journey")
    else:
        summary_parts.append("Traveller is planning a journey")
    if preferred_destinations:
        summary_parts.append(f"to {', '.join(preferred_destinations)}")
    if travel_dates:
        summary_parts.append(f"in {travel_dates}")
    if adults or children:
        counts = []
        if adults:
            counts.append(f"{adults} adult{'s' if adults > 1 else ''}")
        if children:
            counts.append(f"{children} child{'ren' if children > 1 else ''}")
        summary_parts.append(f"for {' and '.join(counts)}")
    if styles:
        summary_parts.append(f"focused on {', '.join(styles)}")
    summary = " ".join(summary_parts) + "."

    return AIAnalysis(
        traveller_name=traveller_name or initial.get("traveller_name"),
        adults=adults,
        children=children,
        budget=BudgetExtraction(amount=amount, currency="INR", note=note or raw_budget or None),
        duration_nights=DurationNightsExtraction(min=min_nights, max=max_nights),
        preferred_destinations=preferred_destinations,
        travel_dates=travel_dates,
        travel_style=styles,
        special_requests=[s for s in [original_message.strip()] if len(s) > 10],
        confidence_score=0.92,
        summary=summary,
    )


def get_llm_config() -> tuple[str | None, str, str]:
    """
    Resolves the LLM configuration.
    Prioritizes Gemini if GEMINI_API_KEY is set or if OPENAI_API_KEY starts with 'AIza'.
    Returns (api_key, base_url, model).
    """
    settings = get_settings()

    # 1. Direct Gemini configuration
    if settings.gemini_api_key and settings.gemini_api_key.strip():
        key = settings.gemini_api_key.strip()
        model = settings.gemini_model or "gemini-1.5-flash"
        return key, "https://generativelanguage.googleapis.com/v1beta/openai", model

    # 2. OpenAI configuration (which can also accept a Gemini key or OpenAI-compatible endpoint)
    if settings.openai_api_key and settings.openai_api_key.strip():
        key = settings.openai_api_key.strip()
        if key.startswith("AIza"):
            # Automatically recognize Google Gemini key
            model = settings.gemini_model or "gemini-1.5-flash"
            return key, "https://generativelanguage.googleapis.com/v1beta/openai", model
        return key, settings.openai_base_url.rstrip("/"), settings.openai_model or "gpt-4o-mini"

    return None, "", ""


def call_llm(system_prompt: str, user_content: str, json_mode: bool = True) -> str:
    """
    Calls LLM via OpenAI-compatible endpoint, with automatic fallback to native Gemini REST endpoint
    if a Gemini API key is in use.
    """
    api_key, base_url, model = get_llm_config()
    if not api_key:
        raise ValueError("No LLM API key configured")

    # 1. Try OpenAI-compatible endpoint (Google Gemini provides /v1beta/openai)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.2 if json_mode else 0.4,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    try:
        req = urllib.request.Request(
            f"{base_url}/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except Exception as exc:
        # If using Gemini key, fallback to native Google Gemini generateContent REST endpoint
        if api_key.startswith("AIza") or "googleapis.com" in base_url:
            logger.info("OpenAI endpoint failed on Gemini key (%s), trying native Gemini endpoint...", exc)
            native_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            native_body: dict[str, Any] = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"{system_prompt}\n\nInput:\n{user_content}"}],
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2 if json_mode else 0.4,
                },
            }
            if json_mode:
                native_body["generationConfig"]["responseMimeType"] = "application/json"

            native_req = urllib.request.Request(
                native_url,
                data=json.dumps(native_body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(native_req, timeout=15.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["candidates"][0]["content"]["parts"][0]["text"]
        raise


def extract_requirements(
    original_message: str,
    traveller_name: str | None = None,
    initial_data: dict[str, Any] | None = None,
) -> AIAnalysis:
    """Extract structured travel requirements from customer enquiry using LLM or rule engine."""
    api_key, _, _ = get_llm_config()

    if api_key:
        try:
            system_prompt = (
                "You are an AI travel consultant for a luxury South India tour operator. "
                "Analyze customer enquiry messages and extract travel requirements strictly in JSON format matching this schema:\n"
                "{\n"
                '  "traveller_name": string or null,\n'
                '  "adults": integer or null,\n'
                '  "children": integer or null,\n'
                '  "budget": {"amount": number or null, "currency": "INR", "note": string or null},\n'
                '  "duration_nights": {"min": integer or null, "max": integer or null},\n'
                '  "preferred_destinations": [string],\n'
                '  "travel_dates": string or null,\n'
                '  "travel_style": [string],\n'
                '  "special_requests": [string],\n'
                '  "confidence_score": number between 0.0 and 1.0,\n'
                '  "summary": string\n'
                "}\n"
                "Note: duration_nights.min must not exceed duration_nights.max. Return valid JSON only, no markdown."
            )
            user_content = json.dumps({
                "traveller_name": traveller_name,
                "original_message": original_message,
                "form_data": initial_data or {},
            })
            content = call_llm(system_prompt, user_content, json_mode=True)
            parsed = json.loads(_clean_json_text(content))
            return AIAnalysis.model_validate(parsed)
        except Exception as exc:
            logger.warning("LLM API call failed, falling back to heuristic extractor: %s", exc)

    return _heuristic_extract(original_message, traveller_name, initial_data)


def recommend_packages(
    analysis: AIAnalysis,
    published_packages: list[dict[str, Any]],
) -> list[PackageRecommendationItem]:
    """Recommend actual published packages from the database. Never invents packages or prices."""
    if not published_packages:
        return []

    recommendations: list[PackageRecommendationItem] = []
    dest_set = {d.lower() for d in analysis.preferred_destinations}
    travel_styles = {s.lower() for s in analysis.travel_style}
    req_nights_min = analysis.duration_nights.min
    req_nights_max = analysis.duration_nights.max
    budget_amount = analysis.budget.amount

    for pkg in published_packages:
        score = 0.5
        reasons: list[str] = []
        pkg_dest = pkg.get("destination", "").lower()
        pkg_summary = (pkg.get("summary") or "").lower()
        pkg_title = (pkg.get("title") or "").lower()
        duration_days = pkg.get("duration_days", 1)
        from_price = pkg.get("from_price")

        # Destination match
        if any(d in pkg_dest or d in pkg_summary or d in pkg_title for d in dest_set):
            score += 0.25
            reasons.append(f"Matches destination preference ({pkg.get('destination')})")

        # Duration match
        if req_nights_min or req_nights_max:
            min_days = (req_nights_min or 1)
            max_days = (req_nights_max or 30) + 1
            if min_days <= duration_days <= max_days:
                score += 0.15
                reasons.append(f"Fits travel window of {duration_days} days")

        # Budget fit
        if budget_amount and from_price:
            estimated_travellers = (analysis.adults or 2)
            total_est_cost = from_price * estimated_travellers
            if total_est_cost <= budget_amount * 1.15:
                score += 0.10
                reasons.append(f"Starting at ₹{from_price:,.0f}/person, aligns with stated budget")

        # Vibe/Style match
        if "houseboat" in travel_styles and ("houseboat" in pkg_title or "houseboat" in pkg_summary):
            score += 0.10
            reasons.append("Includes signature Alleppey backwater houseboat stay")
        if "tea plantation" in travel_styles and ("tea" in pkg_summary or "munnar" in pkg_title):
            score += 0.10
            reasons.append("Features hillside tea plantations and scenic highlands")
        if "cultural heritage" in travel_styles and ("temple" in pkg_summary or "heritage" in pkg_summary):
            score += 0.10
            reasons.append("Covers iconic heritage landmarks and historic temples")

        if not reasons:
            reasons.append(f"Popular journey covering key highlights of {pkg.get('destination')}")

        fit_summary = (
            f"A {duration_days}-day journey through {pkg.get('destination')} curated to meet the traveller's pace "
            f"and interests, starting from ₹{from_price:,.0f} per person (twin sharing)."
            if from_price
            else f"A {duration_days}-day journey through {pkg.get('destination')} tailored around the requested preferences."
        )

        final_score = min(0.98, max(0.60, round(score, 2)))
        recommendations.append(
            PackageRecommendationItem(
                package_id=pkg["id"],
                slug=pkg["slug"],
                title=pkg["title"],
                destination=pkg["destination"],
                duration_days=duration_days,
                from_price=from_price,
                match_score=final_score,
                match_reasons=reasons,
                fit_summary=fit_summary,
            )
        )

    # Sort descending by match score
    recommendations.sort(key=lambda r: r.match_score, reverse=True)
    return recommendations[:3]


def draft_consultant_reply(
    traveller_name: str,
    enquiry_reference: str,
    original_message: str,
    analysis: AIAnalysis,
    recommendations: list[PackageRecommendationItem],
    consultant_name: str = "Our Travel Team",
) -> str:
    """Generate a warm, professional, personalized reply draft for the consultant."""
    api_key, _, _ = get_llm_config()

    if api_key:
        try:
            system_prompt = (
                "You are an experienced luxury travel consultant at a boutique tour company specializing in South India. "
                "Draft a personalized, warm, and professional reply email to a prospective traveller. "
                "Reference the recommended packages with their exact titles, durations, and starting prices in INR. "
                "Do not make up fake packages or prices. Keep the tone warm, welcoming, and refined. "
                "Output only the plain email text."
            )
            context = {
                "traveller_name": traveller_name,
                "reference": enquiry_reference,
                "original_message": original_message,
                "analysis": analysis.model_dump(),
                "recommendations": [r.model_dump() for r in recommendations],
                "consultant_name": consultant_name,
            }
            reply_text = call_llm(system_prompt, json.dumps(context), json_mode=False).strip()
            if reply_text:
                return reply_text
        except Exception as exc:
            logger.warning("LLM reply draft generation failed, falling back to template: %s", exc)

    # Deterministic high-quality template
    name = traveller_name or "there"
    dates_mention = f" for {analysis.travel_dates}" if analysis.travel_dates else ""
    guest_count = ""
    if analysis.adults:
        guest_count = f" for {analysis.adults} adult{'s' if analysis.adults > 1 else ''}"
        if analysis.children:
            guest_count += f" and {analysis.children} child{'ren' if analysis.children > 1 else ''}"

    packages_bullets = []
    for rec in recommendations[:2]:
        price_str = f"from ₹{rec.from_price:,.0f} per person (twin sharing)" if rec.from_price else "custom pricing on request"
        packages_bullets.append(
            f"• {rec.title} ({rec.duration_days} days) — {price_str}\n  {rec.fit_summary}"
        )

    recommendations_section = "\n\n".join(packages_bullets) if packages_bullets else "We have private itineraries customized around your preferred dates and travel pace."

    return (
        f"Dear {name},\n\n"
        f"Thank you for contacting us regarding your upcoming journey{dates_mention}{guest_count}. "
        f"We have received your enquiry (Ref: {enquiry_reference}) and would be delighted to craft a personalized holiday for you.\n\n"
        f"Based on what you shared, here are our recommended private journeys that match your preferences:\n\n"
        f"{recommendations_section}\n\n"
        f"All our journeys are private and can be tailored with specific boutique hotels, pace adjustments, "
        f"or special experiences to match your preferences.\n\n"
        f"Could you let us know if these options appeal to you, or if you would prefer a quick call to refine the details?\n\n"
        f"Warm regards,\n"
        f"{consultant_name}\n"
        f"Tour Operations & Travel Design"
    )
