"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import BloodCells3D from "@/components/BloodCells3D";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();

  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Password reset token is missing.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/auth/reset-password/${encodeURIComponent(
          token
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Unable to reset password."
        );
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        router.replace("/login");
      }, 1800);
    } catch (err) {
      console.error("Reset password error:", err);

      setError(
        "Unable to connect to BloodLink AI server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff8fa] text-[#321a21]">
      {/* Soft pink 3D background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[280px] -top-[260px] h-[680px] w-[680px] rounded-full bg-rose-200/55 blur-[135px]" />
        <div className="absolute -right-[260px] top-[5%] h-[650px] w-[650px] rounded-full bg-pink-200/50 blur-[140px]" />
        <div className="absolute bottom-[-380px] left-[20%] h-[760px] w-[760px] rounded-full bg-rose-100/80 blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(190,24,93,.10) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        <div className="absolute left-[8%] top-[22%] h-64 w-64 rounded-full border border-rose-300/20" />
        <div className="absolute left-[12%] top-[27%] h-40 w-40 rounded-full border border-rose-300/15" />
        <div className="absolute right-[8%] bottom-[20%] h-64 w-64 rounded-full border border-pink-300/20" />

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
            <HeartPulse size={19} />
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
          Back to <span className="text-[#be123c]">Login</span>
        </button>
      </header>

      {/* Centered reset workspace */}
      <section className="relative z-10 flex min-h-[calc(100vh-150px)] w-full items-center justify-center px-5 pb-16 pt-2 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[500px]"
        >
          {/* Premium spotlight */}
          <div className="pointer-events-none absolute -inset-14 rounded-[80px] bg-gradient-to-br from-rose-200/50 via-pink-100/30 to-transparent blur-3xl" />

          {/* Small floating security accents */}
          <motion.div
            animate={{ y: [0, -7, 0], rotate: [0, 1, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -left-8 top-[25%] hidden rounded-2xl border border-white/90 bg-white/65 p-3 shadow-[0_20px_50px_rgba(105,38,57,.10)] backdrop-blur-xl sm:block"
          >
            <ShieldCheck size={16} className="text-[#c51f48]" />
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0], rotate: [0, -1, 0] }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute -right-8 bottom-[22%] hidden rounded-2xl border border-white/90 bg-white/65 p-3 shadow-[0_20px_50px_rgba(105,38,57,.10)] backdrop-blur-xl sm:block"
          >
            <LockKeyhole size={16} className="text-[#c51f48]" />
          </motion.div>

          {/* Heading */}
          <div className="relative mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#c91f49] to-[#a3133b] text-white shadow-[0_16px_42px_rgba(190,24,93,.23)]">
              <LockKeyhole size={24} />
            </div>

            <div className="mb-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[.24em] text-[#b21d45]">
              <Sparkles size={11} />
              Secure recovery
            </div>

            <h1 className="text-4xl font-black tracking-[-.055em] text-[#321a21] sm:text-[46px]">
              Reset password<span className="text-[#cf2855">.</span>
            </h1>

            <p className="mx-auto mt-2 max-w-[410px] text-[12px] leading-5 text-[#8b7078]">
              Create a new password for your BloodLink AI account.
            </p>
          </div>

          {/* Main glass card */}
          <div
            style={{ padding: "30px" }}
            className="relative overflow-hidden rounded-[32px] border border-white/95 bg-white/84 shadow-[0_35px_100px_rgba(105,38,57,.16)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-rose-100/80 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-24 h-56 w-56 rounded-full bg-pink-100/75 blur-3xl" />

            <div className="relative">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-7 text-center"
                >
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-500 shadow-sm">
                    <CheckCircle2 size={34} />
                  </div>

                  <div className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-600">
                    Recovery complete
                  </div>

                  <h2 className="mt-2 text-2xl font-black text-[#321a21]">
                    Password reset successfully
                  </h2>

                  <p className="mx-auto mt-2 max-w-[320px] text-xs leading-5 text-[#8b7078]">
                    Your password has been updated. Redirecting you
                    to secure login...
                  </p>

                  <div className="mx-auto mt-6 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-emerald-100">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.8, ease: "linear" }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                </motion.div>
              ) : (
                <>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-600"
                    >
                      {error}
                    </motion.div>
                  )}

                  <form
                    onSubmit={handleSubmit}
                    autoComplete="off"
                    className="space-y-5"
                  >
                    {/* New password */}
                    <label className="block">
                      <span className="mb-2 block text-[9px] font-black uppercase tracking-[.16em] text-[#765b64]">
                        New password
                      </span>

                      <div className="relative">
                        <span className="pointer-events-none absolute left-0 top-0 z-10 flex h-[52px] w-[52px] items-center justify-center">
                          <LockKeyhole
                            size={16}
                            className="text-[#b797a0]"
                          />
                        </span>

                        <input
                          type={showPassword ? "text" : "password"}
                          name="bloodlink-new-password"
                          autoComplete="new-password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) =>
                            setPassword(e.target.value)
                          }
                          placeholder="Minimum 6 characters"
                          style={{
                            paddingLeft: "52px",
                            paddingRight: "52px",
                          }}
                          className="h-[52px] w-full rounded-2xl border border-[#eadde1] bg-white/85 text-[12px] text-[#3b252c] outline-none transition placeholder:text-[#b8a5ab] hover:border-[#e4cbd2] focus:border-[#d77d96] focus:bg-white focus:ring-4 focus:ring-rose-100"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword((prev) => !prev)
                          }
                          className="absolute right-0 top-0 z-10 flex h-[52px] w-[52px] items-center justify-center text-[#a98d95] transition hover:text-[#8f1235]"
                          aria-label={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </label>

                    {/* Confirm password */}
                    <label className="block">
                      <span className="mb-2 block text-[9px] font-black uppercase tracking-[.16em] text-[#765b64]">
                        Confirm new password
                      </span>

                      <div className="relative">
                        <span className="pointer-events-none absolute left-0 top-0 z-10 flex h-[52px] w-[52px] items-center justify-center">
                          <LockKeyhole
                            size={16}
                            className="text-[#b797a0]"
                          />
                        </span>

                        <input
                          type={
                            showConfirmPassword
                              ? "text"
                              : "password"
                          }
                          name="bloodlink-confirm-password"
                          autoComplete="new-password"
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) =>
                            setConfirmPassword(
                              e.target.value
                            )
                          }
                          placeholder="Repeat your new password"
                          style={{
                            paddingLeft: "52px",
                            paddingRight: "52px",
                          }}
                          className="h-[52px] w-full rounded-2xl border border-[#eadde1] bg-white/85 text-[12px] text-[#3b252c] outline-none transition placeholder:text-[#b8a5ab] hover:border-[#e4cbd2] focus:border-[#d77d96] focus:bg-white focus:ring-4 focus:ring-rose-100"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(
                              (prev) => !prev
                            )
                          }
                          className="absolute right-0 top-0 z-10 flex h-[52px] w-[52px] items-center justify-center text-[#a98d95] transition hover:text-[#8f1235]"
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </label>

                    <div className="rounded-2xl border border-[#f0e0e5] bg-gradient-to-r from-[#fffafa] to-[#fff5f7] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                          <ShieldCheck
                            size={16}
                            className="text-[#c51f48]"
                          />
                        </div>

                        <div>
                          <div className="text-[9px] font-black uppercase tracking-[.14em] text-[#6f555e]">
                            Secure credentials
                          </div>
                          <div className="mt-0.5 text-[9px] leading-4 text-[#9b8189]">
                            Use at least 6 characters. A mix of letters,
                            numbers and symbols is recommended.
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
                          ? "Resetting..."
                          : "Reset Password"}
                      </span>

                      {loading ? (
                        <Loader2
                          size={17}
                          className="relative animate-spin"
                        />
                      ) : (
                        <ArrowRight
                          size={17}
                          className="relative transition-transform group-hover:translate-x-1"
                        />
                      )}
                    </button>
                  </form>

                  <div className="mt-6 flex items-center justify-center gap-5 border-t border-[#f0e3e6] pt-5 text-[8px] font-black uppercase tracking-[.15em] text-[#ae949c]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck
                        size={11}
                        className="text-[#c51f48]"
                      />
                      Secure
                    </span>

                    <span className="flex items-center gap-1.5">
                      <LockKeyhole
                        size={11}
                        className="text-[#c51f48]"
                      />
                      Protected
                    </span>

                    <span className="flex items-center gap-1.5">
                      <HeartPulse
                        size={11}
                        className="text-[#c51f48]"
                      />
                      BloodLink AI
                    </span>
                  </div>
                </>
              )}
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
          <span>Secure password recovery</span>
          <span>Emergency Intelligence Platform</span>
        </div>
      </footer>
    </main>
  );
}


export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}