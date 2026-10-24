import { redirect } from "next/navigation";

export default function LegacyEmergencyRoute() {
  redirect("/hospital/emergency-command");
}
