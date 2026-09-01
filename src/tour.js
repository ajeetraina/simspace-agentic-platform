// ---------------------------------------------------------------------------
// Guided tour: an auto-advancing caption overlay that drives the whole demo
// hands-free — including the live build and a live approve + reject — so it
// can be screen-recorded in one take. Start via the sidebar button or ?tour=1.
// ---------------------------------------------------------------------------
import { el, icon, delay } from "./ui.js";
import { navigate } from "./router.js";
import { getCol, add, update, uid, nextCount, resetAll } from "./store.js";
import { buildDhiArtifact, startSession } from "./scenario.js";
import { resetEvaluate } from "./views/evaluate.js";

let state = null; // { idx, playing, timer, overlay, refs, highlighted }

// ---- self-driving actions ----
function buildAction() {
  let sbx = getCol("sandboxes").find((s) => (s.mcp || []).includes("remotedhi"));
  if (!sbx) {
    nextCount("sandbox");
    sbx = {
      id: uid("sbx"), name: "catalog-sandbox", agent: "implementer", project: "catalog-service",
      workspace: "catalog-service", base: "dhi.io/node (queried via MCP)", mcp: ["remotedhi"],
      policy: "dhi-readonly", status: "running", started: new Date().toISOString(),
      vcpu: 4, memory: "8 GB", disk: "20 GB", built: true,
    };
    add("sandboxes", sbx);
  } else update("sandboxes", sbx.id, { built: true, status: "running" });
  startSession(sbx, { prompt: "Containerise catalog-service for production. Choose a hardened base image, keep the final image shell-free, and attach an SBOM.", staticMcp: ["remotedhi"] });
  buildDhiArtifact("implementer (sandboxed · guided tour)");
}

// ---- the script ----
const STEPS = [
  {
    route: "dashboard",
    title: "Docker Agentic Platform",
    body: "Cloud sandboxing with AI governance. There are two kinds of agents to govern — the ones that build your software, and the ones that run inside it. Let's watch both, hands-free.",
    duration: 7000,
  },
  {
    route: "artifacts/art-baseline",
    title: "The problem — what an unsupervised agent ships",
    body: "An AI agent containerised our catalog service on a laptop: node:20, 431 packages, 8 High CVEs, unsigned, runs as root. It works… but it fails policy. Nobody chose that base image.",
    highlightSel: ".detail-head",
    duration: 8500,
  },
  {
    route: "mcp/mcp-remotedhi",
    title: "Govern the tools",
    body: "We give the agent the DHI MCP server — but a Cedar policy allows only the read-only catalog queries and denies the mutating tools. Even a hijacked agent can look, not touch.",
    scrollSel: ".table-wrap", highlightSel: ".table-wrap",
    duration: 9000,
  },
  {
    route: "dashboard",
    run: buildAction,
    title: "Run the agent in a box",
    body: "Same prompt, new environment: a microVM pointed at signed, policy-gated tools. The agent queries the hardened catalog before writing FROM — and rebuilds the image, hardened.",
    scrollSel: "#tour-compare", highlightSel: "#tour-compare",
    duration: 9000,
  },
  {
    route: "dashboard",
    title: "The payoff — before and after",
    body: "Same app, a fraction of the attack surface: 8 High CVEs to zero, 431 packages to 78, unsigned to signed, root to non-root. It passes policy — reached automatically, not by review.",
    scrollSel: "#tour-compare", highlightSel: "#tour-compare",
    duration: 8500,
  },
  {
    route: "dashboard",
    title: "Two kinds of agents",
    body: "We just secured the agent that BUILDS the app. But the app itself runs a team of agents. Same platform, same governance — one layer up.",
    scrollSel: "#tour-two-kinds", highlightSel: "#tour-two-kinds",
    duration: 8000,
  },
  {
    route: "agents",
    title: "The Catalog Intelligence Team",
    body: "Four Llama 3.2 agents on Docker Model Runner: vendor-intake scores each submission, market-research and customer-match add signal, catalog-management commits the result.",
    scrollSel: "#team-catalog-intelligence", highlightSel: "#team-catalog-intelligence",
    duration: 8000,
  },
  {
    route: "evaluate",
    title: "Add a product — watch them decide",
    body: "Submit a product and the orchestrator fans out to all four agents. This one scores in the 90s — APPROVED, and committed to PostgreSQL, MongoDB and Kafka.",
    clickSeq: ["#eval-submit"],
    duration: 11000,
  },
  {
    route: "evaluate",
    title: "Now a bad product — a live reject",
    body: "The scoring is real. A $899 cable with a one-line description fails on clarity and price — REJECTED, not committed. The agents made the call, and every step is audited.",
    clickSeq: ["#eval-weak", "#eval-submit"],
    duration: 11500,
  },
  {
    route: "dashboard",
    title: "One platform, every agent",
    body: "From FROM dhi.io/node:24 to APPROVED 91/100 — the agents that build your app and the agents that run inside it, boxed in, tool-brokered, and audited the same way. That's the Docker Agentic Platform.",
    scrollSel: "#tour-two-kinds", highlightSel: "#tour-two-kinds",
    duration: 9000, last: true,
  },
];

// ---- engine ----
export function startTour() {
  if (state) exitTour();
  resetAll();          // deterministic clean slate
  resetEvaluate();
  state = { idx: -1, playing: true };
  buildOverlay();
  goto(0);
}

function clearTimer() { if (state.timer) { clearTimeout(state.timer); state.timer = null; } }
function clearHighlight() { if (state.highlighted) { state.highlighted.classList.remove("tour-highlight"); state.highlighted = null; } }

function goto(i) {
  if (!state || i < 0 || i >= STEPS.length) return;
  clearTimer(); clearHighlight();
  state.idx = i;
  const step = STEPS[i];
  if (step.run) step.run();
  if (step.route) navigate(step.route);
  updateCaption();

  setTimeout(async () => {
    if (!state || state.idx !== i) return;
    if (step.scrollSel) scrollTo(step.scrollSel);
    for (const sel of step.clickSeq || []) {
      document.querySelector(sel)?.click();
      await delay(800);
    }
    if (step.highlightSel && state && state.idx === i) { await delay(120); highlight(step.highlightSel); }
  }, 380);

  if (state.playing && !step.last) state.timer = setTimeout(() => goto(i + 1), step.duration || 8000);
}

function next() { if (state.idx < STEPS.length - 1) goto(state.idx + 1); else exitTour(); }
function prev() { if (state.idx > 0) goto(state.idx - 1); }
function togglePlay() {
  state.playing = !state.playing;
  clearTimer();
  const step = STEPS[state.idx];
  if (state.playing && !step.last) state.timer = setTimeout(() => goto(state.idx + 1), 2600);
  updateCaption();
}

function scrollTo(sel) {
  if (sel === "top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  const t = document.querySelector(sel);
  if (t) t.scrollIntoView({ behavior: "smooth", block: "center" });
}
function highlight(sel) {
  clearHighlight();
  const t = document.querySelector(sel);
  if (t) { t.classList.add("tour-highlight"); state.highlighted = t; }
}

function buildOverlay() {
  const root = document.body;
  const num = el("span", { class: "tour-num tc-num" });
  const title = el("h4", {});
  const body = el("p", {});
  const bar = el("i", {});
  const playBtn = el("button", { class: "tour-btn", onClick: togglePlay });
  const backBtn = el("button", { class: "tour-btn ghost", onClick: prev }, icon("back"), "Back");
  const nextBtn = el("button", { class: "tour-btn primary", onClick: next }, "Next");
  const overlay = el("div", { class: "tour-caption" },
    el("div", { class: "tc-top" },
      el("span", { class: "tc-tag" }, icon("play"), "Guided tour"), num),
    title, body,
    el("div", { class: "tour-progress" }, bar),
    el("div", { class: "tour-controls" },
      el("button", { class: "tour-btn ghost", onClick: exitTour }, icon("x"), "Exit"),
      el("span", { class: "sp" }),
      backBtn, playBtn, nextBtn),
  );
  root.append(overlay);
  state.overlay = overlay;
  state.refs = { num, title, body, bar, playBtn, backBtn, nextBtn };
}

function updateCaption() {
  const { num, title, body, bar, playBtn, backBtn, nextBtn } = state.refs;
  const step = STEPS[state.idx];
  num.textContent = `${state.idx + 1} / ${STEPS.length}`;
  title.textContent = step.title;
  body.textContent = step.body;
  bar.style.width = ((state.idx + 1) / STEPS.length * 100) + "%";
  backBtn.disabled = state.idx === 0;
  playBtn.replaceChildren(icon(state.playing ? "stop" : "play"), state.playing ? "Pause" : "Play");
  nextBtn.replaceChildren(step.last ? document.createTextNode("Finish") : document.createTextNode("Next"), step.last ? null : icon("play"));
}

export function exitTour() {
  if (!state) return;
  clearTimer(); clearHighlight();
  state.overlay?.remove();
  const url = new URL(location.href);
  if (url.searchParams.has("tour")) { url.searchParams.delete("tour"); history.replaceState(null, "", url.pathname + url.search + url.hash); }
  state = null;
}

export function tourRequested() {
  return new URLSearchParams(location.search).get("tour") === "1";
}
