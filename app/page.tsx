"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Worker Status hook ────────────────────────────────────────────────────────
function useWorkerStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "offline">("loading");

  useEffect(() => {
    fetch("/api/worker/message")
      .then((r) => (r.ok ? setStatus("connected") : setStatus("offline")))
      .catch(() => setStatus("offline"));
  }, []);

  return status;
}

// ─── Opportunity counts hook ───────────────────────────────────────────────────
function useCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Use a demo userId for dashboard display (real auth via Photon in worker)
    fetch("/api/opportunities", {
      headers: { "x-user-id": "dashboard-demo" },
    })
      .then((r) => r.json())
      .then((d) => setCounts(d.countsByType ?? {}))
      .catch(() => {});
  }, []);

  return counts;
}

// ─── Collection Card ──────────────────────────────────────────────────────────
function CollectionCard({
  label,
  count,
  accent,
  href,
  icon,
}: {
  label: string;
  count: number;
  accent: string;
  href: string;
  icon: string;
}) {
  return (
    <Link href={href} className="card group cursor-pointer block no-underline">
      <div className="flex items-start justify-between mb-4">
        <span style={{ fontSize: "1.75rem" }}>{icon}</span>
        <span
          className="badge"
          style={{ background: accent, color: "#111", borderColor: "#111" }}
        >
          {count}
        </span>
      </div>
      <div className="heading" style={{ fontSize: "1.125rem" }}>
        {label}
      </div>
    </Link>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const workerStatus = useWorkerStatus();
  const counts = useCounts();

  const collections = [
    {
      label: "Internships",
      key: "internship",
      accent: "#FFD21F",
      href: "/opportunities?type=internship",
      icon: "💼",
    },
    {
      label: "Open Source",
      key: "open-source",
      accent: "#42D94A",
      href: "/opportunities?type=open-source",
      icon: "🔓",
    },
    {
      label: "Hackathons",
      key: "hackathon",
      accent: "#8062F5",
      href: "/opportunities?type=hackathon",
      icon: "⚡",
    },
    {
      label: "Saved",
      key: "all",
      accent: "#FF4F87",
      href: "/opportunities",
      icon: "🗂",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--yellow)" }}>
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        style={{
          borderBottom: "var(--border)",
          background: "var(--off-white)",
          padding: "0.875rem 0",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.375rem", fontWeight: 800 }}>Scout</span>
            <span className="badge badge-black">BETA</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Worker status */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span
                className={`status-dot ${
                  workerStatus === "connected"
                    ? "status-dot-green pulse"
                    : workerStatus === "offline"
                    ? "status-dot-red"
                    : "status-dot-yellow pulse"
                }`}
              />
              <span className="body-sm" style={{ fontWeight: 600 }}>
                {workerStatus === "connected"
                  ? "iMessage live"
                  : workerStatus === "offline"
                  ? "offline"
                  : "connecting…"}
              </span>
            </div>

            <Link href="/preferences" className="btn btn-black" style={{ padding: "0.4rem 1rem" }}>
              Settings
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="container fade-up" style={{ paddingTop: "4rem", paddingBottom: "2rem" }}>
        <div style={{ maxWidth: "620px" }}>
          <h1 className="display">Find your<br />next thing.</h1>
          <p
            style={{
              marginTop: "1.25rem",
              fontSize: "1.125rem",
              fontWeight: 500,
              maxWidth: "480px",
              lineHeight: 1.6,
            }}
          >
            Scout searches the live web for internships, hackathons, open source
            programs, grants, and bounties — all through iMessage.
          </p>

          {/* iMessage instruction */}
          <div
            className="card-yellow"
            style={{ marginTop: "2rem", display: "inline-block", padding: "1rem 1.25rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div className="subheading">Text Scout on iMessage</div>
              <span className="badge badge-black" style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>
                🤠 HARYANVI TOUCH
              </span>
            </div>
            <code
              style={{
                display: "block",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                fontWeight: 600,
                background: "var(--black)",
                color: "var(--yellow)",
                padding: "0.5rem 0.75rem",
                borderRadius: "2px",
                marginTop: "0.5rem",
              }}
            >
              &quot;Ram Ram bhai! Remote Next.js internship dhoondh de&quot;
            </code>
            <p className="body-sm" style={{ marginTop: "0.75rem", fontWeight: 600 }}>
              Sanitized native iMessage previews with live TinyFish search. Configure persona in{" "}
              <Link href="/preferences" style={{ textDecoration: "underline" }}>
                Settings
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" style={{ margin: "0 1.5rem" }} />

      {/* ── Collections ──────────────────────────────────────────────────── */}
      <section className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        <div className="subheading" style={{ marginBottom: "1.25rem", opacity: 0.7 }}>
          Collections
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {collections.map((col) => (
            <CollectionCard
              key={col.key}
              label={col.label}
              count={col.key === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[col.key] ?? 0)}
              accent={col.accent}
              href={col.href}
              icon={col.icon}
            />
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section
        style={{ background: "var(--black)", color: "var(--yellow)", padding: "3rem 0" }}
      >
        <div className="container">
          <div className="heading" style={{ color: "var(--yellow)", marginBottom: "1.5rem" }}>
            How it works
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {[
              {
                step: "01",
                title: "Text Scout",
                body: "Send a message describing what you're looking for.",
              },
              {
                step: "02",
                title: "Live research",
                body: "Scout searches the web and verifies original pages.",
              },
              {
                step: "03",
                title: "Verified results",
                body: "Get real listings with source links, deadlines, and eligibility.",
              },
              {
                step: "04",
                title: "Save & remind",
                body: "Save opportunities. Scout reminds you before deadlines.",
              },
            ].map((s) => (
              <div key={s.step}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "2rem",
                    opacity: 0.3,
                    lineHeight: 1,
                    marginBottom: "0.5rem",
                  }}
                >
                  {s.step}
                </div>
                <div style={{ fontWeight: 700, marginBottom: "0.375rem" }}>{s.title}</div>
                <div style={{ fontSize: "0.875rem", opacity: 0.7 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "var(--border)",
          background: "var(--off-white)",
          padding: "1.25rem 0",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <span className="body-sm" style={{ fontWeight: 600 }}>
            Scout — TechnicalStudent Bounty Drop 001
          </span>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <span className="badge badge-yellow">Photon Spectrum</span>
            <span className="badge badge-green">TinyFish</span>
            <span className="badge badge-purple">MongoDB Atlas</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
