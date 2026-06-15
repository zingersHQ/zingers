// Ported from house.py house_events(). Social-deduction game; engine owns roles,
// votes and win conditions (objective), LLM only drives speech + reasoning.
import "server-only";
import { ROSTER } from "./roster";
import { chat, KEY, makeRng, parseJson, type Rng } from "./xai";
import type { CreatureType, HouseEndRole, HouseEvent, HouseRoleLabel } from "@/lib/types";

class Player {
  key: string;
  name: string;
  persona: string;
  type: CreatureType;
  role: "FAITHFUL" | "TRAITOR" = "FAITHFUL";
  power: "SEER" | "GUARDIAN" | null = null;
  alive = true;
  lastLine = "";
  notes: string[] = [];

  constructor(key: string) {
    const c = ROSTER[key];
    this.key = key;
    this.name = c.name;
    this.persona = c.persona;
    this.type = c.type;
  }
  roleLabel(): HouseRoleLabel {
    if (this.role === "TRAITOR") return "TRAITOR";
    return (this.power as HouseRoleLabel) || "FAITHFUL";
  }
}

const alivePlayers = (ps: Player[]) => ps.filter((p) => p.alive);
const names = (ps: Player[]) => ps.map((p) => p.name).join(", ");
const logStr = (log: string[]) => (log.slice(-8).map((e) => `- ${e}`).join("\n") || "- (nothing yet)");

interface SpeakOut {
  line: string;
  thought: string;
  suspect: string;
}

async function speak(
  p: Player,
  players: Player[],
  log: string[],
  roundNo: number,
  saidThisRound: string[],
  mock: boolean,
  rng: Rng,
): Promise<SpeakOut> {
  const living = alivePlayers(players).filter((q) => q !== p);
  if (mock || !KEY) {
    const target = living.length ? rng.choice(living).name : "no one";
    if (p.role === "TRAITOR")
      return { line: `I'd look hard at ${target} — too quiet to be innocent.`, thought: "Deflecting. Steer the house away from the traitors.", suspect: target };
    return { line: `Something about ${target} doesn't sit right with me.`, thought: `Genuinely unsure; ${target} is my best read.`, suspect: target };
  }
  const fellows = alivePlayers(players).filter((q) => q.role === "TRAITOR" && q !== p).map((q) => q.name);
  let roleBrief: string;
  if (p.role === "TRAITOR")
    roleBrief =
      `You are a TRAITOR. Fellow traitors still in the house: ${fellows.length ? fellows.join(", ") : "none left — you are alone"}. ` +
      "Never reveal this. Deflect suspicion, protect fellow traitors, and steer the house toward banishing a FAITHFUL. Beware the Seer — find and remove them.";
  else if (p.power === "SEER")
    roleBrief =
      "You are the SEER (Faithful). Each night you secretly learn one player's true alignment. Use what you know to guide the house — but reveal it carefully, or the traitors will kill you next.";
  else if (p.power === "GUARDIAN")
    roleBrief =
      "You are the GUARDIAN (Faithful). Each night you secretly shield one player from the traitors. Find the traitors without exposing your role.";
  else
    roleBrief =
      "You are FAITHFUL. Find and banish the hidden traitors. Read behaviour, weigh accusations, build trust with allies.";
  const secret = p.notes.length ? "\nYour private knowledge:\n" + p.notes.map((n) => `- ${n}`).join("\n") : "";
  const sysP =
    `You are ${p.name}, ${p.persona}. You are a contestant in THE HOUSE, a social-deduction game. ${roleBrief} Stay sharply in character. Be cunning and concise.`;
  const spoken = saidThisRound.map((s) => `- ${s}`).join("\n") || "(you are first to speak)";
  const state =
    `Round ${roundNo}. Still in the house: ${names(alivePlayers(players))}.\n` +
    `House log so far:\n${logStr(log)}${secret}\n\n` +
    `Said already this round:\n${spoken}\n\n` +
    "Speak to the house: ONE line, max 18 words, in character — accuse, defend, deflect, or court an alliance. " +
    "Then privately note your TRUE reasoning. Reply ONLY as JSON: " +
    '{"line":"<max 18 words>","thought":"<your real private reasoning, max 22 words>","suspect":"<name of who you most suspect, or none>"}';
  const out = parseJson<{ line?: string; thought?: string; suspect?: string }>(
    await chat([{ role: "system", content: sysP }, { role: "user", content: state }], 0.9, 200),
  );
  if (!out) {
    const target = living.length ? rng.choice(living).name : "no one";
    return { line: "I'm watching all of you closely.", thought: "API hiccup; staying vague.", suspect: target };
  }
  return {
    line: String(out.line ?? "").trim().slice(0, 180),
    thought: String(out.thought ?? "").trim().slice(0, 180),
    suspect: String(out.suspect ?? "none").trim().slice(0, 24),
  };
}

async function castVote(
  p: Player,
  players: Player[],
  roundNo: number,
  transcript: string,
  mock: boolean,
  rng: Rng,
): Promise<[string, string]> {
  const living = alivePlayers(players).filter((q) => q !== p);
  const valid = Object.fromEntries(living.map((q) => [q.name.toLowerCase(), q.name]));
  if (mock || !KEY) return [rng.choice(living).name, "gut read"];
  const sysP =
    `You are ${p.name}, ${p.persona}. In THE HOUSE you must now vote to BANISH one suspect. ` +
    (p.role === "TRAITOR"
      ? "You are a TRAITOR — vote to protect traitors and remove a threat to your cover. "
      : "You are FAITHFUL — vote for who you believe is a traitor.");
  const secret = p.notes.length ? "\nYour private knowledge:\n" + p.notes.map((n) => `- ${n}`).join("\n") : "";
  const usr =
    `Round ${roundNo} discussion:\n${transcript}${secret}\n\n` +
    `Living suspects you may vote for: ${names(living)}.\n` +
    'Cast your banishment vote. Reply ONLY as JSON: {"vote":"<a living suspect\'s name>","reason":"<max 10 words>"}';
  const out = parseJson<{ vote?: string; reason?: string }>(
    await chat([{ role: "system", content: sysP }, { role: "user", content: usr }], 0.6, 90),
  );
  const v = String(out?.vote ?? "").trim().toLowerCase();
  if (out && valid[v]) return [valid[v], String(out.reason ?? "").slice(0, 60)];
  return [rng.choice(living).name, "no clear read"];
}

async function traitorKill(players: Player[], log: string[], roundNo: number, mock: boolean, rng: Rng): Promise<[Player | null, string]> {
  const traitors = alivePlayers(players).filter((p) => p.role === "TRAITOR");
  const faithful = alivePlayers(players).filter((p) => p.role === "FAITHFUL");
  if (!faithful.length) return [null, ""];
  if (mock || !KEY) return [rng.choice(faithful), "the clearest threat to us"];
  const valid = Object.fromEntries(faithful.map((q) => [q.name.toLowerCase(), q]));
  const sysP =
    "You are the TRAITORS' table in THE HOUSE: " +
    traitors.map((t) => `${t.name} (${t.persona})`).join("; ") +
    ". You conspire in secret each night.";
  const usr =
    `Round ${roundNo}. The Faithful still in the house: ${names(faithful)}.\n` +
    `House log:\n${logStr(log)}\n\n` +
    'Choose ONE Faithful to eliminate tonight — pick the biggest threat to your cover. Reply ONLY as JSON: {"target":"<a Faithful\'s name>","reason":"<max 12 words>"}';
  const out = parseJson<{ target?: string; reason?: string }>(
    await chat([{ role: "system", content: sysP }, { role: "user", content: usr }], 0.7, 90),
  );
  const t = String(out?.target ?? "").trim().toLowerCase();
  if (out && valid[t]) return [valid[t], String(out.reason ?? "").slice(0, 60)];
  return [rng.choice(faithful), "a calculated strike"];
}

async function nightChoice(
  actor: Player,
  candidates: Player[],
  log: string[],
  roundNo: number,
  mock: boolean,
  verb: string,
  whyWords: number,
  rng: Rng,
): Promise<[Player | null, string]> {
  if (!candidates.length) return [null, ""];
  if (mock || !KEY) return [rng.choice(candidates), "a hunch"];
  const valid = Object.fromEntries(candidates.map((q) => [q.name.toLowerCase(), q]));
  const role = actor.role === "TRAITOR" ? "a TRAITOR" : actor.power ? `the ${actor.power}` : "a Faithful contestant";
  const sysP = `You are ${actor.name}, ${actor.persona}, secretly ${role} in THE HOUSE. It is night and you act in secret.`;
  const usr =
    `Round ${roundNo}. House log:\n${logStr(log)}\n\n` +
    `${verb} Choose from: ${names(candidates)}.\n` +
    `Reply ONLY as JSON: {"target":"<a name from the list>","reason":"<max ${whyWords} words>"}`;
  const out = parseJson<{ target?: string; reason?: string }>(
    await chat([{ role: "system", content: sysP }, { role: "user", content: usr }], 0.6, 80),
  );
  const t = String(out?.target ?? "").trim().toLowerCase();
  if (out && valid[t]) return [valid[t], String(out.reason ?? "").slice(0, 60)];
  return [rng.choice(candidates), "instinct"];
}

async function nightPhase(
  players: Player[],
  log: string[],
  roundNo: number,
  mock: boolean,
  rng: Rng,
): Promise<[Player | null, boolean, { kind: string; txt: string }[]]> {
  const living = alivePlayers(players);
  const events: { kind: string; txt: string }[] = [];
  const seer = living.find((p) => p.power === "SEER");
  if (seer) {
    const cands = living.filter((q) => q !== seer);
    const [target] = await nightChoice(seer, cands, log, roundNo, mock, "Secretly investigate one player's true alignment.", 10, rng);
    if (target) {
      const finding = target.role === "TRAITOR" ? "a TRAITOR" : "FAITHFUL";
      seer.notes.push(`Round ${roundNo}: you saw that ${target.name} is ${finding}.`);
      events.push({ kind: "seer", txt: `${seer.name} secretly read ${target.name} → ${finding}` });
    }
  }
  const guard = living.find((p) => p.power === "GUARDIAN");
  let protectedP: Player | null = null;
  if (guard) {
    [protectedP] = await nightChoice(guard, living, log, roundNo, mock, "Secretly shield one player from the traitors tonight.", 10, rng);
    if (protectedP) events.push({ kind: "guard", txt: `${guard.name} shielded ${protectedP.name}` });
  }
  const [victim, why] = await traitorKill(players, log, roundNo, mock, rng);
  const blocked = victim !== null && protectedP !== null && victim === protectedP;
  if (blocked) {
    events.push({ kind: "kill", txt: `traitors targeted ${victim!.name} — shielded` });
    return [null, true, events];
  }
  if (victim) events.push({ kind: "kill", txt: `traitors eliminated ${victim.name} (${why})` });
  return [victim, false, events];
}

function checkWin(players: Player[]): "FAITHFUL" | "TRAITORS" | null {
  const traitors = alivePlayers(players).filter((p) => p.role === "TRAITOR");
  const faithful = alivePlayers(players).filter((p) => p.role === "FAITHFUL");
  if (!traitors.length) return "FAITHFUL";
  if (traitors.length >= faithful.length) return "TRAITORS";
  return null;
}

function endEvent(players: Player[], won: "FAITHFUL" | "TRAITORS"): HouseEvent {
  const roles: HouseEndRole[] = players.map((p) => ({
    key: p.key,
    name: p.name,
    role: p.roleLabel(),
    traitor: p.role === "TRAITOR",
    alive: p.alive,
  }));
  return { type: "end", winner: won, roles };
}

export async function* houseEvents(
  castKeys: string[],
  traitorsN: number,
  mock: boolean,
  seed?: number | null,
): AsyncGenerator<HouseEvent> {
  const rng = makeRng(seed);
  const players = castKeys.map((k) => new Player(k));
  for (const p of rng.sample(players, traitorsN)) p.role = "TRAITOR";
  const faithful = players.filter((p) => p.role === "FAITHFUL");
  rng.shuffle(faithful);
  const powers: ("SEER" | "GUARDIAN")[] = [];
  if (faithful.length >= 3) powers.push("SEER");
  if (faithful.length >= 4) powers.push("GUARDIAN");
  powers.forEach((power, i) => {
    faithful[i].power = power;
  });
  yield {
    type: "start",
    traitors_n: traitorsN,
    players: players.map((p) => ({
      key: p.key,
      name: p.name,
      type: p.type,
      persona: p.persona,
      role: p.role,
      power: p.power,
      role_label: p.roleLabel(),
    })),
  };
  const log: string[] = [];
  let roundNo = 0;
  const LIMIT = 8;
  while (roundNo < LIMIT) {
    roundNo += 1;
    yield { type: "round", round: roundNo, alive: alivePlayers(players).map((p) => p.key) };
    if (roundNo > 1) {
      const [victim, blocked, events] = await nightPhase(players, log, roundNo, mock, rng);
      if (victim) {
        victim.alive = false;
        log.push(`Round ${roundNo}: ${victim.name} eliminated in the night.`);
      } else if (blocked) {
        log.push(`Round ${roundNo}: a night attack was shielded; no one died.`);
      }
      yield {
        type: "night",
        round: roundNo,
        events,
        victim: victim ? victim.key : null,
        victim_name: victim ? victim.name : null,
        blocked,
      };
      const won = checkWin(players);
      if (won) {
        yield endEvent(players, won);
        return;
      }
    }
    const living = alivePlayers(players);
    const order = rng.sample(living, living.length);
    const said: string[] = [];
    for (const p of order) {
      const { line, thought, suspect } = await speak(p, players, log, roundNo, said, mock, rng);
      p.lastLine = line;
      said.push(`${p.name}: "${line}"`);
      yield {
        type: "speak",
        round: roundNo,
        actor: p.key,
        name: p.name,
        ptype: p.type,
        role: p.roleLabel(),
        traitor: p.role === "TRAITOR",
        line,
        thought,
        suspect,
      };
    }
    const transcript = said.join("\n");
    const votes: Record<string, [string, string]> = {};
    const counts: Record<string, number> = {};
    for (const p of alivePlayers(players)) {
      const [target, reason] = await castVote(p, players, roundNo, transcript, mock, rng);
      votes[p.name] = [target, reason];
      counts[target] = (counts[target] || 0) + 1;
    }
    const tally: [string, number][] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = tally[0][1];
    const tied = alivePlayers(players).filter((pl) => (counts[pl.name] || 0) === top);
    const banished = rng.choice(tied);
    banished.alive = false;
    log.push(`Round ${roundNo}: ${banished.name} banished by vote (${banished.role === "TRAITOR" ? "TRAITOR" : "Faithful"}).`);
    yield {
      type: "votes",
      round: roundNo,
      votes: Object.entries(votes).map(([voter, [target, reason]]) => ({ voter, target, reason })),
      tally,
      banished: banished.key,
      banished_name: banished.name,
      banished_role: banished.roleLabel(),
      banished_traitor: banished.role === "TRAITOR",
    };
    const won = checkWin(players);
    if (won) {
      yield endEvent(players, won);
      return;
    }
  }
  yield endEvent(players, "TRAITORS");
}
