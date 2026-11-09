"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Stop = { day: number; title: string; description: string };
type Price = {
  season_name: string;
  start_date: string | null;
  end_date: string | null;
  price_per_person: number;
  price_basis: string;
  gst_note: string;
};

type Journey = {
  id?: number;
  title: string;
  slug: string;
  status?: string;
  version_number?: number;
  scheduled_publish_at?: string | null;
  content: {
    duration_days: number;
    destination: string;
    summary: string;
    image_url: string;
    hero_image_url?: string;
    gallery_image_urls?: string[];
    map_embed_url?: string | null;
    hotels: string[];
    inclusions: string[];
    itinerary: Stop[];
  };
  prices: Price[];
};

const blankJourney = (): Journey => ({
  title: "",
  slug: "",
  content: {
    duration_days: 5,
    destination: "Kerala",
    summary: "",
    image_url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80",
    hero_image_url: "",
    gallery_image_urls: [],
    map_embed_url: "",
    hotels: [],
    inclusions: [],
    itinerary: [
      { day: 1, title: "Arrival & Welcome", description: "Arrive and transfer to your boutique stay." },
    ],
  },
  prices: [
    {
      season_name: "All Year",
      start_date: null,
      end_date: null,
      price_per_person: 25000,
      price_basis: "twin_sharing",
      gst_note: "GST applicable",
    },
  ],
});

function formatINR(val: number | null | undefined) {
  if (!val) return "Custom quote";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

export default function AdminPage() {
  const [items, setItems] = useState<Journey[]>([]);
  const [item, setItem] = useState<Journey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "published" | "draft">("all");

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("tour-cmf-token")}`,
  });

  const load = async () => {
    try {
      const r = await fetch(`${API_URL}/api/v1/admin/packages`, { headers: getHeaders() });
      if (!r.ok) {
        if (r.status === 401) window.location.assign("/login");
        throw new Error(r.status === 403 ? "You do not have staff permissions." : "Session expired.");
      }
      const data: Journey[] = await r.json();
      setItems(data);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error loading packages.");
    }
  };

  useEffect(() => {
    const rawUser = sessionStorage.getItem("tour-cmf-user");
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        setIsAdmin(u.role === "admin");
      } catch {
        // fallback
      }
    }
    load();
  }, []);

  const updateContent = (field: string, value: string | number | string[]) => {
    if (!item) return;
    setItem({ ...item, content: { ...item.content, [field]: value } });
  };

  const updateList = (field: "hotels" | "inclusions", value: string) => {
    updateContent(
      field,
      value
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
    );
  };

  const updateGallery = (value: string) => updateContent("gallery_image_urls", value.split("\n").map((url) => url.trim()).filter(Boolean));

  const updateStop = (n: number, field: keyof Stop, value: string) => {
    if (!item) return;
    setItem({
      ...item,
      content: {
        ...item.content,
        itinerary: item.content.itinerary.map((x, i) => (i === n ? { ...x, [field]: field === "day" ? Number(value) : value } : x)),
      },
    });
  };

  const updatePrice = (n: number, field: keyof Price, value: string | null) => {
    if (!item) return;
    setItem({
      ...item,
      prices: item.prices.map((x, i) =>
        i === n ? { ...x, [field]: field === "price_per_person" ? Number(value) : value } : x
      ),
    });
  };

  async function handleSave(publish: boolean) {
    if (!item) return;
    setSaving(true);
    setMessage(null);
    try {
      const url = `${API_URL}/api/v1/admin/packages${item.id ? `/${item.id}` : ""}`;
      const r = await fetch(url, {
        method: item.id ? "PUT" : "POST",
        headers: getHeaders(),
        body: JSON.stringify({ ...item, publish }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail ?? "Could not save journey.");
      setItem(data);
      await load();
      setMessage(publish ? "✓ Journey approved and published to live website!" : "✓ Draft revision saved successfully.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error saving journey.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSchedule() {
    if (!item) return;
    const value = window.prompt("Publish at (local time, YYYY-MM-DDTHH:MM):");
    if (!value) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/api/v1/admin/packages/${item.id}`, {
        method: "PUT", headers: getHeaders(),
        body: JSON.stringify({ ...item, publish: false, scheduled_publish_at: new Date(value).toISOString() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail ?? "Could not schedule journey.");
      setItem(data); await load(); setMessage("✓ Journey scheduled for publishing.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not schedule journey."); }
    finally { setSaving(false); }
  }

  async function handleDuplicate(source: Journey) {
    const slug = window.prompt("New unique URL slug for the copy:", `${source.slug}-copy`);
    if (!slug || !source.id) return;
    try {
      const r = await fetch(`${API_URL}/api/v1/admin/packages/${source.id}/duplicate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ slug, title: `Copy of ${source.title}` }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMessage(data.detail ?? "Could not duplicate journey.");
        return;
      }
      setItem(data);
      await load();
      setMessage("✓ Journey duplicated as a new draft.");
    } catch {
      setMessage("Could not duplicate journey.");
    }
  }

  async function handleRemove() {
    if (!item?.id || !window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) return;
    try {
      const r = await fetch(`${API_URL}/api/v1/admin/packages/${item.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!r.ok) {
        const data = await r.json();
        throw new Error(data.detail ?? "Could not delete journey.");
      }
      setItem(null);
      await load();
      setMessage("✓ Journey removed.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not delete journey.");
    }
  }

  // Filtered journeys
  const filteredJourneys = items.filter((j) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.slug.toLowerCase().includes(q) ||
      j.content.destination.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterTab === "published") return j.status === "published";
    if (filterTab === "draft") return j.status !== "published";
    return true;
  });

  const publishedCount = items.filter((i) => i.status === "published").length;
  const draftCount = items.filter((i) => i.status !== "published").length;

  // --- STUDIO / EDITOR VIEW ---
  if (item) {
    return (
      <div className="dash-editor-shell">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={() => {
                setItem(null);
                load();
              }}
              style={{ marginBottom: ".5rem" }}
            >
              ← Back to all journeys
            </button>
            <h1 className="dash-page-title">{item.id ? `Edit: ${item.title}` : "Create New Journey"}</h1>
            <p className="dash-page-desc">
              {item.id ? `Editing Version ${item.version_number ?? 1} · Status: ${item.status?.toUpperCase()}` : "New Draft Itinerary"}
            </p>
          </div>
          {item.slug && item.status === "published" && (
            <Link href={`/packages/${item.slug}`} target="_blank" className="dash-btn-secondary">
              View on live site ↗
            </Link>
          )}
        </div>

        {message && (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "10px",
              background: message.startsWith("✓") ? "#d1fae5" : "#fee2e2",
              color: message.startsWith("✓") ? "#065f46" : "#991b1b",
              fontWeight: 600,
              marginBottom: "1.5rem",
              border: `1px solid ${message.startsWith("✓") ? "#a7f3d0" : "#fecaca"}`,
            }}
          >
            {message}
          </div>
        )}

        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            handleSave(false);
          }}
        >
          {/* Card 1: Core Essentials */}
          <div className="dash-editor-card">
            <div className="dash-editor-card-header">
              <h2 className="dash-editor-card-title">1. Essentials & URL</h2>
              <span className="dash-env-pill">Required</span>
            </div>
            <div className="dash-form-grid-2">
              <div className="dash-field">
                <label className="dash-label">Journey Title</label>
                <input
                  required
                  className="dash-input"
                  placeholder="e.g. Munnar, Thekkady and Alleppey Houseboat"
                  value={item.title}
                  onChange={(e) => setItem({ ...item, title: e.target.value })}
                />
              </div>
              <div className="dash-field">
                <label className="dash-label">Gallery image URLs <small>(one per line)</small></label>
                <textarea className="dash-textarea" value={(item.content.gallery_image_urls ?? []).join("\n")} onChange={(e) => updateGallery(e.target.value)} />
              </div>
              <div className="dash-field full">
                <label className="dash-label">Google Maps embed URL <small>(optional)</small></label>
                <input type="url" className="dash-input" placeholder="https://www.google.com/maps/embed?..." value={item.content.map_embed_url ?? ""} onChange={(e) => updateContent("map_embed_url", e.target.value)} />
              </div>

              <div className="dash-field">
                <label className="dash-label">
                  URL Slug <small>(Unique public path)</small>
                </label>
                <input
                  required
                  className="dash-input"
                  placeholder="munnar-thekkady-alleppey"
                  value={item.slug}
                  onChange={(e) =>
                    setItem({
                      ...item,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                />
              </div>

              <div className="dash-field">
                <label className="dash-label">Primary Destination</label>
                <select
                  required
                  className="dash-select"
                  value={item.content.destination}
                  onChange={(e) => updateContent("destination", e.target.value)}
                >
                  <option value="Kerala">Kerala</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="South India">South India Circuit</option>
                </select>
              </div>

              <div className="dash-field">
                <label className="dash-label">Duration (Days)</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="30"
                  className="dash-input"
                  value={item.content.duration_days}
                  onChange={(e) => updateContent("duration_days", Number(e.target.value))}
                />
              </div>

              <div className="dash-field full">
                <label className="dash-label">
                  Overview Summary <small>(Appears in search cards and top of journey page)</small>
                </label>
                <textarea
                  required
                  className="dash-textarea"
                  placeholder="A poetic summary of this trip: misty hills, fragrant spice gardens, and backwater serenity..."
                  value={item.content.summary}
                  onChange={(e) => updateContent("summary", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Imagery & Visuals with Real-Time Preview */}
          <div className="dash-editor-card">
            <div className="dash-editor-card-header">
              <h2 className="dash-editor-card-title">2. Photography & Imagery</h2>
              <small style={{ color: "#64748b" }}>Live preview below</small>
            </div>
            <div className="dash-form-grid-2">
              <div className="dash-field">
                <label className="dash-label">Card Image URL</label>
                <input
                  required
                  type="url"
                  className="dash-input"
                  value={item.content.image_url}
                  onChange={(e) => updateContent("image_url", e.target.value)}
                />
              </div>
              <div className="dash-field">
                <label className="dash-label">
                  Hero Banner URL <small>(Optional wide banner)</small>
                </label>
                <input
                  type="url"
                  className="dash-input"
                  placeholder="Defaults to Card Image if blank"
                  value={item.content.hero_image_url ?? ""}
                  onChange={(e) => updateContent("hero_image_url", e.target.value)}
                />
              </div>
            </div>

            {item.content.image_url && (
              <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
                <div style={{ width: "160px", height: "100px", borderRadius: "8px", overflow: "hidden", background: "#f1f5f9" }}>
                  <img
                    src={item.content.image_url}
                    alt="Preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                  />
                </div>
                <div style={{ fontSize: ".82rem", color: "#64748b" }}>
                  ✓ Visual card preview rendered. High-resolution landscape photography works best.
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Stays & Inclusions */}
          <div className="dash-editor-card">
            <div className="dash-editor-card-header">
              <h2 className="dash-editor-card-title">3. Accommodations & Inclusions</h2>
              <small style={{ color: "#64748b" }}>One line per item</small>
            </div>
            <div className="dash-form-grid-2">
              <div className="dash-field">
                <label className="dash-label">Boutique Stays & Hotels</label>
                <textarea
                  className="dash-textarea"
                  style={{ minHeight: "7rem" }}
                  placeholder={"Munnar — 4-star hillside tea estate\nThekkady — rainforest lodge\nAlleppey — private luxury houseboat"}
                  value={item.content.hotels.join("\n")}
                  onChange={(e) => updateList("hotels", e.target.value)}
                />
              </div>

              <div className="dash-field">
                <label className="dash-label">Included Experiences</label>
                <textarea
                  className="dash-textarea"
                  style={{ minHeight: "7rem" }}
                  placeholder={"Chauffeur-driven private air-conditioned SUV\nDaily organic breakfast\nPrivate spice garden walk\nHouseboat backwaters lunch & cruise"}
                  value={item.content.inclusions.join("\n")}
                  onChange={(e) => updateList("inclusions", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Day-by-Day Itinerary Builder */}
          <div className="dash-editor-card">
            <div className="dash-editor-card-header">
              <h2 className="dash-editor-card-title">4. Day-by-Day Itinerary ({item.content.itinerary.length} Days)</h2>
              <button
                type="button"
                className="dash-btn-secondary"
                onClick={() =>
                  setItem({
                    ...item,
                    content: {
                      ...item.content,
                      itinerary: [
                        ...item.content.itinerary,
                        { day: item.content.itinerary.length + 1, title: "", description: "" },
                      ],
                    },
                  })
                }
              >
                + Add Next Day
              </button>
            </div>

            <div style={{ display: "grid", gap: "1rem" }}>
              {item.content.itinerary.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "1.25rem",
                    border: "1px solid var(--dash-border)",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    display: "grid",
                    gap: ".75rem",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr auto", gap: ".75rem", alignItems: "center" }}>
                    <div>
                      <label className="dash-label">Day #</label>
                      <input
                        type="number"
                        min="1"
                        className="dash-input"
                        value={step.day}
                        onChange={(e) => updateStop(idx, "day", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="dash-label">Day Title / Route</label>
                      <input
                        required
                        className="dash-input"
                        placeholder="e.g. Scenic climb into Munnar tea highlands"
                        value={step.title}
                        onChange={(e) => updateStop(idx, "title", e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="dash-btn-danger"
                      style={{ padding: ".55rem .75rem", alignSelf: "end" }}
                      onClick={() =>
                        setItem({
                          ...item,
                          content: {
                            ...item.content,
                            itinerary: item.content.itinerary.filter((_, i) => i !== idx),
                          },
                        })
                      }
                      title="Remove Day"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <label className="dash-label">Day Narrative</label>
                    <textarea
                      required
                      className="dash-textarea"
                      style={{ minHeight: "4rem" }}
                      placeholder="Detailed morning activities, stops, waterfalls, and evening recommendations..."
                      value={step.description}
                      onChange={(e) => updateStop(idx, "description", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Seasonal Rates */}
          <div className="dash-editor-card">
            <div className="dash-editor-card-header">
              <h2 className="dash-editor-card-title">5. Seasonal Pricing (Per Person)</h2>
              <button
                type="button"
                className="dash-btn-secondary"
                onClick={() =>
                  setItem({
                    ...item,
                    prices: [
                      ...item.prices,
                      {
                        season_name: "Peak Season",
                        start_date: null,
                        end_date: null,
                        price_per_person: 28000,
                        price_basis: "twin_sharing",
                        gst_note: "GST applicable",
                      },
                    ],
                  })
                }
              >
                + Add Season Band
              </button>
            </div>

            <div style={{ display: "grid", gap: "1rem" }}>
              {item.prices.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "1.25rem",
                    border: "1px solid var(--dash-border)",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1fr 1fr 1.2fr auto",
                    gap: ".75rem",
                    alignItems: "end",
                  }}
                >
                  <div>
                    <label className="dash-label">Season Name</label>
                    <input
                      required
                      className="dash-input"
                      placeholder="e.g. Winter Peak (Oct - Mar)"
                      value={p.season_name}
                      onChange={(e) => updatePrice(idx, "season_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="dash-label">From Date</label>
                    <input
                      type="date"
                      className="dash-input"
                      value={p.start_date ?? ""}
                      onChange={(e) => updatePrice(idx, "start_date", e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="dash-label">To Date</label>
                    <input
                      type="date"
                      className="dash-input"
                      value={p.end_date ?? ""}
                      onChange={(e) => updatePrice(idx, "end_date", e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="dash-label">Rate (₹ / person)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="dash-input"
                      value={p.price_per_person || ""}
                      onChange={(e) => updatePrice(idx, "price_per_person", e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="dash-btn-danger"
                    style={{ padding: ".55rem .75rem" }}
                    onClick={() => setItem({ ...item, prices: item.prices.filter((_, i) => i !== idx) })}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Bottom Action Dock */}
          <div className="dash-sticky-dock">
            <div>
              <span style={{ fontSize: ".82rem", opacity: 0.8, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".05em" }}>
                {item.id ? `Revision v${item.version_number ?? 1}` : "New Draft"}
              </span>
              <div style={{ fontSize: "1rem", fontWeight: 700 }}>
                {item.title || "Untitled Journey"}
              </div>
            </div>

            <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
              <button
                type="button"
                className="dash-btn-secondary"
                onClick={() => {
                  setItem(null);
                  load();
                }}
              >
                Close
              </button>

              <button type="submit" className="dash-btn-secondary" disabled={saving}>
                {saving ? "Saving Draft…" : "💾 Save Draft Revision"}
              </button>

              {isAdmin && item.id && (
                <button
                  type="button"
                  className="dash-btn-primary"
                  style={{ background: "#10b981", borderColor: "#10b981" }}
                  disabled={saving}
                  onClick={() => handleSave(true)}
                >
                  ✓ Approve & Publish Live
                </button>
              )}

              {isAdmin && item.id && (
                <button type="button" className="dash-btn-secondary" disabled={saving} onClick={handleSchedule}>
                  ◷ Schedule Publish
                </button>
              )}

              {isAdmin && item.id && (
                <button
                  type="button"
                  className="dash-btn-danger"
                  style={{ background: "transparent", color: "#f87171", borderColor: "rgba(248, 113, 113, 0.4)" }}
                  onClick={handleRemove}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  }

  // --- CATALOG LIST VIEW ---
  return (
    <div>
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Journeys Studio</h1>
          <p className="dash-page-desc">
            Manage itineraries, seasonal rates, and publishing revisions across South India.
          </p>
        </div>
        <button type="button" className="dash-btn-primary" onClick={() => setItem(blankJourney())}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Journey</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="dash-stats-grid">
        <div className="dash-stat-card">
          <div>
            <div className="dash-stat-label">Total Journeys</div>
            <div className="dash-stat-value">{items.length}</div>
          </div>
          <div className="dash-stat-icon-wrap teal">🌴</div>
        </div>

        <div className="dash-stat-card">
          <div>
            <div className="dash-stat-label">Published Live</div>
            <div className="dash-stat-value" style={{ color: "#059669" }}>
              {publishedCount}
            </div>
          </div>
          <div className="dash-stat-icon-wrap teal">✓</div>
        </div>

        <div className="dash-stat-card">
          <div>
            <div className="dash-stat-label">Draft Revisions</div>
            <div className="dash-stat-value" style={{ color: "#d97706" }}>
              {draftCount}
            </div>
          </div>
          <div className="dash-stat-icon-wrap amber">✏️</div>
        </div>

        <div className="dash-stat-card">
          <div>
            <div className="dash-stat-label">Your Role</div>
            <div className="dash-stat-value" style={{ fontSize: "1.3rem", color: "#4f46e5" }}>
              {isAdmin ? "Admin (Publish)" : "Editor (Draft)"}
            </div>
          </div>
          <div className="dash-stat-icon-wrap indigo">🛡️</div>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            background: message.startsWith("✓") ? "#d1fae5" : "#fee2e2",
            color: message.startsWith("✓") ? "#065f46" : "#991b1b",
            fontWeight: 600,
            marginBottom: "1.5rem",
          }}
        >
          {message}
        </div>
      )}

      {/* Toolbar Search & Tabs */}
      <div className="dash-toolbar">
        <div className="dash-search-wrap">
          <span className="dash-search-icon">🔍</span>
          <input
            type="search"
            className="dash-search-input"
            placeholder="Search journeys by title, slug, or place..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="dash-filter-tabs">
          <button
            className={`dash-tab-btn ${filterTab === "all" ? "active" : ""}`}
            onClick={() => setFilterTab("all")}
          >
            All ({items.length})
          </button>
          <button
            className={`dash-tab-btn ${filterTab === "published" ? "active" : ""}`}
            onClick={() => setFilterTab("published")}
          >
            Published ({publishedCount})
          </button>
          <button
            className={`dash-tab-btn ${filterTab === "draft" ? "active" : ""}`}
            onClick={() => setFilterTab("draft")}
          >
            Drafts ({draftCount})
          </button>
        </div>
      </div>

      {/* Grid of Packages */}
      {filteredJourneys.length > 0 ? (
        <div className="dash-cards-grid">
          {filteredJourneys.map((j) => {
            const minPrice =
              j.prices && j.prices.length > 0
                ? Math.min(...j.prices.map((p) => p.price_per_person))
                : null;

            return (
              <article className="dash-pkg-card" key={j.id}>
                <div className="dash-pkg-card-media">
                  <img
                    src={j.content.image_url}
                    alt={j.title}
                    className="dash-pkg-card-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80";
                    }}
                  />
                  <span className={`dash-badge-status ${j.status === "published" ? "published" : "draft"}`}>
                    {j.status === "published" ? "Live on site" : "Draft"}
                  </span>
                  <span className="dash-badge-version">v{j.version_number ?? 1}</span>
                </div>

                <div className="dash-pkg-card-body">
                  <div className="dash-pkg-meta-row">
                    <span className="dash-pill-dest">📍 {j.content.destination}</span>
                    <span>⏳ {j.content.duration_days} Days</span>
                  </div>

                  <h2 className="dash-pkg-card-title">{j.title}</h2>
                  <p className="dash-pkg-card-summary">{j.content.summary}</p>

                  <div className="dash-pkg-card-footer">
                    <div className="dash-pkg-price-tag">
                      <small>From Rate</small>
                      <strong>{formatINR(minPrice)}</strong>
                    </div>

                    <div className="dash-card-actions">
                      <button
                        type="button"
                        className="dash-btn-secondary"
                        onClick={() => setItem(j)}
                        title="Edit Itinerary"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="dash-btn-secondary"
                        onClick={() => handleDuplicate(j)}
                        title="Duplicate Journey"
                      >
                        Copy
                      </button>
                      {j.status === "published" && (
                        <Link
                          href={`/packages/${j.slug}`}
                          target="_blank"
                          className="dash-btn-secondary"
                          title="Open live webpage"
                        >
                          ↗
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "#fff",
            border: "1px solid var(--dash-border)",
            borderRadius: "14px",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🗺️</div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 .5rem" }}>No journeys found</h3>
          <p style={{ color: "var(--dash-text-muted)", marginBottom: "1.5rem" }}>
            {search ? "No journeys matched your search criteria." : "Get started by creating your first South India journey."}
          </p>
          <button type="button" className="dash-btn-primary" onClick={() => setItem(blankJourney())}>
            + Create New Journey
          </button>
        </div>
      )}
    </div>
  );
}
