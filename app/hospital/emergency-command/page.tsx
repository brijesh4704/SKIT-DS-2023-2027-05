"use client";

import { HospitalNavbar, HospitalFooter, HospitalChromeStyles } from "../components/HospitalChrome";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, ArrowRight, Bell, Building2, ChevronRight,
  Clock3, Droplets, HeartPulse, LayoutDashboard, MapPin, Menu, RefreshCw,
  ShieldCheck, Sparkles, Users, X, Zap, Target, Radio, CheckCircle2
} from "lucide-react";
import "./emergency.css";
import { API_BASE_URL, authHeaders, clearAuth, getToken } from "../../../lib/api";

type Urgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type RequestItem = {
  id: string; patientName?: string; bloodGroup: string; unitsRequired: number;
  hospitalName: string; city: string; urgency: Urgency; status: string;
  createdAt?: string; contactName?: string; contactPhone?: string; location?: any;
};

const idOf = (r:any) => String(r?._id ?? r?.id ?? r?._ ?? "");
const relativeTime = (v?:string) => {
  if (!v) return "Time unavailable";
  const ms = Date.now() - new Date(v).getTime();
  const m = Math.max(0, Math.floor(ms/60000));
  if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h ${m%60}m ago`;
  return `${Math.floor(h/24)}d ago`;
};
const activeStatus = (s:string) => !["FULFILLED","CANCELLED"].includes(String(s).toUpperCase());
const urgencyRank:Record<string,number> = { CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1 };

export default function HospitalEmergencyPage(){
  const router = useRouter();
  const [requests,setRequests]=useState<RequestItem[]>([]);
  const [selected,setSelected]=useState<RequestItem|null>(null);
  const [matches,setMatches]=useState<any[]>([]);
  const [responses,setResponses]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [detailLoading,setDetailLoading]=useState(false);
  const [actionLoading,setActionLoading]=useState(false);
  const [error,setError]=useState("");
  const [toast,setToast]=useState("");
  const [mobile,setMobile]=useState(false);
  const [filter,setFilter]=useState<"ALL"|Urgency>("ALL");

  const hospitalName=useMemo(()=>{try{const u=JSON.parse(localStorage.getItem("bloodlink_user")||"{}");return u?.hospitalName||u?.name||"Hospital Command Center"}catch{return "Hospital Command Center"}},[]);

  const logoutIfUnauthorized=(responses:Response[])=>{if(responses.some(r=>r.status===401)){clearAuth();window.location.href="/login";return true}return false};

  const load=useCallback(async(refresh=false)=>{
    if(!getToken()){clearAuth();window.location.href="/login";return}
    refresh?setRefreshing(true):setLoading(true);setError("");
    try{
      const r=await fetch(`${API_BASE_URL}/api/blood-requests/my`,{headers:authHeaders(),cache:"no-store"});
      if(logoutIfUnauthorized([r]))return;
      const d=await r.json().catch(()=>({})); if(!r.ok)throw Error(d?.message||"Unable to load emergency requests.");
      const list=Array.isArray(d?.requests)?d.requests:Array.isArray(d)?d:[];
      setRequests(list.map((x:any)=>({id:idOf(x),patientName:x?.patientName,bloodGroup:String(x?.bloodGroup||x?.blood||"—").toUpperCase(),unitsRequired:Number(x?.unitsRequired??x?.units??0)||0,hospitalName:x?.hospitalName||"Hospital",city:x?.city||"Location unavailable",urgency:String(x?.urgency||"MEDIUM").toUpperCase() as Urgency,status:String(x?.status||"OPEN").toUpperCase(),createdAt:x?.createdAt,contactName:x?.contactName,contactPhone:x?.contactPhone,location:x?.location})).filter((x:RequestItem)=>x.id));
    }catch(e){setError(e instanceof Error?e.message:"Unable to load emergency requests.")}finally{setLoading(false);setRefreshing(false)}
  },[]);

  useEffect(()=>{load();const t=window.setInterval(()=>load(true),30000);return()=>window.clearInterval(t)},[load]);

  const critical=useMemo(()=>requests.filter(r=>r.urgency==="CRITICAL"&&activeStatus(r.status)).sort((a,b)=>urgencyRank[b.urgency]-urgencyRank[a.urgency]||new Date(a.createdAt||0).getTime()-new Date(b.createdAt||0).getTime()),[requests]);
  const high=useMemo(()=>requests.filter(r=>r.urgency==="HIGH"&&activeStatus(r.status)),[requests]);
  const active=useMemo(()=>requests.filter(r=>activeStatus(r.status)),[requests]);
  const visible=useMemo(()=>{const base=filter==="ALL"?active:active.filter(r=>r.urgency===filter);return [...base].sort((a,b)=>urgencyRank[b.urgency]-urgencyRank[a.urgency]||new Date(a.createdAt||0).getTime()-new Date(b.createdAt||0).getTime())},[active,filter]);

  const openCase=async(r:RequestItem)=>{
    setSelected(r);setDetailLoading(true);setMatches([]);setResponses([]);
    try{
      const [mr,rr]=await Promise.all([fetch(`${API_BASE_URL}/api/blood-requests/${r.id}/matches`,{headers:authHeaders(),cache:"no-store"}),fetch(`${API_BASE_URL}/api/blood-requests/${r.id}/responses`,{headers:authHeaders(),cache:"no-store"})]);
      if(logoutIfUnauthorized([mr,rr]))return;
      const [md,rd]=await Promise.all([mr.json().catch(()=>({})),rr.json().catch(()=>({}))]);
      if(mr.ok)setMatches(Array.isArray(md?.matchingDonors)?md.matchingDonors:[]);
      if(rr.ok)setResponses(Array.isArray(rd?.responses)?rd.responses:[]);
    }catch(e){setToast(e instanceof Error?e.message:"Unable to load response intelligence.");window.setTimeout(()=>setToast(""),3000)}finally{setDetailLoading(false)}
  };

  const updateStatus=async(next:string)=>{
    if(!selected)return;setActionLoading(true);
    try{
      const r=await fetch(`${API_BASE_URL}/api/blood-requests/${selected.id}/status`,{method:"PATCH",headers:authHeaders({"Content-Type":"application/json"}),body:JSON.stringify({status:next})});
      if(logoutIfUnauthorized([r]))return;const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d?.message||"Unable to update request status.");
      setSelected({...selected,status:next});setToast(`Request moved to ${next.replaceAll("_"," ")}.`);await load(true);window.setTimeout(()=>setToast(""),2500);
    }catch(e){setToast(e instanceof Error?e.message:"Unable to update request.");window.setTimeout(()=>setToast(""),3000)}finally{setActionLoading(false)}
  };

  const nav=[
    ["Dashboard",LayoutDashboard,"/hospital"],["Emergency Center",Zap,"/hospital/emergency-command"],["My Requests",Droplets,"/hospital/requests"],["AI Match Center",Sparkles,"/hospital/donor-network"],["Blood Inventory",Activity,"/hospital/inventory"],["Analytics",Target,"/hospital/analytics"],["Notifications",Bell,"/hospital/notifications"],["Settings",ShieldCheck,"/hospital/settings"]
  ] as const;

  return <main className="em-page">
      <HospitalChromeStyles />
      <HospitalNavbar />

    <div className="em-bg em-bg-a"/><div className="em-bg em-bg-b"/><div className="em-grid"/>
    <aside className={`em-sidebar hospital-shell-sidebar ${mobile?"open":""}`}>
      <div className="em-brand"><div className="em-brand-mark"><HeartPulse size={20}/></div><div><strong>BloodLink<span>AI</span></strong><small>HOSPITAL COMMAND</small></div><button onClick={()=>setMobile(false)}><X size={18}/></button></div>
      <div className="em-profile"><div className="em-avatar"><Building2 size={20}/></div><div><strong>{hospitalName}</strong><span><i/>Verified hospital</span></div></div>
      <div className="em-nav-label">OPERATIONS</div>
      <nav>{nav.map(([label,Icon,path])=><button key={label} className={label==="Emergency Center"?"active":""} onClick={()=>router.push(path)}><Icon size={16}/><span>{label}</span>{label==="Emergency Center"&&<b>LIVE</b>}</button>)}</nav>
      <div className="em-side-bottom"><div className="em-sec"><ShieldCheck size={16}/><div><strong>Protected workspace</strong><span>Emergency data is scoped to your hospital.</span></div></div><button onClick={()=>router.push("/")}>Visit BloodLink AI <ArrowRight size={14}/></button></div>
    </aside>
    {mobile&&<button className="em-backdrop" onClick={()=>setMobile(false)}/>} 
    <section className="em-main">
      <header className="em-top"><button className="em-menu" onClick={()=>setMobile(true)}><Menu size={20}/></button><div className="em-crumb"><span>HOSPITAL</span><ChevronRight size={13}/><strong>EMERGENCY CENTER</strong></div><div className="em-top-right"><span><i/>Network live</span><button onClick={()=>router.push("/hospital/notifications")}><Bell size={17}/></button><div><Building2 size={14}/>{hospitalName}</div></div></header>
      <div className="em-content">
        <section className="em-hero">
          <div className="em-hero-copy"><div className="em-eyebrow"><Radio size={13}/> LIVE EMERGENCY RESPONSE CENTER</div><h1>Move critical blood requests <span>before time moves.</span></h1><p>One command surface for active emergencies, AI donor matching, response activity and request lifecycle control.</p><div className="em-actions"><button onClick={()=>load(true)}><RefreshCw size={16} className={refreshing?"spin":""}/>Refresh network</button><button className="ghost" onClick={()=>router.push("/hospital/requests")}>Open all requests <ArrowRight size={16}/></button></div></div>
          <div className="em-core"><div className="core-ring r1"/><div className="core-ring r2"/><div className="core-ring r3"/><div className="core-pulse"><AlertTriangle size={35}/><strong>{critical.length}</strong><span>CRITICAL</span></div><div className="core-node n1">O+</div><div className="core-node n2">A−</div><div className="core-node n3">B+</div></div>
        </section>

        <section className="em-kpis">
          <div><span className="kpi-icon critical"><AlertTriangle size={17}/></span><small>CRITICAL NOW</small><strong>{critical.length}</strong><em>active cases</em></div>
          <div><span className="kpi-icon high"><Zap size={17}/></span><small>HIGH PRIORITY</small><strong>{high.length}</strong><em>active cases</em></div>
          <div><span className="kpi-icon"><Activity size={17}/></span><small>ACTIVE REQUESTS</small><strong>{active.length}</strong><em>live hospital queue</em></div>
          <div><span className="kpi-icon"><Users size={17}/></span><small>AI MATCH LAYER</small><strong>{selected?matches.length:"—"}</strong><em>{selected?"selected case":"open a case"}</em></div>
        </section>

        <section className="em-command">
          <div className="em-command-head"><div><div className="em-section-kicker"><Sparkles size={13}/>AI TRIAGE QUEUE</div><h2>Emergency request queue</h2><p>Critical and high-priority requests stay at the top of the operational feed.</p></div><div className="em-filter">{(["ALL","CRITICAL","HIGH","MEDIUM"] as const).map(f=><button key={f} className={filter===f?"on":""} onClick={()=>setFilter(f)}>{f}</button>)}</div></div>
          {error?<div className="em-error"><AlertTriangle size={20}/><div><strong>Network feed unavailable</strong><span>{error}</span></div><button onClick={()=>load(true)}>Retry</button></div>:loading?<div className="em-empty"><RefreshCw size={25} className="spin"/><strong>Synchronizing emergency network…</strong><span>Reading your hospital blood-request feed.</span></div>:visible.length===0?<div className="em-empty"><CheckCircle2 size={27}/><strong>No active {filter.toLowerCase()} emergencies</strong><span>The queue is clear for this priority level.</span></div>:<div className="em-queue"><AnimatePresence>{visible.map((r,i)=><motion.article key={r.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.035}} className={`em-case ${r.urgency.toLowerCase()}`} onClick={()=>openCase(r)}><div className="em-case-blood"><Droplets size={21}/><strong>{r.bloodGroup}</strong><span>{r.unitsRequired} UNIT{r.unitsRequired===1?"":"S"}</span></div><div className="em-case-info"><div><h3>{r.patientName||"Emergency patient"}</h3><span className={`urg ${r.urgency.toLowerCase()}`}>{r.urgency}</span></div><p><Clock3 size={13}/>{relativeTime(r.createdAt)} <i/> <MapPin size={13}/>{r.city} <i/> ID {r.id.slice(-8).toUpperCase()}</p></div><div className="em-case-status"><small>STATUS</small><strong>{r.status.replaceAll("_"," ")}</strong></div><button className="em-open" onClick={e=>{e.stopPropagation();openCase(r)}}>Command <ArrowRight size={15}/></button></motion.article>)}</AnimatePresence></div>}
        </section>

        <section className="em-intelligence"><div className="em-intel-orb"><div/><Sparkles size={23}/></div><div><span>RESPONSE INTELLIGENCE</span><h3>Open a critical case to inspect compatible donors and live response activity.</h3><p>The emergency surface uses the same verified matching and response APIs as the hospital request workflow.</p></div><button onClick={()=>router.push("/hospital/analytics")}>Open analytics <ArrowRight size={15}/></button></section>
      </div>

      <footer className="hospital-footer">
  <div className="hospital-footer-grid">
    <div className="hospital-footer-brand">
      <div className="hospital-footer-logo"><HeartPulse size={19} /></div>
      <div>
        <strong>BloodLink<span>AI</span></strong>
        <small>HOSPITAL COMMAND CENTER</small>
      </div>
    </div>

    <div className="hospital-footer-column">
      <span>COMMAND</span>
      <button onClick={() => router.push("/hospital")}>Dashboard</button>
      <button onClick={() => router.push("/hospital/emergency-command")}>Emergency Center</button>
      <button onClick={() => router.push("/hospital/requests")}>My Requests</button>
      <button onClick={() => router.push("/hospital/donor-network")}>Donor Network</button>
    </div>

    <div className="hospital-footer-column">
      <span>MANAGE</span>
      <button onClick={() => router.push("/hospital/responses")}>Responses</button>
      <button onClick={() => router.push("/hospital/inventory")}>Blood Inventory</button>
      <button onClick={() => router.push("/hospital/analytics")}>Analytics</button>
      <button onClick={() => router.push("/hospital/notifications")}>Notifications</button>
    </div>

    <div className="hospital-footer-status">
      <div className="hospital-footer-status-top"><i /> LIVE NETWORK</div>
      <strong>OPERATIONAL</strong>
      <p>Protected hospital workspace with connected emergency coordination.</p>
      <button onClick={() => router.push("/hospital/profile")}><ShieldCheck size={13} /> Profile & Verification</button>
    </div>
  </div>

  <div className="hospital-footer-bottom">
    <span>© 2026 BloodLink AI</span>
    <span><ShieldCheck size={13} /> Protected hospital workspace</span>
    <span>Intelligent blood network · Built for faster response</span>
  </div>
</footer>
    </section>

    <AnimatePresence>{selected&&<motion.div className="em-drawer-wrap" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><button className="em-drawer-backdrop" onClick={()=>setSelected(null)}/><motion.aside className="em-drawer" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",stiffness:300,damping:30}}><div className="drawer-head"><div><span>EMERGENCY CASE</span><h2>{selected.bloodGroup} · {selected.unitsRequired} units</h2></div><button onClick={()=>setSelected(null)}><X size={19}/></button></div><div className="drawer-alert"><AlertTriangle size={17}/><div><strong>{selected.urgency} priority</strong><span>{selected.patientName||"Patient request"} · {relativeTime(selected.createdAt)}</span></div></div><div className="drawer-grid"><div><small>LOCATION</small><strong>{selected.city}</strong></div><div><small>STATUS</small><strong>{selected.status.replaceAll("_"," ")}</strong></div><div><small>AI MATCHES</small><strong>{detailLoading?"…":matches.length}</strong></div><div><small>RESPONSES</small><strong>{detailLoading?"…":responses.length}</strong></div></div><div className="drawer-section"><div className="drawer-title"><Sparkles size={15}/>AI DONOR MATCHES</div>{detailLoading?<div className="drawer-loading"><RefreshCw className="spin" size={18}/>Loading matching network…</div>:matches.length===0?<div className="drawer-muted">No compatible donor matches are currently returned for this request.</div>:<div className="drawer-list">{matches.slice(0,5).map((m:any,i)=><div className="donor-row" key={String(m?.id||m?.donor?._id||i)}><div className="donor-badge"><Users size={15}/></div><div><strong>{m?.donor?.name||m?.name||`Matched donor ${i+1}`}</strong><span>{m?.bloodGroup||selected.bloodGroup} · {m?.distanceKm!=null?`${Number(m.distanceKm).toFixed(1)} km`:m?.distance||"distance unavailable"}</span></div><b>{m?.matchScore!=null?`${m.matchScore}%`:m?.compatibility||"MATCH"}</b></div>)}</div>}</div><div className="drawer-section"><div className="drawer-title"><Radio size={15}/>DONOR RESPONSE ACTIVITY</div>{detailLoading?<div className="drawer-loading"><RefreshCw className="spin" size={18}/>Loading responses…</div>:responses.length===0?<div className="drawer-muted">No donor responses recorded yet.</div>:<div className="drawer-list">{responses.slice(0,5).map((r:any,i)=><div className="response-row" key={String(r?.id||r?._id||i)}><div><strong>{r?.donor?.name||r?.donorName||`Donor ${i+1}`}</strong><span>{String(r?.status||"PENDING").toUpperCase()}</span></div><b>{r?.responseTime||"Live"}</b></div>)}</div>}</div><div className="drawer-actions"><button disabled={actionLoading||selected.status==="IN_PROGRESS"} onClick={()=>updateStatus("IN_PROGRESS")}><Activity size={15}/>Mark in progress</button><button disabled={actionLoading||selected.status==="FULFILLED"} onClick={()=>updateStatus("FULFILLED")}><CheckCircle2 size={15}/>Mark fulfilled</button></div><button className="drawer-full" onClick={()=>router.push(`/hospital/donor-network?id=${selected.id}`)}>Open full AI Match Center <ArrowRight size={15}/></button></motion.aside></motion.div>}</AnimatePresence>
    {toast&&<div className="em-toast"><CheckCircle2 size={16}/>{toast}</div>}
  
      <HospitalFooter />
</main>
}
