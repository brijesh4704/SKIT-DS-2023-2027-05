"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import DonorChrome from "../components/DonorChrome";
import {
  ArrowLeft,
  Bell,
  Check,
  HeartPulse,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
  Smartphone,
  UserRound,
  Zap,
} from "lucide-react";
import {
  API_BASE_URL,
  authHeaders,
  clearAuth,
  getToken,
} from "../../../lib/api";

type Donor = {
  bloodGroup?: string;
  isAvailable?: boolean;
  emergencyAvailable?: boolean;
  location?: {
    city?: string;
    state?: string;
  };
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

type Preferences = {
  emergency: boolean;
  updates: boolean;
  reminders: boolean;
};

const PREFS_KEY = "bloodlink_donor_settings";

const pageStyles = `
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

.settings-page {
  min-height: 100vh;
  width: 100%;
  position: relative;
  overflow-x: hidden;
  color: #21191c;
  background:
    radial-gradient(circle at 85% 8%, rgba(255, 211, 220, .75), transparent 25%),
    radial-gradient(circle at 3% 92%, rgba(255, 229, 208, .65), transparent 25%),
    linear-gradient(135deg, #fffafb 0%, #fff5f7 52%, #ffffff 100%);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.settings-page button {
  font: inherit;
}

.settings-orb {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(75px);
  opacity: .4;
}

.settings-orb.one {
  width: 420px;
  height: 420px;
  right: -160px;
  top: -170px;
  background: #ffd2dc;
}

.settings-orb.two {
  width: 340px;
  height: 340px;
  left: -170px;
  bottom: 70px;
  background: #ffe4d1;
}

.settings-shell {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.settings-topbar {
  min-height: 86px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  border-bottom: 1px solid rgba(130, 35, 53, .1);
}

.settings-back {
  justify-self: start;
  border: 0;
  background: transparent;
  color: #6f5c61;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
}

.settings-back-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: rgba(255,255,255,.9);
  border: 1px solid #efdee2;
  box-shadow: 0 7px 22px rgba(74, 24, 34, .06);
}

.settings-brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.settings-logo {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, #89162f, #ca3151);
  box-shadow: 0 10px 28px rgba(177, 28, 61, .24);
}

.settings-brand-name {
  display: block;
  font-size: 17px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: -.5px;
}

.settings-brand-name span {
  color: #c62d4c;
}

.settings-brand-caption {
  display: block;
  margin-top: 4px;
  color: #9a858b;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1.55px;
}

.settings-secure {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  color: #247e59;
  background: #effaf5;
  border: 1px solid #d8eee3;
  font-size: 11px;
  font-weight: 850;
}

.settings-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 54px;
  align-items: end;
  padding: 64px 0 42px;
}

.settings-eyebrow,
.settings-section-eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #b32645;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.8px;
}

.settings-hero h1 {
  margin: 15px 0 18px;
  max-width: 680px;
  font-size: clamp(44px, 5.4vw, 68px);
  line-height: .95;
  letter-spacing: -4px;
  font-weight: 950;
}

.settings-hero h1 span {
  color: #b82444;
  font-style: italic;
}

.settings-hero-description {
  max-width: 610px;
  margin: 0;
  color: #766267;
  font-size: 14px;
  line-height: 1.75;
}

.settings-account-card {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 18px;
  border-radius: 24px;
  background: rgba(255,255,255,.8);
  border: 1px solid #efdee2;
  box-shadow: 0 20px 55px rgba(76, 23, 34, .08);
  backdrop-filter: blur(18px);
}

.settings-avatar {
  width: 50px;
  height: 50px;
  flex: 0 0 50px;
  display: grid;
  place-items: center;
  color: #b92343;
  background: #fff0f3;
  border-radius: 16px;
}

.settings-account-copy {
  min-width: 0;
  flex: 1;
}

.settings-account-copy strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.settings-account-copy span {
  display: block;
  margin-top: 4px;
  color: #8c797e;
  font-size: 11px;
}

.settings-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #a09195;
  font-size: 10px;
  font-weight: 900;
  white-space: nowrap;
}

.settings-status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #bdb6b8;
}

.settings-status.available {
  color: #23825b;
}

.settings-status.available i {
  background: #2ab77c;
  box-shadow: 0 0 0 4px #e1f6ed;
}

.settings-error {
  margin-bottom: 20px;
  padding: 12px 15px;
  border: 1px solid #f0c9d0;
  border-radius: 14px;
  color: #a21f3b;
  background: #fff0f2;
  font-size: 12px;
  font-weight: 650;
}

.settings-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 52px;
  padding-bottom: 70px;
}

.settings-section {
  margin-bottom: 15px;
}

.settings-section.spaced {
  margin-top: 42px;
}

.settings-section h2 {
  margin: 7px 0 4px;
  color: #241b1e;
  font-size: 23px;
  line-height: 1.1;
  letter-spacing: -.7px;
}

.settings-section p {
  margin: 0;
  color: #8a777c;
  font-size: 12px;
  line-height: 1.55;
}

.settings-row {
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
  padding: 16px 18px;
  border: 1px solid #efdee2;
  border-radius: 19px;
  background: rgba(255,255,255,.86);
  box-shadow: 0 10px 30px rgba(75, 25, 35, .05);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}

.settings-row:hover {
  transform: translateY(-1px);
  border-color: #e8cbd1;
  box-shadow: 0 14px 34px rgba(75, 25, 35, .07);
}

.settings-row-icon {
  width: 43px;
  height: 43px;
  flex: 0 0 43px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: #b92343;
  background: #fff0f3;
}

.settings-row-icon.amber {
  color: #b86b18;
  background: #fff5e8;
}

.settings-row-icon svg {
  width: 19px;
  height: 19px;
}

.settings-row-copy {
  flex: 1;
  min-width: 0;
}

.settings-row-copy strong {
  display: block;
  color: #2a2023;
  font-size: 13px;
}

.settings-row-copy p {
  margin-top: 4px;
  color: #8a777c;
  font-size: 11px;
  line-height: 1.45;
}

.settings-toggle {
  width: 48px;
  height: 27px;
  flex: 0 0 48px;
  padding: 3px;
  border: 0;
  border-radius: 999px;
  background: #ddd7d9;
  cursor: pointer;
  transition: background .2s ease;
}

.settings-toggle span {
  display: block;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,.18);
  transition: transform .2s ease;
}

.settings-toggle.active {
  background: #ba2948;
}

.settings-toggle.active span {
  transform: translateX(21px);
}

.settings-toggle:disabled {
  opacity: .55;
  cursor: wait;
}

.settings-pill {
  flex: none;
  padding: 7px 10px;
  border-radius: 999px;
  color: #958589;
  background: #f1edef;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .4px;
}

.settings-pill.green {
  color: #24825b;
  background: #e7f7ef;
}

.settings-info-card {
  overflow: hidden;
  border: 1px solid #efdee2;
  border-radius: 19px;
  background: rgba(255,255,255,.86);
  box-shadow: 0 10px 30px rgba(75, 25, 35, .05);
}

.settings-info-row {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 70px;
  padding: 13px 15px;
  border-bottom: 1px solid #f2e8e9;
}

.settings-info-row:last-child {
  border-bottom: 0;
}

.settings-info-icon {
  width: 35px;
  height: 35px;
  flex: 0 0 35px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  color: #75666b;
  background: #f8f3f4;
}

.settings-info-icon svg {
  width: 16px;
  height: 16px;
}

.settings-info-copy {
  min-width: 0;
  flex: 1;
}

.settings-info-copy small {
  display: block;
  margin-bottom: 3px;
  color: #9a888d;
  font-size: 9px;
}

.settings-info-copy strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #2b2225;
  font-size: 11px;
}

.settings-verified {
  flex: none;
  color: #29996d;
}

.settings-privacy {
  display: flex;
  gap: 11px;
  margin-top: 14px;
  padding: 15px;
  border: 1px solid #dceee6;
  border-radius: 18px;
  background: #f7fcfa;
}

.settings-privacy-icon {
  width: 35px;
  height: 35px;
  flex: 0 0 35px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  color: #24815c;
  background: #e6f6ee;
}

.settings-privacy strong {
  display: block;
  font-size: 11px;
}

.settings-privacy p {
  margin-top: 4px;
  color: #70847a;
  font-size: 10px;
  line-height: 1.5;
}

.settings-logout {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 14px;
  padding: 13px 15px;
  border: 1px solid #f0d6db;
  border-radius: 15px;
  color: #b42644;
  background: #fff8f9;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.settings-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 25px 0 32px;
  border-top: 1px solid #f0e1e3;
  color: #9a888d;
  font-size: 10px;
}

.settings-footer-brand {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #2d2527;
  font-size: 13px;
  font-weight: 900;
}

.settings-footer-brand span {
  color: #c52c4a;
}

.settings-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 13px;
  color: #fff;
  background: #21191c;
  box-shadow: 0 16px 45px rgba(0,0,0,.22);
  font-size: 12px;
  font-weight: 850;
}

.settings-toast svg {
  color: #64d3a0;
}

.settings-loading {
  width: min(410px, calc(100% - 40px));
  margin: 22vh auto 0;
  padding: 32px;
  position: relative;
  z-index: 3;
  text-align: center;
  border: 1px solid #efdee2;
  border-radius: 24px;
  background: rgba(255,255,255,.9);
  box-shadow: 0 20px 65px rgba(74, 23, 34, .1);
}

.settings-loading-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 15px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #b92343;
  background: #fff0f3;
}

.settings-loading strong {
  display: block;
  font-size: 14px;
}

.settings-loading span {
  display: block;
  margin-top: 6px;
  color: #8c797e;
  font-size: 11px;
}

@media (max-width: 900px) {
  .settings-topbar {
    grid-template-columns: 1fr auto;
  }

  .settings-brand {
    display: none;
  }

  .settings-hero {
    grid-template-columns: 1fr;
    gap: 25px;
    padding-top: 45px;
  }

  .settings-content {
    grid-template-columns: 1fr;
    gap: 38px;
  }
}

@media (max-width: 560px) {
  .settings-shell {
    width: min(100% - 24px, 500px);
  }

  .settings-topbar {
    min-height: 72px;
  }

  .settings-back {
    font-size: 11px;
  }

  .settings-secure {
    width: 35px;
    height: 35px;
    justify-content: center;
    padding: 0;
    font-size: 0;
  }

  .settings-hero {
    padding-top: 35px;
  }

  .settings-hero h1 {
    font-size: 43px;
    letter-spacing: -2.5px;
  }

  .settings-account-card {
    padding: 15px;
  }

  .settings-status {
    font-size: 9px;
  }

  .settings-row {
    padding: 15px;
  }

  .settings-row-copy p {
    max-width: 230px;
  }

  .settings-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-toast {
    right: 14px;
    left: 14px;
    bottom: 14px;
    justify-content: center;
  }
}
`;

export default function DonorSettingsPage() {
  const router = useRouter();

  const [donor, setDonor] = useState<Donor | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [preferences, setPreferences] = useState<Preferences>({
    emergency: true,
    updates: true,
    reminders: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      const token = getToken();

      if (!token) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      try {
        const saved = localStorage.getItem(PREFS_KEY);

        if (saved) {
          try {
            setPreferences((current) => ({
              ...current,
              ...JSON.parse(saved),
            }));
          } catch {
            // Ignore malformed local preferences.
          }
        }

        const response = await fetch(
          `${API_BASE_URL}/api/donors/profile`,
          {
            headers: authHeaders(),
            cache: "no-store",
          }
        );

        if (response.status === 401 || response.status === 403) {
          clearAuth();
          window.location.href = "/login";
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load donor settings."
          );
        }

        setDonor(data.donor);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load donor settings."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const savePreferences = (next: Preferences) => {
    setPreferences(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    showToast("Settings saved");
  };

  const updateAvailability = async () => {
    if (!donor) return;

    const nextAvailable = !Boolean(donor.isAvailable);

    setSavingAvailability(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/donors/availability`,
        {
          method: "PUT",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            isAvailable: nextAvailable,
            emergencyAvailable: nextAvailable
              ? donor.emergencyAvailable ?? true
              : false,
          }),
        }
      );

      if (response.status === 401 || response.status === 403) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update donor availability."
        );
      }

      setDonor((current) =>
        current
          ? {
              ...current,
              isAvailable: nextAvailable,
              emergencyAvailable: nextAvailable
                ? current.emergencyAvailable ?? true
                : false,
            }
          : current
      );

      showToast(
        nextAvailable
          ? "You are now available for blood requests."
          : "Donor availability turned off."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update donor availability."
      );
    } finally {
      setSavingAvailability(false);
    }
  };

  const signOut = () => {
    clearAuth();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <main className="settings-page">
        <div className="settings-orb one" />
        <div className="settings-orb two" />

        <div className="settings-loading">
          <div className="settings-loading-icon">
            <HeartPulse size={25} />
          </div>
          <strong>Loading your settings</strong>
          <span>Securing your donor preferences…</span>
        </div>

        <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      </main>
    );
  }

  const location =
    [donor?.location?.city, donor?.location?.state]
      .filter(Boolean)
      .join(", ") || "Location not provided";

  return (
    <DonorChrome>
      <main className="settings-page">
      <div className="settings-orb one" />
      <div className="settings-orb two" />

      <div className="settings-shell">
        

        <section className="settings-hero">
          <div>
            <div className="settings-eyebrow">
              <Zap size={13} />
              ACCOUNT CONTROL CENTER
            </div>

            <h1>
              Your settings,
              <br />
              <span>your control.</span>
            </h1>

            <p className="settings-hero-description">
              Manage donor availability, emergency participation and
              notification preferences from one secure place.
            </p>
          </div>

          <div className="settings-account-card">
            <div className="settings-avatar">
              <UserRound size={24} />
            </div>

            <div className="settings-account-copy">
              <strong>
                {donor?.user?.name || "Donor account"}
              </strong>
              <span>
                {donor?.bloodGroup || "Blood group not set"} · Donor
              </span>
            </div>

            <div
              className={
                donor?.isAvailable
                  ? "settings-status available"
                  : "settings-status"
              }
            >
              <i />
              {donor?.isAvailable ? "Available" : "Unavailable"}
            </div>
          </div>
        </section>

        {error && (
          <div className="settings-error">
            {error}
          </div>
        )}

        <section className="settings-content">
          <div>
            <SectionHeading
              eyebrow="DONOR PARTICIPATION"
              title="Availability"
              description="Control when BloodLink can connect you with compatible requests."
            />

            <SettingRow
              icon={<HeartPulse />}
              title="Available for blood requests"
              description="Show your donor profile to compatible blood requests."
            >
              <button
                type="button"
                className={
                  donor?.isAvailable
                    ? "settings-toggle active"
                    : "settings-toggle"
                }
                disabled={savingAvailability}
                onClick={updateAvailability}
                aria-label="Toggle donor availability"
              >
                <span />
              </button>
            </SettingRow>

            <SettingRow
              icon={<Zap />}
              iconTone="amber"
              title="Emergency availability"
              description="Emergency matching follows your main donor availability."
            >
              <span
                className={
                  donor?.emergencyAvailable
                    ? "settings-pill green"
                    : "settings-pill"
                }
              >
                {donor?.emergencyAvailable ? "ON" : "OFF"}
              </span>
            </SettingRow>

            <SectionHeading
              eyebrow="NOTIFICATIONS"
              title="Stay informed"
              description="Choose which donor updates you want to receive."
              spaced
            />

            <SettingRow
              icon={<Bell />}
              title="Emergency requests"
              description="Compatible requests that may need your response."
            >
              <PreferenceToggle
                value={preferences.emergency}
                onChange={() =>
                  savePreferences({
                    ...preferences,
                    emergency: !preferences.emergency,
                  })
                }
              />
            </SettingRow>

            <SettingRow
              icon={<Smartphone />}
              title="Account updates"
              description="Profile, matching and network activity updates."
            >
              <PreferenceToggle
                value={preferences.updates}
                onChange={() =>
                  savePreferences({
                    ...preferences,
                    updates: !preferences.updates,
                  })
                }
              />
            </SettingRow>

            <SettingRow
              icon={<Zap />}
              title="Donation reminders"
              description="Eligibility and donation-related reminders."
            >
              <PreferenceToggle
                value={preferences.reminders}
                onChange={() =>
                  savePreferences({
                    ...preferences,
                    reminders: !preferences.reminders,
                  })
                }
              />
            </SettingRow>
          </div>

          <aside>
            <SectionHeading
              eyebrow="ACCOUNT"
              title="Account details"
            />

            <div className="settings-info-card">
              <InfoRow
                icon={<Mail />}
                title="Email"
                value={donor?.user?.email || "Not provided"}
                verified
              />

              <InfoRow
                icon={<Smartphone />}
                title="Phone"
                value={donor?.user?.phone || "Not provided"}
              />

              <InfoRow
                icon={<MapPin />}
                title="Location"
                value={location}
              />
            </div>

            <div className="settings-privacy">
              <div className="settings-privacy-icon">
                <LockKeyhole size={18} />
              </div>

              <div>
                <strong>Protected donor account</strong>
                <p>
                  Your account information is used for BloodLink
                  donor coordination features.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="settings-logout"
              onClick={signOut}
            >
              <LogOut size={17} />
              Sign out
            </button>
          </aside>
        </section>

        
      </div>

      {toast && (
        <div className="settings-toast">
          <Check size={15} />
          {toast}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
    </main>
      </DonorChrome>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  spaced,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  spaced?: boolean;
}) {
  return (
    <div
      className={
        spaced
          ? "settings-section spaced"
          : "settings-section"
      }
    >
      <div className="settings-section-eyebrow">
        {eyebrow}
      </div>

      <h2>{title}</h2>

      {description && <p>{description}</p>}
    </div>
  );
}

function SettingRow({
  icon,
  iconTone,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  iconTone?: "amber";
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div
        className={
          iconTone === "amber"
            ? "settings-row-icon amber"
            : "settings-row-icon"
        }
      >
        {icon}
      </div>

      <div className="settings-row-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      {children}
    </div>
  );
}

function PreferenceToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className={
        value
          ? "settings-toggle active"
          : "settings-toggle"
      }
      onClick={onChange}
      aria-label="Toggle preference"
    >
      <span />
    </button>
  );
}

function InfoRow({
  icon,
  title,
  value,
  verified,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div className="settings-info-row">
      <div className="settings-info-icon">{icon}</div>

      <div className="settings-info-copy">
        <small>{title}</small>
        <strong>{value}</strong>
      </div>

      {verified && (
        <Check
          size={15}
          className="settings-verified"
        />
      )}
    </div>
  );
}
