 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, ArrowRight, CheckCircle2, Clock3, Droplets, Filter,
  HeartPulse, MapPin, MessageCircle, RefreshCw, Search, ShieldCheck,
  Sparkles, Users, X, XCircle, Zap
} from "lucide-react";

import { HospitalNavbar, HospitalFooter, HospitalChromeStyles } from "../components/HospitalChrome";
import { API_BASE_URL, authHeaders, clearAuth, getToken } from "../../../lib/api";
import "./responses.css";

type Urgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ResponseStatus = "ACCEPTED" | "REJECTED" | "PENDING";

type RequestItem = {
  _id?: string; id?: string; requestId?: string;
  bloodGroup?: string; urgency?: Urgency; status?: string;
  unitsRequired?: number; units?: number; hospital?: any;
  patientName?: string; location?: any; city?: string; createdAt?: string;
};

type ResponseItem = {
  _id?: string; id?: string; donor?: any; donorId?: string;
  donorName?: string; bloodGroup?: string; status?: string;
  responseTime?: string; createdAt?: string; message?: string;
};

type MatchItem = {
  id?: string; donor?: any; bloodGroup?: string; distance?: string | number;
  distanceKm?: number; matchScore?: number; compatibility?: string; explanation?: string;
};

type Row = { key: string; request: RequestItem; response: ResponseItem; match?: MatchItem };

const idOf = (x: any) => String(x?._id ?? x?.id ?? x?.requestId ?? "");
const donorName = (d: any) => !d ? "Unknown donor" : typeof d === "string" ? d : d.name || d.fullName || "Anonymous donor";

function statusOf(r: ResponseItem): ResponseStatus {
  const s = String(r.status || "PENDING").toUpperCase();
  if (s.includes("ACCEPT")) return "ACCEPTED";
  if (s.includes("REJECT")) return "REJECTED";
  return "PENDING";
}

function arrays(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.responses)) return data.responses;
  if (Array.isArray(data?.matchingDonors)) return data.matchingDonors;
  return [];
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

export default function HospitalResponsesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [bloodFilter, setBloodFilter] = useState("ALL");
  const [selected, setSelected] = useState<Row | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!getToken()) { clearAuth(); router.replace("/login"); return; }
    silent ? setSyncing(true) : setLoading(true);
    setError("");
    try {
      const headers = authHeaders();
      const reqRes = await fetch(`${API_BASE_URL}/api/blood-requests/my`, { headers, cache: "no-store" });
      if (reqRes.status === 401 || reqRes.status === 403) {
        clearAuth(); router.replace("/login"); return;
      }
      const reqData = await reqRes.json().catch(() => ({}));
      if (!reqRes.ok) throw new Error(reqData?.message || `Unable to load hospital requests (${reqRes.status}).`);
      const requests = arrays(reqData).slice(0, 25);

      const result = await Promise.all(requests.map(async (request: RequestItem) => {
        const id = idOf(request);
        if (!id) return { request, responses: [], matches: [] };
        const [rr, mr] = await Promise.all([
          fetch(`${API_BASE_URL}/api/blood-requests/${id}/responses`, { headers, cache: "no-store" }),
          fetch(`${API_BASE_URL}/api/blood-requests/${id}/matches`, { headers, cache: "no-store" })
        ]);
        const [rd, md] = await Promise.all([
          rr.ok ? rr.json().catch(() => ({})) : {},
          mr.ok ? mr.json().catch(() => ({})) : {}
        ]);
        return { request, responses: arrays(rd), matches: arrays(md) };
      }));

      const next: Row[] = [];
      for (const item of result) {
        for (const response of item.responses as ResponseItem[]) {
          const donorId = String(response.donorId || idOf(response.donor) || response.donorName || idOf(response));
          const match = (item.matches as MatchItem[]).find((m: any) => {
            const mid = String(m?.donorId || idOf(m?.donor) || "");
            return mid && mid === donorId;
          });
          next.push({ key: `${idOf(item.request)}-${donorId}-${idOf(response)}`, request: item.request, response, match });
        }
      }
      setRows(next);
    } catch (e: any) {
      setError(e?.message || "Unable to sync donor responses.");
    } finally {
      setLoading(false); setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const t = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(row => {
      const r = row.request, res = row.response;
      const blood = String(res.bloodGroup || r.bloodGroup || "").toUpperCase();
      const status = statusOf(res);
      const text = [donorName(res.donor || res.donorName), blood, idOf(r), r.patientName, r.city, r.location?.city]
        .filter(Boolean).join(" ").toLowerCase();
      return (!q || text.includes(q))
        && (statusFilter === "ALL" || status === statusFilter)
        && (urgencyFilter === "ALL" || String(r.urgency || "").toUpperCase() === urgencyFilter)
        && (bloodFilter === "ALL" || blood === bloodFilter);
    });
  }, [rows, search, statusFilter, urgencyFilter, bloodFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    accepted: rows.filter(x => statusOf(x.response) === "ACCEPTED").length,
    pending: rows.filter(x => statusOf(x.response) === "PENDING").length,
    critical: rows.filter(x => String(x.request.urgency).toUpperCase() === "CRITICAL").length,
  }), [rows]);

  const groups = useMemo(() => ["ALL", ...Array.from(new Set(rows.map(x => String(x.response.bloodGroup || x.request.bloodGroup || "").toUpperCase()).filter(Boolean))).sort()], [rows]);

  return (
    <main className="responses-page">
      <HospitalChromeStyles />
      <style>{`
        /* Response-page hero compact override */
        .responses-page .responses-shell{padding-top:18px;padding-bottom:38px}
        .responses-page .response-hero{min-height:360px;padding:42px 54px;grid-template-columns:1.08fr .92fr}
        .responses-page .hero-copy h1{font-size:clamp(44px,5vw,68px);letter-spacing:-3.2px;margin:14px 0}
        .responses-page .hero-copy>p{max-width:560px;font-size:13px;line-height:1.65}
        .responses-page .hero-actions{margin-top:21px}
        .responses-page .hero-trust{margin-top:14px}
        .responses-page .hero-3d{width:350px;height:350px}
        .responses-page .response-core{width:132px;height:132px}
        .responses-page .response-core strong{font-size:36px}
        .responses-page .tag-a{top:13%}
        .responses-page .tag-b{top:20%}
        .responses-page .tag-c{bottom:13%}
        @media(max-width:1050px){.responses-page .response-hero{min-height:0;padding:36px 40px}.responses-page .hero-3d{width:320px;height:320px}}
        @media(max-width:700px){.responses-page .responses-shell{padding-top:12px}.responses-page .response-hero{padding:28px 22px}.responses-page .hero-copy h1{font-size:43px}.responses-page .hero-3d{width:280px;height:280px}}
      `}</style>
      <HospitalNavbar />

      <div className="responses-shell">
        <section className="response-hero">
          <div className="hero-copy">
            <div className="hero-kicker"><Sparkles size={14} /> DONOR RESPONSE INTELLIGENCE <span><i /> LIVE</span></div>
            <h1>Every response.<br /><em>One command view.</em></h1>
            <p>Track donor acceptance, response urgency and AI matching signals across every active hospital blood request.</p>
            <div className="hero-actions">
              <button className="hero-primary" onClick={() => router.push("/hospital/donor-network")}>
                Explore donor network <ArrowRight size={16} />
              </button>
              <button className="hero-ghost" onClick={() => load(true)} disabled={syncing}>
                <RefreshCw size={15} className={syncing ? "spin" : ""} /> {syncing ? "Syncing…" : "Sync now"}
              </button>
            </div>
            <div className="hero-trust"><ShieldCheck size={14} /> Verified hospital response layer <b>•</b> Backend connected</div>
          </div>

          <div className="hero-3d">
            <div className="hero-halo" />
            <motion.div className="response-ring ring-one" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
            <motion.div className="response-ring ring-two" animate={{ rotate: -360 }} transition={{ duration: 13, repeat: Infinity, ease: "linear" }} />
            <motion.div className="response-ring ring-three" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
            <motion.div className="response-core" animate={{ y: [0, -8, 0], rotateX: [0, 4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <Zap size={26} /><strong>{stats.total}</strong><span>LIVE RESPONSES</span>
            </motion.div>
            <div className="float-tag tag-a"><Users size={13} /><b>{stats.accepted}</b><span>accepted</span></div>
            <div className="float-tag tag-b"><HeartPulse size={13} /><b>{stats.critical}</b><span>critical</span></div>
            <div className="float-tag tag-c"><Activity size={13} /><b>{stats.pending}</b><span>pending</span></div>
          </div>
        </section>

        <section className="response-stats">
          <Stat icon={<MessageCircle />} label="Total responses" value={stats.total} note="Across loaded requests" />
          <Stat icon={<CheckCircle2 />} label="Accepted" value={stats.accepted} note="Donor acceptance signals" />
          <Stat icon={<Clock3 />} label="Pending" value={stats.pending} note="Awaiting donor state" />
          <Stat icon={<Zap />} label="Critical cases" value={stats.critical} note="Linked to critical requests" />
        </section>

        <section className="response-command">
          <div className="command-top">
            <div><span>RESPONSE COMMAND</span><h2>Live donor activity</h2><p>Search, filter and open any donor response without leaving the command center.</p></div>
            <div className="result-live"><i /> {filtered.length} visible</div>
          </div>
          <div className="command-bar">
            <div className="search-field"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search donor, blood group, request ID..." /></div>
            <div className="select-wrap"><Filter size={15} />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">All responses</option><option value="ACCEPTED">Accepted</option><option value="PENDING">Pending</option><option value="REJECTED">Rejected</option>
              </select>
            </div>
            <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}>
              <option value="ALL">All urgency</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
            </select>
            <select value={bloodFilter} onChange={e => setBloodFilter(e.target.value)}>
              {groups.map(g => <option key={g} value={g}>{g === "ALL" ? "All blood groups" : g}</option>)}
            </select>
          </div>
        </section>

        {error && <div className="error-banner"><XCircle size={17} /><div><strong>Response network unavailable</strong><span>{error}</span></div><button onClick={() => load()}>Retry</button></div>}

        <section className="feed-section">
          <div className="feed-heading"><div><span>LIVE RESPONSE FEED</span><h2>Donor responses</h2></div><p>{filtered.length} response{filtered.length === 1 ? "" : "s"} in view</p></div>
          {loading ? (
            <div className="empty-state"><RefreshCw size={26} className="spin" /><strong>Synchronizing response intelligence</strong><span>Reading your hospital requests and donor response signals…</span></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state empty-premium">
              <div className="empty-orb"><MessageCircle size={25} /></div>
              <strong>No donor responses yet</strong>
              <span>Once donors respond to your active blood requests, their acceptance signals will appear here.</span>
              <button onClick={() => router.push("/hospital/requests")}>Open blood requests <ArrowRight size={15} /></button>
            </div>
          ) : (
            <div className="response-list">
              <AnimatePresence>
                {filtered.map((row, i) => <ResponseCard key={row.key} row={row} index={i} onOpen={() => setSelected(row)} />)}
              </AnimatePresence>
            </div>
          )}
        </section>

        <section className="bottom-intel">
          <div className="intel-orb"><Sparkles size={21} /></div>
          <div><span>AI RESPONSE LAYER</span><h3>Every donor signal stays connected to matching intelligence.</h3><p>Open a response to inspect blood compatibility, urgency and request context.</p></div>
          <button onClick={() => router.push("/hospital/donor-network")}>Open donor network <ArrowRight size={15} /></button>
        </section>
      </div>

      <HospitalFooter />

      <AnimatePresence>
        {selected && (
          <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.aside className="response-drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }} onClick={e => e.stopPropagation()}>
              <button className="drawer-close" onClick={() => setSelected(null)}><X size={18} /></button>
              <div className="drawer-kicker">DONOR RESPONSE</div>
              <div className="drawer-profile"><div className="drawer-avatar"><Users size={20} /></div><div><span className={`urgency ${String(selected.request.urgency || "MEDIUM").toLowerCase()}`}>{selected.request.urgency || "MEDIUM"}</span><h2>{donorName(selected.response.donor || selected.response.donorName)}</h2><p>Response received {formatDate(selected.response.createdAt || selected.response.responseTime)}</p></div></div>
              <div className={`drawer-status ${statusOf(selected.response).toLowerCase()}`}><CheckCircle2 size={18} /><div><strong>{statusOf(selected.response)}</strong><span>Current donor response state</span></div></div>
              <div className="drawer-grid">
                <Info label="Blood group" value={selected.response.bloodGroup || selected.request.bloodGroup || "—"} />
                <Info label="Units needed" value={String(selected.request.unitsRequired ?? selected.request.units ?? "—")} />
                <Info label="Request status" value={selected.request.status || "—"} />
                <Info label="Distance" value={selected.match?.distanceKm != null ? `${selected.match.distanceKm} km` : selected.match?.distance ? String(selected.match.distance) : "—"} />
                <Info label="Match score" value={selected.match?.matchScore != null ? `${selected.match.matchScore}%` : selected.match?.compatibility || "—"} />
                <Info label="Response time" value={formatDate(selected.response.responseTime || selected.response.createdAt)} />
              </div>
              <div className="drawer-context"><span>REQUEST CONTEXT</span><strong>#{idOf(selected.request).slice(-10) || "REQUEST"}</strong><p>{selected.request.patientName ? `Patient: ${selected.request.patientName}` : "Hospital blood requirement"}</p>{(selected.request.city || selected.request.location?.city) && <div><MapPin size={14} /> {selected.request.city || selected.request.location?.city}</div>}</div>
              <div className="drawer-ai"><div><Sparkles size={15} /> AI MATCH SIGNAL</div><p>{selected.match?.explanation || selected.match?.compatibility || "This response is associated with a donor returned by the verified matching endpoint."}</p></div>
              <button className="drawer-primary" onClick={() => router.push(`/hospital/donor-network?id=${idOf(selected.request)}`)}>Open request command <ArrowRight size={15} /></button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Stat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note: string }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info-item"><span>{label}</span><strong>{value}</strong></div>;
}

function ResponseCard({ row, index, onOpen }: { row: Row; index: number; onOpen: () => void }) {
  const status = statusOf(row.response);
  const blood = String(row.response.bloodGroup || row.request.bloodGroup || "—").toUpperCase();
  const urgency = String(row.request.urgency || "MEDIUM").toUpperCase();
  return (
    <motion.button className={`response-card ${urgency.toLowerCase()}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} onClick={onOpen}>
      <div className="card-blood"><Droplets size={17} /><strong>{blood}</strong><span>{row.request.unitsRequired ?? row.request.units ?? 0} units</span></div>
      <div className="card-main"><div className="card-name"><h3>{donorName(row.response.donor || row.response.donorName)}</h3><span className={`urgency ${urgency.toLowerCase()}`}>{urgency}</span></div><p><Clock3 size={12} /> {formatDate(row.response.createdAt || row.response.responseTime)} <i /> <MapPin size={12} /> {row.request.city || row.request.location?.city || "Location unavailable"}</p></div>
      <div className="card-match"><span>AI MATCH</span><strong>{row.match?.matchScore != null ? `${row.match.matchScore}%` : row.match?.compatibility || "READY"}</strong></div>
      <div className={`card-status ${status.toLowerCase()}`}><span>{status}</span><ArrowRight size={15} /></div>
    </motion.button>
  );
}
