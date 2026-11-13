"use client";

import { HospitalNavbar, HospitalFooter, HospitalChromeStyles } from "../components/HospitalChrome";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck2,
  HeartPulse,
  LockKeyhole,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
} from "lucide-react";
import "./profile.css";

import { getToken, clearAuth } from "../../../lib/api";
import NotificationBell from "../../../components/notifications/NotificationBell";

type Profile = {
  hospitalName: string;
  registrationNumber: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  adminName: string;
  designation: string;
  latitude: string;
  longitude: string;
};

const emptyProfile: Profile = {
  hospitalName: "",
  registrationNumber: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  adminName: "",
  designation: "",
  latitude: "",
  longitude: "",
};

export default function HospitalProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [saved, setSaved] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [userName, setUserName] = useState("Hospital");
  const [locationStatus, setLocationStatus] = useState("");
  const [documentStatus, setDocumentStatus] = useState("");
  const documentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const raw = localStorage.getItem("bloodlink_user");
      const user = raw ? JSON.parse(raw) : null;

      if (user?.role && String(user.role).toUpperCase() !== "HOSPITAL") {
        clearAuth();
        router.replace("/login");
        return;
      }

      const name = user?.name || user?.hospitalName || "Hospital";
      setUserName(name);

      const savedDoc = localStorage.getItem("bloodlink_hospital_verification_document");
      if (savedDoc) setDocumentName(savedDoc);
      const savedProfile = localStorage.getItem("bloodlink_hospital_profile");
      if (savedProfile) {
        setProfile({ ...emptyProfile, ...JSON.parse(savedProfile) });
      } else {
        setProfile({
          ...emptyProfile,
          hospitalName: user?.hospitalName || user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
          adminName: user?.name || "",
        });
      }
    } catch {
      setUserName("Hospital");
    }
  }, [router]);

  const update = (key: keyof Profile, value: string) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const saveProfile = () => {
    localStorage.setItem("bloodlink_hospital_profile", JSON.stringify(profile));
    setSaved(true);
  };

  const useCurrentLocation = () => {
    setLocationStatus("");
    if (!("geolocation" in navigator)) {
      setLocationStatus("This browser does not support GPS. Enter the address manually.");
      return;
    }
    setLocationStatus("Requesting GPS permission…");
    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      setProfile((current) => ({
        ...current,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      }));
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { headers: { Accept: "application/json" } }
        );
        if (response.ok) {
          const result = await response.json();
          const a = result?.address || {};
          setProfile((current) => ({
            ...current,
            address: current.address || [a.road, a.suburb || a.neighbourhood, a.city_district].filter(Boolean).join(", "),
            city: [a.city, a.town, a.village, a.municipality].find(Boolean) || current.city,
            state: a.state || current.state,
            pincode: a.postcode || current.pincode,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
          }));
        }
      } catch {
        // GPS coordinates remain available even if reverse geocoding is unavailable.
      }
      setLocationStatus(`GPS captured: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. Click Save profile to keep it.`);
      setSaved(false);
    }, (error) => {
      const message = error.code === 1
        ? "Location permission denied. Allow location access for localhost in your browser settings."
        : error.code === 2
        ? "GPS location unavailable. Turn on device location and try again."
        : "GPS timed out. Move near a window or try again.";
      setLocationStatus(message);
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  };

  const handleDocument = (file?: File) => {
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) {
      setDocumentStatus("Choose a PDF, JPG or PNG file up to 10 MB.");
      return;
    }
    setDocumentName(file.name);
    localStorage.setItem("bloodlink_hospital_verification_document", file.name);
    setDocumentStatus("File selected in this browser. It is not uploaded to the server because this frontend has no document-upload API.");
  };

  return (
    <main className="hospital-profile">
      <HospitalChromeStyles />
      <HospitalNavbar />

      <aside className="profile-sidebar hospital-shell-sidebar">
        <div className="profile-brand" onClick={() => router.push("/hospital")}>
          <div className="profile-brand-mark"><HeartPulse size={23} /></div>
          <div>
            <strong>BloodLink</strong>
            <span>Hospital OS</span>
          </div>
        </div>

        <div className="side-label">ACCOUNT</div>

        <nav>
          <button onClick={() => router.push("/hospital")}>Dashboard</button>
          <button onClick={() => router.push("/hospital/emergency-command")}>Emergency Center</button>
          <button onClick={() => router.push("/hospital/requests")}>My Requests</button>
          <button onClick={() => router.push("/hospital/donor-network")}>Donor Network</button>
          <button onClick={() => router.push("/hospital/donor-network")}>AI Match Center</button>
          <button onClick={() => router.push("/hospital/inventory")}>Blood Inventory</button>
          <button onClick={() => router.push("/hospital/analytics")}>Analytics</button>
          <button onClick={() => router.push("/hospital/responses")}>Responses</button>
          <button onClick={() => router.push("/hospital/notifications")}>Notifications</button>
          <button className="active">Profile & Verification</button>
          <button onClick={() => router.push("/hospital/settings")}>Settings</button>
        </nav>

        <div className="side-footer">
          <div className="secure-chip"><ShieldCheck size={14} /> SECURE WORKSPACE</div>
          <p>Keep hospital information accurate for reliable emergency coordination.</p>
        </div>
      </aside>

      <section className="profile-main">
        <header className="profile-topbar">
          <div>
            <span className="eyebrow">HOSPITAL IDENTITY</span>
            <h1>Profile & <em>Verification</em></h1>
            <p>Manage your hospital identity and verification information.</p>
          </div>
          <div className="top-actions">
            <NotificationBell />
            <div className="user-pill">
              <div>{userName.slice(0, 1).toUpperCase()}</div>
              <span>{userName}</span>
            </div>
          </div>
        </header>

        <section className="profile-hero">
          <div className="hero-copy">
            <div className="hero-badge"><Sparkles size={14} /> TRUST & IDENTITY LAYER</div>
            <h2>Your hospital.<br /><span>Your verified identity.</span></h2>
            <p>
              Accurate hospital details help BloodLink keep emergency requests,
              donor coordination and operational records connected to the right institution.
            </p>

            <div className="verification-row">
              <div className="verification-icon"><ShieldCheck size={23} /></div>
              <div>
                <strong>Verification profile</strong>
                <span>Information saved locally until a backend verification workflow is enabled.</span>
              </div>
            </div>
          </div>

          <div className="hero-orb">
            <div className="orb-ring ring-one" />
            <div className="orb-ring ring-two" />
            <div className="orb-ring ring-three" />
            <div className="orb-core">
              <Building2 size={31} />
              <strong>HOSPITAL</strong>
              <span>IDENTITY</span>
            </div>
          </div>
        </section>

        <div className="content-grid">
          <section className="form-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">01 · INSTITUTION</span>
                <h3>Hospital information</h3>
              </div>
              <div className="verified-mini"><CheckCircle2 size={14} /> PROFILE</div>
            </div>

            <div className="field-grid">
              <Field label="Hospital name" icon={<Building2 size={15} />} value={profile.hospitalName} onChange={(v) => update("hospitalName", v)} placeholder="e.g. Scripts Hospital" />
              <Field label="Registration number" icon={<FileCheck2 size={15} />} value={profile.registrationNumber} onChange={(v) => update("registrationNumber", v)} placeholder="Hospital registration ID" />
              <Field label="Official email" icon={<Mail size={15} />} value={profile.email} onChange={(v) => update("email", v)} placeholder="hospital@example.com" type="email" />
              <Field label="Contact number" icon={<Phone size={15} />} value={profile.phone} onChange={(v) => update("phone", v)} placeholder="+91 XXXXX XXXXX" />
            </div>
          </section>

          <section className="status-card">
            <div className="status-orb"><ShieldCheck size={28} /></div>
            <span className="eyebrow">VERIFICATION STATUS</span>
            <h3>Profile ready</h3>
            <p>
              Your profile information can be prepared here. Actual document
              verification should be connected to a hospital verification API when available.
            </p>
            <div className="status-line"><span /> Identity information</div>
            <div className="status-line"><span /> Contact information</div>
            <div className="status-line pending"><span /> Document verification</div>
          </section>
        </div>

        <section className="form-card location-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">02 · LOCATION</span>
              <h3>Hospital location</h3>
            </div>
            <MapPin size={20} className="heading-icon" />
          </div>

          <div className="field-grid location-grid">
            <Field label="Address" icon={<MapPin size={15} />} value={profile.address} onChange={(v) => update("address", v)} placeholder="Street / area / landmark" wide />
            <Field label="City" icon={<MapPin size={15} />} value={profile.city} onChange={(v) => update("city", v)} placeholder="Jaipur" />
            <Field label="State" icon={<MapPin size={15} />} value={profile.state} onChange={(v) => update("state", v)} placeholder="Rajasthan" />
            <Field label="PIN code" icon={<MapPin size={15} />} value={profile.pincode} onChange={(v) => update("pincode", v)} placeholder="3020XX" />
          </div>
          <div className="profile-location-tools">
            <button type="button" className="location-action" onClick={useCurrentLocation}>
              <Navigation size={16} /> Use my current GPS location
            </button>
            {profile.latitude && profile.longitude && (
              <span className="location-coordinates">Saved coordinates: {profile.latitude}, {profile.longitude}</span>
            )}
            {locationStatus && <p role="status" className="profile-feedback">{locationStatus}</p>}
          </div>
        </section>

        <div className="bottom-grid">
          <section className="form-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">03 · ADMIN</span>
                <h3>Authorized contact</h3>
              </div>
              <UserRound size={20} className="heading-icon" />
            </div>

            <div className="field-grid">
              <Field label="Administrator name" icon={<UserRound size={15} />} value={profile.adminName} onChange={(v) => update("adminName", v)} placeholder="Authorized person" />
              <Field label="Designation" icon={<UserRound size={15} />} value={profile.designation} onChange={(v) => update("designation", v)} placeholder="Hospital Administrator" />
            </div>
          </section>

          <section className="document-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">04 · DOCUMENTS</span>
                <h3>Verification document</h3>
              </div>
              <LockKeyhole size={19} />
            </div>

            <label className="upload-box">
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => handleDocument(e.target.files?.[0])}
              />
              <UploadCloud size={25} />
              <strong>{documentName || "Choose registration document"}</strong>
              <span>PDF, JPG or PNG · up to 10 MB</span>
            </label>
            {documentStatus && <p role="status" className="profile-feedback">{documentStatus}</p>}
            {documentName && (
              <button type="button" className="location-action" onClick={() => documentInputRef.current?.click()}>
                <UploadCloud size={15} /> Choose / replace document
              </button>
            )}

            <div className="document-note">
              <ShieldCheck size={14} />
              Selected file name is saved locally. Server upload requires a backend endpoint.
            </div>
          </section>
        </div>

        <div className="save-bar">
          <div>
            {saved ? (
              <span className="saved"><CheckCircle2 size={16} /> Profile saved</span>
            ) : (
              <span><LockKeyhole size={15} /> Changes stay on this hospital session</span>
            )}
          </div>
          <button onClick={saveProfile}>
            Save profile <ArrowRight size={17} />
          </button>
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
    
      <HospitalFooter />
</main>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  wide = false,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <div className="input-wrap">
        {icon}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    </label>
  );
}
