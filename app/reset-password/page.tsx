"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
} from "lucide-react";

import BloodCells3D from "@/components/BloodCells3D";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();

  const token =
    params.get("token") || "";

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    if (!token) {
      setError(
        "Password reset token is missing."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
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
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to reset password."
        );
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        router.replace("/login");
      }, 1800);

    } catch (err) {
      console.error(
        "Reset password error:",
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
                Reset Password
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Create a new password for your
                BloodLink AI account.
              </p>

            </div>

            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">

                <CheckCircle2
                  size={42}
                  className="mx-auto mb-3 text-emerald-500"
                />

                <h2 className="font-bold text-emerald-800">
                  Password Reset Successfully
                </h2>

                <p className="mt-2 text-sm text-emerald-700">
                  Redirecting you to login...
                </p>

              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >

                  {/* PASSWORD */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      New Password
                    </label>

                    <div className="relative">

                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                      <input
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) =>
                          setPassword(
                            e.target.value
                          )
                        }
                        placeholder="Minimum 6 characters"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (prev) =>
                              !prev
                          )
                        }
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>

                    </div>
                  </div>

                  {/* CONFIRM */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Confirm New Password
                    </label>

                    <div className="relative">

                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                      <input
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        required
                        minLength={6}
                        value={
                          confirmPassword
                        }
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value
                          )
                        }
                        placeholder="Repeat new password"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (prev) =>
                              !prev
                          )
                        }
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>

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
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}

                  </button>

                </form>
              </>
            )}

          </div>

        </motion.div>
      </div>
    </main>
  );
}