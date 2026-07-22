import { redirect } from "next/navigation";

/** Legacy mobile door — middleware 308s here too; this covers direct navigations. */
export default async function MobileRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") q.set(k, v);
    else if (Array.isArray(v)) for (const item of v) q.append(k, item);
  }
  const qs = q.toString();
  redirect(qs ? `/ascent?${qs}` : "/ascent");
}
