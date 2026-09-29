import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, ChevronRight, Droplets, LogOut, Menu, Settings, ShieldCheck, Sparkles, AlertTriangle, X } from "lucide-react";
import { clearAuth } from "@/lib/api";

export default function AdminNavbar() {
  const pathname = usePathname();
  const [admin, setAdmin] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bloodlink_user");
      if (raw) setAdmin(JSON.parse(raw));
    } catch {}
  }, []);

  const initials = (name?: string) =>
    name?.split(" ").filter(Boolean).slice(0, 2).map((x: string) => x[0]).join("").toUpperCase() || "AD";

  const logout = () => {
    clearAuth();
    window.location.href = "/signin";
  };

  const nav = [
    ["/admin", "Overview"],
    ["/admin/network", "Network"],
    ["/admin/operations", "Operations"],
    ["/admin/users", "People"],
    ["/admin/requests", "Requests"],
    ["/admin/inventory", "Inventory"],
  ];

  const intelligence = [
    ["/admin/audit-logs", "Audit Logs", "Audit"],
    ["/admin/smart-alerts", "Smart Alerts", "Live"],
    ["/admin/ai-risk", "AI Risk", "Predict"],
  ];

  const active = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);

  return (
    <>
      <style jsx global>{`
        .blAdminNav {
          position: sticky; top: 0; z-index: 1000; height: 78px;
          display:flex; align-items:center; justify-content:space-between;
          padding:0 clamp(18px,4.5vw,68px);
          border-bottom:1px solid rgba(91,10,37,.07);
          background:rgba(255,250,252,.82);
          backdrop-filter:blur(25px) saturate(165%);
          box-shadow:0 8px 35px rgba(76,8,30,.035);
        }
        .blAdminNav * { box-sizing:border-box; }
        .blBrand { display:flex; align-items:center; gap:10px; color:#24151b; text-decoration:none; font-size:21px; font-weight:950; letter-spacing:-.065em; white-space:nowrap; }
        .blBrandMark { width:41px; height:41px; display:grid; place-items:center; color:#fff; border-radius:13px; background:linear-gradient(145deg,#f07c9b,#ca3158 52%,#79132f); box-shadow:0 14px 30px rgba(119,17,48,.2),inset 0 1px rgba(255,255,255,.55); }
        .blBrand em { margin-left:2px; color:#d83e67; font-style:normal; }
        .blMainNav { display:flex; align-items:center; gap:2px; padding:5px; border:1px solid rgba(91,10,37,.075); border-radius:999px; background:rgba(255,255,255,.66); box-shadow:0 9px 28px rgba(75,8,30,.045); }
        .blMainNav > a, .blIntelBtn { position:relative; padding:9px 14px; border:0; border-radius:999px; color:#755d67; background:transparent; font-size:10px; font-weight:850; text-decoration:none; cursor:pointer; transition:.2s; }
        .blMainNav > a:hover, .blMainNav > a.blActive, .blIntelBtn:hover, .blIntelBtn.blOpen { color:#68102f; background:#fff; box-shadow:0 5px 18px rgba(75,8,30,.075); }
        .blIntel { position:relative; }
        .blIntelBtn { display:flex; align-items:center; gap:5px; }
        .blIntelMenu { position:absolute; top:calc(100% + 10px); left:50%; transform:translateX(-50%); width:225px; padding:8px; border:1px solid rgba(91,10,37,.09); border-radius:16px; background:rgba(255,255,255,.97); backdrop-filter:blur(22px); box-shadow:0 28px 65px rgba(70,7,29,.14); }
        .blIntelMenu a { display:flex; align-items:center; gap:9px; padding:10px; border-radius:10px; color:#684e58; font-size:9px; font-weight:850; text-decoration:none; }
        .blIntelMenu a:hover, .blIntelMenu a.blActive { color:#8f1d40; background:#fff1f5; }
        .blIntelMenu small { margin-left:auto; color:#a9828e; font-size:7px; font-weight:800; }
        .blNavActions { display:flex; align-items:center; gap:8px; }
        .blRel { position:relative; }
        .blIconBtn, .blProfileBtn, .blMobileBtn { border:1px solid rgba(91,10,37,.09); background:rgba(255,255,255,.72); cursor:pointer; }
        .blIconBtn { width:38px; height:38px; display:grid; place-items:center; border-radius:12px; color:#714d5b; position:relative; }
        .blIconBtn:hover, .blProfileBtn:hover, .blMobileBtn:hover { color:#a02146; transform:translateY(-1px); }
        .blBadge { position:absolute; top:7px; right:7px; width:6px; height:6px; border-radius:50%; background:#df4a70; box-shadow:0 0 0 3px rgba(223,74,112,.11); }
        .blProfileBtn { display:flex; align-items:center; gap:8px; padding:4px 8px 4px 4px; border-radius:999px; color:#24151b; }
        .blAvatar { width:31px; height:31px; display:grid; place-items:center; border-radius:50%; color:#fff; font-size:9px; font-weight:950; background:linear-gradient(145deg,#ee7898,#7b1431); }
        .blProfileName { max-width:105px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; font-weight:900; }
        .blMenu { position:absolute; top:calc(100% + 10px); right:0; width:225px; padding:7px; border:1px solid rgba(91,10,37,.09); border-radius:16px; background:rgba(255,255,255,.97); backdrop-filter:blur(22px); box-shadow:0 28px 65px rgba(70,7,29,.14); }
        .blNotificationMenu { width:275px; }
        .blMenuHead { padding:9px 10px; border-radius:10px; background:#fff4f7; }
        .blMenuHead strong { display:block; font-size:10px; }
        .blMenuHead span { display:block; margin-top:3px; color:#9a7b85; font-size:8px; }
        .blMenuItem { width:100%; display:flex; align-items:center; gap:9px; margin-top:3px; padding:10px; border:0; border-radius:10px; color:#684e58; background:transparent; font-size:9px; font-weight:800; text-align:left; text-decoration:none; cursor:pointer; }
        .blMenuItem:hover { color:#8f1d40; background:#fff1f5; }
        .blMenuItem small { margin-left:auto; color:#a9828e; font-size:7px; }
        .blMobileBtn { display:none; width:38px; height:38px; place-items:center; border-radius:12px; color:#714d5b; }
        .blMobilePanel { position:absolute; left:15px; right:15px; top:calc(100% + 8px); padding:8px; border:1px solid rgba(91,10,37,.09); border-radius:16px; background:rgba(255,255,255,.98); box-shadow:0 25px 60px rgba(54,5,24,.16); }
        @media(max-width:1080px){ .blMainNav > a:nth-child(n+5){display:none;} }
        @media(max-width:780px){ .blAdminNav{height:70px;padding:0 15px}.blMainNav{display:none}.blMobileBtn{display:grid}.blBrand{font-size:19px}.blBrandMark{width:39px;height:39px} }
        @media(max-width:520px){ .blProfileName{display:none}.blNavActions{gap:5px}.blBrand{font-size:19px}.blBrandMark{width:39px;height:39px}.blNotificationMenu{width:255px} }
      `}</style>

      <header className="blAdminNav">
        <a href="/admin" className="blBrand">
          <span className="blBrandMark"><Droplets size={20} fill="currentColor" /></span>
          BloodLink <em>AI</em>
        </a>

        <nav className="blMainNav">
          {nav.map(([href, label]) => (
            <a key={href} href={href} className={active(href) ? "blActive" : ""}>{label}</a>
          ))}
          <div className="blIntel">
            <button className={`blIntelBtn ${intelligenceOpen ? "blOpen" : ""}`} onClick={() => setIntelligenceOpen(v => !v)}>
              Intelligence <ChevronDown size={11}/>
            </button>
            {intelligenceOpen && (
              <div className="blIntelMenu">
                {intelligence.map(([href,label,meta]) => (
                  <a key={href} href={href} className={active(href) ? "blActive" : ""} onClick={() => setIntelligenceOpen(false)}>
                    {label === "Audit Logs" ? <ShieldCheck size={13}/> : label === "Smart Alerts" ? <AlertTriangle size={13}/> : <Sparkles size={13}/>}
                    <span>{label}</span><small>{meta}</small>
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="blNavActions">
          <div className="blRel">
            <button className="blIconBtn" aria-label="Notifications" onClick={() => {setNotificationsOpen(v=>!v);setProfileOpen(false)}}>
              <Bell size={17}/><span className="blBadge"/>
            </button>
            {notificationsOpen && (
              <div className="blMenu blNotificationMenu">
                <div className="blMenuHead"><strong>Live command alerts</strong><span>BloodLink administrative activity</span></div>
                <a className="blMenuItem" href="/admin/requests"><AlertTriangle size={14}/> Open requests <small>Live</small></a>
                <a className="blMenuItem" href="/admin/smart-alerts"><Sparkles size={14}/> Smart Alerts <small>Live</small></a>
                <a className="blMenuItem" href="/admin/ai-risk"><Sparkles size={14}/> AI Risk <small>Predict</small></a>
              </div>
            )}
          </div>

          <div className="blRel">
            <button className="blProfileBtn" aria-label="Admin profile" onClick={() => {setProfileOpen(v=>!v);setNotificationsOpen(false)}}>
              <span className="blAvatar">{initials(admin?.name)}</span>
              <span className="blProfileName">{admin?.name || "BloodLink Admin"}</span>
              <ChevronDown size={12}/>
            </button>
            {profileOpen && (
              <div className="blMenu">
                <div className="blMenuHead"><strong>{admin?.name || "BloodLink Admin"}</strong><span>{admin?.email || "Administrator access"}</span></div>
                <a className="blMenuItem" href="/admin/settings"><Settings size={14}/> Admin settings</a>
                <button className="blMenuItem" onClick={logout}><LogOut size={14}/> Sign out</button>
              </div>
            )}
          </div>

          <button className="blMobileBtn" onClick={() => setMobileOpen(v=>!v)} aria-label="Open navigation">
            {mobileOpen ? <X size={17}/> : <Menu size={17}/>}
          </button>
          {mobileOpen && (
            <div className="blMobilePanel">
              {[...nav, ["/admin/audit-logs","Audit Logs"], ["/admin/smart-alerts","Smart Alerts"], ["/admin/ai-risk","AI Risk"]].map(([href,label]) => (
                <a key={href} className="blMenuItem" href={href} onClick={() => setMobileOpen(false)}>
                  {label}<ChevronRight size={13} style={{marginLeft:"auto"}}/>
                </a>
              ))}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
