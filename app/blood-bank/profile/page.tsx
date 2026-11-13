"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Phone, MapPin, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function BloodBankProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bloodlink_user");
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || (parsed.role && parsed.role !== "BLOOD_BANK")) {
        router.replace("/login");
        return;
      }
      setUser(parsed);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  async function refreshProfile() {
    const token = localStorage.getItem("bloodlink_token") || localStorage.getItem("token");
    if (!token) {
      setMessage("Showing saved account details.");
      return;
    }

    setRefreshing(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Could not refresh profile");
      const data = await response.json();
      const fresh = data?.user || data?.data || data;
      if (fresh && typeof fresh === "object") {
        localStorage.setItem("bloodlink_user", JSON.stringify(fresh));
        setUser(fresh);
        setMessage("Profile updated successfully.");
      } else {
        setMessage("Showing saved account details.");
      }
    } catch {
      setMessage("Live refresh unavailable. Showing saved account details.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-rose-50 text-rose-900">Loading profile...</main>;
  }

  const name = user?.name || user?.hospitalName || user?.bloodBankName || "Blood Bank";
  const city = user?.city || user?.address?.city || "—";
  const state = user?.state || user?.address?.state || "—";

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-100 px-5 py-10 text-slate-800">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => router.push("/blood-bank")} className="mb-7 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-50">
          <ArrowLeft size={16} /> Back to Overview
        </button>

        <section className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-xl shadow-rose-200/40">
          <div className="relative bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 px-7 py-10 text-white sm:px-10">
            <div className="absolute -right-8 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
            <div className="relative flex flex-wrap items-center gap-5">
              <div className="grid h-20 w-20 place-items-center rounded-2xl border border-white/30 bg-white/15 shadow-lg">
                <Building2 size={38} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-100">BloodLink AI · Account</p>
                <h1 className="mt-2 text-3xl font-bold sm:text-4xl">My Profile</h1>
                <p className="mt-2 text-sm text-rose-100">Your blood bank identity and account details</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Account information</h2>
                <p className="mt-1 text-sm text-slate-500">Details saved with your current login session.</p>
              </div>
              <button onClick={refreshProfile} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing..." : "Refresh details"}
              </button>
            </div>

            {message && <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p>}

            <div className="mb-7 flex items-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-5">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-rose-600 text-xl font-bold text-white">
                {String(name).slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-lg font-bold text-slate-900">{name}</h3>
                <p className="mt-1 text-sm text-slate-500">Blood Bank Administrator</p>
              </div>
              <ShieldCheck className="shrink-0 text-emerald-600" size={25} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Account name", value: name, icon: Building2 },
                { label: "Email address", value: user?.email || "Not provided", icon: Mail },
                { label: "Phone number", value: user?.phone || user?.mobile || "Not provided", icon: Phone },
                { label: "City", value: city, icon: MapPin },
                { label: "State", value: state, icon: MapPin },
                { label: "Account role", value: user?.role || "BLOOD_BANK", icon: ShieldCheck },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-rose-200 hover:shadow-md">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Icon size={17} className="text-rose-600" /> {label}
                  </div>
                  <p className="break-words font-semibold text-slate-900">{String(value)}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => router.push("/blood-bank/settings")} className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700">
                Workspace Settings
              </button>
              <button onClick={() => router.push("/blood-bank")} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Return to Dashboard
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
