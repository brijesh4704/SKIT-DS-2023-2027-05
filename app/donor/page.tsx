"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  HeartPulse,
  History,
  Home,
  MapPin,
  Menu,
  Navigation,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  Zap,
} from "lucide-react";

import {
  Mail,
} from "lucide-react";

import "./donor-dashboard.css";
import NotificationBell from "../../components/notifications/NotificationBell";

type Request = {
  id: string;
  blood: string;
  hospital: string;
  location: string;
  distance: string;
  units: number;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  time: string;
  raw: any;
};

type Donation = {
  id: string;
  date: string;
  rawDate: string;
  hospital: string;
  city: string;
  bloodGroup: string;
  units: number;
  status: string;
  statusLabel: string;
  isVerified: boolean;
  rejectionReason: string;
  donationCenter: string;
  bloodRequestId: string | null;
};

type EligibilityData = {
  eligible?: boolean;
  status?: string;
  message?: string;
  reason?: string;
  score?: number;
};

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const relativeTime = (date?: string) => {
  if (!date) return "Recently";

  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";

  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  return `${Math.floor(hours / 24)} days ago`;
};

const getEligibilityLabel = (eligibility: EligibilityData | null) => {
  if (!eligibility) return "Not assessed";

  if (
    eligibility.eligible === true ||
    eligibility.status === "ELIGIBLE"
  ) {
    return "Eligible";
  }

  if (
    eligibility.status === "MEDICAL_REVIEW" ||
    eligibility.status === "PROFESSIONAL_REVIEW_REQUIRED" ||
    eligibility.status === "REVIEW_REQUIRED"
  ) {
    return "Medical review";
  }

  if (eligibility.status === "TEMPORARILY_INELIGIBLE") {
    return "Temporarily ineligible";
  }

  return eligibility.status || "Not assessed";
};

export default function DonorDashboard() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [available, setAvailable] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<Request | null>(null);

  const [donor, setDonor] = useState<any>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [donationHistory, setDonationHistory] =
    useState<Donation[]>([]);
  const [eligibility, setEligibility] =
    useState<EligibilityData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("bloodlink_token") ||
        localStorage.getItem("token")
      : null;

  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const clearAuthAndLogin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("bloodlink_token");
    localStorage.removeItem("bloodlink_user");
    window.location.href = "/login";
  };

  const showToast = (message: string, duration = 3000) => {
    setToast(message);
    window.setTimeout(() => setToast(""), duration);
  };

  const loadDashboard = async () => {
    if (!token) {
      clearAuthAndLogin();
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * IMPORTANT:
       * Donor requests come from the donor-specific endpoint.
       * Do NOT use GET /api/blood-requests here.
       *
       * The backend donor endpoint already checks:
       * - donor role
       * - active user
       * - donor availability
       * - eligibility
       * - medical eligibility
       * - blood-group compatibility
       * - donor/request GPS distance
       * - urgency
       * - already responded requests
       */
      const [
        profileRes,
        requestsRes,
        donationsRes,
        eligibilityRes,
      ] = await Promise.all([
        fetch(`${API}/api/donors/profile`, {
          headers: authHeaders,
          cache: "no-store",
        }),

        fetch(`${API}/api/blood-requests/donor/available`, {
          headers: authHeaders,
          cache: "no-store",
        }),

        fetch(`${API}/api/donations/my`, {
          headers: authHeaders,
          cache: "no-store",
        }),

        fetch(`${API}/api/eligibility/assess`, {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }),
      ]);

     if (
  [profileRes, requestsRes, donationsRes, eligibilityRes].some(
    (response) => response.status === 401
  )
) {
  clearAuthAndLogin();
  return;
}

      const profileData = await profileRes.json();
      const requestData = await requestsRes.json();
      const donationData = await donationsRes.json();

      let eligibilityData: EligibilityData | null = null;

      if (eligibilityRes.ok) {
        eligibilityData = await eligibilityRes.json();
      }

      if (!profileRes.ok) {
        throw new Error(
          profileData.message ||
            "Unable to load donor profile"
        );
      }

      if (!requestsRes.ok) {
        throw new Error(
          requestData.message ||
            "Unable to load emergency requests"
        );
      }

      if (!donationsRes.ok) {
        throw new Error(
          donationData.message ||
            "Unable to load donation history"
        );
      }

      const currentDonor = profileData.donor;

      setDonor(currentDonor);
      setAvailable(Boolean(currentDonor?.isAvailable));
      setEligibility(eligibilityData);

      /*
       * Backend is responsible for matching.
       * Frontend only formats the response for display.
       *
       * This avoids the old bug where donor blood group was
       * incorrectly used as the key of a recipient->donor map.
       */
      const availableRequests =
        Array.isArray(requestData.requests)
          ? requestData.requests
          : [];

      const mappedRequests: Request[] =
        availableRequests.map((request: any) => ({
          id: String(request._id),
          blood: request.bloodGroup,
          hospital:
            request.hospitalName || "Hospital",
          location:
            request.city || "Location unavailable",
          distance:
            Number.isFinite(
              Number(request.distanceKm)
            )
              ? `${Number(request.distanceKm).toFixed(1)} km`
              : "Distance unavailable",
          units: Number(
            request.unitsRequired || 0
          ),
          urgency:
            request.urgency || "MEDIUM",
          time: relativeTime(request.createdAt),
          raw: request,
        }));

      setRequests(mappedRequests);

      const donations =
        Array.isArray(donationData.donations)
          ? donationData.donations
          : [];


setDonationHistory(
  donations.map((donation: any) => {
    const status = String(
      donation.status || ""
    ).toUpperCase();

    let statusLabel = "Recorded";

    if (status === "COMPLETED") {
      statusLabel = "Verified";
    } else if (status === "PENDING_VERIFICATION") {
      statusLabel = "Pending verification";
    } else if (status === "REJECTED") {
      statusLabel = "Rejected";
    } else if (status === "CANCELLED") {
      statusLabel = "Cancelled";
    } else if (status === "SCHEDULED") {
      statusLabel = "Scheduled";
    }

    return {
      id: String(donation._id || ""),
      
      rawDate: donation.donationDate || "",

      date: donation.donationDate
        ? new Date(
            donation.donationDate
          ).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—",

      hospital:
        donation.bloodRequest?.hospitalName ||
        donation.donationCenter?.name ||
        "Blood Bank",

      city:
        donation.bloodRequest?.city ||
        donation.city ||
        "Location unavailable",

      bloodGroup:
        donation.bloodGroup ||
        donor?.bloodGroup ||
        "—",

      units: Number(
        donation.unitsDonated || 0
      ),

      status,

      statusLabel,

      isVerified:
        Boolean(donation.isVerified) ||
        status === "COMPLETED",

      rejectionReason:
        donation.rejectionReason || "",

      donationCenter:
        donation.donationCenter?.name ||
        "Blood Bank",

      bloodRequestId:
        donation.bloodRequest?._id
          ? String(donation.bloodRequest._id)
          : null,
    };
  })
);
    } catch (errorValue) {
      setError(
        errorValue instanceof Error
          ? errorValue.message
          : "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // The dashboard should load once when the authenticated page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDonorAvailability = async (
    nextValue: boolean
  ) => {
    if (!token) return;

    setAvailable(nextValue);

    try {
      const response = await fetch(
        `${API}/api/donors/availability`,
        {
          method: "PUT",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isAvailable: nextValue,
          }),
        }
      );

     if (response.status === 401) {
  clearAuthAndLogin();
  return;
}

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update availability"
        );
      }

      setDonor((previous: any) => ({
        ...previous,
        isAvailable: nextValue,
      }));

      showToast(
        nextValue
          ? "You are now available for requests."
          : "You are now unavailable for requests."
      );

      /*
       * Refresh the donor request list after changing availability.
       * This keeps the UI synchronized with the backend filter.
       */
      if (nextValue) {
        await loadDashboard();
      } else {
        setRequests([]);
      }
    } catch (errorValue) {
      setAvailable(!nextValue);

      showToast(
        errorValue instanceof Error
          ? errorValue.message
          : "Availability update failed"
      );
    }
  };

  const respondToRequest = async (
    status: "ACCEPTED" | "REJECTED"
  ) => {
    if (!selectedRequest || !token) return;

    setActionLoading(true);

    try {
      const response = await fetch(
        `${API}/api/blood-requests/${selectedRequest.id}/respond`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );
if (response.status === 401) {
  clearAuthAndLogin();
  return;
}

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to submit response"
        );
      }

      setRequests((previous) =>
        previous.filter(
          (request) =>
            request.id !== selectedRequest.id
        )
      );

      setSelectedRequest(null);

      showToast(
        status === "ACCEPTED"
          ? "Request accepted successfully."
          : "Request rejected."
      );

      /*
       * If another request becomes unavailable while the
       * donor is on this page, reload the backend truth.
       */
      if (status === "ACCEPTED") {
        await loadDashboard();
      }
    } catch (errorValue) {
      showToast(
        errorValue instanceof Error
          ? errorValue.message
          : "Response failed"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const donorName =
    donor?.user?.name || "Donor";

  const bloodGroup =
    donor?.bloodGroup || "—";

  const city =
    donor?.location?.city ||
    "Location not set";

  const state =
    donor?.location?.state || "";

  const donationsCount = Number(
    donor?.totalDonations ||
      donationHistory.length ||
      0
  );

  const eligibilityLabel =
    getEligibilityLabel(eligibility);

  const eligibilityPassed =
    eligibility?.eligible === true ||
    eligibility?.status === "ELIGIBLE";

  const eligibilityNeedsReview =
    eligibility?.status ===
      "MEDICAL_REVIEW" ||
    eligibility?.status ===
      "PROFESSIONAL_REVIEW_REQUIRED" ||
    eligibility?.status ===
      "REVIEW_REQUIRED";

  const eligibilityTemporary =
    eligibility?.status ===
    "TEMPORARILY_INELIGIBLE";

  const navItems = [
    {
      label: "Overview",
      icon: Home,
      target: "overview",
    },
    {
      label: "My Profile",
      icon: UserRound,
      target: "profile",
    },
    {
      label: "Emergency Requests",
      icon: Zap,
      target: "requests",
      badge: requests.length
        ? String(requests.length)
        : undefined,
    },
    {
      label: "Availability",
      icon: Activity,
      target: "availability",
    },
    {
      label: "Donation History",
      icon: History,
      target: "history",
    },
  ];

  const scrollToSection = (
    target: string,
    label?: string
  ) => {
    const element =
      document.getElementById(target);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    if (label) {
      setActiveNav(label);
    }

    setMobileMenu(false);
  };

  const openRequestsPage = () => {
    window.location.href =
      "/donor/requests";
  };

  return (
    <main className="donor-dashboard">
      {/* Animated background */}
      <div
        className="dashboard-particles"
        aria-hidden="true"
      >
        <span className="particle p1" />
        <span className="particle p2" />
        <span className="particle p3" />
        <span className="particle p4" />
        <span className="particle p5" />
        <span className="particle p6" />
        <span className="particle p7" />
        <span className="particle p8" />

        <div className="background-blood-cell cell-one">
          <Droplets size={18} />
        </div>

        <div className="background-blood-cell cell-two">
          <Droplets size={12} />
        </div>

        <div className="background-blood-cell cell-three">
          <Droplets size={15} />
        </div>
      </div>

      <div className="dashboard-glow dashboard-glow-one" />
      <div className="dashboard-glow dashboard-glow-two" />

      {/* Mobile menu */}
      <button
        className="mobile-menu-button"
        onClick={() =>
          setMobileMenu(true)
        }
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar ${
          mobileMenu ? "mobile-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <Droplets size={20} />
          </div>

          <div>
            <strong>
              BloodLink<span>AI</span>
            </strong>
            <small>DONOR NETWORK</small>
          </div>

          <button
            className="mobile-close"
            onClick={() =>
              setMobileMenu(false)
            }
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-profile">
          <div className="profile-avatar">
            <UserRound size={23} />
          </div>

          <div className="profile-info">
            <strong>{donorName}</strong>
            <span>
              <span className="online-dot" />
              {available
                ? "Available donor"
                : "Donor profile"}
            </span>
          </div>
        </div>

        <div className="sidebar-section-label">
          DONOR SPACE
        </div>

        <nav className="dashboard-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`dashboard-nav-item ${
                  activeNav === item.label
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  if (
                    item.label ===
                    "Emergency Requests"
                  ) {
                    openRequestsPage();
                    return;
                  }

                  scrollToSection(
                    item.target,
                    item.label
                  );
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>

                {item.badge && (
                  <b className="nav-badge">
                    {item.badge}
                  </b>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="dashboard-nav-item"
            onClick={() =>
              setSettingsOpen(true)
            }
          >
            <Settings size={17} />
            <span>Settings</span>
          </button>
          <button
  className="dashboard-nav-item"
  onClick={() => {
    window.location.href = "/";
  }}
>
  <Home size={17} />
  <span>Visit Website</span>
</button>

<button
  className="dashboard-nav-item logout-nav-item"
  onClick={clearAuthAndLogin}
>
  <ArrowRight size={17} />
  <span>Logout</span>
</button>

          <div className="sidebar-security">
            <ShieldCheck size={17} />

            <div>
              <strong>
                Protected profile
              </strong>
              <span>
                Your donor data is secured.
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <section className="dashboard-main">
        <header
          id="overview"
          className="dashboard-header"
        >
          <div>
            <div className="dashboard-eyebrow">
              <Activity size={13} />
              DONOR DASHBOARD
            </div>

            <h1>
              Good morning, {donorName}
              <span> 👋</span>
            </h1>

            <p>
              Your contribution can help someone
              get the blood they need when every
              minute matters.
            </p>
          </div>

          <div className="dashboard-header-actions">
           <NotificationBell />

            <div
              id="profile"
              className="header-user"
            >
              <div className="header-avatar">
                <UserRound size={17} />
              </div>

              <div>
                <strong>{donorName}</strong>
                <span>Donor</span>
              </div>

              <ChevronRight size={15} />
            </div>
          </div>
        </header>

        {/* Availability */}
        <div
          id="availability"
          className="donor-status-card"
        >
          <div className="status-main">
            <div className="status-orb">
              <HeartPulse size={25} />
            </div>

            <div>
              <span className="status-label">
                YOUR DONOR STATUS
              </span>

              <h2>
                {available
                  ? "Available for donation"
                  : "Currently unavailable"}
              </h2>

              <p>
                {available
                  ? "You may receive compatible emergency requests near your location."
                  : "You won't receive new emergency donor requests."}
              </p>
            </div>
          </div>

          <button
            className={`availability-toggle ${
              available ? "on" : ""
            }`}
            onClick={() =>
              updateDonorAvailability(
                !available
              )
            }
          >
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>

            <span>
              {available
                ? "Available"
                : "Unavailable"}
            </span>
          </button>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon blood">
              <Droplets size={19} />
            </div>

            <div>
              <span>Blood group</span>
              <strong>{bloodGroup}</strong>
            </div>

            <small>Verified</small>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <ShieldCheck size={19} />
            </div>

            <div>
              <span>Eligibility</span>
              <strong>
                {eligibilityLabel}
              </strong>
            </div>

            <small>
              {eligibilityPassed
                ? "Passed"
                : eligibilityNeedsReview
                  ? "Review"
                  : eligibilityTemporary
                    ? "Temporary"
                    : "Status"}
            </small>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <Droplets size={19} />
            </div>

            <div>
              <span>Donations</span>
              <strong>
                {donationsCount}
              </strong>
            </div>

            <small>Lifetime</small>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              <HeartPulse size={19} />
            </div>

            <div>
              <span>Open requests</span>
              <strong>
                {requests.length}
              </strong>
            </div>

            <small>Matched</small>
          </div>
        </div>

        {/* Main content */}
        <div className="dashboard-content-grid">
          {/* Requests */}
          <section
            id="requests"
            className="dashboard-panel requests-panel"
          >
            <div className="panel-header">
              <div>
                <span>LIVE NETWORK</span>
                <h2>
                  Emergency requests
                </h2>
              </div>

              <button
                className="view-all-button"
                onClick={openRequestsPage}
              >
                View all
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="requests-list">
              {loading ? (
                <div className="request-card">
                  <div className="request-details">
                    <strong>
                      Loading emergency
                      requests…
                    </strong>
                    <small>
                      Checking the live donor
                      network.
                    </small>
                  </div>
                </div>
              ) : requests.length === 0 ? (
                <div className="request-card">
                  <div className="request-details">
                    <strong>
                      No compatible open
                      requests
                    </strong>
                    <small>
                      {available
                        ? "There are currently no backend-matched requests near you."
                        : "Turn on availability to receive compatible emergency requests."}
                    </small>
                  </div>
                </div>
              ) : (
                requests.map((request) => (
                  <article
                    className="request-card"
                    key={request.id}
                  >
                    <div className="request-blood">
                      <Droplets size={18} />
                      <strong>
                        {request.blood}
                      </strong>
                    </div>

                    <div className="request-details">
                      <div className="request-title-row">
                        <strong>
                          {request.hospital}
                        </strong>

                        <span
                          className={`urgency ${request.urgency.toLowerCase()}`}
                        >
                          {request.urgency}
                        </span>
                      </div>

                      <div className="request-meta">
                        <span>
                          <MapPin size={11} />
                          {request.location}
                        </span>

                        <span>
                          <Navigation size={11} />
                          {request.distance}
                        </span>

                        <span>
                          <Droplets size={11} />
                          {request.units} unit
                          {request.units > 1
                            ? "s"
                            : ""}
                        </span>
                      </div>

                      <small>
                        <Clock3 size={10} />
                        {request.time}
                      </small>
                    </div>

                    <button
                      className="request-action"
                      onClick={() =>
                        setSelectedRequest(
                          request
                        )
                      }
                    >
                      View
                      <ChevronRight size={14} />
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>

          {/* Real eligibility */}
          <section className="dashboard-panel readiness-panel">
            <div className="panel-header">
              <div>
                <span>AI ASSISTED</span>
                <h2>
                  Donor eligibility
                </h2>
              </div>

              <div className="ai-badge">
                <Sparkles size={12} />
                AI
              </div>
            </div>

            <div className="readiness-score">
              <div
                className={`score-ring ${
                  eligibilityPassed
                    ? "eligible"
                    : ""
                }`}
              >
                <div>
                  <strong>
                    {eligibility?.score ??
                      (eligibilityPassed
                        ? "✓"
                        : "—")}
                  </strong>

                  {typeof eligibility
                    ?.score === "number" && (
                    <span>/100</span>
                  )}
                </div>
              </div>

              <div>
                <strong>
                  {eligibilityLabel}
                </strong>

                <p>
                  {eligibility?.message ||
                    eligibility?.reason ||
                    "Your donor screening result will appear here after the eligibility assessment."}
                </p>
              </div>
            </div>

            <div className="readiness-list">
              <div>
                <CheckCircle2 size={16} />

                <span>
                  Basic donor profile
                </span>

                <b>Loaded</b>
              </div>

              <div>
                {eligibilityPassed ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <ShieldCheck size={16} />
                )}

                <span>
                  Eligibility assessment
                </span>

                <b>
                  {eligibilityLabel}
                </b>
              </div>

              <div>
                <ShieldCheck size={16} />

                <span>
                  Final medical decision
                </span>

                <b>
                  Professional
                </b>
              </div>
            </div>

            <button
              className="readiness-button"
              onClick={() =>
                (window.location.href =
                  "/eligibility")
              }
            >
              {eligibilityPassed
                ? "View screening details"
                : "Complete eligibility assessment"}
              <ArrowRight size={14} />
            </button>
          </section>
        </div>

        {/* Lower grid */}
        <div className="lower-grid">
          {/* Donation history */}
          {/* Donation history */}
<section
  id="history"
  className="dashboard-panel history-panel premium-history-panel"
>
  <div className="panel-header">
    <div>
      <span>YOUR IMPACT</span>

      <h2>
        Donation history
      </h2>

      <p className="history-subtitle">
        Every verified donation you make becomes
        part of the BloodLink network.
      </p>
    </div>

    <div className="history-header-icon">
      <History size={19} />
    </div>
  </div>

  {/* History summary */}
  <div className="history-summary">
    <div className="history-summary-card">
      <div className="history-summary-icon">
        <Droplets size={16} />
      </div>

      <div>
        <span>Total donations</span>
        <strong>
          {donationHistory.length}
        </strong>
      </div>
    </div>

    <div className="history-summary-card">
      <div className="history-summary-icon verified">
        <CheckCircle2 size={16} />
      </div>

      <div>
        <span>Verified</span>
        <strong>
          {
            donationHistory.filter(
              (item) =>
                item.status === "COMPLETED" ||
                item.isVerified
            ).length
          }
        </strong>
      </div>
    </div>

    <div className="history-summary-card">
      <div className="history-summary-icon pending">
        <Clock3 size={16} />
      </div>

      <div>
        <span>Pending</span>
        <strong>
          {
            donationHistory.filter(
              (item) =>
                item.status ===
                "PENDING_VERIFICATION"
            ).length
          }
        </strong>
      </div>
    </div>

    <div className="history-summary-card">
      <div className="history-summary-icon units">
        <HeartPulse size={16} />
      </div>

      <div>
        <span>Total units</span>
        <strong>
          {donationHistory.reduce(
            (total, item) =>
              total + Number(item.units || 0),
            0
          )}
        </strong>
      </div>
    </div>
  </div>

  {/* History list */}
  <div className="premium-history-list">
    {loading ? (
      <>
        {[1, 2].map((item) => (
          <div
            className="history-loading-card"
            key={item}
          >
            <div className="history-loading-icon" />

            <div className="history-loading-content">
              <div />
              <span />
              <small />
            </div>
          </div>
        ))}
      </>
    ) : donationHistory.length === 0 ? (
      <div className="history-empty-state">
        <div className="history-empty-icon">
          <Droplets size={25} />
        </div>

        <div>
          <strong>
            No donations recorded yet
          </strong>

          <p>
            Your verified blood donations will
            appear here once they are submitted
            and processed by a Blood Bank.
          </p>
        </div>
      </div>
    ) : (
      donationHistory.map((item, index) => {
        const dateParts =
          item.date.split(" ");

        const isCompleted =
          item.status === "COMPLETED" ||
          item.isVerified;

        const isPending =
          item.status ===
          "PENDING_VERIFICATION";

        const isRejected =
          item.status === "REJECTED";

        return (
          <article
            className="premium-history-card"
            key={
              item.id ||
              `${item.rawDate}-${index}`
            }
          >
            {/* Left date */}
            <div className="history-date-block">
              <div className="history-date-day">
                {dateParts[0] || "—"}
              </div>

              <div className="history-date-rest">
                {dateParts
                  .slice(1)
                  .join(" ")}
              </div>
            </div>

            {/* Blood icon */}
            <div className="history-blood-icon">
              <Droplets size={19} />
            </div>

            {/* Main information */}
            <div className="history-main-info">
              <div className="history-title-row">
                <div>
                  <strong>
                    {item.hospital}
                  </strong>

                  <span>
                    <MapPin size={11} />
                    {item.city}
                  </span>
                </div>

                <div
                  className={`history-status ${
                    isCompleted
                      ? "completed"
                      : isPending
                        ? "pending"
                        : isRejected
                          ? "rejected"
                          : "neutral"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={12} />
                  ) : isPending ? (
                    <Clock3 size={12} />
                  ) : (
                    <Activity size={12} />
                  )}

                  {item.statusLabel}
                </div>
              </div>

              {/* Donation metadata */}
              <div className="history-meta-grid">
                <div>
                  <span>Blood group</span>
                  <strong>
                    {item.bloodGroup}
                  </strong>
                </div>

                <div>
                  <span>Units donated</span>
                  <strong>
                    {item.units}{" "}
                    {item.units === 1
                      ? "unit"
                      : "units"}
                  </strong>
                </div>

                <div>
                  <span>Donation center</span>
                  <strong>
                    {item.donationCenter}
                  </strong>
                </div>
              </div>

              {/* Rejection reason */}
              {isRejected &&
                item.rejectionReason && (
                  <div className="history-rejection">
                    <strong>
                      Rejection reason
                    </strong>

                    <span>
                      {item.rejectionReason}
                    </span>
                  </div>
                )}

              {/* Blood request connection */}
              {item.bloodRequestId && (
                <div className="history-request-link">
                  <HeartPulse size={12} />

                  <span>
                    Linked to an emergency
                    blood request
                  </span>
                </div>
              )}
            </div>

            {/* Verification indicator */}
            <div className="history-verification">
              {isCompleted ? (
                <>
                  <ShieldCheck size={17} />

                  <span>
                    Verified
                  </span>
                </>
              ) : isPending ? (
                <>
                  <Clock3 size={17} />

                  <span>
                    Awaiting verification
                  </span>
                </>
              ) : (
                <>
                  <Activity size={17} />

                  <span>
                    {item.statusLabel}
                  </span>
                </>
              )}
            </div>
          </article>
        );
      })
    )}
  </div>
</section>
          {/* Location */}
          <section className="dashboard-panel location-panel">
            <div className="panel-header">
              <div>
                <span>
                  NETWORK LOCATION
                </span>

                <h2>
                  Donation coverage
                </h2>
              </div>

              <MapPin size={18} />
            </div>

            <div className="location-visual">
              <div className="map-grid" />

              <div className="map-center">
                <span />

                <div>
                  <Droplets size={17} />
                </div>
              </div>

              <div className="map-point point-one" />
              <div className="map-point point-two" />
              <div className="map-point point-three" />

              <div className="location-label">
                <MapPin size={12} />
                {city}
              </div>
            </div>

            <div className="location-footer">
              <div>
                <span>Current area</span>

                <strong>
                  {city}
                  {state
                    ? `, ${state}`
                    : ""}
                </strong>
              </div>

              <button
                onClick={() =>
                  setSettingsOpen(true)
                }
              >

                Update
                <ChevronRight size={13} />
              </button>
            </div>
          </section>
        </div>


        {/* Disclaimer */}
        <div className="dashboard-note">
          <ShieldCheck size={15} />

          <p>
            BloodLink AI provides screening and
            matching assistance. Final donation
            eligibility and clinical decisions
            must be confirmed by qualified
            medical or blood-bank professionals.
          </p>
        </div>

        {/* Impact */}
        <div className="dashboard-impact">
          <div className="impact-content">
            <div className="impact-eyebrow">
              <Sparkles size={12} />
              BLOODLINK NETWORK
            </div>

            <h2>
              Every match can become
              <span>
                {" "}
                someone&apos;s second chance.
              </span>
            </h2>

            <p>
              Your donor profile stays ready so
              that when a compatible emergency
              request appears nearby, BloodLink
              can help connect the right people
              faster.
            </p>

            <div className="impact-mini-stats">
              <div>
                <strong>
                  {donationsCount}
                </strong>
                <span>Donations</span>
              </div>

              <div>
                <strong>
                  {requests.length}
                </strong>
                <span>Open matches</span>
              </div>

              <div>
                <strong>
                  {bloodGroup}
                </strong>
                <span>Blood group</span>
              </div>
            </div>
          </div>

          <div className="impact-visual">
            <div className="impact-grid" />
            <div className="impact-orbit orbit-one" />
            <div className="impact-orbit orbit-two" />

            <div className="impact-node node-a">
              <Droplets size={15} />
            </div>

            <div className="impact-node node-b">
              <HeartPulse size={14} />
            </div>

            <div className="impact-node node-c">
              <MapPin size={14} />
            </div>

            <div className="impact-core">
              <Droplets size={29} />
              <span />
            </div>

            <div className="impact-line line-a" />
            <div className="impact-line line-b" />
            <div className="impact-line line-c" />

            <div className="impact-floating-label">
              <Activity size={11} />
              Live donor network
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="dashboard-footer">
          <div className="footer-main">
            <div className="footer-brand-block">
              <div className="footer-brand">
                <div className="footer-brand-mark">
                  <Droplets size={18} />
                </div>

                <div>
                  <strong>
                    BloodLink<span>AI</span>
                  </strong>

                  <small>
                    INTELLIGENT BLOOD NETWORK
                  </small>
                </div>
              </div>

              <p>
                Connecting compatible blood
                donors with people and hospitals
                when time matters most.
              </p>

              <div className="footer-protected">
                <ShieldCheck size={13} />
                Protected donor environment
              </div>
            </div>

            <div className="footer-column">
              <span className="footer-column-title">
                DONOR
              </span>

              <button
                onClick={() =>
                  scrollToSection(
                    "profile",
                    "My Profile"
                  )
                }
              >
                My Profile
              </button>

              <button
                onClick={openRequestsPage}
              >
                Emergency Requests
              </button>

              <button
                onClick={() =>
                  scrollToSection(
                    "history",
                    "Donation History"
                  )
                }
              >
                Donation History
              </button>

              <button
                onClick={() =>
                  scrollToSection(
                    "availability",
                    "Availability"
                  )
                }
              >
                Availability
              </button>
            </div>

            <div className="footer-column">
              <span className="footer-column-title">
                PLATFORM
              </span>

              <button
                onClick={() =>
                  (window.location.href =
                    "/how-it-works")
                }
              >
                How it works
              </button>

              <button
                onClick={() =>
                  (window.location.href =
                    "/technology")
                }
              >
                AI Matching
              </button>

              <button
                onClick={() =>
                  (window.location.href =
                    "/for-hospitals")
                }
              >
                Hospitals
              </button>

              <button
                onClick={() =>
                  (window.location.href = "/")
                }
              >
                Blood Network
              </button>
            </div>

            <div className="footer-column">
              <span className="footer-column-title">
                SUPPORT
              </span>

              <button
                onClick={() =>
                  (window.location.href =
                    "/contact")
                }
              >
                Help Center
              </button>

              <button
                onClick={() =>
                  (window.location.href =
                    "/privacy")
                }
              >
                Privacy
              </button>

              <button
                onClick={() =>
                  (window.location.href = "/")
                }
              >
                Safety
              </button>

              <button
                onClick={() =>
                  (window.location.href =
                    "/contact")
                }
              >
                Contact
              </button>
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © 2026 BloodLink AI. Built for
              faster emergency coordination.
            </span>

            <div className="footer-bottom-right">
              <span className="footer-status">
                <i />
                Network operational
              </span>

              <span>
                {city}
                {state
                  ? `, ${state}`
                  : ", India"}
              </span>
            </div>
          </div>
        </footer>
      </section>

     {settingsOpen && (
  <div
    className="settings-overlay"
    onClick={() => setSettingsOpen(false)}
  >
    <div
      className="settings-modal-premium"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="settings-modal-header">
        <div className="settings-header-left">
          <div className="settings-icon-box">
            <Settings size={21} />
          </div>

          <div>
            <span className="settings-eyebrow">
              ACCOUNT SETTINGS
            </span>

            <h2>Donor preferences</h2>

            <p>
              Manage the settings that control how your
              BloodLink account participates in the network.
            </p>
          </div>
        </div>

        <button
          className="settings-close-button"
          onClick={() => setSettingsOpen(false)}
          aria-label="Close settings"
        >
          <X size={19} />
        </button>
      </div>

      {/* Availability */}
      <div className="settings-section">
        <div className="settings-section-label">
          DONOR PARTICIPATION
        </div>

        <div className="settings-card availability-card">
          <div className="settings-card-icon availability-icon">
            <HeartPulse size={20} />
          </div>

          <div className="settings-card-content">
            <div className="settings-card-title">
              Emergency availability
            </div>

            <div className="settings-card-description">
              Receive compatible emergency blood requests
              when you are available to donate.
            </div>
          </div>

          <div className="settings-toggle-area">
            <button
              type="button"
              className={`premium-toggle ${
                available ? "active" : ""
              }`}
              onClick={() => handleAvailabilityToggle()}
              aria-label="Toggle emergency availability"
            >
              <span />
            </button>

            <span
              className={`toggle-status ${
                available ? "online" : "offline"
              }`}
            >
              {available ? "Available" : "Unavailable"}
            </span>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="settings-section">
        <div className="settings-section-label">
          ACCOUNT INFORMATION
        </div>

        <div className="settings-info-list">
          {/* Email */}
          <div className="settings-info-row">
            <div className="settings-info-icon">
              <Mail size={18} />
            </div>

            <div className="settings-info-content">
              <span className="settings-info-label">
                Email address
              </span>

              <span className="settings-info-value">
                {user?.email || "Not available"}
              </span>
            </div>

            <div className="verified-badge">
              <CheckCircle2 size={13} />
              Verified
            </div>
          </div>

          {/* Location */}
          <div className="settings-info-row">
            <div className="settings-info-icon">
              <MapPin size={18} />
            </div>

            <div className="settings-info-content">
              <span className="settings-info-label">
                Profile location
              </span>

              <span className="settings-info-value">
                {profile?.city
                  ? `${profile.city}, ${profile.state || ""}`
                  : "Location not available"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security footer */}
      <div className="settings-security-card">
        <div className="security-icon">
          <ShieldCheck size={19} />
        </div>

        <div>
          <div className="security-title">
            Your donor profile is protected
          </div>

          <div className="security-text">
            Your account information is securely stored
            and only used for BloodLink services.
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="settings-modal-footer">
        <button
          className="settings-done-button"
          onClick={() => setSettingsOpen(false)}
        >
          Done
        </button>
      </div>
    </div>
  </div>
)}

      {/* Request modal */}
      {selectedRequest && (
        <div
          className="request-modal-backdrop"
          onClick={() =>
            setSelectedRequest(null)
          }
        >
          <div
            className="request-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={() =>
                setSelectedRequest(null)
              }
              aria-label="Close"
            >
              <X size={17} />
            </button>

            <div className="modal-request-icon">
              <Droplets size={23} />
            </div>

            <span className="modal-eyebrow">
              EMERGENCY BLOOD REQUEST
            </span>

            <h2>
              {selectedRequest.blood} blood
              needed
            </h2>

            <p>
              A nearby hospital has requested
              compatible blood for an emergency
              case.
            </p>

            <div className="modal-request-info">
              <div>
                <MapPin size={15} />
                <span>Hospital</span>
                <strong>
                  {selectedRequest.hospital}
                </strong>
              </div>

              <div>
                <Navigation size={15} />
                <span>Distance</span>
                <strong>
                  {selectedRequest.distance}
                </strong>
              </div>

              <div>
                <Droplets size={15} />
                <span>Required</span>
                <strong>
                  {selectedRequest.units} unit
                  {selectedRequest.units > 1
                    ? "s"
                    : ""}
                </strong>
              </div>
            </div>

            <div className="modal-warning">
              <Zap size={16} />

              <div>
                <strong>
                  {selectedRequest.urgency}{" "}
                  priority
                </strong>

                <span>
                  Please respond only if you are
                  genuinely available to donate.
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="modal-cancel"
                disabled={actionLoading}
                onClick={() =>
                  setSelectedRequest(null)
                }
              >
                Maybe later
              </button>

              <button
                className="modal-respond"
                disabled={actionLoading}
                onClick={() =>
                  respondToRequest("ACCEPTED")
                }
              >
                {actionLoading
                  ? "Sending…"
                  : "I can help"}
                <ArrowRight size={15} />
              </button>

              <button
                className="modal-cancel"
                disabled={actionLoading}
                onClick={() =>
                  respondToRequest("REJECTED")
                }
              >
                Not available
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="dashboard-toast">
          {toast}
        </div>
      )}

      {error && (
        <div className="dashboard-toast">
          {error}
        </div>
      )}
    </main>
  );
}
