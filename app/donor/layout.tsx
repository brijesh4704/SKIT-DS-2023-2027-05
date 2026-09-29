import type { ReactNode } from "react";
import DonorChrome from "./components/DonorChrome";

export default function DonorLayout({ children }: { children: ReactNode }) {
  return <DonorChrome>{children}</DonorChrome>;
}
