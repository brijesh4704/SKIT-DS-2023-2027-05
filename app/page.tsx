"use client";
import Link from "next/link";

import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Heart,
  HeartPulse,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

const stats = [
  ["240K+", "Registered donors", Users],
  ["8.6K+", "Lives connected", Heart],
  ["97%", "Match accuracy", Sparkles],
  ["24/7", "Emergency support", Zap],
] as const;

const steps = [
  {
    no: "01",
    title: "Request blood",
    text: "Create a verified request with blood group, location and urgency.",
    type: "request",
  },
  {
    no: "02",
    title: "AI finds matches",
    text: "BloodLink evaluates compatibility, eligibility, distance and availability.",
    type: "ai",
  },
  {
    no: "03",
    title: "Donor connects",
    text: "Compatible donors receive the request and can respond instantly.",
    type: "donor",
  },
  {
    no: "04",
    title: "Life moves forward",
    text: "One successful connection turns technology into real human impact.",
    type: "life",
  },
];

function RBC({
  className = "",
  delay = 0,
  size = 40,
}: {
  className?: string;
  delay?: number;
  size?: number;
}) {
  return (
    <motion.div
      className={`rbc ${className}`}
      style={{ width: size, height: size }}
      animate={{
        y: [0, -14, 0],
        x: [0, 7, 0],
        rotate: [0, 8, -4, 0],
      }}
      transition={{
        duration: 4.5 + delay,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <span />
    </motion.div>
  );
}

function StepVisual({ type }: { type: string }) {
  if (type === "request") {
    return (
      <div className="request-visual">
        <div className="request-heart">
          <HeartPulse size={25} />
        </div>

        <div className="request-lines">
          <i />
          <i />
          <i />
        </div>

        <div className="request-location">
          <MapPin size={10} />
          Jaipur
        </div>

        <span className="request-pulse" />
      </div>
    );
  }

  if (type === "ai") {
    return (
      <div className="ai-mini">
        <span className="ai-mini-ring ai-ring-1" />
<span className="ai-mini-ring ai-ring-2" />
<span className="ai-mini-ring ai-ring-3" />

        <div className="ai-mini-core">
          <Sparkles size={19} />
        </div>

        <i className="ai-dot dot-1" />
        <i className="ai-dot dot-2" />
        <i className="ai-dot dot-3" />
      </div>
    );
  }

  if (type === "donor") {
    return (
      <div className="donor-mini">
        <div className="donor-avatar">A+</div>

        <div className="donor-info">
          <strong>Compatible donor</strong>
          <span>
            <i />
            Available now
          </span>
        </div>

        <div className="donor-distance">
          <MapPin size={9} />
          2.4 km
        </div>

        <div className="donor-success">
          <Check size={10} />
        </div>
      </div>
    );
  }

  return (
    <div className="life-mini">
      <div className="life-circle">
        <Heart size={23} fill="currentColor" />
      </div>

      <span />
      <span />
      <span className="life-check">
        <Check size={10} />
      </span>
    </div>
  );
}

export default function Home() {
  const [menu, setMenu] = useState(false);

  return (
    <main className="bloodlink">
      {/* BACKGROUND */}

      <div className="ambient ambient-1" />
      <div className="ambient ambient-2" />
      <div className="ambient ambient-3" />

      <div className="grid-bg" />

      <div className="particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.i
            key={i}
            style={{
              left: `${(i * 19) % 100}%`,
              top: `${(i * 29) % 100}%`,
            }}
            animate={{
              y: [0, -18, 0],
              opacity: [0.08, 0.4, 0.08],
            }}
            transition={{
              duration: 4 + (i % 4),
              delay: i * 0.12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* NAVBAR */}

      <header className="nav">
        <a className="logo" href="/">
          <span className="logo-mark">
            <i />
          </span>

          <span>
            <strong>BloodLink</strong>
            <small>PEOPLE · SCIENCE · HUMANITY</small>
          </span>
        </a>

        <nav className={menu ? "mobile-open" : ""}>
          <a href="#about" onClick={() => setMenu(false)}>
            About
          </a>
          <a href="#how" onClick={() => setMenu(false)}>
            How it works
          </a>
          <a href="#donors" onClick={() => setMenu(false)}>
            Donors
          </a>
          <a href="#patients" onClick={() => setMenu(false)}>
            Patients
          </a>
          <a href="#impact" onClick={() => setMenu(false)}>
            Impact
          </a>
        </nav>

        <div className="nav-right">
          <a href="/login">Log in</a>

          <a href="/register" className="nav-cta">
            Get started
            <ArrowUpRight size={13} />
          </a>
        </div>

        <button
          className="menu-btn"
          onClick={() => setMenu(!menu)}
          aria-label="Menu"
        >
          {menu ? <X size={19} /> : <Menu size={19} />}
        </button>
      </header>

      {/* HERO */}

      <section className="hero">
        <div className="hero-content">
          <motion.div
            className="eyebrow-pill"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <b />
            AI-POWERED BLOOD NETWORK
            <Sparkles size={11} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            Every match
            <br />
            can <span>save a life.</span>
          </motion.h1>

          <motion.p
            className="hero-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            BloodLink connects patients with compatible donors through
            intelligent matching — making the search for blood faster, smarter
            and more human.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <a href="/request-blood" className="btn-red">
              Find blood
              <ArrowRight size={15} />
            </a>

            <a href="/register" className="btn-light">
              Become a donor
              <ArrowUpRight size={15} />
            </a>
          </motion.div>

          <motion.div
            className="hero-proof"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="avatars">
              <span>AS</span>
              <span>RK</span>
              <span>MP</span>
              <span>+</span>
            </div>

            <div>
              <strong>12K+ people joined recently</strong>
              <small>Thousands of people are already connected.</small>
            </div>
          </motion.div>
        </div>

        {/* HERO SCENE */}

        <div className="hero-scene">
          <div className="scene-glow" />

          <div className="scene-orbit orbit-a" />
          <div className="scene-orbit orbit-b" />
          <div className="scene-orbit orbit-c" />

          <RBC className="hero-rbc rbc-1" delay={0} size={53} />
          <RBC className="hero-rbc rbc-2" delay={1} size={31} />
          <RBC className="hero-rbc rbc-3" delay={1.8} size={42} />
          <RBC className="hero-rbc rbc-4" delay={0.5} size={28} />
          <RBC className="hero-rbc rbc-5" delay={2} size={35} />

          <motion.div
            className="blood-object"
            animate={{
              y: [0, -14, 0],
              rotateY: [-7, 7, -7],
              rotateZ: [-2, 2, -2],
              scale: [1, 1.025, 1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="blood-surface">
              <i className="blood-shine one" />
              <i className="blood-shine two" />
              <i className="blood-reflection" />
            </div>
          </motion.div>

          {/* MATCH CARD */}

          <motion.div
            className="floating-card match-floating"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <div className="fc-icon">
              <HeartPulse size={17} />
            </div>

            <div>
              <small>AI MATCH FOUND</small>
              <strong>98.7% compatible</strong>

              <div className="bars">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>

            <span className="fc-check">
              <Check size={10} />
            </span>
          </motion.div>

          {/* DONOR CARD */}

          <motion.div
            className="floating-card donor-floating"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            <div className="donor-icon">A+</div>

            <div>
              <small>DONOR AVAILABLE</small>
              <strong>2.4 km away</strong>
            </div>

            <b />
          </motion.div>

          <div className="scene-caption">
            <span>01</span>
            INTELLIGENT MATCHING
          </div>
        </div>
      </section>

      {/* STATS */}

      <motion.section
        className="stats"
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        {stats.map(([value, label, Icon]) => (
          <div className="stat" key={label}>
            <div className="stat-icon">
              <Icon size={17} />
            </div>

            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </motion.section>

      {/* ABOUT */}

      <section className="about section" id="about">
        <motion.div
          className="about-copy"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75 }}
        >
          <div className="eyebrow">
            <span>✦</span>
            THE PROBLEM
          </div>

          <h2>
            Millions need
            <br />
            blood.
            <br />
            Finding a match
            <br />
            should feel
            <em> simple.</em>
          </h2>

          <p>
            Every day, patients and families go through calls, messages and
            uncertainty trying to find compatible blood.
          </p>

          <p>
            BloodLink brings donors, patients and intelligent technology
            together inside one connected network.
          </p>

          <a href="#impact" className="outline">
            See our impact
            <ArrowRight size={15} />
          </a>
        </motion.div>

        <motion.div
          className="about-visual"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 1,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="photo-card">
            <img
              src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=88"
              alt="Compassionate healthcare"
            />

            <div className="photo-overlay" />

            <div className="photo-status">
              <i />
              CARE MATTERS
            </div>

            <div className="photo-caption">
              <small>ONE CONNECTION</small>
              <strong>can change tomorrow.</strong>
            </div>
          </div>

          <motion.div
            className="quote-float"
            animate={{ y: [0, -7, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Heart size={15} />
            <div>
              <strong>Someone out there</strong>
              <span>can help.</span>
            </div>
          </motion.div>

          <div className="need-float">
            <div className="need-icon">
              <HeartPulse size={16} />
            </div>

            <strong>2M+</strong>
            <span>
              blood units needed
              <br />
              every year
            </span>

            <div className="need-chart">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}

      <section className="how section" id="how">
        <motion.div
          className="section-heading"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div>
            <div className="eyebrow">
              <span>✦</span>
              HOW IT WORKS
            </div>

            <h2>
              From request
              <br />
              to <em>life saved.</em>
            </h2>
          </div>

          <p>
            Four simple steps. One intelligent network working quietly behind
            every connection.
          </p>
        </motion.div>

        <div className="steps">
          {steps.map((step, index) => (
            <motion.article
              className="step-card"
              key={step.no}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.65,
                delay: index * 0.1,
              }}
              whileHover={{ y: -8 }}
            >
              <div className="step-top">
                <span>{step.no}</span>

                <div>
                  {index === 0 && <HeartPulse size={17} />}
                  {index === 1 && <Sparkles size={17} />}
                  {index === 2 && <Users size={17} />}
                  {index === 3 && <Heart size={17} />}
                </div>
              </div>

              <StepVisual type={step.type} />

              <div className="step-copy">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>

              <div className="step-status">
                <i className={index === 2 || index === 3 ? "green" : ""} />

                {index === 0 && "Emergency request"}
                {index === 1 && "98.7% match confidence"}
                {index === 2 && "Donor available now"}
                {index === 3 && "Connection completed"}
              </div>

              {index < steps.length - 1 && (
                <motion.div
                  className="step-arrow"
                  animate={{ x: [0, 4, 0] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                  }}
                >
                  <ChevronRight size={13} />
                </motion.div>
              )}
            </motion.article>
          ))}
        </div>
      </section>

      {/* DONOR / PATIENT */}

      <section className="features section">
        {/* DONOR */}

        <motion.div
          className="donor-feature"
          id="donors"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="feature-content">
            <div className="feature-eyebrow">
              <ShieldCheck size={13} />
              FOR DONORS
            </div>

            <h2>
              Know if you're
              <br />
              <em>ready to give.</em>
            </h2>

            <p>
              Before connecting with someone in need, complete a guided
              eligibility assessment designed to make the process clear and
              simple.
            </p>

            <a href="/eligibility" className="btn-red">
              Check your eligibility
              <ArrowRight size={14} />
            </a>
          </div>

          <motion.div
            className="eligibility-ui"
            animate={{
              y: [0, -9, 0],
              rotate: [-2, -1, -2],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="quiz-top">
              <span>DONOR ELIGIBILITY</span>
              <b>02 / 08</b>
            </div>

            <div className="quiz-progress">
              <span />
            </div>

            <h4>What is your age?</h4>

            <div className="quiz-option">
              <i />
              18 — 25
            </div>

            <div className="quiz-option selected">
              <i>
                <Check size={9} />
              </i>
              26 — 40
            </div>

            <div className="quiz-option">
              <i />
              41 — 60
            </div>

            <div className="quiz-option">
              <i />
              Above 60
            </div>

            <div className="quiz-continue">
              Continue
              <ArrowRight size={11} />
            </div>
          </motion.div>
        </motion.div>

        {/* PATIENT */}

        <motion.div
          className="patient-feature"
          id="patients"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="feature-content">
            <div className="feature-eyebrow">
              <HeartPulse size={13} />
              FOR PATIENTS
            </div>

            <h2>
              Need blood
              <br />
              <em>urgently?</em>
            </h2>

            <p>
              Create a verified request and let BloodLink search for compatible
              donors near you.
            </p>

            <a href="/request-blood" className="btn-white">
              Request blood
              <ArrowRight size={14} />
            </a>
          </div>

          <div className="patient-scene">
            <div className="patient-orbit one" />
            <div className="patient-orbit two" />
            <div className="patient-orbit three" />

            <motion.div
              className="patient-core"
              animate={{
                scale: [1, 1.06, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              <HeartPulse size={39} />
            </motion.div>

            <RBC
              className="patient-rbc one"
              delay={0}
              size={30}
            />

            <RBC
              className="patient-rbc two"
              delay={1.3}
              size={25}
            />
          </div>

          <div className="searching">
            <MapPin size={11} />
            Finding compatible donors nearby
            <i />
          </div>
        </motion.div>
      </section>

      {/* AI */}

      <section className="ai-section section">
        <motion.div
          className="ai-copy"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="eyebrow">
            <span>✦</span>
            BUILT WITH INTELLIGENCE
          </div>

          <h2>
            Matching people,
            <br />
            <em>not just blood types.</em>
          </h2>

          <p>
            Our matching engine looks beyond a single blood-group value.
            Compatibility, donor eligibility, availability, location and
            urgency all help shape the right match.
          </p>

          <div className="ai-tags">
            <span>Compatibility</span>
            <span>Eligibility</span>
            <span>Availability</span>
            <span>Location</span>
            <span>Urgency</span>
          </div>
        </motion.div>

        <motion.div
          className="matching-panel"
          initial={{ opacity: 0, scale: 0.93 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="panel-header">
            <div>
              <small>LIVE MATCHING</small>
              <strong>Compatible donors</strong>
            </div>

            <span>
              <i />
              LIVE
            </span>
          </div>

          {[
            ["A+", "Compatible donor", "2.4 km · Available now", "98%"],
            ["A+", "Compatible donor", "4.8 km · Available today", "94%"],
            ["O+", "Potential match", "7.1 km · Checking", "87%"],
          ].map((person, i) => (
            <div
              className={`match-row ${i === 2 ? "muted" : ""}`}
              key={`${person[0]}-${i}`}
            >
              <div className={`match-avatar avatar-${i}`}>
                {person[0]}
              </div>

              <div className="match-person">
                <strong>{person[1]}</strong>
                <span>{person[2]}</span>
              </div>

              <div className="match-percent">
                <strong>{person[3]}</strong>
                <span>match</span>
              </div>
            </div>
          ))}

          <div className="panel-bottom">
            <span>AI MATCH ENGINE</span>
            <div>
              <i />
              Searching in real-time
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA */}

      <section className="cta" id="impact">
        <div className="cta-ring ring-one" />
        <div className="cta-ring ring-two" />

        <div className="cta-inner">
          <div className="eyebrow">
            <span>✦</span>
            BE PART OF SOMETHING BIGGER
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Someone out there
            <br />
            <em>needs your blood.</em>
          </motion.h2>

          <p>
            One registration can create a connection that changes someone's
            life.
          </p>

          <div className="cta-buttons">
            <a href="/register" className="btn-red">
              Join BloodLink
              <ArrowRight size={15} />
            </a>

            <a href="/request-blood" className="cta-secondary">
              I need blood
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>

        <div className="cta-drop">
          <div />
        </div>
      </section>

      {/* FOOTER */}

      <footer className="footer section">
        <div className="footer-grid">
          <div className="footer-brand">
            <a className="logo" href="/">
              <span className="logo-mark">
                <i />
              </span>

              <span>
                <strong>BloodLink</strong>
                <small>PEOPLE · SCIENCE · HUMANITY</small>
              </span>
            </a>

            <p>
              Intelligent connections.
              <br />
              Real human impact.
            </p>
          </div>

          <div>
            <strong>Platform</strong>
            <a href="#how">How it works</a>
            <a href="/request-blood">Find blood</a>
            <a href="/eligibility">Eligibility</a>
            <a href="/register">Become a donor</a>
          </div>

          <div>
            <strong>Company</strong>
            <a href="#about">About</a>
            <a href="#impact">Impact</a>
            <a href="/login">Login</a>
            <a href="#">Contact</a>
          </div>

          <div>
            <strong>Resources</strong>
            <a href="#">Donation guide</a>
            <a href="#">FAQs</a>
            <a href="#">Support</a>
            <a href="#">Privacy</a>
          </div>

          <div className="footer-note">
            <strong>BloodLink community</strong>
            <p>
              Built to make finding blood simpler, faster and more human.
            </p>

            <a href="/register" className="footer-join">
              Join the network
              <ArrowRight size={12} />
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 BloodLink AI. All rights reserved.</span>

          <span>
            Made for humanity <Heart size={10} fill="currentColor" />
          </span>
        </div>
      </footer>
    </main>
  );
}