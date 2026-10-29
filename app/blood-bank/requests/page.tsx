"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, Bell, Check, CheckCircle2, ChevronDown,
  ChevronRight, Clock3, Droplets, HeartPulse, Hospital, LogOut, Menu,
  RefreshCw, Search, Settings, ShieldCheck, Sparkles, Users, X,
  XCircle, MapPin, PackageCheck, ArrowUpRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch, clearAuth, getToken } from "@/lib/api";

type RequestRow = {
  _id: string;
  patientName?: string;
  bloodGroup: string;
  unitsRequired: number;
  reservedUnits?: number;
  issuedUnits?: number;
  hospitalName?: string;
  city?: string;
  urgency?: string;
  status?: string;
  contactName?: string;
  contactPhone?: string;
  bloodBank?: any;
  createdBy?: any;
  donorResponses?: any[];
  createdAt?: string;
  updatedAt?: string;
  location?: any;
};

const STATUS = ["ALL","OPEN","DONOR_ACCEPTED","IN_PROGRESS","FULFILLED","CANCELLED"];
const URGENCY = ["ALL","CRITICAL","HIGH","MEDIUM","LOW"];

const urgencyTone: Record<string,string> = {
  CRITICAL:"critical", HIGH:"high", MEDIUM:"medium", LOW:"low"
};

function idOf(v:any){ return typeof v === "object" ? v?._id : v; }
function nameOf(v:any, fallback="—"){ return typeof v === "object" ? (v?.name || v?.email || fallback) : (v || fallback); }
function initials(v=""){ return v.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "R"; }
function dateOf(v?:string){
  if(!v) return "—";
  const d=new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}
function pretty(v?:string){ return String(v||"—").replaceAll("_"," "); }

export default function BloodBankAssignedRequestsPage(){
  const router=useRouter();
  const [requests,setRequests]=useState<RequestRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("ALL");
  const [urgency,setUrgency]=useState("ALL");
  const [selected,setSelected]=useState<RequestRow|null>(null);
  const [toast,setToast]=useState("");
  const [admin,setAdmin]=useState<any>(null);
  const [profileOpen,setProfileOpen]=useState(false);
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [busy,setBusy]=useState(false);

  const load=async(silent=false)=>{
    if(!getToken()){ clearAuth(); router.replace("/login"); return; }
    silent?setSyncing(true):setLoading(true); setError("");
    try{
      const data=await apiFetch<any>("/api/blood-requests/assigned-to-me");
      const raw=Array.isArray(data) ? data : (data?.requests || data?.bloodRequests || data?.data || []);
      setRequests(Array.isArray(raw) ? raw : []);
      const storedUser=localStorage.getItem("bloodlink_user");
      if(storedUser) try{setAdmin(JSON.parse(storedUser));}catch{}
    }catch(e:any){
      setError(e?.message||"Unable to load request network.");
    }finally{setLoading(false);setSyncing(false);}
  };

  useEffect(()=>{ load(); },[]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return requests.filter(r=>{
      const hay=[r.patientName,r.hospitalName,r.city,r.bloodGroup,r.urgency,r.status,nameOf(r.bloodBank),idOf(r)].join(" ").toLowerCase();
      return (!q||hay.includes(q)) &&
        (status==="ALL"||String(r.status||"").toUpperCase()===status) &&
        (urgency==="ALL"||String(r.urgency||"").toUpperCase()===urgency);
    });
  },[requests,search,status,urgency]);

  const stats=useMemo(()=>({
    total:requests.length,
    critical:requests.filter(r=>r.urgency==="CRITICAL").length,
    open:requests.filter(r=>r.status==="OPEN").length,
    progress:requests.filter(r=>["DONOR_ACCEPTED","IN_PROGRESS"].includes(String(r.status))).length,
    fulfilled:requests.filter(r=>r.status==="FULFILLED").length,
    cancelled:requests.filter(r=>r.status==="CANCELLED").length,
    units:requests.reduce((n,r)=>n+Number(r.unitsRequired||0),0),
  }),[requests]);

  const updateStatus=async(next:string)=>{
    if(!selected)return;
    try{
      setBusy(true);
      const data=await apiFetch<any>(`/api/blood-requests/${selected._id}/status`,{
        method:"PATCH",body:JSON.stringify({status:next})
      });
      const updated=data?.bloodRequest||data?.request||data?.data;
      setRequests(cur=>cur.map(r=>r._id===selected._id?(updated||{...r,status:next}):r));
      setSelected(cur=>cur?(updated||{...cur,status:next}):cur);
      setToast(`Request moved to ${pretty(next)}.`);
      setTimeout(()=>setToast(""),2500);
    }catch(e:any){
      setToast(e?.message||"Status update failed.");
      setTimeout(()=>setToast(""),3000);
    }finally{setBusy(false);}
  };

  const logout=()=>{clearAuth();router.replace("/signin");};

  return <main className="page">
    <style>{`
      *{box-sizing:border-box} body{margin:0;background:#fff8fa;color:#29161e;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
      a{text-decoration:none;color:inherit}button,input,select{font:inherit}
      .page{min-height:100vh;overflow:hidden;position:relative;background:
        radial-gradient(circle at 5% 8%,rgba(244,113,148,.17),transparent 24%),
        radial-gradient(circle at 94% 19%,rgba(113,13,46,.09),transparent 28%),
        linear-gradient(135deg,#fffafd,#faeef3 48%,#fff)}
      .page:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.23;background-image:linear-gradient(rgba(93,12,42,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(93,12,42,.04) 1px,transparent 1px);background-size:58px 58px;mask-image:linear-gradient(to bottom,#000,transparent 90%)}

      .nav{height:78px;position:sticky;top:0;z-index:80;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(18px,5vw,72px);border-bottom:1px solid rgba(93,12,42,.07);background:rgba(255,250,252,.78);backdrop-filter:blur(25px)}
      .brand{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:950;letter-spacing:-.065em}
      .brandMark{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;color:#fff;background:linear-gradient(145deg,#f083a0,#c92e58 55%,#70122f);box-shadow:0 14px 32px rgba(108,14,46,.2),inset 0 1px rgba(255,255,255,.45)}
      .brand em{color:#cf3c63;font-style:normal}
      .navLinks{display:flex;gap:3px;padding:5px;border:1px solid rgba(93,12,42,.07);border-radius:999px;background:rgba(255,255,255,.68)}
      .navLinks a{padding:9px 12px;border-radius:999px;color:#765b66;font-size:8px;font-weight:900}.navLinks a:hover,.navLinks a.active{color:#85183e;background:#fff0f4}
      .navRight{display:flex;align-items:center;gap:7px}.iconBtn,.profile,.mobile{border:1px solid rgba(93,12,42,.07);background:rgba(255,255,255,.75);cursor:pointer}
      .iconBtn{width:38px;height:38px;position:relative;display:grid;place-items:center;border-radius:12px;color:#704f5c}.badge{position:absolute;right:8px;top:8px;width:6px;height:6px;border:2px solid white;border-radius:50%;background:#d73e67}
      .profile{height:42px;display:flex;align-items:center;gap:7px;padding:4px 10px 4px 5px;border-radius:999px;font-size:8px;font-weight:900;color:#38232b}
      .avatar{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;color:#fff;background:linear-gradient(145deg,#df6788,#8e183b);font-size:8px}
      .mobile{display:none;width:38px;height:38px;border-radius:11px;color:#74163a}
      .menu{position:absolute;right:0;top:calc(100% + 9px);width:240px;overflow:hidden;border:1px solid rgba(93,12,42,.09);border-radius:16px;background:rgba(255,252,253,.97);box-shadow:0 25px 60px rgba(70,7,29,.14);backdrop-filter:blur(18px)}
      .menuHead{padding:13px 14px;border-bottom:1px solid rgba(93,12,42,.06)}.menuHead strong,.menuHead span{display:block}.menuHead strong{font-size:9px}.menuHead span{margin-top:3px;color:#a0828c;font-size:7px}
      .menuItem{width:100%;display:flex;align-items:center;gap:9px;padding:11px 14px;border:0;background:transparent;color:#6f515d;cursor:pointer;text-align:left;font-size:8px;font-weight:800}.menuItem:hover{background:#fff1f5;color:#9e2147}

      .hero{max-width:1400px;margin:auto;min-height:400px;padding:55px clamp(18px,5vw,72px) 25px;display:grid;grid-template-columns:.9fr 1.1fr;align-items:center;gap:25px;position:relative;z-index:2}
      .eyebrow{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border:1px solid rgba(93,12,42,.08);border-radius:999px;color:#972044;background:rgba(255,255,255,.68);font-size:7px;font-weight:950;letter-spacing:.17em;text-transform:uppercase}
      .hero h1{margin:18px 0 12px;max-width:600px;font-size:clamp(46px,5.1vw,74px);line-height:.88;letter-spacing:-.085em;font-weight:950}.hero h1 span{color:#cf3b63}
      .hero p{max-width:555px;color:#806872;font-size:10px;line-height:1.8}
      .heroActions{display:flex;align-items:center;gap:10px;margin-top:21px}.primary{display:flex;align-items:center;gap:7px;padding:12px 16px;border:0;border-radius:12px;color:#fff;background:linear-gradient(135deg,#c42d55,#74132f);box-shadow:0 15px 30px rgba(112,17,46,.18);cursor:pointer;font-size:8px;font-weight:950}.live{display:flex;align-items:center;gap:7px;color:#7e6871;font-size:8px;font-weight:800}.live i{width:6px;height:6px;border-radius:50%;background:#3caf77;box-shadow:0 0 0 5px rgba(60,175,119,.09)}

      .visual{height:350px;position:relative;display:grid;place-items:center}.glow{position:absolute;width:410px;height:270px;border-radius:50%;background:rgba(235,91,132,.13);filter:blur(70px)}
      .orbit{position:absolute;width:430px;height:215px;border:1px solid rgba(113,19,52,.12);border-radius:50%;transform:rotateX(65deg) rotateZ(-16deg)}.orbit.o2{width:310px;height:310px;transform:rotateY(65deg) rotateZ(18deg);border-color:rgba(113,19,52,.09)}.orbit.o3{width:455px;height:455px;transform:rotateX(70deg) rotateZ(45deg);border-color:rgba(113,19,52,.055)}
      .core{width:172px;height:172px;position:relative;z-index:3;display:grid;place-items:center;border-radius:48% 52% 47% 53%;background:radial-gradient(circle at 31% 22%,#ffb3c7 0 7%,transparent 8%),radial-gradient(circle at 65% 34%,#e76589 0 11%,transparent 12%),radial-gradient(circle at 35% 73%,#8b1237 0 10%,transparent 11%),radial-gradient(circle at 32% 24%,#ee7697,#bd2c55 52%,#6c0e2d);box-shadow:inset -20px -25px 35px rgba(58,3,23,.27),inset 17px 12px 24px rgba(255,255,255,.15),0 32px 60px rgba(94,8,38,.25)}
      .coreInner{width:63px;height:63px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:50%;color:#fff;background:rgba(114,11,43,.4);backdrop-filter:blur(5px)}
      .dot{position:absolute;width:10px;height:10px;border-radius:50%;background:#ea6d8d;box-shadow:0 0 0 8px rgba(234,109,141,.09)}.d1{left:7%;top:20%}.d2{right:10%;top:31%}.d3{right:17%;bottom:15%}.d4{left:15%;bottom:12%}
      .floatTag{position:absolute;z-index:4;padding:9px 11px;border:1px solid rgba(93,12,42,.08);border-radius:12px;color:#741737;background:rgba(255,255,255,.82);box-shadow:0 16px 30px rgba(70,7,29,.08);font-size:7px;font-weight:950;letter-spacing:.1em}.t1{left:4%;top:17%}.t2{right:4%;bottom:16%}

      .content{max-width:1400px;margin:auto;padding:5px clamp(18px,5vw,72px) 72px;position:relative;z-index:2}
      .head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:14px}.kicker{color:#a3264a;font-size:7px;font-weight:950;letter-spacing:.19em}.title{margin:6px 0 0;font-size:28px;line-height:1;letter-spacing:-.065em;font-weight:950}.hint{max-width:420px;color:#927680;font-size:8px;line-height:1.7;text-align:right}
      .controls{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:9px;border:1px solid rgba(93,12,42,.08);border-radius:17px;background:rgba(255,255,255,.72);box-shadow:0 18px 48px rgba(70,7,29,.045)}
      .search{position:relative;flex:1;max-width:500px}.search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#b08d98}.search input{width:100%;height:39px;padding:0 13px 0 36px;outline:none;border:1px solid rgba(93,12,42,.07);border-radius:11px;background:#fffafd;color:#38232b;font-size:9px}
      .filters{display:flex;gap:7px}.select{height:39px;padding:0 11px;border:1px solid rgba(93,12,42,.07);border-radius:11px;color:#765965;background:#fffafd;outline:none;font-size:8px;font-weight:850}.refresh{height:39px;display:flex;align-items:center;gap:7px;padding:0 13px;border:0;border-radius:11px;color:#fff;background:#5d0927;cursor:pointer;font-size:8px;font-weight:900}
      .metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin-top:10px}.metric{min-height:100px;position:relative;overflow:hidden;padding:14px;border:1px solid rgba(93,12,42,.075);border-radius:17px;background:rgba(255,255,255,.7);box-shadow:0 18px 50px rgba(70,7,29,.045)}.metric:after{content:"";position:absolute;width:100px;height:100px;right:-50px;top:-50px;border-radius:50%;background:rgba(232,103,139,.1);filter:blur(7px)}.metric span{color:#a0838d;font-size:6px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.metric strong{display:block;margin-top:7px;font-size:27px;line-height:1;letter-spacing:-.075em}.metric small{display:block;margin-top:6px;color:#9c808a;font-size:7px}

      .requestShell{margin-top:10px;overflow:hidden;border:1px solid rgba(93,12,42,.08);border-radius:23px;background:rgba(255,255,255,.72);box-shadow:0 25px 70px rgba(70,7,29,.055)}
      .requestHead,.requestRow{display:grid;grid-template-columns:2fr 1fr .75fr .9fr .9fr 1fr 42px;gap:10px;align-items:center}.requestHead{padding:13px 18px;border-bottom:1px solid rgba(93,12,42,.055);color:#a0838d;background:rgba(255,246,249,.65);font-size:6px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.requestRow{min-height:78px;padding:10px 18px;border-bottom:1px solid rgba(93,12,42,.05);transition:.18s}.requestRow:last-child{border-bottom:0}.requestRow:hover{background:rgba(255,243,247,.68)}
      .patient{display:flex;align-items:center;gap:9px;min-width:0}.patientAvatar{width:39px;height:39px;flex:0 0 39px;display:grid;place-items:center;border-radius:12px;color:#fff;background:linear-gradient(145deg,#ed7d9d,#a92047);font-size:8px;font-weight:950}.patientName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:950}.patientSub{display:flex;align-items:center;gap:4px;margin-top:4px;color:#9b7f89;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bloodPill{width:max-content;padding:7px 9px;border-radius:10px;color:#8d1e42;background:#fff0f4;font-size:8px;font-weight:950}
      .urgency,.status{width:max-content;display:inline-flex;align-items:center;gap:5px;padding:6px 8px;border-radius:999px;font-size:6px;font-weight:950;text-transform:uppercase}.urgency.critical{color:#a31e45;background:#ffe6ed}.urgency.high{color:#a14354;background:#fff0e9}.urgency.medium{color:#8e6b25;background:#fff8df}.urgency.low{color:#4b8669;background:#eaf8f0}.status{color:#805e69;background:#f8eef2}.status.open{color:#a12147;background:#fff0f4}.status.in_progress,.status.donor_accepted{color:#7c5a25;background:#fff7e6}.status.fulfilled{color:#348660;background:#edf9f2}.status.cancelled{color:#9b4b61;background:#fff0f3}
      .hospitalName{font-size:8px;font-weight:850}.hospitalCity{margin-top:4px;color:#9b7f89;font-size:7px}.date{color:#866f79;font-size:7px}.rowBtn{width:33px;height:33px;display:grid;place-items:center;border:1px solid rgba(93,12,42,.07);border-radius:10px;color:#7d5f6a;background:#fff;cursor:pointer}.rowBtn:hover{color:#a42248;background:#fff2f5}
      .empty{min-height:290px;display:grid;place-items:center;padding:40px;text-align:center}.emptyIcon{width:50px;height:50px;display:grid;place-items:center;margin:auto;border-radius:16px;color:#b42b50;background:#fff0f4}.empty strong{display:block;margin-top:12px;font-size:14px}.empty p{margin:6px 0 0;color:#947780;font-size:9px}

      .strip{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:11px;padding:17px 19px;border:1px solid rgba(93,12,42,.08);border-radius:19px;background:radial-gradient(circle at 85% 50%,rgba(226,92,128,.11),transparent 30%),rgba(255,255,255,.62)}.stripInfo{display:flex;align-items:center;gap:11px}.stripIcon{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;color:#b2264c;background:#fff0f4}.strip span,.strip strong,.strip p{display:block}.strip span{color:#a1264a;font-size:7px;font-weight:950;letter-spacing:.15em}.strip strong{margin-top:4px;font-size:10px}.strip p{margin:3px 0 0;color:#8e747e;font-size:7px}.stripStat{display:flex;align-items:center;gap:10px;padding:10px 13px;border:1px solid rgba(93,12,42,.07);border-radius:12px;background:#fff}.stripStat b{font-size:19px}.stripStat span{color:#927681;font-size:7px;letter-spacing:0}

      .backdrop{position:fixed;inset:0;z-index:90;background:rgba(40,5,18,.2);backdrop-filter:blur(6px)}.drawer{position:fixed;z-index:91;top:0;right:0;bottom:0;width:min(450px,94vw);overflow:auto;padding:25px;background:rgba(255,250,252,.97);box-shadow:-25px 0 75px rgba(55,5,23,.18)}
      .drawerTop{display:flex;align-items:center;justify-content:space-between}.close{width:36px;height:36px;display:grid;place-items:center;border:1px solid rgba(93,12,42,.08);border-radius:10px;color:#765965;background:#fff;cursor:pointer}
      .detailHero{margin-top:25px;padding:21px;border-radius:21px;color:#fff;background:radial-gradient(circle at 88% 10%,rgba(240,128,158,.28),transparent 30%),linear-gradient(145deg,#bf2c54,#5e0b28);box-shadow:0 25px 50px rgba(94,10,39,.18)}.detailTitle{display:flex;align-items:center;gap:12px}.detailAvatar{width:52px;height:52px;display:grid;place-items:center;border-radius:16px;color:#a01f47;background:#fff0f4;font-size:11px;font-weight:950}.detailTitle strong{font-size:16px}.detailTitle span{display:block;margin-top:4px;color:#f1c6d1;font-size:8px}
      .detailGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:15px}.detail{padding:13px;border:1px solid rgba(93,12,42,.07);border-radius:13px;background:#fff}.detail span,.detail b{display:block}.detail span{color:#9a7e88;font-size:6px;font-weight:850;text-transform:uppercase}.detail b{margin-top:5px;color:#312027;font-size:9px;word-break:break-word}.detailActions{display:grid;gap:8px;margin-top:15px}.action{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 13px;border:1px solid rgba(93,12,42,.08);border-radius:11px;color:#6e505b;background:#fff;cursor:pointer;font-size:8px;font-weight:900}.action:hover{background:#fff2f5;color:#982044}

      .footer{position:relative;overflow:hidden;color:#f7e9ed;background:radial-gradient(circle at 75% 0%,rgba(238,88,128,.18),transparent 25%),linear-gradient(135deg,#3b0618,#22030e 48%,#100107);box-shadow:0 -25px 80px rgba(62,5,27,.12)}.footer:before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,rgba(246,139,166,.9),transparent)}.footerMain{max-width:1400px;margin:auto;padding:57px clamp(18px,5vw,72px) 44px;display:grid;grid-template-columns:1.3fr 1fr .72fr;gap:55px;position:relative;z-index:2}.footerBrand{display:flex;align-items:center;gap:11px}.footerLogo{width:46px;height:46px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.15);border-radius:14px;color:#fff;background:linear-gradient(145deg,#ee7b9a,#bd2c54 55%,#6c102d);box-shadow:0 15px 35px rgba(0,0,0,.2)}.footerName{color:#fff;font-size:27px;font-weight:950;letter-spacing:-.07em}.footerName em{color:#ef7999;font-style:normal}.footerTag{margin-top:27px;color:#df6b8c;font-size:7px;font-weight:950;letter-spacing:.2em}.footerStatement{margin-top:8px;color:#fff;font-size:24px;font-weight:950;letter-spacing:-.06em}.footerDesc{max-width:410px;margin:10px 0 0;color:#b9919f;font-size:9px;line-height:1.8}.secure{width:max-content;display:flex;align-items:center;gap:8px;margin-top:20px;padding:10px 13px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.045);font-size:8px}.footerCols{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding-top:6px}.footerCols b{display:block;margin-bottom:15px;color:#ed7d9b;font-size:7px;letter-spacing:.18em}.footerCols a{display:flex;align-items:center;justify-content:space-between;margin:12px 0;color:#bc98a4;font-size:8px;font-weight:700}.footerCols a:hover{color:#fff}.system{min-height:220px;padding:19px;border:1px solid rgba(255,255,255,.08);border-radius:21px;background:radial-gradient(circle at 50% 0%,rgba(238,103,141,.13),transparent 46%),rgba(255,255,255,.035)}.systemOrb{width:84px;height:84px;position:relative;display:grid;place-items:center;margin:0 auto 15px}.ring{position:absolute;inset:0;border:1px solid rgba(236,119,151,.23);border-radius:50%}.ring.r2{inset:11px;border-color:rgba(236,119,151,.15)}.systemCore{width:43px;height:43px;display:grid;place-items:center;border-radius:50%;color:#fff;background:radial-gradient(circle at 32% 25%,#ed8ca7,#ad2850 62%,#68102d);box-shadow:0 15px 30px rgba(0,0,0,.24)}.systemLive{display:flex;justify-content:center;gap:6px;color:#59bd8b;font-size:6px;font-weight:950;letter-spacing:.14em}.systemLive i{width:5px;height:5px;border-radius:50%;background:#45b981}.system strong{display:block;margin-top:8px;color:#fff;text-align:center;font-size:12px}.system p{max-width:220px;margin:8px auto 0;color:#a98290;text-align:center;font-size:7px;line-height:1.7}.divider{max-width:1256px;height:1px;margin:auto;background:linear-gradient(90deg,transparent,rgba(255,255,255,.11),transparent)}.bottom{max-width:1256px;margin:auto;padding:18px clamp(18px,5vw,0px) 21px;display:flex;justify-content:space-between;gap:20px;color:#80606d;font-size:7px}.bottom>div{display:flex;align-items:center;gap:9px}.bottom i{width:3px;height:3px;border-radius:50%;background:#8e6875}
      .toast{position:fixed;right:24px;bottom:24px;z-index:120;display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:12px;color:#fff;background:#4f0920;box-shadow:0 18px 40px rgba(53,3,19,.22);font-size:8px;font-weight:850}

      @media(max-width:1080px){.navLinks a:nth-child(n+6){display:none}.hero{grid-template-columns:1fr 1fr}.metrics{grid-template-columns:repeat(3,1fr)}.requestHead,.requestRow{grid-template-columns:2fr 1fr .75fr .9fr .9fr 42px}.requestHead>:nth-child(6),.requestRow>:nth-child(6){display:none}.footerMain{grid-template-columns:1fr;gap:35px}.system{max-width:340px}}
      @media(max-width:780px){.nav{height:70px}.navLinks{display:none}.mobile{display:grid;place-items:center}.profileName{display:none}.hero{grid-template-columns:1fr;padding-top:40px}.visual{min-height:290px}.head{display:block}.hint{margin-top:9px;text-align:left}.controls{display:block}.search{max-width:none}.filters{margin-top:8px;overflow:auto}.metrics{grid-template-columns:repeat(2,1fr)}.requestShell{overflow-x:auto}.requestHead,.requestRow{min-width:860px}.strip{display:block}.stripStat{margin-top:12px;width:max-content}.footerCols{grid-template-columns:repeat(3,1fr)}.bottom{display:block;line-height:2}.bottom>div+div{margin-top:7px}}
      @media(max-width:520px){.hero h1{font-size:50px}.visual{transform:scale(.82);margin:-20px 0;height:260px}.metrics{grid-template-columns:1fr 1fr}.footerCols{gap:10px}.footerStatement{font-size:22px}}

    `}</style>
    <style>{`
      .requestShell{width:100%;display:block}
      .requestHead,.requestRow{
        display:grid !important;
        grid-template-columns:2.1fr .9fr .8fr 1fr .9fr 42px !important;
        align-items:center !important;
        gap:12px !important;
      }
      .requestHead{min-height:42px;padding:0 18px;color:#9b7a86;font-size:7px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      .requestRow{
        min-height:150px;padding:18px;margin-bottom:10px;
        border:1px solid rgba(142,25,65,.075);border-radius:18px;
        background:rgba(255,255,255,.76);box-shadow:0 12px 35px rgba(80,7,30,.045);
      }
      .requestRow:hover{transform:translateY(-2px);box-shadow:0 18px 42px rgba(80,7,30,.08)}
      .requestRow>*{min-width:0}
      .requestMain{display:flex;gap:12px;align-items:flex-start}
      .requestMain .avatar{flex:0 0 auto}
      .requestBlood{display:flex;align-items:center;gap:8px}
      .requestCare,.requestProgress{font-size:9px}
      .requestShell .requestFooter{
        display:flex;align-items:center;justify-content:space-between;gap:12px;
        grid-column:1/-1;margin-top:8px;padding-top:12px;
        border-top:1px solid rgba(142,25,65,.06)
      }
      @media(max-width:1080px){
        .requestHead,.requestRow{grid-template-columns:2fr 1fr .8fr 1fr .9fr !important}
        .requestArrow{display:none !important}
      }
      @media(max-width:780px){
        .requestShell{overflow-x:auto}
        .requestHead,.requestRow{min-width:900px}
      }

      /* Premium request-card layout: these classes match the current JSX. */
      .requestDeck{position:relative;margin-top:18px;padding:clamp(16px,2.3vw,28px);overflow:hidden;border:1px solid rgba(255,255,255,.95);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.82),rgba(255,242,247,.72));box-shadow:0 25px 70px rgba(126,18,57,.075),inset 0 1px 0 #fff;backdrop-filter:blur(20px)}
      .requestDeck:before{content:"";position:absolute;width:340px;height:340px;right:-130px;top:-170px;border-radius:50%;background:radial-gradient(circle,#ef5a871c,transparent 70%);pointer-events:none}
      .deckTop{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:18px}
      .deckKicker{font-size:9px;font-weight:950;letter-spacing:.19em;color:#d42b5b}
      .deckTitle{margin-top:8px;font-size:clamp(18px,2vw,25px);font-weight:900;letter-spacing:-.055em;color:#3a1522}
      .deckLegend{display:flex;flex-wrap:wrap;gap:8px}.deckLegend span{display:flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid rgba(125,25,60,.07);border-radius:999px;background:#ffffffb8;color:#866571;font-size:9px;font-weight:800}
      .legendDot{width:7px;height:7px;border-radius:50%;display:inline-block}.criticalDot{background:#ed315d;box-shadow:0 0 0 4px #ed315d18}.highDot{background:#ee9b44}.liveDot{background:#12b887}
      .requestCards{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
      .requestCard{position:relative;isolation:isolate;min-width:0;overflow:hidden;padding:19px;border:1px solid rgba(255,255,255,.98);border-radius:23px;background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(255,249,251,.86));box-shadow:0 15px 35px rgba(107,17,48,.065),inset 0 1px 0 #fff;transform-style:preserve-3d;transition:border-color .25s,box-shadow .25s}
      .requestCard:hover{border-color:#f4b4c8;box-shadow:0 23px 48px rgba(145,20,62,.12)}.requestCard.criticalCard{border-top:3px solid #e82e5d}.requestCard.highCard{border-top:3px solid #f0a34c}
      .cardGlow{position:absolute;z-index:-1;right:-65px;top:-75px;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle,#f7a4bc38,transparent 68%);pointer-events:none}
      .requestCardTop{display:flex;align-items:center;justify-content:space-between;gap:8px}.patientBlock{display:flex;align-items:center;gap:11px;min-width:0}.patientOrb{position:relative;display:grid;place-items:center;flex:0 0 43px;width:43px;height:43px;border-radius:15px;color:#fff;background:radial-gradient(circle at 30% 22%,#ffb2c8,#e73569 52%,#8f103a);box-shadow:inset -7px -8px 13px #6f0c2b38,0 8px 18px #d7295a22;font-size:11px;font-weight:950}.patientOrb i{position:absolute;width:7px;height:7px;right:1px;bottom:1px;border:2px solid #fff;border-radius:50%;background:#16b98a}
      .patientCopy{min-width:0}.patientCopy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#401827;font-size:13px;font-weight:900}.patientCopy span{display:flex;align-items:center;gap:4px;margin-top:5px;color:#9b7785;font-size:9px}
      .floatingArrow{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border:1px solid #f0d9e1;border-radius:12px;background:#fff;color:#bd2453;cursor:pointer;transition:.2s}.floatingArrow:hover{color:#fff;background:#c91e53;transform:translate(2px,-2px)}
      .requestIdentity{display:flex;align-items:center;gap:12px;margin-top:21px;padding:14px;border:1px solid #f5e4ea;border-radius:17px;background:linear-gradient(120deg,#fff5f8,#fff)}.bloodOrb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;flex:0 0 51px;width:51px;height:58px;border-radius:15px;color:#fff;background:linear-gradient(145deg,#f0527d,#bd174b 68%,#790d31);box-shadow:inset -7px -8px 13px #600a2730,0 7px 15px #cb1d5020}.bloodOrb b{font-size:12px}.requestIdentity>div:nth-child(2){min-width:0;flex:1}.microLabel{display:block;color:#a47c8a;font-size:7px;font-weight:950;letter-spacing:.13em}.requestIdentity>div:nth-child(2)>strong{display:block;margin-top:6px;color:#3e1726;font-size:23px;letter-spacing:-.06em}.requestIdentity small{font-size:9px;font-weight:700;color:#9b7885;letter-spacing:0}.urgencyBadge{display:flex;align-items:center;gap:4px;padding:7px 8px;border-radius:999px;font-size:7px;font-weight:950}.urgencyBadge.critical{color:#c61d4c;background:#ffe6ed}.urgencyBadge.high{color:#b76b1d;background:#fff0df}.urgencyBadge.medium{color:#97721e;background:#fff8df}.urgencyBadge.low{color:#21845e;background:#e9f8f0}
      .careNode{display:flex;align-items:center;gap:10px;margin-top:16px;min-width:0}.nodeIcon{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border-radius:11px;color:#bd2453;background:#fff0f5}.careNode>div:nth-child(2){min-width:0;flex:1}.careNode span{display:block;color:#a7818e;font-size:7px;font-weight:950;letter-spacing:.13em}.careNode strong{display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#482030;font-size:10px}.careNode small{display:block;margin-top:3px;color:#a1848e;font-size:8px}.statusBadge{display:inline-flex;align-items:center;gap:4px;padding:6px 7px;border-radius:999px;background:#f6edf1;color:#886776;font-size:7px;font-weight:900;white-space:nowrap}.statusBadge.open{color:#bc2451;background:#ffedf2}.statusBadge.fulfilled{color:#16835d;background:#e9f8f0}.statusBadge.in_progress,.statusBadge.donor_accepted{color:#a66b1b;background:#fff5df}.statusBadge.cancelled{color:#9c5369;background:#f8edf1}
      .progressArea{margin-top:17px;padding-top:14px;border-top:1px solid #f3e4e9}.progressMeta{display:flex;justify-content:space-between;gap:8px;color:#a27d8a;font-size:7px;font-weight:950;letter-spacing:.1em}.progressMeta b{color:#bf2250;font-size:10px;letter-spacing:0}.progressTrack{height:6px;margin-top:9px;overflow:hidden;border-radius:99px;background:#f5e5eb}.progressTrack i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#d91d55,#ff789b);box-shadow:0 0 12px #ec4c7c45}.timeline{display:flex;justify-content:space-between;gap:4px;margin-top:10px}.timeline span{display:flex;align-items:center;gap:4px;color:#b39aa4;font-size:7px}.timeline span i{width:5px;height:5px;border-radius:50%;background:#e6d2db}.timeline span.done{color:#a92650;font-weight:850}.timeline span.done i{background:#e33268;box-shadow:0 0 0 3px #e3326818}
      .cardStats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:15px}.cardStats>div{padding:9px;border:1px solid #f2e4e9;border-radius:12px;background:#fff9fb}.cardStats span{display:block;color:#a58792;font-size:6px;font-weight:950;letter-spacing:.08em}.cardStats strong{display:block;margin-top:5px;color:#482030;font-size:15px}.cardStats small{font-size:8px;color:#9a7a86}.requestFooter{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid #f3e4e9}.created span{display:block;color:#a58792;font-size:6px;font-weight:950;letter-spacing:.1em}.created b{display:block;margin-top:4px;color:#674251;font-size:9px}.inspectBtn{display:flex;align-items:center;gap:5px;padding:9px 11px;border:1px solid #f0d3df;border-radius:11px;color:#b51d4d;background:#fff5f8;cursor:pointer;font-size:8px;font-weight:900;white-space:nowrap}.inspectBtn:hover{color:#fff;background:#c51d52}
      .empty{min-height:220px;display:grid;place-items:center;padding:30px;text-align:center}.emptyIcon{width:49px;height:49px;display:grid;place-items:center;margin:auto;border-radius:16px;color:#bd2453;background:#fff0f5}.empty strong{display:block;margin-top:12px;color:#421b2a;font-size:13px}.empty p{margin:6px 0 0;color:#987985;font-size:9px;line-height:1.6}
      @media(max-width:1250px){.requestCards{grid-template-columns:repeat(2,minmax(0,1fr))}.requestIdentity{gap:8px}.urgencyBadge{font-size:6px}}
      @media(max-width:760px){.deckTop{align-items:flex-start;flex-direction:column}.requestCards{grid-template-columns:1fr}.requestCard{padding:16px}.requestIdentity{padding:11px}.careNode{flex-wrap:wrap}.statusBadge{margin-left:auto}}
    `}</style>



    <section className="hero">
      <motion.div initial={{opacity:0,x:-24}} animate={{opacity:1,x:0}} transition={{duration:.7}}>
        <div className="eyebrow"><Sparkles size={11}/> BloodLink request intelligence</div>
        <h1>Protect every <span>urgent request.</span></h1>
        <p>One operational layer for emergency blood demand across the network. See urgency, care centres, fulfilment progress and request ownership from a protected administrative workspace.</p>
        <div className="heroActions"><button className="primary" onClick={()=>load(true)}><RefreshCw size={13}/>{syncing?"Syncing network":"Sync live requests"}</button><span className="live"><i/>Live protected request feed</span></div>
      </motion.div>
      <div className="visual" aria-hidden="true">
        <div className="glow"/><div className="orbit"/><div className="orbit o2"/><div className="orbit o3"/>
        <span className="dot d1"/><span className="dot d2"/><span className="dot d3"/><span className="dot d4"/>
        <span className="floatTag t1"><AlertTriangle size={11}/> CRITICAL WATCH</span><span className="floatTag t2"><HeartPulse size={11}/> NETWORK LIVE</span>
        <motion.div className="core" animate={{rotate:[-2,2,-2],y:[0,-8,0]}} transition={{duration:6,repeat:Infinity,ease:"easeInOut"}}><div className="coreInner"><HeartPulse size={27}/></div></motion.div>
      </div>
    </section>

    <section className="content">
      <div className="head"><div><div className="kicker">Operational pulse</div><h2 className="title">Every request, one command view.</h2></div><div className="hint">Records below are pulled from the protected admin request endpoint. Nothing in the metrics is hard-coded.</div></div>

      <div className="controls">
        <div className="search"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient, hospital, city, blood group or request ID..."/></div>
        <div className="filters"><select className="select" value={status} onChange={e=>setStatus(e.target.value)}>{STATUS.map(x=><option key={x}>{x}</option>)}</select><select className="select" value={urgency} onChange={e=>setUrgency(e.target.value)}>{URGENCY.map(x=><option key={x}>{x}</option>)}</select><button className="refresh" onClick={()=>load(true)}><RefreshCw size={12}/>Refresh</button></div>
      </div>

      <div className="metrics">
        <div className="metric"><span>Live demand</span><strong>{stats.open}</strong><small>Open requests</small></div>
        <div className="metric"><span>Emergency watch</span><strong>{stats.critical}</strong><small>Critical requests</small></div>
        <div className="metric"><span>In motion</span><strong>{stats.progress}</strong><small>Accepted / in progress</small></div>
        <div className="metric"><span>Completed care</span><strong>{stats.fulfilled}</strong><small>Fulfilled requests</small></div>
        <div className="metric"><span>Demand units</span><strong>{stats.units}</strong><small>Total units requested</small></div>
        <div className="metric"><span>Closed demand</span><strong>{stats.cancelled}</strong><small>Cancelled requests</small></div>
      </div>

      <div className="requestDeck">
        <div className="deckTop">
          <div>
            <div className="deckKicker">LIVE DEMAND FIELD</div>
            <div className="deckTitle">Emergency requests in motion.</div>
          </div>
          <div className="deckLegend">
            <span><i className="legendDot criticalDot" /> Critical</span>
            <span><i className="legendDot highDot" /> High</span>
            <span><i className="legendDot liveDot" /> Live</span>
          </div>
        </div>

        {loading ? (
          <div className="empty">
            <div>
              <div className="emptyIcon"><Activity size={22}/></div>
              <strong>Synchronizing request layer</strong>
              <p>Fetching live blood demand from the protected API.</p>
            </div>
          </div>
        ) : error ? (
          <div className="empty">
            <div>
              <div className="emptyIcon"><XCircle size={22}/></div>
              <strong>Request layer unavailable</strong>
              <p>{error}</p>
              <button className="refresh" style={{margin:"14px auto 0"}} onClick={()=>load()}>Try again</button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div>
              <div className="emptyIcon"><Search size={22}/></div>
              <strong>No matching requests</strong>
              <p>Change the search or urgency/status filter.</p>
            </div>
          </div>
        ) : (
          <div className="requestCards">
            {filtered.map((r,index) => {
              const level = String(r.urgency || "LOW").toUpperCase();
              const reqStatus = String(r.status || "OPEN").toUpperCase();
              const isCritical = level === "CRITICAL";
              const isHigh = level === "HIGH";
              const responses = r.donorResponses?.length || 0;
              const reserved = Number(r.reservedUnits || 0);
              const issued = Number(r.issuedUnits || 0);
              const progress = reqStatus === "FULFILLED" ? 100 :
                reqStatus === "IN_PROGRESS" ? 72 :
                reqStatus === "DONOR_ACCEPTED" ? 45 : 18;

              return (
                <motion.article
                  className={`requestCard ${isCritical ? "criticalCard" : ""} ${isHigh ? "highCard" : ""}`}
                  key={r._id}
                  initial={{opacity:0,y:18,scale:.98}}
                  animate={{opacity:1,y:0,scale:1}}
                  transition={{delay:index*.035,duration:.45}}
                  whileHover={{y:-5,rotateX:1,rotateY:-1}}
                >
                  <div className="cardGlow" />

                  <div className="requestCardTop">
                    <div className="patientBlock">
                      <div className="patientOrb">
                        <span>{initials(r.patientName || "Patient")}</span>
                        <i />
                      </div>
                      <div className="patientCopy">
                        <strong>{r.patientName || "Unnamed patient"}</strong>
                        <span><MapPin size={9}/>{r.city || "Location unavailable"}</span>
                      </div>
                    </div>

                    <button className="floatingArrow" onClick={()=>setSelected(r)}>
                      <ArrowUpRight size={15}/>
                    </button>
                  </div>

                  <div className="requestIdentity">
                    <div className="bloodOrb">
                      <Droplets size={18} fill="currentColor"/>
                      <b>{r.bloodGroup}</b>
                    </div>
                    <div>
                      <span className="microLabel">BLOOD REQUIREMENT</span>
                      <strong>{r.unitsRequired || 0}<small> units required</small></strong>
                    </div>
                    <div className={`urgencyBadge ${urgencyTone[level] || "low"}`}>
                      <AlertTriangle size={10}/>
                      {level}
                    </div>
                  </div>

                  <div className="careNode">
                    <div className="nodeIcon"><Hospital size={14}/></div>
                    <div>
                      <span>CARE NODE</span>
                      <strong>{r.hospitalName || "Hospital"}</strong>
                      <small>{r.city || "Location unavailable"}</small>
                    </div>
                    <div className={`statusBadge ${reqStatus.toLowerCase()}`}>
                      {reqStatus === "FULFILLED" ? <CheckCircle2 size={9}/> : <Clock3 size={9}/>}
                      {pretty(reqStatus)}
                    </div>
                  </div>

                  <div className="progressArea">
                    <div className="progressMeta">
                      <span>REQUEST LIFECYCLE</span>
                      <b>{progress}%</b>
                    </div>
                    <div className="progressTrack">
                      <i style={{width:`${progress}%`}} />
                    </div>
                    <div className="timeline">
                      <span className={progress >= 18 ? "done" : ""}><i/>Open</span>
                      <span className={progress >= 45 ? "done" : ""}><i/>Matched</span>
                      <span className={progress >= 72 ? "done" : ""}><i/>In progress</span>
                      <span className={progress >= 100 ? "done" : ""}><i/>Fulfilled</span>
                    </div>
                  </div>

                  <div className="cardStats">
                    <div>
                      <span>DONOR RESPONSES</span>
                      <strong>{responses}</strong>
                    </div>
                    <div>
                      <span>RESERVED</span>
                      <strong>{reserved}<small> u</small></strong>
                    </div>
                    <div>
                      <span>ISSUED</span>
                      <strong>{issued}<small> u</small></strong>
                    </div>
                  </div>

                  <div className="requestFooter">
                    <div className="created">
                      <span>REQUESTED</span>
                      <b>{dateOf(r.createdAt)}</b>
                    </div>
                    <button className="inspectBtn" onClick={()=>setSelected(r)}>
                      Inspect request <ChevronRight size={13}/>
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
      {!loading&&!error&&<div className="strip"><div className="stripInfo"><div className="stripIcon"><ShieldCheck size={18}/></div><div><span>ADMINISTRATIVE CONTROL</span><strong>Emergency demand is under protected supervision.</strong><p>Open a request to inspect the care node, blood-bank assignment, donor responses and lifecycle status.</p></div></div><div className="stripStat"><PackageCheck size={15} color="#b3264d"/><b>{stats.units}</b><span>units requested</span></div></div>}
    </section>

    

    <AnimatePresence>{selected&&<><motion.div className="backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setSelected(null)}/><motion.aside className="drawer" initial={{x:35,opacity:0}} animate={{x:0,opacity:1}} exit={{x:35,opacity:0}}>
      <div className="drawerTop"><div className="eyebrow"><ShieldCheck size={11}/> REQUEST CONTROL</div><button className="close" onClick={()=>setSelected(null)}><X size={16}/></button></div>
      <div className="detailHero"><div className="detailTitle"><div className="detailAvatar">{selected.bloodGroup}</div><div><strong>{selected.patientName||"Unnamed patient"}</strong><span>{selected.hospitalName||"Hospital"} · {selected.city||"—"}</span></div></div></div>
      <div className="detailGrid">
        <div className="detail"><span>Blood group</span><b>{selected.bloodGroup}</b></div><div className="detail"><span>Units required</span><b>{selected.unitsRequired||0}</b></div>
        <div className="detail"><span>Urgency</span><b>{pretty(selected.urgency)}</b></div><div className="detail"><span>Status</span><b>{pretty(selected.status)}</b></div>
        <div className="detail"><span>Blood bank</span><b>{nameOf(selected.bloodBank,"Not assigned")}</b></div><div className="detail"><span>Created</span><b>{dateOf(selected.createdAt)}</b></div>
        <div className="detail"><span>Donor responses</span><b>{selected.donorResponses?.length||0}</b></div><div className="detail"><span>Reserved units</span><b>{selected.reservedUnits||0}</b></div>
        <div className="detail"><span>Contact</span><b>{selected.contactName||"—"}</b></div><div className="detail"><span>Phone</span><b>{selected.contactPhone||"—"}</b></div>
      </div>
      <div className="detailActions">
        {selected.status==="OPEN"&&<button className="action" disabled={busy} onClick={()=>updateStatus("DONOR_ACCEPTED")}><Users size={14}/> Mark donor accepted <ChevronRight size={13} style={{marginLeft:"auto"}}/></button>}
        {["OPEN","DONOR_ACCEPTED"].includes(String(selected.status))&&<button className="action" disabled={busy} onClick={()=>updateStatus("IN_PROGRESS")}><Activity size={14}/> Move to in progress <ChevronRight size={13} style={{marginLeft:"auto"}}/></button>}
        {selected.status==="IN_PROGRESS"&&<button className="action" disabled={busy} onClick={()=>updateStatus("FULFILLED")}><Check size={14}/> Mark fulfilled <ChevronRight size={13} style={{marginLeft:"auto"}}/></button>}
        {!["FULFILLED","CANCELLED"].includes(String(selected.status))&&<button className="action" disabled={busy} onClick={()=>updateStatus("CANCELLED")}><XCircle size={14}/> Cancel request <ChevronRight size={13} style={{marginLeft:"auto"}}/></button>}
      </div>
    </motion.aside></>}</AnimatePresence>

    {toast&&<motion.div className="toast" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><CheckCircle2 size={14}/>{toast}</motion.div>}
  
</main>
}
