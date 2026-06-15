// Champions owned by an anonymous owner token.
import { getOwned } from "@/lib/server/ladder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const champions = await getOwned(token);
  return Response.json({ champions });
}
