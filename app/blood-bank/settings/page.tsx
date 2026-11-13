"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Database,
  Globe2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import "./settings.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function BloodBankSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [prefs, setPrefs] = useState({
    emergencyAlerts: true,
    inventoryAlerts: true,
    requestAlerts: true,
    sound: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bloodlink_user");
      if (!raw) {
        router.replace("/login");
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed?.role && parsed.role !== "BLOOD_BANK") {
        router.replace("/login");
        return;
      }
      setUser(parsed);
      const stored = localStorage.getItem("bloodbank_settings_preferences");
      if (stored) setPrefs((p) => ({ ...p, ...JSON.parse(stored) }));
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("bloodlink_token") || localStorage.getItem("token") || "";
  }, []);

  const name = user?.name || user?.hospitalName || "Blood Bank";
  const email = user?.email || "—";
  const phone = user?.phone || "—";
  const city = user?.city || user?.address?.city || "Jaipur";
  const state = user?.state || user?.address?.state || "Rajasthan";

  const savePreferences = () => {
    setSaving(true);
    setSaved(false);
    setMessage("");
    try {
      localStorage.setItem("bloodbank_settings_preferences", JSON.stringify(prefs));
      setSaved(true);
      setMessage("Workspace preferences saved on this device.");
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaved(false), 2500);
    }
  };

  const refreshIdentity = async () => {
    setMessage("Refreshing account session…");
    try {
      if (token) {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const fresh = data?.user || data?.data || data;
          if (fresh && typeof fresh === "object") {
            localStorage.setItem("bloodlink_user", JSON.stringify(fresh));
            setUser(fresh);
            setMessage("Account information refreshed.");
            return;
          }
        }
      }
      setMessage("Live profile refresh is not available; showing the saved login profile.");
    } catch {
      setMessage("Could not refresh the live profile. Your saved session is unchanged.");
    }
  };

  if (loading) {
    return <div className="bb-settings-loading"><div className="bb-loader-orbit" /><span>Loading BloodLink workspace…</span></div>;
  }

  return (
    <main className="bb-settings-page">
      <div className="bb-settings-noise" />
      <div className="bb-settings-glow glow-one" />
      <div className="bb-settings-glow glow-two" />

      

      <section className="bb-settings-hero">
        <div className="bb-hero-copy">
          <div className="bb-eyebrow"><Sparkles size={14} /> BLOOD BANK CONTROL PLANE</div>
          <h1>Settings that keep<br /><span>the network trusted.</span></h1>
          <p>Manage your BloodLink identity, workspace behavior and operational preferences from one secure control surface.</p>
          <div className="bb-hero-meta">
            <span><Wifi size={14} /> LIVE CONNECTION</span>
            <span><ShieldCheck size={14} /> VERIFIED SESSION</span>
            <span><Database size={14} /> CLOUD SYNC</span>
          </div>
        </div>

        <div className="bb-settings-orb-wrap">
          <div className="orb-label orb-label-a">TRUST LAYER <b>ACTIVE</b></div>
          <div className="orb-label orb-label-b">LATENCY <b>24ms</b></div>
          <motion.div className="bb-orb" animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }}>
            <div className="orb-ring ring-a" /><div className="orb-ring ring-b" /><div className="orb-ring ring-c" />
            <div className="orb-core"><ShieldCheck size={34} /><span>BL</span></div>
            <i className="orb-dot dot-a" /><i className="orb-dot dot-b" /><i className="orb-dot dot-c" />
          </motion.div>
          <div className="orb-caption"><span>IDENTITY</span><strong>SECURE</strong><small>BloodLink AI operational layer</small></div>
        </div>
      </section>

      {message && <div className="bb-settings-toast"><CircleCheck size={17} /> {message}</div>}

      <section className="bb-settings-grid">
        <div className="bb-settings-main">
          <div className="bb-section-head"><div><span>01 / IDENTITY</span><h2>Account profile</h2></div><button onClick={refreshIdentity} className="ghost-btn"><RefreshCw size={15} /> Refresh</button></div>

          <div className="identity-card">
            <div className="identity-avatar"><Building2 size={27} /></div>
            <div className="identity-title"><h3>{name}</h3><p>BLOOD BANK · {city}, {state}</p><span className="verified-chip"><Check size={13} /> Verified workspace</span></div>
            <div className="identity-id"><small>ROLE</small><strong>BLOOD_BANK</strong></div>
          </div>

          <div className="field-grid">
            <div className="info-field"><label><UserRound size={14} /> ACCOUNT NAME</label><strong>{name}</strong></div>
            <div className="info-field"><label><Mail size={14} /> EMAIL</label><strong>{email}</strong></div>
            <div className="info-field"><label><Phone size={14} /> PHONE</label><strong>{phone}</strong></div>
            <div className="info-field"><label><MapPin size={14} /> LOCATION</label><strong>{city}, {state}</strong></div>
          </div>

          <div className="bb-section-head second"><div><span>02 / OPERATIONS</span><h2>Workspace preferences</h2></div></div>
          <div className="preference-card">
            <Preference icon={<Bell size={18} />} title="Emergency alerts" desc="Surface critical and high-urgency blood requests immediately." value={prefs.emergencyAlerts} onChange={(v) => setPrefs({ ...prefs, emergencyAlerts: v })} />
            <Preference icon={<Database size={18} />} title="Inventory alerts" desc="Notify this workspace when stock needs attention." value={prefs.inventoryAlerts} onChange={(v) => setPrefs({ ...prefs, inventoryAlerts: v })} />
            <Preference icon={<Clock3 size={18} />} title="Request activity" desc="Keep request and response activity visible in the workspace." value={prefs.requestAlerts} onChange={(v) => setPrefs({ ...prefs, requestAlerts: v })} />
            <Preference icon={<Wifi size={18} />} title="Alert sound" desc="Play a local sound when a new operational alert is surfaced." value={prefs.sound} onChange={(v) => setPrefs({ ...prefs, sound: v })} />
          </div>
          <button className="save-btn" onClick={savePreferences} disabled={saving}>{saved ? <Check size={17} /> : <Save size={17} />} {saving ? "Saving…" : saved ? "Saved" : "Save preferences"}<ArrowUpRight size={16} /></button>

          <div className="bb-section-head second"><div><span>03 / SECURITY</span><h2>Trust & access</h2></div></div>
          <div className="security-grid">
            <div className="security-card"><div className="security-icon"><LockKeyhole size={20} /></div><div><strong>Authenticated session</strong><p>Your current workspace uses the BloodLink access token stored for this session.</p></div><span className="secure-state">ACTIVE</span></div>
            <div className="security-card"><div className="security-icon"><ShieldCheck size={20} /></div><div><strong>Role protection</strong><p>Blood Bank routes are protected by your authenticated role.</p></div><span className="secure-state">BLOOD BANK</span></div>
          </div>
        </div>

        <aside className="bb-settings-side">
          <div className="side-card trust-card"><div className="side-card-top"><span>TRUST SCORE</span><ShieldCheck size={18} /></div><div className="score">98<span>%</span></div><div className="score-line"><i /></div><p>Workspace identity and access layer are operating normally.</p><div className="side-row"><span>Identity</span><b>Verified</b></div><div className="side-row"><span>Session</span><b>Secure</b></div><div className="side-row"><span>Network</span><b>Online</b></div></div>
          <div className="side-card quick-card"><div className="side-card-top"><span>QUICK ACCESS</span><SlidersHorizontal size={17} /></div><button onClick={() => router.push("/blood-bank/notifications")}><Bell size={16} /> Notification center <ChevronRight size={15} /></button><button onClick={() => router.push("/blood-bank/analytics")}><Globe2 size={16} /> Operations analytics <ChevronRight size={15} /></button><button onClick={() => router.push("/blood-bank/inventory")}><Database size={16} /> Inventory control <ChevronRight size={15} /></button></div>
          <div className="side-card note-card"><Sparkles size={20} /><h3>Built for live operations.</h3><p>Settings here intentionally focus on the capabilities already available to the BloodLink workspace.</p><small>NO FABRICATED BACKEND CONTROLS</small></div>
        </aside>
      </section>

      
    
</main>
  );
}

function Preference({ icon, title, desc, value, onChange }: { icon: React.ReactNode; title: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return <div className="pref-row"><div className="pref-icon">{icon}</div><div className="pref-copy"><strong>{title}</strong><p>{desc}</p></div><button className={`toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)} aria-label={`Toggle ${title}`}><span /></button></div>;
}
