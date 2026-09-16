"use client";



import { Suspense, useEffect, useState } from "react";

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



function LoginPageContent() {

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
    <main className="relative min-h-screen overflow-hidden bg-[#fff8fa] text-[#2d171e]">
      <section className="relative z-10 flex min-h-[calc(100vh-82px)] w-full items-center justify-center px-5 pb-14 pt-4 sm:px-10 lg:px-14">
        {/* Centered premium login workspace */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[500px]"
        >
          {/* Soft spotlight behind the card */}
          <div className="pointer-events-none absolute -inset-10 rounded-[60px] bg-gradient-to-br from-rose-200/45 via-pink-100/30 to-transparent blur-3xl" />

          <div className="relative mb-5 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c91f49] to-[#a3133b] text-white shadow-[0_13px_35px_rgba(190,24,93,.22)]">
              <HeartPulse size={19} />
            </div>

            <div className="text-[9px] font-black uppercase tracking-[.24em] text-[#b21d45]">
              Secure network access
            </div>

            <h1 className="mt-2 text-4xl font-black tracking-[-.055em] text-[#321a21] sm:text-5xl">
              Welcome back<span className="text-[#cf2855]">.</span>
            </h1>

            <p className="mx-auto mt-2 max-w-[390px] text-[12px] leading-5 text-[#8b7078]">
              Sign in to continue to your BloodLink AI workspace.
            </p>
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="mx-auto mt-3 inline-flex items-center gap-1.5 border-0 bg-transparent text-[10px] font-black text-[#c51d4d] transition hover:text-[#941238]"
            >
              New here? Create an account
              <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ padding: "30px" }}
          className="relative mt-7 overflow-hidden rounded-[32px] border border-white/95 bg-white/82 shadow-[0_35px_100px_rgba(105,38,57,.16)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-rose-100/80 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-pink-100/75 blur-3xl" />

            <div className="relative">
              {verified && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700"
                >
                  <div className="font-bold">Email verified successfully.</div>
                  <div className="text-emerald-600/70">
                    You can now sign in securely.
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-600"
                >
                  {error}
                </motion.div>
              )}

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[.16em] text-[#765b64]">
                  Email address
                </span>

                <div className="relative">
                  <span className="pointer-events-none absolute left-0 top-0 z-10 flex h-full w-[52px] items-center justify-center">
                    <Mail size={16} className="text-[#b797a0]" />
                  </span>

                  <input
                    type="email"
                    name="bloodlink-login-email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ paddingLeft: "52px", paddingRight: "16px" }}
                    className="h-[52px] w-full rounded-2xl border border-[#eadde1] bg-white/85 text-[12px] text-[#3b252c] outline-none transition placeholder:text-[#b8a5ab] hover:border-[#e4cbd2] focus:border-[#d77d96] focus:bg-white focus:ring-4 focus:ring-rose-100"
                  />
                </div>
              </label>

              <label className="mt-6 block">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[.16em] text-[#765b64]">
                    Password
                  </span>

                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="text-[10px] font-bold text-[#b91c46] transition hover:text-[#8f1235] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <span className="pointer-events-none absolute left-0 top-0 z-10 flex h-full w-[52px] items-center justify-center">
                    <LockKeyhole size={16} className="text-[#b797a0]" />
                  </span>

                  <input
                    type={showPassword ? "text" : "password"}
                    name="bloodlink-login-password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") login();
                    }}
                    placeholder="Your password"
                    style={{ paddingLeft: "52px", paddingRight: "52px" }}
                    className="h-[52px] w-full rounded-2xl border border-[#eadde1] bg-white/85 text-[12px] text-[#3b252c] outline-none transition placeholder:text-[#b8a5ab] hover:border-[#e4cbd2] focus:border-[#d77d96] focus:bg-white focus:ring-4 focus:ring-rose-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-[#a98d95] transition hover:text-[#8f1235]"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              <button
                type="button"
                onClick={login}
                disabled={loading}
                className="group relative mt-7 flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#b51643] via-[#cf2855] to-[#e04b72] text-sm font-black text-white shadow-[0_17px_42px_rgba(190,24,93,.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_23px_50px_rgba(190,24,93,.30)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/20 transition-all duration-700 group-hover:left-[120%]" />

                <span className="relative">
                  {loading ? "Signing in..." : "Sign in"}
                </span>

                {!loading && (
                  <ArrowRight
                    size={17}
                    className="relative transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>

              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#f0e3e6] pt-5">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-[#f1e4e7] bg-[#fffafb] py-2.5 text-[9px] font-black uppercase tracking-[.14em] text-[#9b7f87]">
                  <ShieldCheck size={12} className="text-[#c51f48]" />
                  Secure
                </div>

                <div className="flex items-center justify-center gap-2 rounded-xl border border-[#f1e4e7] bg-[#fffafb] py-2.5 text-[9px] font-black uppercase tracking-[.14em] text-[#9b7f87]">
                  <LockKeyhole size={12} className="text-[#c51f48]" />
                  Protected
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#f0dce2] bg-gradient-to-r from-[#fff8fa] via-white to-[#fff4f7] px-4 py-3.5">
                <div className="flex flex-col items-center justify-between gap-2.5 sm:flex-row">
                  <div className="text-center sm:text-left">
                    <div className="text-[9px] font-black uppercase tracking-[.13em] text-[#765b64]">
                      New to BloodLink AI?
                    </div>
                    <div className="mt-0.5 text-[10px] text-[#a18790]">
                      Create your account and join the emergency blood network.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e8b7c6] bg-white px-4 text-[10px] font-black text-[#c51d4d] shadow-[0_8px_22px_rgba(190,24,93,.08)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d95b7d] hover:bg-[#fff5f8] hover:shadow-[0_12px_28px_rgba(190,24,93,.13)]"
                  >
                    Create account
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </button>
                </div>
              </div>

              <div className="mt-5 text-center text-[8px] font-bold uppercase tracking-[.18em] text-[#b79da5]">
                BloodLink AI • Emergency Intelligence Network
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#a88c95]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,.45)]" />
            Network operational
          </div>
        </motion.div>
      </section>

      {/* Premium footer */}
      <footer className="relative z-20 border-t border-[#eadce1] bg-white/45 px-5 py-5 backdrop-blur-xl sm:px-10 lg:px-14">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-[8px] font-bold uppercase tracking-[.16em] text-[#a88c95] sm:flex-row">
          <span>© 2026 BloodLink AI</span>

          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,.45)]" />
            Network operational
          </span>

          <span>Emergency Intelligence Platform</span>
        </div>
      </footer>
    </main>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <LoginPageContent />
    </Suspense>
  );
}