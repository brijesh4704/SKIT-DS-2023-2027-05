// frontend/src/app/page.tsx
"use client";

import { MapPin, Clock, ArrowRight, ShieldCheck, Heart, Users, Activity, PhoneCall, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FCFAF8] text-neutral-800 font-sans selection:bg-red-200">
      {/* Top Notification Bar */}
      <div className="w-full bg-red-700 text-white text-sm py-2 px-4 text-center font-medium">
        🚨 Urgent: Type O- and AB- blood types are currently in critical shortage in the metropolitan area. <Link href="/request-blood" className="underline hover:text-red-200">Donate today.</Link>
      </div>

      {/* Navigation */}
      <nav className="bg-[#FCFAF8] sticky top-0 z-50 border-b border-red-900/5">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center transform -rotate-6">
              <Heart className="w-7 h-7 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-neutral-900 leading-none">BloodBond</span>
              <span className="text-[10px] uppercase tracking-widest text-red-600 font-bold mt-1">Community Network</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-neutral-600">
            <Link href="#urgent-appeals" className="hover:text-red-600 transition-colors">Urgent Appeals</Link>
            <Link href="#how-it-works" className="hover:text-red-600 transition-colors">How it Works</Link>
            <Link href="#our-impact" className="hover:text-red-600 transition-colors">Our Impact</Link>
            <Link href="#stories" className="hover:text-red-600 transition-colors">Real Stories</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-neutral-900 hover:text-red-600 transition-colors hidden sm:block">
              Donor Login
            </Link>
            <Link href="/request-blood" className="px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-transform hover:scale-105 shadow-md shadow-red-600/20">
              I Need Blood
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative px-6 py-20 lg:py-32 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-10 z-10">
            <h1 className="text-5xl lg:text-7xl font-black text-neutral-900 leading-[1.1] tracking-tight">
              Your blood can be the <span className="text-red-600 relative">
                miracle
                <svg className="absolute w-full h-4 -bottom-1 left-0 text-red-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="transparent"/>
                </svg>
              </span> someone is praying for.
            </h1>
            <p className="text-xl text-neutral-600 leading-relaxed max-w-xl font-medium">
              We connect local hospitals and patients with nearby donors in real-time. No more waiting. Just community members saving each other's lives.
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <Link href="/login" className="px-8 py-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold flex items-center justify-center gap-2 transition-all text-lg shadow-xl shadow-neutral-900/20">
                Become a Donor <ArrowRight className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-4 px-2">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className={`w-12 h-12 rounded-full border-4 border-[#FCFAF8] bg-neutral-200 flex items-center justify-center overflow-hidden`}>
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="Donor" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="text-sm font-bold text-neutral-600 leading-tight">
                  Join 12,400+<br/>local heroes
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 relative w-full flex justify-center">
            {/* Realistic Image Placeholder */}
            <div className="relative w-full max-w-lg aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-neutral-200 border-8 border-white">
              <img 
                src="https://images.unsplash.com/photo-1615461066841-6116e6e05814?q=80&w=1000&auto=format&fit=crop" 
                alt="Nurse caring for patient" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-sm font-bold tracking-wider uppercase">Live Update</span>
                </div>
                <p className="font-medium text-lg leading-snug">"Thanks to BloodBond, we found a rare B- donor for my father in under 15 minutes."</p>
              </div>
            </div>
            
            {/* Floating UI Card */}
            <div className="absolute -left-12 top-20 bg-white p-5 rounded-2xl shadow-xl border border-neutral-100 hidden md:flex flex-col gap-3 animate-[y-bounce_6s_ease-in-out_infinite]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-black text-lg">A+</div>
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Match Found</p>
                  <p className="text-sm font-bold text-neutral-900">City General Hospital</p>
                </div>
              </div>
              <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> Donor is 5 mins away
              </div>
            </div>
          </div>
        </section>

        {/* Urgent Appeals Section */}
        <section id="urgent-appeals" className="bg-red-50 py-24 border-y border-red-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-4xl font-black text-neutral-900 mb-4">Urgent Appeals Near You</h2>
                <p className="text-lg text-neutral-600 font-medium">These patients are currently waiting for blood in local hospitals. If you match their blood type, you can save their life today.</p>
              </div>
              <Link href="/request-blood" className="text-red-600 font-bold flex items-center gap-1 hover:text-red-700">
                View all appeals <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AppealCard name="Baby Emma" hospital="St. Jude Children's" type="O-" time="2 hours ago" urgent={true} />
              <AppealCard name="Mr. Robert Davis" hospital="Metro General Surgery" type="AB+" time="5 hours ago" urgent={false} />
              <AppealCard name="Emergency Trauma" hospital="City Center Hospital" type="A+" time="Just now" urgent={true} />
            </div>
          </div>
        </section>

        {/* How it Works / The Process */}
        <section id="how-it-works" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-neutral-900 mb-6">How local heroes are made</h2>
            <p className="text-lg text-neutral-600 font-medium">We've removed the friction from blood donation by bridging the gap directly between the hospital ward and the local neighborhood.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-neutral-200 -z-10"></div>

            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white border-4 border-red-100 rounded-full flex items-center justify-center shadow-lg mb-6 text-red-600">
                <PhoneCall className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">1. The Call for Help</h3>
              <p className="text-neutral-600 font-medium leading-relaxed">A hospital or patient creates an urgent request specifying the exact blood type and hospital location.</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white border-4 border-red-100 rounded-full flex items-center justify-center shadow-lg mb-6 text-red-600">
                <MapPin className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">2. Local Matching</h3>
              <p className="text-neutral-600 font-medium leading-relaxed">Our system instantly pings registered, eligible donors who are currently within a 10-mile radius.</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white border-4 border-red-100 rounded-full flex items-center justify-center shadow-lg mb-6 text-red-600">
                <Heart className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">3. Life is Saved</h3>
              <p className="text-neutral-600 font-medium leading-relaxed">A donor accepts the ping, heads to the hospital, and provides the life-saving blood exactly when needed.</p>
            </div>
          </div>
        </section>

        {/* Real Stories */}
        <section id="stories" className="bg-neutral-900 text-white py-24">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Heart className="w-12 h-12 text-red-500 fill-red-500" />
              <h2 className="text-4xl lg:text-5xl font-black leading-tight">
                "I never realized how easy it was to save a life until I got the text."
              </h2>
              <p className="text-xl text-neutral-400 font-medium">
                "I was grabbing coffee when my phone buzzed. Someone three blocks away at the surgical center needed O-negative immediately. I walked over, donated, and was back to my day in an hour. Knowing I kept a family whole that day changed my life forever."
              </p>
              <div className="flex items-center gap-4 pt-4">
                <img src="https://i.pravatar.cc/100?img=33" alt="Marcus" className="w-14 h-14 rounded-full border-2 border-neutral-700" />
                <div>
                  <div className="font-bold text-lg">Marcus T.</div>
                  <div className="text-red-400 font-bold text-sm">Donated 4 times</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800&auto=format&fit=crop" className="rounded-3xl w-full h-64 object-cover" alt="Hospital" />
              <img src="https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=800&auto=format&fit=crop" className="rounded-3xl w-full h-64 object-cover mt-12" alt="Community" />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <h2 className="text-5xl md:text-6xl font-black text-neutral-900 tracking-tight">The community needs you.</h2>
            <p className="text-xl text-neutral-600 font-medium max-w-2xl mx-auto">
              It takes 2 minutes to register. We will only contact you when someone in your immediate area faces a critical emergency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button className="px-10 py-5 rounded-2xl bg-red-600 text-white font-black text-lg hover:bg-red-700 transition-transform hover:scale-105 shadow-xl shadow-red-600/20">
                Register as a Donor
              </button>
              <button className="px-10 py-5 rounded-2xl bg-white border-2 border-neutral-200 text-neutral-900 font-black text-lg hover:bg-neutral-50 transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-neutral-200 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-600 fill-red-600" />
                <span className="text-2xl font-black tracking-tight text-neutral-900">BloodBond</span>
              </div>
              <p className="text-neutral-500 font-medium max-w-sm leading-relaxed">
                A non-profit community initiative leveraging local networks to eliminate blood shortages during medical emergencies.
              </p>
            </div>
            
            <div>
              <h4 className="font-black text-neutral-900 mb-6 uppercase tracking-wider text-sm">For Donors</h4>
              <ul className="space-y-4 font-medium text-neutral-500">
                <li><a href="#" className="hover:text-red-600">Register</a></li>
                <li><a href="#" className="hover:text-red-600">Eligibility Guidelines</a></li>
                <li><a href="#" className="hover:text-red-600">Success Stories</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-neutral-900 mb-6 uppercase tracking-wider text-sm">For Hospitals</h4>
              <ul className="space-y-4 font-medium text-neutral-500">
                <li><a href="#" className="hover:text-red-600">Partner with Us</a></li>
                <li><a href="#" className="hover:text-red-600">Request Dashboard</a></li>
                <li><a href="#" className="hover:text-red-600">Contact Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-neutral-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-neutral-400">
            <p>© 2026 BloodBond Community Network. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-neutral-900">Privacy Policy</a>
              <a href="#" className="hover:text-neutral-900">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AppealCard({ name, hospital, type, time, urgent }: { name: string, hospital: string, type: string, time: string, urgent: boolean }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 flex flex-col gap-5 hover:shadow-xl hover:shadow-red-900/5 transition-all">
      <div className="flex justify-between items-start">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 font-black text-2xl flex items-center justify-center border border-red-100">
          {type}
        </div>
        {urgent && (
          <div className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
            <Activity className="w-3 h-3" /> Critical
          </div>
        )}
      </div>
      
      <div>
        <h3 className="font-black text-xl text-neutral-900 mb-1">{name}</h3>
        <p className="text-neutral-500 font-medium flex items-center gap-1.5 text-sm">
          <MapPin className="w-4 h-4" /> {hospital}
        </p>
      </div>

      <div className="mt-auto pt-5 border-t border-neutral-100 flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
          <Clock className="w-3 h-3" /> {time}
        </span>
        <button className="text-red-600 font-bold hover:text-red-700 text-sm flex items-center gap-1">
          Respond <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
