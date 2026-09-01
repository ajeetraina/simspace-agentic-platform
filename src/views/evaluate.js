import {
  el, icon, badge, toast, field, input, select, textarea, pageHead, sectionTitle, delay,
} from "../ui.js";
import { add, uid } from "../store.js";
import { startSession } from "../scenario.js";
import { navigate } from "../router.js";

// Last completed run kept at module scope so the store-triggered re-render
// (when we record the session at the end) shows the finished result, not a
// blank form.
let lastRun = null;
let runId = 0; // supersedes an in-flight animation when a new submit starts

// Let the guided tour force a clean form before driving a submission.
export function resetEvaluate() { lastRun = null; }

const SAMPLE = {
  name: "Wireless Ergonomic Keyboard",
  category: "Electronics",
  price: "49",
  vendor: "BambooTech",
  description: "Ergonomic wireless keyboard with a sustainable bamboo wrist rest and a rechargeable battery that lasts six months on a single charge.",
};
const WEAK = {
  name: "Generic USB Cable",
  category: "Other",
  price: "899",
  vendor: "x",
  description: "A cable.",
};

const THRESHOLD = 70;
const KW = ["smart", "wireless", "eco", "sustainable", "ergonomic", "ai", "modular", "rechargeable", "solar", "recycled"];

// Deterministic, input-sensitive scoring (0–100). Mirrors the vendor-intake
// rubric from catalog-service-ai-enhanced.
function score(p) {
  const price = parseFloat(p.price) || 0;
  const desc = (p.description || "").trim();
  const dl = desc.length;
  const kw = KW.filter((k) => desc.toLowerCase().includes(k)).length;

  const innovation = clamp(10 + 3 * kw, 0, 25);
  const market = { Electronics: 21, Home: 19, Fashion: 17, Toys: 15, Other: 14 }[p.category] ?? 15;
  const clarity = clamp(5 + Math.floor(dl / 10), 0, 20);
  const priceScore = price <= 0 ? 0 : price < 5 ? 7 : price <= 200 ? 15 : price <= 500 ? 10 : 5;
  const vendor = (p.vendor || "").trim().length > 2 ? 12 : 6;
  const total = innovation + market + clarity + priceScore + vendor;

  return {
    total,
    approved: total >= THRESHOLD,
    breakdown: [
      { key: "Innovation", got: innovation, max: 25, note: kw ? `${kw} standout feature${kw > 1 ? "s" : ""}` : "few distinguishing features" },
      { key: "Market demand", got: market, max: 25, note: `${p.category} category` },
      { key: "Clarity", got: clarity, max: 20, note: dl < 40 ? "description too thin" : "clear & complete" },
      { key: "Price", got: priceScore, max: 15, note: price <= 0 ? "no price" : price > 500 ? "priced too high" : price < 5 ? "suspiciously cheap" : "appropriate" },
      { key: "Vendor", got: vendor, max: 15, note: vendor > 6 ? "known vendor" : "unverified vendor" },
    ],
  };
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function renderEvaluate() {
  const wrap = el("div", {});
  wrap.append(el("div", { class: "back", onClick: () => navigate("agents") }, icon("back", "ico"), "Back to Agents"));
  wrap.append(pageHead(
    "Product Evaluation",
    "Submit a product and watch the Catalog Intelligence Team evaluate it live — the orchestrator fans out to four Llama 3.2 agents, then commits an APPROVED / REJECTED decision.",
  ));

  const start = lastRun ? lastRun.product : SAMPLE;
  const name = input({ value: start.name });
  const category = select(["Electronics", "Home", "Fashion", "Toys", "Other"], { value: start.category });
  const price = input({ type: "number", value: start.price, min: "0" });
  const vendor = input({ value: start.vendor });
  const description = textarea({ value: start.description, style: "min-height:96px;font-family:inherit;font-size:13.5px" });

  const pipe = el("div", { class: "pipe" });

  const submitBtn = el("button", { id: "eval-submit", class: "btn btn-primary", style: "width:100%;justify-content:center;margin-top:4px",
    onClick: run }, icon("play", "ico"), "Submit for evaluation");

  const form = el("div", { class: "eval-form panel", style: "padding:18px" },
    el("div", { class: "card-title", style: "margin-bottom:14px" }, icon("folder", "ico"), "New product submission"),
    field("Product name", name),
    el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:14px" }, field("Category", category), field("Price ($)", price)),
    field("Vendor", vendor),
    field("Description", description),
    submitBtn,
    el("div", { class: "quick" },
      el("button", { id: "eval-strong", class: "btn btn-sm", onClick: () => fill(SAMPLE) }, "Sample: strong"),
      el("button", { id: "eval-weak", class: "btn btn-sm", onClick: () => fill(WEAK) }, "Sample: weak")),
  );

  function fill(p) {
    name.value = p.name; category.value = p.category; price.value = p.price;
    vendor.value = p.vendor; description.value = p.description;
    toast("Loaded sample — hit Submit");
  }
  function product() {
    return { name: name.value.trim(), category: category.value, price: price.value, vendor: vendor.value.trim(), description: description.value.trim() };
  }

  // Idle vs completed pipeline state
  if (lastRun && lastRun.done) renderCompleted(pipe, lastRun);
  else pipe.append(el("div", { class: "pipe-idle" },
    el("div", { class: "big" }, "🧪"),
    el("div", {}, "Submit a product to watch the four agents evaluate it."),
    el("div", { class: "muted", style: "margin-top:6px;font-size:12.5px" }, "Try “Sample: weak” to see a REJECT.")));

  async function run() {
    const p = product();
    if (!p.name) { toast("Product name required", "err"); return; }
    const myId = ++runId;
    await animate(pipe, p, () => myId === runId);
  }

  wrap.append(el("div", { class: "eval-wrap" }, form, pipe));
  return wrap;
}

// ---- The live animation (mutates only local DOM until the very end) ----
const AGENTS = [
  { key: "vendor-intake", label: "vendor-intake", color: "#d97706" },
  { key: "market-research", label: "market-research", color: "#0891b2" },
  { key: "customer-match", label: "customer-match", color: "#4f46e5" },
  { key: "catalog-management", label: "catalog-management", color: "#059669" },
];

function statusPill(kind, text) {
  return el("span", { class: "status-pill " + kind },
    kind === "running" ? el("span", { class: "spin" }) : null, text);
}

async function animate(pipe, p, live = () => true) {
  pipe.replaceChildren();
  const result = score(p);

  // Orchestrator receives
  const orch = el("div", { class: "orch-node" },
    el("div", { class: "av" }, "C"),
    el("div", { style: "flex:1" }, el("div", { class: "t" }, "catalog-orchestrator"),
      el("div", { class: "s" }, `“${p.name}” · ${p.category} · $${p.price || "—"}`)),
    statusPill("running", "receiving"));
  pipe.append(orch);
  await delay(500);
  orch.querySelector(".status-pill").replaceWith(statusPill("done", "fanning out"));
  pipe.append(el("div", { class: "fan-line" }, "▽ ▽ ▽ ▽"));

  // Agent cards
  const grid = el("div", { class: "eval-grid" });
  const cards = {};
  for (const a of AGENTS) {
    const body = el("div", { class: "ec-body" });
    const pill = statusPill("queued", "queued");
    const card = el("div", { class: "eval-card" },
      el("div", { class: "ec-head" },
        el("div", { class: "ec-av", style: `background:${a.color}` }, a.label[0].toUpperCase()),
        el("div", { class: "ec-name" }, a.label), pill),
      body);
    cards[a.key] = { card, body, setPill: (k, t) => card.querySelector(".status-pill").replaceWith(statusPill(k, t)) };
    grid.append(card);
  }
  if (!live()) return;
  pipe.append(grid);

  // 1) vendor-intake — score breakdown builds up
  await runAgent(cards["vendor-intake"], async ({ body }) => {
    const bars = el("div", { class: "score-bars" });
    body.append(bars);
    for (const b of result.breakdown) {
      const fill = el("i", { class: "fill", style: b.got / b.max < 0.5 ? "background:var(--amber)" : "" });
      bars.append(el("div", { class: "score-row" },
        el("span", { class: "lab" }, b.key),
        el("span", { class: "track" }, fill),
        el("span", { class: "val" }, `${b.got}/${b.max}`)));
      await delay(180);
      requestAnimationFrame(() => { fill.style.width = (b.got / b.max * 100) + "%"; });
    }
    await delay(300);
    body.append(el("div", { class: "score-total" },
      el("span", { class: "n " + (result.approved ? "pass" : "fail") }, `${result.total}`),
      el("span", { class: "muted" }, `/ 100 · threshold ${THRESHOLD}`)));
  });

  // 2) market-research
  const competitors = { Electronics: 4, Home: 3, Fashion: 6, Toys: 5, Other: 2 }[p.category] ?? 3;
  await runAgent(cards["market-research"], async ({ body }) => {
    body.append(el("div", {}, el("b", {}, `${competitors} competitors`), ` · ${result.breakdown[1].got >= 19 ? "strong" : "moderate"} positioning`));
  });

  // 3) customer-match
  const alignment = (0.6 + result.total / 250).toFixed(2);
  const segment = { Electronics: "home-office buyers", Home: "home & living", Fashion: "style-forward", Toys: "families", Other: "general" }[p.category] ?? "general";
  await runAgent(cards["customer-match"], async ({ body }) => {
    body.append(el("div", {}, "aligns with ", el("b", {}, `“${segment}”`), ` · ${alignment}`));
  });

  // 4) catalog-management — only commits if approved
  const events = [];
  await runAgent(cards["catalog-management"], async ({ body, setPill }, card) => {
    if (result.approved) {
      body.append(el("div", {}, el("b", {}, "committed"), " → PostgreSQL · MongoDB history · Kafka event"));
      events.push("postgres__insert(catalog_db.products)", "mongodb__insert(agent_history)", "kafka__publish(product-evaluations)");
    } else {
      setPill("skip", "skipped");
      body.append(el("div", {}, "not committed — evaluation below threshold"));
      events.push("mongodb__insert(agent_history · REJECTED)");
    }
  }, !result.approved);

  // Verdict
  if (!live()) return;
  const verdict = el("div", { class: "verdict " + (result.approved ? "pass" : "fail") },
    el("div", { class: "big" }, result.approved ? "APPROVED" : "REJECTED"),
    el("div", { class: "r" },
      el("b", {}, `${result.total}/100`), result.approved ? " — added to the catalog." : " — sent back to the vendor.",
      el("span", { class: "muted" }, topReason(result))));
  pipe.append(verdict);
  pipe.append(el("div", { class: "event-log" },
    ...[`orchestrator → fan-out to ${AGENTS.length} agents (Llama 3.2 · Docker Model Runner)`, ...events]
      .map((e) => el("div", { class: "ev-ok" }, "✓ " + e))));

  // Record the run + session (single store write → re-render shows completed state)
  if (!live()) return;
  const session = startSession(
    { id: "sbx-catalog", name: "catalog-pipeline", agent: "catalog-orchestrator", project: "catalog-service", mcp: ["docker-gateway"] },
    { prompt: `Evaluate submission: ${p.name} (${p.category}, $${p.price}).`, staticMcp: ["docker-gateway"] });
  const toolCalls = [
    `vendor-intake → ${result.total}/100 → ${result.approved ? "APPROVED" : "REJECTED"}`,
    `market-research → ${competitors} competitors`,
    `customer-match → ${segment} · ${alignment}`,
    ...events,
  ];
  lastRun = { product: p, result, done: true, sessionId: session.id };
  toast(result.approved ? `APPROVED ${result.total}/100` : `REJECTED ${result.total}/100`, result.approved ? "ok" : "err");
  add("sessions", { ...session, status: "completed", toolCalls }); // re-renders view
}

async function runAgent(ref, fn, skip) {
  ref.card.classList.add("active");
  ref.setPill("running", "evaluating");
  await delay(950);
  await fn(ref, ref.card);
  ref.card.classList.remove("active"); ref.card.classList.add("done");
  if (!skip) ref.setPill("done", "done");
  await delay(250);
}

function topReason(r) {
  const sorted = [...r.breakdown].sort((a, b) => (a.got / a.max) - (b.got / b.max));
  const weak = sorted[0], strong = sorted[sorted.length - 1];
  return r.approved
    ? `Strongest: ${strong.key.toLowerCase()} (${strong.note}).`
    : `Weakest: ${weak.key.toLowerCase()} — ${weak.note}.`;
}

// Static render of a completed run (after the store re-render).
function renderCompleted(pipe, run) {
  const r = run.result, p = run.product;
  pipe.append(el("div", { class: "orch-node" },
    el("div", { class: "av" }, "C"),
    el("div", { style: "flex:1" }, el("div", { class: "t" }, "catalog-orchestrator"),
      el("div", { class: "s" }, `“${p.name}” · ${p.category} · $${p.price || "—"}`)),
    statusPill("done", "done")));
  const grid = el("div", { class: "eval-grid" });
  const bd = r.breakdown;
  grid.append(completedCard("vendor-intake", "#d97706",
    el("div", {}, ...bd.map((b) => el("div", { class: "score-row" },
      el("span", { class: "lab" }, b.key), el("span", { class: "track" },
        el("i", { class: "fill", style: `width:${b.got / b.max * 100}%${b.got / b.max < 0.5 ? ";background:var(--amber)" : ""}` })),
      el("span", { class: "val" }, `${b.got}/${b.max}`))),
      el("div", { class: "score-total" }, el("span", { class: "n " + (r.approved ? "pass" : "fail") }, `${r.total}`), el("span", { class: "muted" }, "/ 100")))));
  grid.append(completedCard("market-research", "#0891b2", el("div", {}, "competitor analysis complete")));
  grid.append(completedCard("customer-match", "#4f46e5", el("div", {}, "segment alignment scored")));
  grid.append(completedCard("catalog-management", "#059669", el("div", {}, r.approved ? "committed to catalog" : "not committed"), !r.approved));
  pipe.append(grid);
  pipe.append(el("div", { class: "verdict " + (r.approved ? "pass" : "fail") },
    el("div", { class: "big" }, r.approved ? "APPROVED" : "REJECTED"),
    el("div", { class: "r" }, el("b", {}, `${r.total}/100`), el("span", { class: "muted" }, topReason(r)))));
  pipe.append(el("div", { style: "margin-top:4px" },
    el("a", { href: "#/sessions/" + run.sessionId, onClick: () => navigate("sessions/" + run.sessionId) }, "View the recorded session →")));
}
function completedCard(name, color, body, skip) {
  return el("div", { class: "eval-card done" },
    el("div", { class: "ec-head" },
      el("div", { class: "ec-av", style: `background:${color}` }, name[0].toUpperCase()),
      el("div", { class: "ec-name" }, name), statusPill(skip ? "skip" : "done", skip ? "skipped" : "done")),
    el("div", { class: "ec-body" }, body));
}
