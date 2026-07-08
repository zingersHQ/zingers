import type { Metadata } from "next";
import CircuitLite from "@/components/grounds/circuit-lite";

export const metadata: Metadata = {
  title: "The Circuit · one-thumb prototype · Zingers",
};

// SLICE 0 feel prototype for the mobile "native body" of the Circuit
// (docs/essence.md › "One soul, native bodies"). Standalone so it can't
// destabilise the live in-world Circuit while we validate the one-thumb climb.
export default function CircuitLitePage() {
  return <CircuitLite />;
}
