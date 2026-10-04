"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowRight, CheckCircle2, Droplets, HeartPulse, LockKeyhole,
  MapPin, Radio, ShieldCheck, Sparkles, UsersRound, Zap,
} from "lucide-react";
import { API_BASE_URL, authHeaders, clearAuth, getToken } from "../../../lib/api";

type Donor = {
  bloodGroup?: string;
  isAvailable?: boolean;
  emergencyAvailable?: boolean;
  totalDonations?: number;
  location?: { city?: string; state?: string };
  user?: { name?: string };
};

const css = `
.av-page{--red:#c91f4e;--ink:#28171e;--muted:#8c737c;--line:#eadde2;min-height:100vh;overflow:hidden;background:radial-gradient(circle at 72% 12%,rgba(246,111,145,.18),transparent 28%),linear-gradient(180deg,#fffafb 0%,#fff5f8 48%,#fffafb 100%);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.av-page *{box-sizing:border-box}.av-page button{font:inherit}.av-wrap{width:min(1440px,calc(100% - 48px));margin:auto;padding:42px 0 75px}.av-crumb{display:flex;align-items:center;justify-content:space-between;margin-bottom:25px}.av-kicker{display:flex;align-items:center;gap:8px;color:#a15f70;font-size:8px;font-weight:900;letter-spacing:.17em}.av-kicker i{width:7px;height:7px;border-radius:50%;background:#21ad7a;box-shadow:0 0 0 5px #21ad7a12}.av-secure{display:flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid #d9eee4;background:#f3fbf7;color:#378166;border-radius:999px;font-size:8px;font-weight:850}
.av-hero{position:relative;min-height:590px;display:grid;grid-template-columns:1.05fr .95fr;gap:25px;align-items:stretch;padding:42px;border:1px solid rgba(226,197,207,.72);border-radius:34px;background:linear-gradient(120deg,rgba(255,255,255,.95),rgba(255,244,248,.92));box-shadow:0 30px 90px rgba(93,23,45,.10);overflow:hidden}.av-hero:before{content:"";position:absolute;width:600px;height:600px;right:-120px;top:-190px;border-radius:50%;background:radial-gradient(circle,rgba(239,65,106,.22),transparent 68%);filter:blur(8px)}.av-copy{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;max-width:680px}.av-eyebrow{display:inline-flex;align-items:center;gap:7px;width:max-content;padding:9px 12px;border-radius:999px;border:1px solid #f1d6de;background:#fff0f4;color:#bd2850;font-size:8px;font-weight:950;letter-spacing:.14em}.av-copy h1{font-size:clamp(54px,6vw,88px);line-height:.88;letter-spacing:-.065em;margin:21px 0 22px;font-weight:950}.av-copy h1 span{display:block;color:#c31d4c;font-style:italic}.av-lead{max-width:610px;margin:0;color:#7f6971;font-size:14px;line-height:1.75}.av-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}.av-primary,.av-secondary{height:48px;border-radius:14px;padding:0 17px;display:flex;align-items:center;gap:9px;cursor:pointer;font-size:10px;font-weight:900}.av-primary{border:0;color:#fff;background:linear-gradient(135deg,#9e173d,#d52b58);box-shadow:0 15px 35px #c61f4e2c}.av-secondary{border:1px solid var(--line);background:#fff;color:#705b64}.av-primary:disabled{opacity:.55;cursor:wait}.av-proof{display:flex;gap:16px;flex-wrap:wrap;margin-top:24px;color:#7b6870;font-size:8px;font-weight:800}.av-proof span{display:flex;align-items:center;gap:6px}.av-proof svg{color:#bd2a4e}
.av-visual{position:relative;min-height:500px;display:grid;place-items:center;z-index:2}.av-halo{position:absolute;width:430px;height:430px;border-radius:50%;background:radial-gradient(circle,rgba(225,34,81,.28),rgba(225,34,81,0) 68%);filter:blur(12px)}.av-orbit{position:absolute;border:1px solid rgba(201,31,78,.22);border-radius:50%;transform:rotateX(67deg) rotateZ(-20deg);animation:avSpin 12s linear infinite}.av-o1{width:470px;height:190px}.av-o2{width:390px;height:155px;transform:rotateX(67deg) rotateZ(58deg);animation-direction:reverse;animation-duration:9s}.av-o3{width:510px;height:220px;transform:rotateY(70deg) rotateZ(8deg);animation-duration:15s;opacity:.65}@keyframes avSpin{to{transform:rotateX(67deg) rotateZ(340deg)}}
.av-core{position:relative;width:285px;height:285px;border-radius:50%;background:radial-gradient(circle at 30% 23%,#ff9ab1 0 3%,#ed5475 12%,#c71d4a 40%,#650b28 74%,#270710 100%);box-shadow:inset -32px -38px 70px #12030899,inset 17px 15px 35px #ffc1cf33,0 35px 100px #c91f4e4d;animation:avFloat 5s ease-in-out infinite}.av-core:before{content:"";position:absolute;left:47px;top:38px;width:78px;height:78px;border-radius:50%;background:radial-gradient(circle,#fff9,transparent 70%);filter:blur(7px)}.av-core:after{content:"";position:absolute;inset:18px;border:1px solid #ffffff20;border-radius:50%}.av-core-inner{position:absolute;inset:0;display:grid;place-items:center;text-align:center;color:white}.av-core-inner strong{display:block;margin-top:9px;font-size:44px;letter-spacing:-.05em}.av-core-inner small{display:block;margin-top:4px;color:#ffc3d0;font-size:7px;font-weight:950;letter-spacing:.18em}@keyframes avFloat{50%{transform:translateY(-12px) rotateY(7deg)}}.av-live{position:absolute;left:50%;bottom:10%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:9px 12px;border-radius:999px;background:#28141d;color:#fff;font-size:7px;font-weight:950;letter-spacing:.1em;box-shadow:0 15px 30px #39101d30}.av-live i{width:6px;height:6px;border-radius:50%;background:#39d895;box-shadow:0 0 0 4px #39d89518}.av-float{position:absolute;padding:11px 13px;border:1px solid #ffffffc7;background:#fffffff0;box-shadow:0 16px 35px #5e20300e;border-radius:14px;display:flex;align-items:center;gap:8px;min-width:115px}.av-float small{display:block;color:#a18991;font-size:6px;font-weight:950;letter-spacing:.12em}.av-float b{display:block;margin-top:3px;font-size:10px}.av-float svg{color:#c6204d}.av-float.blood{top:18%;left:3%}.av-float.location{top:28%;right:0}.av-float.status{bottom:18%;right:4%}.av-status-dot{width:7px;height:7px;border-radius:50%;background:#aaa}.av-status-dot.live{background:#27b67e;box-shadow:0 0 0 4px #27b67e16}
.av-dashboard{display:grid;grid-template-columns:1.2fr .8fr;gap:18px;margin-top:18px}.av-panel{border:1px solid var(--line);border-radius:25px;background:#ffffffd9;box-shadow:0 20px 55px #5d20320c;padding:26px}.av-panel-label{color:#bd3153;font-size:8px;font-weight:950;letter-spacing:.17em}.av-panel h2{font-size:25px;letter-spacing:-.04em;margin:7px 0 6px}.av-panel-desc{color:#927e86;font-size:10px;line-height:1.65;margin:0}.av-control{margin-top:20px;padding:17px;border:1px solid #eee0e4;border-radius:18px;display:grid;grid-template-columns:50px 1fr auto;gap:13px;align-items:center}.av-control-icon{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;background:#fff0f4;color:#c4214e}.av-control-icon.live{background:#ecfaf4;color:#28a97a}.av-control small{display:block;color:#9b858d;font-size:7px;font-weight:900;letter-spacing:.13em}.av-control strong{display:block;margin-top:5px;font-size:14px}.av-control p{margin:4px 0 0;color:#99858c;font-size:8px}.av-toggle{width:54px;height:31px;border:0;border-radius:99px;background:#d8d1d4;padding:4px;cursor:pointer}.av-toggle span{display:block;width:23px;height:23px;border-radius:50%;background:#fff;transition:.2s}.av-toggle.on{background:#bd204b}.av-toggle.on span{transform:translateX(23px)}.av-toggle:disabled{opacity:.5}.av-emergency{margin-top:12px;padding:16px;border:1px solid #f0e1e4;border-radius:18px;display:flex;align-items:center;gap:12px}.av-emergency-icon{width:43px;height:43px;border-radius:13px;background:#fff5e8;color:#d99837;display:grid;place-items:center}.av-emergency-copy{flex:1}.av-emergency-copy strong{font-size:11px}.av-emergency-copy p{margin:4px 0 0;color:#958189;font-size:8px;line-height:1.5}.av-lock{margin-top:14px;padding:12px;border-radius:13px;background:#f3fbf7;border:1px solid #dcefe6;color:#668579;display:flex;gap:8px;font-size:8px;line-height:1.5}.av-lock svg{color:#32a77d;flex:none}
.av-side-grid{display:grid;gap:12px}.av-stat{padding:15px;border:1px solid var(--line);border-radius:18px;background:#fff;display:flex;gap:11px;align-items:center}.av-stat-icon{width:39px;height:39px;border-radius:12px;background:#fff0f4;color:#bd244c;display:grid;place-items:center}.av-stat small{display:block;color:#9b878e;font-size:7px;font-weight:850}.av-stat b{display:block;margin-top:3px;font-size:11px;max-width:270px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.av-side-note{padding:18px;border-radius:19px;background:linear-gradient(135deg,#2e111c,#16080e);color:#fff;box-shadow:0 18px 45px #42102322}.av-side-note small{color:#dc91a5;font-size:7px;font-weight:950;letter-spacing:.16em}.av-side-note h3{margin:8px 0 6px;font-size:17px}.av-side-note p{margin:0;color:#c4a8b1;font-size:8px;line-height:1.7}.av-side-note button{margin-top:14px;border:1px solid #ffffff18;background:#ffffff0d;color:#fff;border-radius:10px;padding:9px 11px;font-size:8px;font-weight:850;cursor:pointer;display:flex;align-items:center;gap:7px}
.av-toast{position:fixed;right:22px;bottom:22px;z-index:120;padding:12px 15px;border-radius:13px;background:#24141b;color:#fff;box-shadow:0 18px 50px #0003;font-size:9px;font-weight:850}.av-error{margin-top:14px;padding:11px 13px;border:1px solid #e75b7533;background:#fff0f3;color:#b92349;border-radius:12px;font-size:9px}.av-loading{min-height:70vh;display:grid;place-items:center;text-align:center}.av-loading-box{padding:30px 34px;border:1px solid var(--line);border-radius:24px;background:#ffffffdd;box-shadow:0 25px 70px #5b1c300f}.av-loading-icon{width:52px;height:52px;margin:auto;display:grid;place-items:center;border-radius:16px;background:#fff0f4;color:#c51f4d}.av-loading-box strong{display:block;margin-top:13px;font-size:13px}.av-loading-box span{display:block;margin-top:6px;color:#9a858c;font-size:9px}
@media(max-width:1000px){.av-hero{grid-template-columns:1fr;padding:30px}.av-visual{min-height:430px}.av-dashboard{grid-template-columns:1fr}.av-wrap{width:min(100% - 28px,760px)}}
@media(max-width:620px){.av-wrap{width:calc(100% - 18px);padding-top:24px}.av-crumb{margin-bottom:15px}.av-secure{display:none}.av-hero{padding:22px;border-radius:24px}.av-copy h1{font-size:49px}.av-lead{font-size:12px}.av-visual{min-height:370px}.av-core{width:215px;height:215px}.av-core-inner strong{font-size:35px}.av-o1{width:350px}.av-o2{width:290px}.av-o3{width:380px}.av-float{transform:scale(.82)}.av-float.blood{left:-8%;top:14%}.av-float.location{right:-8%;top:25%}.av-float.status{right:-4%;bottom:12%}.av-actions{display:grid}.av-primary,.av-secondary{width:100%;justify-content:center}.av-control{grid-template-columns:44px 1fr auto;padding:12px}.av-control-icon{width:44px;height:44px}.av-panel{padding:20px;border-radius:21px}}
`;

export default function DonorAvailabilityPage(){
  const router=useRouter();
  const [donor,setDonor]=useState<Donor|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [toast,setToast]=useState("");

  useEffect(()=>{
    const load=async()=>{
      if(!getToken()){clearAuth();window.location.href="/login";return;}
      try{
        const res=await fetch(`${API_BASE_URL}/api/donors/profile`,{headers:authHeaders(),cache:"no-store"});
        if(res.status===401||res.status===403){clearAuth();window.location.href="/login";return;}
        const data=await res.json();
        if(!res.ok)throw new Error(data.message||"Unable to load availability.");
        setDonor(data.donor);
      }catch(err){setError(err instanceof Error?err.message:"Unable to load availability.");}
      finally{setLoading(false);}
    };
    load();
  },[]);

  const notify=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2500)};
  const update=async(isAvailable:boolean,emergencyAvailable:boolean)=>{
    if(!donor)return;
    setSaving(true);setError("");
    try{
      const res=await fetch(`${API_BASE_URL}/api/donors/availability`,{method:"PUT",headers:authHeaders({"Content-Type":"application/json"}),body:JSON.stringify({isAvailable,emergencyAvailable})});
      if(res.status===401||res.status===403){clearAuth();window.location.href="/login";return;}
      const data=await res.json();
      if(!res.ok)throw new Error(data.message||"Unable to update availability.");
      setDonor(data.donor);notify(isAvailable?"You are now available for donor matching.":"Availability paused.");
    }catch(err){setError(err instanceof Error?err.message:"Unable to update availability.");}
    finally{setSaving(false);}
  };

  const name=donor?.user?.name||"BloodLink Donor";
  const location=[donor?.location?.city,donor?.location?.state].filter(Boolean).join(", ")||"Location not provided";
  const available=Boolean(donor?.isAvailable);
  const emergency=Boolean(donor?.emergencyAvailable);
  const initials=useMemo(()=>name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"BL",[name]);
  void initials;

  if(loading)return <><style dangerouslySetInnerHTML={{__html:css}}/><main className="av-page"><div className="av-wrap av-loading"><div className="av-loading-box"><div className="av-loading-icon"><HeartPulse size={24}/></div><strong>Preparing your availability center</strong><span>Checking your secure donor status…</span></div></div></main></>;

  return <>
    <style dangerouslySetInnerHTML={{__html:css}}/>
    <main className="av-page">
      <div className="av-wrap">
        <div className="av-crumb"><div className="av-kicker"><i/> DONOR AVAILABILITY · LIVE CONTROL</div><div className="av-secure"><ShieldCheck size={13}/> Secure donor state</div></div>
        <section className="av-hero">
          <div className="av-copy">
            <span className="av-eyebrow"><Radio size={12}/> DONOR AVAILABILITY CONTROL</span>
            <h1>Be ready.<span>When it matters.</span></h1>
            <p className="av-lead">Your availability tells BloodLink when your donor profile can be surfaced for compatible requests. Turn matching on when you are ready, pause it whenever you need.</p>
            <div className="av-actions"><button className="av-primary" disabled={saving} onClick={()=>update(!available,available?false:emergency)}><Activity size={16}/>{saving?"Updating…":available?"Pause availability":"Become available"}<ArrowRight size={15}/></button><button className="av-secondary" onClick={()=>router.push("/donor/ai-matching")}><Sparkles size={15}/> Open AI matching</button></div>
            <div className="av-proof"><span><CheckCircle2 size={13}/> You control the signal</span><span><ShieldCheck size={13}/> Secure backend sync</span><span><MapPin size={13}/> Location aware</span></div>
          </div>
          <div className="av-visual">
            <div className="av-halo"/><div className="av-orbit av-o1"/><div className="av-orbit av-o2"/><div className="av-orbit av-o3"/>
            <div className="av-core"><div className="av-core-inner"><div><HeartPulse size={39}/><strong>{donor?.bloodGroup||"—"}</strong><small>DONOR CORE · {available?"DISCOVERABLE":"PAUSED"}</small></div></div></div>
            <div className="av-float blood"><Droplets size={15}/><span><small>BLOOD GROUP</small><b>{donor?.bloodGroup||"Not set"}</b></span></div>
            <div className="av-float location"><MapPin size={15}/><span><small>YOUR AREA</small><b>{location.split(",")[0]}</b></span></div>
            <div className="av-float status"><span className={`av-status-dot ${available?"live":""}`}/><span><small>DISCOVERABILITY</small><b>{available?"VISIBLE":"HIDDEN"}</b></span></div>
            <div className="av-live"><i/>{available?"LIVE MATCH ENGINE":"MATCHING PAUSED"}</div>
          </div>
        </section>
        {error&&<div className="av-error">{error}</div>}
        <section className="av-dashboard">
          <article className="av-panel">
            <div className="av-panel-label">CONTROL CENTER</div><h2>Manage your donor presence</h2><p className="av-panel-desc">One status controls whether BloodLink can discover you for compatible blood requests. Emergency availability only works while your main status is live.</p>
            <div className="av-control"><div className={`av-control-icon ${available?"live":""}`}>{available?<CheckCircle2 size={25}/>:<Radio size={25}/>}</div><div><small>CURRENT STATUS</small><strong>{available?"Available for matching":"Matching is paused"}</strong><p>{available?"Compatible requests can reach your donor profile.":"Your profile is hidden from new donor matching."}</p></div><button className={`av-toggle ${available?"on":""}`} disabled={saving} onClick={()=>update(!available,available?false:emergency)} aria-label="Toggle availability"><span/></button></div>
            <div className="av-emergency"><div className="av-emergency-icon"><Zap size={20}/></div><div className="av-emergency-copy"><strong>Emergency priority</strong><p>{emergency?"You are currently open to urgent emergency matching.":"Enable emergency matching when you can respond to urgent requests."}</p></div><button className={`av-toggle ${emergency&&available?"on":""}`} disabled={saving||!available} onClick={()=>update(true,!emergency)} aria-label="Toggle emergency availability"><span/></button></div>
            <div className="av-lock"><LockKeyhole size={13}/><span>Turning your main availability off automatically turns emergency availability off. Your donor state is saved through the authenticated backend.</span></div>
          </article>
          <aside className="av-side-grid">
            <div className="av-stat"><div className="av-stat-icon"><Droplets size={17}/></div><div><small>BLOOD GROUP</small><b>{donor?.bloodGroup||"Not set"}</b></div></div>
            <div className="av-stat"><div className="av-stat-icon"><MapPin size={17}/></div><div><small>CURRENT LOCATION</small><b>{location}</b></div></div>
            <div className="av-stat"><div className="av-stat-icon"><UsersRound size={17}/></div><div><small>TOTAL DONATIONS</small><b>{donor?.totalDonations??0} completed donations</b></div></div>
            <div className="av-side-note"><small>WHY IT MATTERS</small><h3>Your signal helps the network move faster.</h3><p>Keeping your availability accurate helps BloodLink reduce wasted matches and surface compatible donors when every minute matters.</p><button onClick={()=>router.push("/donor/requests")}>View emergency requests <ArrowRight size={13}/></button></div>
          </aside>
        </section>
      </div>
      {toast&&<div className="av-toast"><CheckCircle2 size={13}/> {toast}</div>}
    </main>
  </>;
}
