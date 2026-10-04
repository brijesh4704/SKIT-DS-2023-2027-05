"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Edit3,
  HeartPulse,
  Hospital,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, authHeaders, clearAuth, getToken } from "../../../lib/api";

type Donor = {
  _id?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  gender?: string;
  isAvailable?: boolean;
  emergencyAvailable?: boolean;
  totalDonations?: number;
  lastDonationDate?: string;
  location?: {
    city?: string;
    state?: string;
    pincode?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  user?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
};

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const genders = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

// City-centre coordinates are deterministic fallbacks for common Rajasthan cities.
// They are approximate city centres, not exact hospital/donor addresses.
const RAJASTHAN_CITY_COORDINATES: Record<
  string,
  { latitude: number; longitude: number }
> = {
  "bharatpur": { latitude: 27.2152, longitude: 77.5030 },
  "jaipur": { latitude: 26.9124, longitude: 75.7873 },
  "ajmer": { latitude: 26.4499, longitude: 74.6399 },
  "jodhpur": { latitude: 26.2389, longitude: 73.0243 },
  "udaipur": { latitude: 24.5854, longitude: 73.7125 },
  "kota": { latitude: 25.2138, longitude: 75.8648 },
  "bikaner": { latitude: 28.0229, longitude: 73.3119 },
  "alwar": { latitude: 27.5530, longitude: 76.6346 },
  "sikar": { latitude: 27.6094, longitude: 75.1399 },
};

function getKnownRajasthanCityCoordinates(city: string, state = "Rajasthan") {
  if (state.trim().toLowerCase() !== "rajasthan") return null;
  return RAJASTHAN_CITY_COORDINATES[city.trim().toLowerCase()] || null;
}

async function resolveCityCoordinates(city: string, state: string) {
  const cleanCity = city.trim();
  const cleanState = state.trim() || "Rajasthan";
  if (!cleanCity) throw new Error("Please enter a city before saving.");

  const known = getKnownRajasthanCityCoordinates(cleanCity, cleanState);
  if (known) return known;

  const query = `${cleanCity}, ${cleanState}, India`;
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&addressdetails=1&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) throw new Error("Could not resolve coordinates for the selected city.");

  const places = await response.json();
  if (!Array.isArray(places) || places.length === 0) {
    throw new Error(`Could not find "${cleanCity}, ${cleanState}". Check the city and state.`);
  }

  const cityNeedle = cleanCity.toLowerCase();
  const matchingPlace = places.find((place: any) => {
    const address = place.address || {};
    const addressNames = [
      address.city, address.town, address.village, address.municipality,
      address.county, address.state_district, place.name, place.display_name,
    ].filter(Boolean).join(" ").toLowerCase();
    return addressNames.includes(cityNeedle);
  });
  if (!matchingPlace) {
    throw new Error(`The location service did not confirm "${cleanCity}". Please check the spelling.`);
  }

  const latitude = Number(matchingPlace.lat);
  const longitude = Number(matchingPlace.lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("The selected city returned invalid coordinates.");
  }
  return { latitude, longitude };
}

function display(value?: string | number | null) {
  return value !== undefined && value !== null && String(value).trim()
    ? String(value)
    : "Not provided";
}

function formatDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function DonorProfilePage() {
  const router = useRouter();

  const [donor, setDonor] = useState<Donor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const [form, setForm] = useState({
    bloodGroup: "",
    dateOfBirth: "",
    gender: "",
    city: "",
    state: "",
    pincode: "",
  });

  const loadProfile = async () => {
    const token = getToken();

    if (!token) {
      clearAuth();
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/donors/profile`, {
        headers: authHeaders(),
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load donor profile.");
      }

      const current = data.donor as Donor;
      setDonor(current);

      setForm({
        bloodGroup: current.bloodGroup || "",
        dateOfBirth: toInputDate(current.dateOfBirth),
        gender: String(current.gender || "").toUpperCase(),
        city: current.location?.city || "",
        state: current.location?.state || "",
        pincode: current.location?.pincode || "",
      });

      setLastSynced(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load donor profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const saveProfile = async () => {
    if (!donor) return;

    setSaving(true);
    setError("");

    try {
      const cleanCity = form.city.trim();
      const cleanState = form.state.trim() || "Rajasthan";
      if (!cleanCity) throw new Error("City is required to keep donor matching accurate.");

      // Always repair known city-centre coordinates (including stale Jaipur
      // coordinates saved under Bharatpur). For other cities, geocode when the
      // city/state changes or coordinates are missing.
      const knownCoordinates = getKnownRajasthanCityCoordinates(cleanCity, cleanState);
      const oldCity = String(donor.location?.city || "").trim().toLowerCase();
      const oldState = String(donor.location?.state || "").trim().toLowerCase();
      const cityChanged =
        cleanCity.toLowerCase() !== oldCity ||
        cleanState.toLowerCase() !== oldState;
      const oldLatitude = donor.location?.coordinates?.latitude;
      const oldLongitude = donor.location?.coordinates?.longitude;
      const hasOldCoordinates =
        Number.isFinite(Number(oldLatitude)) &&
        Number.isFinite(Number(oldLongitude)) &&
        oldLatitude !== undefined && oldLongitude !== undefined;

      let cityCoordinates = knownCoordinates;
      if (!cityCoordinates && (cityChanged || !hasOldCoordinates)) {
        cityCoordinates = await resolveCityCoordinates(cleanCity, cleanState);
      }
      if (!cityCoordinates && hasOldCoordinates) {
        cityCoordinates = {
          latitude: Number(oldLatitude),
          longitude: Number(oldLongitude),
        };
      }
      if (!cityCoordinates) {
        throw new Error("Could not determine coordinates for this city.");
      }

      const body = {
        bloodGroup: form.bloodGroup || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        // The backend schema expects MALE/FEMALE/OTHER, not title-case labels.
        gender: form.gender ? form.gender.toUpperCase() : undefined,
        city: cleanCity,
        state: cleanState,
        pincode: form.pincode.trim(),
        latitude: cityCoordinates.latitude,
        longitude: cityCoordinates.longitude,
      };

      const response = await fetch(`${API_BASE_URL}/api/donors/profile`, {
        method: "PUT",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.status === 401 || response.status === 403) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to update profile.");
      }

      const savedDonor = data.donor as Donor;
      setDonor(savedDonor);
      setForm({
        bloodGroup: savedDonor.bloodGroup || "",
        dateOfBirth: toInputDate(savedDonor.dateOfBirth),
        gender: String(savedDonor.gender || "").toUpperCase(),
        city: savedDonor.location?.city || "",
        state: savedDonor.location?.state || "",
        pincode: savedDonor.location?.pincode || "",
      });
      setEditing(false);
      showToast("Profile and city coordinates saved successfully.");
      setLastSynced(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateAvailability = async (
    nextAvailable: boolean,
    nextEmergency = donor?.emergencyAvailable ?? false
  ) => {
    if (!donor) return;

    setAvailabilitySaving(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/donors/availability`, {
        method: "PUT",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isAvailable: nextAvailable,
          emergencyAvailable: nextEmergency,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update availability.");
      }

      setDonor(data.donor);
      showToast(
        nextAvailable
          ? "You are now available for donation requests."
          : "You are now marked unavailable."
      );
      setLastSynced(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update availability."
      );
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const updateEmergencyAvailability = async (nextValue: boolean) => {
    if (!donor) return;
    await updateAvailability(Boolean(donor.isAvailable), nextValue);
  };

  const profileName =
    donor?.user?.name || "BloodLink Donor";

  const initials = useMemo(() => {
    return profileName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "BL";
  }, [profileName]);

  const locationText = [donor?.location?.city, donor?.location?.state]
    .filter(Boolean)
    .join(", ");

  const profileCompletion = useMemo(() => {
    if (!donor) return 0;

    const checks = [
      donor.user?.name,
      donor.user?.email,
      donor.user?.phone,
      donor.bloodGroup,
      donor.dateOfBirth,
      donor.gender,
      donor.location?.city,
      donor.location?.state,
      donor.location?.pincode,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [donor]);

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-loader">
          <div className="loader-drop">
            <Droplets size={28} />
          </div>
          <span>Loading secure donor profile...</span>
        </div>
        <PageStyles />
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="ambient">
        <div className="ambient-orb a" />
        <div className="ambient-orb b" />
        <div className="ambient-orb c" />
        <div className="ambient-grid" />
      </div>

      <div className="profile-shell">
        <header className="topbar">
          <button className="back-button" onClick={() => router.push("/donor")}>
            <span>
              <ArrowLeft size={17} />
            </span>
            Back to dashboard
          </button>

          <div className="brand">
            <div className="brand-mark">
              <HeartPulse size={18} />
            </div>
            <div>
              <strong>
                BloodLink<span>AI</span>
              </strong>
              <small>DONOR PROFILE</small>
            </div>
          </div>

          <button
            className="refresh-button"
            onClick={loadProfile}
            disabled={loading}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="error-banner">
            <ShieldCheck size={16} />
            <span>{error}</span>
            <button onClick={loadProfile}>Retry</button>
          </div>
        )}

        <section className="profile-hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={12} />
              VERIFIED DONOR IDENTITY
            </div>

            <h1>
              Your profile.
              <span>Your impact.</span>
            </h1>

            <p>
              Keep your donor information current so BloodLink AI can use
              accurate availability, blood group and location data when
              matching you with people who need blood.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => setEditing(true)}
              >
                <Edit3 size={15} />
                Edit profile
              </button>

              <div className="sync-pill">
                <span />
                API synced
                {lastSynced
                  ? ` · ${lastSynced.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </div>
            </div>
          </div>

          <div className="identity-card">
            <div className="identity-glow" />

            <div className="avatar">
              {initials}
              <span className="verified-badge">
                <Check size={10} />
              </span>
            </div>

            <h2>{profileName}</h2>
            <p>{locationText || "Location not provided"}</p>

            <div className="blood-display">
              <Droplets size={17} />
              <strong>{display(donor?.bloodGroup)}</strong>
              <span>Blood group</span>
            </div>

            <div className="identity-status">
              <span className="status-dot" />
              {donor?.isAvailable ? "Available to donate" : "Currently unavailable"}
            </div>
          </div>
        </section>

        <section className="metric-grid">
          <Metric
            icon={<Droplets size={18} />}
            label="Blood group"
            value={display(donor?.bloodGroup)}
            tone="red"
          />
          <Metric
            icon={<HeartPulse size={18} />}
            label="Total donations"
            value={String(donor?.totalDonations ?? 0)}
            tone="pink"
          />
          <Metric
            icon={<Hospital size={18} />}
            label="Last donation"
            value={formatDate(donor?.lastDonationDate)}
            tone="purple"
          />
          <Metric
            icon={<MapPin size={18} />}
            label="Current city"
            value={display(donor?.location?.city)}
            tone="green"
          />
        </section>

        <section className="content-grid">
          <div className="main-card">
            <div className="card-heading">
              <div>
                <span className="section-label">
                  <UserRound size={12} />
                  PERSONAL INFORMATION
                </span>
                <h2>Donor details</h2>
                <p>Your account information and registered donor details.</p>
              </div>

              {!editing && (
                <button className="outline-button" onClick={() => setEditing(true)}>
                  <Edit3 size={13} />
                  Edit
                </button>
              )}
            </div>

            <div className="details-grid">
              <InfoItem
                icon={<UserRound size={16} />}
                label="Full name"
                value={display(donor?.user?.name)}
              />
              <InfoItem
                icon={<Mail size={16} />}
                label="Email"
                value={display(donor?.user?.email)}
              />
              <InfoItem
                icon={<Phone size={16} />}
                label="Phone"
                value={display(donor?.user?.phone)}
              />
              <InfoItem
                icon={<Droplets size={16} />}
                label="Blood group"
                value={display(donor?.bloodGroup)}
              />
              <InfoItem
                icon={<Sparkles size={16} />}
                label="Date of birth"
                value={formatDate(donor?.dateOfBirth)}
              />
              <InfoItem
                icon={<UserRound size={16} />}
                label="Gender"
                value={donor?.gender ? donor.gender.charAt(0).toUpperCase() + donor.gender.slice(1).toLowerCase() : "Not provided"}
              />
              <InfoItem
                icon={<MapPin size={16} />}
                label="City"
                value={display(donor?.location?.city)}
              />
              <InfoItem
                icon={<MapPin size={16} />}
                label="State"
                value={display(donor?.location?.state)}
              />
              <InfoItem
                icon={<MapPin size={16} />}
                label="Pincode"
                value={display(donor?.location?.pincode)}
              />
            </div>

            <div className="coordinates-box">
              <div className="coordinates-icon">
                <MapPin size={16} />
              </div>
              <div>
                <span>LOCATION COORDINATES</span>
                <strong>
                  {donor?.location?.coordinates?.latitude !== undefined &&
                  donor?.location?.coordinates?.longitude !== undefined
                    ? `${donor.location.coordinates.latitude}, ${donor.location.coordinates.longitude}`
                    : "Coordinates not provided"}
                </strong>
              </div>
              <ShieldCheck size={15} />
            </div>
          </div>

          <aside className="side-column">
            <div className="availability-card">
              <div className="side-card-head">
                <div>
                  <span className="section-label">
                    <Zap size={12} />
                    DONOR AVAILABILITY
                  </span>
                  <h3>Ready to help?</h3>
                </div>

                {donor?.isAvailable ? (
                  <ToggleRight className="toggle-icon on" size={32} />
                ) : (
                  <ToggleLeft className="toggle-icon" size={32} />
                )}
              </div>

              <p>
                When available, BloodLink can include you in compatible donor
                matching and emergency requests.
              </p>

              <button
                className={`availability-toggle ${
                  donor?.isAvailable ? "active" : ""
                }`}
                disabled={availabilitySaving}
                onClick={() =>
                  updateAvailability(!Boolean(donor?.isAvailable))
                }
              >
                <span>
                  {donor?.isAvailable
                    ? "Available for donation"
                    : "Set me as available"}
                </span>
                {availabilitySaving ? (
                  <RefreshCw size={15} className="spin" />
                ) : donor?.isAvailable ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
              </button>

              <div className="availability-divider" />

              <div className="emergency-row">
                <div>
                  <strong>Emergency availability</strong>
                  <small>Allow urgent matching priority</small>
                </div>

                <button
                  className={`mini-switch ${
                    donor?.emergencyAvailable ? "active" : ""
                  }`}
                  disabled={availabilitySaving}
                  onClick={() =>
                    updateEmergencyAvailability(!Boolean(donor?.emergencyAvailable))
                  }
                  aria-label="Toggle emergency availability"
                >
                  <span />
                </button>
              </div>
            </div>

            <div className="completion-card">
              <div className="completion-top">
                <div>
                  <span>PROFILE COMPLETION</span>
                  <strong>{profileCompletion}%</strong>
                </div>
                <ShieldCheck size={18} />
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>

              <p>
                {profileCompletion === 100
                  ? "Your donor profile is fully completed."
                  : "Complete your details to make donor matching more reliable."}
              </p>

              {profileCompletion < 100 && (
                <button onClick={() => setEditing(true)}>
                  Complete profile <ChevronRight size={13} />
                </button>
              )}
            </div>

            <div className="security-card">
              <ShieldCheck size={19} />
              <div>
                <strong>Secure donor record</strong>
                <p>
                  Your profile is loaded from the authenticated BloodLink
                  backend.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="quick-links">
          <QuickLink
            icon={<Droplets size={17} />}
            title="Donation history"
            text="View your recorded donations"
            onClick={() => router.push("/donor/donation-history")}
          />
          <QuickLink
            icon={<Zap size={17} />}
            title="Emergency requests"
            text="See compatible blood requests"
            onClick={() => router.push("/donor/requests")}
          />
          <QuickLink
            icon={<ShieldCheck size={17} />}
            title="Eligibility"
            text="Review your donation eligibility"
            onClick={() => router.push("/eligibility")}
          />
        </section>

        <footer className="site-footer">
          <div className="footer-glow footer-glow-left" />
          <div className="footer-glow footer-glow-right" />

          <div className="footer-inner">
            <div className="footer-main">
              <div className="footer-about">
                <div className="footer-brand">
                  <div className="footer-mark">
                    <Droplets size={18} />
                  </div>
                  <div>
                    <strong>
                      BloodLink<span>AI</span>
                    </strong>
                    <small>DONATE · SAVE · REPEAT</small>
                  </div>
                </div>

                <p>
                  An intelligent blood donation network connecting donors,
                  emergency requests and blood banks when every second matters.
                </p>

                <div className="footer-secure">
                  <span className="footer-live-dot" />
                  Secure donor network
                </div>
              </div>

              <div className="footer-nav-group">
                <span className="footer-heading">DONOR</span>
                <button onClick={() => router.push("/donor")}>Dashboard</button>
                <button onClick={() => router.push("/donor/requests")}>
                  Emergency Requests
                </button>
                <button onClick={() => router.push("/donor/donation-history")}>
                  Donation History
                </button>
              </div>

              <div className="footer-nav-group">
                <span className="footer-heading">BLOODLINK</span>
                <button onClick={() => router.push("/eligibility")}>
                  Eligibility
                </button>
                <button onClick={() => router.push("/donor/profile")}>
                  Donor Profile
                </button>
                <button onClick={() => router.push("/")}>Home</button>
              </div>

              <div className="footer-impact">
                <div className="footer-impact-icon">
                  <HeartPulse size={19} />
                </div>
                <div>
                  <span>OUR MISSION</span>
                  <strong>Every drop can save a life.</strong>
                  <p>Intelligent matching. Faster response. Human impact.</p>
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <span>© 2026 BloodLink AI. All rights reserved.</span>
              <div className="footer-bottom-center">
                <span className="footer-live-dot" />
                SYSTEM OPERATIONAL
              </div>
              <span>BUILT FOR LIFE · POWERED BY INTELLIGENCE</span>
            </div>
          </div>
        </footer>
      </div>

      {editing && (
        <EditProfileModal
          form={form}
          setForm={setForm}
          saving={saving}
          onClose={() => {
            if (!saving) {
              setEditing(false);
              if (donor) {
                setForm({
                  bloodGroup: donor.bloodGroup || "",
                  dateOfBirth: toInputDate(donor.dateOfBirth),
                  gender: donor.gender || "",
                  city: donor.location?.city || "",
                  state: donor.location?.state || "",
                  pincode: donor.location?.pincode || "",
                });
              }
            }
          }}
          onSave={saveProfile}
        />
      )}

      {toast && (
        <div className="toast">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}

      <PageStyles />
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="info-item">
      <div className="info-icon">{icon}</div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function QuickLink({
  icon,
  title,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button className="quick-link" onClick={onClick}>
      <div className="quick-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      <ChevronRight size={16} />
    </button>
  );
}

function EditProfileModal({
  form,
  setForm,
  saving,
  onClose,
  onSave,
}: {
  form: {
    bloodGroup: string;
    dateOfBirth: string;
    gender: string;
    city: string;
    state: string;
    pincode: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      bloodGroup: string;
      dateOfBirth: string;
      gender: string;
      city: string;
      state: string;
      pincode: string;
    }>
  >;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="section-label">
              <Edit3 size={12} />
              EDIT DONOR PROFILE
            </span>
            <h2>Keep your details current.</h2>
            <p>
              These fields are sent directly to the authenticated donor profile
              endpoint.
            </p>
          </div>

          <button className="modal-close" onClick={onClose} disabled={saving}>
            <X size={17} />
          </button>
        </div>

        <div className="form-grid">
          <Field label="Blood group">
            <select
              value={form.bloodGroup}
              onChange={(e) => set("bloodGroup", e.target.value)}
            >
              <option value="">Select blood group</option>
              {bloodGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Gender">
            <select
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
            >
              <option value="">Select gender</option>
              {genders.map((gender) => (
                <option key={gender.value} value={gender.value}>
                  {gender.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Date of birth">
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
          </Field>

          <Field label="Pincode">
            <input
              inputMode="numeric"
              maxLength={6}
              value={form.pincode}
              onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
              placeholder="302001"
            />
          </Field>

          <Field label="City">
            <input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Jaipur"
            />
          </Field>

          <Field label="State">
            <input
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="Rajasthan"
            />
          </Field>
        </div>

        <div className="modal-note">
          <ShieldCheck size={17} />
          <span>
            Name, email and phone are displayed from your authenticated user
            record and are not changed by this donor-profile form.
          </span>
        </div>

        <div className="modal-actions">
          <button className="cancel-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="save-button" onClick={onSave} disabled={saving}>
            {saving ? (
              <RefreshCw size={15} className="spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PageStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
      }

      .profile-page {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
        color: #291821;
        background:
          radial-gradient(circle at 50% 8%, rgba(255, 117, 154, 0.11), transparent 25%),
          linear-gradient(135deg, #fffafd 0%, #fff3f7 52%, #fffafd 100%);
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
      }

      .ambient {
        position: fixed;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .ambient-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(100px);
      }

      .ambient-orb.a {
        width: 480px;
        height: 480px;
        left: -170px;
        top: 190px;
        background: rgba(255, 93, 139, 0.14);
      }

      .ambient-orb.b {
        width: 500px;
        height: 500px;
        right: -180px;
        top: 50px;
        background: rgba(249, 174, 199, 0.18);
      }

      .ambient-orb.c {
        width: 420px;
        height: 420px;
        left: 43%;
        bottom: -220px;
        background: rgba(255, 201, 220, 0.26);
      }

      .ambient-grid {
        position: absolute;
        inset: 0;
        opacity: 0.12;
        background-image:
          linear-gradient(rgba(190, 25, 75, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(190, 25, 75, 0.05) 1px, transparent 1px);
        background-size: 72px 72px;
        mask-image: linear-gradient(to bottom, black, transparent 90%);
      }

      .profile-shell {
        width: min(1440px, calc(100% - 42px));
        margin: 0 auto;
        padding-top: 22px;
        position: relative;
        z-index: 2;
      }

      .topbar {
        height: 70px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        padding: 0 13px;
        border: 1px solid rgba(255, 255, 255, 0.95);
        border-radius: 23px;
        background: rgba(255, 255, 255, 0.78);
        box-shadow: 0 20px 70px rgba(91, 18, 48, 0.08);
        backdrop-filter: blur(22px);
      }

      .back-button,
      .refresh-button {
        border: 0;
        background: transparent;
        color: #69758a;
        font-size: 13px;
        font-weight: 850;
        display: flex;
        align-items: center;
        gap: 9px;
        cursor: pointer;
      }

      .back-button {
        justify-self: start;
      }

      .back-button span {
        width: 37px;
        height: 37px;
        display: grid;
        place-items: center;
        border: 1px solid #f1dce4;
        border-radius: 12px;
        background: white;
      }

      .back-button:hover,
      .refresh-button:hover {
        color: #c91447;
      }

      .refresh-button {
        justify-self: end;
        padding: 9px 12px;
        border: 1px solid #efdee5;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.75);
      }

      .refresh-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .brand-mark,
      .footer-mark {
        display: grid;
        place-items: center;
        color: white;
        background: linear-gradient(135deg, #ff5b85, #c70c45);
        box-shadow: 0 10px 26px rgba(202, 18, 72, 0.22);
      }

      .brand-mark {
        width: 39px;
        height: 39px;
        border-radius: 12px;
      }

      .brand strong {
        display: block;
        color: #2b1c22;
        font-size: 14px;
        letter-spacing: -0.02em;
      }

      .brand strong span {
        color: #d9164c;
      }

      .brand small {
        display: block;
        margin-top: 2px;
        color: #a0a7b3;
        font-size: 7px;
        font-weight: 950;
        letter-spacing: 0.18em;
      }

      .error-banner {
        margin-top: 14px;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 12px 14px;
        border: 1px solid #f1c5d3;
        border-radius: 14px;
        color: #a62c50;
        background: #fff5f8;
        font-size: 11px;
      }

      .error-banner button {
        margin-left: auto;
        border: 0;
        color: #c91447;
        background: transparent;
        font-size: 10px;
        font-weight: 950;
        cursor: pointer;
      }

      .profile-hero {
        min-height: 450px;
        margin-top: 20px;
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        align-items: center;
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.95);
        border-radius: 38px;
        background: rgba(255, 255, 255, 0.76);
        box-shadow: 0 32px 105px rgba(91, 18, 48, 0.1);
        backdrop-filter: blur(24px);
      }

      .profile-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 77% 50%, rgba(255, 75, 128, 0.13), transparent 30%),
          radial-gradient(circle at 13% 0%, rgba(255, 210, 224, 0.48), transparent 30%);
      }

      .hero-copy {
        position: relative;
        z-index: 2;
        padding: 60px 40px 60px 70px;
      }

      .eyebrow,
      .section-label {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: #d5164d;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.2em;
      }

      .eyebrow {
        padding: 9px 13px;
        border: 1px solid #f4d7e0;
        border-radius: 999px;
        background: #fff5f8;
      }

      .hero-copy h1 {
        max-width: 680px;
        margin: 21px 0 0;
        color: #334052;
        font-size: clamp(55px, 6vw, 82px);
        line-height: 0.92;
        letter-spacing: -0.07em;
        font-weight: 950;
      }

      .hero-copy h1 span {
        display: block;
        background: linear-gradient(100deg, #b90b43, #e71b57 55%, #ff7397);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .hero-copy > p {
        max-width: 650px;
        margin: 22px 0 0;
        color: #75839a;
        font-size: 13px;
        line-height: 1.85;
      }

      .hero-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 25px;
      }

      .primary-button,
      .outline-button,
      .save-button,
      .cancel-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        cursor: pointer;
        font-weight: 900;
      }

      .primary-button {
        min-height: 43px;
        padding: 0 15px;
        border: 0;
        border-radius: 12px;
        color: white;
        background: linear-gradient(100deg, #d9164c, #ef4d78);
        box-shadow: 0 13px 30px rgba(217, 22, 76, 0.18);
        font-size: 10px;
      }

      .sync-pill {
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 0 12px;
        border: 1px solid #e8dfe4;
        border-radius: 12px;
        color: #7b8697;
        background: rgba(255, 255, 255, 0.78);
        font-size: 8px;
        font-weight: 900;
      }

      .sync-pill span,
      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #16b47a;
        box-shadow: 0 0 11px rgba(22, 180, 122, 0.58);
      }

      .identity-card {
        width: min(310px, calc(100% - 50px));
        min-height: 360px;
        margin: 0 auto;
        padding: 34px 24px;
        display: flex;
        align-items: center;
        flex-direction: column;
        justify-content: center;
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.96);
        border-radius: 31px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 26px 70px rgba(91, 18, 48, 0.1);
        text-align: center;
      }

      .identity-glow {
        position: absolute;
        width: 210px;
        height: 210px;
        top: -80px;
        right: -60px;
        border-radius: 50%;
        background: rgba(255, 105, 145, 0.18);
        filter: blur(35px);
      }

      .avatar {
        width: 94px;
        height: 94px;
        display: grid;
        place-items: center;
        position: relative;
        border: 6px solid #fff1f5;
        border-radius: 50%;
        color: white;
        background: linear-gradient(145deg, #ff7899, #c60d45);
        box-shadow: 0 20px 45px rgba(201, 14, 69, 0.22);
        font-size: 26px;
        font-weight: 950;
      }

      .verified-badge {
        width: 24px;
        height: 24px;
        display: grid;
        place-items: center;
        position: absolute;
        right: -2px;
        bottom: 3px;
        border: 3px solid white;
        border-radius: 50%;
        color: white;
        background: #15ac75;
      }

      .identity-card h2 {
        margin: 18px 0 0;
        color: #3d495a;
        font-size: 21px;
        font-weight: 950;
      }

      .identity-card > p {
        margin: 5px 0 0;
        color: #9aa4b2;
        font-size: 10px;
      }

      .blood-display {
        min-width: 180px;
        margin-top: 19px;
        padding: 10px 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 1px solid #f1d7e0;
        border-radius: 14px;
        color: #d5164d;
        background: #fff4f7;
      }

      .blood-display strong {
        font-size: 17px;
      }

      .blood-display span {
        color: #a2a9b4;
        font-size: 7px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .identity-status {
        margin-top: 13px;
        display: flex;
        align-items: center;
        gap: 7px;
        color: #718094;
        font-size: 8px;
        font-weight: 900;
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 13px;
        margin-top: 15px;
      }

      .metric-card {
        min-height: 91px;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 16px;
        border: 1px solid rgba(255, 255, 255, 0.95);
        border-radius: 19px;
        background: rgba(255, 255, 255, 0.75);
        box-shadow: 0 16px 45px rgba(91, 18, 48, 0.06);
        backdrop-filter: blur(17px);
      }

      .metric-icon {
        width: 39px;
        height: 39px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 12px;
      }

      .metric-icon.red {
        color: #d9164c;
        background: #fff0f4;
      }

      .metric-icon.pink {
        color: #c62a69;
        background: #fff0f6;
      }

      .metric-icon.purple {
        color: #7355b9;
        background: #f3efff;
      }

      .metric-icon.green {
        color: #13986b;
        background: #eaf9f3;
      }

      .metric-card small,
      .metric-card strong {
        display: block;
      }

      .metric-card small {
        color: #9ba4b1;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .metric-card strong {
        margin-top: 4px;
        color: #465264;
        font-size: 13px;
        font-weight: 950;
      }

      .content-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.55fr) minmax(310px, 0.75fr);
        gap: 15px;
        margin-top: 17px;
      }

      .main-card,
      .availability-card,
      .completion-card,
      .security-card {
        border: 1px solid rgba(255, 255, 255, 0.95);
        background: rgba(255, 255, 255, 0.76);
        box-shadow: 0 22px 70px rgba(91, 18, 48, 0.07);
        backdrop-filter: blur(21px);
      }

      .main-card {
        padding: 29px;
        border-radius: 28px;
      }

      .card-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 15px;
      }

      .section-label {
        font-size: 8px;
      }

      .card-heading h2 {
        margin: 6px 0 0;
        color: #3d495a;
        font-size: 24px;
        letter-spacing: -0.04em;
        font-weight: 950;
      }

      .card-heading p {
        margin: 5px 0 0;
        color: #9aa4b3;
        font-size: 10px;
      }

      .outline-button {
        min-height: 35px;
        padding: 0 11px;
        border: 1px solid #e7dce2;
        border-radius: 10px;
        color: #c91447;
        background: white;
        font-size: 9px;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 9px;
        margin-top: 23px;
      }

      .info-item {
        min-height: 75px;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 12px;
        border: 1px solid #eee4e8;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.7);
      }

      .info-icon {
        width: 31px;
        height: 31px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: #d9164c;
        border-radius: 9px;
        background: #fff0f4;
      }

      .info-item small,
      .info-item strong {
        display: block;
      }

      .info-item small {
        color: #a2a9b4;
        font-size: 7px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.09em;
      }

      .info-item strong {
        max-width: 160px;
        margin-top: 4px;
        overflow: hidden;
        color: #566173;
        font-size: 10px;
        font-weight: 900;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .coordinates-box {
        margin-top: 11px;
        padding: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        border: 1px dashed #eadce2;
        border-radius: 14px;
        background: #fff9fb;
      }

      .coordinates-icon {
        width: 33px;
        height: 33px;
        display: grid;
        place-items: center;
        color: #c91447;
        border-radius: 10px;
        background: #ffeaf0;
      }

      .coordinates-box div:nth-child(2) {
        flex: 1;
      }

      .coordinates-box span,
      .coordinates-box strong {
        display: block;
      }

      .coordinates-box span {
        color: #a3aab5;
        font-size: 6px;
        font-weight: 950;
        letter-spacing: 0.13em;
      }

      .coordinates-box strong {
        margin-top: 4px;
        color: #6c7787;
        font-size: 9px;
      }

      .coordinates-box > svg {
        color: #16a874;
      }

      .side-column {
        display: grid;
        gap: 14px;
        align-content: start;
      }

      .availability-card,
      .completion-card,
      .security-card {
        padding: 21px;
        border-radius: 22px;
      }

      .side-card-head,
      .completion-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .side-card-head h3 {
        margin: 5px 0 0;
        color: #445062;
        font-size: 17px;
        font-weight: 950;
      }

      .toggle-icon {
        color: #9aa4b1;
      }

      .toggle-icon.on {
        color: #12a973;
      }

      .availability-card > p {
        margin: 12px 0 0;
        color: #98a2b0;
        font-size: 10px;
        line-height: 1.7;
      }

      .availability-toggle {
        width: 100%;
        min-height: 42px;
        margin-top: 15px;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 1px solid #e9dce2;
        border-radius: 12px;
        color: #7d8797;
        background: white;
        font-size: 9px;
        font-weight: 900;
        cursor: pointer;
      }

      .availability-toggle.active {
        border-color: #bde8d8;
        color: #11865f;
        background: #eefbf6;
      }

      .availability-toggle:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .availability-divider {
        height: 1px;
        margin: 17px 0;
        background: #eee5e9;
      }

      .emergency-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .emergency-row strong,
      .emergency-row small {
        display: block;
      }

      .emergency-row strong {
        color: #536073;
        font-size: 9px;
        font-weight: 950;
      }

      .emergency-row small {
        margin-top: 4px;
        color: #a2a9b4;
        font-size: 7px;
      }

      .mini-switch {
        width: 38px;
        height: 21px;
        padding: 2px;
        border: 0;
        border-radius: 999px;
        background: #dedfe3;
        cursor: pointer;
      }

      .mini-switch span {
        width: 17px;
        height: 17px;
        display: block;
        border-radius: 50%;
        background: white;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
        transition: transform 0.2s ease;
      }

      .mini-switch.active {
        background: #d9164c;
      }

      .mini-switch.active span {
        transform: translateX(17px);
      }

      .completion-top span {
        display: block;
        color: #a1a8b3;
        font-size: 7px;
        font-weight: 950;
        letter-spacing: 0.12em;
      }

      .completion-top strong {
        display: block;
        margin-top: 3px;
        color: #d5164d;
        font-size: 25px;
        font-weight: 950;
      }

      .completion-top > svg {
        color: #15a975;
      }

      .progress-track {
        height: 7px;
        margin-top: 15px;
        overflow: hidden;
        border-radius: 999px;
        background: #f0e9ec;
      }

      .progress-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #d9164c, #ff7598);
        transition: width 0.4s ease;
      }

      .completion-card p {
        margin: 10px 0 0;
        color: #9aa4b2;
        font-size: 9px;
        line-height: 1.6;
      }

      .completion-card button {
        margin-top: 11px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        border: 0;
        color: #c91447;
        background: transparent;
        font-size: 8px;
        font-weight: 950;
        cursor: pointer;
      }

      .security-card {
        display: flex;
        gap: 10px;
        color: #15956a;
      }

      .security-card > svg {
        flex: 0 0 auto;
      }

      .security-card strong {
        display: block;
        color: #526073;
        font-size: 10px;
        font-weight: 950;
      }

      .security-card p {
        margin: 4px 0 0;
        color: #9da6b3;
        font-size: 8px;
        line-height: 1.6;
      }

      .quick-links {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-top: 15px;
      }

      .quick-link {
        min-height: 75px;
        padding: 13px;
        display: flex;
        align-items: center;
        gap: 10px;
        text-align: left;
        border: 1px solid rgba(255, 255, 255, 0.95);
        border-radius: 17px;
        color: #566173;
        background: rgba(255, 255, 255, 0.73);
        box-shadow: 0 15px 45px rgba(91, 18, 48, 0.05);
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .quick-link:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 55px rgba(91, 18, 48, 0.08);
      }

      .quick-icon {
        width: 37px;
        height: 37px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: #d9164c;
        border-radius: 11px;
        background: #fff0f4;
      }

      .quick-link div:nth-child(2) {
        flex: 1;
      }

      .quick-link strong,
      .quick-link span {
        display: block;
      }

      .quick-link strong {
        font-size: 10px;
        font-weight: 950;
      }

      .quick-link span {
        margin-top: 3px;
        color: #9ca5b3;
        font-size: 8px;
      }

      .quick-link > svg {
        color: #c7cdd5;
      }

      .site-footer {
        position: relative;
        margin: 48px calc((42px - 100vw) / 2) 0;
        padding: 48px 42px 22px;
        overflow: hidden;
        color: rgba(255, 255, 255, 0.64);
        background:
          radial-gradient(circle at 8% 10%, rgba(150, 16, 54, 0.22), transparent 31%),
          radial-gradient(circle at 88% 110%, rgba(105, 10, 39, 0.22), transparent 30%),
          linear-gradient(135deg, #461423 0%, #35101d 46%, #29101a 100%);
        border-top: 1px solid rgba(255, 144, 170, 0.14);
        box-shadow: 0 -22px 65px rgba(87, 12, 39, 0.08);
      }

      .site-footer::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255, 116, 151, 0.58), transparent);
      }

      .footer-glow {
        position: absolute;
        border-radius: 50%;
        filter: blur(75px);
        pointer-events: none;
      }

      .footer-glow-left {
        width: 250px;
        height: 250px;
        left: -110px;
        top: -130px;
        background: rgba(226, 30, 82, 0.12);
      }

      .footer-glow-right {
        width: 280px;
        height: 280px;
        right: -120px;
        bottom: -170px;
        background: rgba(178, 22, 66, 0.1);
      }

      .footer-inner {
        width: min(1440px, 100%);
        position: relative;
        z-index: 2;
        margin: 0 auto;
      }

      .footer-main {
        display: grid;
        grid-template-columns: 1.45fr 0.72fr 0.72fr 1.15fr;
        gap: 52px;
        align-items: start;
      }

      .footer-brand {
        display: flex;
        align-items: center;
        gap: 11px;
      }

      .footer-mark {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 13px;
        background: linear-gradient(135deg, #ff628c, #c80e46);
        box-shadow: 0 11px 28px rgba(164, 9, 55, 0.27);
      }

      .footer-brand strong {
        display: block;
        color: #fff;
        font-size: 16px;
        font-weight: 950;
        letter-spacing: -0.04em;
      }

      .footer-brand strong span {
        color: #ff7a9d;
      }

      .footer-brand small {
        display: block;
        margin-top: 3px;
        color: rgba(255, 255, 255, 0.36);
        font-size: 7px;
        font-weight: 950;
        letter-spacing: 0.17em;
      }

      .footer-about > p {
        max-width: 390px;
        margin: 16px 0 0;
        color: rgba(255, 255, 255, 0.46);
        font-size: 10px;
        line-height: 1.8;
      }

      .footer-secure {
        width: fit-content;
        margin-top: 17px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 999px;
        color: rgba(255, 255, 255, 0.54);
        background: rgba(255, 255, 255, 0.035);
        font-size: 7px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .footer-nav-group {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .footer-heading {
        margin-bottom: 4px;
        color: #ff7b9d;
        font-size: 7px;
        font-weight: 950;
        letter-spacing: 0.19em;
      }

      .footer-nav-group button {
        padding: 0;
        border: 0;
        color: rgba(255, 255, 255, 0.55);
        background: transparent;
        font-size: 9px;
        font-weight: 750;
        cursor: pointer;
        transition: color 0.18s ease, transform 0.18s ease;
      }

      .footer-nav-group button:hover {
        color: #fff;
        transform: translateX(3px);
      }

      .footer-impact {
        display: flex;
        gap: 12px;
        padding: 16px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 17px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.02));
      }

      .footer-impact-icon {
        width: 37px;
        height: 37px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: #ff789b;
        border-radius: 11px;
        background: rgba(255, 98, 140, 0.09);
      }

      .footer-impact span,
      .footer-impact strong {
        display: block;
      }

      .footer-impact span {
        color: #ff789b;
        font-size: 6px;
        font-weight: 950;
        letter-spacing: 0.18em;
      }

      .footer-impact strong {
        margin-top: 5px;
        color: rgba(255, 255, 255, 0.88);
        font-size: 11px;
        font-weight: 900;
      }

      .footer-impact p {
        margin: 5px 0 0;
        color: rgba(255, 255, 255, 0.38);
        font-size: 8px;
        line-height: 1.55;
      }

      .footer-bottom {
        margin-top: 35px;
        padding-top: 17px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 18px;
        border-top: 1px solid rgba(255, 255, 255, 0.075);
        color: rgba(255, 255, 255, 0.29);
        font-size: 7px;
        font-weight: 850;
        letter-spacing: 0.09em;
      }

      .footer-bottom > span:last-child {
        text-align: right;
      }

      .footer-bottom-center {
        display: flex;
        align-items: center;
        gap: 6px;
        color: rgba(255, 255, 255, 0.38);
        font-size: 6px;
        font-weight: 950;
        letter-spacing: 0.14em;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(31, 8, 18, 0.5);
        backdrop-filter: blur(12px);
      }

      .edit-modal {
        width: min(670px, 100%);
        max-height: 90vh;
        overflow: auto;
        padding: 28px;
        border: 1px solid rgba(255, 255, 255, 0.96);
        border-radius: 27px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 35px 100px rgba(42, 8, 23, 0.25);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        gap: 18px;
      }

      .modal-header h2 {
        margin: 6px 0 0;
        color: #3d495a;
        font-size: 24px;
        font-weight: 950;
        letter-spacing: -0.04em;
      }

      .modal-header p {
        margin: 5px 0 0;
        color: #99a3b1;
        font-size: 10px;
      }

      .modal-close {
        width: 35px;
        height: 35px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border: 1px solid #eadfe4;
        border-radius: 11px;
        color: #69758a;
        background: white;
        cursor: pointer;
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 23px;
      }

      .field span {
        display: block;
        margin-bottom: 6px;
        color: #6f7b8d;
        font-size: 8px;
        font-weight: 950;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .field input,
      .field select {
        width: 100%;
        height: 43px;
        padding: 0 12px;
        outline: none;
        border: 1px solid #e8dfe4;
        border-radius: 11px;
        color: #536073;
        background: #fff;
        font: inherit;
        font-size: 10px;
      }

      .field input:focus,
      .field select:focus {
        border-color: #e5a9bc;
        box-shadow: 0 0 0 4px rgba(217, 22, 76, 0.055);
      }

      .modal-note {
        margin-top: 14px;
        padding: 12px;
        display: flex;
        gap: 9px;
        border: 1px solid #eee4e8;
        border-radius: 13px;
        color: #6e7a8c;
        background: #fafbfc;
        font-size: 9px;
        line-height: 1.65;
      }

      .modal-note svg {
        flex: 0 0 auto;
        color: #15956a;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 20px;
      }

      .cancel-button,
      .save-button {
        min-height: 40px;
        padding: 0 14px;
        border-radius: 11px;
        font-size: 9px;
      }

      .cancel-button {
        border: 1px solid #e7dfe4;
        color: #6f7a8b;
        background: white;
      }

      .save-button {
        border: 0;
        color: white;
        background: linear-gradient(100deg, #d9164c, #ef4d78);
        box-shadow: 0 10px 25px rgba(217, 22, 76, 0.18);
      }

      .cancel-button:disabled,
      .save-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .toast {
        position: fixed;
        z-index: 200;
        right: 25px;
        bottom: 25px;
        min-height: 44px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 14px;
        border: 1px solid #cdeee1;
        border-radius: 13px;
        color: #117d58;
        background: rgba(246, 255, 251, 0.97);
        box-shadow: 0 18px 45px rgba(22, 112, 79, 0.14);
        font-size: 10px;
        font-weight: 900;
        animation: toastIn 0.25s ease both;
      }

      .toast svg {
        color: #14a873;
      }

      .profile-loader {
        min-height: 100vh;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 13px;
        color: #8490a1;
        font-size: 11px;
        font-weight: 800;
      }

      .loader-drop {
        width: 66px;
        height: 66px;
        display: grid;
        place-items: center;
        color: #d9164c;
        border-radius: 21px;
        background: #fff0f4;
        animation: loaderPulse 1.4s ease-in-out infinite;
      }

      .spin {
        animation: spin 0.85s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes loaderPulse {
        0%,
        100% {
          transform: translateY(0) scale(1);
        }
        50% {
          transform: translateY(-5px) scale(1.04);
        }
      }

      @keyframes toastIn {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 1100px) {
        .profile-hero {
          grid-template-columns: 1fr;
        }

        .hero-copy {
          padding-bottom: 20px;
        }

        .identity-card {
          margin: 0 auto 38px;
        }

        .metric-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .content-grid {
          grid-template-columns: 1fr;
        }

        .side-column {
          grid-template-columns: 1fr 1fr;
        }

        .security-card {
          grid-column: 1 / -1;
        }

        .footer-main {
          grid-template-columns: 1.2fr 0.8fr 0.8fr;
        }

        .footer-impact {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 760px) {
        .profile-shell {
          width: min(100% - 22px, 1440px);
        }

        .topbar {
          height: 61px;
        }

        .brand small {
          display: none;
        }

        .back-button {
          font-size: 10px;
        }

        .refresh-button {
          font-size: 10px;
        }

        .profile-hero {
          border-radius: 28px;
        }

        .hero-copy {
          padding: 38px 23px 10px;
        }

        .hero-copy h1 {
          font-size: 49px;
        }

        .identity-card {
          width: calc(100% - 34px);
          min-height: 330px;
          margin-bottom: 25px;
        }

        .metric-grid {
          grid-template-columns: 1fr 1fr;
        }

        .main-card {
          padding: 19px;
          border-radius: 24px;
        }

        .details-grid {
          grid-template-columns: 1fr 1fr;
        }

        .side-column {
          grid-template-columns: 1fr;
        }

        .security-card {
          grid-column: auto;
        }

        .quick-links {
          grid-template-columns: 1fr;
        }

        .site-footer {
          margin-left: calc((22px - 100vw) / 2);
          margin-right: calc((22px - 100vw) / 2);
          padding: 35px 22px 18px;
        }

        .footer-main {
          grid-template-columns: 1fr 1fr;
          gap: 30px 22px;
        }

        .footer-about,
        .footer-impact {
          grid-column: 1 / -1;
        }

        .footer-bottom {
          grid-template-columns: 1fr;
          gap: 8px;
          align-items: flex-start;
        }

        .footer-bottom > span:last-child {
          text-align: left;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .edit-modal {
          padding: 20px;
          border-radius: 23px;
        }
      }

      @media (max-width: 500px) {
        .metric-grid {
          grid-template-columns: 1fr;
        }

        .details-grid {
          grid-template-columns: 1fr;
        }

        .hero-actions {
          align-items: stretch;
          flex-direction: column;
        }

        .primary-button,
        .sync-pill {
          width: fit-content;
        }

        .card-heading {
          align-items: flex-start;
          flex-direction: column;
        }

        .toast {
          right: 12px;
          left: 12px;
          bottom: 12px;
        }
      }
    `}</style>
  );
}
