"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./dashboard.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string; email?: string } | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("tour-cmf-token");
    if (!token) {
      window.location.assign("/login");
      return;
    }
    const raw = sessionStorage.getItem("tour-cmf-user");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.role !== "admin") {
          const destinations: Record<string, string> = { editor: "/editor", consultant: "/consultant" };
          window.location.assign(destinations[parsed.role] ?? "/login");
          return;
        }
        setUser(parsed);
      } catch {
        setUser({ name: "Staff Member", role: "staff" });
      }
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("tour-cmf-token");
    sessionStorage.removeItem("tour-cmf-user");
    window.location.assign("/login");
  };

  const isPackages = pathname === "/admin";
  const isEnquiries = pathname.startsWith("/admin/enquiries");
  const isActivity = pathname.startsWith("/admin/activity");
  const isBlog = pathname.startsWith("/admin/blog");
  const isQuotes = pathname.startsWith("/admin/quotes");

  return (
    <div className="dash-shell">
      {/* Modern Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <Link href="/admin" className="dash-logo-wrap">
            <div className="dash-logo-icon">T</div>
            <div>
              <div className="dash-brand-title">Tour CMF</div>
              <div className="dash-brand-subtitle">Staff Studio</div>
            </div>
          </Link>
          <span className="dash-env-pill">Live Dev</span>
        </div>

        <nav className="dash-nav">
          <div className="dash-nav-section-title">Operations</div>

          <Link href="/admin" className={`dash-nav-link ${isPackages ? "active" : ""}`}>
            <div className="dash-nav-link-content">
              <span className="dash-nav-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </span>
              <span>Journeys & CMS</span>
            </div>
            <span className="dash-badge-count">CMS</span>
          </Link>

          <Link href="/admin/enquiries" className={`dash-nav-link ${isEnquiries ? "active" : ""}`}>
            <div className="dash-nav-link-content">
              <span className="dash-nav-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </span>
              <span>Enquiries & AI CRM</span>
            </div>
            <span className="dash-badge-count accent">AI</span>
          </Link>

          <Link href="/admin/activity" className={`dash-nav-link ${isActivity ? "active" : ""}`}>
            <div className="dash-nav-link-content"><span className="dash-nav-icon">◷</span><span>Activity Log</span></div>
          </Link>
          <Link href="/admin/blog" className={`dash-nav-link ${isBlog ? "active" : ""}`}>
            <div className="dash-nav-link-content"><span className="dash-nav-icon">✦</span><span>Blog CMS</span></div>
          </Link>
          <Link href="/admin/quotes" className={`dash-nav-link ${isQuotes ? "active" : ""}`}>
            <div className="dash-nav-link-content"><span className="dash-nav-icon">₹</span><span>Quote Builder</span></div>
          </Link>

          <div className="dash-nav-section-title" style={{ marginTop: "1rem" }}>
            Storefront
          </div>

          <Link href="/" target="_blank" className="dash-nav-link">
            <div className="dash-nav-link-content">
              <span className="dash-nav-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </span>
              <span>View Public Website</span>
            </div>
            <span style={{ fontSize: ".75rem", opacity: 0.6 }}>↗</span>
          </Link>
        </nav>

        {/* User Card & Sign Out */}
        <div className="dash-sidebar-footer">
          <div className="dash-user-card">
            <div className="dash-user-meta">
              <div className="dash-avatar">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "ST"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="dash-user-name">{user?.name || "Staff Member"}</div>
                <div className="dash-user-role">{user?.role || "Staff"}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="dash-logout-btn"
              title="Sign out of workspace"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="dash-main">
        <header className="dash-topbar">
          <div className="dash-breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{isPackages ? "Journeys CMS" : isActivity ? "Activity Log" : "Traveller Enquiries & AI"}</strong>
          </div>
          <div className="dash-topbar-actions">
            <span
              style={{
                fontSize: ".75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: ".25rem .65rem",
                borderRadius: "999px",
                background: user?.role === "admin" ? "#d1fae5" : user?.role === "editor" ? "#fef3c7" : "#e0e7ff",
                color: user?.role === "admin" ? "#065f46" : user?.role === "editor" ? "#92400e" : "#3730a3",
              }}
            >
              Role: {user?.role || "Staff"}
            </span>
            <Link
              href={isPackages ? "/admin/enquiries" : "/admin"}
              className="dash-btn-secondary"
              style={{ fontSize: ".78rem", padding: ".4rem .75rem" }}
            >
              {isPackages ? "Go to Enquiries CRM →" : "Go to Packages CMS →"}
            </Link>
          </div>
        </header>

        <main className="dash-content">{children}</main>
      </div>
    </div>
  );
}
