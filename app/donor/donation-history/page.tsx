"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Droplets,
  HeartPulse,
  Hospital,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  API_BASE_URL,
  authHeaders,
  clearAuth,
  getToken,
} from "../../../lib/api";

type DonationStatus =
  | "VERIFIED"
  | "PENDING_VERIFICATION"
  | "REJECTED"
  | string;

type Donation = {
  id: string;
  donationDate: string | null;
  bloodGroup: string;
  unitsDonated: number;
  status: DonationStatus;
  isVerified: boolean;
  city: string;
  hospitalName: string;
  donationCenterName: string;
  rejectionReason: string;
  notes: string;
  bloodRequestId?: string;
  patientName?: string;
  requestStatus?: string;
  raw: any;
};

const statusLabel = (status: DonationStatus) => {
  if (status === "VERIFIED") return "Completed";
  if (status === "PENDING_VERIFICATION") return "Pending verification";
  if (status === "REJECTED") return "Rejected";
  return status.replaceAll("_", " ");
};

const formatDate = (date?: string | null) => {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatLongDate = (date?: string | null) => {
  if (!date) return "—";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const statusClass = (status: DonationStatus) => {
  if (status === "VERIFIED") return "verified";
  if (status === "PENDING_VERIFICATION") return "pending";
  if (status === "REJECTED") return "rejected";
  return "other";
};

export default function DonationHistoryPage() {
  const router = useRouter();

  const [donor, setDonor] = useState<any>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [selected, setSelected] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<
    "ALL" | "VERIFIED" | "PENDING_VERIFICATION" | "REJECTED"
  >("ALL");
  const [search, setSearch] = useState("");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const loadHistory = async (isRefresh = false) => {
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
      const [profileRes, donationsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/donors/profile`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/api/donations/my`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
      ]);

      if (
        [profileRes, donationsRes].some(
          (response) => response.status === 401 || response.status === 403
        )
      ) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      const profileData = await profileRes.json();
      const donationData = await donationsRes.json();

      if (!profileRes.ok) {
        throw new Error(
          profileData.message || "Unable to load donor profile."
        );
      }

      if (!donationsRes.ok) {
        throw new Error(
          donationData.message || "Unable to load donation history."
        );
      }

      setDonor(profileData.donor || null);

      const rows = Array.isArray(donationData.donations)
        ? donationData.donations
        : [];

      const mapped: Donation[] = rows.map((donation: any) => ({
        id: String(donation._id),
        donationDate: donation.donationDate || null,
        bloodGroup:
          donation.bloodGroup ||
          profileData.donor?.bloodGroup ||
          "—",
        unitsDonated: Number(donation.unitsDonated || 0),
        status: donation.status || "UNKNOWN",
        isVerified: Boolean(donation.isVerified),
        city:
          donation.city ||
          donation.bloodRequest?.city ||
          profileData.donor?.location?.city ||
          "Location unavailable",
        hospitalName:
          donation.bloodRequest?.hospitalName ||
          donation.donationCenter?.name ||
          "Blood Bank",
        donationCenterName:
          donation.donationCenter?.name || "Blood Bank",
        rejectionReason: donation.rejectionReason || "",
        notes: donation.notes || "",
        bloodRequestId: donation.bloodRequest?._id
          ? String(donation.bloodRequest._id)
          : undefined,
        patientName: donation.bloodRequest?.patientName,
        requestStatus: donation.bloodRequest?.status,
        raw: donation,
      }));

      setDonations(mapped);
      setLastSynced(new Date());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load donation history."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const stats = useMemo(() => {
    const completed = donations.filter(
      (item) => item.status === "VERIFIED"
    );
    const pending = donations.filter(
      (item) => item.status === "PENDING_VERIFICATION"
    );
    const rejected = donations.filter(
      (item) => item.status === "REJECTED"
    );

    const totalUnits = completed.reduce(
      (sum, item) => sum + item.unitsDonated,
      0
    );

    const lastCompleted = completed
      .filter((item) => item.donationDate)
      .sort(
        (a, b) =>
          new Date(b.donationDate || 0).getTime() -
          new Date(a.donationDate || 0).getTime()
      )[0];

    return {
      completed: completed.length,
      pending: pending.length,
      rejected: rejected.length,
      totalUnits,
      lastCompleted,
    };
  }, [donations]);

  const filteredDonations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return donations.filter((item) => {
      const matchesFilter =
        filter === "ALL" || item.status === filter;

      if (!matchesFilter) return false;
      if (!query) return true;

      return [
        item.hospitalName,
        item.donationCenterName,
        item.city,
        item.bloodGroup,
        item.patientName || "",
        statusLabel(item.status),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [donations, filter, search]);

  return (
    <main className="donation-page">
      <div className="page-atmosphere"><div className="atmo-a"/><div className="atmo-b"/><div className="atmo-grid"/></div>
      <div className="donation-shell">
        <header className="donor-nav">
          <button className="donor-brand" onClick={() => router.push("/donor")}>
            <span className="donor-brand-mark"><HeartPulse size={18}/></span>
            <span className="donor-brand-copy"><strong>BloodLink<span>AI</span></strong><small>DONOR INTELLIGENCE NETWORK</small></span>
          </button>
          <nav className="donor-nav-links">
            {[
              ["/donor","Overview"],["/donor/profile","My Profile"],["/donor/requests","Emergency Requests"],
              ["/donor/ai-matching","AI Matching"],["/donor/availability","Availability"],
              ["/donor/donation-history","Donation History"],["/eligibility","Eligibility"]
            ].map(([href,label]) => (
              <button key={href} className={href === "/donor/donation-history" ? "active" : ""} onClick={() => router.push(href)}>
                {label}{label === "Emergency Requests" && <i/>}
              </button>
            ))}
          </nav>
          <div className="donor-nav-actions">
            <span className="network-live"><i/> Network live</span>
            <button className="nav-icon-btn" onClick={() => router.push("/donor/profile")}><ShieldCheck size={16}/></button>
            <button className="nav-avatar" onClick={() => router.push("/donor/profile")}>{(donor?.name || donor?.user?.name || "D").slice(0,1).toUpperCase()}</button>
          </div>
        </header>

        {error && <div className="error-strip"><TriangleAlert size={16}/><span>{error}</span><button onClick={() => loadHistory(true)}>Retry</button></div>}

        <section className="history-hero-v2">
          <div className="hero-v2-copy">
            <div className="eyebrow-v2"><Sparkles size={13}/> VERIFIED DONOR RECORD</div>
            <h1>Your donations.<span>Your legacy.</span></h1>
            <p>One secure timeline for every donation recorded against your BloodLink donor identity — verification, location, blood group and units in one place.</p>
            <div className="hero-v2-actions">
              <button className="hero-primary" onClick={() => document.getElementById("ledger")?.scrollIntoView({behavior:"smooth"})}><Activity size={15}/> View donation ledger</button>
              <button className="hero-secondary" onClick={() => loadHistory(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "spin" : ""}/>{refreshing ? "Syncing…" : "Sync records"}</button>
            </div>
            <div className="hero-proof"><span><i/> Authenticated account</span><span><ShieldCheck size={12}/> Backend verified data</span>{lastSynced && <span>Synced {lastSynced.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</span>}</div>
          </div>
          <div className="hero-v2-visual">
            <div className="hero-orbit orbit-1"/><div className="hero-orbit orbit-2"/><div className="hero-orbit orbit-3"/>
            <div className="hero-glass-card"><div className="mini-label">DONOR IMPACT</div><div className="impact-number">{stats.completed}</div><div className="impact-title">verified donations</div><div className="impact-line"><span><Droplets size={13}/> {stats.totalUnits} units</span><span><CheckCircle2 size={13}/> {stats.pending} pending</span></div></div>
            <div className="hero-blood-orb"><Droplets size={42}/><strong>{donor?.bloodGroup || "—"}</strong><small>YOUR GROUP</small></div>
            <div className="floating-tag tag-top"><CheckCircle2 size={13}/> Verified network record</div>
            <div className="floating-tag tag-bottom"><CalendarDays size={13}/> {stats.lastCompleted?.donationDate ? formatDate(stats.lastCompleted.donationDate) : "Awaiting first donation"}</div>
          </div>
        </section>

        <section className="stat-strip">
          <StatCard icon={<CheckCircle2 size={18}/>} label="Verified donations" value={String(stats.completed)} tone="green"/>
          <StatCard icon={<Droplets size={18}/>} label="Units donated" value={String(stats.totalUnits)} tone="red"/>
          <StatCard icon={<Clock3 size={18}/>} label="Pending verification" value={String(stats.pending)} tone="amber"/>
          <StatCard icon={<CalendarDays size={18}/>} label="Last verified donation" value={stats.lastCompleted?.donationDate ? formatDate(stats.lastCompleted.donationDate) : "Not recorded"} tone="purple"/>
        </section>

        <section id="ledger" className="ledger-layout">
          <div className="ledger-main">
            <div className="ledger-head">
              <div><div className="section-kicker"><span/> DONATION LEDGER</div><h2>Donation history</h2><p>Every recorded donation, organized as a secure donor timeline.</p></div>
              <div className="record-count"><strong>{filteredDonations.length}</strong><span>records shown</span></div>
            </div>
            <div className="ledger-toolbar">
              <div className="filter-pills">
                {([["ALL","All",donations.length],["VERIFIED","Verified",stats.completed],["PENDING_VERIFICATION","Pending",stats.pending],["REJECTED","Rejected",stats.rejected]] as const).map(([value,label,count]) => (
                  <button key={value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>{label}<b>{count}</b></button>
                ))}
              </div>
              <div className="ledger-search"><Activity size={14}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hospital, city, group…"/>{search && <button onClick={() => setSearch("")}>×</button>}</div>
            </div>
            {loading ? <LoadingRows/> : filteredDonations.length === 0 ? <EmptyHistory filtered={filter !== "ALL" || Boolean(search)} onReset={() => {setFilter("ALL");setSearch("")}}/> : <div className="ledger-list">{filteredDonations.map((donation,index) => <DonationRow key={donation.id} donation={donation} index={index} onView={() => setSelected(donation)}/>)}</div>}
          </div>

          <aside className="ledger-side">
            <div className="integrity-card">
              <div className="integrity-top"><span className="integrity-icon"><ShieldCheck size={18}/></span><span className="secure-pill"><i/> SECURE</span></div>
              <span className="side-kicker">RECORD INTEGRITY</span>
              <h3>One donor identity.<br/>One trusted ledger.</h3>
              <p>Your history is read from the authenticated BloodLink account. This page does not manufacture donation records.</p>
              <div className="integrity-meter"><i style={{width:"100%"}}/></div>
              <div className="integrity-foot"><span>API connection</span><b>Operational</b></div>
            </div>
            <div className="impact-side-card">
              <div className="side-kicker">YOUR NEXT MILESTONE</div>
              <div className="milestone-row"><div className="milestone-ring"><span>{Math.min(stats.completed,3)}</span><small>/ 3</small></div><div><strong>{stats.completed >= 3 ? "Milestone reached" : `${3 - stats.completed} donation${3-stats.completed === 1 ? "" : "s"} to go`}</strong><p>Keep your donor profile active and verified.</p></div></div>
            </div>
            <button className="profile-link-card" onClick={() => router.push("/donor/profile")}><span><HeartPulse size={17}/></span><div><strong>Donor profile</strong><small>Manage identity & availability</small></div><ArrowRight size={15}/></button>
          </aside>
        </section>

        <footer className="donor-footer">
          <div className="footer-aura"/>
          <div className="footer-grid">
            <div className="footer-about"><div className="footer-brand"><span><Droplets size={18}/></span><div><strong>BloodLink<span>AI</span></strong><small>DONATE · SAVE · REPEAT</small></div></div><p>Intelligent donor coordination designed to move compatible blood to people who need it, faster.</p><div className="footer-protected"><ShieldCheck size={13}/> Protected donor environment</div></div>
            <div className="footer-col"><b>DONOR</b><button onClick={()=>router.push("/donor")}>Dashboard</button><button onClick={()=>router.push("/donor/profile")}>My Profile</button><button onClick={()=>router.push("/donor/requests")}>Emergency Requests</button><button onClick={()=>router.push("/donor/availability")}>Availability</button></div>
            <div className="footer-col"><b>INTELLIGENCE</b><button onClick={()=>router.push("/donor/ai-matching")}>AI Matching</button><button onClick={()=>router.push("/donor/donation-history")}>Donation History</button><button onClick={()=>router.push("/eligibility")}>Eligibility</button><button onClick={()=>router.push("/donor/profile")}>Settings</button></div>
            <div className="footer-col"><b>PLATFORM</b><button onClick={()=>router.push("/")}>Blood Network</button><button onClick={()=>router.push("/donor")}>Network</button><button onClick={()=>router.push("/eligibility")}>Help Center</button><button onClick={()=>router.push("/")}>Contact</button></div>
          </div>
          <div className="footer-bottom-v2"><span>© 2026 BloodLink AI · Donor Intelligence Network</span><span className="footer-live"><i/> All systems operational</span><span>Privacy · Terms · Security</span></div>
        </footer>
      </div>

      {selected && <DonationModal donation={selected} onClose={() => setSelected(null)} />}

      <style jsx global>{`
        *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff5f8}
        .donation-page{min-height:100vh;position:relative;overflow:hidden;color:#281a24;background:linear-gradient(180deg,#fffafd 0%,#fff3f7 48%,#fffafd 100%);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .page-atmosphere{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}.atmo-a,.atmo-b{position:absolute;border-radius:50%;filter:blur(100px)}.atmo-a{width:560px;height:560px;left:-220px;top:160px;background:rgba(235,58,107,.12)}.atmo-b{width:620px;height:620px;right:-260px;top:80px;background:rgba(255,150,188,.16)}.atmo-grid{position:absolute;inset:0;opacity:.17;background-image:linear-gradient(rgba(133,25,65,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(133,25,65,.035) 1px,transparent 1px);background-size:64px 64px;mask-image:linear-gradient(to bottom,#000,transparent 90%)}
        .donation-shell{position:relative;z-index:2;width:min(1540px,calc(100% - 42px));margin:auto;padding:18px 0 0}
        .donor-nav{height:68px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:26px;padding:0 14px;border:1px solid rgba(111,28,60,.08);border-radius:23px;background:rgba(255,255,255,.84);box-shadow:0 18px 60px rgba(87,20,47,.08);backdrop-filter:blur(24px)}
        .donor-brand{display:flex;align-items:center;gap:10px;border:0;background:none;padding:0;cursor:pointer;text-align:left}.donor-brand-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;color:#fff;background:linear-gradient(145deg,#f35a82,#c60d46);box-shadow:0 10px 28px rgba(199,13,70,.22)}.donor-brand-copy strong{display:block;font-size:14px;letter-spacing:-.03em;color:#2d2028}.donor-brand-copy strong span{color:#d81b51}.donor-brand-copy small{display:block;margin-top:3px;color:#9a8790;font-size:6px;font-weight:950;letter-spacing:.16em}
        .donor-nav-links{display:flex;justify-content:center;align-items:center;gap:4px;min-width:0}.donor-nav-links button{position:relative;border:0;background:transparent;padding:11px 9px;border-radius:11px;color:#74646c;font-size:8px;font-weight:900;cursor:pointer;white-space:nowrap;transition:.2s}.donor-nav-links button:hover{color:#c7174b;background:#fff3f7}.donor-nav-links button.active{color:#d51b52;background:#fff0f5}.donor-nav-links button.active::after{content:"";position:absolute;left:50%;bottom:3px;width:18px;height:2px;border-radius:99px;background:#e11c56;transform:translateX(-50%)}.donor-nav-links button i{display:inline-block;width:5px;height:5px;margin-left:5px;border-radius:50%;background:#39ad79;box-shadow:0 0 0 3px rgba(57,173,121,.08)}
        .donor-nav-actions{display:flex;align-items:center;gap:8px}.network-live{display:flex;align-items:center;gap:6px;padding:9px 11px;border:1px solid #e5efe9;border-radius:999px;color:#5e7569;background:#fbfffd;font-size:7px;font-weight:900;white-space:nowrap}.network-live i,.footer-live i{width:6px;height:6px;border-radius:50%;background:#2db47a;box-shadow:0 0 0 4px rgba(45,180,122,.08)}.nav-icon-btn,.nav-avatar{width:36px;height:36px;display:grid;place-items:center;border:1px solid #eee1e6;border-radius:11px;background:#fff;color:#8d6977;cursor:pointer}.nav-avatar{border-radius:12px;color:#fff;background:linear-gradient(145deg,#ef648c,#ca154c);font-size:10px;font-weight:950}
        .error-strip{margin-top:12px;display:flex;align-items:center;gap:9px;padding:11px 14px;border:1px solid #f1c7d5;border-radius:14px;color:#a92c50;background:#fff6f9;font-size:10px}.error-strip button{margin-left:auto;border:0;background:none;color:#c9164a;font-weight:950;cursor:pointer}
        .history-hero-v2{min-height:535px;margin-top:20px;display:grid;grid-template-columns:1.05fr .95fr;overflow:hidden;position:relative;border:1px solid rgba(255,255,255,.96);border-radius:38px;background:linear-gradient(135deg,rgba(255,255,255,.93),rgba(255,243,248,.86));box-shadow:0 34px 100px rgba(90,17,46,.09);isolation:isolate}.history-hero-v2::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 76% 50%,rgba(238,46,100,.12),transparent 32%),radial-gradient(circle at 8% 10%,rgba(255,210,224,.42),transparent 30%);z-index:-1}.hero-v2-copy{padding:70px 40px 65px 72px;align-self:center}.eyebrow-v2{display:inline-flex;align-items:center;gap:7px;padding:9px 13px;border:1px solid #f2d3de;border-radius:999px;color:#d41950;background:#fff5f8;font-size:8px;font-weight:950;letter-spacing:.18em}.hero-v2-copy h1{margin:22px 0 0;max-width:700px;font-size:clamp(58px,6.2vw,94px);line-height:.89;letter-spacing:-.075em;font-weight:950;color:#281923}.hero-v2-copy h1 span{display:block;color:#d71b52}.hero-v2-copy p{max-width:620px;margin:25px 0 0;color:#718096;font-size:14px;line-height:1.8}.hero-v2-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:27px}.hero-primary,.hero-secondary{display:flex;align-items:center;gap:7px;padding:12px 15px;border-radius:12px;font-size:8px;font-weight:950;cursor:pointer}.hero-primary{border:1px solid #d91d55;color:#fff;background:linear-gradient(145deg,#ee4e7a,#ca1248);box-shadow:0 13px 28px rgba(205,20,72,.19)}.hero-secondary{border:1px solid #eadde3;color:#725e68;background:#fff}.hero-secondary:disabled{opacity:.6;cursor:not-allowed}.hero-proof{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px;color:#9b858f;font-size:7px;font-weight:850}.hero-proof span{display:flex;align-items:center;gap:5px}.hero-proof i{width:6px;height:6px;border-radius:50%;background:#2db47a}
        .hero-v2-visual{position:relative;min-height:535px;display:grid;place-items:center}.hero-orbit{position:absolute;border:1px solid rgba(221,35,91,.12);border-radius:50%;transform:rotate(-18deg)}.orbit-1{width:390px;height:250px}.orbit-2{width:470px;height:300px;transform:rotate(55deg)}.orbit-3{width:550px;height:350px;transform:rotate(-42deg)}.hero-blood-orb{width:190px;height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;border:1px solid rgba(255,255,255,.72);border-radius:48px;color:#fff;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.3),transparent 22%),linear-gradient(145deg,#f45d86,#c71950 68%,#8e1038);box-shadow:0 35px 80px rgba(184,22,76,.24),inset 0 1px rgba(255,255,255,.45);z-index:2}.hero-blood-orb strong{margin-top:5px;font-size:34px;letter-spacing:-.07em}.hero-blood-orb small{margin-top:3px;font-size:6px;letter-spacing:.2em;font-weight:950;opacity:.78}.hero-glass-card{position:absolute;right:8%;top:14%;width:180px;padding:17px;border:1px solid rgba(255,255,255,.8);border-radius:18px;background:rgba(255,255,255,.72);box-shadow:0 20px 50px rgba(105,17,50,.1);backdrop-filter:blur(18px);z-index:3}.mini-label,.side-kicker{color:#9c808a;font-size:6px;font-weight:950;letter-spacing:.16em}.impact-number{margin-top:5px;color:#c8174b;font-size:42px;line-height:1;font-weight:950;letter-spacing:-.08em}.impact-title{margin-top:3px;color:#5b4650;font-size:8px;font-weight:850}.impact-line{display:flex;gap:8px;margin-top:13px;color:#88717b;font-size:6px;font-weight:850}.impact-line span{display:flex;align-items:center;gap:3px}.floating-tag{position:absolute;display:flex;align-items:center;gap:6px;padding:9px 11px;border:1px solid rgba(255,255,255,.86);border-radius:12px;background:rgba(255,255,255,.78);box-shadow:0 18px 40px rgba(105,17,50,.09);backdrop-filter:blur(16px);color:#765d68;font-size:7px;font-weight:900;z-index:3}.tag-top{left:6%;top:25%}.tag-bottom{right:4%;bottom:19%}
        .stat-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px}.stat-card{min-height:104px;display:flex;align-items:center;gap:12px;padding:18px;border:1px solid rgba(112,28,61,.07);border-radius:19px;background:rgba(255,255,255,.82);box-shadow:0 18px 45px rgba(91,18,48,.06)}.stat-icon{width:40px;height:40px;display:grid;place-items:center;border-radius:12px}.stat-card small{display:block;color:#a08791;font-size:6px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.stat-card strong{display:block;margin-top:5px;color:#30212a;font-size:21px;font-weight:950;letter-spacing:-.04em}.stat-card.green .stat-icon{color:#2c9d6c;background:#ebfaf3}.stat-card.red .stat-icon{color:#cf194c;background:#fff0f5}.stat-card.amber .stat-icon{color:#a37b2a;background:#fff7e2}.stat-card.purple .stat-icon{color:#7954bd;background:#f3edff}
        .ledger-layout{display:grid;grid-template-columns:minmax(0,1fr) 315px;gap:14px;margin-top:14px;align-items:start}.ledger-main{min-width:0;padding:23px;border:1px solid rgba(112,28,61,.07);border-radius:25px;background:rgba(255,255,255,.83);box-shadow:0 22px 65px rgba(91,18,48,.065)}.ledger-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-end}.section-kicker{display:flex;align-items:center;gap:6px;color:#d21b51;font-size:7px;font-weight:950;letter-spacing:.17em}.section-kicker span{width:5px;height:5px;border-radius:50%;background:#dd1d55}.ledger-head h2{margin:8px 0 0;font-size:30px;letter-spacing:-.055em}.ledger-head p{margin:7px 0 0;color:#8992a1;font-size:10px}.record-count{min-width:92px;text-align:right}.record-count strong{display:block;color:#c7184b;font-size:25px;line-height:1;font-weight:950}.record-count span{display:block;margin-top:5px;color:#a08a93;font-size:6px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.ledger-toolbar{display:flex;justify-content:space-between;gap:12px;margin-top:20px;padding:9px;border:1px solid #eee1e6;border-radius:15px;background:#fffafb}.filter-pills{display:flex;gap:4px;flex-wrap:wrap}.filter-pills button{display:flex;align-items:center;gap:5px;padding:8px 9px;border:0;border-radius:9px;background:transparent;color:#806b75;font-size:7px;font-weight:900;cursor:pointer}.filter-pills button b{min-width:16px;padding:2px 4px;border-radius:5px;background:#f6e9ee;color:#a27e8b;font-size:6px}.filter-pills button.selected{color:#c7184b;background:#fff0f5}.filter-pills button.selected b{color:#fff;background:#d91c55}.ledger-search{min-width:220px;display:flex;align-items:center;gap:6px;padding:0 10px;color:#a48893}.ledger-search input{width:100%;border:0;outline:0;background:transparent;color:#4b3a43;font-size:8px}.ledger-search button{border:0;background:none;color:#c8194c;cursor:pointer;font-size:15px}
        .ledger-list{display:grid;gap:8px;margin-top:13px}.history-row{display:grid;grid-template-columns:118px minmax(180px,1.5fr) 115px 100px 145px 75px;align-items:center;gap:12px;padding:13px;border:1px solid #eee3e7;border-radius:16px;background:linear-gradient(120deg,#fff,#fff8fa);transition:.2s;animation:rowIn .45s both}.history-row:hover{transform:translateY(-2px);border-color:#f1c8d6;box-shadow:0 15px 34px rgba(111,18,52,.07)}@keyframes rowIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}.history-date strong{display:block;color:#44323b;font-size:9px;font-weight:950}.history-date span,.row-detail small{display:block;margin-top:4px;color:#a48e97;font-size:6px;font-weight:850;letter-spacing:.06em}.donation-place{display:flex;align-items:center;gap:9px;min-width:0}.place-icon{width:38px;height:38px;display:grid;place-items:center;flex:0 0 38px;border-radius:11px;color:#c8194c;background:#fff0f5}.donation-place strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#46323c;font-size:8px}.donation-place span{display:block;margin-top:4px;color:#9c858e;font-size:6px}.row-detail>strong{display:block;margin-top:4px;color:#4c3841;font-size:8px}.blood-chip{display:inline-flex;align-items:center;gap:4px;margin-top:5px;padding:5px 7px;border-radius:8px;color:#c7194b;background:#fff0f5;font-size:7px;font-weight:950}.status-chip{display:inline-flex;align-items:center;gap:5px;padding:7px 9px;border-radius:999px;font-size:6px;font-weight:950;white-space:nowrap}.status-chip.verified{color:#2d8d62;background:#ebf9f1}.status-chip.pending{color:#9a7427;background:#fff7df}.status-chip.rejected{color:#ad3657;background:#ffedf2}.status-chip.other{color:#7d6972;background:#f6eff2}.review-button{display:flex;align-items:center;justify-content:center;gap:4px;padding:8px 8px;border:1px solid #ebdfe4;border-radius:9px;background:#fff;color:#8d5368;font-size:7px;font-weight:950;cursor:pointer}.review-button:hover{color:#fff;background:#c9194d;border-color:#c9194d}
        .ledger-side{display:grid;gap:12px}.integrity-card{padding:20px;border:1px solid rgba(112,28,61,.07);border-radius:23px;background:linear-gradient(145deg,#fff,#fff5f8);box-shadow:0 22px 60px rgba(91,18,48,.07)}.integrity-top{display:flex;justify-content:space-between;align-items:center}.integrity-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;color:#c7194b;background:#fff0f5}.secure-pill{display:flex;align-items:center;gap:5px;padding:6px 8px;border-radius:999px;color:#35805f;background:#edf9f3;font-size:6px;font-weight:950}.secure-pill i{width:5px;height:5px;border-radius:50%;background:#2db47a}.integrity-card .side-kicker{display:block;margin-top:19px}.integrity-card h3{margin:7px 0 0;font-size:20px;line-height:1.05;letter-spacing:-.045em}.integrity-card p{margin:11px 0 0;color:#87909d;font-size:9px;line-height:1.65}.integrity-meter{height:6px;margin-top:19px;overflow:hidden;border-radius:99px;background:#f1e4e9}.integrity-meter i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#ef5a83,#c7164b)}.integrity-foot{display:flex;justify-content:space-between;margin-top:8px;color:#9a858e;font-size:6px;font-weight:850}.integrity-foot b{color:#3b986e}.impact-side-card{padding:18px;border:1px solid rgba(112,28,61,.07);border-radius:20px;background:rgba(255,255,255,.83);box-shadow:0 20px 50px rgba(91,18,48,.06)}.milestone-row{display:flex;align-items:center;gap:12px;margin-top:13px}.milestone-ring{width:64px;height:64px;display:grid;place-items:center;position:relative;flex:0 0 64px;border-radius:50%;background:conic-gradient(#d71a51 0 60%,#f2dfe6 60%)}.milestone-ring::after{content:"";position:absolute;inset:6px;border-radius:50%;background:#fff}.milestone-ring span,.milestone-ring small{position:relative;z-index:1}.milestone-ring span{font-size:15px;font-weight:950;color:#c7194b}.milestone-ring small{font-size:6px;color:#9b8790}.milestone-row strong{display:block;color:#47343d;font-size:8px}.milestone-row p{margin:5px 0 0;color:#9b8991;font-size:7px;line-height:1.45}.profile-link-card{width:100%;display:flex;align-items:center;gap:10px;padding:14px;border:1px solid rgba(112,28,61,.07);border-radius:17px;background:#fff;color:#43313a;cursor:pointer;text-align:left;box-shadow:0 15px 40px rgba(91,18,48,.05)}.profile-link-card>span{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;color:#c7194b;background:#fff0f5}.profile-link-card div{flex:1}.profile-link-card strong{display:block;font-size:8px}.profile-link-card small{display:block;margin-top:3px;color:#9b8790;font-size:6px}.profile-link-card>svg{color:#b59da7}
        .donor-footer{position:relative;overflow:hidden;margin-top:26px;padding:48px 46px 18px;border-radius:30px 30px 0 0;color:#fff;background:linear-gradient(145deg,#3c0719 0%,#24030e 58%,#130107 100%);box-shadow:0 -25px 80px rgba(71,7,29,.13)}.footer-aura{position:absolute;width:520px;height:520px;right:-180px;top:-260px;border-radius:50%;background:rgba(228,48,101,.15);filter:blur(10px)}.footer-grid{position:relative;z-index:1;display:grid;grid-template-columns:1.7fr .75fr .9fr .9fr;gap:50px}.footer-brand{display:flex;align-items:center;gap:10px}.footer-brand>span{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;color:#fff;background:linear-gradient(145deg,#f25b83,#c5164b)}.footer-brand strong{display:block;font-size:17px}.footer-brand strong span{color:#ef6d93}.footer-brand small{display:block;margin-top:3px;color:#c88e9f;font-size:6px;font-weight:950;letter-spacing:.15em}.footer-about p{max-width:420px;margin:17px 0;color:#c6aeb7;font-size:8px;line-height:1.8}.footer-protected{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid rgba(104,210,151,.18);border-radius:9px;color:#8fe0b7;background:rgba(62,185,125,.06);font-size:6px;font-weight:900}.footer-col b{display:block;margin-bottom:13px;color:#f27798;font-size:6px;letter-spacing:.17em}.footer-col button{display:block;margin:0 0 11px;padding:0;border:0;background:none;color:#c5adb6;font-size:7px;cursor:pointer;text-align:left}.footer-col button:hover{color:#fff}.footer-bottom-v2{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;margin-top:42px;padding-top:16px;border-top:1px solid rgba(255,255,255,.09);color:#876d77;font-size:6px}.footer-live{display:flex;align-items:center;gap:6px;color:#8bd7b0}
        .loading-grid{display:grid;gap:8px;margin-top:13px}.skeleton-row{height:74px;border-radius:15px;background:linear-gradient(90deg,#fff1f5 25%,#fff 50%,#fff1f5 75%);background-size:220% 100%;animation:shimmer 1.3s infinite}@keyframes shimmer{to{background-position:-220% 0}}.empty-state{padding:65px 20px;text-align:center}.empty-orb{width:64px;height:64px;margin:0 auto 16px;display:grid;place-items:center;border-radius:20px;color:#c7194b;background:#fff0f5}.empty-state h3{margin:10px 0 0;font-size:22px;letter-spacing:-.04em}.empty-state p{max-width:430px;margin:8px auto 0;color:#8d8f9d;font-size:9px;line-height:1.7}.empty-state button{margin-top:15px;padding:9px 12px;border:1px solid #efdce4;border-radius:10px;background:#fff;color:#c7194b;font-size:7px;font-weight:950;cursor:pointer}
        .modal-backdrop{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:20px;background:rgba(33,5,17,.52);backdrop-filter:blur(10px)}.donation-modal{width:min(610px,100%);max-height:88vh;overflow:auto;padding:24px;border:1px solid rgba(255,255,255,.65);border-radius:24px;background:#fffafb;box-shadow:0 40px 120px rgba(25,2,12,.3)}.modal-head{display:flex;justify-content:space-between;gap:20px}.modal-head h2{margin:7px 0 0;font-size:25px;letter-spacing:-.04em}.modal-close{width:35px;height:35px;display:grid;place-items:center;border:1px solid #eee0e6;border-radius:10px;background:#fff;color:#9a7683;cursor:pointer}.modal-blood{display:flex;align-items:center;gap:10px;margin-top:20px;padding:16px;border-radius:15px;color:#c7184b;background:#fff0f5}.modal-blood strong{font-size:24px}.modal-blood span{color:#927984;font-size:8px}.modal-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}.modal-detail{padding:12px;border:1px solid #eee2e7;border-radius:12px;background:#fff}.modal-detail small{display:block;color:#a08791;font-size:6px;font-weight:900}.modal-detail strong{display:block;margin-top:5px;color:#46323b;font-size:8px}.modal-note,.modal-rejection{display:flex;gap:9px;margin-top:9px;padding:12px;border-radius:12px;background:#fff3f7;color:#75606a;font-size:8px}.modal-note p{margin:0;line-height:1.55}.modal-rejection{display:block;color:#a33a58;background:#fff0f4}.modal-rejection strong{display:block;margin-bottom:4px}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:1200px){.donor-nav-links button{padding:10px 6px;font-size:7px}.history-hero-v2{grid-template-columns:1fr .85fr}.hero-v2-copy{padding-left:48px}.ledger-layout{grid-template-columns:1fr}.ledger-side{grid-template-columns:1.2fr .9fr .9fr}.history-row{grid-template-columns:100px minmax(160px,1.4fr) 95px 85px 130px 68px}}
        @media(max-width:900px){.donor-nav{grid-template-columns:auto auto;justify-content:space-between}.donor-nav-links{display:none}.history-hero-v2{grid-template-columns:1fr}.hero-v2-copy{padding:52px 36px 24px}.hero-v2-visual{min-height:380px}.stat-strip{grid-template-columns:repeat(2,1fr)}.ledger-side{grid-template-columns:1fr}.ledger-toolbar{flex-direction:column}.ledger-search{min-width:0;height:36px}.history-row{grid-template-columns:1fr 1fr}.history-row .review-button{justify-self:start}.footer-grid{grid-template-columns:1fr 1fr;gap:30px}.footer-bottom-v2{flex-direction:column;align-items:flex-start;gap:8px}}
        @media(max-width:600px){.donation-shell{width:min(100% - 18px,1540px)}.donor-nav{height:62px}.network-live,.nav-icon-btn{display:none}.hero-v2-copy{padding:38px 22px 18px}.hero-v2-copy h1{font-size:53px}.hero-v2-visual{min-height:330px}.hero-blood-orb{width:150px;height:150px}.hero-glass-card{right:2%;top:8%;width:145px}.tag-top{left:2%;top:28%}.tag-bottom{right:2%;bottom:10%}.stat-strip{grid-template-columns:1fr}.ledger-main{padding:16px}.ledger-head{align-items:flex-start}.record-count{display:none}.history-row{grid-template-columns:1fr}.footer-grid{grid-template-columns:1fr}.footer-bottom-v2{font-size:6px}.modal-grid{grid-template-columns:1fr}}
      `}</style>
    </main>
  );

}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "green" | "red" | "amber" | "purple";
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function DonationRow({
  donation,
  index,
  onView,
}: {
  donation: Donation;
  index: number;
  onView: () => void;
}) {
  return (
    <article
      className="history-row"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="history-date">
        <strong>{formatDate(donation.donationDate)}</strong>
        <span>Donation date</span>
      </div>

      <div className="donation-place">
        <div className="place-icon">
          <Hospital size={17} />
        </div>
        <div>
          <strong>{donation.hospitalName}</strong>
          <span>
            <MapPin
              size={9}
              style={{ verticalAlign: "middle", marginRight: 3 }}
            />
            {donation.city}
          </span>
        </div>
      </div>

      <div className="row-detail">
        <small>Blood group</small>
        <div className="blood-chip">
          <Droplets size={11} />
          {donation.bloodGroup}
        </div>
      </div>

      <div className="row-detail">
        <small>Units donated</small>
        <strong>
          {donation.unitsDonated} unit
          {donation.unitsDonated === 1 ? "" : "s"}
        </strong>
      </div>

      <div>
        <span className={`status-chip ${statusClass(donation.status)}`}>
          {donation.status === "VERIFIED" ? (
            <CheckCircle2 size={12} />
          ) : donation.status === "REJECTED" ? (
            <XCircle size={12} />
          ) : (
            <Clock3 size={12} />
          )}
          {statusLabel(donation.status)}
        </span>
      </div>

      <button className="review-button" onClick={onView}>
        Details
        <ArrowRight size={13} />
      </button>
    </article>
  );
}

function DonationModal({
  donation,
  onClose,
}: {
  donation: Donation;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="donation-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <div className="section-eyebrow">
              <ShieldCheck size={12} />
              DONATION RECORD
            </div>
            <h2>Donation details</h2>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <XCircle size={17} />
          </button>
        </div>

        <div className="modal-blood">
          <Droplets size={27} />
          <strong>{donation.bloodGroup}</strong>
          <span>Registered blood group</span>
        </div>

        <div className="modal-grid">
          <ModalDetail
            label="Donation date"
            value={formatLongDate(donation.donationDate)}
          />
          <ModalDetail
            label="Units donated"
            value={`${donation.unitsDonated} unit${
              donation.unitsDonated === 1 ? "" : "s"
            }`}
          />
          <ModalDetail
            label="Hospital / center"
            value={donation.hospitalName}
          />
          <ModalDetail
            label="Location"
            value={donation.city}
          />
          <ModalDetail
            label="Verification"
            value={statusLabel(donation.status)}
          />
          <ModalDetail
            label="Record ID"
            value={donation.id.slice(-10).toUpperCase()}
          />
        </div>

        {donation.patientName && (
          <div className="modal-note">
            <Hospital size={17} />
            <p>
              <strong>Patient:</strong> {donation.patientName}
            </p>
          </div>
        )}

        {donation.status === "VERIFIED" && (
          <div className="modal-note">
            <CheckCircle2 size={17} />
            <p>
              This donation is marked as verified by the BloodLink
              backend.
            </p>
          </div>
        )}

        {donation.status === "PENDING_VERIFICATION" && (
          <div className="modal-note">
            <Clock3 size={17} />
            <p>
              This donation has been submitted and is waiting for
              Blood Bank verification.
            </p>
          </div>
        )}

        {donation.status === "REJECTED" &&
          donation.rejectionReason && (
            <div className="modal-rejection">
              <strong>Rejection reason</strong>
              {donation.rejectionReason}
            </div>
          )}

        {donation.notes && (
          <div className="modal-note">
            <Activity size={17} />
            <p>
              <strong>Notes:</strong> {donation.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="modal-detail">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="loading-grid">
      {[1, 2, 3, 4].map((item) => (
        <div className="skeleton-row" key={item} />
      ))}
    </div>
  );
}

function EmptyHistory({
  filtered,
  onReset,
}: {
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-orb">
        <Droplets size={31} />
      </div>

      <div className="section-eyebrow">
        <ShieldCheck size={12} />
        RECORDS CLEAR
      </div>

      <h3>
        {filtered
          ? "No matching donations"
          : "No donation history yet"}
      </h3>

      <p>
        {filtered
          ? "Try another filter or search term to see other records."
          : "Once a donation is recorded against your donor profile, it will appear here automatically."}
      </p>

      {filtered && (
        <button className="reset-button" onClick={onReset}>
          Show all records
        </button>
      )}
    </div>
  );
}
