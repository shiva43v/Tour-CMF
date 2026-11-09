"use client";

import { FormEvent, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function EnquiryForm({ slug, title }: { slug: string; title: string }) {
  const [done, setDone] = useState<string | false>(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adults, setAdults] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    const body: Record<string, string | number | boolean> = {};

    f.forEach((value, key) => {
      const text = String(value).trim();
      if (text) body[key] = text;
    });

    body.adults = adults;
    body.children = childrenCount;
    body.consent_whatsapp = f.get("consent_whatsapp") === "on";

    try {
      const r = await fetch(`${API}/api/v1/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, package_slug: slug }),
      });
      const x = await r.json();
      if (!r.ok) {
        const detail = Array.isArray(x.detail)
          ? x.detail.map((issue: { msg?: string }) => issue.msg ?? "Invalid field").join(" ")
          : x.detail;
        throw new Error(detail ?? "Unable to submit enquiry.");
      }
      setDone(x.reference);
    } catch (x) {
      setError(x instanceof Error ? x.message : "Unable to submit enquiry.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="enquiry-panel" id="enquire">
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(52, 211, 153, 0.2)",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              margin: "0 auto 1.5rem",
              border: "1px solid rgba(52, 211, 153, 0.4)",
            }}
          >
            ✓
          </div>
          <p className="eyebrow" style={{ color: "#34d399" }}>
            Enquiry Received
          </p>
          <h2>We are shaping your journey.</h2>
          <p style={{ color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.7 }}>
            Thank you for reaching out about <strong>{title}</strong>. Our travel designer has received your
            requirements and is preparing a tailored private itinerary.
          </p>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              padding: "1.25rem 2rem",
              margin: "2rem auto",
              display: "inline-block",
            }}
          >
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7 }}>
              Your Booking Reference
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fed7aa", fontFamily: "monospace", marginTop: ".25rem" }}>
              {done}
            </div>
          </div>

          <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.7)" }}>
            A travel consultant will contact you via phone or WhatsApp with custom dates, villa options, and pricing.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="enquiry-panel" id="enquire">
      <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto" }}>
        <p className="eyebrow" style={{ color: "#fed7aa" }}>
          Tailored Around You
        </p>
        <h2>Let’s start planning your journey.</h2>
        <p style={{ color: "rgba(255, 255, 255, 0.9)", margin: "0 auto", lineHeight: 1.6 }}>
          Tell us when you would like to travel and our specialists will shape <strong>{title}</strong> with boutique
          estates and private chauffeured travel.
        </p>
      </div>

      <form className="enquiry-form-modern" onSubmit={submit}>
        <div>
          <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, marginBottom: ".4rem", opacity: 0.9 }}>
            Your Full Name *
          </label>
          <input name="traveller_name" placeholder="e.g. Shiva Vutkuru" required />
        </div>

        <div>
          <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, marginBottom: ".4rem", opacity: 0.9 }}>
            Contact Number *
          </label>
          <input name="phone" placeholder="e.g. +91 98765 43210" required />
        </div>

        <div>
          <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, marginBottom: ".4rem", opacity: 0.9 }}>
            Email Address (Optional)
          </label>
          <input name="email" type="email" placeholder="shivavutkuru@example.com" />
        </div>

        <div>
          <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, marginBottom: ".4rem", opacity: 0.9 }}>
            Estimated Travel Dates
          </label>
          <input name="travel_dates" placeholder="e.g. Late December or Christmas/No.of days" />
        </div>

        {/* Guest Counters */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, marginBottom: ".4rem", opacity: 0.9 }}>
              Adults (12+ yrs)
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                padding: "0.5rem 1rem",
              }}
            >
              <button
                type="button"
                onClick={() => setAdults(Math.max(1, adults - 1))}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#fff",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  width: "28px",
                  height: "28px",
                }}
              >
                −
              </button>
              <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>{adults}</span>
              <button
                type="button"
                onClick={() => setAdults(adults + 1)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#fff",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  width: "28px",
                  height: "28px",
                }}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, marginBottom: ".4rem", opacity: 0.9 }}>
              Children (&lt; 12 yrs)
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                padding: "0.5rem 1rem",
              }}
            >
              <button
                type="button"
                onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#fff",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  width: "28px",
                  height: "28px",
                }}
              >
                −
              </button>
              <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>{childrenCount}</span>
              <button
                type="button"
                onClick={() => setChildrenCount(childrenCount + 1)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#fff",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  width: "28px",
                  height: "28px",
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, marginBottom: ".4rem", opacity: 0.9 }}>
            Approximate Budget
          </label>
          <input name="budget" placeholder="e.g. ₹80,000 or Flexible" />
        </div>

        <div>
          <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, marginBottom: ".4rem", opacity: 0.9 }}>
            Special Requests & Experiences
          </label>
          <textarea
            name="message"
            placeholder="Tell us about special experiences: private houseboat, tea tasting, plantation walks, romantic setups, or specific hotel preferences..."
          />
        </div>

        <label className="enquiry-consent-row">
          <input name="consent_whatsapp" type="checkbox" defaultChecked />
          <span>✓ Yes, I consent to receiving my custom itinerary and quotation via WhatsApp.</span>
        </label>

        {error && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "0.75rem 1rem",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "10px",
              color: "#fca5a5",
              fontSize: ".85rem",
            }}
          >
            {error}
          </div>
        )}

        <button type="submit" className="enquiry-submit-btn" disabled={submitting}>
          {submitting ? "Transmitting Requirements…" : "Send Private Travel Enquiry →"}
        </button>
      </form>
    </section>
  );
}
