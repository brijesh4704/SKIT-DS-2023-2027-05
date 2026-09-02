"use client";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Activity, ArrowRight, ArrowUpRight, Check, Droplets, Heart, HeartPulse, Hospital, LocateFixed, Radio, ScanLine, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import { Shell, Tilt, Cell } from "../components/Shared";

const stats = [["240K+", "registered donors"], ["8.6K+", "connections made"], ["97%", "match confidence"], ["24/7", "emergency network"]];
const cards = [
  { i: Sparkles, t: "Find the right donor faster.", p: "Compatibility, eligibility, availability, distance and urgency come together in one matching workflow.", big: true },
  { i: LocateFixed, t: "Know who is nearby.", p: "Surface compatible donors and emergency requests using location-aware matching." },
  { i: ShieldCheck, t: "Verified access.", p: "Role-based workflows keep donor, hospital and blood-bank operations separated and secure." },
  { i: Radio, t: "Move with the emergency.", p: "Requests, responses, notifications and status changes stay connected across the network." },
  { i: Activity, t: "Eligibility before matching.", p: "Guided eligibility and availability create cleaner, safer matches." },
  { i: Droplets, t: "A clearer blood picture.", p: "Blood banks organize groups, stock levels and signals in one workspace." },
];
const flow = [
  [HeartPulse, "A request starts", "A patient or hospital creates a verified request with group, location and urgency."],
  [ScanLine, "AI evaluates", "The network checks compatibility, eligibility, availability, distance and urgency."],
  [Users, "Donors respond", "Compatible donors receive the request and respond through their own workflow."],
  [Hospital, "Operations connect", "Hospitals and blood banks coordinate until the request is fulfilled."],
] as const;

function Hero3D() {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const ry = useSpring(useTransform(mx, [-.5, .5], [-18, 18]), { stiffness: 80, damping: 15 });
  const rx = useSpring(useTransform(my, [-.5, .5], [14, -14]), { stiffness: 80, damping: 15 });
  return (
    <div className="scene" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width - .5); my.set((e.clientY - r.top) / r.height - .5); }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}>
      <motion.div className="stage" style={{ rotateX: rx, rotateY: ry }}>
        <div className="layer" style={{ transform: "translateZ(-80px)" }}>
          <div className="ring" style={{ width: 480, height: 480 }} /><div className="ring" style={{ width: 340, height: 340, animationDirection: "reverse" }} />
        </div>
        <div className="layer"><div className="shadowp" /></div>
        <div className="layer" style={{ transform: "translateZ(60px)" }}><div className="drop" /></div>
        <div className="layer" style={{ transform: "translateZ(130px)" }}>
          <Cell s={56} style={{ left: "14%", top: "16%" }} /><Cell s={30} style={{ right: "16%", top: "12%", animationDelay: "1s" }} />
          <Cell s={40} style={{ right: "10%", bottom: "26%", animationDelay: "2s" }} /><Cell s={24} style={{ left: "20%", bottom: "20%" }} />
        </div>
        <div className="layer" style={{ transform: "translateZ(190px)" }}>
          <div className="glass float" style={{ left: 0, top: "14%" }}>
            <div className="av">A+</div><div><small>LIVE AI MATCH</small><strong>Compatible donor found</strong><small>2.4 km · Available now</small></div><div className="score">98.7%</div>
          </div>
          <div className="glass float" style={{ right: 0, bottom: "14%" }}>
            <div className="av" style={{ borderRadius: 99 }}><LocateFixed size={18} /></div><div><small>Searching nearby</small><strong>Jaipur · 12 compatible</strong></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  return (
    <Shell>
      <section className="wrap hero">
        <div>
          <motion.div className="pill" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}><b />AI-powered blood response network</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1, duration: .8 }}>Blood moves.<br /><span>Lives move.</span></motion.h1>
          <p className="lead">BloodLink AI connects donors, patients, hospitals and blood banks through one intelligent emergency network, so finding compatible blood is faster, clearer and more human.</p>
          <div className="row">
            <Link href="/request-blood" className="btn p">Find blood <ArrowRight size={16} /></Link>
            <Link href="/register" className="btn s">Become a donor <ArrowUpRight size={16} /></Link>
          </div>
        </div>
        <Hero3D />
      </section>

      <section className="wrap stats">
        {stats.map(([v, l]) => <div key={l} className="glass stat"><b>{v}</b><span>{l}</span></div>)}
      </section>

      <section className="wrap sec" id="platform">
        <h2>More than a blood search. <em>An emergency operating system.</em></h2>
        <p className="sub">Every part of the response lives in one connected experience, so people spend less time searching and more time acting.</p>
        <div className="grid3">
          {cards.map(({ i: I, t, p, big }) => (
            <Tilt key={t} className={big ? "big" : ""}><div className="ic"><I size={22} /></div><h3>{t}</h3><p>{p}</p></Tilt>
          ))}
        </div>
      </section>

      <section className="wrap sec" id="how">
        <h2>From request to <em>response.</em></h2>
        <p className="sub">Four connected steps. The intelligence stays behind the scenes so the experience stays simple.</p>
        <div className="steps">
          {flow.map(([I, t, p], i) => (
            <Tilt key={t} className="step"><div className="n">0{i + 1}</div><I size={22} color="#d4143c" /><h3>{t}</h3><p>{p}</p></Tilt>
          ))}
        </div>
      </section>

      <section className="wrap sec" id="donors" style={{ paddingTop: 20 }}>
        <div className="split">
          <div className="panel glass">
            <div className="pill"><ShieldCheck size={13} />For donors</div>
            <h2>Give with <em style={{ color: "#d4143c" }}>confidence.</em></h2>
            <p>Complete a guided eligibility check, manage availability and become visible to compatible requests.</p>
            <div style={{ margin: "22px 0" }}>
              <small style={{ color: "#7a4a56" }}>Question 2 of 8 · What is your age?</small>
              {["18 – 25", "26 – 40", "41 – 60", "Above 60"].map((a, i) => <div key={a} className={`opt ${i === 1 ? "on" : ""}`}>{i === 1 ? <Check size={14} /> : <Heart size={14} opacity={.3} />}{a}</div>)}
            </div>
            <Link href="/eligibility" className="btn p">Check eligibility <ArrowRight size={15} /></Link>
          </div>
          <div className="panel dark" id="hospitals">
            <div className="pill" style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "transparent" }}><Hospital size={13} />For hospitals</div>
            <h2>When time <em style={{ color: "#ffc2d0" }}>matters most.</em></h2>
            <p>Create emergency requests, discover compatible donors, review responses and coordinate the next step from one workspace.</p>
            <Cell s={90} style={{ right: 40, bottom: 90 }} /><Cell s={44} style={{ right: 150, bottom: 50, animationDelay: "1s" }} />
            <div style={{ marginTop: 28 }}><Link href="/register" className="btn w">Connect your hospital <ArrowUpRight size={15} /></Link></div>
          </div>
        </div>
      </section>

      <section className="wrap sec" id="ai">
        <h2>Matching people, <em>not just blood types.</em></h2>
        <p className="sub">Five signals are evaluated for every request instead of one blood-group lookup.</p>
        <div className="grid3">
          {[["Compatibility", "Blood group and match logic"], ["Eligibility", "Donor readiness"], ["Availability", "Who can respond now"], ["Location", "Distance-aware discovery"], ["Urgency", "Critical requests stay visible"], ["Live score", "98.7% best match right now"]].map(([t, p]) => (
            <Tilt key={t}><h3>{t}</h3><p>{p}</p></Tilt>
          ))}
        </div>
      </section>

      <section className="wrap">
        <div className="cta">
          <h2>Someone out there<br /><em>needs your blood.</em></h2>
          <p>One registration can become one connection, and one connection can change everything.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/register" className="btn w">Join the network <Zap size={15} /></Link>
            <Link href="/about" className="btn" style={{ color: "#fff", border: "1.5px solid rgba(255,255,255,.5)" }}>About BloodLink</Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}
