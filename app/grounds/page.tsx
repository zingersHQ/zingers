import { redirect } from "next/navigation";

// The Grounds now live at the root path. Keep this route as a permanent
// redirect so existing /grounds links (shared cards, docs, nav) still work.
export default function GroundsRedirect() {
  redirect("/");
}
