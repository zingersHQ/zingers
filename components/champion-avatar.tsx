"use client";
import { useState } from "react";
import type { Champion, CreatureType } from "@/lib/types";
import { EMBLEM, TYPE_COLOR, levelFor, tierFor, sigils, ROMAN, doctrine } from "@/lib/evolve/progression";

export function ChampionAvatar({
  ckey,
  type,
  champion,
  size = 150,
}: {
  ckey: string;
  type: CreatureType;
  champion: Champion;
  size?: number;
}) {
  const [imgOk, setImgOk] = useState(true);
  const lf = levelFor(champion.xp);
  const tier = tierFor(lf.level);
  const col = TYPE_COLOR[type] || "#888";
  const wear = Math.min(0.55, champion.losses * 0.07);

  return (
    <div
      className={tier.particles ? "evo-av evo-on" : "evo-av"}
      style={{ ["--ac" as string]: col, ["--sz" as string]: size + "px" }}
    >
      {Array.from({ length: tier.rings }).map((_, i) => (
        <div key={i} className="evo-ring" style={{ animationDelay: i * 0.7 + "s", ["--rk" as string]: i }} />
      ))}
      <div
        className="evo-port"
        style={imgOk ? { backgroundImage: `url(/img/${ckey}.jpg)` } : undefined}
      >
        {!imgOk && <span style={{ fontSize: Math.round(size * 0.42) }}>{EMBLEM[type] || "◆"}</span>}
        <img alt="" src={`/img/${ckey}.jpg`} onError={() => setImgOk(false)} style={{ display: "none" }} />
        <div className="evo-wear" style={{ opacity: wear }} />
      </div>
      {tier.crest && (
        <div className="evo-crest" title={tier.name}>
          <span className="evo-lv mono">{lf.level}</span>
        </div>
      )}
      {tier.crown && <div className="evo-crown">♛</div>}
      <AvatarStyles />
    </div>
  );
}

export function Sigils({ champion }: { champion: Champion }) {
  return (
    <div className="evo-sigils">
      {sigils(champion).map((s) => (
        <span key={s.k} className="evo-sig" style={{ ["--sc" as string]: s.color }} title={`${s.label} ${ROMAN[s.lvl]}`}>
          <span className="g">{s.glyph}</span>
          <span className="r mono">{ROMAN[s.lvl]}</span>
        </span>
      ))}
    </div>
  );
}

export function XpBar({ champion, color }: { champion: Champion; color: string }) {
  const lf = levelFor(champion.xp);
  return (
    <div className="evo-xp">
      <div className="evo-xpfill" style={{ width: Math.round((lf.into / lf.span) * 100) + "%", background: color }} />
    </div>
  );
}

export function doctrineLabel(c: Champion) {
  const lf = levelFor(c.xp);
  return { level: lf.level, tier: tierFor(lf.level).name, doctrine: doctrine(c, lf.level), into: lf.into, span: lf.span };
}

function AvatarStyles() {
  return (
    <style>{`
    .evo-av{position:relative;width:var(--sz);height:var(--sz);display:grid;place-items:center;flex:0 0 auto}
    .evo-port{position:relative;width:78%;height:78%;border-radius:22%;overflow:hidden;display:grid;place-items:center;
      color:var(--ac);background:radial-gradient(120% 120% at 50% 22%,color-mix(in srgb,var(--ac) 28%,#0c0b12),#0c0b12);
      border:2px solid var(--ac);background-size:cover;background-position:center 16%;
      box-shadow:0 0 38px -12px var(--ac), inset 0 0 26px -16px var(--ac);z-index:2}
    .evo-wear{position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;
      background:repeating-linear-gradient(125deg,transparent 0 7px,rgba(0,0,0,.5) 7px 8px),
                 repeating-linear-gradient(60deg,transparent 0 11px,rgba(0,0,0,.35) 11px 12px)}
    .evo-ring{position:absolute;border-radius:30%;border:2px solid var(--ac);opacity:0;
      width:calc(82% + var(--rk)*13%);height:calc(82% + var(--rk)*13%);
      animation:evoPulse 2.8s ease-in-out infinite;filter:drop-shadow(0 0 8px var(--ac))}
    @keyframes evoPulse{0%,100%{opacity:.12;transform:scale(.97) rotate(0deg)}50%{opacity:.5;transform:scale(1.04) rotate(8deg)}}
    .evo-on .evo-port{box-shadow:0 0 60px -8px var(--ac), inset 0 0 26px -14px var(--ac);animation:evoBreathe 3.4s ease-in-out infinite}
    @keyframes evoBreathe{0%,100%{filter:none}50%{filter:brightness(1.12) saturate(1.15)}}
    .evo-crest{position:absolute;right:2%;bottom:6%;z-index:3;width:30%;height:30%;display:grid;place-items:center;
      background:linear-gradient(160deg,color-mix(in srgb,var(--ac) 70%,#000),#15131f);border:2px solid var(--ac);
      border-radius:30% 30% 34% 8%;box-shadow:0 4px 14px -4px #000, 0 0 14px -4px var(--ac)}
    .evo-lv{font-weight:700;font-size:calc(var(--sz)*.11);color:#fff;text-shadow:0 1px 2px #000}
    .evo-crown{position:absolute;top:-12%;left:50%;transform:translateX(-50%);z-index:4;color:#f5d020;
      font-size:calc(var(--sz)*.26);text-shadow:0 2px 8px #000,0 0 14px #f5d02088;animation:evoFloat 3s ease-in-out infinite}
    @keyframes evoFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-4px)}}
    .evo-sigils{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
    .evo-sig{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:999px;font-size:11px;
      border:1px solid color-mix(in srgb,var(--sc) 60%,transparent);background:color-mix(in srgb,var(--sc) 14%,#0c0b12);color:#f2eefb}
    .evo-sig .g{filter:drop-shadow(0 0 4px var(--sc))}
    .evo-sig .r{font-size:9px;letter-spacing:.5px;color:color-mix(in srgb,var(--sc) 80%,#fff)}
    .evo-xp{height:8px;border-radius:6px;background:#241f33;overflow:hidden;border:1px solid #2a2738;width:100%}
    .evo-xpfill{height:100%;border-radius:6px;transition:width .6s cubic-bezier(.2,.8,.2,1)}
    `}</style>
  );
}
