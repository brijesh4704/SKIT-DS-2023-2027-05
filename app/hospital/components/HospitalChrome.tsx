"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Bell, Building2, ChevronDown, Droplets, HeartPulse, Home, LayoutGrid, LogOut, Menu, Settings, ShieldCheck, Sparkles, Users, X, Zap } from "lucide-react";

const nav = [
  ["Overview", "/hospital", LayoutGrid],
  ["Emergency", "/hospital/emergency-command", Zap],
  ["Requests", "/hospital/requests", Droplets],
  ["Donors", "/hospital/donor-network", Users],
  ["AI Matching", "/hospital/ai-matching", Sparkles],
  ["Inventory", "/hospital/inventory", Building2],
  ["Responses", "/hospital/responses", Activity],
  ["Analytics", "/hospital/analytics", Activity],
] as const;

const CARD = '[class*="card"],[class*="panel"]';
const SKIP = /icon|title|header|head|label|text|desc|grid|list|row|body|action|footer|badge|meta|sidebar/;

export function HospitalNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState("Hospital");
  const [open, setOpen] = useState(false);
  const [acc, setAcc] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("bloodlink_user") || "{}");
      setName(u?.hospitalName || u?.name || "Hospital");
    } catch {}
  }, []);
  useEffect(() => { setOpen(false); setAcc(false); }, [pathname]);

  const logout = () => {
    try { ["bloodlink_user", "bloodlink_token", "token", "accessToken"].forEach((k) => localStorage.removeItem(k)); } catch {}
    router.replace("/login");
  };
  const on = (h: string) => pathname === h || (h !== "/hospital" && pathname.startsWith(h + "/"));

  return (
    <div className="hc-wrap">
      <header className="hc-nav">
        <button className="hc-brand" onClick={() => router.push("/hospital")} aria-label="Hospital home">
          <span className="hc-mark"><HeartPulse size={18} /></span><span>BloodLink <em>AI</em></span>
        </button>
        <nav className="hc-links" aria-label="Hospital navigation">
          {nav.map(([l, h, Icon]) => (
            <button key={l} className={on(h) ? "on" : ""} onClick={() => router.push(h)}>
              <Icon size={15} />{l}{h.includes("emergency") && <i className="hc-dot" />}
            </button>
          ))}
        </nav>
        <div className="hc-actions">
          <button className="hc-ic" onClick={() => router.push("/hospital/notifications")} aria-label="Notifications"><Bell size={17} /></button>
          <div className="hc-acc">
            <button className="hc-ic wide" onClick={() => setAcc((v) => !v)} aria-expanded={acc} aria-haspopup="menu">
              <span className="hc-av">{name.charAt(0).toUpperCase()}</span><b>{name}</b><ChevronDown size={13} />
            </button>
            {acc && (
              <div className="hc-menu" role="menu">
                <button onClick={() => router.push("/hospital/profile")} role="menuitem"><Building2 size={15} />Hospital profile</button>
                <button onClick={() => router.push("/hospital/settings")} role="menuitem"><Settings size={15} />Settings</button>
                <button onClick={() => router.push("/")} role="menuitem"><Home size={15} />Visit website</button>
                <hr />
                <button className="out" onClick={logout} role="menuitem"><LogOut size={15} />Log out</button>
              </div>
            )}
          </div>
          <button className="hc-ic hc-burger" onClick={() => setOpen((v) => !v)} aria-label="Menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>
      {open && (
        <div className="hc-drawer">
          {nav.map(([l, h, Icon]) => <button key={l} className={on(h) ? "on" : ""} onClick={() => router.push(h)}><Icon size={16} />{l}</button>)}
          <button onClick={() => router.push("/hospital/notifications")}><Bell size={16} />Notifications</button>
          <button onClick={() => router.push("/hospital/settings")}><Settings size={16} />Settings</button>
          <button className="out" onClick={logout}><LogOut size={16} />Log out</button>
        </div>
      )}
    </div>
  );
}

export function HospitalFooter() {
  const router = useRouter();
  const go = (h: string) => () => router.push(h);
  return (
    <footer className="hc-foot">
      <div className="hc-foot-in">
        <div>
          <span className="hc-brand light"><span className="hc-mark"><HeartPulse size={18} /></span>BloodLink <em>AI</em></span>
          <p>One workspace to raise emergency requests, find compatible donors and keep your blood inventory clear.</p>
          <span className="hc-secure"><ShieldCheck size={14} />Verified hospital environment</span>
        </div>
        <div><strong>Operations</strong><button onClick={go("/hospital")}>Overview</button><button onClick={go("/hospital/emergency-command")}>Emergency center</button><button onClick={go("/hospital/requests")}>Requests</button></div>
        <div><strong>Intelligence</strong><button onClick={go("/hospital/ai-matching")}>AI matching</button><button onClick={go("/hospital/donor-network")}>Donor network</button><button onClick={go("/hospital/analytics")}>Analytics</button></div>
        <div><strong>Account</strong><button onClick={go("/hospital/inventory")}>Inventory</button><button onClick={go("/hospital/settings")}>Settings</button><button onClick={go("/")}>Website</button></div>
      </div>
      <div className="hc-foot-bottom"><span>© 2026 BloodLink AI</span><span><i />All systems operational</span></div>
    </footer>
  );
}

/* Styles + 3D background + tilt effect. Har page ye already render karta hai. */
export function HospitalChromeStyles() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const root = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cur: HTMLElement | null = null;
    const reset = (el: HTMLElement) => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); el.removeAttribute("data-tilt"); };
    const move = (e: PointerEvent) => {
      root.style.setProperty("--mx", (e.clientX / innerWidth - 0.5).toFixed(3));
      root.style.setProperty("--my", (e.clientY / innerHeight - 0.5).toFixed(3));
      if (reduce) return;
      const el = (e.target as HTMLElement).closest?.(CARD) as HTMLElement | null;
      const ok = el && !SKIP.test(el.className?.toString?.() || "");
      if (cur && cur !== el) reset(cur);
      cur = ok ? el : null;
      if (!el || !ok) return;
      const r = el.getBoundingClientRect();
      if (r.width > 620 || r.height > 460) return;
      el.setAttribute("data-tilt", "1");
      el.style.setProperty("--rx", `${(-((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(2)}deg`);
    };
    const sc = () => { const m = root.scrollHeight - innerHeight; setP(m > 0 ? (scrollY / m) * 100 : 0); };
    document.addEventListener("pointermove", move, { passive: true });
    addEventListener("scroll", sc, { passive: true }); sc();
    return () => { document.removeEventListener("pointermove", move); removeEventListener("scroll", sc); };
  }, []);

  return (
    <>
      <div className="hc-progress" style={{ width: `${p}%` }} />
      <div className="hc-bg" aria-hidden><div className="hc-drop"><i /></div><b className="c1" /><b className="c2" /><b className="c3" /><b className="c4" /><b className="c5" /><div className="hc-glow" /></div>
      <style jsx global>{`
@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
html{background:radial-gradient(900px 600px at 90% -5%,#ffc2d0,transparent 60%),radial-gradient(700px 500px at -5% 40%,#ffd9e2,transparent 60%),linear-gradient(180deg,#fff0f3,#ffdfe6) fixed!important}
body{background:transparent!important;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#2b0611}
.hc-progress{position:fixed;top:0;left:0;height:3px;z-index:300;background:linear-gradient(90deg,#ff4d6d,#d4143c)}
.hc-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;perspective:1000px;overflow:hidden}
.hc-drop{position:absolute;right:5%;top:24%;width:300px;height:300px;opacity:.8;transform:translate(calc(var(--mx,0)*-40px),calc(var(--my,0)*-30px)) rotateY(calc(var(--mx,0)*30deg)) rotateX(calc(var(--my,0)*-24deg))}
.hc-drop i{display:block;width:100%;height:100%;border-radius:0 50% 50% 50%;transform:rotate(-45deg);background:radial-gradient(circle at 70% 70%,#ff7a93,transparent 35%),linear-gradient(140deg,#ff5273,#d4143c 45%,#7d0722);box-shadow:inset -20px -26px 44px rgba(60,0,15,.5),inset 16px 18px 36px rgba(255,255,255,.4),0 50px 80px -20px rgba(212,20,60,.55);animation:hcf 7s ease-in-out infinite}
@keyframes hcf{50%{translate:0 -16px}}
.hc-bg b{position:absolute;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff8fa3,#d4143c 55%,#8a0a26);box-shadow:inset 0 -5px 9px rgba(60,0,15,.4),0 14px 22px -8px rgba(212,20,60,.5);opacity:.7;animation:hcf 5s ease-in-out infinite}
.hc-bg .c1{width:54px;height:54px;left:6%;top:30%;transform:translate(calc(var(--mx,0)*50px),calc(var(--my,0)*40px))}.hc-bg .c2{width:28px;height:28px;left:46%;top:72%}.hc-bg .c3{width:38px;height:38px;right:16%;bottom:14%}.hc-bg .c4{width:70px;height:70px;left:30%;top:14%;transform:translate(calc(var(--mx,0)*-60px),calc(var(--my,0)*50px))}.hc-bg .c5{width:20px;height:20px;right:34%;top:60%}.hc-glow{position:absolute;width:520px;height:520px;right:-120px;top:10%;border-radius:50%;background:radial-gradient(circle,rgba(255,77,109,.35),transparent 65%);filter:blur(30px)}
.hc-wrap{position:sticky;top:0;z-index:200;padding:14px 18px 0;pointer-events:none}
.hc-nav{pointer-events:auto;max-width:1480px;margin:auto;display:flex;align-items:center;gap:12px;padding:9px 12px 9px 16px;border-radius:999px;background:rgba(255,255,255,.68);backdrop-filter:blur(18px) saturate(1.5);border:1px solid rgba(255,255,255,.85);box-shadow:0 12px 40px -14px rgba(212,20,60,.38),inset 0 1px 0 #fff}
.hc-brand{display:flex;align-items:center;gap:10px;border:0;background:none;cursor:pointer;color:#2b0611;font:800 19px Fraunces,serif;white-space:nowrap}.hc-brand em{color:#d4143c;font-style:normal}.hc-brand.light{color:#fff}
.hc-mark{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#ff4d6d,#d4143c);box-shadow:0 8px 18px -5px #d4143c}
.hc-links{display:flex;gap:2px;flex:1;justify-content:center}
.hc-links button{display:flex;align-items:center;gap:6px;padding:9px 11px;border:0;border-radius:99px;background:none;color:#7a4a56;font:600 13px "Plus Jakarta Sans",sans-serif;cursor:pointer;transition:.2s;white-space:nowrap}
.hc-links button:hover,.hc-links button.on{background:#fff;color:#d4143c;box-shadow:0 5px 16px -7px #d4143c}
.hc-dot{width:7px;height:7px;border-radius:50%;background:#d4143c;box-shadow:0 0 0 3px rgba(212,20,60,.2);animation:hcp 1.6s infinite}@keyframes hcp{50%{box-shadow:0 0 0 6px rgba(212,20,60,0)}}
.hc-actions{display:flex;align-items:center;gap:8px}
.hc-ic{height:38px;min-width:38px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:99px;background:#fff;color:#7a4a56;cursor:pointer;box-shadow:0 5px 14px -8px rgba(74,10,28,.5);transition:.2s;font:700 13px "Plus Jakarta Sans",sans-serif}
.hc-ic:hover{color:#d4143c;transform:translateY(-2px)}.hc-ic b{max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hc-av{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:12px;background:linear-gradient(145deg,#ff4d6d,#d4143c)}
.hc-burger{display:none}.hc-acc{position:relative}
.hc-menu{position:absolute;right:0;top:calc(100% + 10px);width:210px;padding:8px;border-radius:20px;background:rgba(255,255,255,.96);backdrop-filter:blur(20px);box-shadow:0 24px 50px -18px rgba(74,10,28,.45)}
.hc-menu button,.hc-drawer button{width:100%;display:flex;gap:10px;align-items:center;padding:11px 12px;border:0;border-radius:13px;background:none;color:#7a4a56;font:600 14px "Plus Jakarta Sans",sans-serif;cursor:pointer;text-align:left}
.hc-menu button:hover,.hc-drawer button:hover,.hc-drawer button.on{background:#fff0f4;color:#d4143c}.hc-menu hr{border:0;height:1px;background:#f1d9df;margin:6px 4px}.out{color:#d4143c!important}
.hc-drawer{pointer-events:auto;max-width:1480px;margin:8px auto 0;padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px;border-radius:26px;background:rgba(255,255,255,.96);box-shadow:0 24px 50px -18px rgba(74,10,28,.45)}
.hc-foot{position:relative;z-index:2;margin-top:70px;padding:56px max(24px,5vw) 0;color:#ffd5de;border-radius:40px 40px 0 0;background:radial-gradient(500px 300px at 10% 0,rgba(255,77,109,.28),transparent 60%),linear-gradient(150deg,#4a0a1c,#2a0610)}
.hc-foot-in{max-width:1300px;margin:auto;display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr;gap:40px;padding-bottom:40px}
.hc-foot p{max-width:340px;margin:14px 0;color:#e9b3c0;line-height:1.65;font-size:14px}
.hc-secure{display:inline-flex;gap:7px;align-items:center;padding:8px 12px;border-radius:99px;background:rgba(255,255,255,.1);font-size:12.5px;font-weight:700}
.hc-foot strong{display:block;margin-bottom:12px;color:#fff;font-size:14px}
.hc-foot-in button{display:block;margin:9px 0;padding:0;border:0;background:none;color:#e9b3c0;font:500 14px "Plus Jakarta Sans",sans-serif;cursor:pointer;transition:.2s}.hc-foot-in button:hover{color:#fff;transform:translateX(4px)}
.hc-foot-bottom{max-width:1300px;margin:auto;padding:18px 0;display:flex;justify-content:space-between;gap:16px;border-top:1px solid rgba(255,255,255,.12);font-size:13px;color:#c98a9b}
.hc-foot-bottom span:last-child{display:inline-flex;align-items:center;gap:8px;color:#7fd1ae}.hc-foot-bottom i{width:7px;height:7px;border-radius:50%;background:#21b07c;box-shadow:0 0 0 4px rgba(33,176,124,.18)}
/* Layout fixes: hidden sidebar ki jagah khaali na rahe, flex pages me navbar content ko na dabaye */
.em-main,.dn-main,.inv-main,.analytics-main,.profile-main,.rd-main,.hospital-main,.hospital-dashboard>.hospital-main{margin-left:0!important;width:100%!important;max-width:100%!important;padding-left:0!important}
.em-page,.donor-network-page,[class$="-page"]{flex-direction:column!important;overflow:visible!important;overflow-x:clip!important}
.hc-wrap{flex:none;width:100%;align-self:stretch}
.hc-nav button,.hc-menu button,.hc-drawer button{font-family:"Plus Jakarta Sans",sans-serif!important;letter-spacing:0!important}
.hc-links button{font-size:13px!important;font-weight:600!important}.hc-ic{font-size:13px!important;font-weight:700!important}
.hc-brand{font:800 19px Fraunces,serif!important;letter-spacing:-.02em!important}.hc-brand em{font-weight:800!important}
.hc-nav{letter-spacing:0!important}
/* Donor wala same background: gradient + 3D drop + cells, hero/cards glass ke peeche frost hote hain */
.hc-drop{right:4%!important;top:22%!important;width:240px!important;height:240px!important;opacity:.5!important}
.hc-bg b{opacity:.45!important}.hc-bg .c1{left:6%!important;top:30%!important}.hc-bg .c4,.hc-bg .c5,.hc-glow{display:none!important}
[class$="-hero"]:not(.em-hero),.hero:not(.em-hero){background:linear-gradient(135deg,rgba(255,255,255,.72),rgba(255,226,233,.6))!important;backdrop-filter:blur(18px) saturate(1.4)!important;border:1px solid rgba(255,255,255,.95)!important;border-radius:36px!important;box-shadow:0 40px 80px -40px rgba(212,20,60,.5),inset 0 1px 0 #fff!important}
/* Overview hero: andar ka padding, upar ka gap theek + 3D glossy drop */
.hospital-dashboard .hospital-main{padding-top:0!important}
.hospital-dashboard .page-content{padding:18px 32px 50px!important;max-width:1480px!important}
.hospital-dashboard .hero{min-height:0!important;margin-top:0!important;padding:48px 56px!important;gap:20px}
.hospital-dashboard .hero-visual{height:380px!important;perspective:1100px}
.hospital-dashboard .orb-main{width:230px!important;height:230px!important;border-radius:0 50% 50% 50%!important;background:radial-gradient(circle at 70% 70%,#ff7a93 0,transparent 35%),linear-gradient(140deg,#ff5273,#d4143c 45%,#7d0722)!important;box-shadow:inset -20px -26px 44px rgba(60,0,15,.5),inset 16px 18px 36px rgba(255,255,255,.45),0 50px 80px -20px rgba(212,20,60,.6)!important;rotate:-45deg}
.hospital-dashboard .orb-main::before{opacity:.0!important}
.hospital-dashboard .orb-main::after{content:"";position:absolute;left:22%;top:48%;width:26%;height:12%;border-radius:50%;background:rgba(255,255,255,.75);filter:blur(3px);transform:rotate(25deg)}
.hospital-dashboard .orb-main svg{rotate:45deg;filter:drop-shadow(0 6px 10px rgba(60,0,15,.45))}
/* Generic fix: jis page ka root flex/grid (sidebar layout) hai, wahan navbar content ko side me na dhakele */
:has(>.hc-wrap){display:flex!important;flex-direction:column!important;overflow:visible!important;overflow-x:clip!important}
:has(>.hc-wrap)>[class*="main"],:has(>.hc-wrap)>[class*="content"]{margin-left:0!important;width:100%!important;max-width:100%!important;min-width:0!important;flex:1 1 auto}
main[class^="hospital-"]{background:transparent!important}
.hc-mark{width:34px!important;height:34px!important;flex:none}.hc-mark svg{width:18px!important;height:18px!important;color:#fff!important;stroke:#fff!important}
.hc-brand span:not(.hc-mark){font:800 19px Fraunces,serif!important;letter-spacing:-.02em!important;color:inherit}
.hc-av{width:26px!important;height:26px!important;flex:none;color:#fff!important;font:800 12px "Plus Jakarta Sans",sans-serif!important}
.hc-foot{width:100%!important;max-width:none!important;margin-left:0!important;margin-right:0!important;box-sizing:border-box!important}
.hc-foot-in,.hc-foot-bottom{max-width:1300px!important;width:100%!important;margin-left:auto!important;margin-right:auto!important}
/* purane pages ke andar ka chrome hide (original rules) */
.hospital-shell-sidebar,.em-sidebar,.dn-sidebar,.analytics-sidebar,.inv-sidebar,.profile-sidebar,.rd-sidebar{display:none!important}
.em-top,.dn-top,.analytics-topbar,.inv-topbar,.profile-topbar,.rd-topbar{display:none!important}
.hospital-dashboard .hospital-sidebar,.hospital-dashboard .topbar{display:none!important}
.hospital-footer{display:none!important}
/* Re-skin: cards, headings, buttons, inputs */
.hospital-dashboard,[class*="-page"],[class*="-shell"],[class*="-main"]{background:transparent!important}
h1,h2{font-family:Fraunces,serif!important;letter-spacing:-.025em!important}
:is([class*="card"],[class*="panel"]):not(:is([class*="icon"],[class*="title"],[class*="header"],[class*="head"],[class*="label"],[class*="text"],[class*="desc"],[class*="grid"],[class*="list"],[class*="row"],[class*="body"],[class*="action"],[class*="footer"],[class*="badge"],[class*="meta"],[class*="sidebar"])){
background:rgba(255,255,255,.66)!important;backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.92)!important;border-radius:26px!important;box-shadow:0 26px 50px -26px rgba(212,20,60,.45),inset 0 1px 0 #fff!important;
transition:box-shadow .3s!important}
[data-tilt="1"]{transform:perspective(1000px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))!important;transition:transform .12s ease!important}
:is(button,a)[class*="primary"],button[class*="submit"],button[class*="save"]{background:linear-gradient(145deg,#ff4d6d,#d4143c 60%,#a30d2c)!important;color:#fff!important;border:0!important;border-radius:99px!important;box-shadow:0 14px 28px -10px #d4143c,inset 0 1px 0 rgba(255,255,255,.4)!important}
input,select,textarea{border-radius:14px!important;border:1.5px solid #f1ccd5!important;background:rgba(255,255,255,.85)!important}
input:focus,select:focus,textarea:focus{outline:none;border-color:#d4143c!important;box-shadow:0 0 0 4px rgba(212,20,60,.12)}
.hc-nav :focus-visible,.hc-foot :focus-visible{outline:2px solid #d4143c;outline-offset:3px}
@media(max-width:1280px){.hc-links{display:none}.hc-burger{display:inline-flex}.hc-actions{margin-left:auto}.hc-drop{opacity:.25}}
@media(max-width:700px){.hc-ic b{display:none}.hc-foot-in{grid-template-columns:1fr 1fr}.hc-foot-in>div:first-child{grid-column:1/-1}.hc-foot{border-radius:28px 28px 0 0}.hc-drop{display:none}.hc-drawer{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>
    </>
  );
}

export function HospitalPageFrame({ children }: { children: ReactNode }) {
  return <><HospitalChromeStyles /><HospitalNavbar />{children}<HospitalFooter /></>;
}
