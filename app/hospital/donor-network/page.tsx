"use client";

import { HospitalNavbar, HospitalFooter, HospitalChromeStyles } from "../components/HospitalChrome";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  HeartPulse,
  MapPin,
  Menu,
  Navigation,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
  X,
  Zap,
} from "lucide-react";

import "./donor-network.css";
import NotificationBell from "../../../components/notifications/NotificationBell";
import {
  API_BASE_URL,
  authHeaders,
  clearAuth,
  getToken,
} from "../../../lib/api";

type Urgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type RequestItem = {
  id: string;
  bloodGroup: string;
  unitsRequired: number;
  urgency: Urgency;
  status: string;
  patientName?: string;
  city?: string;
  createdAt?: string;
  raw: any;
};

type Donor = {
  id: string;
  name: string;
  bloodGroup: string;
  city: string;
  distance?: number;
  score?: number;
  compatibility?: string;
  explanation?: string;
  requestId: string;
  urgency: Urgency;
  available?: boolean;
  raw: any;
};

const getId = (x: any) => String(x?._id || x?.id || x || "");

const relativeTime = (date?: string) => {
  if (!date) return "Recently";
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return "Recently";
  const mins = Math.floor(Math.max(0, Date.now() - t) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
};

const normalizeRequests = (payload: any): RequestItem[] => {
  const list = Array.isArray(payload)
    ? payload
    : payload?.requests || payload?.data || payload?.bloodRequests || payload?.items || [];

  return (Array.isArray(list) ? list : [])
    .map((r: any) => ({
      id: getId(r),
      bloodGroup: String(r?.bloodGroup || r?.blood || "—").toUpperCase(),
      unitsRequired: Number(r?.unitsRequired ?? r?.units ?? r?.quantity ?? 0) || 0,
      urgency: String(r?.urgency || "MEDIUM").toUpperCase() as Urgency,
      status: String(r?.status || "OPEN").toUpperCase(),
      patientName: r?.patientName || r?.patient?.name,
      city: r?.city || r?.location?.city || r?.location?.address,
      createdAt: r?.createdAt || r?.created_at,
      raw: r,
    }))
    .filter((r) => r.id);
};

const normalizeMatches = (
  payload: any,
  request: RequestItem
): Donor[] => {
  const list =
    payload?.matchingDonors ||
    payload?.matches ||
    payload?.donors ||
    payload?.data ||
    [];

  return (Array.isArray(list) ? list : []).map((m: any, i: number) => {
    const donor = m?.donor || m?.user || m;
    return {
      id: getId(donor) || `match-${request.id}-${i}`,
      name:
        donor?.name ||
        donor?.user?.name ||
        m?.donorName ||
        `Compatible donor ${i + 1}`,
      bloodGroup: String(
        m?.bloodGroup || donor?.bloodGroup || "—"
      ).toUpperCase(),
      city:
        m?.city ||
        donor?.location?.city ||
        donor?.city ||
        "Location unavailable",
      distance:
        Number(m?.distanceKm ?? m?.distance) ||
        undefined,
      score:
        Number(m?.matchScore ?? m?.score) ||
        undefined,
      compatibility:
        m?.compatibility || m?.compatibilityLabel || undefined,
      explanation:
        m?.explanation || m?.reason || undefined,
      requestId: request.id,
      urgency: request.urgency,
      available:
        m?.isAvailable ??
        donor?.isAvailable ??
        donor?.available ??
        undefined,
      raw: m,
    };
  });
};

export default function HospitalDonorNetworkPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("ALL");
  const [priority, setPriority] = useState<"ALL" | Urgency>("ALL");
  const [selected, setSelected] = useState<Donor | null>(null);
  const [mobile, setMobile] = useState(false);
  const [hospitalName, setHospitalName] = useState("Hospital");

  const loadNetwork = async (refresh = false) => {
    const token = getToken();
    if (!token) {
      clearAuth();
      window.location.href = "/login";
      return;
    }

    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const reqRes = await fetch(`${API_BASE_URL}/api/blood-requests/my`, {
        headers: authHeaders(),
        cache: "no-store",
      });

      if (reqRes.status === 401) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      const reqData = await reqRes.json().catch(() => ({}));
      if (!reqRes.ok) {
        throw new Error(reqData?.message || "Unable to load hospital requests.");
      }

      const mine = normalizeRequests(reqData);
      setRequests(mine);

      const active = mine.filter(
        (r) => !["FULFILLED", "CANCELLED"].includes(r.status)
      );

      const results = await Promise.allSettled(
        active.slice(0, 12).map(async (r) => {
          const res = await fetch(
            `${API_BASE_URL}/api/blood-requests/${r.id}/matches`,
            {
              headers: authHeaders(),
              cache: "no-store",
            }
          );

          if (!res.ok) return [];
          const data = await res.json().catch(() => ({}));
          return normalizeMatches(data, r);
        })
      );

      const all = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : []
      );

      const unique = Array.from(
        new Map(
          all.map((d) => [
            `${d.id}-${d.requestId}`,
            d,
          ])
        ).entries()
      ).map(([, d]) => d);

      unique.sort((a, b) => {
        const pa = a.urgency === "CRITICAL" ? 4 : a.urgency === "HIGH" ? 3 : a.urgency === "MEDIUM" ? 2 : 1;
        const pb = b.urgency === "CRITICAL" ? 4 : b.urgency === "HIGH" ? 3 : b.urgency === "MEDIUM" ? 2 : 1;
        return pb - pa || (b.score || 0) - (a.score || 0);
      });

      setDonors(unique);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load donor network.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("bloodlink_user") || "{}");
      if (String(user?.role || "").toUpperCase() !== "HOSPITAL") {
        router.replace("/login");
        return;
      }
      setHospitalName(user?.name || user?.hospitalName || "Hospital");
      loadNetwork();
    } catch {
      clearAuth();
      router.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const groups = useMemo(
    () => ["ALL", ...Array.from(new Set(donors.map((d) => d.bloodGroup))).filter(Boolean)],
    [donors]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return donors.filter((d) => {
      const matchesGroup = group === "ALL" || d.bloodGroup === group;
      const matchesPriority =
        priority === "ALL" || d.urgency === priority;

      const matchesQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.bloodGroup.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.compatibility?.toLowerCase().includes(q) ||
        d.explanation?.toLowerCase().includes(q);

      return matchesGroup && matchesPriority && matchesQuery;
    });
  }, [donors, group, priority, query]);

  const criticalRequests = requests.filter((r) => r.urgency === "CRITICAL" && !["FULFILLED", "CANCELLED"].includes(r.status));
  const highRequests = requests.filter((r) => r.urgency === "HIGH" && !["FULFILLED", "CANCELLED"].includes(r.status));
  const availableSignals = donors.filter((d) => d.available !== false).length;
  const nearby = donors.filter((d) => d.distance != null && d.distance <= 10).length;
  const topScore = donors.reduce((m, d) => Math.max(m, d.score || 0), 0);

  return (
    <main className="donor-network-page">
      <HospitalChromeStyles />
      <HospitalNavbar />

      <div className="dn-ambient dn-a" />
      <div className="dn-ambient dn-b" />
      <div className="dn-grid" />

      <aside className={`dn-sidebar hospital-shell-sidebar ${mobile ? "open" : ""}`}>
        <div className="dn-brand">
          <div className="dn-brand-mark"><HeartPulse size={20} /></div>
          <div>
            <strong>BloodLink<span>AI</span></strong>
            <small>HOSPITAL COMMAND</small>
          </div>
          <button onClick={() => setMobile(false)}><X size={18} /></button>
        </div>

        <div className="dn-profile">
          <div className="dn-avatar"><Building2 size={19} /></div>
          <div>
            <strong>{hospitalName}</strong>
            <span><i />Verified hospital</span>
          </div>
        </div>

        <div className="dn-label">OPERATIONS</div>

        <nav>
          <button onClick={() => router.push("/hospital")}><Activity size={16} />Dashboard</button>
          <button onClick={() => router.push("/hospital/emergency-command")}><Zap size={16} />Emergency Center</button>
          <button onClick={() => router.push("/hospital/requests")}><Droplets size={16} />My Requests</button>
          <button className="active"><Users size={16} />Donor Network <b>LIVE</b></button>
          <button onClick={() => router.push("/hospital/donor-network")}><Sparkles size={16} />AI Match Center</button>
          <button onClick={() => router.push("/hospital/inventory")}><Droplets size={16} />Blood Inventory</button>
          <button onClick={() => router.push("/hospital/analytics")}><Target size={16} />Analytics</button>
          <button onClick={() => router.push("/hospital/notifications")}><Bell size={16} />Notifications</button>
          <button onClick={() => router.push("/hospital/settings")}><Settings size={16} />Settings</button>
        </nav>

        <div className="dn-side-bottom">
          <div className="dn-security">
            <ShieldCheck size={16} />
            <div>
              <strong>Protected workspace</strong>
              <span>Donor data is surfaced through verified matching signals.</span>
            </div>
          </div>
          <button onClick={() => router.push("/")}>Visit BloodLink AI <ArrowRight size={14} /></button>
        </div>
      </aside>

      {mobile && <button className="dn-backdrop" onClick={() => setMobile(false)} aria-label="Close menu" />}

      <section className="dn-main">
        <header className="dn-top">
          <button className="dn-menu" onClick={() => setMobile(true)}><Menu size={20} /></button>
          <div className="dn-crumb"><span>HOSPITAL</span><ChevronRight size={13} /><strong>DONOR NETWORK</strong></div>
          <div className="dn-top-actions">
            <span><i />Network live</span>
            <NotificationBell />
            <div><Building2 size={14} />Hospital workspace</div>
          </div>
        </header>

        <div className="dn-content">
          <section className="dn-hero">
            <div className="dn-hero-copy">
              <div className="dn-eyebrow"><Users size={13} /> LIVE DONOR INTELLIGENCE</div>
              <h1>Meet the network<br /><span>behind every match.</span></h1>
              <p>
                A hospital-focused donor surface built from your active blood requests
                and the matching signals returned by BloodLink AI.
              </p>
              <div className="dn-hero-meta">
                <span><CheckCircle2 size={14} /> Server-side matching</span>
                <span><Navigation size={14} /> Location-aware</span>
                <span><ShieldCheck size={14} /> Eligibility-aware</span>
              </div>
            </div>

            <div className="dn-stage">
              <div className="dn-stage-grid" />
              <div className="dn-orbit o1" />
              <div className="dn-orbit o2" />
              <div className="dn-orbit o3" />
              <motion.div
                className="dn-core"
                animate={{
                  scale: [1, 1.045, 1],
                  boxShadow: [
                    "0 0 35px rgba(225,45,103,.25)",
                    "0 0 75px rgba(225,45,103,.48)",
                    "0 0 35px rgba(225,45,103,.25)",
                  ],
                }}
                transition={{ duration: 3.4, repeat: Infinity }}
              >
                <div className="dn-core-shine" />
                <Users size={42} strokeWidth={1.35} />
                <strong>DONOR</strong>
                <small>NETWORK CORE</small>
              </motion.div>

              <div className="dn-node node-a"><Droplets size={14} /><span><small>GROUPS</small><b>{groups.length - 1 || 0}</b></span></div>
              <div className="dn-node node-b"><Navigation size={14} /><span><small>NEARBY</small><b>{nearby}</b></span></div>
              <div className="dn-node node-c"><Sparkles size={14} /><span><small>TOP MATCH</small><b>{topScore ? `${Math.round(topScore)}%` : "—"}</b></span></div>
              <div className="dn-live"><i /> MATCHING NETWORK ONLINE</div>
            </div>
          </section>

          <section className="dn-kpis">
            <div><div className="dn-kpi-icon"><Users size={17} /></div><small>NETWORK MATCHES</small><strong>{donors.length}</strong><span>Returned by active requests</span></div>
            <div><div className="dn-kpi-icon critical"><TriangleAlert size={17} /></div><small>CRITICAL QUEUE</small><strong>{criticalRequests.length}</strong><span>Emergency requests</span></div>
            <div><div className="dn-kpi-icon"><Navigation size={17} /></div><small>NEARBY SIGNALS</small><strong>{nearby}</strong><span>Within 10 km when available</span></div>
            <div><div className="dn-kpi-icon"><Zap size={17} /></div><small>HIGH PRIORITY</small><strong>{highRequests.length}</strong><span>Active high requests</span></div>
          </section>

          <section className="dn-toolbar">
            <div>
              <div className="dn-section-kicker"><Sparkles size={12} /> MATCH INTELLIGENCE</div>
              <h2>Compatible donor network</h2>
              <p>Only donor matches returned by the connected matching engine are shown.</p>
            </div>

            <div className="dn-tools">
              <div className="dn-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search donor, group or location..." /></div>
              <button onClick={() => loadNetwork(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "spin" : ""} />{refreshing ? "Syncing" : "Sync"}</button>
            </div>
          </section>

          <section className="dn-filters">
            <div className="dn-group-tabs">
              {groups.map((g) => (
                <button key={g} className={group === g ? "active" : ""} onClick={() => setGroup(g)}>
                  {g === "ALL" ? "All groups" : g}
                </button>
              ))}
            </div>

            <div className="dn-priority-tabs">
              {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                <button key={p} className={priority === p ? "active" : ""} onClick={() => setPriority(p)}>
                  {p === "ALL" ? "All priority" : p}
                </button>
              ))}
            </div>
          </section>

          {error && (
            <div className="dn-error">
              <TriangleAlert size={17} />
              <span>{error}</span>
              <button onClick={() => loadNetwork(true)}>Retry</button>
            </div>
          )}

          <section className="dn-panel">
            <div className="dn-panel-head">
              <div>
                <span>LIVE MATCH FEED</span>
                <h2>Donors surfaced for your requests</h2>
              </div>
              <div className="dn-feed-status"><i />{loading ? "Syncing network" : `${filtered.length} visible matches`}</div>
            </div>

            {loading ? (
              <div className="dn-loading">
                <RefreshCw className="spin" size={25} />
                <strong>Building donor network…</strong>
                <span>Reading active hospital requests and matching signals.</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="dn-empty">
                <Users size={31} />
                <strong>No donor matches found</strong>
                <span>Try another filter or create an active blood request.</span>
              </div>
            ) : (
              <div className="dn-cards">
                <AnimatePresence>
                  {filtered.map((d, i) => (
                    <motion.article
                      key={`${d.id}-${d.requestId}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.035 }}
                      className={`dn-card ${d.urgency.toLowerCase()}`}
                      onClick={() => setSelected(d)}
                    >
                      <div className="dn-card-top">
                        <div className="dn-donor-avatar"><Users size={19} /></div>
                        <div className="dn-score">
                          <small>MATCH</small>
                          <strong>{d.score != null ? `${Math.round(d.score)}%` : d.compatibility || "MATCHED"}</strong>
                        </div>
                      </div>

                      <div className="dn-card-body">
                        <span className="dn-request-tag">{d.urgency} REQUEST</span>
                        <h3>{d.name}</h3>
                        <p><Droplets size={13} /> {d.bloodGroup} <i /> <MapPin size={13} /> {d.city}</p>
                      </div>

                      <div className="dn-card-details">
                        <div><small>DISTANCE</small><strong>{d.distance != null ? `${d.distance.toFixed(1)} km` : "Unavailable"}</strong></div>
                        <div><small>REQUEST</small><strong>#{d.requestId.slice(-7).toUpperCase()}</strong></div>
                        <div><small>STATUS</small><strong>{d.available === false ? "Unavailable" : "Signal ready"}</strong></div>
                      </div>

                      <button className="dn-open">Inspect donor signal <ArrowRight size={14} /></button>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          <section className="dn-intelligence">
            <div className="dn-intel-orb"><div /><Sparkles size={21} /></div>
            <div>
              <span>AI NETWORK NOTE</span>
              <h3>Donor discovery stays tied to real request matching.</h3>
              <p>
                This page aggregates compatible donors returned for your hospital's active requests.
                It does not invent a global donor directory or fabricate match scores.
              </p>
            </div>
            <button onClick={() => router.push("/hospital/emergency-command")}>Open Emergency Center <ArrowRight size={15} /></button>
          </section>
        </div>

        <footer className="hospital-footer">
  <div className="hospital-footer-grid">
    <div className="hospital-footer-brand">
      <div className="hospital-footer-logo"><HeartPulse size={19} /></div>
      <div>
        <strong>BloodLink<span>AI</span></strong>
        <small>HOSPITAL COMMAND CENTER</small>
      </div>
    </div>

    <div className="hospital-footer-column">
      <span>COMMAND</span>
      <button onClick={() => router.push("/hospital")}>Dashboard</button>
      <button onClick={() => router.push("/hospital/emergency-command")}>Emergency Center</button>
      <button onClick={() => router.push("/hospital/requests")}>My Requests</button>
      <button onClick={() => router.push("/hospital/donor-network")}>Donor Network</button>
    </div>

    <div className="hospital-footer-column">
      <span>MANAGE</span>
      <button onClick={() => router.push("/hospital/responses")}>Responses</button>
      <button onClick={() => router.push("/hospital/inventory")}>Blood Inventory</button>
      <button onClick={() => router.push("/hospital/analytics")}>Analytics</button>
      <button onClick={() => router.push("/hospital/notifications")}>Notifications</button>
    </div>

    <div className="hospital-footer-status">
      <div className="hospital-footer-status-top"><i /> LIVE NETWORK</div>
      <strong>OPERATIONAL</strong>
      <p>Protected hospital workspace with connected emergency coordination.</p>
      <button onClick={() => router.push("/hospital/profile")}><ShieldCheck size={13} /> Profile & Verification</button>
    </div>
  </div>

  <div className="hospital-footer-bottom">
    <span>© 2026 BloodLink AI</span>
    <span><ShieldCheck size={13} /> Protected hospital workspace</span>
    <span>Intelligent blood network · Built for faster response</span>
  </div>
</footer>
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div className="dn-drawer-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="dn-drawer-backdrop" onClick={() => setSelected(null)} aria-label="Close donor details" />
            <motion.aside className="dn-drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <div className="dn-drawer-head">
                <div><span>DONOR SIGNAL</span><h2>{selected.name}</h2></div>
                <button onClick={() => setSelected(null)}><X size={18} /></button>
              </div>

              <div className="dn-drawer-core">
                <div className="dn-drawer-avatar"><Users size={28} /></div>
                <div><strong>{selected.bloodGroup}</strong><span>{selected.compatibility || "Compatible donor match"}</span></div>
                <b>{selected.score != null ? `${Math.round(selected.score)}%` : "MATCHED"}</b>
              </div>

              <div className="dn-detail-grid">
                <div><small>BLOOD GROUP</small><strong>{selected.bloodGroup}</strong></div>
                <div><small>DISTANCE</small><strong>{selected.distance != null ? `${selected.distance.toFixed(1)} km` : "Unavailable"}</strong></div>
                <div><small>LOCATION</small><strong>{selected.city}</strong></div>
                <div><small>PRIORITY</small><strong>{selected.urgency}</strong></div>
              </div>

              <div className="dn-drawer-section">
                <div className="dn-drawer-title"><Sparkles size={14} /> MATCH EXPLANATION</div>
                <div className="dn-explanation">
                  {selected.explanation || "The backend returned this donor as compatible with the selected hospital request. Detailed explanation was not provided."}
                </div>
              </div>

              <div className="dn-drawer-section">
                <div className="dn-drawer-title"><Clock3 size={14} /> REQUEST CONTEXT</div>
                <div className="dn-context">
                  <span><Droplets size={13} /> Request #{selected.requestId.slice(-8).toUpperCase()}</span>
                  <span><Zap size={13} /> {selected.urgency} priority</span>
                </div>
              </div>

              <button className="dn-drawer-primary" onClick={() => router.push(`/hospital/donor-network?id=${selected.requestId}`)}>
                Open request command <ArrowRight size={15} />
              </button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    
      <HospitalFooter />
</main>
  );
}
