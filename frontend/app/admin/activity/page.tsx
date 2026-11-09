"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type Activity = { id: number; action: string; entity_type: string; entity_id: string; actor: string; created_at: string; details: Record<string, unknown> };

export default function ActivityPage() {
  const [entries, setEntries] = useState<Activity[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`${API}/api/v1/admin/activity`, { headers: { Authorization: `Bearer ${sessionStorage.getItem("tour-cmf-token")}` } })
      .then(async (response) => { if (!response.ok) throw new Error("Unable to load activity."); return response.json(); })
      .then(setEntries).catch((reason) => setError(reason.message));
  }, []);
  return <div>
    <div className="dash-page-header"><div><h1 className="dash-page-title">Activity Log</h1><p className="dash-page-desc">A chronological record of package and enquiry actions.</p></div></div>
    {error && <p style={{ color: "#be123c" }}>{error}</p>}
    <div className="dash-editor-card" style={{ padding: 0, overflow: "hidden" }}>
      {entries.length === 0 ? <p style={{ padding: "1.5rem" }}>No recorded activity yet.</p> : entries.map((entry) => <div key={entry.id} style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div><strong>{entry.action.replaceAll(".", " ")}</strong><div style={{ color: "#64748b", fontSize: ".85rem" }}>{entry.entity_type} #{entry.entity_id} · {entry.actor}</div></div>
        <time style={{ color: "#64748b", fontSize: ".8rem", whiteSpace: "nowrap" }}>{new Date(entry.created_at).toLocaleString()}</time>
      </div>)}
    </div>
  </div>;
}
