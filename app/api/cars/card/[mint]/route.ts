// Public Card metadata JSON for the CARS test lane (placeholder car models only).
import { NextRequest, NextResponse } from "next/server";
import { carModelForKey, carsCollection, listCarModels } from "@/lib/cars/brand";
import { appPublicUrl, getCardMeta } from "@/lib/server/cars-chain";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ mint: string }> },
) {
  const { mint } = await ctx.params;
  const mintId = (mint || "").trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mintId)) {
    return NextResponse.json({ error: "bad mint" }, { status: 400 });
  }

  const meta = await getCardMeta(mintId);
  const model = meta
    ? listCarModels().find((m) => m.id === meta.modelId) || carModelForKey(meta.mindKey)
    : carModelForKey(mintId);
  const col = carsCollection();
  const base = appPublicUrl();
  const name = meta?.name || `Card · ${model.name}`;
  const image = `${base}${model.image}`;

  const body = {
    name,
    symbol: col.symbol,
    description: meta
      ? `${model.blurb} Placeholder Card for chain testing. Not product art.`
      : `${model.blurb} Placeholder Card metadata.`,
    image,
    external_url: base,
    attributes: [
      { trait_type: "Model", value: model.name },
      { trait_type: "Lane", value: "CARS" },
      ...(meta
        ? [
            { trait_type: "Slot", value: String(meta.mintIndex) },
            { trait_type: "Genesis", value: meta.genesis ? "yes" : "no" },
            { trait_type: "Fuel burned", value: String(meta.burnAmount) },
          ]
        : []),
    ],
    properties: {
      category: "image",
      files: [{ uri: image, type: "image/svg+xml" }],
      collection: { name: col.name, family: col.family },
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": meta ? "public, max-age=3600" : "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
