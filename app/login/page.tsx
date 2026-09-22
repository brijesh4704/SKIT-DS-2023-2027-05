"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import BloodCells3D from "@/components/BloodCells3D";
import { enablePushNotifications } from "@/lib/pushNotifications";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (params.get("verified") === "1") {
      setVerified(true);
    }
  }, [params]);

  const login = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const API =
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:5000";

      const response = await fetch(
        `${API}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresEmailVerification) {
          sessionStorage.setItem(
            "verificationEmail",
            email.trim().toLowerCase()
          );

          router.push(
            `/verify-email?email=${encodeURIComponent(
              email.trim().toLowerCase()
            )}`
          );

          return;
        }

        throw new Error(
          data.message || "Login failed."
        );
      }

      // ==========================================
      // SAVE AUTH DATA
      // ==========================================

      if (data.token) {
        localStorage.setItem(
          "bloodlink_token",
          data.token
        );
      }

      if (data.user) {
        localStorage.setItem(
          "bloodlink_user",
          JSON.stringify(data.user)
        );
      }

      // ==========================================
      // ENABLE PUSH NOTIFICATIONS
      // ==========================================

      try {
        await enablePushNotifications();
        console.log(
          "🔔 BloodLink AI push notifications enabled"
        );
      } catch (pushError) {
        // Push notification fail hone par login fail
        // nahi hona chahiye.
        console.warn(
          "Push notification setup failed:",
          pushError
        );
      }

      // ==========================================
      // ROLE BASED REDIRECT
      // ==========================================

      const role = String(
        data.user?.role || ""
      ).toUpperCase();

      if (role === "DONOR") {
        router.replace("/donor");
      } else if (role === "HOSPITAL") {
        router.replace("/hospital");
      } else if (role === "BLOOD_BANK") {
        router.replace("/blood-bank");
      } else if (role === "ADMIN") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      setError(
        err.message || "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7f8] text-[#24191c]">
      <BloodCells3D />

      {/* Header */}
      <header className="relative z-20 flex w-full items-center justify-between px-6 py-5 sm:px-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b91c3c] text-white shadow-[0_8px_25px_rgba(185,28,60,.18)]">
            <HeartPulse size={18} />
          </div>

          <div className="text-left">
            <div className="text-[15px] font-bold">
              BloodLink{" "}
              <span className="text-[#c41e3a]">
                AI
              </span>
            </div>

            <div className="text-[8px] uppercase tracking-[.22em] text-[#927b81]">
              Emergency Intelligence
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/register")}
          className="rounded-full border border-[#eadadd] bg-white/75 px-4 py-2 text-[11px] font-medium text-[#655257] shadow-sm backdrop-blur-xl transition hover:bg-white"
        >
          New here?
          <span className="ml-1 text-[#b91c3c]">
            Create account
          </span>
        </button>
      </header>

      {/* CENTER */}
      <section className="relative z-10 flex min-h-[calc(100vh-80px)] w-full items-center justify-center px-5 py-8">
        <motion.div
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mx-auto w-full max-w-[455px]"
        >
          {/* Heading */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-white/85 text-[#b91c3c] shadow-[0_12px_35px_rgba(185,28,60,.10)]">
              <HeartPulse size={25} />
            </div>

            <div className="mb-2 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.2em] text-[#b91c3c]">
              <Sparkles size={11} />
              Secure access
            </div>

            <h1 className="text-[33px] font-bold tracking-[-.045em]">
              Welcome back
            </h1>

            <p className="mt-2 text-[13px] text-[#806d72]">
              Sign in to your BloodLink AI account.
            </p>
          </div>

          {/* CARD */}
          <div className="mx-auto w-full rounded-[25px] border border-white/90 bg-white/82 p-6 shadow-[0_30px_80px_rgba(116,35,53,.13)] backdrop-blur-2xl sm:p-7">
            {verified && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -7,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700"
              >
                Email verified successfully.
                You can now sign in.
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -7,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600"
              >
                {error}
              </motion.div>
            )}

            {/* Email */}
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[.13em] text-[#756166]">
                Email address
              </span>

              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b49ca2]"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-[#eadfe1] bg-white/85 pl-10 pr-3 text-[12px] outline-none transition placeholder:text-[#b6a5a9] focus:border-[#d28a98] focus:bg-white focus:ring-4 focus:ring-rose-100"
                />
              </div>
            </label>

            {/* Password */}
            <label className="mt-4 block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-[.13em] text-[#756166]">
                  Password
                </span>

                <button
                  onClick={() =>
                    router.push("/forgot-password")
                  }
                  className="text-[10px] font-medium text-[#b91c3c] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <LockKeyhole
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b49ca2]"
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      login();
                    }
                  }}
                  placeholder="Your password"
                  className="h-11 w-full rounded-xl border border-[#eadfe1] bg-white/85 pl-10 pr-10 text-[12px] outline-none transition placeholder:text-[#b6a5a9] focus:border-[#d28a98] focus:bg-white focus:ring-4 focus:ring-rose-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a89399]"
                >
                  {showPassword ? (
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>
              </div>
            </label>

            {/* CTA */}
            <button
              onClick={login}
              disabled={loading}
              className="group mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#b91c3c] text-sm font-semibold text-white shadow-[0_14px_35px_rgba(185,28,60,.20)] transition hover:bg-[#a91635] disabled:opacity-60"
            >
              {loading
                ? "Signing in..."
                : "Sign in"}

              {!loading && (
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              )}
            </button>

            <div className="mt-5 flex justify-center gap-5 border-t border-[#f0e3e5] pt-5 text-[9px] uppercase tracking-[.13em] text-[#a18c91]">
              <span className="flex items-center gap-1">
                <ShieldCheck size={11} />
                Secure
              </span>

              <span className="flex items-center gap-1">
                <LockKeyhole size={11} />
                Protected
              </span>
            </div>
          </div>

          <p className="mt-4 text-center text-[9px] uppercase tracking-[.18em] text-[#b49da2]">
            BloodLink AI • Emergency Intelligence Network
          </p>
        </motion.div>
      </section>
    </main>
  );
}