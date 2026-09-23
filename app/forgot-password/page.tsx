"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import BloodCells3D from "@/components/BloodCells3D";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setResetToken("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to process password reset request."
        );
        return;
      }

      setSuccess(
        data.message ||
          "Password reset request processed successfully."
      );

      // Development backend exposes resetToken.
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
    } catch (err) {
      console.error("Forgot password error:", err);

      setError(
        "Unable to connect to BloodLink AI server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff8fa] text-[#321a21]">
      {/* Soft pink ambient 3D background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[260px] -top-[240px] h-[650px] w-[650px] rounded-full bg-rose-200/55 blur-[130px]" />
        <div className="absolute -right-[230px] top-[5%] h-[620px] w-[620px] rounded-full bg-pink-200/50 blur-[135px]" />
        <div className="absolute bottom-[-350px] left-[20%] h-[720px] w-[720px] rounded-full bg-rose-100/80 blur-[145px]" />

        <div
          className="absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(190,24,93,.10) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        <div className="absolute -left-24 top-[25%] h-80 w-80 rounded-full border border-rose-300/20" />
        <div className="absolute -left-4 top-[31%] h-56 w-56 rounded-full border border-rose-300/15" />
        <div className="absolute right-[3%] bottom-[15%] h-64 w-64 rounded-full border border-pink-300/20" />
        <div className="absolute right-[7%] bottom-[20%] h-40 w-40 rounded-full border border-pink-300/15" />

        <BloodCells3D />
      </div>

      {/* Header */}
      <header className="relative z-30 flex items-center justify-between px-5 py-5 sm:px-10 lg:px-14">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="group flex items-center gap-3"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c91f49] to-[#a3133b] text-white shadow-[0_13px_38px_rgba(190,24,93,.24)] transition duration-300 group-hover:-translate-y-0.5">
            <div className="absolute inset-0 rounded-2xl bg-white/10" />
            <HeartPulse size={19} className="relative" />
          </div>

          <div className="text-left">
            <div className="text-[16px] font-black tracking-tight text-[#351a22]">
              BloodLink <span className="text-[#c51f48]">AI</span>
            </div>
            <div className="text-[8px] font-bold uppercase tracking-[.28em] text-[#9b7b84]">
              Emergency Intelligence
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-full border border-[#ead3d9] bg-white/70 px-4 py-2.5 text-[10px] font-bold text-[#80646d] shadow-[0_8px_25px_rgba(120,50,70,.06)] backdrop-blur-xl transition hover:border-rose-200 hover:bg-white hover:text-[#9f1239]"
        >
          Remembered it?
          <span className="ml-1 text-[#be123c]">Sign in</span>
        </button>
      </header>

      <section className="relative z-10 flex min-h-[calc(100vh-82px)] w-full items-center justify-center px-5 pb-16 pt-3 sm:px-10 lg:px-14">
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[520px]"
        >
          {/* Soft spotlight */}
          <div className="pointer-events-none absolute -inset-12 rounded-[70px] bg-gradient-to-br from-rose-200/45 via-pink-100/25 to-transparent blur-3xl" />

          {/* Floating security chips */}
          <motion.div
            animate={{ y: [0, -7, 0], rotate: [0, 1, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -left-8 top-[25%] hidden rounded-2xl border border-white/90 bg-white/65 px-3 py-3 shadow-[0_20px_50px_rgba(105,38,57,.10)] backdrop-blur-xl sm:flex"
          >
            <ShieldCheck size={15} className="text-[#c51f48]" />
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0], rotate: [0, -1, 0] }}
            transition={{
              duration: 5.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
            className="absolute -right-8 bottom-[24%] hidden rounded-2xl border border-white/90 bg-white/65 px-3 py-3 shadow-[0_20px_50px_rgba(105,38,57,.10)] backdrop-blur-xl sm:flex"
          >
            <LockKeyhole size={15} className="text-[#c51f48]" />
          </motion.div>

          {/* Brand / title */}
          <div className="relative mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#c91f49] to-[#a3133b] text-white shadow-[0_16px_42px_rgba(190,24,93,.23)]">
              <HeartPulse size={24} />
            </div>

            <div className="mb-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[.24em] text-[#b21d45]">
              <Sparkles size={11} />
              Account recovery
            </div>

            <h1 className="text-4xl font-black tracking-[-.055em] text-[#321a21] sm:text-[46px]">
              Forgot password<span className="text-[#cf2855]">?</span>
            </h1>

            <p className="mx-auto mt-2 max-w-[430px] text-[12px] leading-5 text-[#8b7078]">
              Enter your registered email and we&apos;ll generate
              a secure password reset request.
            </p>
          </div>

          {/* Main card */}
          <div
            style={{ padding: "30px" }}
            className="relative overflow-hidden rounded-[32px] border border-white/95 bg-white/82 shadow-[0_35px_100px_rgba(105,38,57,.16)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-rose-100/80 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-24 h-56 w-56 rounded-full bg-pink-100/75 blur-3xl" />

            <div className="relative">
              {/* Status */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-600"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700"
                >
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />
                  <span>{success}</span>
                </motion.div>
              )}

              <form
                onSubmit={handleSubmit}
                autoComplete="off"
                className="space-y-5"
              >
                <label className="block">
                  <span className="mb-2 block text-[9px] font-black uppercase tracking-[.16em] text-[#765b64]">
                    Email address
                  </span>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-0 top-0 z-10 flex h-[52px] w-[52px] items-center justify-center">
                      <Mail size={16} className="text-[#b797a0]" />
                    </span>

                    <input
                      type="email"
                      name="bloodlink-forgot-email"
                      autoComplete="off"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{
                        paddingLeft: "52px",
                        paddingRight: "16px",
                      }}
                      className="h-[52px] w-full rounded-2xl border border-[#eadde1] bg-white/85 text-[12px] text-[#3b252c] outline-none transition placeholder:text-[#b8a5ab] hover:border-[#e4cbd2] focus:border-[#d77d96] focus:bg-white focus:ring-4 focus:ring-rose-100"
                    />
                  </div>
                </label>

                <div className="rounded-2xl border border-[#f0e0e5] bg-gradient-to-r from-[#fffafa] to-[#fff5f7] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                      <ShieldCheck
                        size={15}
                        className="text-[#c51f48]"
                      />
                    </div>

                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[.15em] text-[#6f555e]">
                        Secure recovery
                      </div>
                      <div className="mt-0.5 text-[9px] leading-4 text-[#9b8189]">
                        Your reset request is sent through the BloodLink AI backend.
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#b51643] via-[#cf2855] to-[#e04b72] text-xs font-black text-white shadow-[0_17px_42px_rgba(190,24,93,.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_23px_50px_rgba(190,24,93,.30)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/20 transition-all duration-700 group-hover:left-[120%]" />

                  <span className="relative">
                    {loading
                      ? "Processing..."
                      : "Send Reset Request"}
                  </span>

                  {!loading ? (
                    <ArrowRight
                      size={17}
                      className="relative transition-transform group-hover:translate-x-1"
                    />
                  ) : (
                    <Loader2
                      size={17}
                      className="relative animate-spin"
                    />
                  )}
                </button>
              </form>

              {/* Development reset token */}
              {resetToken && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-amber-800">
                    <ShieldCheck size={15} />
                    Development reset token
                  </div>

                  <p className="mb-3 max-h-24 overflow-auto break-all rounded-xl border border-amber-100 bg-white p-3 font-mono text-[10px] leading-5 text-slate-700">
                    {resetToken}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/reset-password?token=${encodeURIComponent(
                          resetToken
                        )}`
                      )
                    }
                    className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 text-[11px] font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-700"
                  >
                    Continue to Reset Password
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </button>

                  <p className="mt-3 text-[10px] leading-5 text-amber-700">
                    Ye token sirf local development ke liye backend se aa raha hai.
                    Production mein ise email provider ke through bhejna chahiye.
                  </p>
                </motion.div>
              )}

              <div className="mt-6 flex items-center justify-center gap-5 border-t border-[#f0e3e6] pt-5 text-[8px] font-black uppercase tracking-[.15em] text-[#ae949c]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={11} className="text-[#c51f48]" />
                  Secure
                </span>

                <span className="flex items-center gap-1.5">
                  <LockKeyhole size={11} className="text-[#c51f48]" />
                  Protected
                </span>

                <span className="flex items-center gap-1.5">
                  <HeartPulse size={11} className="text-[#c51f48]" />
                  AI Network
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mx-auto mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#9a7d86] transition hover:text-[#b21d45]"
          >
            <ArrowLeft size={13} />
            Back to secure login
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[.18em] text-[#b39aa2]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,.45)]" />
            BloodLink AI network operational
          </div>
        </motion.div>
      </section>

      <footer className="relative z-20 border-t border-[#eadce1] bg-white/45 px-5 py-5 backdrop-blur-xl sm:px-10 lg:px-14">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-[8px] font-bold uppercase tracking-[.16em] text-[#a88c95] sm:flex-row">
          <span>© 2026 BloodLink AI</span>
          <span>Secure account recovery</span>
          <span>Emergency Intelligence Platform</span>
        </div>
      </footer>
    </main>
  );
}
