import GroundsScreen from "@/components/grounds/grounds-screen";

// The Grounds (the live 3D game) live here. The root path `/` is the marketing
// landing page; "Start your journey" links into this route, which also keeps
// every existing /grounds link (shared cards, docs, nav) working directly.
export default function Grounds() {
  return <GroundsScreen />;
}
