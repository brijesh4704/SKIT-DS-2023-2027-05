"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Eye, HeartHandshake, Lock, Rocket, Target, Timer } from "lucide-react";
import { Shell, Tilt, Cell } from "../../components/Shared";

const values = [
  [Timer, "Speed with care", "Every minute counts in an emergency, but a rushed match is not a safe match."],
  [Lock, "Trust by design", "Verified, role-based access for donors, hospitals and blood banks."],
  [HeartHandshake, "Human first", "Behind every request is a family. The product speaks plainly and acts quickly."],
  [Eye, "Clarity", "Clear status at every step, so nobody is left guessing."],
  [Target, "Precision", "Five signals, not one blood-group lookup."],
  [Rocket, "Always improving", "The network gets smarter with every connection made."],
] as const;
// TODO: apni real timeline yahan daalo
const timeline = [
  ["The problem", "Finding compatible blood in an emergency meant phone calls, forwarded messages and lost time."],
  ["The idea", "One network where donors, patients, hospitals and blood banks see the same request."],
  ["The build", "AI matching across compatibility, eligibility, availability, distance and urgency."],
  ["Today", "A live emergency network that keeps growing, donor by donor."],
];
// TODO: real team members yahan daalo
const team = [["AS", "Founder"], ["RK", "Engineering"], ["MP", "Design"], ["+", "You?"]];

export default function About() {
  return (
    <Shell>
      <section className="wrap ph">
        <div className="pill"><b />About BloodLink AI</div>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }}>We shorten the distance<br />between <span>a need and a donor.</span></motion.h1>
        <p>BloodLink AI is an emergency blood network built so that nobody has to search alone when every minute matters.</p>
      </section>

      <section className="wrap sec" style={{ paddingTop: 50 }}>
        <div className="grid3" style={{ marginTop: 0 }}>
          <Tilt className="big"><h3>Our mission</h3><p style={{ marginTop: 10 }}>Make finding compatible blood faster, clearer and more human, by connecting every person and system around a request in one place.</p><Cell s={60} style={{ right: 30, bottom: 24 }} /></Tilt>
          <Tilt><h3>Our vision</h3><p style={{ marginTop: 10 }}>A country where no emergency is delayed because the right donor could not be found.</p></Tilt>
        </div>
      </section>

      <section className="wrap sec" style={{ paddingTop: 20 }}>
        <h2>How we got <em>here.</em></h2>
        <div className="tl">
          {timeline.map(([t, p]) => <div key={t}><small>{t}</small><h3>{p.split(".")[0]}.</h3><p>{p}</p></div>)}
        </div>
      </section>

      <section className="wrap sec">
        <h2>What we <em>stand for.</em></h2>
        <div className="grid3">
          {values.map(([I, t, p]) => <Tilt key={t}><div className="ic"><I size={22} /></div><h3>{t}</h3><p>{p}</p></Tilt>)}
        </div>
      </section>

      <section className="wrap sec">
        <h2>The people <em>behind it.</em></h2>
        <div className="team">
          {team.map(([a, r]) => <Tilt key={a}><div className="av">{a}</div><h3 style={{ fontSize: 20 }}>Team member</h3><p>{r}</p></Tilt>)}
        </div>
      </section>

      <section className="wrap">
        <div className="cta">
          <h2>Be part of the<br /><em>next connection.</em></h2>
          <p>Register as a donor or connect your hospital today.</p>
          <Link href="/register" className="btn w">Join the network <ArrowRight size={15} /></Link>
        </div>
      </section>
    </Shell>
  );
}
