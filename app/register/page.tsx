"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LocateFixed,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import BloodCells3D from "@/components/BloodCells3D";

type Role = "DONOR" | "HOSPITAL" | "BLOOD_BANK";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const bloodGroups = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

const roles: {
  value: Role;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "DONOR",
    title: "Blood Donor",
    description: "Donate blood and help save lives",
    icon: "🩸",
  },
  {
    value: "HOSPITAL",
    title: "Hospital",
    description: "Manage emergency blood requests",
    icon: "🏥",
  },
  {
    value: "BLOOD_BANK",
    title: "Blood Bank",
    description: "Manage blood inventory and requests",
    icon: "🏦",
  },
];

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("DONOR");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    bloodGroup: "",
    city: "",
    state: "",
    latitude: "",
    longitude: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationCaptured, setLocationCaptured] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const updateField = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ==========================================
  // CURRENT GPS LOCATION
  // ==========================================

  const getCurrentLocation = () => {
    setError("");

    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location services."
      );
      return;
    }

    setLocationLoading(true);
    setLocationCaptured(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude =
          position.coords.latitude.toFixed(6);

        const longitude =
          position.coords.longitude.toFixed(6);

        // IMPORTANT:
        // GPS ONLY updates latitude/longitude.
        // City and State remain exactly as entered.
        setForm((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));

        setLocationCaptured(true);
        setLocationLoading(false);
      },

      (locationError) => {
        setLocationLoading(false);

        if (
          locationError.code ===
          locationError.PERMISSION_DENIED
        ) {
          setError(
            "Location permission was denied. Please allow location access and try again."
          );
        } else if (
          locationError.code ===
          locationError.POSITION_UNAVAILABLE
        ) {
          setError(
            "Your current location could not be detected."
          );
        } else if (
          locationError.code ===
          locationError.TIMEOUT
        ) {
          setError(
            "Location request timed out. Please try again."
          );
        } else {
          setError(
            "Unable to detect your current location."
          );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // ==========================================
  // REGISTER
  // ==========================================

  const handleRegister = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (form.password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setError(
        "Please enter a valid 10-digit Indian phone number."
      );
      return;
    }

    if (role === "DONOR") {
      if (!form.city.trim()) {
        setError("Please enter your city.");
        return;
      }

      if (!form.state.trim()) {
        setError("Please enter your state.");
        return;
      }
    }

    try {
      setLoading(true);

      let payload: Record<string, unknown>;

      // ========================================
      // DONOR
      // ========================================

      if (role === "DONOR") {
        payload = {
          name: form.name.trim(),

          email: form.email
            .trim()
            .toLowerCase(),

          phone: form.phone.trim(),

          password: form.password,

          bloodGroup:
            form.bloodGroup || "UNKNOWN",

          // MANUAL PROFILE LOCATION
          city: form.city.trim(),

          state: form.state.trim(),

          // LIVE LOCATION
          // Only send if user captured it.
          ...(form.latitude &&
          form.longitude
            ? {
                latitude:
                  Number(form.latitude),
                longitude:
                  Number(form.longitude),
              }
            : {}),
        };
      } else {
        payload = {
          name: form.name.trim(),

          email: form.email
            .trim()
            .toLowerCase(),

          phone: form.phone.trim(),

          password: form.password,

          role,
        };
      }

      // ========================================
      // CORRECT API ENDPOINT
      // ========================================

      const endpoint =
        role === "DONOR"
          ? `${API}/api/auth/register/donor`
          : `${API}/api/auth/register`;

      const response = await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          Array.isArray(data.errors)
        ) {
          setError(
            data.errors.join(" ")
          );
        } else {
          setError(
            data.message ||
              "Registration failed."
          );
        }

        return;
      }

      // ========================================
      // SAVE VERIFICATION EMAIL
      // ========================================

      const verificationEmail =
        form.email
          .trim()
          .toLowerCase();

      sessionStorage.setItem(
        "bloodlink_verification_email",
        verificationEmail
      );

      sessionStorage.setItem(
        "bloodlink_verification_role",
        role
      );

      // ========================================
      // GO TO VERIFY EMAIL
      // ========================================

      router.push(
        `/verify-email?email=${encodeURIComponent(
          verificationEmail
        )}`
      );
    } catch (err) {
      console.error(
        "Registration error:",
        err
      );

      setError(
        "Unable to connect to BloodLink AI server. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7fa] text-slate-900">

      {/* 3D BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <BloodCells3D />
      </div>

      {/* BACKGROUND GLOW */}
      <div className="pointer-events-none fixed inset-0 z-[1]">
        <div className="absolute left-[8%] top-[10%] h-[420px] w-[420px] rounded-full bg-pink-200/30 blur-[120px]" />

        <div className="absolute bottom-[5%] right-[8%] h-[420px] w-[420px] rounded-full bg-rose-200/30 blur-[120px]" />
      </div>

      {/* PAGE */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.55,
          }}
          className="w-full max-w-[820px]"
        >

          {/* HEADER */}
          <div className="mb-6 text-center">

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-white/80 text-2xl shadow-lg backdrop-blur-xl">
              🩸
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Join{" "}
              <span className="bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                BloodLink AI
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Create your account and become part
              of the emergency blood network.
            </p>
          </div>

          {/* CARD */}
          <div className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_25px_80px_rgba(190,24,93,0.12)] backdrop-blur-2xl sm:p-7">

            {/* ROLE */}
            <div className="mb-7">

              <div className="mb-3 text-sm font-bold text-slate-700">
                I want to register as
              </div>

              <div className="grid gap-3 sm:grid-cols-3">

                {roles.map((item) => {
                  const active =
                    role === item.value;

                  return (
                    <motion.button
                      key={item.value}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{
                        scale: 0.98,
                      }}
                      onClick={() => {
                        setRole(
                          item.value
                        );
                        setError("");
                      }}
                      className={`relative rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-rose-300 bg-rose-50 shadow-[0_10px_30px_rgba(244,63,94,0.10)]"
                          : "border-slate-200 bg-white/60 hover:border-rose-200"
                      }`}
                    >

                      {active && (
                        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white">
                          <Check size={12} />
                        </div>
                      )}

                      <div className="mb-2 text-2xl">
                        {item.icon}
                      </div>

                      <div className="text-sm font-bold">
                        {item.title}
                      </div>

                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {item.description}
                      </div>

                    </motion.button>
                  );
                })}

              </div>
            </div>

            {/* ERROR */}
            {error && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
              >
                {error}
              </motion.div>
            )}

            {/* FORM */}
            <form
              onSubmit={handleRegister}
              className="space-y-5"
            >

              {/* NAME */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <div className="relative">
                  <User className="auth-icon" />

                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      updateField(
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="Enter your full name"
                    className="auth-form-input"
                  />
                </div>
              </div>

              {/* EMAIL + PHONE */}
              <div className="grid gap-5 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="auth-icon" />

                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        updateField(
                          "email",
                          e.target.value
                        )
                      }
                      placeholder="you@example.com"
                      className="auth-form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Phone Number
                  </label>

                  <div className="relative">
                    <Phone className="auth-icon" />

                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) =>
                        updateField(
                          "phone",
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                      placeholder="10-digit mobile number"
                      className="auth-form-input"
                    />
                  </div>
                </div>

              </div>

              {/* DONOR DETAILS */}
              {role === "DONOR" && (
                <motion.div
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  className="space-y-5"
                >

                  <div className="my-6 h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent" />

                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Donor Information
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      These details help BloodLink AI
                      identify suitable donors during
                      emergencies.
                    </p>
                  </div>

                  {/* BLOOD GROUP */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Blood Group
                    </label>

                    <select
                      value={form.bloodGroup}
                      onChange={(e) =>
                        updateField(
                          "bloodGroup",
                          e.target.value
                        )
                      }
                      className="auth-form-select"
                    >
                      <option value="">
                        Select your blood group
                      </option>

                      {bloodGroups.map(
                        (group) => (
                          <option
                            key={group}
                            value={group}
                          >
                            {group}
                          </option>
                        )
                      )}

                      <option value="UNKNOWN">
                        I don't know my blood group
                      </option>
                    </select>
                  </div>

                  {/* CITY + STATE */}
                  <div className="grid gap-5 sm:grid-cols-2">

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        City
                      </label>

                      <div className="relative">
                        <MapPin className="auth-icon" />

                        <input
                          type="text"
                          required
                          value={form.city}
                          onChange={(e) =>
                            updateField(
                              "city",
                              e.target.value
                            )
                          }
                          placeholder="e.g. Jaipur"
                          className="auth-form-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        State
                      </label>

                      <div className="relative">
                        <MapPin className="auth-icon" />

                        <input
                          type="text"
                          required
                          value={form.state}
                          onChange={(e) =>
                            updateField(
                              "state",
                              e.target.value
                            )
                          }
                          placeholder="e.g. Rajasthan"
                          className="auth-form-input"
                        />
                      </div>
                    </div>

                  </div>

                  {/* CURRENT LOCATION */}
                  <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/80 to-pink-50/60 p-4">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                          <LocateFixed
                            size={19}
                            className="text-rose-500"
                          />
                        </div>

                        <div>
                          <div className="text-sm font-bold text-slate-800">
                            Your current location
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            Used for nearby donor matching
                          </div>
                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={
                          getCurrentLocation
                        }
                        disabled={
                          locationLoading
                        }
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                          locationCaptured
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                            : "bg-rose-500 text-white shadow-[0_10px_25px_rgba(244,63,94,0.22)] hover:bg-rose-600"
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >

                        {locationLoading ? (
                          <>
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                            Detecting...
                          </>
                        ) : locationCaptured ? (
                          <>
                            <Check size={17} />
                            Location Captured
                          </>
                        ) : (
                          <>
                            <LocateFixed
                              size={17}
                            />
                            Use My Location
                          </>
                        )}

                      </button>

                    </div>

                    {locationCaptured && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          y: 5,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className="mt-3 rounded-xl bg-white/75 px-3 py-2 text-xs text-emerald-600"
                      >
                        ✓ Location captured
                        successfully. Your exact
                        coordinates are not displayed
                        publicly.
                      </motion.div>
                    )}

                    <p className="mt-3 text-[11px] leading-4 text-slate-400">
                      Location access is optional.
                      It helps BloodLink AI calculate
                      donor proximity during emergency
                      matching.
                    </p>

                  </div>

                </motion.div>
              )}

              {/* PASSWORDS */}
              <div className="grid gap-5 sm:grid-cols-2">

                {/* PASSWORD */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>

                  <div className="relative">

                    <Lock className="auth-icon" />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) =>
                        updateField(
                          "password",
                          e.target.value
                        )
                      }
                      placeholder="Minimum 6 characters"
                      className="auth-form-input auth-form-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (prev) => !prev
                        )
                      }
                      className="auth-password-toggle"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>
                </div>

                {/* CONFIRM */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirm Password
                  </label>

                  <div className="relative">

                    <Lock className="auth-icon" />

                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      required
                      minLength={6}
                      value={
                        form.confirmPassword
                      }
                      onChange={(e) =>
                        updateField(
                          "confirmPassword",
                          e.target.value
                        )
                      }
                      placeholder="Repeat your password"
                      className="auth-form-input auth-form-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (prev) => !prev
                        )
                      }
                      className="auth-password-toggle"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>
                </div>

              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-4 text-sm font-bold text-white shadow-[0_15px_35px_rgba(244,63,94,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >

                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account

                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}

              </button>

            </form>

            {/* LOGIN */}
            <div className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}

              <button
                type="button"
                onClick={() =>
                  router.push("/login")
                }
                className="font-bold text-rose-500 hover:text-rose-600"
              >
                Sign in
              </button>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center text-[11px] leading-5 text-slate-400">
              By creating an account, you agree to
              use BloodLink AI responsibly. Final
              donor eligibility is determined through
              appropriate medical screening.
            </div>

          </div>
        </motion.div>
      </div>
    </main>
  );
}