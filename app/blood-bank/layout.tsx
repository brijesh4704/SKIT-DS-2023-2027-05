import type { ReactNode } from "react";
import "./blood-bank-3d.css";
import BloodBankNavbar from "./components/BloodBankNavbar";
import BloodBankFooter from "./components/BloodBankFooter";

export default function BloodBankLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="blood-bank-shell"
      style={{ minHeight: "100vh", width: "100%", position: "relative", overflowX: "clip" }}
    >
      <div className="blood-bank-3d-bg" aria-hidden="true">
        <div className="bl3d-grid" />
        <div className="bl3d-glow bl3d-glow-a" />
        <div className="bl3d-glow bl3d-glow-b" />
        <div className="bl3d-orbit bl3d-orbit-a" />
        <div className="bl3d-orbit bl3d-orbit-b" />
        <div className="bl3d-orbit bl3d-orbit-c" />
        <div className="bl3d-sphere bl3d-sphere-main"><span className="bl3d-sphere-core" /></div>
        <div className="bl3d-sphere bl3d-sphere-small" />
        <div className="bl3d-sphere bl3d-sphere-mini" />
        <i className="bl3d-particle bl3d-particle-a" /><i className="bl3d-particle bl3d-particle-b" /><i className="bl3d-particle bl3d-particle-c" />
      </div>

      <BloodBankNavbar />
      <div className="blood-bank-content" style={{ width: "100%", minWidth: 0 }}>
        {children}
      </div>
      <BloodBankFooter />
    </div>
  );
}
