"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  HeartPulse,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import BloodCells3D from "@/components/BloodCells3D";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [resetToken, setResetToken] =
    useState("");

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setResetToken("");

    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/auth/forgot-password`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            email: email
              .trim()
              .toLowerCase(),
          }),
        }
      );

      const data =
        await response.json();

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
        setResetToken(
          data.resetToken
        );
      }

    } catch (err) {
      console.error(
        "Forgot password error:",
        err
      );

      setError(
        "Unable to connect to BloodLink AI server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7f8]">

      <div className="pointer-events-none fixed inset-0">
        <BloodCells3D />
      </div>

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
          className="w-full max-w-[460px]"
        >

          <button
            type="button"
            onClick={() =>
              router.push("/login")
            }
            className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-rose-600"
          >
            <ArrowLeft size={16} />
            Back to login
          </button>

          <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_30px_80px_rgba(190,24,93,0.13)] backdrop-blur-2xl sm:p-8">

            <div className="mb-6 text-center">

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <HeartPulse size={25} />
              </div>

              <h1 className="text-3xl font-black text-slate-900">
                Forgot Password?
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your registered email and
                we'll generate a password reset link.
              </p>

            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>

                <div className="relative">

                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                  />

                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
              >

                {loading ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    Send Reset Request
                    <ArrowRight size={17} />
                  </>
                )}

              </button>

            </form>

            {/* DEVELOPMENT RESET TOKEN */}
            {resetToken && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">

                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
                  <ShieldCheck size={17} />
                  Development Reset Token
                </div>

                <p className="mb-3 break-all rounded-lg bg-white p-3 font-mono text-[11px] text-slate-700">
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
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 text-sm font-bold text-white hover:bg-amber-700"
                >
                  Continue to Reset Password
                  <ArrowRight size={16} />
                </button>

                <p className="mt-3 text-[11px] leading-5 text-amber-700">
                  Ye token sirf local development
                  ke liye backend se aa raha hai.
                  Production mein ise email provider
                  ke through bhejna chahiye.
                </p>

              </div>
            )}

          </div>

        </motion.div>
      </div>
    </main>
  );
}