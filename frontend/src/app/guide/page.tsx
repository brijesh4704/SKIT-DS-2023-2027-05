// frontend/src/app/guide/page.tsx
"use client";

import { Heart, Activity, MapPin, CheckCircle2, PhoneCall, ChevronRight, Search, ShieldCheck, Car } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Guide() {
  const [activeTab, setActiveTab] = useState<"donors" | "patients">("donors");

  return (
    <div className="min-h-screen bg-[#FCFAF8] text-neutral-900 font-sans selection:bg-red-200">
      
      {/* Navigation */}
      <nav className="bg-white border-b-2 border-neutral-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center transform -rotate-6">
              <Heart className="w-7 h-7 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-neutral-900 leading-none">BloodBond</span>
              <span className="text-[10px] uppercase tracking-widest text-red-600 font-bold mt-1">Community Network</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-neutral-600">
            <Link href="/" className="hover:text-red-600 transition-colors">Home</Link>
            <Link href="/guide" className="text-red-600 transition-colors">Platform Guide</Link>
            <Link href="/login" className="hover:text-red-600 transition-colors">Donor Login</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/request-blood" className="px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-transform hover:scale-105 shadow-md shadow-red-600/20">
              I Need Blood
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="bg-neutral-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-800 text-red-400 text-sm font-bold uppercase tracking-widest">
            <Search className="w-4 h-4" /> Official Guide
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">How to use BloodBond</h1>
          <p className="text-xl text-neutral-400 font-medium leading-relaxed">
            Whether you are here to save a life or request an emergency blood donation, here is everything you need to know about navigating the community network.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-10">
        <div className="bg-white p-2 rounded-2xl shadow-xl flex gap-2 border-2 border-neutral-100">
          <button 
            onClick={() => setActiveTab("donors")}
            className={`flex-1 py-4 text-center rounded-xl font-black text-lg transition-all ${activeTab === "donors" ? 'bg-red-50 text-red-600 border border-red-100' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            I am a Donor
          </button>
          <button 
            onClick={() => setActiveTab("patients")}
            className={`flex-1 py-4 text-center rounded-xl font-black text-lg transition-all ${activeTab === "patients" ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            I am a Patient / Hospital
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-20">
        
        {activeTab === "donors" && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-neutral-900">Your Journey as a Donor</h2>
              <p className="text-lg text-neutral-600 font-medium">As a donor on BloodBond, you are a passive lifesaver. You don't need to check the app daily. We will only alert you when a critical situation happens near you.</p>
            </div>

            <div className="space-y-12">
              <StepCard 
                number={1}
                title="Create your Profile & Set Status"
                desc="When you register, you input your blood type and general location (zip code). In your Donor Dashboard, you can toggle your status to 'Available' or 'Unavailable'. If you go on vacation or recently donated, just toggle yourself off!"
                icon={<ShieldCheck className="w-8 h-8 text-red-600" />}
              />
              <StepCard 
                number={2}
                title="The Emergency Alert"
                desc="When a hospital within a 15-km radius physically runs out of your specific blood type, you will receive a push notification and SMS. It will tell you the exact hospital and how far away it is."
                icon={<Activity className="w-8 h-8 text-red-600" />}
              />
              <StepCard 
                number={3}
                title="Accepting & Free Transit"
                desc="Click 'Accept' on the alert. If you don't have a vehicle, you can click 'Request Ride', and one of our community volunteer drivers will pick you up within 10 minutes to take you to the hospital."
                icon={<Car className="w-8 h-8 text-red-600" />}
              />
              <StepCard 
                number={4}
                title="Track Your Blood"
                desc="After you donate, return to your Dashboard. Our Live Journey feature will show you exactly when your blood is tested, processed, and ultimately transfused into the patient. You get to see the direct result of your heroism."
                icon={<CheckCircle2 className="w-8 h-8 text-red-600" />}
              />
            </div>
            
            <div className="bg-red-50 border-2 border-red-100 p-8 rounded-3xl mt-12 text-center">
              <h3 className="text-2xl font-black text-red-900 mb-4">Ready to step up?</h3>
              <Link href="/login" className="inline-block px-8 py-4 rounded-xl bg-red-600 text-white font-black text-lg hover:bg-red-700 transition-transform hover:scale-105 shadow-xl shadow-red-600/20">
                Register Now
              </Link>
            </div>
          </div>
        )}

        {activeTab === "patients" && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-neutral-900">Requesting Emergency Blood</h2>
              <p className="text-lg text-neutral-600 font-medium">When blood banks run dry, BloodBond connects you directly to the local community. The process is designed to be as fast and frictionless as possible during high-stress situations.</p>
            </div>

            <div className="space-y-12">
              <StepCard 
                number={1}
                title="Submit the Emergency Form"
                desc="Click 'I Need Blood' anywhere on the site. You will be asked for the patient's name, the exact blood type required, and the precise hospital and ward location. No account creation is required for patients to save time."
                icon={<PhoneCall className="w-8 h-8 text-blue-600" />}
                color="blue"
              />
              <StepCard 
                number={2}
                title="The AI Matching Engine"
                desc="Our system instantly scans our database for registered, eligible donors who are currently marked as 'Available' and are located within a 15-km radius of your specified hospital."
                icon={<MapPin className="w-8 h-8 text-blue-600" />}
                color="blue"
              />
              <StepCard 
                number={3}
                title="Broadcast & Acceptance"
                desc="Alerts are sent out simultaneously. On your screen, you will see a live radar showing how many donors were notified. As soon as a donor clicks 'Accept', you will be notified that help is on the way."
                icon={<Activity className="w-8 h-8 text-blue-600" />}
                color="blue"
              />
            </div>
            
            <div className="bg-blue-50 border-2 border-blue-100 p-8 rounded-3xl mt-12 text-center">
              <h3 className="text-2xl font-black text-blue-900 mb-4">Are you in an emergency right now?</h3>
              <Link href="/request-blood" className="inline-block px-8 py-4 rounded-xl bg-blue-600 text-white font-black text-lg hover:bg-blue-700 transition-transform hover:scale-105 shadow-xl shadow-blue-600/20">
                Create Urgent Request
              </Link>
            </div>
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-neutral-200 py-12 text-center mt-20">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-red-600 fill-red-600" />
          <span className="font-bold text-neutral-900 text-lg">BloodBond</span>
        </div>
        <p className="text-neutral-500 font-medium text-sm">© 2026 BloodBond Community Initiative. All rights reserved.</p>
      </footer>
    </div>
  );
}

function StepCard({ number, title, desc, icon, color = "red" }: { number: number, title: string, desc: string, icon: React.ReactNode, color?: "red" | "blue" }) {
  const bgColor = color === "red" ? "bg-red-50" : "bg-blue-50";
  const borderColor = color === "red" ? "border-red-100" : "border-blue-100";
  const numColor = color === "red" ? "text-red-200" : "text-blue-200";

  return (
    <div className={`relative p-8 md:p-10 rounded-3xl border-2 ${borderColor} ${bgColor} flex flex-col md:flex-row gap-8 items-start`}>
      <div className="absolute -top-6 -right-4 text-[120px] font-black leading-none opacity-50 z-0 select-none pointer-events-none" style={{ color: color === 'red' ? '#FEE2E2' : '#DBEAFE' }}>
        {number}
      </div>
      <div className={`w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg shrink-0 relative z-10 ${borderColor} border-2`}>
        {icon}
      </div>
      <div className="relative z-10">
        <h3 className="text-2xl font-black text-neutral-900 mb-3">{title}</h3>
        <p className="text-neutral-600 font-medium text-lg leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
