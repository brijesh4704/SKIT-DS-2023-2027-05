"use client";

import { HospitalNavbar, HospitalFooter, HospitalChromeStyles } from "../components/HospitalChrome";
import { Suspense, useCallback,useEffect,useMemo,useState } from "react";
import {AnimatePresence,motion} from "framer-motion";
import {Activity,ArrowLeft,ArrowRight,Bell,Building2,CheckCircle2,ChevronRight,Clock3,Droplets,HeartPulse,Loader2,MapPin,Menu,Navigation,RefreshCw,ShieldCheck,Sparkles,TriangleAlert,UserRound,Users,X,Zap} from "lucide-react";
import {useRouter,useSearchParams} from "next/navigation";
import "./request-details.css";
import {API_BASE_URL,authHeaders,clearAuth,getToken} from "../../../lib/api";

type Status="OPEN"|"DONOR_ACCEPTED"|"IN_PROGRESS"|"FULFILLED"|"CANCELLED";
type Urgency="LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
type RequestData={id:string;patientName?:string;bloodGroup:string;unitsRequired:number;hospitalName:string;city:string;urgency:Urgency;status:Status;createdAt?:string;contactName?:string;contactPhone?:string;location?:any;raw:any};
const idOf=(x:any)=>String(x?._id||x?.id||x||""); const nice=(x:any)=>String(x||"—").replaceAll("_"," ");
const ago=(d?:string)=>{if(!d)return"Recently";const n=Math.max(0,Date.now()-new Date(d).getTime()),m=Math.floor(n/60000);if(m<1)return"Just now";if(m<60)return`${m} min ago`;const h=Math.floor(m/60);if(h<24)return`${h} hr ago`;const x=Math.floor(h/24);return`${x} day${x===1?"":"s"} ago`};

function RequestDetailsContent(){
 const router=useRouter(),params=useSearchParams(),requestId=params.get("id")||"";
 const [request,setRequest]=useState<RequestData|null>(null),[matches,setMatches]=useState<any[]>([]),[responses,setResponses]=useState<any[]>([]);
 const [loading,setLoading]=useState(true),[networkLoading,setNetworkLoading]=useState(false),[actionLoading,setActionLoading]=useState(false),[mobile,setMobile]=useState(false),[error,setError]=useState(""),[toast,setToast]=useState("");
 const user=useMemo(()=>{if(typeof window==="undefined")return null;try{return JSON.parse(localStorage.getItem("bloodlink_user")||"null")}catch{return null}},[]); const hospitalName=user?.name||user?.hospitalName||"Hospital Command Center";
 const authFail=useCallback((rs:Response[])=>{if(rs.some(r=>r.status===401||r.status===403)){clearAuth();window.location.href="/login";return true}return false},[]);
 const load=useCallback(async()=>{if(!getToken()){clearAuth();window.location.href="/login";return}if(!requestId){setError("No request selected. Open this page from My Requests.");setLoading(false);return}try{setLoading(true);const r=await fetch(`${API_BASE_URL}/api/blood-requests/my`,{headers:authHeaders(),cache:"no-store"});if(authFail([r]))return;const d=await r.json();if(!r.ok)throw Error(d.message||"Unable to load request.");const x=(Array.isArray(d.requests)?d.requests:[]).find((v:any)=>idOf(v)===requestId);if(!x)throw Error("This request was not found in your hospital workspace.");setRequest({id:idOf(x),patientName:x.patientName,bloodGroup:x.bloodGroup||"—",unitsRequired:Number(x.unitsRequired||0),hospitalName:x.hospitalName||"Hospital",city:x.city||"Location unavailable",urgency:x.urgency||"MEDIUM",status:x.status||"OPEN",createdAt:x.createdAt,contactName:x.contactName,contactPhone:x.contactPhone,location:x.location,raw:x})}catch(e){setError(e instanceof Error?e.message:"Unable to load request.")}finally{setLoading(false)}},[requestId,authFail]);
 const loadNetwork=useCallback(async()=>{if(!requestId)return;try{setNetworkLoading(true);const [a,b]=await Promise.all([fetch(`${API_BASE_URL}/api/blood-requests/${requestId}/matches`,{headers:authHeaders(),cache:"no-store"}),fetch(`${API_BASE_URL}/api/blood-requests/${requestId}/responses`,{headers:authHeaders(),cache:"no-store"})]);if(authFail([a,b]))return;const [ad,bd]=await Promise.all([a.json(),b.json()]);if(!a.ok)throw Error(ad.message||"Unable to load donor matches.");if(!b.ok)throw Error(bd.message||"Unable to load donor responses.");setMatches(Array.isArray(ad.matchingDonors)?ad.matchingDonors:[]);setResponses(Array.isArray(bd.responses)?bd.responses:[])}catch(e){setToast(e instanceof Error?e.message:"Unable to load matching network.");setTimeout(()=>setToast(""),3000)}finally{setNetworkLoading(false)}},[requestId,authFail]);
 useEffect(()=>{load()},[load]);useEffect(()=>{loadNetwork()},[loadNetwork]);
 const accepted=responses.filter(r=>String(r.status||"").toUpperCase()==="ACCEPTED").length,pending=responses.filter(r=>String(r.status||"").toUpperCase()==="PENDING").length;
 const status=async(next:Status)=>{if(!request)return;try{setActionLoading(true);const r=await fetch(`${API_BASE_URL}/api/blood-requests/${request.id}/status`,{method:"PATCH",headers:authHeaders({"Content-Type":"application/json"}),body:JSON.stringify({status:next})});if(authFail([r]))return;const d=await r.json();if(!r.ok)throw Error(d.message||"Unable to update status.");setRequest(x=>x?{...x,status:next}:x);setToast(`Request moved to ${nice(next)}.`);setTimeout(()=>setToast(""),2500)}catch(e){setToast(e instanceof Error?e.message:"Unable to update request.");setTimeout(()=>setToast(""),3000)}finally{setActionLoading(false)}};
 const maps=()=>{const c=request?.location?.coordinates,lat=c?.latitude??c?.lat,lng=c?.longitude??c?.lng;if(lat!=null&&lng!=null)window.open(`https://www.google.com/maps?q=${lat},${lng}`,"_blank");else setToast("Location coordinates are not available.")};
 return <main className="request-page">
      <HospitalChromeStyles />
      <HospitalNavbar />
<div className="rd-ambient rd-a"/><div className="rd-ambient rd-b"/><div className="rd-grid"/>
 <aside className={`rd-sidebar hospital-shell-sidebar ${mobile?"open":""}`}><div className="rd-brand"><div className="rd-brand-mark"><HeartPulse size={20}/></div><div><strong>BloodLink<span>AI</span></strong><small>HOSPITAL COMMAND</small></div><button className="rd-mobile-close" onClick={()=>setMobile(false)}><X size={18}/></button></div><div className="rd-profile"><div className="rd-avatar"><Building2 size={20}/></div><div><strong>{hospitalName}</strong><span><i/> Verified hospital</span></div></div><div className="rd-nav-label">OPERATIONS</div><nav className="rd-nav"><button onClick={()=>router.push("/hospital")}><Building2 size={17}/>Dashboard</button><button onClick={()=>router.push("/hospital/requests")}><Droplets size={17}/>My Requests</button><button className="active"><Sparkles size={17}/>AI Match Center</button><button onClick={()=>router.push("/hospital/inventory")}><Activity size={17}/>Blood Inventory</button><button onClick={()=>router.push("/hospital/analytics")}><Zap size={17}/>Analytics</button><button onClick={()=>router.push("/hospital/notifications")}><Bell size={17}/>Notifications</button><button onClick={()=>router.push("/hospital/settings")}><ShieldCheck size={17}/>Settings</button></nav><div className="rd-sidebar-bottom"><div className="rd-security"><ShieldCheck size={16}/><div><strong>Protected workspace</strong><span>Hospital data secured</span></div></div><button onClick={()=>router.push("/")}><ArrowRight size={15}/>Visit BloodLink AI</button></div></aside>
 <section className="rd-main"><header className="rd-topbar"><button className="rd-menu" onClick={()=>setMobile(true)}><Menu size={20}/></button><div className="rd-crumb"><span>HOSPITAL</span><ChevronRight size={13}/><span>REQUESTS</span><ChevronRight size={13}/><strong>AI MATCH CENTER</strong></div><div className="rd-top-actions"><div className="rd-live"><i/>Network live</div><button className="rd-icon"><Bell size={17}/><span/></button><div className="rd-user"><div><Building2 size={13}/></div>{hospitalName}</div></div></header>
 <div className="rd-content"><button className="back-link" onClick={()=>router.push("/hospital/requests")}><ArrowLeft size={15}/>Back to My Requests</button>
 {loading?<div className="rd-loading"><Loader2 className="spin" size={27}/>Loading secure request workspace...</div>:error?<div className="rd-error"><TriangleAlert size={20}/><div><strong>Request unavailable</strong><p>{error}</p></div><button onClick={load}>Retry</button></div>:request&&<>
 <section className="rd-hero"><div className="rd-hero-copy"><div className="rd-eyebrow"><Sparkles size={13}/>AI-POWERED BLOOD COORDINATION</div><div className="rd-title-line"><div className={`rd-blood-orb ${request.urgency.toLowerCase()}`}><Droplets size={32}/><span>{request.bloodGroup}</span></div><div><h1>Request <span>#{request.id.slice(-7)}</span></h1><p>{request.hospitalName} · {request.city} · {ago(request.createdAt)}</p></div></div><p className="rd-hero-text">A dedicated command surface for donor compatibility, response coordination and safe request closure.</p><div className="rd-hero-pills"><span className={`urgency ${request.urgency.toLowerCase()}`}><i/>{request.urgency} priority</span><span className="status"><i/>{nice(request.status)}</span><span><Clock3 size={13}/>{request.unitsRequired} unit{request.unitsRequired===1?"":"s"} required</span></div></div><div className="rd-hero-visual"><div className="core-ring ring-a"/><div className="core-ring ring-b"/><motion.div className="core-orb" animate={{y:[0,-9,0],rotate:[0,4,0]}} transition={{duration:5,repeat:Infinity,ease:"easeInOut"}}><HeartPulse size={45}/><span>AI<br/><b>CORE</b></span></motion.div><motion.div className="core-node n1" animate={{scale:[1,1.12,1]}} transition={{duration:2.2,repeat:Infinity}}><Users size={14}/></motion.div><motion.div className="core-node n2" animate={{scale:[1,1.15,1]}} transition={{duration:2.8,repeat:Infinity}}><Droplets size={14}/></motion.div><motion.div className="core-node n3" animate={{scale:[1,1.1,1]}} transition={{duration:2.4,repeat:Infinity}}><Zap size={14}/></motion.div></div></section>
 <section className="rd-kpis"><Kpi icon={<Users size={18}/>} label="AI matches" value={matches.length} meta="Compatible donor candidates"/><Kpi icon={<CheckCircle2 size={18}/>} label="Accepted" value={accepted} meta="Positive responses"/><Kpi icon={<Clock3 size={18}/>} label="Pending" value={pending} meta="Awaiting response"/><Kpi icon={<Droplets size={18}/>} label="Required" value={request.unitsRequired} meta={`${request.bloodGroup} blood units`}/></section>
 <section className="rd-command-grid"><div className="rd-panel"><PanelTitle eyebrow="REQUEST INTELLIGENCE" title="Case overview" icon={<Activity size={17}/>}/><div className="overview-grid"><Info label="Patient" value={request.patientName||"Not provided"} icon={<UserRound size={14}/>}/><Info label="Blood group" value={request.bloodGroup} icon={<Droplets size={14}/>}/><Info label="Contact" value={request.contactName||"Not provided"} icon={<UserRound size={14}/>}/><Info label="Phone" value={request.contactPhone||"Not provided"} icon={<Zap size={14}/>}/><Info label="Hospital" value={request.hospitalName} icon={<Building2 size={14}/>}/><Info label="City" value={request.city} icon={<MapPin size={14}/>}/></div><button className="location-btn" onClick={maps}><Navigation size={15}/>Open request location<ArrowRight size={14}/></button></div><div className="rd-panel"><PanelTitle eyebrow="LIVE WORKFLOW" title="Request lifecycle" icon={<Zap size={17}/>}/><div className="timeline">{(["OPEN","DONOR_ACCEPTED","IN_PROGRESS","FULFILLED"] as Status[]).map((s,i)=>{const o=["OPEN","DONOR_ACCEPTED","IN_PROGRESS","FULFILLED"].indexOf(request.status),done=request.status!=="CANCELLED"&&i<=o;return <div className={`timeline-step ${done?"done":""} ${request.status===s?"current":""}`} key={s}><div className="timeline-dot">{done?<CheckCircle2 size={13}/>:i+1}</div><div><strong>{nice(s)}</strong><span>{i===0?"Request created":i===1?"Donor accepted":i===2?"Coordination active":"Case fulfilled"}</span></div></div>})}</div>{request.status==="CANCELLED"&&<div className="cancelled-note"><TriangleAlert size={14}/>This request is cancelled.</div>}<div className="status-actions">{request.status==="DONOR_ACCEPTED"&&<button onClick={()=>status("IN_PROGRESS")} disabled={actionLoading}><Zap size={14}/>Start coordination</button>}{request.status==="IN_PROGRESS"&&<button onClick={()=>status("FULFILLED")} disabled={actionLoading}><CheckCircle2 size={14}/>Mark fulfilled</button>}{request.status==="OPEN"&&<button className="danger" onClick={()=>status("CANCELLED")} disabled={actionLoading}><X size={14}/>Cancel request</button>}</div></div></section>
 <section className="rd-network-section"><div className="rd-section-head"><div><div className="rd-eyebrow">DONOR DISCOVERY ENGINE</div><h2>AI donor matches</h2><p>Compatible candidates returned by the existing BloodLink matching service.</p></div><button className="refresh-btn" onClick={loadNetwork} disabled={networkLoading}>{networkLoading?<Loader2 className="spin" size={14}/>:<RefreshCw size={14}/>}Refresh network</button></div><div className="match-shell"><div className="match-visual"><div className="match-visual-core"><Sparkles size={22}/><strong>{matches.length}</strong><span>matches found</span></div><div className="scan-ring scan-one"/><div className="scan-ring scan-two"/>{[1,2,3,4,5,6].map(n=><motion.div key={n} className={`scan-dot sd-${n}`} animate={{scale:[.8,1.18,.8],opacity:[.45,1,.45]}} transition={{duration:1.8+n*.18,repeat:Infinity}}><Users size={10}/></motion.div>)}</div><div className="match-list">{networkLoading?<div className="inner-loading"><Loader2 className="spin" size={22}/>Scanning donor network...</div>:matches.length===0?<div className="empty-network"><Users size={22}/><strong>No compatible donors returned yet</strong><span>The backend has not returned a matching candidate for this request.</span></div>:matches.map((m,i)=>{const d=m.donor||m,name=d?.user?.name||d?.name||`Donor ${i+1}`,bg=d?.bloodGroup||m.bloodGroup||"—",dist=Number(m.distanceKm??m.distance);return <motion.div className="donor-card" key={m.id||idOf(d)||i} initial={{opacity:0,x:12}} animate={{opacity:1,x:0,transition:{delay:i*.04}}}><div className="donor-avatar"><HeartPulse size={15}/></div><div className="donor-main"><strong>{name}</strong><span><b>{bg}</b>{Number.isFinite(dist)&&<> · {dist.toFixed(1)} km away</>}</span><small>{m.compatibility||m.explanation||"Compatibility match returned by AI engine."}</small></div><div className="score"><Sparkles size={11}/><strong>{m.matchScore!=null?`${Math.round(m.matchScore)}%`:"MATCHED"}</strong><span>match</span></div></motion.div>})}</div></div></section>
 <section className="rd-response-section"><div className="rd-panel"><PanelTitle eyebrow="RESPONSE PIPELINE" title="Donor responses" icon={<Users size={17}/>}/>{networkLoading?<div className="inner-loading"><Loader2 className="spin" size={20}/>Loading responses...</div>:responses.length===0?<div className="empty-response"><Clock3 size={22}/><strong>No responses recorded yet</strong><span>When donors respond, their status will appear here.</span></div>:<div className="response-list">{responses.map((r,i)=>{const s=String(r.status||"PENDING").toUpperCase(),d=r.donor||{},name=d?.user?.name||d?.name||"Donor";return <div className="response-row" key={idOf(r.donor)||i}><div className={`response-status ${s.toLowerCase()}`}><CheckCircle2 size={13}/></div><div><strong>{name}</strong><span>{d?.bloodGroup||"—"} · {s}</span></div><div className="response-time">{r.responseTime!=null?`${r.responseTime} min`:"Awaiting timing"}</div></div>})}</div>}</div><div className="rd-panel ai-note"><div className="ai-note-icon"><Sparkles size={20}/></div><div className="rd-eyebrow">COMMAND INTELLIGENCE</div><h3>Keep the response loop moving.</h3><p>Use compatibility discovery, donor responses and lifecycle controls together to coordinate the case.</p><div className="ai-note-line"><i/>Matching service connected</div><div className="ai-note-line"><i/>Response service connected</div><div className="ai-note-line"><i/>Status control connected</div></div></section>
 <section className="rd-footer-strip"><div><span>01</span><strong>Discover</strong><small>AI donor compatibility</small></div><div><span>02</span><strong>Respond</strong><small>Review donor responses</small></div><div><span>03</span><strong>Coordinate</strong><small>Move the request forward</small></div><div><span>04</span><strong>Close</strong><small>Fulfill the case safely</small></div></section>
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
 </>}</div></section>{toast&&<AnimatePresence><motion.div className="rd-toast" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}}><CheckCircle2 size={16}/>{toast}</motion.div></AnimatePresence>}
      <HospitalFooter />
</main>;
}
function Kpi({icon,label,value,meta}:{icon:React.ReactNode;label:string;value:number;meta:string}){return <motion.div className="rd-kpi" whileHover={{y:-4}}><div className="kpi-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div></motion.div>}
function PanelTitle({eyebrow,title,icon}:{eyebrow:string;title:string;icon:React.ReactNode}){return <div className="panel-title"><div className="panel-title-icon">{icon}</div><div><span>{eyebrow}</span><h2>{title}</h2></div></div>}
function Info({label,value,icon}:{label:string;value:string;icon:React.ReactNode}){return <div className="info"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>}


export default function RequestDetails() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <RequestDetailsContent />
    </Suspense>
  );
}