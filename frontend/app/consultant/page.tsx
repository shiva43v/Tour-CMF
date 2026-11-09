"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type Journey = { slug: string; title: string; destination: string; duration_days: number; summary: string; from_price: number | null };

export default function ConsultantJourneys() {
  const [items, setItems] = useState<Journey[]>([]);
  useEffect(() => { fetch(`${API}/api/v1/packages`).then((r) => r.json()).then(setItems).catch(() => setItems([])); }, []);
  return <div>
    <div className="dash-page-header"><div><h1 className="dash-page-title">Live Journey Catalogue</h1><p className="dash-page-desc">Published journeys for consultation, enquiries, and quotes.</p></div></div>
    <div className="dash-editor-card" style={{ marginBottom: "1rem", background: "#eff6ff", borderColor: "#bfdbfe" }}><strong>Read-only access</strong><p style={{ margin: ".35rem 0 0" }}>Consultants can view published journeys only. Creating, editing, publishing, scheduling, and deleting journeys are restricted to Admin and Editor users.</p></div>
    <div className="dash-editor-card">{items.map((item) => <article key={item.slug} style={{ padding: "1rem 0", borderBottom: "1px solid #e2e8f0" }}><strong>{item.title}</strong><div style={{ color: "#64748b", fontSize: ".9rem" }}>{item.destination} · {item.duration_days} days · {item.summary}</div></article>)}{items.length === 0 && <p>No published journeys available.</p>}</div>
  </div>;
}
