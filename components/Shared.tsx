"use client";
import "../app/bl.css";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { HeartPulse, Menu, X, ArrowUpRight } from "lucide-react";

const items: [string, string][] = [["Platform", "/#platform"], ["How it works", "/#how"], ["For donors", "/#donors"], ["For hospitals", "/#hospitals"], ["AI matching", "/#ai"], ["About", "/about"]];

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState(0);
  const path = usePathname();
  useEffect(() => {
    const f = () => { const m = document.documentElement.scrollHeight - innerHeight; setP(m > 0 ? (scrollY / m) * 100 : 0); };
    addEventListener("scroll", f, { passive: true }); f();
    return () => removeEventListener("scroll", f);
  }, []);
  return (
    <main className="v3">
      <div className="bar" style={{ width: `${p}%` }} />
      <header className="nav">
        <Link href="/" className="logo"><i><HeartPulse size={17} /></i>BloodLink <em>AI</em></Link>
        <nav className={open ? "links open" : "links"}>
          {items.map(([l, h]) => <Link key={l} href={h} className={path === h ? "on" : ""} onClick={() => setOpen(false)}>{l}</Link>)}
        </nav>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/login" className="btn s">Sign in</Link>
          <Link href="/register" className="btn p">Join network <ArrowUpRight size={15} /></Link>
          <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>
      {children}
      <footer className="foot"><div className="wrap">
        <div><div className="logo" style={{ color: "#fff" }}><i><HeartPulse size={17} /></i>BloodLink AI</div><p style={{ color: "#ffb5c4", marginTop: 12 }}>Intelligent connections.<br />Real human impact.</p></div>
        <div><strong>Explore</strong><Link href="/#platform">Platform</Link><Link href="/about">About</Link><Link href="/eligibility">Donor eligibility</Link></div>
        <div><strong>Network</strong><Link href="/request-blood">Request blood</Link><Link href="/register">Become a donor</Link><Link href="/login">Sign in</Link></div>
      </div><div className="wrap fb">© 2026 BloodLink AI. All rights reserved.</div></footer>
    </main>
  );
}

/* 3D tilt card: mouse pe card ghumta hai, andar ke elements depth me float karte hain */
export function Tilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-.5, .5], [10, -10]), { stiffness: 160, damping: 16 });
  const ry = useSpring(useTransform(x, [-.5, .5], [-12, 12]), { stiffness: 160, damping: 16 });
  return (
    <motion.article className={`glass tilt ${className}`} style={{ rotateX: rx, rotateY: ry }}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); x.set((e.clientX - r.left) / r.width - .5); y.set((e.clientY - r.top) / r.height - .5); }}
      onMouseLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.article>
  );
}

export function Cell({ s, style }: { s: number; style: React.CSSProperties }) {
  return <i className="cell" style={{ width: s, height: s, ...style }} />;
}
