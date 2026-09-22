"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  HeartPulse,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import BloodCells3D from "@/components/BloodCells3D";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] =
    useState("");

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [countdown, setCountdown] =
    useState(60);

  const [verified, setVerified] =
    useState(false);

  const inputs = useRef<
    (HTMLInputElement | null)[]
  >([]);

  useEffect(() => {
    const queryEmail =
      params.get("email");

    const storedEmail =
      sessionStorage.getItem(
        "verificationEmail"
      );

    setEmail(
      queryEmail ||
        storedEmail ||
        ""
    );

    setTimeout(() => {
      inputs.current[0]?.focus();
    }, 300);
  }, [params]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(
        (value) => value - 1
      );
    }, 1000);

    return () =>
      clearInterval(timer);
  }, [countdown]);

  const maskedEmail = () => {
    if (!email.includes("@")) {
      return email;
    }

    const [name, domain] =
      email.split("@");

    if (name.length <= 2) {
      return `${name[0] || ""}***@${domain}`;
    }

    return `${name[0]}${"*".repeat(
      Math.min(
        name.length - 1,
        5
      )
    )}@${domain}`;
  };

  const changeOtp = (
    index: number,
    value: string
  ) => {
    setError("");

    const numbers = value
      .replace(/\D/g, "")
      .slice(0, 6);

    if (numbers.length > 1) {
      const next = [
        "",
        "",
        "",
        "",
        "",
        "",
      ];

      numbers
        .split("")
        .forEach(
          (digit, i) => {
            next[i] = digit;
          }
        );

      setOtp(next);

      inputs.current[
        Math.min(
          numbers.length,
          5
        )
      ]?.focus();

      return;
    }

    const next = [...otp];

    next[index] = numbers;

    setOtp(next);

    if (
      numbers &&
      index < 5
    ) {
      inputs.current[
        index + 1
      ]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      e.key ===
        "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      const next = [...otp];

      next[index - 1] = "";

      setOtp(next);

      inputs.current[
        index - 1
      ]?.focus();
    }

    if (
      e.key ===
        "ArrowLeft" &&
      index > 0
    ) {
      inputs.current[
        index - 1
      ]?.focus();
    }

    if (
      e.key ===
        "ArrowRight" &&
      index < 5
    ) {
      inputs.current[
        index + 1
      ]?.focus();
    }

    if (e.key === "Enter") {
      verifyEmail();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();

    const value =
      e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

    if (!value) return;

    const next = [
      "",
      "",
      "",
      "",
      "",
      "",
    ];

    value
      .split("")
      .forEach(
        (digit, i) => {
          next[i] = digit;
        }
      );

    setOtp(next);

    inputs.current[
      Math.min(
        value.length,
        5
      )
    ]?.focus();
  };

  const verifyEmail =
    async () => {
      setError("");

      const code =
        otp.join("");

      if (!email) {
        setError(
          "Verification email was not found."
        );
        return;
      }

      if (code.length !== 6) {
        setError(
          "Enter the complete 6-digit OTP."
        );
        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            `${API_URL}/api/auth/verify-email-otp`,
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
                otp: code,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Invalid OTP."
          );
        }

        setVerified(true);

        sessionStorage.removeItem(
          "verificationEmail"
        );

        sessionStorage.removeItem(
          "verificationRole"
        );

        setTimeout(() => {
          router.push(
            "/login?verified=1"
          );
        }, 2200);
      } catch (err: any) {
        setError(
          err.message ||
            "Verification failed."
        );

        setOtp([
          "",
          "",
          "",
          "",
          "",
          "",
        ]);

        setTimeout(() => {
          inputs.current[0]?.focus();
        }, 100);
      } finally {
        setLoading(false);
      }
    };

  const resendOtp =
    async () => {
      if (
        countdown > 0 ||
        resending ||
        !email
      ) {
        return;
      }

      try {
        setResending(true);
        setError("");

        const response =
          await fetch(
            `${API_URL}/api/auth/resend-email-otp`,
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
          throw new Error(
            data.message ||
              "Unable to resend OTP."
          );
        }

        setOtp([
          "",
          "",
          "",
          "",
          "",
          "",
        ]);

        setCountdown(60);

        setTimeout(() => {
          inputs.current[0]?.focus();
        }, 100);
      } catch (err: any) {
        setError(
          err.message ||
            "Unable to resend OTP."
        );
      } finally {
        setResending(false);
      }
    };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7f8] text-[#24191c]">
      <BloodCells3D />

      {/* Header */}
      <header className="relative z-20 flex w-full items-center justify-between px-6 py-5 sm:px-10">
        <button
          onClick={() =>
            router.push("/register")
          }
          className="flex items-center gap-2 text-xs font-medium text-[#725e63] transition hover:text-[#b91c3c]"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b91c3c] text-white">
            <HeartPulse size={18} />
          </div>

          <div className="hidden text-left sm:block">
            <div className="text-[14px] font-bold">
              BloodLink{" "}
              <span className="text-[#c41e3a]">
                AI
              </span>
            </div>

            <div className="text-[7px] uppercase tracking-[.2em] text-[#947d83]">
              Emergency Intelligence
            </div>
          </div>
        </div>
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
          className="mx-auto w-full max-w-[550px]"
        >
          {!verified ? (
            <>
              {/* Heading */}
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-white/85 text-[#b91c3c] shadow-[0_12px_35px_rgba(185,28,60,.10)]">
                  <Mail size={24} />
                </div>

                <div className="mb-2 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.2em] text-[#b91c3c]">
                  <Sparkles size={11} />
                  Secure verification
                </div>

                <h1 className="text-[31px] font-bold tracking-[-.045em] sm:text-[37px]">
                  Verify your email
                </h1>

                <p className="mt-2 text-[13px] text-[#806d72]">
                  Enter the 6-digit code sent to
                </p>

                <p className="mt-1 text-[13px] font-semibold text-[#4e3b40]">
                  {maskedEmail()}
                </p>
              </div>

              {/* CARD */}
              <div className="mx-auto w-full rounded-[25px] border border-white/90 bg-white/82 p-6 shadow-[0_30px_80px_rgba(116,35,53,.13)] backdrop-blur-2xl sm:p-8">
                {/* OTP */}
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otp.map(
                    (
                      digit,
                      index
                    ) => (
                      <motion.input
                        key={index}
                        ref={(el) => {
                          inputs.current[
                            index
                          ] = el;
                        }}
                        value={digit}
                        onChange={(
                          e
                        ) =>
                          changeOtp(
                            index,
                            e.target
                              .value
                          )
                        }
                        onKeyDown={(
                          e
                        ) =>
                          handleKeyDown(
                            index,
                            e
                          )
                        }
                        onPaste={
                          handlePaste
                        }
                        inputMode="numeric"
                        maxLength={6}
                        className={`h-14 w-10 rounded-xl border bg-white text-center text-xl font-bold outline-none transition sm:h-16 sm:w-[49px] ${
                          error
                            ? "border-red-300 bg-red-50 text-red-600"
                            : digit
                              ? "border-[#d48191] bg-[#fff3f5] text-[#a71937]"
                              : "border-[#eadfe1] focus:border-[#d28a98] focus:ring-4 focus:ring-rose-100"
                        }`}
                      />
                    )
                  )}
                </div>

                <p className="mt-3 text-center text-[10px] text-[#aa969b]">
                  You can paste the complete
                  6-digit code.
                </p>

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
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs text-red-600"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  onClick={
                    verifyEmail
                  }
                  disabled={loading}
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#b91c3c] text-sm font-semibold text-white shadow-[0_14px_35px_rgba(185,28,60,.20)] transition hover:bg-[#a91635] disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck
                        size={17}
                      />
                      Verify email
                    </>
                  )}
                </button>

                {/* Resend */}
                <div className="mt-5 text-center">
                  <p className="text-[11px] text-[#a18c91]">
                    Didn&apos;t receive
                    the code?
                  </p>

                  <button
                    onClick={
                      resendOtp
                    }
                    disabled={
                      countdown >
                        0 ||
                      resending
                    }
                    className={`mt-1.5 text-xs font-semibold ${
                      countdown >
                        0 ||
                      resending
                        ? "text-[#c2b3b7]"
                        : "text-[#b91c3c]"
                    }`}
                  >
                    {resending
                      ? "Sending..."
                      : countdown >
                          0
                        ? `Resend in ${countdown}s`
                        : "Resend verification code"}
                  </button>
                </div>

                <div className="mt-6 flex justify-center gap-2 border-t border-[#f0e3e5] pt-5 text-[9px] uppercase tracking-[.13em] text-[#aa969b]">
                  <ShieldCheck
                    size={12}
                  />
                  Secure email verification
                </div>
              </div>
            </>
          ) : (
            /* SUCCESS */
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.94,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              className="mx-auto rounded-[25px] border border-white/90 bg-white/82 px-6 py-12 text-center shadow-[0_30px_80px_rgba(116,35,53,.13)] backdrop-blur-2xl"
            >
              <motion.div
                initial={{
                  scale: 0,
                }}
                animate={{
                  scale: 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-100"
              >
                <Check
                  size={34}
                  strokeWidth={2.5}
                />
              </motion.div>

              <div className="mt-6 text-[9px] font-bold uppercase tracking-[.22em] text-emerald-600">
                Verification complete
              </div>

              <h2 className="mt-2 text-[31px] font-bold tracking-[-.045em]">
                Email verified
              </h2>

              <p className="mx-auto mt-2 max-w-[390px] text-[13px] leading-5 text-[#806d72]">
                Your BloodLink AI account
                is secured. Redirecting
                you to login...
              </p>

              <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[#9b878c]">
                <CheckCircle2
                  size={14}
                  className="text-emerald-500"
                />
                Account verification
                successful
              </div>
            </motion.div>
          )}

          <p className="mt-4 text-center text-[9px] uppercase tracking-[.18em] text-[#b49da2]">
            BloodLink AI • Emergency Intelligence Network
          </p>
        </motion.div>
      </section>
    </main>
  );
}