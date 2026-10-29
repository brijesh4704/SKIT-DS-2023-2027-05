"use client";

import "./bb-v3.css";
import { useEffect, useState } from "react";
import { Activity, Bell, Boxes, ChevronDown, ClipboardList, Droplet, Globe2, Grid2X2, HeartPulse, LineChart, LogOut, Menu, Network, RefreshCw, Sparkles, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Overview", href: "/blood-bank", icon: Grid2X2 },
  { label: "Inventory", href: "/blood-bank/inventory", icon: Boxes },
  { label: "Batches", href: "/blood-bank/batches", icon: Droplet },
  { label: "Requests", href: "/blood-bank/requests", icon: ClipboardList },
  { label: "AI Matching", href: "/blood-bank/ai-matching", icon: Sparkles },
  { label: "Network", href: "/network", icon: Network },
  { label: "Analytics", href: "/blood-bank/analytics", icon: LineChart },
  { label: "Transactions", href: "/blood-bank/transactions", icon: Activity },
];

const CARD = '[class*="card"],[class*="panel"]';
const SKIP = /icon|title|header|head|label|text|desc|grid|list|row|body|action|footer|badge|meta|sidebar|hero|console|dark/;

export default function BloodBankNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    addEventListener("click", close);
    return () => removeEventListener("click", close);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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
      const ok = !!el && !SKIP.test(String(el.className || ""));
      if (cur && cur !== el) reset(cur);
      cur = ok ? el : null;
      if (!el || !ok) return;
      const r = el.getBoundingClientRect();
      if (r.width > 620 || r.height > 460) return;
      el.style.setProperty("--rx", `${(-((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(2)}deg`);
    };
    const sc = () => { const m = root.scrollHeight - innerHeight; setProgress(m > 0 ? (scrollY / m) * 100 : 0); };
    document.addEventListener("pointermove", move, { passive: true });
    addEventListener("scroll", sc, { passive: true }); sc();
    return () => { document.removeEventListener("pointermove", move); removeEventListener("scroll", sc); };
  }, []);

  const isActive = (href: string) => href === "/blood-bank" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const go = (href: string) => { setMenuOpen(false); setMobileOpen(false); router.push(href); };
  const logout = () => {
    localStorage.removeItem("bloodlink_token");
    localStorage.removeItem("token");
    localStorage.removeItem("bloodlink_user");
    sessionStorage.clear();
    router.replace("/login");
  };

  return (
    <>
      <div className="bk-progress" style={{ width: `${progress}%` }} />
      <div className="bk-bg" aria-hidden><div className="bk-drop"><i /></div><b className="c1" /><b className="c2" /></div>
      <header className="bk-wrap" data-bloodlink-shared-navbar="true">
        <div className="bk-nav">
          <button className="bk-brand" onClick={() => go("/blood-bank")} aria-label="BloodLink AI home">
            <span className="bk-mark"><HeartPulse size={18} /></span><span>BloodLink <em>AI</em></span>
          </button>
          <nav className="bk-links" aria-label="Blood Bank navigation">
            {navItems.map(({ label, href, icon: Icon }) => (
              <button key={href} className={isActive(href) ? "on" : ""} onClick={() => go(href)}><Icon size={14} />{label}</button>
            ))}
          </nav>
          <div className="bk-right">
            <span className="bk-live"><i />Live</span>
            <button className="bk-ic" title="Refresh" onClick={() => location.reload()} aria-label="Refresh"><RefreshCw size={16} /></button>
            <button className="bk-ic bell" title="Notifications" onClick={() => go("/blood-bank/notifications")} aria-label="Notifications"><Bell size={17} /><span /></button>
            <div className="bk-acc" onClick={(e) => e.stopPropagation()}>
              <button className="bk-ic wide" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-haspopup="menu">
                <span className="bk-av">PR</span><b>My Profile</b><ChevronDown size={13} />
              </button>
              {menuOpen && (
                <div className="bk-menu" role="menu">
                  <button className="bk-menu-h" onClick={() => go("/blood-bank/profile")} role="menuitem" style={{ width: "100%", textAlign: "left", cursor: "pointer" }}><span className="bk-av">PR</span><div><strong>My Profile</strong><small>Blood Bank Administrator</small></div></button>
                  <hr />
                  <button onClick={() => go("/blood-bank/settings")} role="menuitem"><Grid2X2 size={15} />Settings</button>
                  <button onClick={() => go("/")} role="menuitem"><Globe2 size={15} />Visit website</button>
                  <button className="out" onClick={logout} role="menuitem"><LogOut size={15} />Logout</button>
                </div>
              )}
            </div>
            <button className="bk-ic bk-burger" onClick={(e) => { e.stopPropagation(); setMobileOpen((v) => !v); }} aria-label="Menu">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {mobileOpen && (
          <div className="bk-drawer">
            {navItems.map(({ label, href, icon: Icon }) => (
              <button key={href} className={isActive(href) ? "on" : ""} onClick={() => go(href)}><Icon size={16} />{label}</button>
            ))}
            <button onClick={() => go("/blood-bank/notifications")}><Bell size={16} />Notifications</button>
            <button className="out" onClick={logout}><LogOut size={16} />Logout</button>
          </div>
        )}
      </header>
    </>
  );
}

