// frontend/src/app/login/page.tsx
"use client";

import { Heart, Mail, Lock, ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-[#FCFAF8] flex flex-col md:flex-row font-sans">
      
      {/* Left Side - Image/Branding */}
      <div className="hidden md:flex md:w-1/2 bg-red-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        <img 
          src="https://images.unsplash.com/photo-1582719478250-c8940994cb13?q=80&w=1000&auto=format&fit=crop" 
          alt="Community Blood Donation" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-multiply"
        />
        
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white text-red-600 rounded-xl flex items-center justify-center transform -rotate-6">
            <Heart className="w-7 h-7 fill-red-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight leading-none text-white">BloodBond</span>
            <span className="text-[10px] uppercase tracking-widest text-red-200 font-bold mt-1">Community Network</span>
          </div>
        </Link>

        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Community Online
          </div>
          <h2 className="text-5xl font-black leading-[1.1] mb-6">
            Join the network.<br/>Save a life.
          </h2>
          <p className="text-red-100 font-medium text-lg leading-relaxed">
            Every 2 seconds, someone in India needs blood. By registering, you become part of a local safety net that protects your community.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-[#FCFAF8]">
        <div className="w-full max-w-md">
          
          <Link href="/" className="md:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center transform -rotate-6">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-neutral-900 leading-none">BloodBond</span>
          </Link>

          <div className="mb-10">
            <h2 className="text-4xl font-black text-neutral-900 mb-3">
              {isLogin ? "Welcome back." : "Create an account."}
            </h2>
            <p className="text-neutral-500 font-medium text-lg">
              {isLogin ? "Log in to check your donation history or update availability." : "Register to become a donor and start saving lives locally."}
            </p>
          </div>

          <form className="flex flex-col gap-6">
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Full Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Priya Sharma" 
                    className="w-full h-14 bg-white border-2 border-neutral-200 rounded-xl px-4 pl-12 text-neutral-900 font-medium placeholder-neutral-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all shadow-sm"
                  />
                  <User className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="priya@example.com" 
                  className="w-full h-14 bg-white border-2 border-neutral-200 rounded-xl px-4 pl-12 text-neutral-900 font-medium placeholder-neutral-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all shadow-sm"
                />
                <Mail className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Password</label>
                {isLogin && <a href="#" className="text-sm text-red-600 hover:text-red-700 font-bold">Forgot password?</a>}
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full h-14 bg-white border-2 border-neutral-200 rounded-xl px-4 pl-12 text-neutral-900 font-medium placeholder-neutral-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all shadow-sm"
                />
                <Lock className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button 
              type="button" 
              className="w-full h-14 mt-4 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] shadow-xl shadow-red-600/20"
            >
              {isLogin ? "Log In" : "Create Account"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-10 text-center pt-8 border-t-2 border-neutral-100">
            <p className="text-neutral-500 font-medium text-lg">
              {isLogin ? "Don't have an account yet?" : "Already a part of the community?"}{" "}
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-red-600 font-black hover:text-red-700 transition-colors"
              >
                {isLogin ? "Sign up here" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
