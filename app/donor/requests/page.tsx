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
    <main ref={pageRef} className="requests-page">
      <Ambient />

      <div className="requests-shell">
        <header className="requests-topbar">
          <button
            className="back-button"
            onClick={() => router.push("/donor")}
          >
            <span>
              <ArrowLeft size={17} />
            </span>
            Back to dashboard
          </button>

          <div className="brand">
            <div className="brand-mark">
              <HeartPulse size={18} />
            </div>
            <div>
              <strong>
                BloodLink<span>AI</span>
              </strong>
              <small>EMERGENCY DONOR NETWORK</small>
            </div>
          </div>

          <button
            className="refresh-button"
            onClick={() => loadRequests(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "spin" : ""}
            />
            Refresh
          </button>
        </header>

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
            <div className="pulse-ring ring-one" />
            <div className="pulse-ring ring-two" />
            <div className="pulse-ring ring-three" />

            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />
            <div className="heart-orb">
              <div className="orb-shine" />
              <div className="orb-core-ring" />
              <HeartPulse className="heart-icon" size={60} strokeWidth={1.45} />
              <span className="orb-status">AI MATCH</span>
            </div>

            <FloatingStat
              className="float-critical"
              label="Critical"
              value={String(criticalCount)}
              icon={<TriangleAlert size={14} />}
            />
            <FloatingStat
              className="float-matches"
              label="Compatible"
              value={String(requests.length)}
              icon={<ShieldCheck size={14} />}
            />
            <FloatingStat
              className="float-network"
              label="API status"
              value="Connected"
              icon={<Activity size={14} />}
            />
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

        <footer>
          BLOODLINK AI · INTELLIGENT DONOR EMERGENCY NETWORK
        </footer>
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
      * {
        box-sizing: border-box;
      }

      .requests-page {
        --mx: 50%;
        --my: 30%;
        min-height: 100vh;
        overflow-x: hidden;
        position: relative;
        color: #27171e;
        direction: ltr;
        background:
          radial-gradient(circle at var(--mx) var(--my), rgba(255, 87, 137, .11), transparent 22%),
          radial-gradient(circle at 10% 0%, rgba(255, 188, 208, .42), transparent 29%),
          radial-gradient(circle at 93% 8%, rgba(255, 181, 204, .42), transparent 31%),
          linear-gradient(135deg, #fffafd 0%, #fff2f6 52%, #fffafd 100%);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
      }

      .ambient {
        position: fixed;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .ambient-a,
      .ambient-b,
      .ambient-c {
        position: absolute;
        border-radius: 50%;
        filter: blur(105px);
      }

      .ambient-a {
        width: 480px;
        height: 480px;
        left: -180px;
        top: 250px;
        background: rgba(255, 122, 161, .18);
      }

      .ambient-b {
        width: 550px;
        height: 550px;
        right: -190px;
        top: 90px;
        background: rgba(247, 161, 190, .20);
      }

      .ambient-c {
        width: 430px;
        height: 430px;
        left: 40%;
        bottom: -240px;
        background: rgba(255, 199, 218, .32);
      }

      .ambient-grid {
        position: absolute;
        inset: 0;
        opacity: .15;
        background-image:
          linear-gradient(rgba(190, 25, 75, .055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(190, 25, 75, .055) 1px, transparent 1px);
        background-size: 72px 72px;
        mask-image: linear-gradient(to bottom, black, transparent 92%);
      }

      .ambient-noise {
        position: absolute;
        inset: 0;
        opacity: .035;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.65'/%3E%3C/svg%3E");
        pointer-events: none;
      }

      .particle-field {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }

      .particle {
        position: absolute;
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: rgba(215, 22, 76, .26);
        box-shadow: 0 0 12px rgba(215, 22, 76, .28);
        animation: particleFloat 8s ease-in-out infinite;
      }

      @keyframes particleFloat {
        0%, 100% { opacity: .15; transform: translate3d(0, 12px, 0) scale(.8); }
        50% { opacity: .75; transform: translate3d(12px, -18px, 0) scale(1.35); }
      }

      .requests-shell {
        position: relative;
        z-index: 2;
        width: min(1420px, calc(100% - 46px));
        margin: 0 auto;
        padding: 22px 0 45px;
      }

      .requests-topbar {
        position: relative;
        overflow: hidden;
        height: 66px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        padding: 0 12px;
        border: 1px solid rgba(255,255,255,.95);
        border-radius: 21px;
        background: rgba(255,255,255,.73);
        box-shadow: 0 18px 60px rgba(105, 25, 55, .07);
        backdrop-filter: blur(22px);
      }

      .requests-topbar::after {
        content: "";
        position: absolute;
        top: 0;
        left: -35%;
        width: 25%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent);
        animation: topbarShine 5.5s ease-in-out infinite;
      }

      @keyframes topbarShine {
        0%, 65% { transform: translateX(0); opacity: 0; }
        72% { opacity: 1; }
        90%, 100% { transform: translateX(560%); opacity: 0; }
      }

      .back-button,
      .refresh-button {
        border: 0;
        background: transparent;
        color: #69758a;
        font-weight: 850;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 9px;
        cursor: pointer;
      }

      .back-button {
        justify-self: start;
      }

      .back-button span {
        width: 37px;
        height: 37px;
        display: grid;
        place-items: center;
        border: 1px solid #f2dce4;
        border-radius: 12px;
        background: white;
      }

      .back-button:hover,
      .refresh-button:hover {
        color: #c91447;
      }

      .refresh-button {
        justify-self: end;
        padding: 9px 12px;
        border: 1px solid #f0dce4;
        border-radius: 12px;
        background: rgba(255,255,255,.75);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .brand-mark {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        color: #fff;
        border-radius: 12px;
        background: linear-gradient(135deg,#ff5b85,#c70c45);
        box-shadow: 0 10px 26px rgba(202,18,72,.22);
      }

      .brand strong {
        display: block;
        color: #2b1c22;
        font-size: 14px;
        letter-spacing: -.02em;
      }

      .brand strong span {
        color: #d9164c;
      }

      .brand small {
        display: block;
        margin-top: 2px;
        color: #a0a7b3;
        font-size: 7px;
        font-weight: 950;
        letter-spacing: .18em;
      }

      .hero {
        min-height: 470px;
        isolation: isolate;
        display: grid;
        grid-template-columns: 1.08fr .92fr;
        align-items: center;
        position: relative;
        overflow: hidden;
        margin-top: 18px;
        border: 1px solid rgba(255,255,255,.95);
        border-radius: 36px;
        background: rgba(255,255,255,.73);
        box-shadow: 0 32px 105px rgba(105,25,55,.10);
        backdrop-filter: blur(24px);
      }

      .hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 80% 50%, rgba(255,77,123,.19), transparent 28%),
          radial-gradient(circle at 18% 15%, rgba(255,207,222,.48), transparent 30%);
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: -40%;
        z-index: 0;
        background: conic-gradient(from 90deg at 50% 50%, transparent 0deg, rgba(255, 92, 137, .08) 70deg, transparent 140deg, rgba(214, 22, 76, .06) 230deg, transparent 310deg);
        animation: heroSweep 18s linear infinite;
        pointer-events: none;
      }

      @keyframes heroSweep {
        to { transform: rotate(360deg); }
      }

      .hero-copy {
        position: relative;
        z-index: 3;
        padding: 55px 25px 55px 65px;
      }

      .eyebrow,
      .section-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: #d5164d;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: .20em;
        text-transform: uppercase;
      }

      .eyebrow {
        padding: 9px 13px;
        border: 1px solid #f4d7e0;
        border-radius: 999px;
        background: #fff5f8;
      }

      .hero h1 {
        max-width: 680px;
        margin: 22px 0 0;
        font-size: clamp(54px, 6vw, 82px);
        line-height: .92;
        letter-spacing: -.065em;
        font-weight: 950;
      }

      .hero h1 span {
        display: block;
        background: linear-gradient(100deg,#b90b43,#e71b57 55%,#ff7397);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .hero-copy > p {
        max-width: 650px;
        margin: 23px 0 0;
        color: #70809b;
        font-size: 14px;
        line-height: 1.85;
      }

      .hero-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 24px;
      }

      .availability {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 13px;
        border: 1px solid #e9e4e8;
        border-radius: 999px;
        color: #7b8492;
        background: rgba(255,255,255,.82);
        font-size: 10px;
        font-weight: 850;
      }

      .availability > span {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #a8adb6;
      }

      .availability > span.online {
        background: #12ad70;
        box-shadow: 0 0 10px rgba(18,173,112,.6);
      }

      .profile-button,
      .view-button,
      .accept-button,
      .reset-button {
        border: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        font-weight: 900;
      }

      .profile-button {
        min-height: 39px;
        padding: 0 14px;
        border-radius: 12px;
        color: #fff;
        background: linear-gradient(100deg,#d9164c,#ef4d78);
        box-shadow: 0 10px 25px rgba(217,22,76,.20);
      }

      .hero-live-line {
        display: flex;
        align-items: center;
        gap: 9px;
        width: fit-content;
        margin-top: 18px;
        padding: 7px 10px;
        border: 1px solid rgba(231, 205, 215, .9);
        border-radius: 999px;
        color: #9b7482;
        background: rgba(255,255,255,.58);
        font-size: 8px;
        font-weight: 850;
        box-shadow: 0 8px 25px rgba(116, 25, 58, .045);
      }

      .hero-live-line b {
        padding: 3px 6px;
        border-radius: 999px;
        color: #11845e;
        background: #eafaf3;
        font-size: 6px;
        letter-spacing: .12em;
      }

      .live-wave {
        display: flex;
        align-items: center;
        gap: 2px;
        height: 13px;
      }

      .live-wave i {
        width: 2px;
        height: 6px;
        border-radius: 999px;
        background: #d9164c;
        animation: wave 1.1s ease-in-out infinite;
      }

      .live-wave i:nth-child(2) { animation-delay: -.9s; }
      .live-wave i:nth-child(3) { animation-delay: -.72s; }
      .live-wave i:nth-child(4) { animation-delay: -.55s; }
      .live-wave i:nth-child(5) { animation-delay: -.38s; }
      .live-wave i:nth-child(6) { animation-delay: -.2s; }
      .live-wave i:nth-child(7) { animation-delay: -.05s; }

      @keyframes wave {
        0%,100% { height: 5px; opacity: .45; }
        50% { height: 13px; opacity: 1; }
      }

      .hero-visual {
        position: relative;
        z-index: 3;
        min-height: 470px;
        display: grid;
        place-items: center;
      }

      .orbit {
        position: absolute;
        border-radius: 50%;
        border: 1px dashed rgba(214,22,76,.18);
        pointer-events: none;
      }

      .orbit-a {
        width: 270px;
        height: 270px;
        animation: orbitSpin 14s linear infinite;
      }

      .orbit-b {
        width: 335px;
        height: 335px;
        border-style: solid;
        border-color: rgba(214,22,76,.08);
        animation: orbitSpinReverse 19s linear infinite;
      }

      .orbit-a::after, .orbit-b::after {
        content: "";
        position: absolute;
        top: 50%;
        left: -4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #e51c58;
        box-shadow: 0 0 15px rgba(229,28,88,.6);
      }

      .orbit-b::after {
        top: 18%;
        left: auto;
        right: 6px;
      }

      @keyframes orbitSpin { to { transform: rotate(360deg); } }
      @keyframes orbitSpinReverse { to { transform: rotate(-360deg); } }

      .pulse-ring {
        position: absolute;
        width: 390px;
        height: 390px;
        border: 1px solid rgba(223,44,94,.19);
        border-radius: 50%;
      }

      .ring-one {
        animation: ring 8s linear infinite;
      }

      .ring-two {
        width: 300px;
        height: 300px;
        border-color: rgba(235,81,125,.20);
        animation: ringReverse 6s linear infinite;
      }

      .ring-three {
        width: 220px;
        height: 220px;
        border-style: dashed;
        border-color: rgba(214,22,76,.18);
        animation: ring 10s linear infinite;
      }

      @keyframes ring {
        to { transform: rotate(360deg); }
      }

      @keyframes ringReverse {
        to { transform: rotate(-360deg); }
      }

      .heart-orb {
        position: relative;
        z-index: 3;
        width: 205px;
        height: 205px;
        display: grid;
        place-items: center;
        color: #fff;
        border-radius: 39%;
        background: linear-gradient(145deg,#ff7899 0%,#e31b58 48%,#a7083e 100%);
        box-shadow:
          inset 18px 18px 40px rgba(255,255,255,.28),
          inset -25px -25px 50px rgba(93,0,38,.26),
          0 35px 85px rgba(211,19,75,.26);
        animation: float 5s ease-in-out infinite;
      }

      .heart-orb::before {
        content: "";
        position: absolute;
        inset: 18px;
        border: 1px solid rgba(255,255,255,.28);
        border-radius: 32%;
      }

      .orb-shine {
        position: absolute;
        left: 16%;
        top: 10%;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(255,255,255,.36);
        filter: blur(18px);
      }

      .orb-core-ring {
        position: absolute;
        width: 138px;
        height: 138px;
        border: 1px solid rgba(255,255,255,.22);
        border-radius: 50%;
        animation: corePulse 2.2s ease-in-out infinite;
      }

      .heart-icon {
        animation: heartbeat 1.8s ease-in-out infinite;
        filter: drop-shadow(0 0 13px rgba(255,255,255,.3));
      }

      .orb-status {
        position: absolute;
        bottom: 22px;
        padding: 4px 7px;
        border: 1px solid rgba(255,255,255,.2);
        border-radius: 999px;
        color: rgba(255,255,255,.82);
        background: rgba(102,0,36,.18);
        font-size: 6px;
        font-weight: 950;
        letter-spacing: .18em;
        backdrop-filter: blur(8px);
      }

      @keyframes heartbeat {
        0%, 100% { transform: scale(1); }
        12% { transform: scale(1.08); }
        22% { transform: scale(.96); }
        34% { transform: scale(1.05); }
        50% { transform: scale(1); }
      }

      @keyframes corePulse {
        0%,100% { transform: scale(.94); opacity: .55; }
        50% { transform: scale(1.04); opacity: .95; }
      }

      @keyframes float {
        0%,100% { transform: translateY(-7px) rotateX(0deg) rotateY(0deg); }
        50% { transform: translateY(8px) rotateX(4deg) rotateY(-4deg); }
      }

      .floating-stat {
        position: absolute;
        z-index: 5;
        min-width: 130px;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 10px 12px;
        border: 1px solid rgba(255,255,255,.94);
        border-radius: 16px;
        background: rgba(255,255,255,.88);
        box-shadow: 0 16px 42px rgba(105,25,55,.10);
        backdrop-filter: blur(16px);
        animation: cardFloat 4s ease-in-out infinite;
      }

      .floating-stat > span {
        width: 31px;
        height: 31px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        color: #d9164c;
        background: #fff0f4;
      }

      .floating-stat small,
      .floating-stat strong {
        display: block;
      }

      .floating-stat small {
        color: #a0a7b3;
        font-size: 7px;
        font-weight: 950;
        letter-spacing: .11em;
        text-transform: uppercase;
      }

      .floating-stat strong {
        margin-top: 2px;
        color: #485263;
        font-size: 11px;
      }

      .float-critical {
        left: 6%;
        top: 19%;
      }

      .float-matches {
        right: 4%;
        top: 24%;
        animation-delay: -.8s;
      }

      .float-network {
        right: 7%;
        bottom: 18%;
        animation-delay: -1.6s;
      }

      @keyframes cardFloat {
        0%,100% { transform: translateY(-4px); }
        50% { transform: translateY(5px); }
      }

      .stats-row {
        display: grid;
        grid-template-columns: repeat(4,1fr);
        gap: 12px;
        margin-top: 15px;
      }

      .mini-stat {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 15px;
        border: 1px solid rgba(255,255,255,.95);
        border-radius: 19px;
        background: rgba(255,255,255,.72);
        box-shadow: 0 15px 45px rgba(105,25,55,.06);
        backdrop-filter: blur(18px);
      }

      .mini-stat > span {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        color: #d9164c;
        background: #fff0f4;
      }

      .mini-stat small,
      .mini-stat strong {
        display: block;
      }

      .mini-stat small {
        color: #a0a8b6;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .mini-stat strong {
        margin-top: 4px;
        color: #3d4859;
        font-size: 15px;
        font-weight: 950;
      }

      .network-card {
        margin-top: 16px;
        padding: 29px;
        border: 1px solid rgba(255,255,255,.95);
        border-radius: 30px;
        background: rgba(255,255,255,.76);
        box-shadow: 0 25px 85px rgba(105,25,55,.08);
        backdrop-filter: blur(22px);
      }

      .network-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
      }

      .network-header h2 {
        margin: 5px 0 0;
        color: #334052;
        font-size: 25px;
        letter-spacing: -.035em;
        font-weight: 950;
      }

      .network-header p {
        margin: 5px 0 0;
        color: #9aa5b5;
        font-size: 11px;
      }

      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .filters button {
        padding: 8px 10px;
        border: 1px solid #eadfe4;
        border-radius: 999px;
        color: #818b9a;
        background: rgba(255,255,255,.8);
        font-size: 9px;
        font-weight: 900;
        cursor: pointer;
      }

      .filters button.active {
        border-color: #f0b8ca;
        color: #c91447;
        background: #fff0f5;
        box-shadow: 0 6px 18px rgba(213,20,76,.08);
      }

      .network-tools {
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
      }

      .sync-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 31px;
        padding: 0 10px;
        border: 1px solid #e7e2e5;
        border-radius: 999px;
        color: #778292;
        background: rgba(255,255,255,.82);
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .04em;
      }

      .sync-badge > span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #12ad70;
        box-shadow: 0 0 9px rgba(18,173,112,.55);
      }

      .filters button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .filters button b {
        min-width: 15px;
        height: 15px;
        display: inline-grid;
        place-items: center;
        border-radius: 999px;
        color: #9aa3b0;
        background: #f5f2f4;
        font-size: 7px;
      }

      .filters button.active b {
        color: #c91447;
        background: #ffe0ea;
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 20px;
        padding: 12px 14px;
        border: 1px solid #f3c8d5;
        border-radius: 14px;
        color: #b72b55;
        background: #fff5f8;
        font-size: 12px;
      }

      .error-banner button {
        margin-left: auto;
        border: 0;
        background: transparent;
        color: #c91447;
        font-weight: 900;
        cursor: pointer;
      }

      .request-grid {
        display: grid;
        grid-template-columns: repeat(3,minmax(0,1fr));
        gap: 14px;
        margin-top: 23px;
      }

      .request-card {
        position: relative;
        overflow: hidden;
        padding: 19px;
        border: 1px solid #f0dfe5;
        border-radius: 22px;
        background: linear-gradient(145deg,rgba(255,255,255,.96),rgba(255,248,251,.88));
        box-shadow: 0 15px 38px rgba(104,25,54,.055);
        animation: cardIn .42s ease both;
        transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease;
      }

      .request-card::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(115deg, transparent 25%, rgba(255,255,255,.62) 45%, transparent 65%);
        transform: translateX(-120%);
        transition: transform .75s ease;
        pointer-events: none;
      }

      .request-card:hover::after {
        transform: translateX(120%);
      }

      .request-card:hover {
        transform: translateY(-6px) scale(1.008);
        border-color: #efbccc;
        box-shadow: 0 20px 48px rgba(104,25,54,.10);
      }

      @keyframes cardIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .request-card::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #e8b4c3;
      }

      .request-card.urgency-critical::before { background: #d7194f; }
      .request-card.urgency-high::before { background: #ed6b31; }
      .request-card.urgency-medium::before { background: #e3a21d; }
      .request-card.urgency-low::before { background: #36a876; }

      .request-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .blood-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 12px;
        color: #c91447;
        background: #fff0f4;
      }

      .blood-badge strong {
        font-size: 16px;
      }

      .urgency-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 9px;
        border-radius: 999px;
        font-size: 8px;
        font-weight: 950;
        letter-spacing: .11em;
      }

      .urgency-badge i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      .urgency-badge.critical {
        color: #c91447;
        background: #fff0f4;
      }

      .urgency-badge.high {
        color: #cf6a2c;
        background: #fff5ed;
      }

      .urgency-badge.medium {
        color: #a87908;
        background: #fff9e5;
      }

      .urgency-badge.low {
        color: #16815b;
        background: #eefbf5;
      }

      .request-main {
        margin-top: 17px;
      }

      .request-id {
        display: inline-block;
        margin-top: 5px;
        color: #a8afba;
        font-size: 7px;
        font-weight: 950;
        letter-spacing: .13em;
      }

      .request-label {
        color: #a1a9b7;
        font-size: 7px;
        font-weight: 950;
        letter-spacing: .16em;
      }

      .request-main h3 {
        margin: 4px 0 0;
        color: #354154;
        font-size: 17px;
        font-weight: 950;
      }

      .request-details-grid {
        display: grid;
        grid-template-columns: repeat(2,1fr);
        gap: 8px;
        margin-top: 15px;
      }

      .detail {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        padding: 10px;
        border: 1px solid #f1e7eb;
        border-radius: 12px;
        background: #fffafb;
      }

      .detail > span {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 9px;
        color: #d9164c;
        background: #fff1f5;
      }

      .detail small,
      .detail strong {
        display: block;
      }

      .detail small {
        color: #a0a8b5;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .1em;
        text-transform: uppercase;
      }

      .detail strong {
        margin-top: 2px;
        overflow: hidden;
        color: #526074;
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .request-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 15px;
        padding-top: 13px;
        border-top: 1px solid #f2e7eb;
      }

      .match-label {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #149064;
        font-size: 9px;
        font-weight: 900;
      }

      .match-label span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #13ad71;
        box-shadow: 0 0 8px rgba(19,173,113,.45);
      }

      .view-button {
        min-height: 35px;
        padding: 0 11px;
        border-radius: 11px;
        color: #fff;
        background: linear-gradient(100deg,#d9164c,#ef4c78);
        box-shadow: 0 8px 20px rgba(217,22,76,.17);
        font-size: 10px;
      }

      .view-button, .profile-button, .accept-button {
        position: relative;
        overflow: hidden;
        transition: transform .2s ease, box-shadow .2s ease;
      }

      .view-button::after, .profile-button::after, .accept-button::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,.24), transparent);
        transform: translateX(-130%);
      }

      .view-button:hover, .profile-button:hover, .accept-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 14px 32px rgba(217,22,76,.26);
      }

      .view-button:hover::after, .profile-button:hover::after, .accept-button:hover::after {
        animation: buttonShine .65s ease;
      }

      @keyframes buttonShine {
        to { transform: translateX(130%); }
      }

      .trust-row {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 12px;
        margin-top: 15px;
      }

      .trust-card {
        display: flex;
        gap: 10px;
        padding: 16px;
        border: 1px solid rgba(255,255,255,.94);
        border-radius: 18px;
        background: rgba(255,255,255,.65);
        box-shadow: 0 12px 35px rgba(105,25,55,.045);
      }

      .trust-card > span {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 11px;
        color: #d9164c;
        background: #fff0f4;
      }

      .trust-card strong {
        color: #536074;
        font-size: 11px;
      }

      .trust-card p {
        margin: 3px 0 0;
        color: #9ca6b4;
        font-size: 9px;
        line-height: 1.55;
      }

      .loading-grid {
        display: grid;
        grid-template-columns: repeat(2,1fr);
        gap: 13px;
        margin-top: 23px;
      }

      .skeleton-card {
        min-height: 190px;
        padding: 20px;
        border: 1px solid #f1e5ea;
        border-radius: 21px;
        background: rgba(255,255,255,.8);
      }

      .skeleton {
        border-radius: 9px;
        background: linear-gradient(90deg,#f7e9ee,#fff5f8,#f7e9ee);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
      }

      .skeleton.blood {
        width: 52px;
        height: 38px;
        border-radius: 12px;
      }

      .skeleton.line {
        width: 70%;
        height: 12px;
        margin-top: 16px;
      }

      .skeleton.line.large { width: 86%; height: 17px; }
      .skeleton.line.short { width: 45%; }

      @keyframes shimmer {
        to { background-position: -200% 0; }
      }

      .empty-state {
        min-height: 350px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 45px 20px;
      }

      .empty-orb {
        width: 74px;
        height: 74px;
        display: grid;
        place-items: center;
        color: #d9164c;
        border-radius: 24px;
        background: #fff0f4;
        box-shadow: 0 18px 40px rgba(217,22,76,.10);
      }

      .empty-state .section-eyebrow {
        margin-top: 20px;
      }

      .empty-state h3 {
        margin: 8px 0 0;
        color: #405065;
        font-size: 21px;
        font-weight: 950;
      }

      .empty-state p {
        max-width: 500px;
        margin: 7px 0 0;
        color: #9aa5b4;
        font-size: 12px;
        line-height: 1.7;
      }

      .reset-button {
        margin-top: 17px;
        min-height: 38px;
        padding: 0 14px;
        border-radius: 12px;
        color: #d9164c;
        border: 1px solid #efcbd7;
        background: #fff;
        font-size: 10px;
      }

      footer {
        padding: 27px 0 5px;
        text-align: center;
        color: #c0c6d0;
        font-size: 8px;
        font-weight: 950;
        letter-spacing: .23em;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(47,13,27,.28);
        backdrop-filter: blur(9px);
      }

      .modal {
        width: min(600px,100%);
        max-height: calc(100vh - 40px);
        overflow: auto;
        padding: 27px;
        border: 1px solid rgba(255,255,255,.96);
        border-radius: 29px;
        background: rgba(255,255,255,.95);
        box-shadow: 0 40px 110px rgba(69,10,34,.22);
      }

      .modal-top {
        display: flex;
        justify-content: space-between;
        gap: 20px;
      }

      .modal-top h2 {
        margin: 5px 0 0;
        color: #364153;
        font-size: 22px;
        font-weight: 950;
      }

      .close-button {
        width: 37px;
        height: 37px;
        display: grid;
        place-items: center;
        border: 1px solid #eee0e6;
        border-radius: 12px;
        color: #7f8998;
        background: white;
        cursor: pointer;
      }

      .modal-hero {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 17px;
        align-items: center;
        margin-top: 22px;
        padding: 16px;
        border-radius: 19px;
        background: linear-gradient(135deg,#fff4f7,#fffafb);
      }

      .modal-blood {
        min-height: 104px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        color: #d9164c;
        background: #fff0f4;
      }

      .modal-blood strong {
        margin-top: 4px;
        font-size: 24px;
      }

      .modal-blood span {
        color: #a1a9b5;
        font-size: 7px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .modal-hero h3 {
        margin: 9px 0 0;
        color: #3e4a5d;
        font-size: 18px;
        font-weight: 950;
      }

      .modal-hero p {
        display: flex;
        align-items: center;
        gap: 5px;
        margin: 5px 0 0;
        color: #8d98aa;
        font-size: 11px;
      }

      .modal-grid {
        display: grid;
        grid-template-columns: repeat(2,1fr);
        gap: 8px;
        margin-top: 13px;
      }

      .patient-box {
        margin-top: 12px;
        padding: 12px 14px;
        border: 1px solid #f0e1e7;
        border-radius: 14px;
        background: #fffafb;
      }

      .patient-box span {
        display: block;
        color: #a1a9b5;
        font-size: 7px;
        font-weight: 950;
        letter-spacing: .14em;
      }

      .patient-box strong {
        display: block;
        margin-top: 4px;
        color: #4c586a;
        font-size: 12px;
      }

      .modal-note {
        display: flex;
        gap: 10px;
        margin-top: 14px;
        padding: 13px;
        border: 1px solid #dceee6;
        border-radius: 15px;
        color: #14805d;
        background: #f2fbf7;
      }

      .modal-note p {
        margin: 0;
        color: #71887e;
        font-size: 10px;
        line-height: 1.65;
      }

      .modal-actions {
        display: grid;
        grid-template-columns: .7fr 1.3fr;
        gap: 9px;
        margin-top: 16px;
      }

      .reject-button,
      .accept-button {
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border-radius: 13px;
        font-size: 11px;
        font-weight: 950;
        cursor: pointer;
      }

      .reject-button {
        border: 1px solid #eadfe4;
        color: #778191;
        background: white;
      }

      .accept-button {
        border: 0;
        color: white;
        background: linear-gradient(100deg,#d9164c,#ef4d79);
        box-shadow: 0 12px 30px rgba(217,22,76,.20);
      }

      .reject-button:disabled,
      .accept-button:disabled,
      .refresh-button:disabled {
        cursor: not-allowed;
        opacity: .62;
      }

      .toast {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 120;
        display: flex;
        align-items: center;
        gap: 9px;
        max-width: min(420px,calc(100vw - 30px));
        padding: 13px 16px;
        border: 1px solid #bde9d6;
        border-radius: 15px;
        color: #078457;
        background: rgba(243,255,249,.96);
        box-shadow: 0 18px 45px rgba(40,100,75,.14);
        backdrop-filter: blur(14px);
        font-size: 11px;
        font-weight: 850;
      }

      .spin {
        animation: spin .8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @media (max-width: 1050px) {
        .hero {
          grid-template-columns: 1fr;
        }

        .hero::after {
        content: "";
        position: absolute;
        inset: -40%;
        z-index: 0;
        background: conic-gradient(from 90deg at 50% 50%, transparent 0deg, rgba(255, 92, 137, .08) 70deg, transparent 140deg, rgba(214, 22, 76, .06) 230deg, transparent 310deg);
        animation: heroSweep 18s linear infinite;
        pointer-events: none;
      }

      @keyframes heroSweep {
        to { transform: rotate(360deg); }
      }

      .hero-copy {
          padding: 48px 45px 20px;
        }

        .hero-visual {
          min-height: 420px;
        }

        .stats-row {
          grid-template-columns: repeat(2,1fr);
        }

        .request-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 700px) {
        .ambient-noise {
        position: absolute;
        inset: 0;
        opacity: .035;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.65'/%3E%3C/svg%3E");
        pointer-events: none;
      }

      .particle-field {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }

      .particle {
        position: absolute;
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: rgba(215, 22, 76, .26);
        box-shadow: 0 0 12px rgba(215, 22, 76, .28);
        animation: particleFloat 8s ease-in-out infinite;
      }

      @keyframes particleFloat {
        0%, 100% { opacity: .15; transform: translate3d(0, 12px, 0) scale(.8); }
        50% { opacity: .75; transform: translate3d(12px, -18px, 0) scale(1.35); }
      }

      .requests-shell {
          width: calc(100% - 16px);
          padding-top: 8px;
        }

        .requests-topbar {
          grid-template-columns: 1fr auto;
          height: 58px;
        }

        .brand {
          display: none;
        }

        .hero {
          border-radius: 27px;
        }

        .hero::after {
        content: "";
        position: absolute;
        inset: -40%;
        z-index: 0;
        background: conic-gradient(from 90deg at 50% 50%, transparent 0deg, rgba(255, 92, 137, .08) 70deg, transparent 140deg, rgba(214, 22, 76, .06) 230deg, transparent 310deg);
        animation: heroSweep 18s linear infinite;
        pointer-events: none;
      }

      @keyframes heroSweep {
        to { transform: rotate(360deg); }
      }

      .hero-copy {
          padding: 38px 23px 14px;
        }

        .hero h1 {
          font-size: 53px;
        }

        .hero-copy > p {
          font-size: 12px;
        }

        .hero-live-line {
          max-width: 100%;
        }

        .hero-visual {
          min-height: 330px;
          overflow: hidden;
        }

        .orbit {
        position: absolute;
        border-radius: 50%;
        border: 1px dashed rgba(214,22,76,.18);
        pointer-events: none;
      }

      .orbit-a {
        width: 270px;
        height: 270px;
        animation: orbitSpin 14s linear infinite;
      }

      .orbit-b {
        width: 335px;
        height: 335px;
        border-style: solid;
        border-color: rgba(214,22,76,.08);
        animation: orbitSpinReverse 19s linear infinite;
      }

      .orbit-a::after, .orbit-b::after {
        content: "";
        position: absolute;
        top: 50%;
        left: -4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #e51c58;
        box-shadow: 0 0 15px rgba(229,28,88,.6);
      }

      .orbit-b::after {
        top: 18%;
        left: auto;
        right: 6px;
      }

      @keyframes orbitSpin { to { transform: rotate(360deg); } }
      @keyframes orbitSpinReverse { to { transform: rotate(-360deg); } }

      .pulse-ring {
          transform: scale(.75);
        }

        .heart-orb {
          width: 155px;
          height: 155px;
        }

        .orbit-a { width: 220px; height: 220px; }
        .orbit-b { width: 275px; height: 275px; }
        .orb-core-ring { width: 108px; height: 108px; }

        .float-critical {
          left: 2%;
        }

        .float-matches {
          right: 2%;
        }

        .float-network {
          right: 4%;
          bottom: 10%;
        }

        .stats-row,
        .view-button, .profile-button, .accept-button {
        position: relative;
        overflow: hidden;
        transition: transform .2s ease, box-shadow .2s ease;
      }

      .view-button::after, .profile-button::after, .accept-button::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,.24), transparent);
        transform: translateX(-130%);
      }

      .view-button:hover, .profile-button:hover, .accept-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 14px 32px rgba(217,22,76,.26);
      }

      .view-button:hover::after, .profile-button:hover::after, .accept-button:hover::after {
        animation: buttonShine .65s ease;
      }

      @keyframes buttonShine {
        to { transform: translateX(130%); }
      }

      .trust-row {
          grid-template-columns: 1fr;
        }

        .network-card {
          padding: 19px;
          border-radius: 25px;
        }

        .network-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .filters {
          width: 100%;
        }

        .filters button {
          flex: 1;
        }

        .request-details-grid,
        .modal-grid {
          grid-template-columns: 1fr;
        }

        .modal-hero {
          grid-template-columns: 90px 1fr;
        }

        .modal {
          padding: 20px;
          border-radius: 24px;
        }

        .modal-actions {
          grid-template-columns: 1fr;
        }

        .back-button {
          font-size: 11px;
        }
      }
    `}</style>
  );
}
