import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Flight hero still (capture)",
};

export default function DevStillLayout({ children }: { children: React.ReactNode }) {
  return children;
}
