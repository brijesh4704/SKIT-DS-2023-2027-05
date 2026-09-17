// frontend/src/app/request-blood/page.tsx
"use client";

import { Heart, MapPin, Phone, User, Activity, CheckCircle2, ChevronRight, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function RequestBlood() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-[#FCFAF8] text-neutral-900 font-sans flex flex-col selection:bg-red-200">
      
      {/* Navigation */}
      <nav className="w-full bg-white border-b-2 border-neutral-100 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center transform -rotate-6">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-neutral-900 leading-none">BloodBond</span>
          </Link>
          <div className="hidden md:flex items-center gap-4 text-sm font-bold uppercase tracking-widest">
            <span className={step >= 1 ? "text-red-600" : "text-neutral-300"}>1. Details</span>
            <ChevronRight className="w-4 h-4 text-neutral-300" />
            <span className={step >= 2 ? "text-red-600" : "text-neutral-300"}>2. Location</span>
            <ChevronRight className="w-4 h-4 text-neutral-300" />
            <span className={step >= 3 ? "text-red-600" : "text-neutral-300"}>3. Search</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 py-12">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border-4 border-white overflow-hidden">
          
          <div className="p-8 md:p-14">
            <div className="mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-100 text-red-700 text-xs font-black uppercase tracking-widest mb-4">
                Emergency Form
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4 text-neutral-900 tracking-tight">Request Blood</h1>
              <p className="text-lg text-neutral-500 font-medium leading-relaxed">
                We will instantly alert compatible donors in your local area. Please ensure all details are perfectly accurate to avoid delays.
              </p>
            </div>

            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Patient's Full Name</label>
                    <div className="relative">
                      <input type="text" className="w-full h-14 bg-neutral-50 border-2 border-neutral-200 rounded-xl px-4 pl-12 text-neutral-900 font-medium placeholder-neutral-400 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all outline-none" placeholder="Priya Sharma" />
                      <User className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Contact Number</label>
                    <div className="relative">
                      <input type="tel" className="w-full h-14 bg-neutral-50 border-2 border-neutral-200 rounded-xl px-4 pl-12 text-neutral-900 font-medium placeholder-neutral-400 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all outline-none" placeholder="+91 98765 43210" />
                      <Phone className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Blood Type Required</label>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <button key={bg} className="h-14 rounded-xl border-2 border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-black text-lg transition-all focus:bg-red-600 focus:border-red-600 focus:text-white shadow-sm">
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Units Required (Pints)</label>
                  <input type="number" min="1" max="10" defaultValue="1" className="w-full md:w-1/3 h-14 bg-neutral-50 border-2 border-neutral-200 rounded-xl px-4 text-neutral-900 font-bold focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all outline-none" />
                </div>

                <div className="pt-8">
                  <button onClick={() => setStep(2)} className="w-full h-16 rounded-xl bg-neutral-900 text-white font-black text-lg hover:bg-black transition-transform hover:scale-[1.01] flex items-center justify-center gap-2 shadow-xl shadow-neutral-900/20">
                    Next Step: Location
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="p-5 rounded-2xl bg-blue-50 border-2 border-blue-100 flex items-start gap-4">
                  <div className="bg-blue-600 rounded-full p-1.5 shrink-0 mt-0.5">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1">Location Precision is Critical</h4>
                    <p className="text-sm text-blue-800 font-medium leading-relaxed">
                      Our donors rely on accurate hospital locations to respond immediately. Please ensure the address and ward information is exact.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Hospital / Clinic Name</label>
                  <div className="relative">
                    <input type="text" className="w-full h-14 bg-neutral-50 border-2 border-neutral-200 rounded-xl px-4 pl-12 text-neutral-900 font-medium placeholder-neutral-400 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all outline-none" placeholder="AIIMS Trauma Centre" />
                    <Activity className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Full Address & Ward Info</label>
                  <div className="relative">
                    <textarea className="w-full h-32 bg-neutral-50 border-2 border-neutral-200 rounded-xl p-4 pl-12 text-neutral-900 font-medium placeholder-neutral-400 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all outline-none resize-none" placeholder="Ring Road, Ansari Nagar, Ward 4B..." />
                    <MapPin className="w-5 h-5 text-neutral-400 absolute left-4 top-5" />
                  </div>
                </div>
                
                <div className="pt-8 flex flex-col sm:flex-row gap-4">
                  <button onClick={() => setStep(1)} className="w-full sm:w-1/3 h-16 rounded-xl bg-white border-2 border-neutral-200 text-neutral-700 font-black text-lg hover:bg-neutral-50 transition-colors">
                    Go Back
                  </button>
                  <button onClick={() => setStep(3)} className="w-full sm:w-2/3 h-16 rounded-xl bg-red-600 text-white font-black text-lg hover:bg-red-700 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-xl shadow-red-600/20">
                    <AlertTriangle className="w-5 h-5" /> Submit Emergency Request
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="py-12 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="w-32 h-32 relative mb-2">
                  <div className="absolute inset-0 rounded-full border-8 border-red-50"></div>
                  <div className="absolute inset-0 rounded-full border-8 border-red-600 border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Heart className="w-10 h-10 text-red-600 animate-pulse fill-red-600" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-3xl font-black mb-4 text-neutral-900">Alerting Local Donors...</h3>
                  <p className="text-lg text-neutral-500 font-medium max-w-md mx-auto leading-relaxed">
                    We are currently notifying eligible donors in your area via SMS and Push Notification. Hold tight, help is on the way.
                  </p>
                </div>

                <div className="w-full max-w-md bg-white rounded-2xl p-6 border-2 border-neutral-100 text-left space-y-5 mt-8 shadow-lg">
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <span className="text-base font-bold text-neutral-900">Request broadcasted</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <span className="text-base font-bold text-neutral-900">12 eligible donors found nearby</span>
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="w-6 h-6 rounded-full border-4 border-red-600 border-t-transparent animate-spin shrink-0"></div>
                    <span className="text-base font-black text-red-600">Waiting for a donor to accept...</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
