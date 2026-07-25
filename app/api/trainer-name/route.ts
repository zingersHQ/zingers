// Deprecated — Trainers are nameless drivers. Champions get names on claim.
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, "trainer-name", 30, 60_000);
  if (limited) return limited;
  return Response.json(
    { error: "Trainer names are not used. Champions receive names when they join the standings." },
    { status: 410 },
  );
}
