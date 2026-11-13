"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import {

  Activity,

  ArrowRight,

  ArrowUpRight,

  Bell,

  BrainCircuit,

  CheckCircle2,

  Clock3,

  Droplets,

  HeartPulse,

  Hospital,

  LockKeyhole,

  MapPin,

  Network,

  PackageCheck,

  Radio,

  ShieldCheck,

  Sparkles,

  Users,

  Zap,

} from "lucide-react";

import { useRouter } from "next/navigation";





const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

type InventoryItem = {
  _id?: string;
  bloodGroup?: string;
  unitsAvailable?: number;
  availableUnits?: number;
  reservedUnits?: number;
  units?: number;
  totalUnits?: number;
  updatedAt?: string;
  lastUpdated?: string;
};

type BloodRequest = {
  _id?: string;
  id?: string;
  bloodGroup?: string;
  group?: string;
  unitsRequired?: number;
  units?: number;
  hospitalName?: string;
  hospital?: { name?: string; hospitalName?: string; city?: string };
  city?: string;
  location?: { city?: string; address?: string };
  urgency?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
  matchScore?: number;
  aiMatchScore?: number;
  etaMinutes?: number;
};

type Transaction = {
  _id?: string;
  bloodGroup?: string;
  type?: string;
  units?: number;
  notes?: string;
  createdAt?: string;
};

const authHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("bloodlink_token") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const asArray = (payload: any, keys: string[]) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const groupName = (value?: string) =>
  String(value || "").replace("−", "-").replace(/\s+/g, "");

const timeAgo = (value?: string) => {
  if (!value) return "recently";
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} days ago`;
};

const features = [

  { icon: BrainCircuit, title: "AI-Powered Matching", text: "Find compatible donors intelligently using live availability and blood-group signals." },

  { icon: Bell, title: "Real-Time Alerts", text: "Surface urgent requests and inventory changes before they become critical." },

  { icon: ShieldCheck, title: "Verified Network", text: "Keep blood-bank, donor and hospital operations inside one trusted network." },

  { icon: Droplets, title: "Live Inventory", text: "Monitor stock across all eight blood groups from one command center." },

  { icon: MapPin, title: "Location Intelligence", text: "Understand nearby hospitals, requests and response distances instantly." },

  { icon: LockKeyhole, title: "Secure Operations", text: "Keep sensitive operational workflows protected with role-based access." },

];



export default function BloodBankPage() {

  const router = useRouter();

  const [checking, setChecking] = useState(true);

  // One-time opening stock onboarding
  const [openingStockOpen, setOpeningStockOpen] = useState(false);
  const [openingStockSaving, setOpeningStockSaving] = useState(false);
  const [openingStockError, setOpeningStockError] = useState("");
  const [openingStock, setOpeningStock] = useState<Record<string, string>>({
    "O+": "", "O-": "", "A+": "", "A-": "",
    "B+": "", "B-": "", "AB+": "", "AB-": "",
  });
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [requestData, setRequestData] = useState<BloodRequest[]>([]);
  const [transactionData, setTransactionData] = useState<Transaction[]>([]);
  const [dataError, setDataError] = useState("");
  const [syncing, setSyncing] = useState(false);



  const loadBloodBankData = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    else setSyncing(true);
    setDataError("");

    try {
      const headers = authHeaders();

      const [inventoryRes, requestsRes, transactionsRes] = await Promise.all([
        fetch(`${API}/api/inventory/my`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API}/api/blood-requests/assigned-to-me`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API}/api/inventory/transactions`, {
          headers,
          cache: "no-store",
        }),
      ]);

      if ([inventoryRes, requestsRes, transactionsRes].some((r) => r.status === 401 || r.status === 403)) {
        localStorage.removeItem("bloodlink_token");
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      const [inventoryJson, requestsJson, transactionsJson] = await Promise.all([
        inventoryRes.json().catch(() => ({})),
        requestsRes.json().catch(() => ({})),
        transactionsRes.json().catch(() => ({})),
      ]);

      if (!inventoryRes.ok) throw new Error(inventoryJson?.message || "Inventory request failed");
      if (!requestsRes.ok) throw new Error(requestsJson?.message || "Blood request request failed");
      if (!transactionsRes.ok) throw new Error(transactionsJson?.message || "Transaction request failed");

      setInventoryData(asArray(inventoryJson, ["inventory", "data"]));
      setRequestData(asArray(requestsJson, ["requests", "bloodRequests", "data"]));
      setTransactionData(asArray(transactionsJson, ["transactions", "data"]));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to sync Blood Bank data.");
    } finally {
      setChecking(false);
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("bloodlink_token");
    const raw = localStorage.getItem("bloodlink_user");

    if (!token || !raw) {
      router.replace("/login");
      return;
    }

    try {
      const role = String(JSON.parse(raw)?.role || "").toUpperCase();

      if (role !== "BLOOD_BANK") {
        router.replace(
          role === "DONOR"
            ? "/donor"
            : role === "HOSPITAL"
              ? "/hospital"
              : role === "ADMIN"
                ? "/admin"
                : "/"
        );
        return;
      }

      loadBloodBankData();
    } catch {
      router.replace("/login");
    }
  }, [loadBloodBankData, router]);

  const liveInventory = useMemo(() => {
    return GROUPS.map((group) => {
      const item = inventoryData.find(
        (entry) => groupName(entry.bloodGroup) === group
      );

      const units = Number(
        item?.availableUnits ?? item?.unitsAvailable ?? item?.totalUnits ?? item?.units ?? 0
      );
      const reserved = Number(item?.reservedUnits ?? 0);
      const usable = Math.max(0, units - reserved);

      const level =
        units > 0 ? Math.min(100, Math.max(0, Math.round((usable / units) * 100))) : 0;

      let status = "Critical";
      if (usable >= 100) status = "Healthy";
      else if (usable >= 50) status = "Stable";
      else if (usable >= 20) status = "Low";

      return [group, usable, level, status] as const;
    });
  }, [inventoryData]);

  const activeRequests = useMemo(
    () =>
      requestData.filter((r) =>
        ["OPEN", "DONOR_ACCEPTED", "IN_PROGRESS", "PENDING"].includes(
          String(r.status || "").toUpperCase()
        )
      ),
    [requestData]
  );

  const totalAvailable = useMemo(
    () => liveInventory.reduce((sum, item) => sum + item[1], 0),
    [liveInventory]
  );

  const healthyGroups = useMemo(
    () => liveInventory.filter((item) => item[3] === "Healthy" || item[3] === "Stable").length,
    [liveInventory]
  );

  const heroMatchRate = useMemo(() => {
    const scored = activeRequests
      .map((r) => Number(r.aiMatchScore ?? r.matchScore))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!scored.length) return null;
    return (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1);
  }, [activeRequests]);

  const mappedRequests = useMemo(() => {
    return activeRequests.slice(0, 4).map((request, index) => {
      const group = groupName(request.bloodGroup || request.group) || "—";
      const units = Number(request.unitsRequired ?? request.units ?? 0);
      const hospital =
        request.hospitalName ||
        request.hospital?.name ||
        request.hospital?.hospitalName ||
        "Hospital request";
      const city =
        request.city ||
        request.location?.city ||
        request.hospital?.city ||
        "Connected network";
      const score = Number(request.aiMatchScore ?? request.matchScore);
      const urgency = String(request.urgency || request.priority || "MEDIUM").toUpperCase();

      return {
        id: request._id || request.id || `${group}-${index}`,
        group,
        units: String(units).padStart(2, "0"),
        hospital,
        city,
        match: Number.isFinite(score) && score > 0 ? `${score.toFixed(1)}%` : "AI MATCH",
        eta: request.etaMinutes ? `${request.etaMinutes} min` : "Live",
        level: urgency === "CRITICAL" || urgency === "HIGH" ? urgency : "MEDIUM",
        createdAt: request.createdAt,
      };
    });
  }, [activeRequests]);

  const liveEvents = useMemo(() => {
    const requestEvents = activeRequests.slice(0, 3).map((r) => ({
      title: "Blood request received",
      detail: `${groupName(r.bloodGroup || r.group) || "Blood"} � ${r.hospitalName || r.hospital?.name || "Connected hospital"}`,
      time: timeAgo(r.createdAt),
      Icon: Hospital,
    }));

    const txEvents = transactionData.slice(0, 4).map((tx) => ({
      title: "Inventory updated",
      detail: `${groupName(tx.bloodGroup) || "Blood"} � ${tx.units ?? 0} units � ${tx.type || "transaction"}`,
      time: timeAgo(tx.createdAt),
      Icon: Droplets,
    }));

    return [...requestEvents, ...txEvents].slice(0, 5);
  }, [activeRequests, transactionData]);





  // Open the onboarding modal automatically when this Blood Bank has no inventory.
  useEffect(() => {
    if (checking || dataError || inventoryData.length > 0 || typeof window === "undefined") {
      return;
    }

    const key = `bloodlink_opening_stock_seen_${localStorage.getItem("bloodlink_user") || "bank"}`;
    if (!localStorage.getItem(key)) {
      setOpeningStockError("");
      setOpeningStockOpen(true);
      localStorage.setItem(key, "1");
    }
  }, [checking, dataError, inventoryData.length]);

  const openOpeningStock = () => {
    setOpeningStockError("");
    setOpeningStockOpen(true);
  };

  const submitOpeningStock = async () => {
    const groups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
    const entries = groups
      .map((group) => ({ group, units: Number(openingStock[group] || 0) }))
      .filter((item) => item.units > 0);

    if (!entries.length) {
      setOpeningStockError("Enter at least one existing blood-group stock quantity.");
      return;
    }

    const invalid = entries.find(
      (item) => !Number.isInteger(item.units) || item.units < 0
    );

    if (invalid) {
      setOpeningStockError("Opening stock must be entered as whole units only.");
      return;
    }

    setOpeningStockSaving(true);
    setOpeningStockError("");

    try {
      const headers = {
        ...authHeaders(),
        "Content-Type": "application/json",
      };

      for (const item of entries) {
        const response = await fetch(`${API}/api/inventory`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            bloodGroup: item.group,
            unitsAvailable: item.units,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || `Unable to save ${item.group} opening stock.`
          );
        }
      }

      setOpeningStockOpen(false);
      setOpeningStock({
        "O+": "", "O-": "", "A+": "", "A-": "",
        "B+": "", "B-": "", "AB+": "", "AB-": "",
      });

      await loadBloodBankData(true);
    } catch (error) {
      setOpeningStockError(
        error instanceof Error ? error.message : "Unable to save opening stock."
      );
    } finally {
      setOpeningStockSaving(false);
    }
  };

  if (checking) {

    return (

      <main className="bbx-page">


        <div className="bbx-loading"><div className="bbx-loader" /> Securing Blood Bank...</div>

        <style jsx global>{css}</style>

      </main>

    );

  }



  return (

    <main className="bbx-page">




      {/* HERO */}

      <section className="bbx-hero" id="top">

        <div className="bbx-grid" />

        <div className="bbx-hero-glow glow-left" />

        <div className="bbx-hero-glow glow-right" />

        <div className="bbx-floating-rbc rbc-a" />

        <div className="bbx-floating-rbc rbc-b" />

        <div className="bbx-floating-rbc rbc-c" />



        <div className="bbx-container bbx-hero-layout">

          <motion.div

            className="bbx-hero-copy"

            initial={{ opacity: 0, x: -28 }}

            animate={{ opacity: 1, x: 0 }}

            transition={{ duration: 0.7 }}

          >

            <div className="bbx-pill"><span /> AI POWERED BLOOD NETWORK</div>

            <h1>

              Every unit.<br />

              <em>Ready when it matters.</em>

            </h1>

            <p>

              A smarter blood-bank command center for live inventory, emergency response,

              intelligent matching and faster coordination.

            </p>



            <div className="bbx-hero-actions">

              <button onClick={() => document.getElementById("inventory")?.scrollIntoView({ behavior: "smooth" })}>

                <PackageCheck size={16} /> Explore inventory <ArrowRight size={15} />

              </button>

              <div className="bbx-network-live"><i /> NETWORK LIVE</div>

            </div>



            <div className="bbx-hero-stats">

              <div><strong>{totalAvailable.toLocaleString("en-IN")}</strong><span>usable units</span></div>

              <div><strong>{String(activeRequests.length).padStart(2, "0")}</strong><span>active requests</span></div>

              <div><strong>{heroMatchRate ? `${heroMatchRate}%` : `${healthyGroups}/8`}</strong><span>{heroMatchRate ? "AI match rate" : "groups healthy"}</span></div>

            </div>

          </motion.div>



          <motion.div

            className="bbx-hero-visual"

            initial={{ opacity: 0, scale: 0.94 }}

            animate={{ opacity: 1, scale: 1 }}

            transition={{ duration: 0.9, delay: 0.05 }}

          >

            <div className="bbx-visual-aura" />

            <div className="bbx-orbit orbit-one" />

            <div className="bbx-orbit orbit-two" />

            <div className="bbx-orbit-dot od-one" />

            <div className="bbx-orbit-dot od-two" />



            <motion.div

              className="bbx-blood-sphere"

              animate={{ y: [0, -9, 0], rotateY: [-7, 7, -7], rotateX: [2, -2, 2] }}

              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}

            >

              <div className="bbx-blood-core" />

              <div className="bbx-blood-highlight" />

            </motion.div>



            <motion.div className="bbx-float-card ai-card" animate={{ y: [0, -7, 0] }} transition={{ duration: 4, repeat: Infinity }}>

              <div className="bbx-card-icon"><Sparkles size={15} /></div>

              <div><small>AI MATCH</small><strong>{heroMatchRate ? `${heroMatchRate}%` : "LIVE"}</strong><span>{heroMatchRate ? "active request average" : "waiting for scored requests"}</span></div>

              <b />

            </motion.div>



            <motion.div className="bbx-float-card saved-card" animate={{ y: [0, 6, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}>

              <HeartPulse size={17} />

              <div><small>LIVES SUPPORTED</small><strong>12,480</strong><span>and counting</span></div>

            </motion.div>



            <motion.div className="bbx-float-card inventory-card" animate={{ y: [0, -5, 0] }} transition={{ duration: 4.8, repeat: Infinity, delay: 0.2 }}>

              <small>LIVE INVENTORY</small><strong>{totalAvailable.toLocaleString("en-IN")}</strong>

              <div className="mini-bars">{[35, 52, 44, 72, 55, 82, 65].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>

            </motion.div>



            <div className="bbx-visual-caption"><span /><b>Blood Bank Network</b><small>24/7 intelligent monitoring</small></div>

          </motion.div>

        </div>

      </section>



      {/* EMERGENCY */}

      <section className="bbx-section bbx-emergency-section" id="requests">

        <div className="bbx-container">

          <div className="bbx-section-head">

            <div>

              <div className="bbx-eyebrow"><i /> LIVE EMERGENCY REQUESTS</div>

              <h2>Real requests. <em>Intelligent response.</em></h2>

              <p>Critical blood requests from connected hospitals, prioritised with AI-assisted donor matching.</p>

            </div>

            <button className="bbx-outline-btn">View all requests <ArrowUpRight size={14} /></button>

          </div>



          <div className="bbx-request-grid">
            {mappedRequests.length > 0 ? (
              <>
                <motion.article className="bbx-feature-request" whileHover={{ y: -5 }} transition={{ duration: 0.25 }}>
                  <div className="bbx-feature-request-bg" />
                  <div className="bbx-request-top">
                    <span className={mappedRequests[0].level.toLowerCase()}>{mappedRequests[0].level}</span>
                    <time>{timeAgo(mappedRequests[0].createdAt)}</time>
                  </div>
                  <div className="bbx-request-hospital">
                    <div className="hospital-icon"><Hospital size={18} /></div>
                    <div>
                      <strong>{mappedRequests[0].hospital}</strong>
                      <span><MapPin size={11} /> {mappedRequests[0].city}</span>
                    </div>
                  </div>
                  <div className="bbx-blood-request-line">
                    <strong>{mappedRequests[0].group}</strong>
                    <span>{mappedRequests[0].units} Units Needed</span>
                  </div>
                  <div className="bbx-match-line">
                    <span><i /> {mappedRequests[0].match}{mappedRequests[0].match !== "AI MATCH" ? " AI Match" : ""}</span>
                    <small>Live hospital request</small>
                  </div>
                  <div className="bbx-progress">
                    <i style={{ width: mappedRequests[0].match === "AI MATCH" ? "55%" : mappedRequests[0].match }} />
                  </div>
                  <button className="bbx-primary-small" onClick={() => router.push("/blood-bank/requests")}>
                    Respond now <ArrowRight size={14} />
                  </button>
                </motion.article>

                <div className="bbx-secondary-requests">
                  {mappedRequests.slice(1, 4).map((request, index) => (
                    <motion.article key={request.id} className="bbx-small-request" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: index * 0.08 }} whileHover={{ y: -4 }}>
                      <div className="bbx-small-top">
                        <span className={request.level.toLowerCase()}>{request.level}</span>
                        <time>{timeAgo(request.createdAt)}</time>
                      </div>
                      <div className="bbx-small-group"><strong>{request.group}</strong><span>{request.units} Units</span></div>
                      <h3>{request.hospital}</h3>
                      <span className="bbx-location"><MapPin size={11} /> {request.city}</span>
                      <div className="bbx-small-match"><span><i /> {request.match} Match</span><span>ETA {request.eta}</span></div>
                      <button onClick={() => router.push("/blood-bank/requests")}>Help now <ArrowRight size={13} /></button>
                    </motion.article>
                  ))}
                </div>
              </>
            ) : (
              <div className="bbx-feature-request" style={{ gridColumn: "1 / -1", minHeight: 220 }}>
                <div className="bbx-request-top"><span className="medium">CLEAR</span><time>Live</time></div>
                <div className="bbx-request-hospital" style={{ marginTop: 50 }}>
                  <div className="hospital-icon"><CheckCircle2 size={18} /></div>
                  <div>
                    <strong>No active blood requests</strong>
                    <span><MapPin size={11} /> Waiting for connected hospitals</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* LIVE NETWORK */}

      <section className="bbx-section bbx-network-section" id="activity">

        <div className="bbx-container bbx-network-layout">

          <div className="bbx-network-copy">

            <div className="bbx-eyebrow green"><i /> LIVE NETWORK ACTIVITY</div>

            <h2>A network that <em>never sleeps.</em></h2>

            <p>Real-time actions happening across hospitals, donors and the BloodLink AI system.</p>



            <div className="bbx-event-list">

              {(liveEvents.length ? liveEvents : [
                { title: "Waiting for live network activity", detail: "No recent requests or inventory transactions", time: "now", Icon: Radio },
              ]).map(({ title, detail, time, Icon }, i) => (
                <motion.div key={`${String(title)}-${i}
/* Opening stock onboarding */
.bbx-inventory-head-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.bbx-opening-btn{border:1px solid #d92d6350;background:#fff8fb;color:#bd1c51;border-radius:999px;padding:9px 12px;display:flex;align-items:center;gap:6px;font-size:8px;font-weight:900;letter-spacing:.08em;cursor:pointer}
.bbx-opening-banner{display:flex;align-items:center;gap:13px;margin:-7px 0 16px;padding:14px 16px;border:1px solid #f2d7e0;background:linear-gradient(135deg,#fff,#fff0f5);backdrop-filter:blur(18px);border-radius:18px;box-shadow:0 15px 32px #7c173c0b}
.bbx-opening-banner-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#fff0f4;color:#d5255b;flex:none}
.bbx-opening-banner>div:nth-child(2){display:flex;flex-direction:column;gap:4px;flex:1}
.bbx-opening-banner strong{font-size:11px;color:#4a1d2b}
.bbx-opening-banner span{font-size:8px;line-height:1.5;color:#987480}
.bbx-opening-banner button{border:0;background:#c31c52;color:#fff;border-radius:10px;padding:9px 12px;display:flex;align-items:center;gap:5px;font-size:9px;font-weight:850;cursor:pointer;white-space:nowrap}
.bbx-opening-overlay{position:fixed;inset:0;z-index:9999;background:#26091599;backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:20px}
.bbx-opening-modal{width:min(760px,100%);max-height:min(88vh,760px);overflow:auto;background:linear-gradient(145deg,#fff,#fff5f8);border:1px solid #fff;border-radius:28px;box-shadow:0 35px 100px #26091555;padding:26px}
.bbx-opening-top{display:flex;gap:20px;justify-content:space-between}
.bbx-opening-top h2{font-size:clamp(30px,4vw,48px);line-height:.96;letter-spacing:-.06em;margin:9px 0 8px;color:#38131f}
.bbx-opening-top h2 em{font-style:normal;background:linear-gradient(90deg,#a91443,#ed4b78);-webkit-background-clip:text;background-clip:text;color:transparent}
.bbx-opening-top p{max-width:620px;margin:0;color:#876774;font-size:11px;line-height:1.65}
.bbx-opening-close{width:34px;height:34px;border:1px solid #e8ccd6;background:#fff;border-radius:50%;color:#8d5367;font-size:22px;line-height:1;cursor:pointer;flex:none}
.bbx-opening-note{display:flex;gap:9px;align-items:flex-start;margin:19px 0;padding:12px 14px;border-radius:14px;background:#fff0f5;border:1px solid #f2d4df;color:#8c5267;font-size:9px;line-height:1.55}
.bbx-opening-note svg{color:#c82056;flex:none;margin-top:1px}
.bbx-opening-note b{color:#6b263d}
.bbx-opening-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
.bbx-opening-field{padding:11px;border:1px solid #ecd8df;background:#ffffffc9;border-radius:15px}
.bbx-opening-field>span{display:block;font-size:10px;font-weight:900;color:#8f294d;margin-bottom:7px}
.bbx-opening-field>div{display:flex;align-items:center;gap:5px}
.bbx-opening-field input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#3f1926;font-size:18px;font-weight:850}
.bbx-opening-field small{font-size:7px;color:#a17a87}
.bbx-opening-error{margin-top:11px;padding:10px 12px;border-radius:11px;background:#ffe7ed;color:#c31d50;font-size:9px;font-weight:750}
.bbx-opening-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:20px;padding-top:17px;border-top:1px solid #ecdce2}
.bbx-opening-footer>div:first-child{display:flex;flex-direction:column;gap:4px}
.bbx-opening-footer strong{font-size:9px;color:#5b2638}
.bbx-opening-footer span{font-size:8px;color:#a07887}
.bbx-opening-actions{display:flex;gap:8px}
.bbx-opening-cancel,.bbx-opening-save{border-radius:11px;padding:10px 14px;font-size:9px;font-weight:850;cursor:pointer}
.bbx-opening-cancel{border:1px solid #ead6dd;background:#fff;color:#87566a}
.bbx-opening-save{border:0;background:#c51e54;color:#fff;display:flex;align-items:center;gap:6px;box-shadow:0 12px 25px #c51e5425}
@media(max-width:700px){
  .bbx-opening-grid{grid-template-columns:1fr 1fr}
  .bbx-opening-modal{padding:20px;border-radius:22px}
  .bbx-opening-footer{align-items:stretch;flex-direction:column}
  .bbx-opening-actions{width:100%}
  .bbx-opening-actions button{flex:1}
  .bbx-opening-banner{align-items:flex-start;flex-wrap:wrap}
  .bbx-opening-banner>div:nth-child(2){min-width:calc(100% - 52px)}
  .bbx-opening-banner button{margin-left:51px}
}
`} className="bbx-event-row" initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                  <div className="event-icon"><Icon size={14} /><i /></div>
                  <div><strong>{title}</strong><span>{detail}</span></div><time>{time}</time>
                </motion.div>
              ))}

            </div>

            <button className="bbx-text-btn" onClick={() => loadBloodBankData(true)}>{syncing ? "Syncing..." : "Refresh live feed"} <ArrowRight size={14} /></button>

          </div>



          <div className="bbx-network-visual">

            <div className="network-glow" />

            <div className="network-globe">

              <div className="globe-lat lat-1" /><div className="globe-lat lat-2" /><div className="globe-lat lat-3" />

              <div className="globe-lon lon-1" /><div className="globe-lon lon-2" /><div className="globe-lon lon-3" />

              <div className="globe-land land-one" /><div className="globe-land land-two" /><div className="globe-land land-three" />

              <span className="globe-node gn1" /><span className="globe-node gn2" /><span className="globe-node gn3" /><span className="globe-node gn4" />

            </div>

            <div className="network-connect-label"><Radio size={13} /><span>Connecting<br /><b>Lives Across India</b></span></div>

            <div className="network-stat ns1"><span>●</span><small>USABLE UNITS</small><strong>{totalAvailable.toLocaleString("en-IN")}</strong></div>

            <div className="network-stat ns2"><span>●</span><small>HEALTHY GROUPS</small><strong>{healthyGroups}</strong></div>

            <div className="network-stat ns3"><span>●</span><small>ACTIVE REQUESTS</small><strong>{String(activeRequests.length).padStart(2, "0")}</strong></div>

            <div className="donor-orbs"><span>{inventoryData.length}</span><small>INVENTORY LINES</small></div>

          </div>

        </div>

      </section>



      {/* INVENTORY */}

      <section className="bbx-section bbx-inventory-section" id="inventory">

        <div className="bbx-container">

          <div className="bbx-section-head inventory-head">

            <div><div className="bbx-eyebrow"><i /> LIVE BLOOD INVENTORY</div><h2>Every unit. <em>Visible in real time.</em></h2><p>Monitor all eight blood groups from one intelligent command center.</p></div>

            <div className="bbx-sync-pill"><i /> SYNCED <Activity size={13} /></div>

          </div>



          {inventoryData.length === 0 && (
            <div className="bbx-opening-banner">
              <div className="bbx-opening-banner-icon"><Droplets size={18} /></div>
              <div>
                <strong>Complete your opening stock setup</strong>
                <span>
                  Enter the blood units physically available at this Blood Bank.
                  New collections should use the normal batch-receive workflow.
                </span>
              </div>
              <button onClick={openOpeningStock}>
                Set stock <ArrowRight size={13} />
              </button>
            </div>
          )}

          <div className="bbx-summary-grid">

            <div><small>TOTAL AVAILABLE</small><strong>{totalAvailable.toLocaleString("en-IN")}</strong><span>usable units across 8 groups</span></div>

            <div><small>AVAILABILITY</small><strong>{Math.round((healthyGroups / 8) * 100)}%</strong><span>groups healthy / stable</span></div>

            <div><small>URGENT</small><strong>{String(activeRequests.length).padStart(2, "0")}</strong><span>need response</span></div>

            <div className="ai-summary"><Sparkles size={17} /><span><b>{syncing ? "Syncing backend..." : "AI monitoring active"}</b><small>{healthyGroups} groups within healthy / stable range</small></span></div>

          </div>



          <div className="bbx-inventory-grid">
            {liveInventory.map(([group, units, level, status], i) => (
              <motion.article key={group} className="bbx-inventory-card" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} whileHover={{ y: -5, rotateX: 1 }}>
                <div className="inventory-top"><b>{group}</b><span className={status.toLowerCase()}>{status}</span></div>
                <strong>{units.toLocaleString("en-IN")}</strong><small>UNITS AVAILABLE</small>
                <div className="inventory-track"><i style={{ width: `${level}%` }} /></div>
                
              </motion.article>
            ))}

          </div>

        </div>

      </section>



      {/* FEATURES */}

      <section className="bbx-section bbx-features-section" id="features">

        <div className="bbx-container">

          <div className="bbx-centered-head"><div className="bbx-eyebrow"><i /> OUR CAPABILITIES</div><h2>One command center.<br /><em>Every critical signal.</em></h2><p>Everything a modern blood bank needs to move faster, coordinate better and keep every unit visible.</p></div>

          <div className="bbx-feature-grid">

            {features.map(({ icon: Icon, title, text }, i) => (

              <motion.article key={title} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} whileHover={{ y: -5 }}>

                <div className="feature-icon"><Icon size={18} /></div><h3>{title}</h3><p>{text}</p><ArrowUpRight className="feature-arrow" size={15} />

              </motion.article>

            ))}

          </div>

        </div>

      </section>



      {/* CTA */}

      <section className="bbx-cta-section">

        <div className="bbx-cta-glow" />

        <div className="bbx-container bbx-cta">

          <div><div className="bbx-eyebrow"><i /> TOGETHER WE CAN</div><h2>A healthier, kinder <em>tomorrow.</em></h2><p>Build a faster blood-response network where every request reaches the right people sooner.</p><button onClick={() => document.getElementById("inventory")?.scrollIntoView({ behavior: "smooth" })}>Open Blood Bank Console <ArrowRight size={15} /></button></div>

          <div className="bbx-cta-stats">

            <div><HeartPulse size={17} /><strong>12,480+</strong><span>Lives supported</span></div>

            <div><Users size={17} /><strong>50,000+</strong><span>Active donors</span></div>

            <div><Hospital size={17} /><strong>120+</strong><span>Partner hospitals</span></div>

            <div><Zap size={17} /><strong>99.7%</strong><span>Match success</span></div>

          </div>

          <div className="bbx-cta-blood"><div className="cta-drop" /><span>Every drop<br /><b>counts.</b></span></div>

        </div>

      </section>



      {openingStockOpen && (
        <div
          className="bbx-opening-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="opening-stock-title"
        >
          <motion.div
            className="bbx-opening-modal"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
          >
            <div className="bbx-opening-top">
              <div>
                <div className="bbx-eyebrow"><i /> FIRST-TIME BLOOD BANK SETUP</div>
                <h2 id="opening-stock-title">Set your <em>opening stock.</em></h2>
                <p>
                  Enter the blood already physically present in this Blood Bank before
                  BloodLink AI goes live. This becomes the starting live inventory.
                </p>
              </div>
              <button
                className="bbx-opening-close"
                onClick={() => setOpeningStockOpen(false)}
                aria-label="Close opening stock setup"
              >
                ×
              </button>
            </div>

            <div className="bbx-opening-note">
              <ShieldCheck size={16} />
              <span>
                Opening stock is recorded in the inventory audit trail. For newly collected
                blood, use the normal <b>Receive Blood</b> batch workflow.
              </span>
            </div>

            <div className="bbx-opening-grid">
              {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((group) => (
                <label key={group} className="bbx-opening-field">
                  <span>{group}</span>
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      placeholder="0"
                      value={openingStock[group]}
                      onChange={(e) =>
                        setOpeningStock((current) => ({
                          ...current,
                          [group]: e.target.value,
                        }))
                      }
                    />
                    <small>units</small>
                  </div>
                </label>
              ))}
            </div>

            {openingStockError && (
              <div className="bbx-opening-error">{openingStockError}</div>
            )}

            <div className="bbx-opening-footer">
              <div>
                <strong>Real-world workflow</strong>
                <span>Opening balance → batch receiving → reserve → issue → fulfil</span>
              </div>

              <div className="bbx-opening-actions">
                <button
                  className="bbx-opening-cancel"
                  onClick={() => setOpeningStockOpen(false)}
                  disabled={openingStockSaving}
                >
                  Later
                </button>
                <button
                  className="bbx-opening-save"
                  onClick={submitOpeningStock}
                  disabled={openingStockSaving}
                >
                  {openingStockSaving ? "Saving..." : "Save opening stock"}
                  {!openingStockSaving && <CheckCircle2 size={14} />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <style jsx global>{css}</style>

    
</main>

  );

}



const css = `

*{box-sizing:border-box}.bbx-page{min-height:100vh;overflow-x:hidden;background:#fff6fa;color:#32131f;font-family:inherit}.bbx-loading{height:100vh;display:flex;align-items:center;justify-content:center;gap:12px;color:#8f5a6c;font-size:14px}.bbx-loader{width:16px;height:16px;border:2px solid #f3c8d7;border-top-color:#d8215b;border-radius:50%;animation:bbxspin .8s linear infinite}.bbx-container{width:min(1280px,calc(100% - 64px));margin:0 auto}.bbx-hero{position:relative;min-height:585px;padding:82px 0 38px;overflow:hidden;background:radial-gradient(circle at 75% 38%,#fff 0,#fff8fb 28%,#ffe9f1 65%,#ffdbe7 100%)}.bbx-grid{position:absolute;inset:0;background-image:linear-gradient(#b72a5a0b 1px,transparent 1px),linear-gradient(90deg,#b72a5a0b 1px,transparent 1px);background-size:58px 58px;mask-image:linear-gradient(#000 20%,transparent 92%)}.bbx-hero-glow{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}.glow-left{width:420px;height:420px;left:-220px;bottom:-150px;background:#ff6f9b77}.glow-right{width:470px;height:470px;right:-210px;top:50px;background:#ff7da870}.bbx-hero-layout{position:relative;z-index:2;display:grid;grid-template-columns:46% 54%;align-items:center;min-height:465px}.bbx-hero-copy{padding-left:20px;position:relative;z-index:4}.bbx-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border-radius:999px;background:#ffffff91;border:1px solid #fff;box-shadow:0 10px 25px #8f1b3c0d;backdrop-filter:blur(15px);font-size:9px;font-weight:900;letter-spacing:.13em;color:#9b536c}.bbx-pill span{width:7px;height:7px;border-radius:50%;background:#d92359;box-shadow:0 0 0 4px #d9235914}.bbx-hero-copy h1{font-size:clamp(48px,5.3vw,78px);line-height:.92;letter-spacing:-.07em;margin:20px 0 15px;color:#35131e;font-weight:900}.bbx-hero-copy h1 em{font-style:normal;background:linear-gradient(90deg,#a31342,#ee3f70);-webkit-background-clip:text;background-clip:text;color:transparent}.bbx-hero-copy>p{max-width:540px;font-size:15px;line-height:1.65;color:#755e68;margin:0}.bbx-hero-actions{display:flex;align-items:center;gap:10px;margin-top:20px}.bbx-hero-actions button,.bbx-cta button{border:0;border-radius:14px;background:linear-gradient(135deg,#bd164d,#ed4c78);color:white;display:flex;align-items:center;gap:8px;padding:13px 17px;font-size:12px;font-weight:850;box-shadow:0 18px 35px #bd164d2c;cursor:pointer}.bbx-network-live{display:flex;align-items:center;gap:7px;padding:10px 13px;border:1px solid #0bb48638;border-radius:999px;background:#ffffff82;backdrop-filter:blur(15px);color:#087f62;font-size:9px;font-weight:900;letter-spacing:.12em}.bbx-network-live i{width:7px;height:7px;background:#0db88a;border-radius:50%;box-shadow:0 0 0 5px #0db88a15}.bbx-hero-stats{display:flex;gap:32px;margin-top:24px}.bbx-hero-stats div{display:flex;flex-direction:column}.bbx-hero-stats strong{font-size:21px;letter-spacing:-.04em}.bbx-hero-stats span{font-size:8px;color:#a17d88;text-transform:uppercase;letter-spacing:.13em;margin-top:3px}.bbx-hero-visual{height:460px;position:relative;perspective:1000px}.bbx-visual-aura{position:absolute;width:400px;height:400px;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%;background:#ff4d8140;filter:blur(70px)}.bbx-blood-sphere{position:absolute;width:245px;height:245px;left:51%;top:51%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 27% 20%,#fff 0 4%,#ffc2d1 9%,#ff668f 25%,#d21f58 54%,#8b0933 78%,#4d051d 100%);box-shadow:inset 20px 17px 35px #fff7,inset -28px -30px 45px #47001870,0 35px 65px #8e17484a;transform-style:preserve-3d}.bbx-blood-core{position:absolute;width:82px;height:82px;left:50%;top:50%;transform:translate(-50%,-50%) translateZ(22px);border-radius:50%;background:radial-gradient(circle at 33% 28%,#b81d4f,#650720 70%,#3b0317);box-shadow:inset 9px 9px 18px #ff6a9630}.bbx-blood-highlight{position:absolute;width:58px;height:33px;left:28px;top:30px;border-radius:50%;background:#fff9;filter:blur(5px);transform:rotate(-24deg)}.bbx-orbit{position:absolute;left:51%;top:51%;transform:translate(-50%,-50%);border:1px solid #d62b681c;border-radius:50%;pointer-events:none}.orbit-one{width:430px;height:145px;transform:translate(-50%,-50%) rotate(-18deg);animation:bbxorbit 11s linear infinite}.orbit-two{width:330px;height:115px;transform:translate(-50%,-50%) rotate(43deg);animation:bbxorbit2 9s linear infinite}.bbx-orbit-dot{position:absolute;width:7px;height:7px;border-radius:50%;background:#ed4b7b;box-shadow:0 0 13px #ed4b7b}.od-one{left:25%;top:27%}.od-two{right:12%;bottom:27%}.bbx-float-card{position:absolute;z-index:5;border:1px solid #fff;background:#ffffffb5;backdrop-filter:blur(20px);box-shadow:0 20px 45px #7a183d12,inset 0 1px 0 #fff;border-radius:17px}.bbx-float-card small{display:block;font-size:7px;font-weight:900;letter-spacing:.14em;color:#a26c7d}.bbx-float-card strong{display:block;color:#401825;font-size:22px;letter-spacing:-.04em}.bbx-float-card span{display:block;font-size:8px;color:#9c7885;margin-top:2px}.ai-card{left:4%;top:12%;display:flex;align-items:center;gap:9px;padding:10px 13px}.ai-card .bbx-card-icon{width:31px;height:31px;display:grid;place-items:center;border-radius:10px;background:#fff0f4;color:#d72159}.ai-card b{width:6px;height:6px;border-radius:50%;background:#0db88a;margin-left:3px}.saved-card{right:1%;top:17%;display:flex;align-items:center;gap:9px;padding:11px 14px;color:#d72159}.saved-card strong{font-size:19px}.inventory-card{left:12%;bottom:9%;padding:11px 14px;width:190px}.mini-bars{display:flex;align-items:end;gap:5px;height:25px;margin-top:6px}.mini-bars i{width:19px;border-radius:5px 5px 2px 2px;background:linear-gradient(180deg,#ef7f9f,#d92b62)}.bbx-visual-caption{position:absolute;right:5%;bottom:4%;display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:999px;background:#ffffff7e;border:1px solid #fff;backdrop-filter:blur(15px);font-size:8px;color:#85626e}.bbx-visual-caption span{width:6px;height:6px;border-radius:50%;background:#0db88a}.bbx-visual-caption b{color:#56303d}.bbx-visual-caption small{color:#a47c89}.bbx-floating-rbc{position:absolute;border-radius:50%;background:radial-gradient(circle at 30% 22%,#fff,#ff91ae 16%,#d92b62 48%,#76082d 100%);box-shadow:inset 7px 5px 12px #fff8,0 15px 28px #8e174835;opacity:.65}.rbc-a{width:24px;height:24px;right:11%;top:24%;animation:bbxfloat 5s ease-in-out infinite}.rbc-b{width:15px;height:15px;left:47%;top:22%;animation:bbxfloat 6s ease-in-out infinite -2s}.rbc-c{width:18px;height:18px;right:29%;bottom:13%;animation:bbxfloat 5.5s ease-in-out infinite -1s}

.bbx-section{position:relative;padding:64px 0}.bbx-emergency-section{background:linear-gradient(180deg,#fff5f9,#ffeaf2)}.bbx-section-head{display:flex;align-items:end;justify-content:space-between;gap:30px;margin-bottom:24px}.bbx-eyebrow{display:flex;align-items:center;gap:8px;font-size:9px;font-weight:900;letter-spacing:.18em;color:#a04f6b}.bbx-eyebrow i{width:7px;height:7px;border-radius:50%;background:#e33a68;box-shadow:0 0 0 5px #e33a6812}.bbx-eyebrow\.green{color:#078a6a}.bbx-eyebrow\.green i{background:#0db88a;box-shadow:0 0 0 5px #0db88a14}.bbx-section-head h2,.bbx-centered-head h2{font-size:clamp(33px,4vw,51px);line-height:.98;letter-spacing:-.06em;margin:10px 0 7px;color:#37131f}.bbx-section-head h2 em,.bbx-centered-head h2 em,.bbx-network-copy h2 em,.bbx-cta h2 em{font-style:normal;background:linear-gradient(90deg,#a91443,#ec4c78);-webkit-background-clip:text;color:transparent}.bbx-section-head p{font-size:13px;color:#896975;margin:0;max-width:620px;line-height:1.55}.bbx-outline-btn{border:1px solid #db3b6a55;background:#ffffff91;color:#b91c50;border-radius:999px;padding:10px 14px;display:flex;align-items:center;gap:7px;font-size:10px;font-weight:850;white-space:nowrap}.bbx-request-grid{display:grid;grid-template-columns:1.08fr 1fr;gap:12px}.bbx-feature-request,.bbx-small-request{position:relative;overflow:hidden;border:1px solid #fff;background:#ffffffb3;backdrop-filter:blur(22px);box-shadow:0 25px 55px #7c173c12,inset 0 1px 0 #fff;border-radius:25px}.bbx-feature-request{min-height:305px;padding:22px}.bbx-feature-request-bg{position:absolute;inset:0;background:radial-gradient(circle at 72% 45%,#ef3d681f,transparent 30%),linear-gradient(135deg,#fff,#fff1f5);pointer-events:none}.bbx-feature-request:after{content:"";position:absolute;width:210px;height:210px;right:-65px;bottom:-85px;border-radius:50%;background:#ef4a761c;filter:blur(12px)}.bbx-request-top,.bbx-small-top{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}.bbx-request-top span,.bbx-small-top span{font-size:8px;font-weight:900;letter-spacing:.12em;padding:6px 9px;border-radius:999px}.bbx-request-top .critical{background:#ffe3eb;color:#df1d54}.bbx-request-top time,.bbx-small-top time{font-size:8px;color:#a27c89}.bbx-request-hospital{position:relative;z-index:2;display:flex;align-items:center;gap:10px;margin-top:27px}.hospital-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#fff;color:#d72259;box-shadow:0 8px 18px #8f214510}.bbx-request-hospital div:last-child{display:flex;flex-direction:column}.bbx-request-hospital strong{font-size:14px;color:#4b1c2b}.bbx-request-hospital span,.bbx-location{display:flex;align-items:center;gap:4px;color:#98727f;font-size:9px;margin-top:4px}.bbx-blood-request-line{position:relative;z-index:2;display:flex;align-items:baseline;gap:18px;margin-top:20px}.bbx-blood-request-line strong{font-size:48px;letter-spacing:-.07em;color:#b6154b}.bbx-blood-request-line span{font-size:14px;font-weight:750;color:#5d3442}.bbx-match-line{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;margin-top:19px;font-size:9px}.bbx-match-line span{color:#078d6c;font-weight:850}.bbx-match-line span i,.bbx-small-match i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#0db88a;box-shadow:0 0 0 4px #0db88a12;margin-right:5px}.bbx-match-line small{color:#9c7784}.bbx-progress{position:relative;z-index:2;height:5px;border-radius:99px;background:#f2dce4;overflow:hidden;margin-top:7px}.bbx-progress i{display:block;height:100%;background:linear-gradient(90deg,#d71e59,#f36c93);border-radius:99px}.bbx-primary-small{position:relative;z-index:2;margin-top:17px;border:0;border-radius:12px;background:linear-gradient(135deg,#bd164d,#ec4c79);color:#fff;padding:10px 13px;display:flex;align-items:center;gap:7px;font-size:10px;font-weight:850;box-shadow:0 13px 25px #bd164d2b}.bbx-secondary-requests{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.bbx-small-request{padding:17px;min-height:305px}.bbx-small-top .high{background:#ffe8ee;color:#dc2757}.bbx-small-top .medium{background:#fff0dc;color:#d48622}.bbx-small-group{display:flex;align-items:end;gap:13px;margin-top:30px}.bbx-small-group strong{font-size:32px;color:#b8184e;letter-spacing:-.05em}.bbx-small-group span{font-size:13px;color:#4f2936;font-weight:750;padding-bottom:5px}.bbx-small-request h3{font-size:12px;margin:14px 0 0;color:#49212e;line-height:1.35}.bbx-small-match{display:flex;justify-content:space-between;gap:8px;margin-top:30px;font-size:8px;color:#97717e}.bbx-small-match span:first-child{color:#098e6d;font-weight:800}.bbx-small-request button{margin-top:15px;width:100%;border:1px solid #e33b6a55;background:#fff8fb;color:#c51e55;border-radius:10px;padding:9px;font-size:9px;font-weight:850;display:flex;justify-content:center;align-items:center;gap:5px}

.bbx-network-section{background:#fff7fa}.bbx-network-layout{display:grid;grid-template-columns:45% 55%;align-items:center;gap:20px}.bbx-network-copy h2{font-size:clamp(36px,4.2vw,54px);line-height:.96;letter-spacing:-.065em;margin:10px 0}.bbx-network-copy>p{max-width:500px;color:#876774;font-size:13px;line-height:1.6}.bbx-event-list{margin-top:24px;border-top:1px solid #e6cbd5}.bbx-event-row{display:grid;grid-template-columns:36px 1fr auto;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid #e9d4dc}.event-icon{position:relative;width:31px;height:31px;border-radius:10px;background:#fff;display:grid;place-items:center;color:#d6265c;box-shadow:0 7px 16px #8f21450d}.event-icon i{position:absolute;right:2px;top:2px;width:5px;height:5px;border-radius:50%;background:#0db88a}.bbx-event-row>div:nth-child(2){display:flex;flex-direction:column}.bbx-event-row strong{font-size:10px;color:#48202d}.bbx-event-row span{font-size:8px;color:#9b7683;margin-top:3px}.bbx-event-row time{font-size:8px;color:#a27e8a}.bbx-text-btn{margin-top:17px;border:1px solid #df4b7450;background:#fff8fb;border-radius:999px;padding:9px 13px;color:#bd1c51;font-size:9px;font-weight:850;display:flex;align-items:center;gap:6px}.bbx-network-visual{height:470px;position:relative;display:flex;align-items:center;justify-content:center}.network-glow{position:absolute;width:360px;height:360px;border-radius:50%;background:#ff4c8230;filter:blur(70px)}.network-globe{position:relative;width:315px;height:315px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#ffb5c9 0,#ef4b79 25%,#a70e46 55%,#4d0620 100%);box-shadow:inset 22px 17px 40px #fff5,inset -30px -34px 55px #3e001b80,0 35px 80px #8d17493a;overflow:hidden;animation:globeFloat 6s ease-in-out infinite}.globe-lat,.globe-lon{position:absolute;border:1px solid #ffb5ca45;border-radius:50%}.globe-lat{left:8%;right:8%;height:80px}.lat-1{top:33px}.lat-2{top:116px}.lat-3{top:199px}.globe-lon{top:-5%;bottom:-5%;width:95px}.lon-1{left:35%;transform:rotate(22deg)}.lon-2{left:35%;transform:rotate(-22deg)}.lon-3{left:35%;width:180px}.globe-land{position:absolute;background:#ffb0c8;opacity:.7;filter:blur(.3px);box-shadow:0 0 12px #ff94b4}.land-one{width:80px;height:48px;left:96px;top:74px;border-radius:70% 30% 55% 45%;transform:rotate(-18deg)}.land-two{width:47px;height:75px;left:154px;top:119px;border-radius:45% 55% 60% 40%;transform:rotate(18deg)}.land-three{width:34px;height:48px;left:106px;top:176px;border-radius:50% 40% 55% 45%;transform:rotate(-20deg)}.globe-node{position:absolute;width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 14px #fff}.gn1{left:112px;top:84px}.gn2{left:181px;top:128px}.gn3{left:136px;top:197px}.gn4{left:217px;top:177px}.network-connect-label{position:absolute;left:7%;top:12%;display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:12px;background:#32131eec;color:#fff;box-shadow:0 15px 30px #3d071d24;font-size:8px}.network-connect-label svg{color:#ff7096}.network-connect-label b{font-size:10px}.network-stat{position:absolute;display:flex;flex-direction:column;padding:11px 13px;border:1px solid #fff;background:#ffffffb8;backdrop-filter:blur(18px);border-radius:15px;box-shadow:0 15px 35px #7c173c12}.network-stat span{font-size:8px;color:#0ca77f}.network-stat small{font-size:7px;letter-spacing:.13em;color:#9a7582;margin-top:4px}.network-stat strong{font-size:18px;color:#441a29;margin-top:3px}.ns1{right:2%;top:18%}.ns2{right:0;top:44%}.ns3{right:5%;bottom:15%}.donor-orbs{position:absolute;left:9%;bottom:13%;display:flex;flex-direction:column;align-items:center;padding:9px 12px;border-radius:999px;background:#ffffffb8;border:1px solid #fff;backdrop-filter:blur(15px);box-shadow:0 15px 35px #7c173c12}.donor-orbs span{font-size:11px;font-weight:900;color:#4a1c2b}.donor-orbs small{font-size:7px;letter-spacing:.12em;color:#a17986}

.bbx-inventory-section{background:linear-gradient(180deg,#fff7fa,#ffeef4)}.inventory-head{margin-bottom:23px}.bbx-sync-pill{display:flex;align-items:center;gap:7px;border:1px solid #fff;background:#ffffffa8;border-radius:999px;padding:9px 12px;font-size:8px;font-weight:900;letter-spacing:.12em;color:#0a9070}.bbx-sync-pill i{width:6px;height:6px;background:#0db88a;border-radius:50%;box-shadow:0 0 0 4px #0db88a14}.bbx-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}.bbx-summary-grid>div{min-height:108px;padding:18px;border:1px solid #fff;background:#ffffffa9;backdrop-filter:blur(18px);border-radius:19px;box-shadow:0 16px 35px #7c173c0b,inset 0 1px 0 #fff}.bbx-summary-grid small{display:block;font-size:7px;font-weight:900;letter-spacing:.15em;color:#a07887}.bbx-summary-grid strong{display:block;font-size:29px;color:#3f1926;letter-spacing:-.06em;margin-top:8px}.bbx-summary-grid span{font-size:8px;color:#9c7784}.bbx-summary-grid .ai-summary{display:flex;align-items:center;gap:10px;color:#d62259}.ai-summary span{display:flex;flex-direction:column}.ai-summary b{font-size:10px;color:#4d2533}.ai-summary small{font-size:8px;letter-spacing:0;margin-top:4px;color:#997481}.bbx-inventory-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.bbx-inventory-card{padding:18px;border:1px solid #fff;background:#ffffffb3;backdrop-filter:blur(20px);border-radius:20px;box-shadow:0 17px 40px #7c173c0b,inset 0 1px 0 #fff}.inventory-top{display:flex;justify-content:space-between;align-items:center}.inventory-top>b{width:38px;height:38px;display:grid;place-items:center;background:#fff;border-radius:11px;color:#c51d53;font-size:14px;box-shadow:0 7px 16px #7c173c0b}.inventory-top span{font-size:7px;font-weight:900;padding:5px 8px;border-radius:999px;background:#e8faf4;color:#078b69;text-transform:uppercase}.inventory-top span.low{background:#fff2dc;color:#d38b27}.inventory-top span.critical{background:#ffe6ec;color:#dd2856}.inventory-top span.stable{background:#e9f8fc;color:#298ea7}.bbx-inventory-card>strong{display:block;font-size:30px;margin-top:21px;letter-spacing:-.06em}.bbx-inventory-card>small{font-size:7px;color:#a17b88;letter-spacing:.12em}.inventory-track{height:5px;background:#f0dce5;border-radius:9px;margin-top:17px;overflow:hidden}.inventory-track i{height:100%;display:block;background:linear-gradient(90deg,#d8245d,#f0809e);border-radius:9px}.bbx-inventory-card footer{display:flex;justify-content:space-between;margin-top:6px;font-size:7px;color:#a17b88}.bbx-inventory-card footer b{color:#b62050}

.bbx-features-section{background:#fff8fb}.bbx-centered-head{text-align:center;max-width:700px;margin:0 auto 28px}.bbx-centered-head .bbx-eyebrow{justify-content:center}.bbx-centered-head p{color:#8b6a76;font-size:13px;line-height:1.6;margin:0}.bbx-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}.bbx-feature-grid article{position:relative;padding:22px;min-height:185px;border:1px solid #fff;background:linear-gradient(145deg,#ffffffba,#fff0f67d);backdrop-filter:blur(20px);border-radius:21px;box-shadow:0 18px 42px #7c173c0a,inset 0 1px 0 #fff;overflow:hidden}.feature-icon{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:#fff0f4;color:#d6255b;margin-bottom:17px}.bbx-feature-grid h3{font-size:13px;margin:0;color:#48202e}.bbx-feature-grid p{font-size:10px;line-height:1.55;color:#987480;max-width:280px}.feature-arrow{position:absolute;right:17px;top:19px;color:#c92759}

.bbx-cta-section{position:relative;overflow:hidden;background:linear-gradient(135deg,#fff0f6,#ffdce8)}.bbx-cta-glow{position:absolute;width:650px;height:650px;border-radius:50%;right:-150px;top:-250px;background:#ff6f9c55;filter:blur(70px)}.bbx-cta{position:relative;min-height:365px;padding:65px 0;display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center}.bbx-cta h2{font-size:clamp(38px,4.4vw,58px);line-height:.96;letter-spacing:-.065em;margin:10px 0}.bbx-cta p{font-size:13px;color:#876673;max-width:500px;line-height:1.6}.bbx-cta-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bbx-cta-stats>div{display:flex;flex-direction:column;padding:17px;border:1px solid #fff;background:#ffffff8f;backdrop-filter:blur(17px);border-radius:17px;box-shadow:0 15px 30px #7c173c0d}.bbx-cta-stats svg{color:#d62459;margin-bottom:8px}.bbx-cta-stats strong{font-size:20px}.bbx-cta-stats span{font-size:8px;color:#9c7784;margin-top:2px}.bbx-cta-blood{position:absolute;right:5%;bottom:-40px;width:180px;height:180px;display:grid;place-items:center;pointer-events:none}.cta-drop{position:absolute;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle at 28% 22%,#fff,#ff8dab 18%,#d92b62 50%,#70072d 100%);box-shadow:inset 14px 12px 25px #fff8,inset -20px -20px 30px #46001c65,0 25px 45px #8d174940;transform:rotate(45deg);border-radius:55% 45% 60% 40%}.bbx-cta-blood span{position:relative;z-index:2;color:#fff;text-align:center;font-size:13px;font-weight:800;text-shadow:0 2px 8px #6d0a2d}.bbx-cta-blood b{font-size:19px}

.bbx-footer{background:#260d18;color:#fff;padding:48px 0 20px;position:relative;overflow:hidden}.bbx-footer:before{content:"";position:absolute;inset:auto -10% -180px;height:300px;background:#d7195a38;filter:blur(70px);border-radius:50%}.footer-main{position:relative;display:grid;grid-template-columns:1.6fr .7fr .7fr .7fr 1.1fr;gap:35px;padding-bottom:36px}.footer-brand{max-width:310px}.footer-logo{font-size:22px;font-weight:900;letter-spacing:-.05em}.footer-logo span{color:#f04b7c}.footer-brand>small{display:block;color:#cf839a;font-size:7px;letter-spacing:.18em;margin-top:3px}.footer-brand p{font-size:10px;line-height:1.6;color:#b98b9b;margin:15px 0}.socials{display:flex;gap:7px}.socials span{width:27px;height:27px;border:1px solid #fff2;border-radius:8px;display:grid;place-items:center;color:#fff;font-size:10px}.footer-col{display:flex;flex-direction:column;gap:9px}.footer-col strong,.footer-news strong{font-size:10px;margin-bottom:5px}.footer-col a{font-size:9px;color:#bd8fa0;text-decoration:none}.footer-col a:hover{color:#fff}.footer-news p{font-size:9px;color:#bd8fa0}.footer-news>div{display:flex;border:1px solid #fff2;border-radius:999px;overflow:hidden;background:#fff08}.footer-news input{flex:1;min-width:0;background:transparent;border:0;outline:0;padding:9px 11px;color:#fff;font-size:9px}.footer-news button{width:35px;border:0;background:#e92f67;color:#fff}.footer-bottom{position:relative;border-top:1px solid #fff14;padding-top:17px;display:flex;justify-content:space-between;color:#8f6575;font-size:8px}

@keyframes bbxspin{to{transform:rotate(360deg)}}@keyframes bbxorbit{to{transform:translate(-50%,-50%) rotate(342deg)}}@keyframes bbxorbit2{to{transform:translate(-50%,-50%) rotate(-317deg)}}@keyframes bbxfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}@keyframes globeFloat{0%,100%{transform:translateY(0) rotateY(-5deg)}50%{transform:translateY(-8px) rotateY(5deg)}}

@media(max-width:1000px){.bbx-container{width:min(100% - 34px,760px)}.bbx-hero-layout,.bbx-network-layout{grid-template-columns:1fr}.bbx-hero{padding-top:95px}.bbx-hero-copy{text-align:center;padding-left:0}.bbx-hero-copy>p{margin:auto}.bbx-hero-actions,.bbx-hero-stats{justify-content:center}.bbx-hero-visual{height:430px}.bbx-request-grid{grid-template-columns:1fr}.bbx-secondary-requests{grid-template-columns:repeat(3,1fr)}.bbx-summary-grid{grid-template-columns:1fr 1fr}.bbx-inventory-grid{grid-template-columns:1fr 1fr}.bbx-feature-grid{grid-template-columns:1fr 1fr}.bbx-cta{grid-template-columns:1fr}.bbx-cta-blood{opacity:.35}.footer-main{grid-template-columns:1.4fr 1fr 1fr;gap:25px}.footer-news{grid-column:2 / span 2}}

@media(max-width:650px){.bbx-container{width:calc(100% - 24px)}.bbx-hero{min-height:730px;padding-top:95px}.bbx-hero-copy h1{font-size:47px}.bbx-hero-stats{gap:18px}.bbx-hero-stats strong{font-size:18px}.bbx-hero-visual{height:380px}.bbx-blood-sphere{width:190px;height:190px}.bbx-blood-core{width:65px;height:65px}.bbx-orbit{max-width:330px}.ai-card{left:0}.saved-card{right:0}.inventory-card{left:3%;bottom:4%}.bbx-visual-caption{right:0}.bbx-section{padding:48px 0}.bbx-section-head{align-items:flex-start;flex-direction:column}.bbx-secondary-requests{grid-template-columns:1fr}.bbx-feature-request{min-height:285px}.bbx-network-visual{height:430px}.network-globe{width:245px;height:245px}.network-stat{padding:9px}.ns1{right:0}.ns2{right:0}.ns3{right:2%;bottom:8%}.donor-orbs{left:0;bottom:7%}.bbx-summary-grid,.bbx-inventory-grid,.bbx-feature-grid{grid-template-columns:1fr}.bbx-cta{padding:48px 0}.bbx-cta-stats{grid-template-columns:1fr 1fr}.bbx-cta-blood{right:-20px}.footer-main{grid-template-columns:1fr 1fr}.footer-brand,.footer-news{grid-column:1 / -1}.footer-bottom{flex-direction:column;gap:8px}}

`;
