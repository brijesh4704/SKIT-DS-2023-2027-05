"use client";

import { HeartPulse, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BloodBankFooter() {
  const router = useRouter();
  const go = (h: string) => () => router.push(h);
  return (
    <footer className="bk-foot" data-bloodlink-shared-footer="true">
      <div className="bk-foot-in">
        <div>
          <button className="bk-brand light" onClick={go("/blood-bank")}><span className="bk-mark"><HeartPulse size={18} /></span><span>BloodLink <em>AI</em></span></button>
          <p>One intelligent operational layer for blood banks, hospitals and emergency response.</p>
          <span className="bk-secure"><ShieldCheck size={14} />Verified blood bank environment</span>
        </div>
        <div><strong>Platform</strong><button onClick={go("/blood-bank")}>Overview</button><button onClick={go("/blood-bank/inventory")}>Inventory</button><button onClick={go("/blood-bank/batches")}>Batches</button><button onClick={go("/blood-bank/requests")}>Requests</button></div>
        <div><strong>Intelligence</strong><button onClick={go("/blood-bank/ai-matching")}>AI matching</button><button onClick={go("/blood-bank/analytics")}>Analytics</button><button onClick={go("/blood-bank/transactions")}>Transactions</button></div>
        <div><strong>Account</strong><button onClick={go("/blood-bank/notifications")}>Notifications</button><button onClick={go("/blood-bank/settings")}>Settings</button><button onClick={go("/")}>Website</button></div>
      </div>
      <div className="bk-foot-bottom"><span>© 2026 BloodLink AI</span><span><i />All systems operational</span></div>
    </footer>
  );
}
