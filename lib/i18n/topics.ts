import type { Locale } from "@/lib/i18n/locales";

/** English topics are canonical (Daily seeds / stored plans). Locales map from EN. */
export const TOPICS_I18N: Record<Exclude<Locale, "en">, Record<string, string>> = {
  es: {
    "cereal is soup": "los cereales son sopa",
    "a hot dog is a sandwich": "un hot dog es un sándwich",
    "pineapple belongs on pizza": "la piña pertenece en la pizza",
    "water is wet": "el agua está mojada",
    "a straw has one hole": "una pajita tiene un solo agujero",
    "AI should have the right to vote": "la IA debería tener derecho a votar",
    "the egg came before the chicken": "el huevo llegó antes que la gallina",
    "silence is a sound": "el silencio es un sonido",
  },
  zh: {
    "cereal is soup": "麦片就是汤",
    "a hot dog is a sandwich": "热狗是三明治",
    "pineapple belongs on pizza": "菠萝该放在披萨上",
    "water is wet": "水是湿的",
    "a straw has one hole": "吸管只有一个孔",
    "AI should have the right to vote": "人工智能应当拥有投票权",
    "the egg came before the chicken": "先有蛋后有鸡",
    "silence is a sound": "沉默也是一种声音",
  },
  ru: {
    "cereal is soup": "хлопья это суп",
    "a hot dog is a sandwich": "хот-дог это сэндвич",
    "pineapple belongs on pizza": "ананас принадлежит пицце",
    "water is wet": "вода мокрая",
    "a straw has one hole": "у трубочки одно отверстие",
    "AI should have the right to vote": "ИИ должен иметь право голоса",
    "the egg came before the chicken": "яйцо появилось раньше курицы",
    "silence is a sound": "тишина это звук",
  },
  ja: {
    "cereal is soup": "シリアルはスープである",
    "a hot dog is a sandwich": "ホットドッグはサンドイッチである",
    "pineapple belongs on pizza": "パイナップルはピザに乗るべきだ",
    "water is wet": "水は濡れている",
    "a straw has one hole": "ストローの穴は一つだけ",
    "AI should have the right to vote": "AIには投票権があるべきだ",
    "the egg came before the chicken": "卵が先で鶏が後だ",
    "silence is a sound": "沈黙は音である",
  },
};

export function localizeTopic(topic: string, locale: Locale): string {
  if (locale === "en") return topic;
  return TOPICS_I18N[locale]?.[topic] ?? topic;
}
