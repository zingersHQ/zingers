// Live end-to-end test of the BYO-agent adapters. Stands up TWO real local
// servers — a bring-your-own HTTP agent and an OpenAI-compatible model — then
// runs a real bout through /api/sim with each side driven by a different brain.
// AXIOM = HTTP agent, VOX = OpenAI-compatible model. The turn lines are tagged
// so you can see each adapter actually drove its side.
import http from "node:http";

const SIM = process.env.SIM_BASE || "http://localhost:3939";
const HTTP_PORT = 4111;
const OAI_PORT = 4112;

// 1) HTTP agent: receives the structured AgentView, returns an AgentDecision.
function startHttpAgent(port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let view = {};
        try {
          view = JSON.parse(body);
        } catch {}
        const moves = view.legalMoves || [];
        const fin = moves.find((m) => /finisher/i.test(m.desc));
        const pick = fin || moves[Math.floor(Math.random() * Math.max(1, moves.length))] || { id: "", name: "" };
        const opp = (view.opponent && view.opponent.name) || "you";
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            move: pick.id,
            intent: "byo http tactic",
            line: `[HTTP-AGENT] ${opp}, my server already computed your defeat.`,
            why: `picked ${pick.name || pick.id} from my own /act endpoint`,
          }),
        );
      });
    });
    srv.listen(port, () => resolve(srv));
  });
}

// 2) OpenAI-compatible server: returns a chat.completion whose message content
// is the decision JSON. Parses move ids + powers out of the prompt and picks
// the strongest legal move — like a model that read the legal-move list.
function startOpenAI(port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let payload = {};
        try {
          payload = JSON.parse(body);
        } catch {}
        const text = (payload.messages || []).map((m) => m.content).join("\n");
        const re = /id=([a-z_]+),\s*[A-Z]+,\s*pow\s*(\d+)/g;
        let best = null;
        let m;
        while ((m = re.exec(text))) {
          const pow = Number(m[2]);
          if (!best || pow > best.pow) best = { id: m[1], pow };
        }
        const decision = {
          move: (best && best.id) || "",
          intent: "model pick",
          line: `[OPENAI-SIM] Even a frontier model lands ${(best && best.id) || "this"}.`,
          why: `chose the highest-power legal move (pow ${(best && best.pow) ?? "?"})`,
        };
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            id: "chatcmpl-sim",
            object: "chat.completion",
            model: payload.model || "sim",
            choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(decision) }, finish_reason: "stop" }],
          }),
        );
      });
    });
    srv.listen(port, () => resolve(srv));
  });
}

const httpSrv = await startHttpAgent(HTTP_PORT);
const oaiSrv = await startOpenAI(OAI_PORT);
console.log(`▸ http-agent listening on :${HTTP_PORT}/act`);
console.log(`▸ openai-compatible listening on :${OAI_PORT}/v1/chat/completions\n`);

const params = new URLSearchParams({
  a: "AXIOM",
  b: "VOX",
  mock: "0",
  seed: "11",
  aprov: "http",
  aurl: `http://localhost:${HTTP_PORT}/act`,
  bprov: "openai",
  bbase: `http://localhost:${OAI_PORT}/v1`,
  bmodel: "sim-gpt-4o",
});

try {
  const res = await fetch(`${SIM}/api/sim?${params.toString()}`);
  if (!res.ok) throw new Error(`sim HTTP ${res.status}`);
  const data = await res.json();
  console.log(`TOPIC: "${data.topic}"`);
  console.log(`WINNER: ${data.end.winner_name} in ${data.end.rounds} rounds\n`);
  let httpTagged = 0;
  let oaiTagged = 0;
  for (const t of data.turns) {
    if (t.line.includes("[HTTP-AGENT]")) httpTagged++;
    if (t.line.includes("[OPENAI-SIM]")) oaiTagged++;
    console.log(`R${t.round} ${t.actor_name} → ${t.move}  ${t.dmg > 0 ? `-${t.dmg}` : "--"}`);
    console.log(`   line: ${t.line}`);
    console.log(`   why : ${t.why}`);
  }
  console.log(`\n✓ AXIOM turns driven by HTTP agent: ${httpTagged}`);
  console.log(`✓ VOX turns driven by OpenAI-compatible model: ${oaiTagged}`);
  console.log(httpTagged > 0 && oaiTagged > 0 ? "\nPASS — both adapters drove their side end-to-end." : "\nFAIL — an adapter did not drive its side.");
} catch (e) {
  console.error("ERROR:", e.message);
} finally {
  httpSrv.close();
  oaiSrv.close();
  process.exit(0);
}
