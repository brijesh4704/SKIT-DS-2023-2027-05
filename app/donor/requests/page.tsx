"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Droplets,
  HeartPulse,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DonorChrome from "../components/DonorChrome";
import { API_BASE_URL, authHeaders, clearAuth, getToken } from "../../../lib/api";

type Urgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type RequestItem = {
  id: string;
  bloodGroup: string;
  hospitalName: string;
  city: string;
  unitsRequired: number;
  urgency: Urgency;
  createdAt?: string;
  patientName?: string;
  contactName?: string;
  contactPhone?: string;
  distance: number | null;
  raw: any;
};

const compatibleDonorGroups: Record<string, string[]> = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
};


const relativeTime = (date?: string) => {
  if (!date) return "Recently";

  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export default function DonorRequestsPage() {
  const router = useRouter();

  const [donor, setDonor] = useState<any>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState<"ALL" | Urgency>("ALL");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const pageRef = useRef<HTMLElement | null>(null);

  const loadRequests = async (isRefresh = false) => {
    const token = getToken();

    if (!token) {
      clearAuth();
      window.location.href = "/login";
      return;
    }

    setError("");
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const headers = authHeaders();

      const [profileRes, requestsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/donors/profile`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/api/blood-requests/donor/available`, {
          headers,
          cache: "no-store",
        }),
      ]);

      if (
        [profileRes, requestsRes].some(
          (response) => response.status === 401 || response.status === 403
        )
      ) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      const profileData = await profileRes.json();
      const requestData = await requestsRes.json();

      if (!profileRes.ok) {
        throw new Error(
          profileData.message || "Unable to load your donor profile."
        );
      }

      if (!requestsRes.ok) {
        throw new Error(
          requestData.message || "Unable to load emergency requests."
        );
      }

      const currentDonor = profileData.donor;
      setDonor(currentDonor);

      const rawRequests = Array.isArray(requestData.requests)
        ? requestData.requests
        : [];

      // The backend now returns a donor-specific feed: compatible blood
      // groups, recent OPEN requests, distance/radius filtering and already
      // responded requests are handled server-side. The UI only presents
      // those real matches and never creates demo/fake request data.
      const mapped: RequestItem[] = rawRequests.map((request: any) => {
        const backendDistance = Number(request?.distanceKm);

        return {
          id: String(request._id),
          bloodGroup: request.bloodGroup,
          hospitalName: request.hospitalName || "Hospital",
          city: request.city || "Location unavailable",
          unitsRequired: Number(request.unitsRequired || 0),
          urgency: request.urgency || "MEDIUM",
          createdAt: request.createdAt,
          patientName: request.patientName,
          contactName: request.contactName,
          contactPhone: request.contactPhone,
          distance: Number.isFinite(backendDistance) ? backendDistance : null,
          raw: request,
        };
      });

      const uniqueRequests = Array.from(
        new Map(mapped.map((request) => [request.id, request])).values()
      );

      // Backend already applies compatibility, 7-day cutoff, GPS radius,
      // already-responded filtering, urgency/distance sorting and top-10 limit.
      // Keep that server-defined order here.
      setRequests(uniqueRequests.slice(0, 10));
      setLastSynced(new Date());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load emergency requests."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = page.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      page.style.setProperty("--mx", `${x}%`);
      page.style.setProperty("--my", `${y}%`);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  const filteredRequests = useMemo(() => {
    if (filter === "ALL") return requests;
    return requests.filter((request) => request.urgency === filter);
  }, [filter, requests]);

  const criticalCount = requests.filter(
    (request) => request.urgency === "CRITICAL"
  ).length;

  const highCount = requests.filter(
    (request) => request.urgency === "HIGH"
  ).length;

  const respondToRequest = async (
    request: RequestItem,
    status: "ACCEPTED" | "REJECTED"
  ) => {
    const token = getToken();
    if (!token) return;

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/blood-requests/${request.id}/respond`,
        {
          method: "PATCH",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to submit your response."
        );
      }

      setRequests((current) =>
        current.filter((item) => item.id !== request.id)
      );
      setSelected(null);

      setToast(
        status === "ACCEPTED"
          ? "Request accepted. The requester has been notified."
          : "Request declined successfully."
      );

      window.setTimeout(() => setToast(""), 3500);
    } catch (e) {
      setToast(
        e instanceof Error
          ? e.message
          : "Unable to submit your response."
      );
      window.setTimeout(() => setToast(""), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DonorChrome>
      <main ref={pageRef} className="requests-page">
      <Ambient />

      <div className="requests-shell">
        

        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <Zap size={13} />
              CONNECTED EMERGENCY NETWORK
            </div>

            <h1>
              Help someone
              <span> in time.</span>
            </h1>

            <p>
              Compatible emergency blood requests near your donor
              profile are shown here. Review the hospital, urgency,
              distance and units before responding.
            </p>

            <div className="hero-actions">
              <div className="availability">
                <span className={donor?.isAvailable ? "online" : ""} />
                {donor?.isAvailable
                  ? "You are available for requests"
                  : "You are currently unavailable"}
              </div>

              <button
                className="profile-button"
                onClick={() => router.push("/donor")}
              >
                Donor dashboard
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="hero-live-line">
              <span className="live-wave">
                <i /><i /><i /><i /><i /><i /><i />
              </span>
              <span>Matching compatible donors with active requests</span>
              <b>SECURE</b>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-label visual-label-top">
              <span className="live-dot" />
              LIVE MATCH ENGINE
            </div>

            <div className="scene-3d" aria-hidden="true">
              <div className="scene-glow" />
              <div className="pulse-ring ring-one" />
              <div className="pulse-ring ring-two" />
              <div className="pulse-ring ring-three" />

              <div className="orbit orbit-a" />
              <div className="orbit orbit-b" />
              <div className="orbit orbit-c" />

              <span className="blood-cell cell-a" />
              <span className="blood-cell cell-b" />
              <span className="blood-cell cell-c" />
              <span className="blood-cell cell-d" />

              <div className="heart-orb">
                <div className="orb-shine" />
                <div className="orb-core-ring" />
                <div className="orb-depth" />
                <HeartPulse className="heart-icon" size={62} strokeWidth={1.45} />
                <span className="orb-status">AI MATCH</span>
              </div>
            </div>

            <div className="visual-card card-critical">
              <span className="vc-icon"><TriangleAlert size={14} /></span>
              <div><small>Critical</small><strong>{criticalCount} active</strong></div>
            </div>
            <div className="visual-card card-matches">
              <span className="vc-icon"><ShieldCheck size={14} /></span>
              <div><small>Compatible</small><strong>{requests.length} requests</strong></div>
            </div>
            <div className="visual-card card-network">
              <span className="vc-icon"><Activity size={14} /></span>
              <div><small>Network</small><strong>Connected</strong></div>
            </div>
          </div>
        </section>

        <section className="stats-row">
          <MiniStat
            icon={<Droplets size={18} />}
            label="Your blood group"
            value={donor?.bloodGroup || "—"}
          />
          <MiniStat
            icon={<ShieldCheck size={18} />}
            label="Open matches"
            value={String(requests.length)}
          />
          <MiniStat
            icon={<TriangleAlert size={18} />}
            label="Critical"
            value={String(criticalCount)}
          />
          <MiniStat
            icon={<Zap size={18} />}
            label="High priority"
            value={String(highCount)}
          />
        </section>

        <section className="network-card">
          <div className="network-header">
            <div>
              <div className="section-eyebrow">MATCHED FOR YOU</div>
              <h2>Emergency requests</h2>
              <p>
                Real open requests returned by the BloodLink API and personalized by blood group, urgency and donor proximity.
              </p>
            </div>

            <div className="network-tools">
              <div className="sync-badge">
                <span />
                API connected
                {lastSynced ? ` · ${lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </div>
              <div className="filters">
                {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(
                  (item) => {
                    const count = item === "ALL"
                      ? requests.length
                      : requests.filter((request) => request.urgency === item).length;
                    return (
                      <button
                        key={item}
                        className={filter === item ? "active" : ""}
                        onClick={() => setFilter(item)}
                      >
                        {item === "ALL" ? "All" : item}
                        <b>{count}</b>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              <TriangleAlert size={17} />
              <span>{error}</span>
              <button onClick={() => loadRequests(true)}>Retry</button>
            </div>
          )}

          {loading ? (
            <LoadingRequests />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              hasFilters={filter !== "ALL"}
              onReset={() => setFilter("ALL")}
            />
          ) : (
            <div className="request-grid">
              {filteredRequests.map((request, index) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  index={index}
                  onView={() => setSelected(request)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="trust-row">
          <Trust
            icon={<ShieldCheck size={18} />}
            title="Compatibility checked"
            text="Compatibility is calculated from your registered donor blood group."
          />
          <Trust
            icon={<Navigation size={18} />}
            title="Distance shown"
            text="Distance uses the donor and request coordinates returned by the system."
          />
          <Trust
            icon={<HeartPulse size={18} />}
            title="Human decision"
            text="Review the request details before choosing to respond."
          />
        </section>

        <section className="footer-cta">
          <div>
            <span className="section-eyebrow">WHEN EVERY SECOND MATTERS</span>
            <h2>One donor can change the outcome.</h2>
            <p>Keep your availability current so the network can surface compatible requests when you are ready to help.</p>
          </div>
          <button className="footer-cta-button" onClick={() => router.push("/donor")}>
            Open donor dashboard <ArrowRight size={16} />
          </button>
        </section>

        
      </div>

      {selected && (
        <RequestModal
          request={selected}
          loading={actionLoading}
          onClose={() => !actionLoading && setSelected(null)}
          onAccept={() => respondToRequest(selected, "ACCEPTED")}
          onReject={() => respondToRequest(selected, "REJECTED")}
        />
      )}

      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
        </div>
      )}

      <PageStyles />
    </main>
      </DonorChrome>
  );
}

function RequestCard({
  request,
  index,
  onView,
}: {
  request: RequestItem;
  index: number;
  onView: () => void;
}) {
  return (
    <article
      className={`request-card urgency-${request.urgency.toLowerCase()}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="request-card-top">
        <div className="blood-badge">
          <Droplets size={19} />
          <strong>{request.bloodGroup}</strong>
        </div>

        <UrgencyBadge urgency={request.urgency} />
      </div>

      <div className="request-main">
        <div>
          <span className="request-label">REQUESTING HOSPITAL</span>
          <h3>{request.hospitalName}</h3>
          <span className="request-id">REQUEST · {request.id.slice(-8).toUpperCase()}</span>
        </div>

        <div className="request-details-grid">
          <Detail
            icon={<MapPin size={14} />}
            label="Location"
            value={request.city}
          />
          <Detail
            icon={<Navigation size={14} />}
            label="Distance"
            value={
              request.distance == null
                ? "Unavailable"
                : `${request.distance.toFixed(1)} km`
            }
          />
          <Detail
            icon={<Droplets size={14} />}
            label="Required"
            value={`${request.unitsRequired} unit${
              request.unitsRequired === 1 ? "" : "s"
            }`}
          />
          <Detail
            icon={<Clock3 size={14} />}
            label="Posted"
            value={relativeTime(request.createdAt)}
          />
        </div>
      </div>

      <div className="request-footer">
        <div className="match-label">
          <span />
          Blood group compatible
        </div>

        <button className="view-button" onClick={onView}>
          Review request
          <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}

function RequestModal({
  request,
  loading,
  onClose,
  onAccept,
  onReject,
}: {
  request: RequestItem;
  loading: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-top">
          <div>
            <div className="section-eyebrow">EMERGENCY REQUEST</div>
            <h2>Review before responding</h2>
          </div>

          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-hero">
          <div className="modal-blood">
            <Droplets size={30} />
            <strong>{request.bloodGroup}</strong>
            <span>Blood group</span>
          </div>

          <div>
            <UrgencyBadge urgency={request.urgency} />
            <h3>{request.hospitalName}</h3>
            <p>
              <MapPin size={14} />
              {request.city}
            </p>
          </div>
        </div>

        <div className="modal-grid">
          <Detail
            icon={<Droplets size={15} />}
            label="Blood required"
            value={`${request.unitsRequired} unit${
              request.unitsRequired === 1 ? "" : "s"
            }`}
          />
          <Detail
            icon={<Navigation size={15} />}
            label="Your distance"
            value={
              request.distance == null
                ? "Unavailable"
                : `${request.distance.toFixed(1)} km`
            }
          />
          <Detail
            icon={<Clock3 size={15} />}
            label="Request posted"
            value={relativeTime(request.createdAt)}
          />
          <Detail
            icon={<ShieldCheck size={15} />}
            label="Compatibility"
            value="Compatible"
          />
        </div>

        {request.patientName && (
          <div className="patient-box">
            <span>PATIENT</span>
            <strong>{request.patientName}</strong>
          </div>
        )}

        <div className="modal-note">
          <ShieldCheck size={17} />
          <p>
            By accepting, you are telling the requester that you are willing
            to respond to this blood request. Coordinate the actual donation
            with the requesting hospital or authorized contact.
          </p>
        </div>

        <div className="modal-actions">
          <button
            className="reject-button"
            onClick={onReject}
            disabled={loading}
          >
            <X size={16} />
            Decline
          </button>

          <button
            className="accept-button"
            onClick={onAccept}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="spin" />
                Sending…
              </>
            ) : (
              <>
                <Check size={16} />
                Accept request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="detail">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <span className={`urgency-badge ${urgency.toLowerCase()}`}>
      <i />
      {urgency}
    </span>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="mini-stat">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function FloatingStat({
  className,
  icon,
  label,
  value,
}: {
  className: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={`floating-stat ${className}`}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Trust({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="trust-card">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function LoadingRequests() {
  return (
    <div className="loading-grid">
      {[1, 2, 3].map((item) => (
        <div className="skeleton-card" key={item}>
          <div className="skeleton blood" />
          <div className="skeleton line large" />
          <div className="skeleton line" />
          <div className="skeleton line short" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-orb">
        <HeartPulse size={32} />
      </div>
      <div className="section-eyebrow">NETWORK CLEAR</div>
      <h3>
        {hasFilters
          ? "No requests in this priority"
          : "No compatible emergency requests"}
      </h3>
      <p>
        {hasFilters
          ? "Try another urgency filter to see other compatible requests."
          : "When an open request matches your registered blood group, it will appear here automatically."}
      </p>

      {hasFilters && (
        <button className="reset-button" onClick={onReset}>
          Show all requests
        </button>
      )}
    </div>
  );
}

function Ambient() {
  const particles = Array.from({ length: 18 }, (_, index) => index);

  return (
    <div className="ambient">
      <div className="ambient-a" />
      <div className="ambient-b" />
      <div className="ambient-c" />
      <div className="ambient-grid" />
      <div className="ambient-noise" />
      <div className="particle-field" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle}
            className="particle"
            style={{
              left: `${(particle * 17 + 7) % 96}%`,
              top: `${(particle * 29 + 9) % 88}%`,
              animationDelay: `${-(particle * 0.47)}s`,
              animationDuration: `${6 + (particle % 5)}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PageStyles() {
  return (
    <style jsx global>{`
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      button { font: inherit; }

      .requests-page {
        --mx: 50%; --my: 30%;
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
        color: #24151c;
        background:
          radial-gradient(circle at var(--mx) var(--my), rgba(255,72,126,.12), transparent 25%),
          radial-gradient(circle at 8% 0%, rgba(255,185,207,.48), transparent 30%),
          radial-gradient(circle at 94% 8%, rgba(255,198,216,.48), transparent 32%),
          linear-gradient(135deg,#fffafd 0%,#fff5f8 48%,#fffafd 100%);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .ambient { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
      .ambient-a,.ambient-b,.ambient-c { position:absolute; border-radius:50%; filter:blur(110px); }
      .ambient-a { width:520px;height:520px;left:-220px;top:300px;background:rgba(255,73,132,.17); }
      .ambient-b { width:600px;height:600px;right:-250px;top:70px;background:rgba(250,155,190,.20); }
      .ambient-c { width:480px;height:480px;left:42%;bottom:-270px;background:rgba(255,205,220,.28); }
      .ambient-grid { position:absolute;inset:0;opacity:.13;background-image:linear-gradient(rgba(157,20,65,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(157,20,65,.05) 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(to bottom,black,transparent 92%); }
      .ambient-noise { position:absolute;inset:0;opacity:.025;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
      .particle-field { position:absolute;inset:0; }
      .particle { position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(205,20,72,.23);box-shadow:0 0 14px rgba(205,20,72,.28);animation:particleFloat 8s ease-in-out infinite; }
      @keyframes particleFloat { 0%,100%{transform:translate3d(0,0,0);opacity:.2}50%{transform:translate3d(0,-24px,0);opacity:.65} }

      .requests-shell { width:min(1500px,calc(100% - 56px)); margin:0 auto; position:relative; z-index:1; padding:20px 0 0; }
      .requests-topbar { height:72px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border:1px solid rgba(122,25,58,.08);border-radius:24px;padding:0 14px;background:rgba(255,255,255,.76);backdrop-filter:blur(24px);box-shadow:0 18px 70px rgba(84,17,42,.07); }
      .back-button,.refresh-button { border:0;background:transparent;color:#695c62;display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-weight:650;transition:.2s; }
      .back-button:hover,.refresh-button:hover { color:#b7194d;transform:translateY(-1px); }
      .back-button > span { width:36px;height:36px;display:grid;place-items:center;border:1px solid rgba(119,30,61,.10);border-radius:12px;background:#fff;box-shadow:0 8px 24px rgba(88,18,44,.06); }
      .refresh-button { justify-self:end;padding:10px 14px;border-radius:13px;background:#fff;border:1px solid rgba(119,30,61,.09);box-shadow:0 8px 24px rgba(88,18,44,.05);font-size:12px; }
      .brand { display:flex;align-items:center;gap:11px;justify-self:center; }
      .brand-mark,.footer-logo { width:40px;height:40px;border-radius:13px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#c92554,#8c1036);box-shadow:0 12px 30px rgba(191,25,77,.24); }
      .brand strong,.footer-brand strong { font-size:18px;letter-spacing:-.04em;color:#24151c; }
      .brand strong span,.footer-brand strong span { color:#d22259; }
      .brand small { display:block;margin-top:2px;font-size:8px;letter-spacing:.19em;color:#9c7e88;font-weight:900; }

      .hero { min-height:575px;margin-top:18px;display:grid;grid-template-columns:1.02fr .98fr;align-items:stretch;border:1px solid rgba(121,22,57,.08);border-radius:42px;overflow:hidden;background:linear-gradient(115deg,rgba(255,255,255,.88),rgba(255,247,250,.72));box-shadow:0 34px 120px rgba(93,19,48,.11); }
      .hero-copy { position:relative;z-index:2;padding:82px 30px 65px 72px;display:flex;flex-direction:column;justify-content:center; }
      .eyebrow,.section-eyebrow { display:inline-flex;align-items:center;gap:7px;width:max-content;font-size:9px;letter-spacing:.19em;font-weight:950;color:#bd1e50; }
      .eyebrow { padding:9px 12px;border:1px solid rgba(198,28,77,.13);border-radius:999px;background:rgba(255,255,255,.74);box-shadow:0 8px 25px rgba(115,20,52,.04); }
      .hero h1 { margin:20px 0 20px;max-width:760px;font-size:clamp(56px,6.3vw,94px);line-height:.89;letter-spacing:-.075em;font-weight:850; }
      .hero h1 span { display:block;color:#c62052;font-style:italic;font-weight:780; }
      .hero-copy > p { max-width:610px;margin:0;color:#77676e;font-size:15px;line-height:1.75; }
      .hero-actions { display:flex;align-items:center;gap:12px;margin-top:30px;flex-wrap:wrap; }
      .availability { display:flex;align-items:center;gap:9px;padding:12px 15px;border-radius:14px;border:1px solid rgba(116,29,57,.09);background:rgba(255,255,255,.78);color:#51444a;font-size:11px;font-weight:750;box-shadow:0 12px 30px rgba(85,20,43,.05); }
      .availability > span { width:8px;height:8px;border-radius:50%;background:#b8a9ae;box-shadow:0 0 0 5px rgba(184,169,174,.12); }
      .availability > span.online { background:#24ad76;box-shadow:0 0 0 5px rgba(36,173,118,.12),0 0 14px rgba(36,173,118,.45); }
      .profile-button { display:inline-flex;align-items:center;gap:9px;border:0;cursor:pointer;color:#fff;padding:13px 17px;border-radius:14px;background:linear-gradient(135deg,#c82053,#8e1137);box-shadow:0 15px 35px rgba(177,25,69,.25);font-size:11px;font-weight:850;transition:.2s; }
      .profile-button:hover { transform:translateY(-2px);box-shadow:0 20px 42px rgba(177,25,69,.32); }
      .hero-live-line { display:flex;align-items:center;gap:10px;margin-top:28px;color:#a0848e;font-size:10px;font-weight:700; }
      .hero-live-line b { margin-left:4px;color:#228a65;font-size:8px;letter-spacing:.16em;padding:5px 8px;border-radius:999px;background:#edfbf5;border:1px solid #d1f1e4; }
      .live-wave { display:flex;align-items:center;gap:2px;height:15px; }
      .live-wave i { width:2px;height:7px;border-radius:5px;background:#cf275b;animation:wave 1s ease-in-out infinite; }
      .live-wave i:nth-child(2){height:11px;animation-delay:.1s}.live-wave i:nth-child(3){height:6px;animation-delay:.2s}.live-wave i:nth-child(4){height:14px;animation-delay:.3s}.live-wave i:nth-child(5){height:8px;animation-delay:.4s}.live-wave i:nth-child(6){height:12px;animation-delay:.5s}.live-wave i:nth-child(7){height:6px;animation-delay:.6s}
      @keyframes wave { 50%{transform:scaleY(.45);opacity:.55} }

      .hero-visual { min-height:575px;position:relative;display:grid;place-items:center;overflow:hidden;perspective:1200px;background:radial-gradient(circle at 50% 52%,rgba(255,76,127,.18),transparent 34%),radial-gradient(circle at 65% 50%,rgba(255,197,216,.30),transparent 58%); }
      .hero-visual::before { content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.2),transparent 35%),radial-gradient(circle at 50% 50%,rgba(255,255,255,.75),transparent 47%);pointer-events:none; }
      .scene-3d { width:520px;height:520px;position:relative;transform-style:preserve-3d;animation:sceneFloat 7s ease-in-out infinite; }
      @keyframes sceneFloat { 0%,100%{transform:translateY(3px) rotateX(1deg) rotateY(-2deg)}50%{transform:translateY(-12px) rotateX(-2deg) rotateY(4deg)} }
      .scene-glow { position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle,rgba(237,25,80,.32),rgba(237,25,80,.08) 42%,transparent 70%);filter:blur(22px);transform:translateZ(-50px); }
      .pulse-ring,.orbit { position:absolute;left:50%;top:50%;border:1px solid rgba(212,33,86,.17);border-radius:50%;transform-style:preserve-3d; }
      .pulse-ring { transform:translate(-50%,-50%); }
      .ring-one{width:430px;height:430px;animation:ringPulse 5s ease-in-out infinite}.ring-two{width:350px;height:350px;animation:ringPulse 5s ease-in-out .8s infinite}.ring-three{width:275px;height:275px;animation:ringPulse 5s ease-in-out 1.6s infinite}
      @keyframes ringPulse { 50%{transform:translate(-50%,-50%) scale(1.045);opacity:.42} }
      .orbit { width:455px;height:150px;transform:translate(-50%,-50%) rotateX(66deg) rotateZ(-18deg);border-color:rgba(198,30,79,.19);animation:orbitSpin 10s linear infinite; }
      .orbit-b { width:360px;height:120px;transform:translate(-50%,-50%) rotateX(68deg) rotateZ(45deg);animation-duration:8s;animation-direction:reverse; }
      .orbit-c { width:295px;height:95px;transform:translate(-50%,-50%) rotateY(67deg) rotateZ(10deg);animation-duration:12s; }
      @keyframes orbitSpin { to{transform:translate(-50%,-50%) rotateX(66deg) rotateZ(342deg)} }
      .heart-orb { position:absolute;left:50%;top:50%;width:235px;height:235px;transform:translate(-50%,-50%) translateZ(55px) rotateX(3deg);border-radius:44% 56% 52% 48% / 48% 45% 55% 52%;background:radial-gradient(circle at 28% 21%,#ff8eac 0%,#f63e71 18%,#c71950 47%,#7c0e31 100%);box-shadow:inset 22px 18px 35px rgba(255,255,255,.33),inset -30px -38px 58px rgba(68,0,24,.38),0 45px 90px rgba(170,19,69,.30),0 0 0 1px rgba(255,255,255,.30);transform-style:preserve-3d; }
      .heart-orb::before { content:"";position:absolute;inset:12px;border-radius:inherit;border:1px solid rgba(255,255,255,.19);transform:translateZ(14px); }
      .heart-orb::after { content:"";position:absolute;inset:-15px;border-radius:inherit;border:1px solid rgba(255,255,255,.20);transform:translateZ(-22px);filter:blur(.2px); }
      .orb-shine { position:absolute;width:92px;height:54px;left:34px;top:25px;border-radius:50%;background:rgba(255,255,255,.34);filter:blur(17px);transform:rotate(-24deg) translateZ(25px); }
      .orb-core-ring { position:absolute;inset:31px;border-radius:50%;border:1px solid rgba(255,255,255,.18);transform:translateZ(20px); }
      .orb-depth { position:absolute;inset:42px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.12),transparent 65%);transform:translateZ(28px); }
      .heart-icon { position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) translateZ(35px);color:#fff;filter:drop-shadow(0 8px 20px rgba(77,0,25,.32));animation:heartBeat 2.2s ease-in-out infinite; }
      @keyframes heartBeat { 0%,100%{transform:translate(-50%,-50%) translateZ(35px) scale(1)}12%{transform:translate(-50%,-50%) translateZ(35px) scale(1.06)}20%{transform:translate(-50%,-50%) translateZ(35px) scale(1)} }
      .orb-status { position:absolute;left:50%;bottom:34px;transform:translateX(-50%) translateZ(36px);color:#fff;font-size:8px;letter-spacing:.22em;font-weight:950;white-space:nowrap;opacity:.86; }
      .blood-cell { position:absolute;display:block;width:42px;height:42px;border-radius:50%;background:radial-gradient(circle at 32% 27%,#ff9bb4,#dc2a5c 42%,#8b1036 100%);box-shadow:inset 7px 5px 10px rgba(255,255,255,.27),inset -8px -10px 14px rgba(61,0,25,.34),0 15px 28px rgba(157,17,65,.20);transform-style:preserve-3d; }
      .blood-cell::after { content:"";position:absolute;inset:9px;border-radius:50%;background:rgba(89,0,30,.18);box-shadow:inset 2px 2px 5px rgba(255,255,255,.16); }
      .cell-a{left:18%;top:22%;transform:translateZ(90px) rotateX(35deg);animation:cellA 6s ease-in-out infinite}.cell-b{right:13%;top:31%;width:30px;height:30px;transform:translateZ(130px);animation:cellB 7s ease-in-out infinite}.cell-c{left:21%;bottom:18%;width:25px;height:25px;transform:translateZ(100px);animation:cellC 5.5s ease-in-out infinite}.cell-d{right:21%;bottom:20%;width:48px;height:48px;transform:translateZ(70px);animation:cellD 8s ease-in-out infinite}
      @keyframes cellA{50%{transform:translate3d(18px,-12px,125px) rotateY(35deg)}}@keyframes cellB{50%{transform:translate3d(-18px,15px,155px)}}@keyframes cellC{50%{transform:translate3d(12px,-16px,135px)}}@keyframes cellD{50%{transform:translate3d(-12px,-20px,105px)}}
      .visual-label { position:absolute;z-index:5;display:flex;align-items:center;gap:7px;padding:9px 11px;border-radius:12px;background:rgba(255,255,255,.78);border:1px solid rgba(125,26,61,.09);backdrop-filter:blur(15px);box-shadow:0 14px 35px rgba(87,18,43,.08);font-size:8px;font-weight:950;letter-spacing:.14em;color:#7e6870; }
      .visual-label-top { top:52px;right:58px; }.live-dot{width:6px;height:6px;border-radius:50%;background:#22a976;box-shadow:0 0 0 4px rgba(34,169,118,.10),0 0 12px rgba(34,169,118,.42);}
      .visual-card { position:absolute;z-index:6;display:flex;align-items:center;gap:9px;padding:11px 13px;border-radius:15px;background:rgba(255,255,255,.82);border:1px solid rgba(125,26,61,.09);backdrop-filter:blur(18px);box-shadow:0 18px 42px rgba(89,18,44,.10); }
      .visual-card small { display:block;color:#a18a93;font-size:7px;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }.visual-card strong{display:block;margin-top:3px;font-size:11px;color:#322129}.vc-icon{width:27px;height:27px;border-radius:9px;display:grid;place-items:center;color:#c82155;background:#fff0f5;}
      .card-critical{left:7%;top:21%;}.card-matches{right:5%;top:33%;}.card-network{right:8%;bottom:17%;}

      .stats-row { display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:18px; }
      .mini-stat { display:flex;align-items:center;gap:13px;padding:19px 20px;border-radius:21px;background:rgba(255,255,255,.78);border:1px solid rgba(119,25,58,.08);box-shadow:0 16px 45px rgba(84,18,43,.055);backdrop-filter:blur(15px); }
      .mini-stat > span{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;color:#c52053;background:#fff0f4}.mini-stat small{display:block;color:#9b838c;font-size:8px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.mini-stat strong{display:block;margin-top:4px;font-size:19px;letter-spacing:-.04em;}

      .network-card { margin-top:18px;padding:34px;border-radius:34px;background:rgba(255,255,255,.82);border:1px solid rgba(119,25,58,.08);box-shadow:0 28px 90px rgba(84,18,43,.08);backdrop-filter:blur(20px); }
      .network-header{display:flex;justify-content:space-between;gap:28px;align-items:flex-end}.network-header h2{margin:7px 0 5px;font-size:30px;letter-spacing:-.055em}.network-header p{margin:0;max-width:650px;color:#87747c;font-size:12px;line-height:1.6}.network-tools{display:flex;flex-direction:column;align-items:flex-end;gap:10px}.sync-badge{display:flex;align-items:center;gap:7px;color:#6e6067;font-size:9px;font-weight:800}.sync-badge span{width:6px;height:6px;border-radius:50%;background:#22aa77;box-shadow:0 0 0 4px rgba(34,170,119,.10)}
      .filters{display:flex;gap:5px;padding:4px;border:1px solid rgba(119,25,58,.08);border-radius:13px;background:#fff}.filters button{border:0;background:transparent;padding:8px 10px;border-radius:9px;color:#87767d;font-size:8px;font-weight:850;cursor:pointer}.filters button b{margin-left:5px;color:#b8a7ad}.filters button.active{background:#f9e7ed;color:#b91c4e}.filters button.active b{color:#b91c4e}
      .error-banner{display:flex;align-items:center;gap:10px;margin-top:20px;padding:13px 15px;border-radius:14px;color:#a71b48;background:#fff0f4;border:1px solid #f5ccd9;font-size:11px}.error-banner span{flex:1}.error-banner button{border:0;background:#b91e4e;color:#fff;border-radius:9px;padding:7px 11px;font-weight:800;cursor:pointer}
      .request-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:24px}.request-card{min-height:285px;padding:21px;border-radius:23px;border:1px solid rgba(119,25,58,.08);background:linear-gradient(160deg,#fff,#fff8fa);box-shadow:0 18px 50px rgba(84,18,43,.06);transition:.28s;display:flex;flex-direction:column;animation:cardIn .55s both}.request-card:hover{transform:translateY(-7px);box-shadow:0 28px 65px rgba(84,18,43,.12)}@keyframes cardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      .request-card-top{display:flex;align-items:center;justify-content:space-between}.blood-badge{display:inline-flex;align-items:center;gap:7px;padding:9px 11px;border-radius:12px;color:#c32154;background:#fff0f4;font-size:13px;font-weight:900;box-shadow:0 9px 24px rgba(200,30,80,.08)}.urgency-badge{display:inline-flex;align-items:center;gap:6px;padding:7px 9px;border-radius:999px;background:#f5f1f2;color:#766970;font-size:8px;font-weight:950;letter-spacing:.1em}.urgency-badge i{width:5px;height:5px;border-radius:50%;background:#9e8c92}.urgency-badge.critical{color:#bd164b;background:#fff0f4}.urgency-badge.critical i{background:#df1f5b;box-shadow:0 0 9px rgba(223,31,91,.55)}.urgency-badge.high{color:#a65322;background:#fff5ed}.urgency-badge.high i{background:#e77930}.urgency-badge.medium{color:#98711d;background:#fff9e8}.urgency-badge.medium i{background:#d7aa32}.urgency-badge.low{color:#27735d;background:#edf9f4}.urgency-badge.low i{background:#35a77f}
      .request-main{margin-top:20px}.request-label,.request-id{font-size:7px;font-weight:950;letter-spacing:.15em;color:#a28a93}.request-main h3{margin:7px 0 3px;font-size:18px;letter-spacing:-.04em}.request-id{color:#b8a7ad}.request-details-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.detail{display:flex;align-items:flex-start;gap:8px;padding:10px;border-radius:12px;background:#fcf8fa}.detail>span{width:24px;height:24px;display:grid;place-items:center;border-radius:8px;color:#c51f52;background:#fff}.detail small{display:block;color:#9d8991;font-size:7px;font-weight:850}.detail strong{display:block;margin-top:2px;font-size:10px}.request-footer{margin-top:auto;padding-top:18px;display:flex;align-items:center;justify-content:space-between;gap:8px}.match-label{display:flex;align-items:center;gap:7px;color:#4c826d;font-size:8px;font-weight:850}.match-label span{width:6px;height:6px;border-radius:50%;background:#31a57c;box-shadow:0 0 0 4px rgba(49,165,124,.09)}.view-button{display:inline-flex;align-items:center;gap:7px;border:0;color:#fff;background:#29151d;padding:10px 12px;border-radius:11px;font-size:9px;font-weight:850;cursor:pointer;transition:.2s}.view-button:hover{background:#b81c4e;transform:translateY(-1px)}
      .loading-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:24px}.skeleton-card{height:285px;padding:20px;border-radius:22px;background:#fff;border:1px solid rgba(119,25,58,.06)}.skeleton{background:linear-gradient(90deg,#f8edf1 25%,#fff7f9 45%,#f8edf1 65%);background-size:220% 100%;animation:skeleton 1.5s infinite;border-radius:10px}.skeleton.blood{width:75px;height:34px}.skeleton.line{height:14px;margin-top:22px}.skeleton.line.large{width:76%}.skeleton.line.short{width:45%;margin-top:12px}@keyframes skeleton{to{background-position:-220% 0}}
      .empty-state{margin-top:24px;padding:70px 24px;text-align:center;border:1px dashed rgba(181,31,76,.18);border-radius:25px;background:linear-gradient(145deg,#fff,#fff7fa)}.empty-orb{width:62px;height:62px;margin:0 auto 15px;display:grid;place-items:center;border-radius:20px;color:#c52053;background:#fff0f5;box-shadow:0 15px 35px rgba(197,32,83,.12)}.empty-state h3{margin:8px 0;font-size:22px;letter-spacing:-.04em}.empty-state p{max-width:510px;margin:0 auto;color:#8b777f;font-size:11px;line-height:1.65}.reset-button{margin-top:18px;border:0;padding:10px 14px;border-radius:11px;background:#28151d;color:#fff;font-size:10px;font-weight:850;cursor:pointer}
      .trust-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}.trust-card{display:flex;gap:12px;padding:20px;border:1px solid rgba(119,25,58,.07);border-radius:20px;background:rgba(255,255,255,.70);box-shadow:0 14px 42px rgba(84,18,43,.05)}.trust-card>span{width:36px;height:36px;flex:0 0 auto;display:grid;place-items:center;color:#c52053;border-radius:11px;background:#fff0f4}.trust-card strong{font-size:11px}.trust-card p{margin:5px 0 0;color:#89767e;font-size:9px;line-height:1.55}

      .footer-cta{margin-top:26px;padding:32px 38px;border-radius:30px;display:flex;align-items:center;justify-content:space-between;gap:30px;color:#fff;background:radial-gradient(circle at 10% 10%,rgba(255,84,137,.25),transparent 28%),linear-gradient(120deg,#3b0d1e,#190b12 62%,#360c1e);box-shadow:0 25px 75px rgba(55,8,28,.22);position:relative;overflow:hidden}.footer-cta::after{content:"";position:absolute;width:280px;height:280px;right:-70px;top:-160px;border-radius:50%;border:1px solid rgba(255,255,255,.10);box-shadow:0 0 0 35px rgba(255,255,255,.025),0 0 0 70px rgba(255,255,255,.018)}.footer-cta .section-eyebrow{color:#ff9db9}.footer-cta h2{margin:8px 0 7px;font-size:29px;letter-spacing:-.055em}.footer-cta p{margin:0;max-width:690px;color:rgba(255,255,255,.62);font-size:11px;line-height:1.6}.footer-cta-button{position:relative;z-index:2;display:inline-flex;align-items:center;gap:9px;white-space:nowrap;border:0;padding:13px 16px;border-radius:13px;background:#fff;color:#5b1229;font-size:10px;font-weight:900;cursor:pointer;box-shadow:0 12px 35px rgba(0,0,0,.15)}
      .site-footer{margin-top:0;padding:46px 28px 22px;color:rgba(255,255,255,.66);background:linear-gradient(135deg,#190910,#0e070b 58%,#210914);border-radius:0 0 30px 30px;position:relative;overflow:hidden}.site-footer::before{content:"";position:absolute;left:8%;right:8%;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,87,138,.55),transparent)}.footer-main{display:grid;grid-template-columns:2.1fr 1fr 1fr 1fr;gap:50px}.footer-brand{max-width:380px}.footer-brand>div:first-child{display:flex;align-items:center;gap:11px}.footer-brand strong{color:#fff;font-size:20px}.footer-brand small{display:block;margin-top:3px;font-size:7px;letter-spacing:.16em;color:rgba(255,255,255,.40);font-weight:900}.footer-brand p{margin:18px 0;color:rgba(255,255,255,.46);font-size:10px;line-height:1.75}.footer-status{display:flex;align-items:center;gap:7px;font-size:8px;font-weight:800;color:rgba(255,255,255,.56)}.footer-status span{width:6px;height:6px;border-radius:50%;background:#41bd91;box-shadow:0 0 10px rgba(65,189,145,.55)}.footer-column{display:flex;flex-direction:column;align-items:flex-start;gap:11px}.footer-column>span{margin-bottom:5px;color:#ff91ae;font-size:8px;font-weight:950;letter-spacing:.17em}.footer-column button{border:0;background:transparent;color:rgba(255,255,255,.50);padding:0;font-size:10px;cursor:pointer;transition:.18s}.footer-column button:hover{color:#fff;transform:translateX(2px)}.footer-bottom{display:flex;align-items:center;gap:20px;margin-top:35px;padding-top:17px;border-top:1px solid rgba(255,255,255,.07);font-size:8px;color:rgba(255,255,255,.34)}.footer-bottom>span:first-child{flex:1}.footer-mini{display:inline-flex;align-items:center;gap:5px;color:#5bc29c}

      .modal-backdrop{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;background:rgba(31,7,17,.55);backdrop-filter:blur(15px)}.modal{width:min(620px,100%);max-height:90vh;overflow:auto;padding:26px;border-radius:27px;background:#fffafd;border:1px solid rgba(255,255,255,.65);box-shadow:0 35px 120px rgba(32,4,15,.35)}.modal-top{display:flex;justify-content:space-between;align-items:flex-start}.modal-top h2{margin:6px 0 0;font-size:25px;letter-spacing:-.05em}.close-button{width:34px;height:34px;border:0;border-radius:10px;background:#f8edf1;color:#806d75;display:grid;place-items:center;cursor:pointer}.modal-hero{display:grid;grid-template-columns:100px 1fr;gap:18px;align-items:center;margin-top:23px}.modal-blood{height:100px;border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#c51f52;background:linear-gradient(145deg,#fff0f4,#ffe5ec);box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}.modal-blood strong{font-size:25px;line-height:1}.modal-blood span{margin-top:5px;color:#a68c95;font-size:7px;font-weight:850;letter-spacing:.1em}.modal-hero h3{margin:10px 0 4px;font-size:20px}.modal-hero p{display:flex;align-items:center;gap:5px;margin:0;color:#8b777f;font-size:10px}.modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.patient-box{margin-top:12px;padding:13px 14px;border-radius:13px;background:#faf3f6}.patient-box span{display:block;color:#a18a93;font-size:7px;font-weight:950;letter-spacing:.14em}.patient-box strong{display:block;margin-top:4px;font-size:12px}.modal-note{display:flex;gap:9px;margin-top:16px;padding:13px;border-radius:13px;background:#eef9f4;color:#3f826c}.modal-note p{margin:0;color:#5d746b;font-size:9px;line-height:1.6}.modal-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.reject-button,.accept-button{height:43px;border:0;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;font-size:10px;font-weight:900}.reject-button{background:#f4eaee;color:#8e6571}.accept-button{background:linear-gradient(135deg,#c92054,#8d1036);color:#fff;box-shadow:0 12px 28px rgba(190,26,76,.22)}.reject-button:disabled,.accept-button:disabled{opacity:.55;cursor:not-allowed}
      .toast{position:fixed;right:22px;bottom:22px;z-index:120;display:flex;align-items:center;gap:9px;padding:13px 16px;border-radius:13px;color:#fff;background:#25131b;box-shadow:0 20px 50px rgba(37,19,27,.25);font-size:10px;font-weight:800}.spin{animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}

      @media (max-width:1050px){.hero{grid-template-columns:1fr}.hero-copy{padding:58px 48px 28px}.hero-visual{min-height:510px}.stats-row{grid-template-columns:repeat(2,1fr)}.request-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.footer-main{grid-template-columns:1.7fr 1fr 1fr}.footer-column:last-child{display:none}}
      @media (max-width:700px){.requests-shell{width:min(100% - 20px,1500px);padding-top:10px}.requests-topbar{height:62px;padding:0 9px;border-radius:18px}.back-button{font-size:0}.back-button>span{width:34px;height:34px}.refresh-button{font-size:0;padding:8px}.brand-mark{width:35px;height:35px}.brand strong{font-size:15px}.brand small{display:none}.hero{margin-top:10px;border-radius:27px;min-height:0}.hero-copy{padding:38px 23px 15px}.hero h1{font-size:49px}.hero-copy>p{font-size:12px;line-height:1.65}.hero-live-line{font-size:8px}.hero-live-line b{display:none}.hero-visual{min-height:390px}.scene-3d{width:370px;height:370px}.heart-orb{width:175px;height:175px}.ring-one{width:330px;height:330px}.ring-two{width:270px;height:270px}.ring-three{width:215px;height:215px}.orbit{width:340px;height:110px}.orbit-b{width:285px;height:90px}.orbit-c{width:230px;height:75px}.visual-label-top{top:24px;right:18px}.visual-card{padding:9px}.card-critical{left:3%;top:22%}.card-matches{right:2%;top:34%}.card-network{right:4%;bottom:10%}.blood-cell{transform:scale(.8)}.stats-row{grid-template-columns:1fr 1fr;gap:9px}.mini-stat{padding:13px}.mini-stat>span{width:31px;height:31px}.mini-stat strong{font-size:15px}.network-card{padding:19px;border-radius:24px}.network-header{flex-direction:column;align-items:flex-start}.network-header h2{font-size:25px}.network-tools{align-items:flex-start;width:100%}.filters{width:100%;overflow:auto}.filters button{flex:1;white-space:nowrap}.request-grid{grid-template-columns:1fr}.trust-row{grid-template-columns:1fr}.footer-cta{flex-direction:column;align-items:flex-start;padding:25px 22px;border-radius:23px}.footer-cta h2{font-size:24px}.footer-main{grid-template-columns:1fr 1fr;gap:30px 20px}.footer-brand{grid-column:1/-1}.footer-column:last-child{display:flex}.site-footer{padding:35px 20px 18px;border-radius:0 0 23px 23px}.footer-bottom{flex-wrap:wrap}.footer-bottom>span:first-child{flex-basis:100%}.modal{padding:19px;border-radius:22px}.modal-hero{grid-template-columns:82px 1fr}.modal-blood{height:82px}.modal-grid{grid-template-columns:1fr}.modal-actions{grid-template-columns:1fr}.toast{left:12px;right:12px;bottom:12px}}
      @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;}}
    `}</style>
  );
}
