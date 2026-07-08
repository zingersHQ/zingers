import { Suspense } from "react";
import GroundsGate from "@/components/grounds/grounds-gate";

export default function Grounds() {
  return (
    <Suspense fallback={null}>
      <GroundsGate />
    </Suspense>
  );
}
