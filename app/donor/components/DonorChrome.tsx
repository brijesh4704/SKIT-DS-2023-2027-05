"use client";

import "../donor-unified.css";
import "./donor-v3.css";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Activity, BrainCircuit, ChevronDown, HeartPulse, History, Home, LogOut, Menu, Settings, ShieldCheck, UserRound, X, Zap } from "lucide-react";

const links = [
  { label: "Overview", href: "/donor", icon: Home },
  { label: "Profile", href: "/donor/profile", icon: UserRound },
  { label: "Emergency", href: "/donor/requests", icon: Zap },
  { label: "AI Matching", href: "/donor/ai-matching", icon: BrainCircuit },
  { label: "Availability", href: "/donor/availability", icon: Activity },
  { label: "History", href: "/donor/donation-history", icon: History },
  { label: "Eligibility", href: "/eligibility", icon: ShieldCheck },
];

const ChromeCtx = createContext(false);

const CARD = '.bl-donor-content :is([class*="card"],[class*="panel"])';

export default function DonorChrome({ children }: { children?: ReactNode }) {
  // Agar page ne bhi <DonorChrome> lagaya hai (layout ke andar), to dobara chrome mat banao
  const nested = useContext(ChromeCtx);
  if (nested) return <>{children}</>;
  return <ChromeCtx.Provider value={true}><Chrome>{children}</Chrome></ChromeCtx.Provider>;
}

function Chrome({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const go = (href: string) => { setOpen(false); setProfileOpen(false); router.push(href); };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("bloodlink_token");
    localStorage.removeItem("bloodlink_user");
    router.push("/login");
  };

  useEffect(() => {
    const root = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cur: HTMLElement | null = null;
    const reset = (el: HTMLElement) => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
    const move = (e: PointerEvent) => {
      root.style.setProperty("--mx", (e.clientX / innerWidth - 0.5).toFixed(3));
      root.style.setProperty("--my", (e.clientY / innerHeight - 0.5).toFixed(3));
      if (reduce) return;
      const el = (e.target as HTMLElement).closest?.(CARD) as HTMLElement | null;
      if (cur && cur !== el) reset(cur);
      cur = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width > 620 || r.height > 460) return; // badi sections tilt nahi hongi
      el.style.setProperty("--rx", `${(-((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(2)}deg`);
    };
    const scroll = () => { const m = root.scrollHeight - innerHeight; setProgress(m > 0 ? (scrollY / m) * 100 : 0); };
    document.addEventListener("pointermove", move, { passive: true });
    addEventListener("scroll", scroll, { passive: true }); scroll();
    return () => { document.removeEventListener("pointermove", move); removeEventListener("scroll", scroll); };
  }, []);

  const isActive = (h: string) => pathname === h || (h !== "/donor" && pathname.startsWith(`${h}/`));

  return (
    <div className="bl-donor-shell">
      <div className="bl-progress" style={{ width: `${progress}%` }} />
      <div className="bl-bg" aria-hidden>
        <div className="bl-bg-drop"><i /></div>
        <b className="bl-bg-cell c1" /><b className="bl-bg-cell c2" /><b className="bl-bg-cell c3" />
      </div>

      <div className="bl-nav-wrap">
        <header className="bl-nav">
          <button className="bl-brand" onClick={() => go("/donor")} aria-label="BloodLink AI donor home">
            <span className="bl-mark"><HeartPulse size={18} /></span>
            <span>BloodLink <em>AI</em></span>
          </button>

          <nav className="bl-links" aria-label="Donor navigation">
            {links.map(({ label, href, icon: Icon }) => (
              <button key={href} className={isActive(href) ? "on" : ""} onClick={() => go(href)}>
                <Icon size={15} />{label}{href === "/donor/requests" && <i className="bl-dot" />}
              </button>
            ))}
          </nav>

          <div className="bl-actions">
            <span className="bl-live"><i />Network live</span>
            <button className="bl-icon-btn" onClick={() => go("/donor/settings")} aria-label="Settings"><Settings size={17} /></button>
            <div className="bl-profile">
              <button className="bl-icon-btn wide" onClick={() => setProfileOpen((v) => !v)} aria-expanded={profileOpen} aria-haspopup="menu" aria-label="Profile menu">
                <UserRound size={17} /><ChevronDown size={13} />
              </button>
              {profileOpen && (
                <div className="bl-menu" role="menu">
                  <button onClick={() => go("/donor/profile")} role="menuitem"><UserRound size={15} />My profile</button>
                  <button onClick={() => go("/")} role="menuitem"><Home size={15} />Visit website</button>
                  <hr />
                  <button className="out" onClick={logout} role="menuitem"><LogOut size={15} />Log out</button>
                </div>
              )}
            </div>
            <button className="bl-icon-btn bl-burger" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          </div>
        </header>
      </div>

      {open && (
        <div className="bl-overlay" onClick={() => setOpen(false)}>
          <aside className="bl-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="bl-drawer-head">
              <span className="bl-brand"><span className="bl-mark"><HeartPulse size={18} /></span>BloodLink <em>AI</em></span>
              <button className="bl-icon-btn" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
            </div>
            {links.map(({ label, href, icon: Icon }) => (
              <button key={href} className={isActive(href) ? "on" : ""} onClick={() => go(href)}><Icon size={18} />{label}</button>
            ))}
            <button onClick={() => go("/donor/settings")}><Settings size={18} />Settings</button>
            <button className="out" onClick={logout}><LogOut size={18} />Log out</button>
          </aside>
        </div>
      )}

      <div className="bl-donor-content">{children}</div>

      <footer className="bl-foot">
        <div className="bl-foot-in">
          <div>
            <span className="bl-brand light"><span className="bl-mark"><HeartPulse size={18} /></span>BloodLink <em>AI</em></span>
            <p>Intelligent donor coordination that moves compatible blood to the people who need it, faster.</p>
            <span className="bl-secure"><ShieldCheck size={14} />Protected donor environment</span>
          </div>
          <div><strong>Donor</strong><button onClick={() => go("/donor")}>Dashboard</button><button onClick={() => go("/donor/profile")}>Profile</button><button onClick={() => go("/donor/availability")}>Availability</button></div>
          <div><strong>Intelligence</strong><button onClick={() => go("/donor/ai-matching")}>AI matching</button><button onClick={() => go("/donor/donation-history")}>Donation history</button><button onClick={() => go("/eligibility")}>Eligibility</button></div>
          <div><strong>Platform</strong><button onClick={() => go("/network")}>Network</button><button onClick={() => go("/contact")}>Help center</button><button onClick={() => go("/")}>Website</button></div>
        </div>
        <div className="bl-foot-bottom"><span>© 2026 BloodLink AI</span><span><i />All systems operational</span></div>
      </footer>
    </div>
  );
}
