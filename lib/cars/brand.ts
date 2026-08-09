// CARS / Cards — placeholder brand for Solana Immortalize mainnet tests.
// Never put Zingers product names or champion art in on-chain metadata from here.
import modelsFile from "@/onchain/cars/models.json";

export interface CarModel {
  id: string;
  name: string;
  blurb: string;
  image: string;
}

export interface CarsCollectionMeta {
  name: string;
  symbol: string;
  family: string;
}

const MODELS = modelsFile.models as CarModel[];
const COLLECTION = modelsFile.collection as CarsCollectionMeta;

export function carsCollection(): CarsCollectionMeta {
  return COLLECTION;
}

export function listCarModels(): CarModel[] {
  return MODELS;
}

/** Deterministic placeholder body from any opaque key (e.g. mind key). */
export function carModelForKey(key: string): CarModel {
  const s = key.trim().toUpperCase() || "CARD";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return MODELS[h % MODELS.length] ?? MODELS[0];
}

export function cardDisplayName(model: CarModel, mintIndex: number, genesis: boolean): string {
  const tag = genesis ? "Genesis Card" : "Card";
  return `${tag} · ${model.name} #${mintIndex}`;
}
