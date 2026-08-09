import "server-only";

/** Server-only RPC (Helius etc.). Never expose via NEXT_PUBLIC_*. */
export function solanaRpcUrl(): string {
  return process.env.SOLANA_RPC_URL?.trim() || "https://api.mainnet-beta.solana.com";
}

export function carsMintAddress(): string | null {
  return process.env.CARS_MINT?.trim() || process.env.ZING_MINT?.trim() || null;
}

export function carsDecimals(): number {
  const n = Number(process.env.CARS_DECIMALS ?? "6");
  return Number.isFinite(n) && n >= 0 && n <= 9 ? Math.floor(n) : 6;
}

export function fuelSymbol(): string {
  return (process.env.IMMORTALIZE_FUEL_SYMBOL || "CARS").trim() || "CARS";
}

export function appPublicUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "";
  if (!raw) return "http://localhost:3000";
  return raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`;
}
