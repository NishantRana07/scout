"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DEFAULT_PREFS = {
  skills: [] as string[],
  location: "",
  workMode: "any",
  opportunityTypes: [] as string[],
  paidOnly: false,
  experienceLevel: "any",
  interests: [] as string[],
  reminderLeadDays: 2,
  timezone: "UTC",
  persona: "haryanvi" as "haryanvi" | "classic",
};

const OPPORTUNITY_TYPES = [
  "internship", "open-source", "hackathon", "bounty", "grant", "fellowship", "job",
];

const EXPERIENCE_LEVELS = ["any", "beginner", "intermediate", "advanced"];
const WORK_MODES = ["any", "remote", "hybrid", "onsite"];

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photonNumber, setPhotonNumber] = useState("");

  useEffect(() => {
    fetch("/api/preferences", { headers: { "x-user-id": "dashboard-demo" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) setPrefs({ ...DEFAULT_PREFS, ...d.preferences });
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/preferences", {
        method: "PUT",
        headers: {
          "x-user-id": "dashboard-demo",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferences: prefs }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !prefs.skills.includes(s)) {
      setPrefs((p) => ({ ...p, skills: [...p.skills, s] }));
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) =>
    setPrefs((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }));

  const addInterest = () => {
    const s = interestInput.trim();
    if (s && !prefs.interests.includes(s)) {
      setPrefs((p) => ({ ...p, interests: [...p.interests, s] }));
    }
    setInterestInput("");
  };

  const removeInterest = (interest: string) =>
    setPrefs((p) => ({ ...p, interests: p.interests.filter((i) => i !== interest) }));

  const toggleType = (type: string) => {
    setPrefs((p) => ({
      ...p,
      opportunityTypes: p.opportunityTypes.includes(type)
        ? p.opportunityTypes.filter((t) => t !== type)
        : [...p.opportunityTypes, type],
    }));
  };

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
            Settings
          </h1>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        <div style={{ maxWidth: "620px" }}>

          {/* iMessage setup */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="subheading" style={{ marginBottom: "1rem" }}>
              📱 iMessage Setup
            </div>
            <p className="body-sm" style={{ marginBottom: "1rem", opacity: 0.7 }}>
              Scout runs as a persistent iMessage agent via Photon Spectrum. Set your
              credentials in{" "}
              <code style={{ fontWeight: 700 }}>.env</code> and run:
            </p>
            <code
              style={{
                display: "block",
                background: "var(--black)",
                color: "var(--yellow)",
                padding: "0.75rem 1rem",
                borderRadius: "2px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                marginBottom: "0.75rem",
                overflowX: "auto",
              }}
            >
              npx tsx worker/index.ts
            </code>
            <p className="body-sm" style={{ opacity: 0.6 }}>
              The worker connects to Photon Spectrum and handles iMessages persistently.
            </p>

            <div style={{ marginTop: "1rem" }}>
              <label className="body-sm" style={{ fontWeight: 700, display: "block", marginBottom: "0.375rem" }}>
                Photon Number (display only)
              </label>
              <input
                className="input"
                value={photonNumber}
                onChange={(e) => setPhotonNumber(e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>

          {/* Assistant Persona & Tone */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="subheading" style={{ marginBottom: "0.5rem" }}>
              🤠 Assistant Persona & Tone
            </div>
            <p className="body-sm" style={{ marginBottom: "1rem", opacity: 0.7 }}>
              Customize the voice and personality Scout uses when replying to you on iMessage.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div
                onClick={() => setPrefs((p) => ({ ...p, persona: "haryanvi" }))}
                style={{
                  border: "2px solid var(--black)",
                  borderRadius: "4px",
                  padding: "0.875rem",
                  cursor: "pointer",
                  background: prefs.persona === "haryanvi" ? "var(--yellow)" : "var(--white)",
                  boxShadow: prefs.persona === "haryanvi" ? "2px 2px 0 var(--black)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                  <span style={{ fontSize: "1.25rem" }}>🤠</span>
                  <span style={{ fontWeight: 800, fontSize: "0.9375rem" }}>Haryanvi Swag</span>
                  {prefs.persona === "haryanvi" && (
                    <span className="badge badge-black" style={{ marginLeft: "auto", fontSize: "0.65rem", padding: "0.1rem 0.35rem" }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="body-sm" style={{ fontSize: "0.8125rem", margin: 0, opacity: 0.85 }}>
                  &quot;Ram Ram bhai!&quot; Energetic desi brother tone, authentic Haryanvi flavor, and sanitized iMessage bubbles.
                </p>
              </div>

              <div
                onClick={() => setPrefs((p) => ({ ...p, persona: "classic" }))}
                style={{
                  border: "2px solid var(--black)",
                  borderRadius: "4px",
                  padding: "0.875rem",
                  cursor: "pointer",
                  background: prefs.persona === "classic" ? "var(--yellow)" : "var(--white)",
                  boxShadow: prefs.persona === "classic" ? "2px 2px 0 var(--black)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                  <span style={{ fontSize: "1.25rem" }}>👔</span>
                  <span style={{ fontWeight: 800, fontSize: "0.9375rem" }}>Classic Scout</span>
                  {prefs.persona === "classic" && (
                    <span className="badge badge-black" style={{ marginLeft: "auto", fontSize: "0.65rem", padding: "0.1rem 0.35rem" }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="body-sm" style={{ fontSize: "0.8125rem", margin: 0, opacity: 0.85 }}>
                  &quot;Hey there!&quot; Standard polite English opportunity scout with clean sanitized iMessage formatting.
                </p>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="subheading" style={{ marginBottom: "1rem" }}>
              🛠 Skills & Technologies
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input
                className="input"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSkill()}
                placeholder="e.g. TypeScript, Python, React…"
              />
              <button className="btn btn-black" onClick={addSkill}>
                Add
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {prefs.skills.map((s) => (
                <span key={s} className="tag tag-active">
                  {s}{" "}
                  <span
                    style={{ cursor: "pointer", marginLeft: "0.25rem" }}
                    onClick={() => removeSkill(s)}
                  >
                    ✕
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Location & work mode */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="subheading" style={{ marginBottom: "1rem" }}>
              📍 Location Preferences
            </div>
            <label className="body-sm" style={{ fontWeight: 700, display: "block", marginBottom: "0.375rem" }}>
              Location
            </label>
            <input
              className="input"
              value={prefs.location}
              onChange={(e) => setPrefs((p) => ({ ...p, location: e.target.value }))}
              placeholder="e.g. India, Remote, USA"
              style={{ marginBottom: "1rem" }}
            />

            <label className="body-sm" style={{ fontWeight: 700, display: "block", marginBottom: "0.375rem" }}>
              Work Mode
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {WORK_MODES.map((m) => (
                <button
                  key={m}
                  className={`tag ${prefs.workMode === m ? "tag-active" : ""}`}
                  onClick={() => setPrefs((p) => ({ ...p, workMode: m }))}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Opportunity types */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="subheading" style={{ marginBottom: "1rem" }}>
              🎯 Opportunity Types
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {OPPORTUNITY_TYPES.map((t) => (
                <button
                  key={t}
                  className={`tag ${prefs.opportunityTypes.includes(t) ? "tag-active" : ""}`}
                  onClick={() => toggleType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Experience & paid */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="subheading" style={{ marginBottom: "1rem" }}>
              ⚙️ Filters
            </div>

            <label className="body-sm" style={{ fontWeight: 700, display: "block", marginBottom: "0.375rem" }}>
              Experience Level
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {EXPERIENCE_LEVELS.map((l) => (
                <button
                  key={l}
                  className={`tag ${prefs.experienceLevel === l ? "tag-active" : ""}`}
                  onClick={() => setPrefs((p) => ({ ...p, experienceLevel: l }))}
                >
                  {l}
                </button>
              ))}
            </div>

            <label
              style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={prefs.paidOnly}
                onChange={(e) => setPrefs((p) => ({ ...p, paidOnly: e.target.checked }))}
                style={{ width: "1.125rem", height: "1.125rem", cursor: "pointer" }}
              />
              <span className="body-sm" style={{ fontWeight: 600 }}>
                Paid opportunities only
              </span>
            </label>
          </div>

          {/* Interests */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="subheading" style={{ marginBottom: "1rem" }}>
              💡 Interests
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input
                className="input"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInterest()}
                placeholder="e.g. AI, Web3, Climate Tech…"
              />
              <button className="btn btn-black" onClick={addInterest}>
                Add
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {prefs.interests.map((s) => (
                <span key={s} className="tag tag-active">
                  {s}{" "}
                  <span
                    style={{ cursor: "pointer", marginLeft: "0.25rem" }}
                    onClick={() => removeInterest(s)}
                  >
                    ✕
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Reminders */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <div className="subheading" style={{ marginBottom: "1rem" }}>
              ⏰ Reminders
            </div>
            <label className="body-sm" style={{ fontWeight: 700, display: "block", marginBottom: "0.375rem" }}>
              Remind me this many days before each deadline
            </label>
            <input
              type="number"
              className="input"
              value={prefs.reminderLeadDays}
              min={1}
              max={30}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, reminderLeadDays: parseInt(e.target.value) || 2 }))
              }
              style={{ maxWidth: "120px", marginBottom: "1rem" }}
            />

            <label className="body-sm" style={{ fontWeight: 700, display: "block", marginBottom: "0.375rem" }}>
              Timezone
            </label>
            <input
              className="input"
              value={prefs.timezone}
              onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value }))}
              placeholder="UTC, America/New_York, Asia/Kolkata…"
            />
          </div>

          <button
            className="btn btn-black"
            onClick={save}
            disabled={saving}
            style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
          >
            {saving ? "Saving…" : saved ? "✅ Saved!" : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
