"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  Crosshair,
  Droplets,
  HeartPulse,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  ShieldAlert,
  Siren,
  Sparkles,
  Target,
  Zap,
  X,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

type RequestItem = {
  _id?: string;
  id?: string;
  bloodGroup?: string;
  bloodType?: string;
  units?: number;
  quantity?: number;
  urgency?: string;
  priority?: string;
  status?: string;
  hospital?: any;
  hospitalName?: string;
  location?: any;
  city?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Match = {
  id?: string;
  donor?: any;
  bloodGroup?: string;
  distance?: number;
  distanceKm?: number;
  matchScore?: number;
  compatibility?: string;
  explanation?: string;
};

const authHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("bloodlink_token") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const arr = (payload: any, keys: string[]) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};

const idOf = (r: RequestItem) => r._id || r.id || "";

const groupOf = (r: RequestItem) =>
  String(r.bloodGroup || r.bloodType || "—").replace("−", "-");

const unitsOf = (r: RequestItem) =>
  Number(r.units ?? r.quantity ?? 0) || 0;

const urgencyOf = (r: RequestItem) =>
  String(r.urgency || r.priority || "MEDIUM").toUpperCase();

const hospitalOf = (r: RequestItem) =>
  r.hospital?.name ||
  r.hospital?.hospitalName ||
  r.hospitalName ||
  "Hospital response node";

const age = (date?: string) => {
  if (!date) return "recent";
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const priorityRank: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export default function EmergencyCommandCenter() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState("");
  const [pulse, setPulse] = useState(0);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/blood-requests`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Unable to load emergency signals.");

      const data = arr(json, ["requests", "bloodRequests", "data"])
        .filter((r: RequestItem) =>
          ["OPEN", "DONOR_ACCEPTED", "IN_PROGRESS"].includes(
            String(r.status || "").toUpperCase()
          )
        )
        .sort(
          (a: RequestItem, b: RequestItem) =>
            (priorityRank[urgencyOf(b)] || 0) - (priorityRank[urgencyOf(a)] || 0)
        );

      setRequests(data);
      if (!selected && data[0]) setSelected(data[0]);
    } catch (e: any) {
      setError(e?.message || "Emergency feed unavailable.");
    } finally {
      setLoading(false);
      setPulse((v) => v + 1);
    }
  }, [selected]);

  const loadMatches = useCallback(async (request: RequestItem | null) => {
    const id = idOf(request || {});
    if (!id) {
      setMatches([]);
      return;
    }
    setMatchLoading(true);
    try {
      const res = await fetch(`${API}/api/blood-requests/${id}/matches`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Matching signal unavailable.");
      setMatches(arr(json, ["matches", "data"]));
    } catch {
      setMatches([]);
    } finally {
      setMatchLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    const timer = window.setInterval(loadRequests, 30000);
    return () => window.clearInterval(timer);
  }, [loadRequests]);

  useEffect(() => {
    if (selected) loadMatches(selected);
  }, [selected, loadMatches]);

  const critical = useMemo(
    () => requests.filter((r) => urgencyOf(r) === "CRITICAL").length,
    [requests]
  );
  const high = useMemo(
    () => requests.filter((r) => urgencyOf(r) === "HIGH").length,
    [requests]
  );
  const units = useMemo(
    () => requests.reduce((sum, r) => sum + unitsOf(r), 0),
    [requests]
  );

  const selectRequest = (r: RequestItem) => {
    setSelected(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="ecc-page">
      <div className="ecc-noise" />
      <div className="ecc-glow ecc-glow-one" />
      <div className="ecc-glow ecc-glow-two" />

      <header className="ecc-nav">
        <div className="ecc-brand">
          <div className="ecc-logo"><HeartPulse size={20} /></div>
          <div>
            <strong>BloodLink<span>AI</span></strong>
            <small>EMERGENCY COMMAND CENTER</small>
          </div>
        </div>

        <div className="ecc-live">
          <i />
          NETWORK LIVE
        </div>

        <button className="ecc-refresh" onClick={loadRequests} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          Sync
        </button>
      </header>

      <section className="ecc-hero">
        <div className="ecc-hero-copy">
          <div className="ecc-eyebrow">
            <Siren size={14} /> PRIORITY RESPONSE SYSTEM
          </div>
          <h1>
            When every second
            <em> matters.</em>
          </h1>
          <p>
            A unified emergency workspace for active blood requests, urgency
            signals and backend-powered donor matching.
          </p>

          <div className="ecc-command">
            <div className="ecc-command-icon"><Radio size={19} /></div>
            <div>
              <span>COMMAND STATUS</span>
              <strong>{error ? "SIGNAL DEGRADED" : "ALL SYSTEMS OPERATIONAL"}</strong>
            </div>
            <div className="ecc-command-dot" />
          </div>
        </div>

        <div className="ecc-radar">
          <div className="radar-ring r1" />
          <div className="radar-ring r2" />
          <div className="radar-ring r3" />
          <div className="radar-sweep" />
          <div className="radar-core">
            <Siren size={28} />
            <strong>{critical}</strong>
            <span>CRITICAL</span>
          </div>
          <div className="radar-node n1" />
          <div className="radar-node n2" />
          <div className="radar-node n3" />
          <div className="radar-node n4" />
        </div>
      </section>

      <section className="ecc-metrics">
        <Metric icon={ShieldAlert} label="Critical signals" value={critical} danger />
        <Metric icon={AlertTriangle} label="High priority" value={high} />
        <Metric icon={Droplets} label="Units requested" value={units} />
        <Metric icon={Activity} label="Active cases" value={requests.length} />
      </section>

      <section className="ecc-workspace">
        <div className="ecc-section-head">
          <div>
            <span>LIVE RESPONSE QUEUE</span>
            <h2>Emergency signals</h2>
          </div>
          <div className="ecc-secure"><CheckCircle2 size={15} /> Backend connected</div>
        </div>

        {error && <div className="ecc-error"><AlertTriangle size={16} /> {error}</div>}

        <div className="ecc-grid">
          <div className="ecc-queue">
            {loading && !requests.length ? (
              <div className="ecc-empty">Loading live emergency signals…</div>
            ) : !requests.length ? (
              <div className="ecc-empty">
                <CheckCircle2 size={25} />
                <strong>No active emergency signals</strong>
                <span>The network currently has no open response cases.</span>
              </div>
            ) : (
              requests.map((r, i) => {
                const u = urgencyOf(r);
                const active = idOf(r) === idOf(selected || {});
                return (
                  <motion.button
                    key={idOf(r) || i}
                    className={`case-card ${active ? "active" : ""} urgency-${u.toLowerCase()}`}
                    onClick={() => selectRequest(r)}
                    whileHover={{ y: -2 }}
                  >
                    <div className="case-priority">
                      <span>{u}</span>
                      {u === "CRITICAL" && <Zap size={13} />}
                    </div>
                    <div className="case-main">
                      <div className="blood-badge">{groupOf(r)}</div>
                      <div>
                        <strong>{hospitalOf(r)}</strong>
                        <span><MapPin size={12} /> {r.city || r.location?.city || "Location signal available"}</span>
                      </div>
                    </div>
                    <div className="case-foot">
                      <span><Droplets size={13} /> {unitsOf(r)} units</span>
                      <span><Clock3 size={13} /> {age(r.createdAt)}</span>
                      <ArrowUpRight size={16} />
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>

          <aside className="ecc-detail">
            {selected ? (
              <>
                <div className="detail-top">
                  <div>
                    <span className="detail-label">SELECTED INCIDENT</span>
                    <h3>{groupOf(selected)} <small>blood request</small></h3>
                  </div>
                  <button className="detail-close" onClick={() => setSelected(null)}><X size={16} /></button>
                </div>

                <div className="incident-banner">
                  <div className="incident-icon"><Siren size={21} /></div>
                  <div>
                    <strong>{urgencyOf(selected)} PRIORITY</strong>
                    <span>Response coordination active</span>
                  </div>
                  <i />
                </div>

                <div className="detail-stats">
                  <div><span>REQUESTED</span><strong>{unitsOf(selected)} units</strong></div>
                  <div><span>HOSPITAL</span><strong>{hospitalOf(selected)}</strong></div>
                  <div><span>STATUS</span><strong>{String(selected.status || "OPEN").replaceAll("_", " ")}</strong></div>
                  <div><span>CREATED</span><strong>{age(selected.createdAt)}</strong></div>
                </div>

                <div className="match-head">
                  <div>
                    <span>AI RESPONSE LAYER</span>
                    <strong>Compatible matches</strong>
                  </div>
                  <Target size={18} />
                </div>

                {matchLoading ? (
                  <div className="match-loading"><RefreshCw className="spin" size={17} /> Calculating match signals…</div>
                ) : matches.length ? (
                  <div className="matches">
                    {matches.slice(0, 4).map((m, i) => {
                      const score = Number(m.matchScore ?? 0);
                      const dist = Number(m.distanceKm ?? m.distance ?? 0);
                      return (
                        <div className="match-row" key={m.id || i}>
                          <div className="match-avatar">{m.bloodGroup || groupOf(selected)}</div>
                          <div className="match-info">
                            <strong>{m.donor?.name || "Compatible donor"}</strong>
                            <span>{dist ? `${dist.toFixed(1)} km` : "Distance unavailable"} · {m.compatibility || "Compatibility confirmed"}</span>
                          </div>
                          <div className="match-score">
                            <strong>{score ? `${Math.round(score)}%` : "—"}</strong>
                            <span>match</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-match">
                    <Crosshair size={19} />
                    <div><strong>No match signal returned</strong><span>The backend did not return a compatible donor for this request.</span></div>
                  </div>
                )}

                <div className="detail-note">
                  <Sparkles size={15} />
                  <span>Matching uses the verified backend response. No donor availability or score is fabricated by this interface.</span>
                </div>
              </>
            ) : (
              <div className="ecc-empty"><Navigation size={24} /><strong>Select an incident</strong><span>Choose an emergency signal to inspect its response layer.</span></div>
            )}
          </aside>
        </div>
      </section>

      <section className="ecc-response-strip">
        <div>
          <span>RESPONSE PHILOSOPHY</span>
          <h2>Coordinate fast. Decide responsibly.</h2>
          <p>BloodLink AI surfaces operational signals; final clinical and dispatch decisions remain with authorized teams.</p>
        </div>
        <div className="response-orbit">
          <div /><div /><div />
          <HeartPulse size={24} />
        </div>
      </section>

      <footer className="ecc-footer">
        <div className="footer-brand">
          <div className="ecc-logo"><HeartPulse size={19} /></div>
          <div><strong>BloodLink<span>AI</span></strong><small>INTELLIGENT BLOOD NETWORK</small></div>
        </div>
        <p>Emergency coordination built around speed, compatibility and responsible human decisions.</p>
        <div className="footer-status"><i /> Network operational · Live intelligence</div>
        <small className="copyright">© 2026 BloodLink AI</small>
      </footer>

      <style jsx global>{`
        *{box-sizing:border-box}
        body{margin:0}
        .ecc-page{min-height:100vh;background:#0d070a;color:#fff1f5;font-family:Inter,Manrope,Arial,sans-serif;overflow:hidden;position:relative}
        .ecc-noise{position:fixed;inset:0;pointer-events:none;opacity:.035;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
        .ecc-glow{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}
        .ecc-glow-one{width:500px;height:500px;background:#b90e3d;opacity:.16;top:-220px;right:-100px}
        .ecc-glow-two{width:430px;height:430px;background:#6f092d;opacity:.12;left:-220px;top:620px}
        .ecc-nav{width:min(1440px,calc(100% - 36px));margin:18px auto 0;min-height:72px;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;background:rgba(27,12,18,.72);backdrop-filter:blur(24px);position:relative;z-index:4;box-shadow:0 20px 70px rgba(0,0,0,.25)}
        .ecc-brand,.footer-brand{display:flex;align-items:center;gap:11px}
        .ecc-logo{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#e92860,#8d0d37);box-shadow:0 8px 28px rgba(210,24,79,.35)}
        .ecc-brand strong,.footer-brand strong{font-size:19px;letter-spacing:-.5px}.ecc-brand strong span,.footer-brand strong span{color:#ff4777}
        .ecc-brand small,.footer-brand small{display:block;color:#9d7d89;font-size:8px;letter-spacing:1.7px;margin-top:3px}
        .ecc-live{font-size:10px;letter-spacing:1.4px;color:#dcbfc9;display:flex;align-items:center;gap:8px}
        .ecc-live i,.footer-status i{width:7px;height:7px;border-radius:50%;background:#48e09a;box-shadow:0 0 14px #48e09a;display:inline-block}
        .ecc-refresh{border:1px solid rgba(255,255,255,.11);background:#211017;color:#e8d9de;border-radius:12px;padding:10px 13px;display:flex;gap:7px;align-items:center;cursor:pointer}
        .ecc-refresh:disabled{opacity:.55}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .ecc-hero{width:min(1440px,calc(100% - 36px));margin:0 auto;padding:86px 7% 60px;display:grid;grid-template-columns:1.15fr .85fr;align-items:center;min-height:530px;position:relative;z-index:1}
        .ecc-eyebrow{display:inline-flex;gap:8px;align-items:center;color:#ff5b87;font-size:10px;letter-spacing:2px;font-weight:800}
        .ecc-hero h1{font-size:clamp(54px,6.8vw,96px);line-height:.91;letter-spacing:-5px;margin:20px 0;color:#fff}
        .ecc-hero h1 em{font-style:normal;color:#ff4777}
        .ecc-hero p{max-width:600px;color:#aa8d98;font-size:16px;line-height:1.75}
        .ecc-command{margin-top:28px;display:flex;align-items:center;gap:13px;width:max-content;padding:12px 16px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);border-radius:17px}
        .ecc-command-icon{width:38px;height:38px;border-radius:12px;background:#421324;display:grid;place-items:center;color:#ff4c7b}
        .ecc-command span{display:block;color:#80616d;font-size:8px;letter-spacing:1.5px}.ecc-command strong{display:block;font-size:11px;margin-top:3px}.ecc-command-dot{width:8px;height:8px;border-radius:50%;background:#48e09a;box-shadow:0 0 15px #48e09a;margin-left:18px}
        .ecc-radar{width:390px;height:390px;margin:auto;position:relative;display:grid;place-items:center}
        .radar-ring{position:absolute;border:1px solid rgba(255,65,113,.18);border-radius:50%}.r1{inset:15%}.r2{inset:27%}.r3{inset:39%}
        .radar-sweep{position:absolute;width:50%;height:1px;right:50%;top:50%;transform-origin:right center;background:linear-gradient(90deg,transparent,#ff4777);animation:sweep 3s linear infinite}@keyframes sweep{to{transform:rotate(360deg)}}
        .radar-core{width:130px;height:130px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle,#55172d,#190b12 68%);border:1px solid rgba(255,77,120,.45);box-shadow:0 0 70px rgba(220,24,78,.22);z-index:2;color:#ff4d7d}
        .radar-core strong{font-size:42px;line-height:1;color:#fff;margin-top:4px}.radar-core span{font-size:8px;letter-spacing:2px;color:#a67f8d;margin-top:5px}
        .radar-node{position:absolute;width:9px;height:9px;background:#ff4777;border-radius:50%;box-shadow:0 0 20px #ff4777}.n1{top:20%;left:30%}.n2{top:31%;right:17%}.n3{bottom:24%;left:18%}.n4{bottom:16%;right:30%}
        .ecc-metrics{width:min(1320px,calc(100% - 36px));margin:0 auto 65px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;position:relative;z-index:2}
        .metric{border:1px solid rgba(255,255,255,.08);background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));border-radius:19px;padding:19px;display:flex;align-items:center;gap:13px}
        .metric svg{color:#ff4d7c}.metric span{display:block;color:#816471;font-size:8px;letter-spacing:1.5px}.metric strong{font-size:24px;margin-top:4px;display:block}.metric.danger strong{color:#ff4d7c}
        .ecc-workspace{width:min(1320px,calc(100% - 36px));margin:auto;position:relative;z-index:2}
        .ecc-section-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:20px}.ecc-section-head span,.match-head span,.detail-label{font-size:8px;letter-spacing:1.8px;color:#80606d;font-weight:800}.ecc-section-head h2{font-size:31px;margin:7px 0 0;letter-spacing:-1.5px}.ecc-secure{font-size:10px;color:#75d9aa;display:flex;gap:6px;align-items:center}
        .ecc-error{margin-bottom:14px;padding:12px 15px;border:1px solid rgba(255,75,111,.25);background:rgba(160,15,54,.12);border-radius:13px;color:#ff9ab4;font-size:12px;display:flex;gap:8px;align-items:center}
        .ecc-grid{display:grid;grid-template-columns:1fr 430px;gap:14px}.ecc-queue{display:grid;gap:10px}
        .case-card{text-align:left;width:100%;color:#fff;border:1px solid rgba(255,255,255,.075);background:#160b10;border-radius:20px;padding:17px;cursor:pointer;transition:.25s}.case-card.active{border-color:rgba(255,63,110,.5);background:linear-gradient(145deg,#251018,#170b10);box-shadow:0 14px 40px rgba(0,0,0,.2)}.case-card:hover{border-color:rgba(255,255,255,.16)}
        .case-priority{display:flex;align-items:center;justify-content:space-between;font-size:8px;letter-spacing:1.6px;font-weight:900;color:#b8939f}.urgency-critical .case-priority{color:#ff4d7c}.urgency-high .case-priority{color:#ff9c61}
        .case-main{display:flex;align-items:center;gap:13px;margin:13px 0}.blood-badge{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:#3b1121;border:1px solid rgba(255,70,117,.25);color:#ff5c87;font-weight:900;font-size:15px}.case-main strong{display:block;font-size:14px}.case-main span,.case-foot{color:#856873;font-size:10px;display:flex;align-items:center;gap:5px;margin-top:5px}
        .case-foot{border-top:1px solid rgba(255,255,255,.055);padding-top:11px;justify-content:space-between}.case-foot svg:last-child{margin-left:auto;color:#765462}
        .ecc-detail{min-height:560px;border:1px solid rgba(255,255,255,.085);border-radius:24px;background:linear-gradient(150deg,rgba(42,16,26,.92),rgba(17,9,13,.94));padding:22px;position:sticky;top:20px;box-shadow:0 30px 80px rgba(0,0,0,.25)}
        .detail-top{display:flex;justify-content:space-between}.detail-top h3{font-size:28px;margin:7px 0 0}.detail-top h3 small{font-size:11px;color:#816572;font-weight:500}.detail-close{background:transparent;border:0;color:#80616d;cursor:pointer}
        .incident-banner{margin:22px 0;padding:14px;border-radius:17px;background:rgba(255,56,104,.08);border:1px solid rgba(255,56,104,.16);display:flex;align-items:center;gap:11px}.incident-icon{width:39px;height:39px;border-radius:12px;background:#491426;color:#ff4d7b;display:grid;place-items:center}.incident-banner strong{display:block;font-size:11px}.incident-banner span{display:block;color:#846674;font-size:9px;margin-top:3px}.incident-banner i{margin-left:auto;width:7px;height:7px;border-radius:50%;background:#ff4d7b;box-shadow:0 0 14px #ff4d7b}
        .detail-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}.detail-stats div{padding:12px;border:1px solid rgba(255,255,255,.06);border-radius:14px;background:rgba(255,255,255,.02)}.detail-stats span{font-size:7px;letter-spacing:1.4px;color:#705460}.detail-stats strong{display:block;font-size:11px;margin-top:5px;color:#e6d5db}
        .match-head{display:flex;justify-content:space-between;align-items:center;margin:23px 0 12px}.match-head strong{display:block;font-size:15px;margin-top:5px}.match-head svg{color:#ff4d7c}
        .matches{display:grid;gap:7px}.match-row{display:flex;align-items:center;gap:10px;padding:11px;border:1px solid rgba(255,255,255,.055);border-radius:14px;background:rgba(255,255,255,.025)}.match-avatar{width:35px;height:35px;border-radius:11px;display:grid;place-items:center;background:#32101e;color:#ff618a;font-size:9px;font-weight:900}.match-info{flex:1}.match-info strong{display:block;font-size:10px}.match-info span{display:block;color:#755764;font-size:8px;margin-top:3px}.match-score{text-align:right}.match-score strong{display:block;color:#70dba9;font-size:12px}.match-score span{font-size:7px;color:#735764}
        .match-loading,.no-match{padding:22px;border-radius:15px;background:rgba(255,255,255,.025);color:#8b6c78;font-size:10px;display:flex;gap:8px;align-items:center}.no-match div{display:grid;gap:4px}.no-match strong{color:#c5adb5}.no-match span{font-size:8px}.detail-note{margin-top:12px;padding:11px;color:#80606d;font-size:8px;line-height:1.55;display:flex;gap:7px}.detail-note svg{flex:none;color:#c13a67}
        .ecc-empty{min-height:240px;border:1px dashed rgba(255,255,255,.08);border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#6e525e;text-align:center}.ecc-empty strong{color:#b89ca6;font-size:13px}.ecc-empty span{font-size:9px}
        .ecc-response-strip{width:min(1320px,calc(100% - 36px));margin:90px auto 0;border:1px solid rgba(255,255,255,.08);border-radius:26px;padding:42px 50px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(120deg,#1e0d14,#11090d);position:relative;overflow:hidden}.ecc-response-strip span{font-size:8px;letter-spacing:2px;color:#ff4d7c}.ecc-response-strip h2{font-size:32px;letter-spacing:-1.5px;margin:10px 0}.ecc-response-strip p{color:#846572;font-size:11px;max-width:610px;line-height:1.7}
        .response-orbit{width:150px;height:150px;position:relative;display:grid;place-items:center;color:#ff4d7c}.response-orbit div{position:absolute;border:1px solid rgba(255,68,115,.2);border-radius:50%}.response-orbit div:nth-child(1){inset:5%}.response-orbit div:nth-child(2){inset:20%}.response-orbit div:nth-child(3){inset:35%}
        .ecc-footer{width:min(1320px,calc(100% - 36px));margin:35px auto 0;padding:32px 0 30px;border-top:1px solid rgba(255,255,255,.07);display:grid;grid-template-columns:1fr 1.3fr 1fr auto;gap:30px;align-items:center}.ecc-footer p{color:#71545f;font-size:10px;line-height:1.7;max-width:350px}.footer-status{font-size:9px;color:#8d717b;display:flex;align-items:center;gap:7px}.copyright{color:#5e454f;font-size:8px}
        @media(max-width:950px){.ecc-hero{grid-template-columns:1fr;padding:65px 5% 20px}.ecc-radar{width:300px;height:300px;margin-top:45px}.ecc-metrics{grid-template-columns:1fr 1fr}.ecc-grid{grid-template-columns:1fr}.ecc-detail{position:relative;top:auto}.ecc-footer{grid-template-columns:1fr 1fr}.copyright{grid-column:1/-1}}
        @media(max-width:620px){.ecc-nav,.ecc-hero,.ecc-metrics,.ecc-workspace,.ecc-response-strip,.ecc-footer{width:calc(100% - 22px)}.ecc-live{display:none}.ecc-hero h1{font-size:52px;letter-spacing:-3px}.ecc-metrics{grid-template-columns:1fr 1fr}.ecc-response-strip{padding:28px;}.response-orbit{display:none}.ecc-footer{grid-template-columns:1fr}.copyright{grid-column:auto}}
      `}</style>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: any;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className={`metric ${danger ? "danger" : ""}`}>
      <Icon size={19} />
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}
