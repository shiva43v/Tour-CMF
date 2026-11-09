"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const statuses = ["new", "contacted", "qualified", "quoted", "booked", "lost"];

type AIAnalysis = {
  traveller_name?: string;
  adults?: number;
  children?: number;
  budget?: { amount?: number; currency?: string; note?: string };
  duration_nights?: { min?: number; max?: number };
  preferred_destinations?: string[];
  travel_dates?: string;
  travel_style?: string[];
  special_requests?: string[];
  confidence_score?: number;
  summary?: string;
};

type PackageRecommendationItem = {
  package_id: number;
  slug: string;
  title: string;
  destination: string;
  duration_days: number;
  from_price?: number;
  match_score: number;
  match_reasons: string[];
  fit_summary: string;
};

type AIReplyDraft = {
  body: string;
  status: "draft" | "approved";
  generated_at?: string;
  updated_at?: string;
};

type Enquiry = {
  id: number;
  reference: string;
  status: string;
  traveller_name: string;
  phone: string;
  email?: string;
  package_title?: string;
  adults?: number;
  children?: number;
  travel_dates?: string;
  budget?: string;
  original_message: string;
  assigned_to_id?: number;
  assigned_to_name?: string;
  created_at: string;
  notes: { body: string; author: string; created_at: string }[];
  replies: { body: string; author: string; sent_at: string }[];
  ai_analysis?: AIAnalysis;
  ai_recommendations?: PackageRecommendationItem[];
  ai_reply_draft?: AIReplyDraft;
};

function formatINR(value: number | undefined | null) {
  if (value === undefined || value === null) return "Custom quote";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function EnquiriesPage() {
  const [all, setAll] = useState<Enquiry[]>([]);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [consultants, setConsultants] = useState<{ id: number; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<string>("all");

  const [note, setNote] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [editingAnalysis, setEditingAnalysis] = useState(false);
  const [editForm, setEditForm] = useState<{
    adults: string;
    children: string;
    min_nights: string;
    max_nights: string;
    budget_amount: string;
    travel_dates: string;
    summary: string;
  }>({
    adults: "",
    children: "",
    min_nights: "",
    max_nights: "",
    budget_amount: "",
    travel_dates: "",
    summary: "",
  });

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("tour-cmf-token")}`,
  });

  const load = async (selectId?: number) => {
    try {
      const res = await fetch(`${API}/api/v1/enquiries`, { headers: getHeaders() });
      if (!res.ok) {
        if (res.status === 401) window.location.assign("/login");
        return;
      }
      const data: Enquiry[] = await res.json();
      setAll(data);

      if (selectId) {
        const match = data.find((e) => e.id === selectId);
        if (match) syncSelected(match);
      } else if (selected) {
        const match = data.find((e) => e.id === selected.id);
        if (match) syncSelected(match);
      } else if (data.length > 0) {
        syncSelected(data[0]);
      }

      const cRes = await fetch(`${API}/api/v1/enquiries/consultants`, { headers: getHeaders() });
      if (cRes.ok) setConsultants(await cRes.json());
    } catch {
      // offline/server error
    }
  };

  const syncSelected = (e: Enquiry) => {
    setSelected(e);
    setDraftBody(e.ai_reply_draft?.body || "");
    const a = e.ai_analysis;
    setEditForm({
      adults: a?.adults !== undefined && a?.adults !== null ? String(a.adults) : "",
      children: a?.children !== undefined && a?.children !== null ? String(a.children) : "",
      min_nights: a?.duration_nights?.min !== undefined && a?.duration_nights?.min !== null ? String(a.duration_nights.min) : "",
      max_nights: a?.duration_nights?.max !== undefined && a?.duration_nights?.max !== null ? String(a.duration_nights.max) : "",
      budget_amount: a?.budget?.amount !== undefined && a?.budget?.amount !== null ? String(a.budget.amount) : "",
      travel_dates: a?.travel_dates || "",
      summary: a?.summary || "",
    });
    setEditingAnalysis(false);
  };

  useEffect(() => {
    load();
  }, []);

  async function updateEnquiry(data: object) {
    if (!selected) return;
    try {
      const r = await fetch(`${API}/api/v1/enquiries/${selected.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (r.ok) {
        const updated = await r.json();
        syncSelected(updated);
        await load(updated.id);
        setNote("");
        setActionMessage("✓ Enquiry updated successfully.");
      }
    } catch {
      setActionMessage("Error updating enquiry.");
    }
  }

  // --- AI Actions ---

  async function handleStartAnalysis() {
    if (!selected) return;
    setLoadingAction(true);
    setActionMessage("AI is analyzing customer requirements…");
    try {
      const r = await fetch(`${API}/api/v1/enquiries/${selected.id}/analyze`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (r.ok) {
        setActionMessage("✓ AI travel requirements extracted successfully.");
        await load(selected.id);
      } else {
        const err = await r.json();
        setActionMessage(err.detail || "Analysis failed.");
      }
    } catch {
      setActionMessage("Could not connect to AI service.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleSaveAnalysisEdits() {
    if (!selected) return;
    setLoadingAction(true);
    setActionMessage("Saving corrected requirements…");
    try {
      const payload: Record<string, unknown> = {};
      if (editForm.adults) payload.adults = Number(editForm.adults);
      if (editForm.children) payload.children = Number(editForm.children);
      if (editForm.travel_dates) payload.travel_dates = editForm.travel_dates;
      if (editForm.summary) payload.summary = editForm.summary;

      const minN = editForm.min_nights ? Number(editForm.min_nights) : null;
      const maxN = editForm.max_nights ? Number(editForm.max_nights) : null;
      if (minN !== null || maxN !== null) {
        payload.duration_nights = { min: minN, max: maxN };
      }

      if (editForm.budget_amount) {
        payload.budget = {
          amount: Number(editForm.budget_amount),
          currency: "INR",
          note: `Budget: ₹${Number(editForm.budget_amount).toLocaleString("en-IN")}`,
        };
      }

      const r = await fetch(`${API}/api/v1/enquiries/${selected.id}/analysis`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setActionMessage("✓ Requirements updated.");
        setEditingAnalysis(false);
        await load(selected.id);
      } else {
        const err = await r.json();
        const msg = Array.isArray(err.detail) ? err.detail.map((d: { msg?: string }) => d.msg).join(", ") : err.detail;
        setActionMessage(msg || "Could not update analysis.");
      }
    } catch {
      setActionMessage("Error updating requirements.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleGenerateRecommendations() {
    if (!selected) return;
    setLoadingAction(true);
    setActionMessage("AI is querying published packages in PostgreSQL…");
    try {
      const r = await fetch(`${API}/api/v1/enquiries/${selected.id}/recommendations`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (r.ok) {
        setActionMessage("✓ Matching published packages recommended.");
        await load(selected.id);
      } else {
        const err = await r.json();
        setActionMessage(err.detail || "Could not fetch recommendations.");
      }
    } catch {
      setActionMessage("Error fetching recommendations.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleGenerateReplyDraft() {
    if (!selected) return;
    setLoadingAction(true);
    setActionMessage("AI is drafting personalized consultant reply…");
    try {
      const r = await fetch(`${API}/api/v1/enquiries/${selected.id}/reply-draft`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (r.ok) {
        const data: AIReplyDraft = await r.json();
        setDraftBody(data.body);
        setActionMessage("✓ New reply draft generated.");
        await load(selected.id);
      } else {
        const err = await r.json();
        setActionMessage(err.detail || "Draft generation failed.");
      }
    } catch {
      setActionMessage("Error generating draft.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleSaveDraftEdits() {
    if (!selected) return;
    setLoadingAction(true);
    try {
      const r = await fetch(`${API}/api/v1/enquiries/${selected.id}/reply-draft`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ body: draftBody }),
      });
      if (r.ok) {
        setActionMessage("✓ Reply draft saved.");
        await load(selected.id);
      } else {
        const err = await r.json();
        setActionMessage(err.detail || "Could not save draft.");
      }
    } catch {
      setActionMessage("Error saving draft.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleApproveDraft() {
    if (!selected) return;
    if (!window.confirm("Approve and record this AI reply as an official communication to the traveller?")) return;
    setLoadingAction(true);
    try {
      if (draftBody !== selected.ai_reply_draft?.body) {
        await fetch(`${API}/api/v1/enquiries/${selected.id}/reply-draft`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ body: draftBody }),
        });
      }
      const r = await fetch(`${API}/api/v1/enquiries/${selected.id}/reply-draft/approve`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (r.ok) {
        const updated = await r.json();
        syncSelected(updated);
        await load(updated.id);
        setActionMessage("✓ Reply approved and recorded into communication history!");
      } else {
        const err = await r.json();
        setActionMessage(err.detail || "Could not approve reply.");
      }
    } catch {
      setActionMessage("Error approving reply.");
    } finally {
      setLoadingAction(false);
    }
  }

  // Filtered list
  const filteredEnquiries = all.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.traveller_name.toLowerCase().includes(q) ||
      e.reference.toLowerCase().includes(q) ||
      (e.email && e.email.toLowerCase().includes(q)) ||
      e.phone.toLowerCase().includes(q) ||
      (e.package_title && e.package_title.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (filterTab !== "all" && e.status !== filterTab) return false;
    return true;
  });

  const newCount = all.filter((e) => e.status === "new").length;
  const inPipelineCount = all.filter((e) => ["contacted", "qualified", "quoted"].includes(e.status)).length;
  const bookedCount = all.filter((e) => e.status === "booked").length;

  return (
    <div>
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Traveller Enquiries & AI Hub</h1>
          <p className="dash-page-desc">
            AI-driven requirements extraction, real-time package matching, and tailored consultant replies.
          </p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="dash-stats-grid">
        <div className="dash-stat-card">
          <div>
            <div className="dash-stat-label">Total Leads</div>
            <div className="dash-stat-value">{all.length}</div>
          </div>
          <div className="dash-stat-icon-wrap indigo">📬</div>
        </div>

        <div className="dash-stat-card">
          <div>
            <div className="dash-stat-label">New Enquiries</div>
            <div className="dash-stat-value" style={{ color: "#e11d48" }}>
              {newCount}
            </div>
          </div>
          <div className="dash-stat-icon-wrap rose">🔥</div>
        </div>

        <div className="dash-stat-card">
          <div>
            <div className="dash-stat-label">In Pipeline</div>
            <div className="dash-stat-value" style={{ color: "#d97706" }}>
              {inPipelineCount}
            </div>
          </div>
          <div className="dash-stat-icon-wrap amber">💬</div>
        </div>

        <div className="dash-stat-card">
          <div>
            <div className="dash-stat-label">Confirmed Booked</div>
            <div className="dash-stat-value" style={{ color: "#059669" }}>
              {bookedCount}
            </div>
          </div>
          <div className="dash-stat-icon-wrap teal">🎉</div>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            background: actionMessage.startsWith("✓") ? "#d1fae5" : "#eff6ff",
            color: actionMessage.startsWith("✓") ? "#065f46" : "#1e40af",
            fontWeight: 600,
            marginBottom: "1.5rem",
            border: `1px solid ${actionMessage.startsWith("✓") ? "#a7f3d0" : "#bfdbfe"}`,
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* Split Screen Master-Detail Workspace */}
      <div className="dash-crm-container">
        {/* Left Inbox Sidebar */}
        <aside className="dash-inbox-pane">
          <div className="dash-inbox-header">
            <input
              type="search"
              className="dash-inbox-search"
              placeholder="Filter by name, phone, ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={{ display: "flex", gap: ".25rem", marginTop: ".65rem", overflowX: "auto" }}>
              {["all", "new", "contacted", "quoted", "booked"].map((st) => (
                <button
                  key={st}
                  className={`dash-tab-btn ${filterTab === st ? "active" : ""}`}
                  style={{ fontSize: ".72rem", padding: ".25rem .5rem" }}
                  onClick={() => setFilterTab(st)}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="dash-inbox-list">
            {filteredEnquiries.length > 0 ? (
              filteredEnquiries.map((e) => (
                <button
                  key={e.id}
                  className={`dash-enquiry-item ${selected?.id === e.id ? "active" : ""}`}
                  onClick={() => syncSelected(e)}
                >
                  <div className="dash-enquiry-row-top">
                    <span className="dash-ref-code">{e.reference}</span>
                    <span className={`dash-status-pill ${e.status}`}>{e.status}</span>
                  </div>
                  <div className="dash-enquiry-name">{e.traveller_name}</div>
                  <div className="dash-enquiry-pkg">{e.package_title ?? "General Enquiry"}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: ".25rem" }}>
                    <small style={{ color: "#94a3b8", fontSize: ".7rem" }}>
                      {e.travel_dates || "Flexible dates"}
                    </small>
                    {e.ai_reply_draft && (
                      <span
                        style={{
                          fontSize: ".65rem",
                          fontWeight: 700,
                          color: e.ai_reply_draft.status === "approved" ? "#059669" : "#6366f1",
                        }}
                      >
                        {e.ai_reply_draft.status === "approved" ? "✓ Replied" : "⚡ AI Ready"}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#94a3b8", fontSize: ".85rem" }}>
                No enquiries matched your filter.
              </div>
            )}
          </div>
        </aside>

        {/* Right Detail Canvas */}
        <section className="dash-detail-pane">
          {selected ? (
            <>
              {/* Header with Traveler Meta & Quick Action Pills */}
              <div className="dash-detail-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".35rem" }}>
                    <span className="dash-ref-code" style={{ fontSize: ".85rem" }}>
                      {selected.reference}
                    </span>
                    <span className={`dash-status-pill ${selected.status}`}>{selected.status}</span>
                    {selected.assigned_to_name && (
                      <span className="dash-status-pill" style={{ background: "#f1f5f9", color: "#334155" }}>
                        👤 {selected.assigned_to_name}
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--dash-text-heading)", margin: "0 0 .25rem" }}>
                    {selected.traveller_name}
                  </h2>
                  <div style={{ fontSize: ".9rem", color: "var(--dash-text-muted)" }}>
                    Interested in: <strong>{selected.package_title ?? "Custom Journey"}</strong>
                  </div>

                  {/* Contact Action Pills */}
                  <div className="dash-contact-pill-row">
                    <a href={`tel:${selected.phone}`} className="dash-contact-pill">
                      📞 {selected.phone}
                    </a>
                    {selected.email && (
                      <a href={`mailto:${selected.email}`} className="dash-contact-pill">
                        ✉️ {selected.email}
                      </a>
                    )}
                    <a
                      href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="dash-contact-pill"
                      style={{ color: "#059669", fontWeight: 600 }}
                    >
                      💬 WhatsApp Chat
                    </a>
                  </div>
                </div>

                {/* Pipeline Status & Assign Selectors */}
                <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", minWidth: "180px" }}>
                  <label className="dash-label">
                    Pipeline Stage
                    <select
                      className="dash-select"
                      style={{ fontSize: ".82rem", padding: ".4rem" }}
                      value={selected.status}
                      onChange={(e) => updateEnquiry({ status: e.target.value })}
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="dash-label">
                    Consultant
                    <select
                      className="dash-select"
                      style={{ fontSize: ".82rem", padding: ".4rem" }}
                      value={selected.assigned_to_id ?? ""}
                      onChange={(e) =>
                        updateEnquiry({ assigned_to_id: e.target.value ? Number(e.target.value) : null })
                      }
                    >
                      <option value="">Unassigned</option>
                      {consultants.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Raw Customer Message Preserved Card */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--dash-border)",
                  borderLeft: "4px solid #0f766e",
                  borderRadius: "10px",
                  padding: "1.15rem 1.35rem",
                  marginBottom: "1.75rem",
                }}
              >
                <div style={{ fontSize: ".76rem", fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".4rem" }}>
                  Original Customer Message (Preserved in PostgreSQL)
                </div>
                <p style={{ margin: 0, fontSize: ".92rem", lineHeight: 1.6, color: "var(--dash-text-heading)", fontStyle: "italic" }}>
                  &ldquo;{selected.original_message}&rdquo;
                </p>
              </div>

              {/* SECTION 1: AI TRAVEL REQUIREMENTS INTELLIGENCE */}
              <section className="dash-ai-card">
                <div className="dash-ai-header">
                  <div className="dash-ai-title-wrap">
                    <span className="dash-ai-sparkle">✨</span>
                    <h3 className="dash-ai-title">AI Extracted Travel Requirements</h3>
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                    {selected.ai_analysis?.confidence_score && (
                      <span className="dash-status-pill qualified">
                        {Math.round(selected.ai_analysis.confidence_score * 100)}% Match Confidence
                      </span>
                    )}
                    <button
                      type="button"
                      className="dash-btn-secondary"
                      style={{ fontSize: ".76rem", padding: ".3rem .6rem" }}
                      onClick={handleStartAnalysis}
                      disabled={loadingAction}
                    >
                      🔄 Re-Extract
                    </button>
                  </div>
                </div>

                {selected.ai_analysis?.summary && (
                  <p style={{ fontSize: ".88rem", color: "#334155", margin: "0 0 1rem", lineHeight: 1.55 }}>
                    {selected.ai_analysis.summary}
                  </p>
                )}

                {/* Structured Fields Grid */}
                <div className="dash-ai-grid">
                  <div className="dash-ai-metric-cell">
                    <div className="dash-ai-metric-label">Adults</div>
                    <div className="dash-ai-metric-val">{selected.ai_analysis?.adults ?? selected.adults ?? "—"}</div>
                  </div>
                  <div className="dash-ai-metric-cell">
                    <div className="dash-ai-metric-label">Children</div>
                    <div className="dash-ai-metric-val">{selected.ai_analysis?.children ?? selected.children ?? "0"}</div>
                  </div>
                  <div className="dash-ai-metric-cell">
                    <div className="dash-ai-metric-label">Duration</div>
                    <div className="dash-ai-metric-val">
                      {selected.ai_analysis?.duration_nights?.min !== undefined && selected.ai_analysis?.duration_nights?.min !== null
                        ? `${selected.ai_analysis.duration_nights.min}–${selected.ai_analysis.duration_nights.max ?? selected.ai_analysis.duration_nights.min} nts`
                        : "Flexible"}
                    </div>
                  </div>
                  <div className="dash-ai-metric-cell">
                    <div className="dash-ai-metric-label">Budget</div>
                    <div className="dash-ai-metric-val" style={{ color: "#0f766e" }}>
                      {selected.ai_analysis?.budget?.amount
                        ? formatINR(selected.ai_analysis.budget.amount)
                        : selected.budget || "On request"}
                    </div>
                  </div>
                  <div className="dash-ai-metric-cell">
                    <div className="dash-ai-metric-label">Travel Dates</div>
                    <div className="dash-ai-metric-val" style={{ fontSize: ".9rem" }}>
                      {selected.ai_analysis?.travel_dates || selected.travel_dates || "Not specified"}
                    </div>
                  </div>
                </div>

                {/* Destination & Vibe Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem", marginTop: ".75rem" }}>
                  {selected.ai_analysis?.preferred_destinations?.map((d, i) => (
                    <span key={i} className="dash-pill-dest" style={{ fontSize: ".76rem", background: "#e0e7ff", color: "#3730a3" }}>
                      📍 {d}
                    </span>
                  ))}
                  {selected.ai_analysis?.travel_style?.map((s, i) => (
                    <span key={i} className="dash-pill-dest" style={{ fontSize: ".76rem", background: "#fef3c7", color: "#92400e" }}>
                      ✨ {s}
                    </span>
                  ))}
                </div>

                {/* Consultant Correction Form */}
                {editingAnalysis ? (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid var(--dash-border)",
                      borderRadius: "10px",
                      padding: "1.25rem",
                      marginTop: "1.25rem",
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "1rem",
                    }}
                  >
                    <div className="dash-field">
                      <label className="dash-label">Adults Count</label>
                      <input
                        type="number"
                        min="1"
                        className="dash-input"
                        value={editForm.adults}
                        onChange={(e) => setEditForm({ ...editForm, adults: e.target.value })}
                      />
                    </div>
                    <div className="dash-field">
                      <label className="dash-label">Children Count</label>
                      <input
                        type="number"
                        min="0"
                        className="dash-input"
                        value={editForm.children}
                        onChange={(e) => setEditForm({ ...editForm, children: e.target.value })}
                      />
                    </div>
                    <div className="dash-field">
                      <label className="dash-label">Min Nights</label>
                      <input
                        type="number"
                        min="1"
                        className="dash-input"
                        value={editForm.min_nights}
                        onChange={(e) => setEditForm({ ...editForm, min_nights: e.target.value })}
                      />
                    </div>
                    <div className="dash-field">
                      <label className="dash-label">Max Nights</label>
                      <input
                        type="number"
                        min="1"
                        className="dash-input"
                        value={editForm.max_nights}
                        onChange={(e) => setEditForm({ ...editForm, max_nights: e.target.value })}
                      />
                    </div>
                    <div className="dash-field">
                      <label className="dash-label">Budget Amount (₹)</label>
                      <input
                        type="number"
                        className="dash-input"
                        value={editForm.budget_amount}
                        onChange={(e) => setEditForm({ ...editForm, budget_amount: e.target.value })}
                      />
                    </div>
                    <div className="dash-field">
                      <label className="dash-label">Travel Window</label>
                      <input
                        type="text"
                        className="dash-input"
                        value={editForm.travel_dates}
                        onChange={(e) => setEditForm({ ...editForm, travel_dates: e.target.value })}
                      />
                    </div>
                    <div className="dash-field full" style={{ gridColumn: "1 / -1" }}>
                      <label className="dash-label">Summary</label>
                      <input
                        type="text"
                        className="dash-input"
                        value={editForm.summary}
                        onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: ".5rem" }}>
                      <button type="button" className="dash-btn-primary" onClick={handleSaveAnalysisEdits} disabled={loadingAction}>
                        Save Corrected Requirements
                      </button>
                      <button type="button" className="dash-btn-secondary" onClick={() => setEditingAnalysis(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: "1rem" }}>
                    <button
                      type="button"
                      className="dash-btn-secondary"
                      style={{ fontSize: ".78rem" }}
                      onClick={() => setEditingAnalysis(true)}
                    >
                      ✏️ Fine-Tune / Correct Extracted Requirements
                    </button>
                  </div>
                )}
              </section>

              {/* SECTION 2: AI PACKAGE RECOMMENDATIONS */}
              <section className="dash-ai-card" style={{ borderColor: "#ccfbf1" }}>
                <div className="dash-ai-header">
                  <div className="dash-ai-title-wrap">
                    <span style={{ fontSize: "1.2rem" }}>🎯</span>
                    <h3 className="dash-ai-title">Matching Published Packages</h3>
                  </div>
                  <button
                    type="button"
                    className="dash-btn-secondary"
                    style={{ fontSize: ".76rem", padding: ".3rem .6rem" }}
                    onClick={handleGenerateRecommendations}
                    disabled={loadingAction}
                  >
                    🔄 Refresh Recommendations
                  </button>
                </div>
                <p style={{ fontSize: ".82rem", color: "#64748b", margin: "0 0 1rem" }}>
                  Ranked against real published packages from PostgreSQL (drafts excluded).
                </p>

                {selected.ai_recommendations && selected.ai_recommendations.length > 0 ? (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {selected.ai_recommendations.map((rec) => (
                      <div
                        key={rec.package_id}
                        style={{
                          background: "#fff",
                          border: "1px solid var(--dash-border)",
                          borderRadius: "10px",
                          padding: "1.15rem",
                          boxShadow: "var(--shadow-xs)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: ".5rem", marginBottom: ".4rem" }}>
                          <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                            <Link href={`/packages/${rec.slug}`} target="_blank" style={{ color: "var(--dash-text-heading)", textDecoration: "none" }}>
                              {rec.title} ↗
                            </Link>
                          </h4>
                          <span
                            className="dash-status-pill"
                            style={{ background: "#d1fae5", color: "#065f46", fontSize: ".72rem" }}
                          >
                            {Math.round(rec.match_score * 100)}% Fit
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "1rem", fontSize: ".82rem", color: "var(--dash-text-muted)", marginBottom: ".5rem" }}>
                          <span>📍 {rec.destination}</span>
                          <span>⏳ {rec.duration_days} Days</span>
                          <strong style={{ color: "#0f766e" }}>
                            {rec.from_price ? `From ${formatINR(rec.from_price)} / person` : "Custom quote"}
                          </strong>
                        </div>

                        <p style={{ fontSize: ".85rem", color: "var(--dash-text-body)", margin: "0 0 .5rem", lineHeight: 1.5 }}>
                          {rec.fit_summary}
                        </p>

                        {rec.match_reasons && rec.match_reasons.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem" }}>
                            {rec.match_reasons.map((r, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: ".74rem",
                                  padding: ".15rem .5rem",
                                  background: "#f1f5f9",
                                  borderRadius: "4px",
                                  color: "#475569",
                                }}
                              >
                                ✓ {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontStyle: "italic", color: "#94a3b8", fontSize: ".85rem" }}>
                    No package recommendations loaded yet. Click &quot;Refresh Recommendations&quot; above.
                  </p>
                )}
              </section>

              {/* SECTION 3: AI GENERATED REPLY STUDIO */}
              <section
                className="dash-ai-card"
                style={{
                  borderLeftColor: "#0f766e",
                  borderLeftWidth: "4px",
                  background: "#fff",
                }}
              >
                <div className="dash-ai-header">
                  <div className="dash-ai-title-wrap">
                    <span style={{ fontSize: "1.2rem" }}>✉️</span>
                    <h3 className="dash-ai-title">Consultant Reply Studio</h3>
                  </div>
                  <span
                    className={`dash-status-pill ${selected.ai_reply_draft?.status === "approved" ? "booked" : "contacted"}`}
                  >
                    {selected.ai_reply_draft?.status === "approved" ? "✓ Approved & Sent" : "Ready for Review"}
                  </span>
                </div>
                <p style={{ fontSize: ".84rem", color: "#64748b", margin: "0 0 1rem" }}>
                  AI-personalized draft referencing the traveler&apos;s requests and recommended itineraries. Edit freely before approving.
                </p>

                <textarea
                  className="dash-textarea"
                  style={{
                    minHeight: "14rem",
                    fontSize: ".9rem",
                    lineHeight: 1.6,
                    padding: "1rem",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                  }}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder="AI-generated reply will appear here..."
                />

                <div style={{ display: "flex", flexWrap: "wrap", gap: ".65rem", marginTop: "1rem", alignItems: "center" }}>
                  <button
                    type="button"
                    className="dash-btn-primary"
                    style={{ background: "#059669" }}
                    onClick={handleApproveDraft}
                    disabled={loadingAction || !draftBody.trim()}
                  >
                    ✓ Approve & Record Official Reply
                  </button>

                  <button
                    type="button"
                    className="dash-btn-secondary"
                    onClick={handleSaveDraftEdits}
                    disabled={loadingAction || !draftBody.trim()}
                  >
                    💾 Save Draft Edits
                  </button>

                  <button
                    type="button"
                    className="dash-btn-secondary"
                    onClick={handleGenerateReplyDraft}
                    disabled={loadingAction}
                  >
                    ✨ Regenerate Reply with AI
                  </button>
                </div>
              </section>

              {/* SECTION 4: NOTES & COMMUNICATION STREAM */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "2rem" }}>
                {/* Internal Notes */}
                <div style={{ background: "#f8fafc", border: "1px solid var(--dash-border)", borderRadius: "10px", padding: "1.25rem" }}>
                  <h4 style={{ margin: "0 0 .75rem", fontSize: "1rem", fontWeight: 700 }}>Staff Internal Notes</h4>
                  <div style={{ display: "flex", gap: ".5rem", marginBottom: "1rem" }}>
                    <input
                      className="dash-input"
                      placeholder="Add confidential note..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <button
                      type="button"
                      className="dash-btn-secondary"
                      onClick={() => updateEnquiry({ note })}
                      disabled={!note.trim()}
                    >
                      Post
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: ".5rem" }}>
                    {selected.notes && selected.notes.length > 0 ? (
                      selected.notes.map((n, i) => (
                        <div key={i} style={{ padding: ".6rem .8rem", background: "#fff", borderRadius: "6px", border: "1px solid #edf2f7", fontSize: ".82rem" }}>
                          <strong style={{ color: "#0f766e" }}>{n.author}:</strong> {n.body}
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "#94a3b8", fontSize: ".8rem" }}>No notes yet.</div>
                    )}
                  </div>
                </div>

                {/* Sent Communication Stream */}
                <div style={{ background: "#f8fafc", border: "1px solid var(--dash-border)", borderRadius: "10px", padding: "1.25rem" }}>
                  <h4 style={{ margin: "0 0 .75rem", fontSize: "1rem", fontWeight: 700 }}>Communication History</h4>
                  <div style={{ display: "grid", gap: ".65rem" }}>
                    {selected.replies && selected.replies.length > 0 ? (
                      selected.replies.map((r, i) => (
                        <div
                          key={i}
                          style={{
                            padding: ".75rem .9rem",
                            background: "#fff",
                            border: "1px solid var(--dash-border)",
                            borderRadius: "6px",
                            fontSize: ".82rem",
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: ".72rem", marginBottom: ".3rem" }}>
                            <span>Sent by <strong>{r.author}</strong></span>
                            <span>{r.sent_at ? new Date(r.sent_at).toLocaleDateString() : ""}</span>
                          </div>
                          {r.body.length > 200 ? `${r.body.slice(0, 200)}…` : r.body}
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "#94a3b8", fontSize: ".8rem" }}>No replies recorded yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#94a3b8" }}>
              Select an enquiry from the inbox list to manage lead details, view AI extractions, and approve reply drafts.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
