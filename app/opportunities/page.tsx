"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ISavedOpportunity } from "@/lib/db";

type Opp = ISavedOpportunity & { _id: string };

const TYPE_LABELS: Record<string, string> = {
  internship: "Internship",
  "open-source": "Open Source",
  hackathon: "Hackathon",
  bounty: "Bounty",
  grant: "Grant",
  fellowship: "Fellowship",
  job: "Job",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  internship: "#FFD21F",
  "open-source": "#42D94A",
  hackathon: "#8062F5",
  bounty: "#FF4F87",
  grant: "#42D94A",
  fellowship: "#8062F5",
  job: "#FFD21F",
  other: "#FFFDF7",
};

function BadgeForType({ type }: { type: string }) {
  return (
    <span
      className="badge"
      style={{ background: TYPE_COLORS[type] ?? "#FFFDF7", color: "#111" }}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function OpportunityCard({ opp, onDelete }: { opp: Opp; onDelete: (id: string) => void }) {
  return (
    <div className="card fade-up" style={{ marginBottom: "1rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              marginBottom: "0.375rem",
            }}
          >
            <BadgeForType type={opp.type} />
            {opp.workMode !== "unknown" && (
              <span className="badge badge-ghost">{opp.workMode}</span>
            )}
            {opp.paidStatus !== "unknown" && (
              <span
                className="badge"
                style={{
                  background: opp.paidStatus === "paid" ? "#42D94A" : "transparent",
                  color: "#111",
                }}
              >
                {opp.paidStatus}
              </span>
            )}
          </div>

          <h3
            className="subheading"
            style={{ margin: "0.25rem 0", fontSize: "1.0625rem" }}
          >
            {opp.name}
          </h3>
          <p className="body-sm" style={{ opacity: 0.7, marginBottom: "0.5rem" }}>
            {opp.company}
            {opp.location && ` · ${opp.location}`}
          </p>

          {opp.description && (
            <p
              className="body-sm"
              style={{ marginBottom: "0.625rem", maxWidth: "600px" }}
            >
              {opp.description}
            </p>
          )}

          {opp.eligibility && (
            <p className="body-sm" style={{ opacity: 0.7, marginBottom: "0.5rem" }}>
              <strong>Eligibility:</strong> {opp.eligibility}
            </p>
          )}

          <div
            style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
          >
            {opp.deadline && (
              <span className="body-sm" style={{ fontWeight: 600 }}>
                📅 {opp.deadline}
                {opp.deadlineVerified ? (
                  <span style={{ color: "#42D94A" }}> ✓</span>
                ) : (
                  <span style={{ opacity: 0.5 }}> (unverified)</span>
                )}
              </span>
            )}

            <a
              href={opp.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-black"
              style={{ padding: "0.3rem 0.75rem", fontSize: "0.8125rem" }}
            >
              Apply →
            </a>

            <a
              href={opp.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              style={{ padding: "0.3rem 0.75rem", fontSize: "0.8125rem", opacity: 0.6 }}
            >
              Source
            </a>
          </div>

          <p className="body-sm" style={{ marginTop: "0.5rem", opacity: 0.4 }}>
            Saved {new Date(opp.savedAt).toLocaleDateString()}
          </p>
        </div>

        <button
          className="btn btn-ghost"
          style={{ padding: "0.25rem 0.5rem", opacity: 0.5 }}
          onClick={() => onDelete(opp._id)}
          aria-label="Remove opportunity"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function OpportunitiesContent() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type") ?? "";

  const [opportunities, setOpportunities] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState(typeFilter);

  const load = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const url = `/api/opportunities${type ? `?type=${type}` : ""}`;
      const res = await fetch(url, { headers: { "x-user-id": "dashboard-demo" } });
      const data = await res.json();
      setOpportunities(data.opportunities ?? []);
    } catch {
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(activeType);
  }, [activeType, load]);

  const handleDelete = async (id: string) => {
    await fetch("/api/opportunities", {
      method: "DELETE",
      headers: { "x-user-id": "dashboard-demo", "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setOpportunities((prev) => prev.filter((o) => o._id !== id));
  };

  const types = ["", "internship", "open-source", "hackathon", "bounty", "grant"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--yellow)" }}>
      {/* Nav */}
      <nav
        style={{
          borderBottom: "var(--border)",
          background: "var(--off-white)",
          padding: "0.875rem 0",
        }}
      >
        <div
          className="container"
          style={{ display: "flex", alignItems: "center", gap: "1rem" }}
        >
          <Link href="/" className="btn btn-ghost" style={{ padding: "0.4rem 0" }}>
            ← Scout
          </Link>
          <h1 className="heading" style={{ fontSize: "1.25rem", margin: 0 }}>
            Saved Opportunities
          </h1>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "1.5rem",
          }}
        >
          {types.map((t) => (
            <button
              key={t || "all"}
              className={`tag ${activeType === t ? "tag-active" : ""}`}
              onClick={() => setActiveType(t)}
            >
              {t ? TYPE_LABELS[t] ?? t : "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "3rem 0", opacity: 0.5, fontWeight: 600 }}>
            Loading…
          </div>
        ) : opportunities.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🗂</div>
            <div className="subheading">No saved opportunities yet</div>
            <p className="body-sm" style={{ marginTop: "0.5rem", opacity: 0.6 }}>
              Text Scout on iMessage to find and save opportunities.
            </p>
          </div>
        ) : (
          <div>
            <div className="body-sm" style={{ opacity: 0.6, marginBottom: "1rem", fontWeight: 600 }}>
              {opportunities.length} saved
            </div>
            {opportunities.map((opp) => (
              <OpportunityCard key={opp._id} opp={opp} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading…</div>}>
      <OpportunitiesContent />
    </Suspense>
  );
}
