"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Info,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import {
  API_BASE_URL,
  authHeaders,
  clearAuth,
  getToken,
} from "../../../lib/api";

type BloodRequest = {
  _id: string;
  patientName?: string;
  bloodGroup?: string;
  unitsRequired?: number;
  hospitalName?: string;
  city?: string;
  state?: string;
  contactName?: string;
  contactPhone?: string;
  urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  status?: string;
  createdAt?: string;
  distanceKm?: number | null;
  location?: {
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  donorResponses?: Array<{
    donor?: string;
    status?: string;
    respondedAt?: string;
  }>;
};

type DonorSummary = {
  name?: string | null;
  bloodGroup?: string;
  city?: string | null;
  isAvailable?: boolean;
  emergencyAvailable?: boolean;
  medicalEligible?: boolean;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  count?: number;
  requests?: BloodRequest[];
  donor?: DonorSummary;
  compatibleBloodGroups?: string[];
};

const CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
.requestsPage{
  min-height:100vh;position:relative;overflow-x:hidden;color:#29151d;
  background:
    radial-gradient(circle at 87% 4%,rgba(255,194,213,.68),transparent 27%),
    radial-gradient(circle at 3% 56%,rgba(255,228,207,.58),transparent 25%),
    linear-gradient(145deg,#fffafb 0%,#fff4f7 49%,#fff 100%);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif
}
.requestsPage button{font:inherit}
.bgGrid{
  position:absolute;inset:0;pointer-events:none;opacity:.36;
  background-image:linear-gradient(rgba(158,36,65,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(158,36,65,.035) 1px,transparent 1px);
  background-size:64px 64px;mask-image:linear-gradient(to bottom,#000,transparent 80%)
}
.orb{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}.orb.a{width:400px;height:400px;right:-180px;top:120px;background:#ffc7d7aa}.orb.b{width:360px;height:360px;left:-190px;bottom:230px;background:#ffe0c8aa}
.shell{width:min(1200px,calc(100% - 40px));margin:auto;position:relative;z-index:2}
.nav{height:86px;border-bottom:1px solid rgba(130,35,53,.1);display:grid;grid-template-columns:1fr auto 1fr;align-items:center}
.back{justify-self:start;border:0;background:transparent;color:#6e5b61;display:flex;align-items:center;gap:10px;font-size:12px;font-weight:800;cursor:pointer}
.backIcon{width:35px;height:35px;border-radius:11px;display:grid;place-items:center;background:#ffffffd9;border:1px solid #eddde1;box-shadow:0 7px 22px #4b19200b}
.brand{display:flex;align-items:center;gap:11px}.brandIcon{width:41px;height:41px;border-radius:14px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#8e1732,#d23355);box-shadow:0 11px 30px #b11e4028}.brandName{display:block;font-size:17px;font-weight:950;letter-spacing:-.6px}.brandName span{color:#c82c4c}.brandSub{display:block;margin-top:4px;color:#9a858b;font-size:8px;font-weight:900;letter-spacing:1.55px}.secure{justify-self:end;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;color:#287e5a;background:#effaf5;border:1px solid #d6eee2;font-size:10px;font-weight:900}

/* hero */
.hero{display:grid;grid-template-columns:1fr 410px;gap:48px;align-items:center;padding:58px 0 38px}
.eyebrow{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;color:#b32645;background:#fff0f3;border:1px solid #f1d8de;font-size:9px;font-weight:950;letter-spacing:1.55px}
.hero h1{margin:17px 0 17px;font-size:clamp(46px,5.4vw,70px);line-height:.92;letter-spacing:-4.3px;font-weight:950}.hero h1 span{display:block;color:#b92445;font-style:italic}.heroText{max-width:630px;margin:0;color:#766267;font-size:14px;line-height:1.72}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}.chip{display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:10px;background:#ffffffb8;border:1px solid #eedee2;color:#7d6a70;font-size:9px;font-weight:800}.chip svg{color:#b52a48}

/* hero visual */
.matchVisual{height:300px;position:relative;display:grid;place-items:center}
.glow{position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,#ed5575 0%,#ed557500 68%);filter:blur(14px);opacity:.22}
.orbit{position:absolute;border:1px solid #cc35551f;border-radius:50%;transform:rotateX(65deg)}.orbit.one{width:380px;height:145px}.orbit.two{width:300px;height:120px;transform:rotateX(65deg) rotateZ(45deg)}.orbit.three{width:430px;height:170px;transform:rotateY(70deg) rotateZ(-12deg)}
.pulseCore{width:166px;height:166px;border-radius:50%;position:relative;display:grid;place-items:center;background:radial-gradient(circle at 32% 25%,#ff9bb0,#e33d61 24%,#b71943 58%,#6d102d 100%);box-shadow:inset -20px -25px 42px #4b071c77,inset 14px 10px 25px #ffb5c544,0 25px 65px #bf254a33;animation:floatCore 4.5s ease-in-out infinite}
@keyframes floatCore{50%{transform:translateY(-9px) rotateY(8deg)}}
.pulseCore:after{content:"";position:absolute;inset:13px;border:1px solid #ffffff2b;border-radius:50%}.coreBlood{font-size:30px;font-weight:950;color:#fff;letter-spacing:-1px;text-shadow:0 3px 18px #4b071c}.coreCaption{display:block;text-align:center;color:#ffd0d9;font-size:7px;letter-spacing:1.5px;font-weight:900;margin-top:3px}
.floatTag{position:absolute;padding:10px 12px;border-radius:13px;background:#ffffffd9;border:1px solid #efdee2;box-shadow:0 14px 35px #6f26340e;color:#806d73;font-size:8px;font-weight:850}.floatTag strong{display:block;color:#2c2024;font-size:10px;margin-top:3px}.tagA{top:8px;right:2px}.tagB{bottom:11px;left:3px}

/* summary */
.summary{display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:10px;margin:5px 0 28px}
.summaryCard{min-height:86px;padding:16px;border:1px solid #efdee2;border-radius:18px;background:#ffffffcf;box-shadow:0 10px 30px #4b192009}
.summaryCard.primary{background:linear-gradient(145deg,#5a1528,#8c1d3c);border-color:#7f2340;color:#fff}.summaryLabel{font-size:8px;font-weight:900;letter-spacing:1.2px;color:#9a858b}.primary .summaryLabel{color:#e9b9c5}.summaryValue{margin-top:5px;font-size:20px;font-weight:950;letter-spacing:-.7px}.summaryText{margin-top:4px;color:#8b777c;font-size:9px}.primary .summaryText{color:#d6aeba}.liveDot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#68dfa8;box-shadow:0 0 0 4px #68dfa81c;margin-right:6px}

/* controls */
.toolbar{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:17px}.toolbarTitle small{display:block;color:#b32645;font-size:8px;font-weight:950;letter-spacing:1.6px}.toolbarTitle h2{margin:6px 0 0;font-size:25px;letter-spacing:-.8px}.toolbarTitle p{margin:4px 0 0;color:#8b777c;font-size:10px}.actions{display:flex;gap:8px;align-items:center}.search{height:39px;width:200px;display:flex;align-items:center;gap:7px;padding:0 11px;border:1px solid #eddde1;border-radius:11px;background:#fff}.search svg{color:#a99399;flex:none}.search input{width:100%;border:0;outline:0;background:transparent;color:#342329;font-size:10px}.filter{height:39px;padding:0 11px;border:1px solid #eddde1;border-radius:11px;background:#fff;color:#806d73;font-size:9px;font-weight:850;cursor:pointer}.refresh{width:39px;height:39px;border:1px solid #eddde1;border-radius:11px;background:#fff;color:#b12546;display:grid;place-items:center;cursor:pointer}.refresh:disabled{opacity:.5;cursor:wait}

/* request cards */
.list{display:grid;gap:12px}.requestCard{position:relative;overflow:hidden;padding:19px;border:1px solid #efdee2;border-radius:21px;background:#ffffffdc;box-shadow:0 13px 38px #4b19200b;transition:.2s}.notification-request-wrapper{scroll-margin-top:110px;border-radius:24px}.notification-request-wrapper.focused{padding:4px;background:linear-gradient(135deg,#f8b4c6,#fff0f4,#f7c4d2);box-shadow:0 0 0 1px #e36a89,0 20px 55px #c42c5030;animation:notificationFocus 2.6s ease-out}.requestCard:hover{transform:translateY(-2px);box-shadow:0 18px 45px #4b192014}.requestCard.critical{border-color:#edb6c2;box-shadow:0 15px 42px #c42c5012}.requestCard.critical:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#c9274a}
.cardTop{display:flex;align-items:flex-start;gap:13px}.bloodBox{width:54px;height:54px;flex:none;border-radius:16px;display:grid;place-items:center;color:#b62143;background:#fff0f3;border:1px solid #f1d9df;font-size:16px;font-weight:950}.requestMain{min-width:0;flex:1}.requestTitle{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.requestTitle strong{font-size:14px}.urgency{padding:5px 7px;border-radius:999px;font-size:7px;font-weight:950;letter-spacing:.6px}.urgency.CRITICAL{color:#b21e3e;background:#ffe6eb}.urgency.HIGH{color:#b75b17;background:#fff0df}.urgency.MEDIUM{color:#90701c;background:#fff8dc}.urgency.LOW{color:#39795c;background:#e9f8ef}.hospital{margin-top:4px;color:#806d73;font-size:10px}.cardDistance{display:flex;align-items:center;gap:5px;color:#9b858b;font-size:9px}.cardDistance svg{color:#b52a48}
.details{display:flex;flex-wrap:wrap;gap:7px;margin:15px 0 14px}.detail{display:flex;align-items:center;gap:5px;padding:7px 8px;border-radius:9px;background:#faf5f6;color:#806d73;font-size:8px;font-weight:750}.detail svg{color:#b52a48}.detail strong{color:#3b292f}
.cardBottom{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #f1e5e7;padding-top:12px}.created{color:#a08d92;font-size:8px}.cardActions{display:flex;gap:7px}.reject{height:36px;padding:0 12px;border:1px solid #efdce1;border-radius:10px;background:#fff;color:#a56d78;font-size:9px;font-weight:850;cursor:pointer}.accept{height:36px;padding:0 13px;border:0;border-radius:10px;background:linear-gradient(135deg,#9e1c3a,#c82e50);color:#fff;font-size:9px;font-weight:900;box-shadow:0 8px 18px #b7234520;cursor:pointer}.reject:disabled,.accept:disabled{opacity:.5;cursor:wait}.responseBadge{display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:10px;font-size:8px;font-weight:900}.responseBadge.accepted{color:#237b57;background:#eaf8f1}.responseBadge.rejected{color:#a13a50;background:#fff0f2}

/* side */
.layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:26px}.sideCard{padding:19px;border:1px solid #efdee2;border-radius:20px;background:#ffffffc9;box-shadow:0 12px 34px #4b192009}.sideTitle{color:#b32645;font-size:8px;font-weight:950;letter-spacing:1.6px}.sideCard h3{margin:6px 0 5px;font-size:16px}.sideText{margin:0;color:#8b777c;font-size:9px;line-height:1.55}.statusLine{display:flex;align-items:center;gap:9px;margin-top:15px;padding:11px;border-radius:12px;background:#f7fcfa;border:1px solid #dceee6}.statusLine i{width:8px;height:8px;border-radius:50%;background:#30b77a;box-shadow:0 0 0 4px #30b77a18}.statusLine strong{font-size:9px;color:#39785e}.compat{display:flex;flex-wrap:wrap;gap:5px;margin-top:13px}.bloodPill{padding:6px 8px;border-radius:8px;background:#fff0f3;color:#b12546;font-size:8px;font-weight:900}
.sideLink{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:11px;border-radius:12px;background:#faf5f6;border:1px solid #f0e3e5;color:#7e6b71;text-decoration:none;font-size:9px;font-weight:800}.sideLink svg{color:#b52646}
.tip{display:flex;gap:8px;margin-top:12px;color:#7f6e73;font-size:9px;line-height:1.5}.tip svg{flex:none;color:#c32a4a}
.empty{padding:48px 22px;text-align:center;border:1px dashed #e7cdd3;border-radius:21px;background:#ffffff9c}.emptyIcon{width:56px;height:56px;margin:0 auto 13px;display:grid;place-items:center;border-radius:17px;background:#fff0f3;color:#b62445}.empty h3{margin:0;font-size:15px}.empty p{max-width:390px;margin:7px auto 0;color:#8b777c;font-size:10px;line-height:1.55}.emptyButton{margin-top:14px;height:36px;padding:0 13px;border:1px solid #efdce1;border-radius:10px;background:#fff;color:#b12546;font-size:9px;font-weight:900;cursor:pointer}

/* footer */
.footer{margin-top:65px;padding:48px 28px 25px;border-radius:30px 30px 0 0;color:#f8eef1;background:radial-gradient(circle at 85% 0%,rgba(234,67,105,.34),transparent 30%),radial-gradient(circle at 10% 70%,rgba(154,24,58,.3),transparent 35%),linear-gradient(135deg,#38131f 0%,#230c15 55%,#16080e 100%);box-shadow:0 -25px 70px rgba(116,19,48,.12)}
.footerTop{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:38px;padding-bottom:36px}.footerBrand{display:flex;align-items:center;gap:8px;color:#fff;font-size:16px;font-weight:950}.footerBrand span{color:#f15b7d}.footerDesc{max-width:320px;margin:11px 0 0;color:#b697a0;font-size:10px;line-height:1.7}.footerTitle{margin:0 0 12px;color:#f0dfe4;font-size:9px;font-weight:950;letter-spacing:1.35px}.footerLink{display:block;margin-top:8px;color:#a98b94;text-decoration:none;font-size:10px}.footerLink:hover{color:#ff8aa5}.footerBottom{display:flex;justify-content:space-between;gap:20px;padding-top:18px;border-top:1px solid #ffffff12;color:#856c75;font-size:9px}.footerSafe{display:flex;align-items:center;gap:6px;color:#6fb391}

/* states */
.error{margin-bottom:17px;padding:12px 14px;border:1px solid #f0c9d0;border-radius:13px;background:#fff0f2;color:#a21f3b;font-size:10px}
.loader{width:min(410px,calc(100% - 40px));margin:22vh auto;padding:32px;text-align:center;border:1px solid #efdee2;border-radius:24px;background:#fff;box-shadow:0 20px 65px #4a17221a}.loaderIcon{width:53px;height:53px;margin:0 auto 14px;display:grid;place-items:center;border-radius:16px;background:#fff0f3;color:#b92343}.loader strong{display:block;font-size:14px}.loader span{display:block;margin-top:6px;color:#8c797e;font-size:10px}.toast{position:fixed;right:22px;bottom:22px;z-index:30;display:flex;align-items:center;gap:8px;padding:12px 15px;border-radius:13px;background:#21191c;color:#fff;box-shadow:0 18px 50px #0003;font-size:10px;font-weight:850}.toast svg{color:#65d5a0}

@keyframes notificationFocus{0%{box-shadow:0 0 0 4px #d71b5240,0 24px 70px #c42c5040}55%{box-shadow:0 0 0 7px #d71b521f,0 20px 55px #c42c5030}100%{box-shadow:0 0 0 0 transparent,0 0 0 transparent}}
@media(max-width:930px){.nav{grid-template-columns:1fr auto}.brand{display:none}.hero{grid-template-columns:1fr}.matchVisual{height:380px}.summary{grid-template-columns:1fr 1fr}.layout{grid-template-columns:1fr}.footerTop{grid-template-columns:1.5fr 1fr 1fr}.footerTop>div:last-child{display:none}}
@media(max-width:620px){.shell{width:min(100% - 24px,520px)}.nav{height:74px}.back{font-size:11px}.secure{width:35px;height:35px;padding:0;justify-content:center;font-size:0}.hero{padding:36px 0 24px}.hero h1{font-size:44px;letter-spacing:-3px}.matchVisual{height:310px}.pulseCore{width:135px;height:135px}.coreBlood{font-size:26px}.orbit.one{width:310px;height:120px}.orbit.two{width:245px;height:100px}.orbit.three{width:345px;height:135px}.floatTag{transform:scale(.9)}.summary{grid-template-columns:1fr 1fr}.toolbar{align-items:stretch;flex-direction:column}.actions{width:100%}.search{flex:1;width:auto}.requestCard{padding:15px}.cardTop{gap:9px}.bloodBox{width:47px;height:47px;font-size:14px}.cardBottom{align-items:flex-start;flex-direction:column}.cardActions{width:100%}.reject,.accept{flex:1}.footer{padding:34px 18px 22px}.footerTop{grid-template-columns:1fr 1fr;gap:27px}.footerTop>div:first-child{grid-column:1/-1}.footerBottom{flex-direction:column;align-items:flex-start;gap:8px}}
`;

export default function DonorRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("request");

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [focusedRequestId, setFocusedRequestId] = useState<string | null>(
    requestedId
  );
  const [donor, setDonor] = useState<DonorSummary | null>(null);
  const [compatible, setCompatible] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [urgency, setUrgency] = useState("ALL");

  const loadRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    setError("");

    try {
      if (!getToken()) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/blood-requests/donor/available`,
        {
          headers: authHeaders(),
          cache: "no-store",
        }
      );

      if (response.status === 401 || response.status === 403) {
        const data = await response.json().catch(() => ({}));
        clearAuth();
        if (response.status === 403 && data.message) {
          setError(data.message);
          return;
        }
        window.location.href = "/login";
        return;
      }

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load blood requests."
        );
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setDonor(data.donor || null);
      setCompatible(
        Array.isArray(data.compatibleBloodGroups)
          ? data.compatibleBloodGroups
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load blood requests."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setFocusedRequestId(requestedId);
  }, [requestedId]);

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (!focusedRequestId || loading) return;

    const target = document.getElementById(
      `donor-request-${focusedRequestId}`
    );

    if (!target) return;

    const timer = window.setTimeout(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      target.classList.add("notification-focused");

      window.setTimeout(() => {
        target.classList.remove("notification-focused");
      }, 2600);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [focusedRequestId, loading, requests]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const respond = async (
    requestId: string,
    status: "ACCEPTED" | "REJECTED"
  ) => {
    setRespondingId(requestId);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/blood-requests/${requestId}/respond`,
        {
          method: "PATCH",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ status }),
        }
      );

      if (response.status === 401 || response.status === 403) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to submit your response."
        );
      }

      setRequests((current) =>
        current.filter((request) => request._id !== requestId)
      );

      showToast(
        status === "ACCEPTED"
          ? "Request accepted successfully."
          : "Request declined."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit your response."
      );
    } finally {
      setRespondingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const filtered = requests.filter((request) => {
      const matchesSearch =
        !normalized ||
        [
          request.patientName,
          request.hospitalName,
          request.city,
          request.state,
          request.bloodGroup,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalized)
          );

      const matchesUrgency =
        urgency === "ALL" ||
        String(request.urgency).toUpperCase() === urgency;

      return matchesSearch && matchesUrgency;
    });

    if (!focusedRequestId) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      if (a._id === focusedRequestId) return -1;
      if (b._id === focusedRequestId) return 1;
      return 0;
    });
  }, [requests, query, urgency, focusedRequestId]);

  const criticalCount = requests.filter(
    (request) =>
      String(request.urgency).toUpperCase() === "CRITICAL"
  ).length;

  const highCount = requests.filter(
    (request) =>
      String(request.urgency).toUpperCase() === "HIGH"
  ).length;

  const available = donor?.isAvailable === true;

  if (loading) {
    return (
      <main className="requestsPage">
        <div className="bgGrid" />
        <div className="orb a" />
        <div className="orb b" />
        <div className="loader">
          <div className="loaderIcon">
            <HeartPulse size={25} />
          </div>
          <strong>Finding compatible requests</strong>
          <span>Checking your live donor network…</span>
        </div>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </main>
    );
  }

  return (
    <main className="requestsPage">
      <div className="bgGrid" />
      <div className="orb a" />
      <div className="orb b" />

      <div className="shell">
        <header className="nav">
          <button
            className="back"
            onClick={() => router.push("/donor")}
          >
            <span className="backIcon">
              <ArrowLeft size={17} />
            </span>
            Back to dashboard
          </button>

          <div className="brand">
            <div className="brandIcon">
              <HeartPulse size={18} />
            </div>
            <div>
              <strong className="brandName">
                BloodLink<span>AI</span>
              </strong>
              <small className="brandSub">
                DONOR REQUESTS
              </small>
            </div>
          </div>

          <div className="secure">
            <ShieldCheck size={14} />
            Secure
          </div>
        </header>

        <section className="hero">
          <div>
            <div className="eyebrow">
              <Radio size={12} />
              LIVE BLOOD NETWORK
            </div>

            <h1>
              Requests that
              <span>need you.</span>
            </h1>

            <p className="heroText">
              BloodLink shows open requests compatible with your donor
              profile, filtered by your availability, eligibility,
              blood-group compatibility and location.
            </p>

            <div className="meta">
              <span className="chip">
                <HeartPulse size={12} />
                {donor?.bloodGroup || "Blood group not set"}
              </span>
              <span className="chip">
                <MapPin size={12} />
                {donor?.city || "Location not set"}
              </span>
              <span className="chip">
                <ShieldCheck size={12} />
                {donor?.medicalEligible
                  ? "Eligible"
                  : "Eligibility required"}
              </span>
            </div>
          </div>

          <div className="matchVisual">
            <div className="glow" />
            <div className="orbit one" />
            <div className="orbit two" />
            <div className="orbit three" />

            <div className="pulseCore">
              <div>
                <div className="coreBlood">
                  {donor?.bloodGroup || "--"}
                </div>
                <small className="coreCaption">
                  YOUR DONOR GROUP
                </small>
              </div>
            </div>

            <div className="floatTag tagA">
              LIVE MATCHES
              <strong>{requests.length} requests</strong>
            </div>

            <div className="floatTag tagB">
              NETWORK STATUS
              <strong>
                {available ? "Available" : "Paused"}
              </strong>
            </div>
          </div>
        </section>

        {error && <div className="error">{error}</div>}

        <section className="summary">
          <div className="summaryCard primary">
            <div className="summaryLabel">
              <span className="liveDot" />
              LIVE FEED
            </div>
            <div className="summaryValue">
              {requests.length} open
            </div>
            <div className="summaryText">
              Compatible donor requests
            </div>
          </div>

          <div className="summaryCard">
            <div className="summaryLabel">
              CRITICAL
            </div>
            <div className="summaryValue">
              {criticalCount}
            </div>
            <div className="summaryText">
              Immediate attention
            </div>
          </div>

          <div className="summaryCard">
            <div className="summaryLabel">
              HIGH PRIORITY
            </div>
            <div className="summaryValue">
              {highCount}
            </div>
            <div className="summaryText">
              Urgent requests
            </div>
          </div>

          <div className="summaryCard">
            <div className="summaryLabel">
              STATUS
            </div>
            <div className="summaryValue">
              {available ? "ON" : "OFF"}
            </div>
            <div className="summaryText">
              Donor availability
            </div>
          </div>
        </section>

        <section className="layout">
          <div>
            <div className="toolbar">
              <div className="toolbarTitle">
                <small>COMPATIBLE REQUESTS</small>
                <h2>Help someone nearby.</h2>
                <p>
                  Respond directly to a request when you are ready to help.
                </p>
              </div>

              <div className="actions">
                <label className="search">
                  <Search size={14} />
                  <input
                    value={query}
                    onChange={(event) =>
                      setQuery(event.target.value)
                    }
                    placeholder="Search hospital, city..."
                  />
                </label>

                <select
                  className="filter"
                  value={urgency}
                  onChange={(event) =>
                    setUrgency(event.target.value)
                  }
                  aria-label="Filter by urgency"
                >
                  <option value="ALL">All</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <button
                  className="refresh"
                  onClick={() => loadRequests(true)}
                  disabled={refreshing}
                  aria-label="Refresh requests"
                >
                  <RefreshCw
                    size={15}
                    style={{
                      animation: refreshing
                        ? "spin 1s linear infinite"
                        : undefined,
                    }}
                  />
                </button>
              </div>
            </div>

            {!available && requests.length === 0 ? (
              <div className="empty">
                <div className="emptyIcon">
                  <Radio size={25} />
                </div>
                <h3>Your donor availability is off</h3>
                <p>
                  Turn on availability to let BloodLink find and show
                  compatible blood requests for your donor profile.
                </p>
                <button
                  className="emptyButton"
                  onClick={() =>
                    router.push("/donor/availability")
                  }
                >
                  Manage availability
                </button>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="empty">
                <div className="emptyIcon">
                  <Search size={24} />
                </div>
                <h3>No matching requests right now</h3>
                <p>
                  There are no open requests matching your current filters.
                  You can refresh the network or check again later.
                </p>
                <button
                  className="emptyButton"
                  onClick={() => {
                    setQuery("");
                    setUrgency("ALL");
                    loadRequests(true);
                  }}
                >
                  Clear filters & refresh
                </button>
              </div>
            ) : (
              <div className="list">
                {filteredRequests.map((request) => (
                  <div
                    key={request._id}
                    id={`donor-request-${request._id}`}
                    className={
                      request._id === focusedRequestId
                        ? "notification-request-wrapper focused"
                        : "notification-request-wrapper"
                    }
                  >
                    <RequestCard
                      request={request}
                    responding={respondingId === request._id}
                    onAccept={() =>
                      respond(request._id, "ACCEPTED")
                    }
                    onReject={() =>
                      respond(request._id, "REJECTED")
                    }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside>
            <div className="sideCard">
              <div className="sideTitle">
                YOUR MATCHING PROFILE
              </div>

              <h3>
                {donor?.name || "BloodLink Donor"}
              </h3>

              <p className="sideText">
                Requests are personalized using the donor information
                available to the matching service.
              </p>

              <div className="statusLine">
                <i />
                <strong>
                  {available
                    ? "Available for matching"
                    : "Currently unavailable"}
                </strong>
              </div>

              <div className="compat">
                {compatible.length > 0 ? (
                  compatible.map((group) => (
                    <span
                      className="bloodPill"
                      key={group}
                    >
                      {group}
                    </span>
                  ))
                ) : (
                  <span className="bloodPill">
                    {donor?.bloodGroup || "Not set"}
                  </span>
                )}
              </div>
            </div>

            <div className="sideCard" style={{ marginTop: 12 }}>
              <div className="sideTitle">
                QUICK ACTIONS
              </div>

              <a
                className="sideLink"
                href="/donor/availability"
              >
                Availability
                <ArrowUpRight size={13} />
              </a>

              <a
                className="sideLink"
                href="/donor/donation-history"
              >
                Donation history
                <ArrowUpRight size={13} />
              </a>

              <a
                className="sideLink"
                href="/donor/profile"
              >
                Donor profile
                <ArrowUpRight size={13} />
              </a>
            </div>

            <div className="sideCard" style={{ marginTop: 12 }}>
              <div className="sideTitle">
                BEFORE YOU ACCEPT
              </div>

              <Tip icon={<ShieldCheck size={12} />}>
                Confirm you are currently available and medically eligible.
              </Tip>
              <Tip icon={<MapPin size={12} />}>
                Review the hospital and location before responding.
              </Tip>
              <Tip icon={<Zap size={12} />}>
                Critical requests are surfaced with higher urgency.
              </Tip>
              <Tip icon={<Info size={12} />}>
                Once you respond, the backend records your donor response.
              </Tip>
            </div>
          </aside>
        </section>

        <footer className="footer">
          <div className="footerTop">
            <div>
              <div className="footerBrand">
                <div className="brandIcon">
                  <HeartPulse size={16} />
                </div>
                BloodLink<span>AI</span>
              </div>
              <p className="footerDesc">
                Building a faster, connected blood-response network where
                compatible donors can reach people when time matters.
              </p>
            </div>

            <div>
              <h4 className="footerTitle">DONOR</h4>
              <a className="footerLink" href="/donor">
                Dashboard
              </a>
              <a className="footerLink" href="/donor/profile">
                Profile
              </a>
              <a className="footerLink" href="/donor/availability">
                Availability
              </a>
              <a className="footerLink" href="/donor/settings">
                Settings
              </a>
            </div>

            <div>
              <h4 className="footerTitle">ACTIVITY</h4>
              <a className="footerLink" href="/donor/requests">
                Blood requests
              </a>
              <a className="footerLink" href="/donor/donation-history">
                Donation history
              </a>
              <a className="footerLink" href="/eligibility">
                Eligibility
              </a>
            </div>

            <div>
              <h4 className="footerTitle">PLATFORM</h4>
              <a className="footerLink" href="/blood-bank">
                Blood network
              </a>
              <a className="footerLink" href="/">
                AI matching
              </a>
              <a className="footerLink" href="/contact">
                Help center
              </a>
            </div>
          </div>

          <div className="footerBottom">
            <span>
              © 2026 BloodLink AI · Donor request center
            </span>
            <span className="footerSafe">
              <ShieldCheck size={12} />
              Protected donor environment
            </span>
          </div>
        </footer>
      </div>

      {toast && (
        <div className="toast">
          <Check size={14} />
          {toast}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </main>
  );
}

function RequestCard({
  request,
  responding,
  onAccept,
  onReject,
}: {
  request: BloodRequest;
  responding: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const urgency = String(
    request.urgency || "MEDIUM"
  ).toUpperCase();

  const distance =
    request.distanceKm == null
      ? "Distance unavailable"
      : `${request.distanceKm} km away`;

  const created = request.createdAt
    ? new Date(request.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recently posted";

  return (
    <article
      className={
        urgency === "CRITICAL"
          ? "requestCard critical"
          : "requestCard"
      }
    >
      <div className="cardTop">
        <div className="bloodBox">
          {request.bloodGroup || "--"}
        </div>

        <div className="requestMain">
          <div className="requestTitle">
            <strong>
              {request.patientName || "Blood request"}
            </strong>
            <span className={`urgency ${urgency}`}>
              {urgency}
            </span>
          </div>

          <div className="hospital">
            {request.hospitalName || "Hospital / care center"}
          </div>
        </div>

        <div className="cardDistance">
          <MapPin size={12} />
          {distance}
        </div>
      </div>

      <div className="details">
        <span className="detail">
          <HeartPulse size={12} />
          <strong>
            {request.unitsRequired ?? "--"} unit
            {request.unitsRequired === 1 ? "" : "s"}
          </strong>
        </span>

        <span className="detail">
          <Navigation size={12} />
          <strong>
            {[request.city, request.state]
              .filter(Boolean)
              .join(", ") || "Location unavailable"}
          </strong>
        </span>

        {request.contactName && (
          <span className="detail">
            <UsersRound size={12} />
            <strong>{request.contactName}</strong>
          </span>
        )}

        <span className="detail">
          <Clock3 size={12} />
          <strong>{created}</strong>
        </span>
      </div>

      <div className="cardBottom">
        <span className="created">
          Request status:{" "}
          {request.status || "OPEN"}
        </span>

        <div className="cardActions">
          <button
            className="reject"
            disabled={responding}
            onClick={onReject}
          >
            <X size={12} style={{ verticalAlign: "middle" }} /> Decline
          </button>

          <button
            className="accept"
            disabled={responding}
            onClick={onAccept}
          >
            {responding ? (
              "SAVING..."
            ) : (
              <>
                <Check
                  size={12}
                  style={{ verticalAlign: "middle" }}
                />{" "}
                Accept request
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function Tip({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="tip">
      {icon}
      <span>{children}</span>
    </div>
  );
}
