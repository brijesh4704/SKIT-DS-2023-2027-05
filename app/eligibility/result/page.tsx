"use client";

import React, { ReactNode, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Activity,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  HeartPulse,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, authHeaders, clearAuth, getToken } from "../../../lib/api";

export default function EligibilityResultPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [assessment, setAssessment] = React.useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      if (!token) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/eligibility/assess`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          cache: "no-store",
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
          clearAuth();
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          throw new Error(data.message || "Unable to load your screening result.");
        }

        setAssessment(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load your screening result.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const screening =
    assessment?.screening ||
    assessment?.result ||
    assessment?.assessment ||
    {};

  const status = assessment?.status || screening?.status || "REVIEW_REQUIRED";

  const eligible =
    assessment?.eligible === true ||
    screening?.eligible === true ||
    status === "ELIGIBLE";

  const medicalReview =
    ["MEDICAL_REVIEW", "PROFESSIONAL_REVIEW_REQUIRED"].includes(status) ||
    ["MEDICAL_REVIEW", "PROFESSIONAL_REVIEW_REQUIRED"].includes(
      screening?.status
    );

  const temporarilyIneligible =
    status === "TEMPORARILY_INELIGIBLE" ||
    screening?.status === "TEMPORARILY_INELIGIBLE";

  const statusInfo = useMemo(() => {
    if (eligible) {
      return {
        label: "Basic screening passed",
        title: "You are eligible",
        description:
          "Your saved questionnaire passed the configured basic donor screening rules. Final donation eligibility must still be confirmed by qualified medical staff.",
        tone: "success" as const,
        icon: CheckCircle2,
      };
    }

    if (temporarilyIneligible) {
      return {
        label: "Temporarily ineligible",
        title: "Donation waiting period",
        description: `Your saved donor assessment currently has a waiting period${
          assessment?.daysRemaining
            ? ` with ${assessment.daysRemaining} day(s) remaining`
            : ""
        }.`,
        tone: "warning" as const,
        icon: Clock3,
      };
    }

    if (medicalReview) {
      return {
        label: "Professional review required",
        title: "Medical review required",
        description:
          "Your saved screening contains factors that should be reviewed by qualified medical staff before donation.",
        tone: "warning" as const,
        icon: Stethoscope,
      };
    }

    return {
      label: "Review required",
      title: "Screening result available",
      description:
        "Your saved screening has been processed. Final donor eligibility still requires professional medical screening.",
      tone: "neutral" as const,
      icon: TriangleAlert,
    };
  }, [assessment, eligible, medicalReview, temporarilyIneligible]);

  const flags = Array.isArray(screening?.flags)
    ? screening.flags
    : Array.isArray(assessment?.flags)
    ? assessment.flags
    : Array.isArray(assessment?.screeningFlags)
    ? assessment.screeningFlags
    : [];

  const medicalDocument =
    assessment?.medicalDocument ||
    screening?.medicalDocument ||
    assessment?.document ||
    screening?.document;

  const summary =
    screening?.summary ||
    assessment?.screeningSummary ||
    assessment?.summary ||
    "Your latest saved donor screening assessment is shown below.";

  const questionsAnswered =
    assessment?.questionsAnswered ||
    screening?.questionsAnswered ||
    null;

  const StatusIcon = statusInfo.icon;

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <main className="bl-page">
        <Ambient />
        <div className="bl-error-wrap">
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bl-error-card"
          >
            <div className="bl-error-icon">
              <TriangleAlert size={34} />
            </div>
            <div className="bl-eyebrow">BLOODLINK AI</div>
            <h1>Result unavailable</h1>
            <p>{error}</p>
            <button
              className="bl-primary-btn"
              onClick={() => router.push("/eligibility")}
            >
              Start assessment <ArrowRight size={17} />
            </button>
          </motion.div>
        </div>
        <PageStyles />
      </main>
    );
  }

  return (
    <main className="bl-page">
      <Ambient />

      <div className="bl-shell">
        {/* TOP BAR */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bl-topbar"
        >
          <button
            className="bl-back"
            onClick={() => router.push("/donor")}
          >
            <span className="bl-back-icon">
              <ArrowLeft size={17} />
            </span>
            <span>Back to dashboard</span>
          </button>

          <div className="bl-brand">
            <span className="bl-brand-mark">
              <HeartPulse size={18} />
            </span>
            <span>
              <b>
                BloodLink <em>AI</em>
              </b>
              <small>Intelligent donor network</small>
            </span>
          </div>

          <div className="bl-saved">
            <span />
            Assessment saved
          </div>
        </motion.header>

        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="bl-hero"
        >
          <div className="bl-hero-glow" />
          <div className="bl-hero-grid" />

          <div className="bl-hero-copy">
            <div className="bl-eyebrow bl-hero-eyebrow">
              <Sparkles size={13} />
              BloodLink AI screening
            </div>

            <h1>
              Screening
              <span> completed.</span>
            </h1>

            <p>{statusInfo.description}</p>

            <div className="bl-hero-status">
              <StatusPill tone={statusInfo.tone} icon={<StatusIcon size={15} />}>
                {statusInfo.label}
              </StatusPill>
              <span>Your latest saved assessment</span>
            </div>

            <div className="bl-stats">
              <StatCard
                icon={<ShieldCheck size={17} />}
                label="Current status"
                value={formatStatus(status)}
              />
              <StatCard
                icon={<Activity size={17} />}
                label="Assessment"
                value={eligible ? "Passed" : medicalReview ? "Review" : "Processed"}
              />
              <StatCard
                icon={<CheckCircle2 size={17} />}
                label="Questions"
                value={questionsAnswered != null ? `${questionsAnswered} answered` : "Saved"}
              />
            </div>
          </div>

          <div className="bl-visual">
            <EligibilityOrb tone={statusInfo.tone} />
          </div>
        </motion.section>

        {/* CONTENT */}
        <div className="bl-content-grid">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bl-main-card"
          >
            <div className="bl-card-glow" />

            <SectionHeading
              icon={<ShieldCheck size={20} />}
              eyebrow="Assessment summary"
              title={statusInfo.title}
            />

            <p className="bl-summary">{summary}</p>

            <div className="bl-info-grid">
              <InfoCard
                icon={<CheckCircle2 size={18} />}
                title="Screening status"
                value={statusInfo.label}
                positive={eligible}
              />
              <InfoCard
                icon={<Activity size={18} />}
                title="Assessment state"
                value="Saved to your donor profile"
              />
            </div>

            {flags.length > 0 ? (
              <div className="bl-factors">
                <div className="bl-factor-head">
                  <h3>Screening factors</h3>
                  <span>{flags.length} item{flags.length > 1 ? "s" : ""}</span>
                </div>

                <div className="bl-factor-grid">
                  {flags.map((flag: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 + index * 0.04 }}
                      className="bl-factor"
                    >
                      <div className="bl-factor-icon">
                        <TriangleAlert size={14} />
                      </div>
                      <div>
                        <strong>
                          {flag.title ||
                            flag.label ||
                            flag.code ||
                            `Factor ${index + 1}`}
                        </strong>
                        {(flag.message || flag.description) && (
                          <p>{flag.message || flag.description}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bl-clean">
                <span>
                  <Check size={17} />
                </span>
                <div>
                  <b>No screening flags reported</b>
                  <p>
                    Your saved assessment did not expose additional screening factors.
                  </p>
                </div>
              </div>
            )}
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bl-side"
          >
            <section className="bl-side-card">
              <SectionHeading
                icon={<FileCheck2 size={20} />}
                eyebrow="Medical document"
                title={medicalDocument ? "Received" : "Not available"}
              />

              {medicalDocument ? (
                <div className="bl-document">
                  <div className="bl-document-icon">
                    <FileCheck2 size={18} />
                  </div>
                  <div>
                    <b>{medicalDocument.name || "Medical document"}</b>
                    <p>Document linked to your screening.</p>
                  </div>
                </div>
              ) : (
                <div className="bl-unavailable">
                  The saved assessment does not currently expose medical-document details.
                </div>
              )}
            </section>

            <section className="bl-safety">
              <div className="bl-safety-icon">
                <LockKeyhole size={18} />
              </div>
              <div>
                <div>Clinical safeguard</div>
                <p>
                  BloodLink AI provides screening assistance. A qualified medical
                  professional must make the final donation eligibility decision.
                </p>
              </div>
            </section>
          </motion.aside>
        </div>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bl-cta"
        >
          <div className="bl-cta-light" />
          <div className="bl-cta-copy">
            <span className="bl-cta-icon">
              <CalendarDays size={19} />
            </span>
            <div>
              <b>Want to update your screening?</b>
              <p>You can start a fresh assessment anytime.</p>
            </div>
          </div>

          <div className="bl-cta-actions">
            <button
              className="bl-secondary-btn"
              onClick={() => router.push("/donor")}
            >
              Back to dashboard
            </button>

            <button
              className="bl-primary-btn"
              onClick={() => router.push("/eligibility")}
            >
              Start new assessment
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.section>

        <footer className="bl-footer">
          BLOODLINK AI · INTELLIGENT DONOR SCREENING PLATFORM
        </footer>
      </div>

      <PageStyles />
    </main>
  );
}

function EligibilityOrb({ tone }: { tone: string }) {
  const positive = tone === "success";

  return (
    <div className="bl-orb">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="bl-orbit bl-orbit-one"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 21, repeat: Infinity, ease: "linear" }}
        className="bl-orbit bl-orbit-two"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        className="bl-orbit bl-orbit-three"
      />

      <div className="bl-orb-halo" />

      <motion.div
        animate={{
          y: [-8, 8, -8],
          rotateX: [0, 4, 0],
          rotateY: [0, -5, 0],
        }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="bl-core"
      >
        <div className="bl-core-shine" />
        <div className="bl-core-shadow" />

        <motion.div
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(255,255,255,.16)",
              "0 0 0 20px rgba(255,255,255,0)",
              "0 0 0 0 rgba(255,255,255,0)",
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="bl-core-icon"
        >
          {positive ? (
            <CheckCircle2 size={61} strokeWidth={1.55} />
          ) : tone === "warning" ? (
            <Stethoscope size={53} strokeWidth={1.5} />
          ) : (
            <TriangleAlert size={53} strokeWidth={1.5} />
          )}
        </motion.div>
      </motion.div>

      <FloatCard
        className="bl-float-ai"
        icon={<ShieldCheck size={15} />}
        title="AI screening"
        value="Verified"
      />
      <FloatCard
        className="bl-float-confidence"
        icon={<Sparkles size={15} />}
        title="Confidence"
        value="Live"
      />
      <FloatCard
        className="bl-float-network"
        icon={<MapPin size={15} />}
        title="Network"
        value="Connected"
      />
      <FloatCard
        className="bl-float-profile"
        icon={<HeartPulse size={15} />}
        title="Donor profile"
        value="Synced"
      />

      <div className="bl-orb-floor" />
    </div>
  );
}

function FloatCard({
  className,
  icon,
  title,
  value,
}: {
  className: string;
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <motion.div
      animate={{ y: [-5, 5, -5] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      className={`bl-float-card ${className}`}
    >
      <span>{icon}</span>
      <div>
        <small>{title}</small>
        <b>{value}</b>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bl-stat">
      <div className="bl-stat-top">
        <span>{icon}</span>
        <small>{label}</small>
      </div>
      <b>{value}</b>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
  positive,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="bl-info-card">
      <span className={positive ? "positive" : ""}>{icon}</span>
      <div>
        <small>{title}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="bl-section-heading">
      <span>{icon}</span>
      <div>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function StatusPill({
  tone,
  icon,
  children,
}: {
  tone: "success" | "warning" | "neutral";
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`bl-pill bl-pill-${tone}`}>
      {icon}
      {children}
    </div>
  );
}

function Ambient() {
  return (
    <div className="bl-ambient">
      <div className="bl-ambient-a" />
      <div className="bl-ambient-b" />
      <div className="bl-ambient-c" />
      <div className="bl-grid" />
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="bl-page">
      <Ambient />
      <div className="bl-loading">
        <div className="bl-loading-card">
          <div className="bl-loading-orb">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            />
            <HeartPulse size={27} />
          </div>
          <h1>Loading your screening result</h1>
          <p>Fetching your latest saved assessment…</p>
        </div>
      </div>
      <PageStyles />
    </main>
  );
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function PageStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      .bl-page {
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 12% 15%, rgba(255, 192, 210, 0.45), transparent 28%),
          radial-gradient(circle at 91% 13%, rgba(255, 176, 201, 0.38), transparent 29%),
          linear-gradient(135deg, #fff9fb 0%, #fff1f5 48%, #fff9fb 100%);
        color: #26171e;
        direction: ltr;
        text-align: left;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
      }

      .bl-shell {
        position: relative;
        z-index: 2;
        width: min(1460px, calc(100% - 48px));
        margin: 0 auto;
        padding: 24px 0 42px;
      }

      .bl-ambient {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
      }

      .bl-ambient-a,
      .bl-ambient-b,
      .bl-ambient-c {
        position: absolute;
        border-radius: 999px;
        filter: blur(110px);
      }

      .bl-ambient-a {
        width: 540px;
        height: 540px;
        left: -180px;
        top: 120px;
        background: rgba(255, 156, 184, 0.32);
      }

      .bl-ambient-b {
        width: 600px;
        height: 600px;
        right: -180px;
        top: -120px;
        background: rgba(250, 180, 202, 0.34);
      }

      .bl-ambient-c {
        width: 450px;
        height: 450px;
        left: 38%;
        bottom: -260px;
        background: rgba(255, 207, 221, 0.42);
      }

      .bl-grid {
        position: absolute;
        inset: 0;
        opacity: 0.18;
        background-image:
          linear-gradient(rgba(176, 38, 82, 0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(176, 38, 82, 0.055) 1px, transparent 1px);
        background-size: 72px 72px;
        mask-image: linear-gradient(to bottom, black, transparent 90%);
      }

      .bl-topbar {
        height: 68px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 14px;
        border: 1px solid rgba(255, 255, 255, 0.94);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 18px 55px rgba(105, 25, 55, 0.08);
        backdrop-filter: blur(22px);
      }

      .bl-back {
        border: 0;
        background: transparent;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #687488;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
      }

      .bl-back:hover {
        color: #c91447;
      }

      .bl-back-icon {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        border: 1px solid #f5dce4;
        background: #fff;
        box-shadow: 0 5px 16px rgba(90, 20, 45, 0.06);
      }

      .bl-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .bl-brand-mark {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        color: white;
        border-radius: 12px;
        background: linear-gradient(135deg, #ff5b84, #c60b43);
        box-shadow: 0 9px 25px rgba(209, 18, 73, 0.24);
      }

      .bl-brand b {
        display: block;
        font-size: 14px;
        letter-spacing: -0.02em;
      }

      .bl-brand em {
        color: #d9164c;
        font-style: normal;
      }

      .bl-brand small {
        display: block;
        margin-top: 2px;
        color: #9aa1af;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.19em;
        text-transform: uppercase;
      }

      .bl-saved {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 13px;
        border: 1px solid #bce8d5;
        border-radius: 999px;
        background: rgba(239, 253, 246, 0.9);
        color: #078557;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }

      .bl-saved span {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #12ad70;
        box-shadow: 0 0 10px rgba(18, 173, 112, 0.65);
      }

      .bl-hero {
        position: relative;
        min-height: 570px;
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(470px, 0.95fr);
        align-items: stretch;
        margin-top: 18px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.94);
        border-radius: 38px;
        background: rgba(255, 255, 255, 0.76);
        box-shadow: 0 35px 110px rgba(126, 27, 62, 0.12);
        backdrop-filter: blur(24px);
      }

      .bl-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 78% 46%, rgba(255, 77, 123, 0.19), transparent 29%),
          radial-gradient(circle at 18% 8%, rgba(255, 214, 225, 0.6), transparent 28%);
      }

      .bl-hero::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        height: 4px;
        background: linear-gradient(90deg, #c90c43, #ff4e7b, #ffabc0);
      }

      .bl-hero-grid {
        position: absolute;
        right: 0;
        top: 0;
        width: 52%;
        height: 100%;
        opacity: 0.28;
        background-image:
          linear-gradient(rgba(207, 27, 77, 0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(207, 27, 77, 0.055) 1px, transparent 1px);
        background-size: 54px 54px;
        mask-image: linear-gradient(to left, black, transparent);
      }

      .bl-hero-copy {
        grid-column: 1;
        grid-row: 1;
        position: relative;
        z-index: 3;
        padding: 62px 36px 62px 68px;
      }

      .bl-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: #d9164c;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      .bl-hero-eyebrow {
        padding: 9px 13px;
        border: 1px solid #f7d9e2;
        border-radius: 999px;
        background: #fff5f8;
      }

      .bl-hero h1 {
        max-width: 700px;
        margin: 24px 0 0;
        font-size: clamp(56px, 6vw, 82px);
        line-height: 0.91;
        letter-spacing: -0.065em;
        font-weight: 950;
      }

      .bl-hero h1 span {
        color: #d5164d;
        background: linear-gradient(100deg, #b90b43, #e91c58 55%, #ff7295);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .bl-hero-copy > p {
        max-width: 660px;
        margin: 25px 0 0;
        color: #687b99;
        font-size: 15px;
        line-height: 1.9;
      }

      .bl-hero-status {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }

      .bl-hero-status > span {
        color: #9ba4b4;
        font-size: 12px;
        font-weight: 700;
      }

      .bl-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 9px 13px;
        border-radius: 999px;
        border: 1px solid;
        font-size: 11px;
        font-weight: 900;
        box-shadow: 0 7px 18px rgba(50, 20, 30, 0.05);
      }

      .bl-pill-success {
        color: #078557;
        border-color: #bfead6;
        background: #effbf5;
      }

      .bl-pill-warning {
        color: #a76a06;
        border-color: #f4dda9;
        background: #fff9e9;
      }

      .bl-pill-neutral {
        color: #647083;
        border-color: #dce2e9;
        background: #f8fafc;
      }

      .bl-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        max-width: 610px;
        margin-top: 30px;
      }

      .bl-stat {
        padding: 14px;
        border: 1px solid rgba(255, 255, 255, 0.95);
        border-radius: 17px;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 9px 26px rgba(79, 25, 47, 0.06);
        backdrop-filter: blur(12px);
      }

      .bl-stat-top {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .bl-stat-top span {
        color: #d9164c;
      }

      .bl-stat-top small {
        color: #a1a8b5;
        font-size: 8px;
        font-weight: 950;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }

      .bl-stat > b {
        display: block;
        margin-top: 9px;
        overflow: hidden;
        color: #394354;
        font-size: 14px;
        font-weight: 950;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .bl-visual {
        grid-column: 2;
        grid-row: 1;
        position: relative;
        z-index: 2;
        min-height: 570px;
        display: grid;
        place-items: center;
        align-self: stretch;
        overflow: visible;
      }

      .bl-orb {
        position: relative;
        width: 450px;
        height: 450px;
      }

      .bl-orbit {
        position: absolute;
        border-radius: 50%;
        border: 1px solid;
      }

      .bl-orbit-one {
        inset: 18px;
        border-color: rgba(228, 41, 93, 0.24);
        border-style: dashed;
      }

      .bl-orbit-two {
        inset: 61px;
        border-color: rgba(238, 80, 124, 0.22);
      }

      .bl-orbit-three {
        inset: 102px;
        border-color: rgba(222, 34, 89, 0.18);
        border-style: dotted;
      }

      .bl-orb-halo {
        position: absolute;
        inset: 72px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 67, 114, 0.25), transparent 67%);
        filter: blur(15px);
      }

      .bl-core {
        position: absolute;
        inset: 112px;
        overflow: hidden;
        border-radius: 40%;
        transform-style: preserve-3d;
        background: linear-gradient(145deg, #ff7a9b 0%, #e71c59 48%, #a8073e 100%);
        box-shadow:
          inset -30px -30px 65px rgba(96, 0, 37, 0.25),
          inset 18px 18px 45px rgba(255, 255, 255, 0.34),
          0 36px 90px rgba(213, 20, 76, 0.26);
      }

      .bl-core::before {
        content: "";
        position: absolute;
        inset: 20px;
        border-radius: 34%;
        border: 1px solid rgba(255, 255, 255, 0.27);
      }

      .bl-core-shine {
        position: absolute;
        left: 11%;
        top: 8%;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.38);
        filter: blur(25px);
      }

      .bl-core-shadow {
        position: absolute;
        right: 6%;
        bottom: 6%;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: rgba(105, 0, 43, 0.24);
        filter: blur(26px);
      }

      .bl-core-icon {
        position: absolute;
        inset: 0;
        z-index: 3;
        margin: auto;
        width: 132px;
        height: 132px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.36);
        border-radius: 38px;
        color: white;
        background: rgba(255, 255, 255, 0.10);
        backdrop-filter: blur(8px);
      }

      .bl-float-card {
        position: absolute;
        z-index: 5;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 13px;
        min-width: 142px;
        border: 1px solid rgba(255, 255, 255, 0.92);
        border-radius: 17px;
        background: rgba(255, 255, 255, 0.86);
        box-shadow: 0 18px 45px rgba(112, 24, 57, 0.11);
        backdrop-filter: blur(18px);
      }

      .bl-float-card > span {
        width: 33px;
        height: 33px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 11px;
        color: #d9164c;
        background: #fff0f4;
      }

      .bl-float-card small,
      .bl-float-card b {
        display: block;
      }

      .bl-float-card small {
        color: #a0a7b4;
        font-size: 8px;
        font-weight: 950;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .bl-float-card b {
        margin-top: 2px;
        color: #424b5b;
        font-size: 11px;
        font-weight: 950;
      }

      .bl-float-ai {
        left: 4px;
        top: 104px;
      }

      .bl-float-confidence {
        right: 12px;
        top: 35px;
      }

      .bl-float-network {
        left: 33px;
        bottom: 104px;
      }

      .bl-float-profile {
        right: -1px;
        bottom: 62px;
      }

      .bl-orb-floor {
        position: absolute;
        left: 50%;
        bottom: 22px;
        width: 260px;
        height: 42px;
        transform: translateX(-50%);
        border-radius: 50%;
        background: rgba(238, 64, 111, 0.22);
        filter: blur(22px);
      }

      .bl-content-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.38fr) minmax(340px, 0.62fr);
        gap: 18px;
        margin-top: 18px;
      }

      .bl-main-card,
      .bl-side-card,
      .bl-cta {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.94);
        background: rgba(255, 255, 255, 0.77);
        box-shadow: 0 25px 80px rgba(105, 25, 55, 0.08);
        backdrop-filter: blur(20px);
      }

      .bl-main-card {
        padding: 32px;
        border-radius: 31px;
      }

      .bl-card-glow {
        position: absolute;
        width: 260px;
        height: 260px;
        right: -100px;
        top: -120px;
        border-radius: 50%;
        background: rgba(255, 173, 199, 0.38);
        filter: blur(45px);
      }

      .bl-section-heading {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .bl-section-heading > span {
        width: 45px;
        height: 45px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border: 1px solid #f6dce5;
        border-radius: 14px;
        color: #d9164c;
        background: #fff3f7;
      }

      .bl-section-heading small {
        display: block;
        color: #a0a8b7;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

      .bl-section-heading h2 {
        margin: 4px 0 0;
        color: #344054;
        font-size: 21px;
        font-weight: 950;
        letter-spacing: -0.025em;
      }

      .bl-summary {
        position: relative;
        z-index: 1;
        margin: 22px 0 0;
        color: #73829c;
        font-size: 14px;
        line-height: 1.8;
      }

      .bl-info-grid {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 11px;
        margin-top: 20px;
      }

      .bl-info-card {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 14px;
        border: 1px solid #f5dfe6;
        border-radius: 17px;
        background: rgba(255, 250, 252, 0.82);
      }

      .bl-info-card > span {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 12px;
        color: #d9164c;
        background: #fff0f4;
      }

      .bl-info-card > span.positive {
        color: #08a36b;
        background: #ecfbf4;
      }

      .bl-info-card small,
      .bl-info-card b {
        display: block;
      }

      .bl-info-card small {
        color: #9ba4b4;
        font-size: 8px;
        font-weight: 950;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }

      .bl-info-card b {
        margin-top: 4px;
        color: #435066;
        font-size: 13px;
        font-weight: 950;
      }

      .bl-factors {
        position: relative;
        z-index: 1;
        margin-top: 25px;
      }

      .bl-factor-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      .bl-factor-head h3 {
        margin: 0;
        color: #3d4758;
        font-size: 13px;
        font-weight: 950;
      }

      .bl-factor-head span {
        padding: 5px 9px;
        border-radius: 999px;
        color: #d9164c;
        background: #fff0f4;
        font-size: 9px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .bl-factor-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .bl-factor {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 13px;
        border: 1px solid #f5dfe6;
        border-radius: 16px;
        background: #fff9fb;
      }

      .bl-factor-icon {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 10px;
        color: #d9164c;
        background: #fff0f4;
      }

      .bl-factor strong {
        color: #485467;
        font-size: 12px;
      }

      .bl-factor p {
        margin: 4px 0 0;
        color: #9aa3b1;
        font-size: 11px;
        line-height: 1.5;
      }

      .bl-clean {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 11px;
        margin-top: 20px;
        padding: 14px;
        border: 1px solid #cfeee0;
        border-radius: 17px;
        background: rgba(240, 253, 247, 0.76);
      }

      .bl-clean > span {
        width: 37px;
        height: 37px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        color: #079e68;
        background: white;
        box-shadow: 0 4px 12px rgba(10, 120, 80, 0.07);
      }

      .bl-clean b,
      .bl-clean p {
        display: block;
      }

      .bl-clean b {
        color: #455164;
        font-size: 13px;
      }

      .bl-clean p {
        margin: 3px 0 0;
        color: #9aa7a5;
        font-size: 10px;
      }

      .bl-side {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .bl-side-card {
        padding: 28px;
        border-radius: 31px;
      }

      .bl-document {
        display: flex;
        align-items: center;
        gap: 11px;
        margin-top: 22px;
        padding: 14px;
        border: 1px solid #f4dfe7;
        border-radius: 17px;
        background: #fff9fb;
      }

      .bl-document-icon {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        color: #d9164c;
        background: #fff0f4;
      }

      .bl-document b {
        color: #455164;
        font-size: 12px;
      }

      .bl-document p {
        margin: 3px 0 0;
        color: #9ba5b3;
        font-size: 10px;
      }

      .bl-unavailable {
        margin-top: 22px;
        padding: 14px;
        border: 1px solid #edf0f4;
        border-radius: 17px;
        background: rgba(248, 250, 252, 0.85);
        color: #8995a8;
        font-size: 12px;
        line-height: 1.65;
      }

      .bl-safety {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 20px;
        border: 1px solid #f2e2b5;
        border-radius: 27px;
        background: linear-gradient(135deg, #fffaf0, #fff);
        box-shadow: 0 20px 60px rgba(120, 90, 30, 0.06);
      }

      .bl-safety-icon {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 13px;
        color: #b47809;
        background: #fff0c8;
      }

      .bl-safety > div:last-child > div {
        color: #aa7308;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .bl-safety p {
        margin: 7px 0 0;
        color: #7d8390;
        font-size: 11px;
        line-height: 1.7;
      }

      .bl-cta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-top: 18px;
        padding: 20px 24px;
        border-radius: 28px;
      }

      .bl-cta-light {
        position: absolute;
        right: -50px;
        top: -80px;
        width: 300px;
        height: 250px;
        border-radius: 50%;
        background: rgba(255, 115, 151, 0.12);
        filter: blur(35px);
      }

      .bl-cta-copy {
        position: relative;
        display: flex;
        align-items: center;
        gap: 11px;
      }

      .bl-cta-icon {
        width: 43px;
        height: 43px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        color: #d9164c;
        background: #fff0f4;
      }

      .bl-cta-copy b,
      .bl-cta-copy p {
        display: block;
      }

      .bl-cta-copy b {
        color: #465163;
        font-size: 13px;
      }

      .bl-cta-copy p {
        margin: 3px 0 0;
        color: #9aa4b3;
        font-size: 10px;
      }

      .bl-cta-actions {
        position: relative;
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .bl-secondary-btn,
      .bl-primary-btn {
        min-height: 43px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 14px;
        padding: 0 17px;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .bl-secondary-btn {
        border: 1px solid #e5e8ed;
        color: #667084;
        background: #fff;
        box-shadow: 0 5px 15px rgba(60, 20, 40, 0.05);
      }

      .bl-primary-btn {
        border: 0;
        color: #fff;
        background: linear-gradient(100deg, #d9164c, #ee4a76);
        box-shadow: 0 13px 32px rgba(217, 22, 76, 0.23);
      }

      .bl-secondary-btn:hover,
      .bl-primary-btn:hover {
        transform: translateY(-2px);
      }

      .bl-primary-btn:hover {
        box-shadow: 0 18px 42px rgba(217, 22, 76, 0.30);
      }

      .bl-footer {
        padding: 26px 0 8px;
        text-align: center;
        color: #c0c5cf;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.24em;
      }

      .bl-loading,
      .bl-error-wrap {
        position: relative;
        z-index: 2;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 30px;
      }

      .bl-loading-card,
      .bl-error-card {
        width: min(520px, 100%);
        padding: 45px;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.94);
        border-radius: 32px;
        background: rgba(255, 255, 255, 0.78);
        box-shadow: 0 35px 110px rgba(105, 25, 55, 0.12);
        backdrop-filter: blur(22px);
      }

      .bl-loading-orb {
        position: relative;
        width: 76px;
        height: 76px;
        display: grid;
        place-items: center;
        margin: 0 auto;
        color: #d9164c;
        border-radius: 24px;
        background: #fff0f4;
      }

      .bl-loading-orb > div {
        position: absolute;
        inset: -3px;
        border: 2px solid transparent;
        border-right-color: #f7a2b9;
        border-top-color: #d9164c;
        border-radius: 50%;
      }

      .bl-loading-card h1,
      .bl-error-card h1 {
        margin: 22px 0 0;
        color: #344054;
        font-size: 25px;
        font-weight: 950;
        letter-spacing: -0.03em;
      }

      .bl-loading-card p,
      .bl-error-card p {
        margin: 8px 0 0;
        color: #8c97a9;
        font-size: 13px;
        line-height: 1.7;
      }

      .bl-error-icon {
        width: 76px;
        height: 76px;
        display: grid;
        place-items: center;
        margin: 0 auto;
        color: #d9164c;
        border-radius: 24px;
        background: #fff0f4;
      }

      .bl-error-card .bl-eyebrow {
        justify-content: center;
        margin-top: 18px;
      }

      .bl-error-card .bl-primary-btn {
        margin-top: 22px;
      }

      /* Explicit desktop layout guard: copy LEFT, 3D visual RIGHT. */
      @media (min-width: 1101px) {
        .bl-hero {
          direction: ltr !important;
          grid-template-areas: "copy visual";
        }
        .bl-hero-copy {
          grid-area: copy;
          direction: ltr;
          text-align: left;
        }
        .bl-visual {
          grid-area: visual;
          direction: ltr;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      @media (max-width: 1100px) {
        .bl-shell {
          width: min(100% - 28px, 980px);
        }

        .bl-hero {
          grid-template-columns: 1fr;
          grid-template-areas: "copy" "visual";
        }

        .bl-hero-copy {
          grid-column: 1;
          grid-row: 1;
        }

        .bl-visual {
          grid-column: 1;
          grid-row: 2;
        }

        .bl-hero-copy {
          padding: 50px;
        }

        .bl-visual {
          min-height: 470px;
          margin-top: -15px;
        }

        .bl-content-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 720px) {
        .bl-shell {
          width: calc(100% - 18px);
          padding-top: 9px;
        }

        .bl-topbar {
          height: 60px;
          padding: 0 9px;
        }

        .bl-back > span:last-child,
        .bl-brand > span:last-child {
          display: none;
        }

        .bl-saved {
          padding: 8px 10px;
          font-size: 8px;
        }

        .bl-hero {
          min-height: auto;
          border-radius: 28px;
        }

        .bl-hero-copy {
          padding: 42px 24px 26px;
        }

        .bl-hero h1 {
          font-size: 53px;
        }

        .bl-hero-copy > p {
          font-size: 13px;
        }

        .bl-stats {
          grid-template-columns: 1fr;
        }

        .bl-visual {
          min-height: 390px;
          overflow: hidden;
        }

        .bl-orb {
          transform: scale(0.72);
          margin: -30px 0;
        }

        .bl-main-card,
        .bl-side-card {
          padding: 22px;
          border-radius: 25px;
        }

        .bl-info-grid,
        .bl-factor-grid {
          grid-template-columns: 1fr;
        }

        .bl-cta {
          align-items: stretch;
          flex-direction: column;
          padding: 18px;
        }

        .bl-cta-actions {
          width: 100%;
          flex-direction: column;
        }

        .bl-secondary-btn,
        .bl-primary-btn {
          width: 100%;
        }

        .bl-footer {
          font-size: 7px;
        }
      }
    `}</style>
  );
}
