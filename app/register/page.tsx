"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, ArrowRight, Building2, Check, ChevronDown, ChevronLeft,
  ChevronRight, Eye, EyeOff, FileCheck2, FileText, Hospital, Landmark,
  Loader2, LocateFixed, Lock, Mail, MapPin, Phone, ShieldCheck, Sparkles,
  Upload, User, X
} from "lucide-react";
import BloodCells3D from "@/components/BloodCells3D";
import "./register.css";

type Role = "DONOR" | "HOSPITAL" | "BLOOD_BANK";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const states = ["Rajasthan","Delhi","Haryana","Uttar Pradesh","Madhya Pradesh","Gujarat","Maharashtra","Punjab","Himachal Pradesh","Uttarakhand","Bihar","Other"];
const facilityTypes = ["Multi-Speciality Hospital","General Hospital","Government Hospital","Private Hospital","Medical College Hospital","Clinic / Nursing Home","Other"];
const ownershipTypes = ["Government","Private","Trust / NGO","Public-Private Partnership","Other"];
const bankCategories = ["Government","Private","Charitable / NGO","Hospital Blood Centre","Regional Blood Centre","Other"];

const roles = [
  { value:"DONOR" as Role, title:"Blood Donor", desc:"Donate blood and help save lives", icon:User, status:"MATCHING READY" },
  { value:"HOSPITAL" as Role, title:"Hospital", desc:"Manage emergency blood requests", icon:Hospital, status:"HFR VERIFIED" },
  { value:"BLOOD_BANK" as Role, title:"Blood Bank", desc:"Manage inventory and blood requests", icon:Landmark, status:"LICENCE VERIFIED" },
];

const initialForm = {
  name:"", email:"", phone:"", password:"", confirmPassword:"",
  bloodGroup:"", city:"", state:"", latitude:"", longitude:"",
  address:"", pincode:"", hfrId:"", registrationNumber:"",
  registrationAuthority:"", facilityType:"", ownershipType:"",
  licenseNumber:"", eraktkoshId:"", firstRegistrationDate:"",
  licenseStartDate:"", licenseEndDate:"", category:"",
  contactPersonName:"", contactPersonDesignation:"", website:"",
  numberOfBeds:"", componentFacility:"", apheresisFacility:"",
  helplineNumber:"", donorTypes:"", donationTypes:"", componentTypes:"",
  bagTypes:"", ttiTypes:""
};

function Field({label,value,onChange,placeholder,type="text",required=false,icon:Icon}:any){
  return <label className="form-field">
    <span className="field-label">{label}{required && <b style={{color:"#d12658"}}> *</b>}</span>
    <span className="input-wrap">
      {Icon && <Icon size={16} className="input-icon"/>}
      <input type={type} value={value} placeholder={placeholder} required={required}
        onChange={e=>onChange(e.target.value)}/>
    </span>
  </label>
}

function SelectBox({label,value,options,onChange,placeholder="Select",required=false}:any){
  return <label className="form-field">
    <span className="field-label">{label}{required && <b style={{color:"#d12658"}}> *</b>}</span>
    <span className="input-wrap">
      <select value={value} required={required} onChange={e=>onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((x:string)=><option key={x} value={x}>{x}</option>)}
      </select>
    </span>
  </label>
}

function PasswordField({label,value,onChange,visible,setVisible}:any){
  return <label className="form-field">
    <span className="field-label">{label}<b style={{color:"#d12658"}}> *</b></span>
    <span className="input-wrap">
      <Lock size={16} className="input-icon"/>
      <input type={visible?"text":"password"} value={value} onChange={e=>onChange(e.target.value)} required/>
      <button type="button" className="eye-btn" onClick={()=>setVisible(!visible)}>
        {visible?<EyeOff size={15}/>:<Eye size={15}/>}
      </button>
    </span>
  </label>
}

export default function RegisterPage(){
  const router=useRouter();
  const fileRef=useRef<HTMLInputElement>(null);
  const [role,setRole]=useState<Role>("DONOR");
  const [form,setForm]=useState(initialForm);
  const [file,setFile]=useState<File|null>(null);
  const [step,setStep]=useState(1);
  const [showPass,setShowPass]=useState(false);
  const [showConfirm,setShowConfirm]=useState(false);
  const [locationLoading,setLocationLoading]=useState(false);
  const [locationCaptured,setLocationCaptured]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const totalSteps=role==="DONOR"?2:3;
  const set=(key:keyof typeof form,value:string)=>setForm(p=>({...p,[key]:value}));

  const switchRole=(next:Role)=>{
    setRole(next); setStep(1); setFile(null); setError(""); setLocationCaptured(false);
  };

  const getLocation=()=>{
    setError("");
    if(!navigator.geolocation){setError("Your browser does not support location services.");return}
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      p=>{setForm(v=>({...v,latitude:p.coords.latitude.toFixed(6),longitude:p.coords.longitude.toFixed(6)}));setLocationCaptured(true);setLocationLoading(false)},
      ()=>{setLocationLoading(false);setError("Location permission was not granted. You can continue without GPS.")},
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  };

  const validate=(s:number)=>{
    setError("");
    if(s===1){
      if(!form.name.trim()||!form.email.trim()||!form.phone.trim()){setError("Complete your name, email and phone number.");return false}
      if(!/^[6-9]\d{9}$/.test(form.phone)){setError("Please enter a valid 10-digit Indian mobile number.");return false}
      if(form.password.length<6){setError("Password must be at least 6 characters.");return false}
      if(form.password!==form.confirmPassword){setError("Passwords do not match.");return false}
      if(role==="DONOR"&&!form.bloodGroup){setError("Select your blood group to continue.");return false}
    }
    if(s===2){
      if(!form.city.trim()||!form.state){setError("City and state are required.");return false}
      if(role!=="DONOR"&&(!form.address.trim()||!/^\d{6}$/.test(form.pincode))){setError("Complete the organization address and 6-digit pincode.");return false}
    }
    if(s===3&&role==="HOSPITAL"&&(!form.hfrId.trim()||!form.registrationNumber.trim()||!file)){
      setError("HFR ID, registration number and registration document are required.");return false
    }
    if(s===3&&role==="BLOOD_BANK"&&(!form.licenseNumber.trim()||!file)){
      setError("Licence number and licence document are required.");return false
    }
    return true;
  };

  const next=()=>{if(validate(step))setStep(v=>Math.min(totalSteps,v+1))};

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setError("");
    for(let s=1;s<=totalSteps;s++){if(!validate(s)){setStep(s);return}}
    try{
      setLoading(true);
      let response:Response;
      if(role==="DONOR"){
        const payload:any={
          name:form.name.trim(),email:form.email.trim().toLowerCase(),phone:form.phone.trim(),
          password:form.password,bloodGroup:form.bloodGroup,city:form.city.trim(),state:form.state,
          ...(form.latitude&&form.longitude?{latitude:Number(form.latitude),longitude:Number(form.longitude)}:{})
        };
        response=await fetch(`${API}/api/auth/register/donor`,{
          method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)
        });
      }else{
        const fd=new FormData();
        ["name","email","phone","password"].forEach(k=>fd.append(k,(form as any)[k]));
        fd.append("role",role);
        ["address","city","state","pincode","contactPersonName","contactPersonDesignation","website","numberOfBeds"].forEach(k=>fd.append(k,(form as any)[k]||""));
        if(role==="HOSPITAL"){
          ["hfrId","registrationNumber","registrationAuthority","facilityType","ownershipType"].forEach(k=>fd.append(k,(form as any)[k]||""));
        }else{
          ["licenseNumber","eraktkoshId","category","firstRegistrationDate","licenseStartDate","licenseEndDate","componentFacility","apheresisFacility","helplineNumber","donorTypes","donationTypes","componentTypes","bagTypes","ttiTypes"].forEach(k=>fd.append(k,(form as any)[k]||""));
        }
        fd.append("organizationDocument",file!);
        response=await fetch(`${API}/api/auth/register`,{method:"POST",body:fd});
      }
      const data=await response.json();
      if(!response.ok){setError(Array.isArray(data.errors)?data.errors.join(" "):data.message||"Registration or verification failed.");return}
      const email=form.email.trim().toLowerCase();
      sessionStorage.setItem("bloodlink_verification_email",email);
      sessionStorage.setItem("bloodlink_verification_role",role);
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }catch{
      setError("Unable to connect to BloodLink AI server. Please make sure the backend is running.");
    }finally{setLoading(false)}
  };

  const currentRole=roles.find(x=>x.value===role)!;

  return <main className="register-page">
    <div className="register-bg">
      <div className="register-grid"/>
      <div className="register-orb one"/>
      <div className="register-orb two"/>
      <BloodCells3D/>
    </div>

    <nav className="register-nav">
      <button className="register-brand" type="button" onClick={()=>router.push("/")}>
        <span className="brand-mark">🩸</span>
        <span><strong>BloodLink<em>AI</em></strong><small>EMERGENCY INTELLIGENCE NETWORK</small></span>
      </button>
      <button className="signin-link" type="button" onClick={()=>router.push("/login")}>Already have an account →</button>
    </nav>

    <div className="register-shell">
      <header className="register-heading">
        <span className="eyebrow"><Sparkles size={11}/> Intelligent onboarding</span>
        <h1>Join <em>BloodLink AI</em></h1>
        <p>Create your secure account for the emergency blood network. Every organization is checked before entering the trusted network.</p>
      </header>

      <form className="register-card" onSubmit={submit}>
        <section className="register-section role-section">
          <div className="section-heading">
            <span className="step accent-step"><ShieldCheck size={15}/></span>
            <div><small>01 · ACCESS TYPE</small><h2>Choose your BloodLink role</h2></div>
            <span className="section-note">Select one account type</span>
          </div>
          <div className="role-grid">
            {roles.map(r=>{
              const Icon=r.icon,active=r.value===role;
              return <motion.button key={r.value} type="button" whileTap={{scale:.995}} className={`role-card ${active?"active":""}`} onClick={()=>switchRole(r.value)}>
                {active&&<span className="role-check"><Check size={12}/></span>}
                <span className="role-icon"><Icon size={17}/></span>
                <strong>{r.title}</strong><p>{r.desc}</p><span className="role-status">{r.status}</span>
              </motion.button>
            })}
          </div>
          <div className="progress-row">
            {Array.from({length:totalSteps},(_,i)=>i+1).map(n=><div key={n} style={{display:"contents"}}>
              <span className={`progress-node ${step>=n?"active":""}`}>{step>n?<Check size={12}/>:n}</span>
              {n<totalSteps&&<span className={`progress-line ${step>n?"done":""}`}/>}
            </div>)}
          </div>
          <div className="progress-labels"><span>ACCOUNT</span><span>{totalSteps===3?"ORGANIZATION":"LOCATION"}</span>{totalSteps===3&&<span>VERIFICATION</span>}</div>
        </section>

        {error&&<div className="register-error"><AlertCircle size={14} style={{verticalAlign:"-2px",marginRight:7}}/>{error}</div>}

        <AnimatePresence mode="wait">
          {step===1&&<motion.div key="one" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            <section className="register-section">
              <div className="section-heading"><span className="step accent-step"><User size={15}/></span><div><small>02 · ACCOUNT IDENTITY</small><h2>{role==="DONOR"?"Your personal details":"Authorized account details"}</h2></div></div>
              <div className="form-grid">
                <Field label={role==="DONOR"?"Full Name":"Organization Name"} value={form.name} onChange={(v:string)=>set("name",v)} placeholder={role==="DONOR"?"Enter your full name":"Registered organization name"} required icon={User}/>
                <Field label="Email Address" value={form.email} onChange={(v:string)=>set("email",v)} placeholder="you@example.com" type="email" required icon={Mail}/>
                <Field label="Phone Number" value={form.phone} onChange={(v:string)=>set("phone",v.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile number" type="tel" required icon={Phone}/>
                {role!=="DONOR"&&<Field label="Authorized Contact Person" value={form.contactPersonName} onChange={(v:string)=>set("contactPersonName",v)} placeholder="Full name" required icon={User}/>}
              </div>
            </section>

            <section className="register-section">
              <div className="section-heading"><span className="step"><Lock size={15}/></span><div><small>03 · SECURITY</small><h2>Secure your account</h2></div></div>
              <div className="form-grid">
                <PasswordField label="Password" value={form.password} onChange={(v:string)=>set("password",v)} visible={showPass} setVisible={setShowPass}/>
                <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={(v:string)=>set("confirmPassword",v)} visible={showConfirm} setVisible={setShowConfirm}/>
              </div>
            </section>

            {role==="DONOR"&&<section className="register-section donor-section">
              <div className="section-heading"><span className="step accent-step"><ShieldCheck size={15}/></span><div><small>04 · DONOR PROFILE</small><h2>Matching profile</h2></div></div>
              <div className="form-grid">
                <SelectBox label="Blood Group" value={form.bloodGroup} options={bloodGroups} onChange={(v:string)=>set("bloodGroup",v)} placeholder="Select blood group" required/>
                <Field label="Contact Designation" value={form.contactPersonDesignation} onChange={(v:string)=>set("contactPersonDesignation",v)} placeholder="Optional"/>
              </div>
            </section>}
          </motion.div>}

          {step===2&&<motion.div key="two" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            <section className="register-section">
              <div className="section-heading"><span className="step accent-step"><MapPin size={15}/></span><div><small>02 · LOCATION</small><h2>{role==="DONOR"?"Your location":"Registered facility location"}</h2></div></div>
              {role!=="DONOR"&&<div className="form-grid" style={{marginBottom:15}}><Field label="Complete Address" value={form.address} onChange={(v:string)=>set("address",v)} placeholder="Street, area, landmark" required icon={MapPin}/><div/> </div>}
              <div className="form-grid">
                <Field label="City" value={form.city} onChange={(v:string)=>set("city",v)} placeholder="Jaipur" required/>
                <SelectBox label="State" value={form.state} options={states} onChange={(v:string)=>set("state",v)} placeholder="Select state" required/>
                {role!=="DONOR"&&<Field label="Pincode" value={form.pincode} onChange={(v:string)=>set("pincode",v.replace(/\D/g,"").slice(0,6))} placeholder="302001" required/>}
              </div>
              <div className="location-panel">
                <div className="location-copy"><LocateFixed size={17}/><span>{locationCaptured?"GPS coordinates captured and ready for location-aware matching.":"Capture your current coordinates for smarter emergency matching."}</span></div>
                <button type="button" className="location-btn" onClick={getLocation}>{locationLoading?<Loader2 size={13} className="spin"/>:<LocateFixed size={13}/>} {locationCaptured?"GPS captured":"Capture GPS"}</button>
              </div>
            </section>

            {role!=="DONOR"&&<section className="register-section">
              <div className="section-heading"><span className="step"><Building2 size={15}/></span><div><small>03 · FACILITY PROFILE</small><h2>Official organization information</h2></div></div>
              <div className="form-grid">
                {role==="HOSPITAL"?<>
                  <Field label="Registration Authority" value={form.registrationAuthority} onChange={(v:string)=>set("registrationAuthority",v)} placeholder="ABDM HFR / State authority"/>
                  <SelectBox label="Facility Type" value={form.facilityType} options={facilityTypes} onChange={(v:string)=>set("facilityType",v)} placeholder="Select facility type"/>
                  <SelectBox label="Ownership Type" value={form.ownershipType} options={ownershipTypes} onChange={(v:string)=>set("ownershipType",v)} placeholder="Select ownership"/>
                  <Field label="Number of Beds" value={form.numberOfBeds} onChange={(v:string)=>set("numberOfBeds",v.replace(/\D/g,""))} placeholder="e.g. 250"/>
                  <Field label="Official Website" value={form.website} onChange={(v:string)=>set("website",v)} placeholder="https://example.com"/>
                  <Field label="Contact Designation" value={form.contactPersonDesignation} onChange={(v:string)=>set("contactPersonDesignation",v)} placeholder="Medical Superintendent"/>
                </>:<>
                  <SelectBox label="Blood Bank Category" value={form.category} options={bankCategories} onChange={(v:string)=>set("category",v)} placeholder="Select category"/>
                  <Field label="Official Website" value={form.website} onChange={(v:string)=>set("website",v)} placeholder="https://example.com"/>
                  <Field label="Contact Designation" value={form.contactPersonDesignation} onChange={(v:string)=>set("contactPersonDesignation",v)} placeholder="Authorized Representative" required/>
                  <Field label="Helpline Number" value={form.helplineNumber} onChange={(v:string)=>set("helplineNumber",v)} placeholder="Blood bank helpline"/>
                  <Field label="Number of Beds" value={form.numberOfBeds} onChange={(v:string)=>set("numberOfBeds",v.replace(/\D/g,""))} placeholder="e.g. 100"/>
                </>}
              </div>
            </section>}
          </motion.div>}

          {step===3&&role!=="DONOR"&&<motion.div key="three" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            <section className="register-section">
              <div className="section-heading"><span className="step accent-step"><FileCheck2 size={15}/></span><div><small>03 · INDEPENDENT CHECK</small><h2>{role==="HOSPITAL"?"Hospital verification":"Blood-bank verification"}</h2></div><span className="section-note">Verification-first onboarding</span></div>
              <div className="form-grid">
                {role==="HOSPITAL"?<>
                  <Field label="ABDM HFR ID" value={form.hfrId} onChange={(v:string)=>set("hfrId",v)} placeholder="e.g. IN9912345678" required/>
                  <Field label="Registration Number" value={form.registrationNumber} onChange={(v:string)=>set("registrationNumber",v)} placeholder="Official registration number" required/>
                </>:<>
                  <Field label="Licence Number" value={form.licenseNumber} onChange={(v:string)=>set("licenseNumber",v)} placeholder="Official blood-bank licence" required/>
                  <Field label="e-RaktKosh ID" value={form.eraktkoshId} onChange={(v:string)=>set("eraktkoshId",v)} placeholder="If already assigned"/>
                  <Field label="First Registration Date" value={form.firstRegistrationDate} onChange={(v:string)=>set("firstRegistrationDate",v)} type="date"/>
                  <Field label="Licence From" value={form.licenseStartDate} onChange={(v:string)=>set("licenseStartDate",v)} type="date"/>
                  <Field label="Licence To" value={form.licenseEndDate} onChange={(v:string)=>set("licenseEndDate",v)} type="date"/>
                </>}
              </div>
            </section>

            {role==="BLOOD_BANK"&&<section className="register-section">
              <div className="section-heading"><span className="step"><Landmark size={15}/></span><div><small>04 · BLOOD CENTRE PROFILE</small><h2>Advanced capabilities</h2></div></div>
              <div className="form-grid">
                <Field label="Donor Types" value={form.donorTypes} onChange={(v:string)=>set("donorTypes",v)} placeholder="Voluntary, replacement..."/>
                <Field label="Donation Types" value={form.donationTypes} onChange={(v:string)=>set("donationTypes",v)} placeholder="Whole blood, apheresis..."/>
                <Field label="Component Types" value={form.componentTypes} onChange={(v:string)=>set("componentTypes",v)} placeholder="PRBC, FFP, platelets..."/>
                <Field label="Bag Types" value={form.bagTypes} onChange={(v:string)=>set("bagTypes",v)} placeholder="Single, double, triple..."/>
                <Field label="TTI Types" value={form.ttiTypes} onChange={(v:string)=>set("ttiTypes",v)} placeholder="HBsAg, HCV, HIV..."/>
                <Field label="Component Facility" value={form.componentFacility} onChange={(v:string)=>set("componentFacility",v)} placeholder="Available / Not available"/>
                <Field label="Apheresis Facility" value={form.apheresisFacility} onChange={(v:string)=>set("apheresisFacility",v)} placeholder="Available / Not available"/>
              </div>
            </section>}

            <section className="register-section">
              <div className="verification-box">
                <div className="verification-head">
                  <span className="verification-icon"><FileText size={17}/></span>
                  <div><h3>{role==="HOSPITAL"?"Hospital registration certificate":"Blood-bank licence document"}</h3><p>Upload the official document. BloodLink fingerprints the file and checks it against the configured trusted verification source.</p></div>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e=>setFile(e.target.files?.[0]||null)}/>
                {!file?<button type="button" className="upload-box" onClick={()=>fileRef.current?.click()}>
                  <span><span className="upload-icon"><Upload size={17}/></span><b style={{display:"block",fontSize:10}}>Upload verification document</b><small style={{display:"block",marginTop:4,color:"#a38d96",fontSize:8}}>PDF, JPG or PNG · Clear official copy</small></span>
                </button>:<div className="file-ready">
                  <FileCheck2 size={18} style={{color:"#188052",flex:"0 0 auto"}}/>
                  <div style={{minWidth:0,flex:1}}><div className="file-name">{file.name}</div><div className="file-meta">{(file.size/1024/1024).toFixed(2)} MB · Ready for verification</div></div>
                  <button type="button" onClick={()=>setFile(null)} style={{border:0,background:"transparent",color:"#8d7780",cursor:"pointer"}}><X size={15}/></button>
                </div>}
              </div>
            </section>
          </motion.div>}
        </AnimatePresence>

        <div className="security-strip">
          <div className="security-item"><ShieldCheck size={15}/><span><b>Verification-first</b><br/>Organizations are checked before approval.</span></div>
          <div className="security-item"><Lock size={15}/><span><b>Secure onboarding</b><br/>Credentials and documents travel over your API.</span></div>
          <div className="security-item"><FileCheck2 size={15}/><span><b>Audit-ready</b><br/>Verification status is stored with the profile.</span></div>
        </div>

        <div className="submit-row">
          <div className="privacy-note"><ShieldCheck size={14}/><span>Your information is submitted securely to the BloodLink AI backend. Organization approval depends on independent verification.</span></div>
          <div className="step-actions">
            {step>1&&<button type="button" className="back-step-btn" onClick={()=>{setError("");setStep(v=>Math.max(1,v-1))}}><ChevronLeft size={15}/> Back</button>}
            {step<totalSteps?
              <button type="button" className="create-btn" onClick={next}>Continue <ChevronRight size={15}/></button>:
              <button type="submit" className="create-btn" disabled={loading}>{loading?<><Loader2 size={15} className="spin"/> Verifying...</>:<>Create verified account <ArrowRight size={15}/></>}</button>}
          </div>
        </div>
        <div className="login-footer">Already registered? <button type="button" onClick={()=>router.push("/login")}>Back to login →</button></div>
      </form>
    </div>

    <footer className="register-footer">
      <span>© 2026 BloodLink AI</span>
      <span><i className="live-dot"/> Network operational</span>
      <span>Emergency intelligence platform</span>
    </footer>
  </main>
}
