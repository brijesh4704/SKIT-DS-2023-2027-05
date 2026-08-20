"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  HeartPulse,
  LockKeyhole,
  BrainCircuit,
  Droplets,
  MapPin,
  Navigation,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

type Role = "DONOR" | "HOSPITAL" | "BLOOD_BANK" | "ADMIN" | "";

type RequestItem = {
  id: string;
  bloodGroup: string;
  units: number;
  urgency: string;
  status: string;
  city: string;
  hospital: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
};

type InventoryItem = {
  bloodGroup: string;
  availableUnits?: number;
  unitsAvailable?: number;
  totalUnits?: number;
  units?: number;
  reservedUnits?: number;
};

const GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];



function headers(): HeadersInit {
  const result: Record<string, string> = {};

  if (typeof window === "undefined") return result;

  const token =
    localStorage.getItem("bloodlink_token") ||
    localStorage.getItem("token");

  if (token) {
    result["Authorization"] = `Bearer ${token}`;
  }

  return result;
}



function arr(payload: any, keys: string[]) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

function normalizeGroup(v: any) {
  return String(v || "").replace("−", "-").replace(/\s+/g, "").toUpperCase();
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

export default function NetworkIntelligence() {
  const [role, setRole] = useState<Role>("");
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("O+");
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState("Location not shared");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [requestRes, inventoryRes] = await Promise.all([
        fetch(`${API}/api/blood-requests`, { headers: headers(), cache: "no-store" }),
        fetch(`${API}/api/inventory/my`, { headers: headers(), cache: "no-store" }),
      ]);

      if ([requestRes, inventoryRes].some((r) => r.status === 401 || r.status === 403)) {
        throw new Error("Session expired. Please sign in again.");
      }

      const requestJson = await requestRes.json().catch(() => ({}));
      const inventoryJson = await inventoryRes.json().catch(() => ({}));

      if (!requestRes.ok) throw new Error(requestJson?.message || "Unable to load live requests.");
      if (!inventoryRes.ok) throw new Error(inventoryJson?.message || "Unable to load inventory.");

      const requestRows = arr(requestJson, ["requests", "bloodRequests", "data"]).map((r: any) => ({
        id: String(r?._id || r?.id || ""),
        bloodGroup: normalizeGroup(r?.bloodGroup || r?.group),
        units: Number(r?.unitsRequired ?? r?.units ?? 0),
        urgency: String(r?.urgency || r?.priority || "MEDIUM").toUpperCase(),
        status: String(r?.status || "OPEN").toUpperCase(),
        city: r?.city || r?.location?.city || "Location unavailable",
        hospital:
          r?.hospitalName || r?.hospital?.name || r?.hospital?.hospitalName || "Hospital",
        latitude: Number(r?.latitude ?? r?.location?.latitude),
        longitude: Number(r?.longitude ?? r?.location?.longitude),
        createdAt: r?.createdAt,
      })).filter((r: RequestItem) => r.id);

      setRequests(requestRows);
      setInventory(arr(inventoryJson, ["inventory", "data"]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load network data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("bloodlink_user") || "{}");
      setRole(String(user?.role || "").toUpperCase() as Role);
    } catch {}
    load();
  }, [load]);

  const requestSignals = useMemo(
    () =>
      requests
        .filter((r) => r.status !== "FULFILLED" && r.status !== "CANCELLED")
        .filter((r) => {
          const q = query.trim().toLowerCase();
          return !q || `${r.bloodGroup} ${r.hospital} ${r.city} ${r.urgency}`.toLowerCase().includes(q);
        })
        .sort((a, b) => {
          const weight = (u: string) => (u === "CRITICAL" ? 4 : u === "HIGH" ? 3 : u === "MEDIUM" ? 2 : 1);
          return weight(b.urgency) - weight(a.urgency);
        }),
    [requests, query]
  );

  const availability = useMemo(() => {
    return GROUPS.map((group) => {
      const row = inventory.find((i) => normalizeGroup(i.bloodGroup) === group);
      const total = Number(row?.availableUnits ?? row?.unitsAvailable ?? row?.totalUnits ?? row?.units ?? 0);
      const reserved = Number(row?.reservedUnits ?? 0);
      return { group, total, reserved, usable: Math.max(0, total - reserved) };
    });
  }, [inventory]);

  const availabilityResult = useMemo(() => {
    const row = availability.find((x) => x.group === selectedGroup);
    const demand = requests
      .filter((r) => r.bloodGroup === selectedGroup && r.status !== "FULFILLED" && r.status !== "CANCELLED")
      .reduce((sum, r) => sum + r.units, 0);
    return { ...(row || { total: 0, reserved: 0, usable: 0 }), demand };
  }, [availability, requests, selectedGroup]);

  const requestDistance = useMemo(() => {
    if (!location) return [];
    return requestSignals
      .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
      .map((r) => ({
        ...r,
        distance: distanceKm(location.lat, location.lng, r.latitude!, r.longitude!),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }, [location, requestSignals]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationState("Browser location unavailable");
      return;
    }
    setLocationState("Locating…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocationState("Live location ready");
      },
      () => setLocationState("Location permission denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const runMatching = async (request: RequestItem) => {
    setSelectedRequest(request);
    setMatches([]);
    setMatchLoading(true);
    try {
      const res = await fetch(`${API}/api/blood-requests/${request.id}/matches`, {
        headers: headers(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Unable to load AI matches.");
      setMatches(arr(data, ["matchingDonors", "matches", "data"]));
    } catch (e) {
      setMatches([{ error: e instanceof Error ? e.message : "Matching unavailable." }]);
    } finally {
      setMatchLoading(false);
    }
  };

  return (
    <section className="bl-advanced">
      <div className="bl-topbar"><div className="bl-brand"><span className="bl-brand-mark"><Droplets size={16}/></span><strong>BloodLink<span>AI</span></strong></div><div className="bl-top-status"><i/> NETWORK INTELLIGENCE <b>LIVE</b></div><div className="bl-top-meta"><span>BL-AI / 02</span><span>SECURE</span></div></div>
      <div className="bl-advanced-head">
        <div className="bl-hero-copy">
          <span className="bl-kicker"><Radar size={14} /> BLOODLINK AI · NETWORK INTELLIGENCE</span>
          <h1>One network.<br /><em>Four intelligence layers.</em></h1>
          <p>
            A cinematic command surface for live requests, AI matching, proximity intelligence and blood availability — powered by the real BloodLink backend.
          </p>
          <div className="bl-hero-actions">
            <button className="bl-location-btn" onClick={getLocation}><Navigation size={16} /> {locationState}</button>
            <span className="bl-secure-chip"><ShieldCheck size={14}/> Server-authoritative data</span>
          </div>
        </div>
        <div className="bl-hero-orb">
          <div className="bl-orbit o1"/><div className="bl-orbit o2"/><div className="bl-orbit o3"/>
          <div className="bl-orb-core"><HeartPulse size={27}/><strong>BL<span>AI</span></strong><small>NETWORK CORE</small></div>
          <span className="bl-orb-tag t1">AI MATCH</span><span className="bl-orb-tag t2">LIVE GPS</span><span className="bl-orb-tag t3">SUPPLY</span>
        </div>
      </div>

      {error && <div className="bl-error">{error}</div>}

      <div className="bl-metrics"><div><span>ACTIVE SIGNALS</span><strong>{requestSignals.length.toString().padStart(2,"0")}</strong><small>live requests</small></div><div><span>AI MATCH LAYER</span><strong>{selectedRequest ? `${matches.length}` : "—"}</strong><small>{selectedRequest ? "signals returned" : "awaiting request"}</small></div><div><span>{selectedGroup} SUPPLY</span><strong>{availabilityResult.usable}</strong><small>usable units</small></div><div><span>LOCATION</span><strong>{location ? "ON" : "OFF"}</strong><small>{location ? "proximity active" : "optional"}</small></div></div>

      <div className="bl-feature-grid">
        <article className="bl-feature-card bl-map-card">
          <div className="bl-card-top">
            <span><Radar size={17} /> LIVE NETWORK MAP</span>
            <b>{requestSignals.length} active signals</b>
          </div>
          <div className="bl-map">
            <div className="bl-map-grid" />
            <div className="bl-map-core"><Sparkles size={19} /><small>BL-AI</small></div>
            {requestSignals.slice(0, 8).map((r, i) => (
              <button
                key={r.id}
                className={`bl-node ${r.urgency === "CRITICAL" ? "critical" : ""}`}
                style={{ left: `${14 + ((i * 19) % 72)}%`, top: `${17 + ((i * 29) % 66)}%` }}
                onClick={() => runMatching(r)}
                title={`${r.bloodGroup} · ${r.hospital}`}
              >
                <i />
                <span>{r.bloodGroup}</span>
              </button>
            ))}
            {location && <div className="bl-you" title="Your shared location"><MapPin size={16} /></div>}
          </div>
          <div className="bl-map-legend">
            <span><i className="dot red" /> Emergency</span>
            <span><i className="dot" /> Request signal</span>
            <span><i className="dot me" /> Your location</span>
          </div>
        </article>

        <article className="bl-feature-card">
          <div className="bl-card-top">
            <span><BrainCircuit size={17} /> AI MATCHING 2.0</span>
            <b>LIVE ENGINE</b>
          </div>
          <p className="bl-card-copy">Select a real request and query the backend match endpoint. Scores, compatibility, distance and explanations come from the server.</p>
          <div className="bl-request-list">
            {requestSignals.slice(0, 5).map((r) => (
              <button key={r.id} className="bl-request-row" onClick={() => runMatching(r)}>
                <span className="bl-blood">{r.bloodGroup}</span>
                <span><strong>{r.hospital}</strong><small>{r.city} · {r.units} unit{r.units === 1 ? "" : "s"}</small></span>
                <b className={`urg ${r.urgency.toLowerCase()}`}>{r.urgency}</b>
              </button>
            ))}
            {!loading && !requestSignals.length && <div className="bl-empty">No active request signals.</div>}
          </div>
          {selectedRequest && (
            <div className="bl-match-panel">
              <div><strong>{selectedRequest.bloodGroup} · {selectedRequest.hospital}</strong><span>{matchLoading ? "Analysing…" : `${matches.length} signals`}</span></div>
              {matches.slice(0, 4).map((m, i) => {
                if (m?.error) return <small key={i}>{m.error}</small>;
                const score = Number(m?.matchScore);
                const dist = Number(m?.distanceKm ?? m?.distance);
                return (
                  <div className="bl-match-row" key={m?.id || i}>
                    <span>{m?.bloodGroup || selectedRequest.bloodGroup}</span>
                    <span>{Number.isFinite(dist) ? `${dist.toFixed(1)} km` : "—"}</span>
                    <strong>{Number.isFinite(score) ? `${Math.round(score)}%` : "—"}</strong>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="bl-feature-card">
          <div className="bl-card-top">
            <span><MapPin size={17} /> LOCATION INTELLIGENCE</span>
            <b>{location ? "GPS ACTIVE" : "OPTIONAL"}</b>
          </div>
          <div className="bl-location-score">
            <div><Target size={22} /><strong>{location ? "Live proximity" : "Share location"}</strong><small>{location ? "Nearest request signals ranked by distance" : "Use your browser location to rank mapped requests"}</small></div>
          </div>
          <div className="bl-distance-list">
            {requestDistance.map((r) => (
              <div key={r.id}><span>{r.bloodGroup} · {r.hospital}</span><strong>{r.distance.toFixed(1)} km</strong></div>
            ))}
            {!location && <div className="bl-empty">Tap “Share location” to calculate proximity.</div>}
            {location && !requestDistance.length && <div className="bl-empty">No requests contain GPS coordinates yet.</div>}
          </div>
        </article>

        <article className="bl-feature-card">
          <div className="bl-card-top">
            <span><Droplets size={17} /> SMART BLOOD AVAILABILITY</span>
            <b>LIVE INVENTORY</b>
          </div>
          <div className="bl-group-picker">
            {GROUPS.map((g) => <button key={g} className={selectedGroup === g ? "active" : ""} onClick={() => setSelectedGroup(g)}>{g}</button>)}
          </div>
          <div className="bl-availability-main">
            <div><span>{selectedGroup}</span><strong>{availabilityResult.usable}</strong><small>usable units</small></div>
            <div><span>DEMAND</span><strong>{availabilityResult.demand}</strong><small>open requested units</small></div>
            <div><span>RESERVED</span><strong>{availabilityResult.reserved}</strong><small>held units</small></div>
          </div>
          <div className="bl-health">
            <div><span>Supply / demand signal</span><strong>{availabilityResult.demand === 0 ? "STABLE" : availabilityResult.usable >= availabilityResult.demand ? "COVERED" : "SHORTAGE"}</strong></div>
            <div className="bl-bar"><i style={{ width: `${Math.min(100, availabilityResult.demand ? (availabilityResult.usable / availabilityResult.demand) * 100 : 100)}%` }} /></div>
          </div>
        </article>
      </div>

      <div className="bl-footer-note">
        <ShieldCheck size={16} />
        <span>Backend-first intelligence · compatibility and match results remain server-authoritative.</span>
        <span className="bl-role">{role || "NETWORK"}</span>
        <Activity size={15} />
        <span>LIVE</span>
      </div>

      <footer className="bl-footer">
        <div className="bl-footer-grid">
          <div className="bl-footer-brand">
            <div className="bl-footer-logo"><Droplets size={20}/></div>
            <strong>BloodLink<span>AI</span></strong>
            <small>INTELLIGENT BLOOD NETWORK</small>
            <p>Connecting blood intelligence, emergency response and verified healthcare operations through one secure network.</p>
          </div>
          <div><small className="bl-footer-title">INTELLIGENCE</small><a href="#">Network Map <ArrowUpRight size={13}/></a><a href="#">AI Matching 2.0 <ArrowUpRight size={13}/></a><a href="#">Location Intelligence <ArrowUpRight size={13}/></a></div>
          <div><small className="bl-footer-title">NETWORK</small><a href="#">Smart Availability <ArrowUpRight size={13}/></a><a href="#">Emergency Response <ArrowUpRight size={13}/></a><a href="#">Verified Operations <ArrowUpRight size={13}/></a></div>
          <div className="bl-footer-status-card"><small className="bl-footer-title">SYSTEM STATUS</small><div><i/> Network operational</div><span><LockKeyhole size={13}/> Protected workspace</span><span><Activity size={13}/> Live intelligence layer</span></div>
        </div>
        <div className="bl-footer-bottom"><span>© 2026 BloodLink AI. Built for faster, smarter blood coordination.</span><span>Secure · Intelligent · Human-first</span></div>
      </footer>

      <style jsx>{`
        .bl-advanced{max-width:1500px;margin:0 auto;padding:24px 32px 90px;color:#21151a;position:relative;overflow:hidden}.bl-advanced:before{content:"";position:absolute;width:680px;height:680px;border-radius:50%;right:-300px;top:140px;background:radial-gradient(circle,rgba(213,44,91,.13),transparent 68%);pointer-events:none}.bl-topbar{height:58px;border:1px solid rgba(231,214,220,.9);background:rgba(255,255,255,.72);backdrop-filter:blur(18px);border-radius:18px;display:flex;align-items:center;padding:0 16px;gap:18px;box-shadow:0 16px 55px rgba(65,25,40,.07);position:relative;z-index:5}.bl-brand{display:flex;align-items:center;gap:9px;margin-right:auto}.bl-brand strong{font-size:15px;letter-spacing:-.03em}.bl-brand strong span{color:#c52a58}.bl-brand-mark{width:32px;height:32px;border-radius:11px;background:linear-gradient(145deg,#a91646,#e34e78);color:#fff;display:grid;place-items:center;box-shadow:0 8px 22px rgba(169,22,70,.25)}.bl-top-status{font-size:9px;letter-spacing:.13em;font-weight:900;display:flex;align-items:center;gap:7px;color:#6f5d64}.bl-top-status i{width:7px;height:7px;background:#31b978;border-radius:50%;box-shadow:0 0 0 5px rgba(49,185,120,.1)}.bl-top-status b{color:#31a76e}.bl-top-meta{display:flex;gap:8px;font-size:8px;letter-spacing:.12em;color:#9a858c}.bl-top-meta span{border-left:1px solid #eadfe2;padding-left:10px}.bl-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.bl-metrics>div{background:rgba(255,255,255,.68);border:1px solid #eee0e4;border-radius:18px;padding:15px 17px;box-shadow:0 14px 40px rgba(80,26,46,.045)}.bl-metrics span{font-size:8px;letter-spacing:.15em;color:#89777e;font-weight:900}.bl-metrics strong{display:block;font-size:27px;letter-spacing:-.04em;margin:4px 0 0}.bl-metrics small{font-size:9px;color:#9b8990}
        .bl-advanced-head{display:flex;justify-content:space-between;gap:48px;align-items:center;margin-bottom:34px;min-height:390px;position:relative}.bl-hero-copy{max-width:760px;position:relative;z-index:2}.bl-hero-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:24px}.bl-secure-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid #eadde1;background:rgba(255,255,255,.65);border-radius:999px;padding:12px 15px;font-size:10px;font-weight:850;color:#77666d}.bl-hero-orb{width:360px;height:360px;position:relative;flex:0 0 360px;display:grid;place-items:center}.bl-orbit{position:absolute;border:1px solid rgba(181,29,69,.16);border-radius:50%;transform:rotate(-18deg)}.bl-orbit.o1{width:270px;height:270px;animation:spin 16s linear infinite}.bl-orbit.o2{width:330px;height:150px;animation:spin 22s linear infinite reverse}.bl-orbit.o3{width:190px;height:330px;animation:spin 27s linear infinite}.bl-orb-core{width:130px;height:130px;border-radius:38px;background:linear-gradient(145deg,#74122f,#d83f6d);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:0 0 0 18px rgba(181,29,69,.06),0 25px 80px rgba(153,20,63,.3);position:relative;z-index:2}.bl-orb-core strong{font-size:22px;letter-spacing:-.06em}.bl-orb-core strong span{color:#ff9db6}.bl-orb-core small{font-size:7px;letter-spacing:.16em;opacity:.72}.bl-orb-tag{position:absolute;padding:7px 10px;border:1px solid #ead9df;background:rgba(255,255,255,.86);backdrop-filter:blur(10px);border-radius:999px;font-size:8px;font-weight:900;letter-spacing:.1em;color:#6d5660;box-shadow:0 12px 28px rgba(75,26,43,.08);z-index:3}.bl-orb-tag.t1{top:48px;right:4px}.bl-orb-tag.t2{bottom:66px;left:4px}.bl-orb-tag.t3{top:145px;right:-5px}@keyframes spin{to{transform:rotate(342deg)}}

        .bl-kicker{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.16em;font-weight:800;color:#b11d45}
        .bl-advanced h1{font-size:clamp(42px,5vw,76px);line-height:.95;letter-spacing:-.055em;margin:14px 0}
        .bl-advanced h1 em{font-style:normal;color:#b11d45}
        .bl-advanced-head p{max-width:650px;color:#786a70;font-size:16px;line-height:1.7;margin:0}
        .bl-location-btn{border:1px solid #eadde1;background:#fff;border-radius:999px;padding:13px 18px;display:flex;gap:8px;align-items:center;font-weight:800;white-space:nowrap;box-shadow:0 12px 35px rgba(78,28,43,.08)}
        .bl-error{background:#fff0f2;color:#a5193e;border:1px solid #f2cbd5;border-radius:14px;padding:13px 16px;margin-bottom:20px}
        .bl-feature-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:20px}
        .bl-feature-card{background:rgba(255,255,255,.82);border:1px solid #eee0e4;border-radius:28px;padding:22px;box-shadow:0 20px 70px rgba(80,26,46,.07);min-width:0}
        .bl-card-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px}
        .bl-card-top span{display:flex;gap:8px;align-items:center;font-size:11px;letter-spacing:.12em;font-weight:900;color:#6e5961}
        .bl-card-top b{font-size:10px;color:#b11d45}
        .bl-map{height:390px;border-radius:21px;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 50%,rgba(212,45,91,.18),transparent 26%),linear-gradient(145deg,#fff7f9,#f5e9ed)}
        .bl-map-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(170,67,98,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(170,67,98,.08) 1px,transparent 1px);background-size:38px 38px;transform:perspective(500px) rotateX(58deg) scale(1.35);transform-origin:center}
        .bl-map-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:86px;height:86px;border-radius:50%;display:flex;flex-direction:column;justify-content:center;align-items:center;background:linear-gradient(145deg,#9e123e,#e54472);color:#fff;box-shadow:0 0 0 12px rgba(185,26,73,.08),0 0 55px rgba(185,26,73,.35);z-index:2}
        .bl-map-core small{font-size:9px;letter-spacing:.15em}
        .bl-node{position:absolute;z-index:3;border:0;background:transparent;transform:translate(-50%,-50%);cursor:pointer;color:#351b25}
        .bl-node i{display:block;width:15px;height:15px;background:#b71e4d;border-radius:50%;box-shadow:0 0 0 7px rgba(183,30,77,.12),0 0 22px rgba(183,30,77,.35)}
        .bl-node.critical i{background:#ef3e50;animation:pulse 1.4s infinite}
        .bl-node span{font-size:10px;font-weight:900;margin-top:5px;display:block}
        .bl-you{position:absolute;right:22px;bottom:20px;width:36px;height:36px;border-radius:50%;background:#191318;color:#fff;display:grid;place-items:center;z-index:4;box-shadow:0 8px 25px #0003}
        .bl-map-legend{display:flex;gap:18px;flex-wrap:wrap;padding:14px 2px 0;font-size:10px;color:#75656b}
        .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#b71e4d;margin-right:6px}.dot.red{background:#ef3e50}.dot.me{background:#191318}
        .bl-card-copy{font-size:13px;line-height:1.65;color:#786a70;margin:0 0 14px}
        .bl-request-list{display:grid;gap:7px;max-height:230px;overflow:auto}
        .bl-request-row{border:1px solid #f0e5e8;background:#fff;border-radius:14px;padding:11px;display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;text-align:left;cursor:pointer}
        .bl-request-row:hover{border-color:#e2aebe;transform:translateY(-1px)}
        .bl-blood{font-weight:950;color:#b11d45;font-size:14px}.bl-request-row strong{display:block;font-size:12px}.bl-request-row small{display:block;color:#8c7b82;font-size:10px;margin-top:2px}
        .urg{font-size:9px;letter-spacing:.08em}.urg.critical{color:#df263f}.urg.high{color:#c75a22}.urg.medium{color:#8a6a17}.urg.low{color:#528061}
        .bl-match-panel{margin-top:12px;padding:13px;border-radius:15px;background:#24151c;color:#fff}.bl-match-panel>div:first-child{display:flex;justify-content:space-between;font-size:11px}.bl-match-panel span{opacity:.65}
        .bl-match-row{display:grid;grid-template-columns:1fr 1fr auto;padding:9px 0;border-bottom:1px solid #ffffff16;font-size:11px}.bl-match-row:last-child{border-bottom:0}.bl-match-row strong{color:#ff91ad}
        .bl-location-score{background:linear-gradient(135deg,#2a1820,#5e2037);border-radius:18px;padding:18px;color:#fff;margin-bottom:13px}.bl-location-score div{display:grid;grid-template-columns:auto 1fr;column-gap:11px}.bl-location-score svg{grid-row:span 2}.bl-location-score strong{font-size:14px}.bl-location-score small{opacity:.68;font-size:10px;margin-top:3px}
        .bl-distance-list{display:grid;gap:7px}.bl-distance-list>div{display:flex;justify-content:space-between;border-bottom:1px solid #f0e6e9;padding:8px 2px;font-size:11px}.bl-distance-list strong{color:#b11d45}
        .bl-group-picker{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}.bl-group-picker button{border:1px solid #eadde1;background:#fff;border-radius:9px;padding:7px 10px;font-size:11px;font-weight:800;cursor:pointer}.bl-group-picker button.active{background:#b11d45;color:#fff;border-color:#b11d45}
        .bl-availability-main{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px}.bl-availability-main>div{background:#faf4f6;border-radius:15px;padding:14px}.bl-availability-main span,.bl-availability-main small{display:block;font-size:9px;color:#8c7b82;letter-spacing:.08em}.bl-availability-main strong{display:block;font-size:27px;margin:5px 0;color:#2b1820}
        .bl-health{margin-top:14px}.bl-health>div:first-child{display:flex;justify-content:space-between;font-size:11px;font-weight:800}.bl-health strong{color:#b11d45}.bl-bar{height:8px;background:#f0e2e6;border-radius:20px;margin-top:9px;overflow:hidden}.bl-bar i{display:block;height:100%;background:linear-gradient(90deg,#b11d45,#ed6c92);border-radius:20px}
        .bl-empty{padding:15px;text-align:center;color:#98888e;font-size:11px;background:#faf6f7;border-radius:12px}
        .bl-footer{margin:54px -32px -90px;background:linear-gradient(145deg,#1b1116,#32121f 58%,#170d12);color:#fff;padding:56px 32px 22px;position:relative;overflow:hidden}.bl-footer:before{content:"";position:absolute;width:500px;height:300px;right:-120px;top:-160px;border-radius:50%;background:radial-gradient(circle,rgba(235,73,119,.25),transparent 68%)}.bl-footer-grid{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:1.55fr .8fr .8fr 1fr;gap:42px;position:relative}.bl-footer-brand{display:flex;flex-direction:column;align-items:flex-start}.bl-footer-logo{width:42px;height:42px;border-radius:14px;background:linear-gradient(145deg,#a71647,#e74d7b);display:grid;place-items:center;box-shadow:0 12px 30px rgba(220,54,105,.25);margin-bottom:15px}.bl-footer-brand>strong{font-size:22px;letter-spacing:-.05em}.bl-footer-brand>strong span{color:#ff8bab}.bl-footer-brand>small{font-size:8px;letter-spacing:.18em;color:#c29da9;margin-top:4px}.bl-footer-brand p{max-width:370px;color:#a98c98;font-size:12px;line-height:1.7;margin:17px 0 0}.bl-footer-title{display:block;font-size:8px;letter-spacing:.18em;font-weight:900;color:#d27a96;margin-bottom:17px}.bl-footer a{display:flex;align-items:center;gap:6px;color:#d9c4cb;text-decoration:none;font-size:11px;margin:0 0 13px;transition:.2s}.bl-footer a:hover{color:#fff;transform:translateX(2px)}.bl-footer-status-card{border:1px solid #ffffff13;background:#ffffff07;border-radius:18px;padding:18px}.bl-footer-status-card>div{display:flex;align-items:center;gap:8px;font-size:11px;margin-bottom:13px}.bl-footer-status-card>div i{width:7px;height:7px;border-radius:50%;background:#59d89b;box-shadow:0 0 0 5px rgba(89,216,155,.08)}.bl-footer-status-card>span{display:flex;align-items:center;gap:7px;color:#9f8993;font-size:10px;margin-top:9px}.bl-footer-bottom{max-width:1440px;margin:42px auto 0;padding-top:18px;border-top:1px solid #ffffff12;display:flex;justify-content:space-between;gap:15px;color:#8f7681;font-size:9px;letter-spacing:.03em}.bl-footer-bottom span:last-child{color:#c79aaa}
.bl-footer-note{margin-top:22px;border-radius:16px;background:#21151a;color:#fff;padding:14px 17px;display:flex;align-items:center;gap:9px;font-size:10px}.bl-footer-note svg{color:#ff8cab}.bl-footer-note .bl-role{margin-left:auto;padding:5px 9px;border:1px solid #ffffff18;border-radius:99px}.bl-footer-note>span:last-child{color:#71d59c;font-weight:900}
        @keyframes pulse{50%{box-shadow:0 0 0 12px rgba(239,62,80,.03),0 0 35px rgba(239,62,80,.6)}}
        @media(max-width:900px){.bl-advanced{padding:24px 18px}.bl-hero-orb{width:280px;height:280px;flex-basis:280px}.bl-footer{margin-left:-18px;margin-right:-18px;padding-left:18px;padding-right:18px}.bl-footer-grid{grid-template-columns:1fr 1fr}.bl-footer-bottom{flex-direction:column}.bl-metrics{grid-template-columns:repeat(2,1fr)}.bl-top-meta{display:none}.bl-advanced-head{align-items:flex-start;flex-direction:column}.bl-feature-grid{grid-template-columns:1fr}.bl-map{height:320px}}
        @media(max-width:560px){.bl-advanced-head{min-height:auto}.bl-hero-orb{width:240px;height:240px;flex-basis:240px}.bl-orb-core{width:105px;height:105px}.bl-orbit.o1{width:190px;height:190px}.bl-orbit.o2{width:225px;height:105px}.bl-orbit.o3{width:130px;height:225px}.bl-footer-grid{grid-template-columns:1fr}.bl-topbar{height:52px}.bl-top-status{display:none}.bl-metrics{grid-template-columns:1fr 1fr}.bl-advanced h1{font-size:43px}.bl-availability-main{grid-template-columns:1fr}.bl-footer-note{flex-wrap:wrap}.bl-footer-note .bl-role{margin-left:0}}
      `}</style>
    </section>
  );
}
