"use client";

import { Activity, Droplets, MapPin, Settings, LogOut, Heart, Clock, Bell, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Dashboard() {
  const [isAvailable, setIsAvailable] = useState(true);

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-neutral-900 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-neutral-200 flex flex-col justify-between sticky top-0 md:h-screen z-50">
        <div>
          <Link href="/" className="flex items-center gap-2 p-6 border-b border-neutral-100">
            <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center transform -rotate-6">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-neutral-900">BloodBond</span>
          </Link>
          
          <nav className="p-4 space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold">
              <Activity className="w-5 h-5" /> Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-600 font-bold hover:bg-neutral-50 transition-colors">
              <Clock className="w-5 h-5" /> Donation History
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-600 font-bold hover:bg-neutral-50 transition-colors">
              <Bell className="w-5 h-5" /> Alerts & Requests
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-600 font-bold hover:bg-neutral-50 transition-colors">
              <User className="w-5 h-5" /> Profile Settings
            </a>
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-100">
          <Link href="/login" className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-600 font-bold hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-5 h-5" /> Log Out
          </Link>
        </div>
      </aside>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-6 lg:p-10">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 mb-1">Welcome back, Priya!</h1>
            <p className="text-neutral-500 font-medium">You are currently making a huge difference in Mumbai, MH.</p>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-neutral-200 pr-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg ${isAvailable ? 'bg-green-500' : 'bg-neutral-300'}`}>
              O-
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Status</p>
              <button 
                onClick={() => setIsAvailable(!isAvailable)}
                className={`font-black text-sm ${isAvailable ? 'text-green-600' : 'text-neutral-500'}`}
              >
                {isAvailable ? "Available for Alerts" : "Currently Unavailable"}
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Active Emergency Alert (If available) */}
          {isAvailable && (
            <div className="lg:col-span-3 bg-red-600 text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-red-600/20 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-5 w-full md:w-auto">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Activity className="w-8 h-8 text-white animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-red-200 mb-1">Critical Emergency Alert</div>
                  <h3 className="text-2xl font-black leading-tight">Patient needs O- Blood</h3>
                  <p className="text-red-100 font-medium text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" /> Lilavati Hospital (5 km away)
                  </p>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-white text-red-600 font-black text-sm hover:bg-neutral-50 transition-colors">
                  Accept & Navigate
                </button>
                <button className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-red-700 text-white font-black text-sm hover:bg-red-800 transition-colors">
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
              <Droplets className="w-6 h-6" />
            </div>
            <div className="text-4xl font-black text-neutral-900 mb-1">4</div>
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Total Donations</div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Heart className="w-6 h-6" />
            </div>
            <div className="text-4xl font-black text-neutral-900 mb-1">12</div>
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Lives Impacted</div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-4xl font-black text-neutral-900 mb-1">56</div>
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Days until next</div>
          </div>
        </div>

        {/* Live Blood Journey Tracker */}
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 mb-8">
          <h3 className="text-lg font-black text-neutral-900 mb-6">Live Blood Journey</h3>
          <div className="relative flex justify-between items-center w-full px-4 md:px-12">
            <div className="absolute top-1/2 left-8 right-8 h-1 bg-neutral-100 -translate-y-1/2 -z-10"></div>
            <div className="absolute top-1/2 left-8 w-[60%] h-1 bg-red-600 -translate-y-1/2 -z-10"></div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/20">✓</div>
              <div className="text-xs font-bold text-neutral-900">Donated</div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/20">✓</div>
              <div className="text-xs font-bold text-neutral-900">Tested</div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full border-4 border-white bg-red-600 text-white flex items-center justify-center font-bold shadow-lg shadow-red-600/30 animate-bounce">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="text-xs font-black text-red-600 uppercase tracking-widest">In Transit</div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center font-bold">4</div>
              <div className="text-xs font-bold text-neutral-400">Transfused</div>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
            <h3 className="text-lg font-black text-neutral-900">Recent Donations</h3>
            <button className="text-red-600 font-bold text-sm hover:text-red-700">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  <th className="p-4 pl-6">Date</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Units</th>
                  <th className="p-4">Impact</th>
                  <th className="p-4 pr-6">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-neutral-700 divide-y divide-neutral-100">
                <tr>
                  <td className="p-4 pl-6">Aug 14, 2026</td>
                  <td className="p-4">Fortis Hospital</td>
                  <td className="p-4">1 Pint</td>
                  <td className="p-4"><span className="text-blue-600 font-bold">3 Lives Saved</span></td>
                  <td className="p-4 pr-6">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Completed</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 pl-6">Feb 02, 2026</td>
                  <td className="p-4">Tata Memorial Hospital</td>
                  <td className="p-4">1 Pint</td>
                  <td className="p-4"><span className="text-blue-600 font-bold">3 Lives Saved</span></td>
                  <td className="p-4 pr-6">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Completed</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
