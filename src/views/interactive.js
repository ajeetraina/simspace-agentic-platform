import { el, icon, clear, pageHead } from "../ui.js";
import { runCommand } from "../terminal-sim.js";

// Terminal buffer lives at module scope so it survives the full re-renders the
// store triggers when a command mutates state (builds an artifact, etc.).
let buffer = welcome();
let history = [];
let histIdx = -1;

function welcome() {
  return [
    { text: "Docker Agentic Platform — sandbox shell (simulated)", cls: "ok" },
    { text: "Product Catalog supply-chain lab. Type 'help' or click a command on the left.", cls: "dim" },
    { text: "", cls: "" },
  ];
}

const GROUPS = [
  { title: "Environment", cmds: ["docker version", "docker login dhi.io", "git clone <repo>"] },
  { title: "§2 · Agent builds it (host)", cmds: [
    'claude -p "Containerise this Node.js app"',
    "docker scout quickview catalog-service:baseline",
    "docker scout policy catalog-service:baseline",
    "docker images catalog-service:baseline",
    "cat Dockerfile",
  ] },
  { title: "§4 · The build sandbox", cmds: [
    "sbx daemon start",
    "sbx mcp ls",
    "sbx mcp add remotedhi --url https://dhi.io/mcp",
    "sbx mcp inspect remotedhi",
    'sbx run codex --static-mcp remotedhi -p "Containerise catalog-service for production"',
    "sbx env run",
  ] },
  { title: "§3 · Verify & compare", cmds: [
    "docker scout quickview catalog-service:dhi",
    "docker scout compare --to catalog-service:baseline catalog-service:dhi",
    "docker scout policy catalog-service:dhi",
  ] },
  { title: "Kits · compose the sandbox", cmds: [
    "sbx kit ls",
    "sbx kit inspect dhi-mcp",
    "sbx kit add dhi-mcp",
  ] },
];

export function renderInteractive() {
  const wrap = el("div", {},
    pageHead("Interactive", "A simulated sandbox shell wired to the Product Catalog scenario. Commands you run here update Artifacts, Sessions and the Dashboard — nothing real executes."));

  const body = el("div", { class: "term-body" });
  const renderBuffer = () => {
    clear(body);
    for (const line of buffer) body.append(el("div", { class: line.cls || "" }, line.text || " "));
    body.scrollTop = body.scrollHeight;
  };

  const input = el("input", { class: "term-input", placeholder: "type a command… (try: sbx run codex -p \"...\")", autocomplete: "off", spellcheck: false });

  const submit = (raw) => {
    const cmd = raw.trim();
    if (!cmd) return;
    history.unshift(cmd); histIdx = -1;
    buffer.push({ text: "$ " + cmd, cls: "cmd" });
    const res = runCommand(cmd);
    if (res.clear) { buffer = welcome(); renderBuffer(); return; }
    for (const line of res.lines) buffer.push(line);
    buffer.push({ text: "", cls: "" });
    renderBuffer();
    // Effects mutate the store → triggers a full view re-render; buffer persists.
    if (res.effect) res.effect();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { submit(input.value); input.value = ""; }
    else if (e.key === "ArrowUp") { if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx]; e.preventDefault(); } }
    else if (e.key === "ArrowDown") { if (histIdx > 0) { histIdx--; input.value = history[histIdx]; } else { histIdx = -1; input.value = ""; } }
  });

  const term = el("div", { class: "term" },
    el("div", { class: "term-bar" },
      el("span", { class: "b r" }), el("span", { class: "b y" }), el("span", { class: "b g" }),
      el("span", { class: "title" }, "codex@catalog-sandbox: ~/catalog-service")),
    body,
    el("div", { class: "term-input-row" }, el("span", { class: "prompt" }, "$"), input),
  );

  // Command palette
  const palette = el("div", { class: "panel", style: "padding:14px 16px" },
    el("div", { class: "card-title", style: "margin-bottom:6px" }, icon("terminal", "ico"), "Commands"));
  for (const g of GROUPS) {
    palette.append(el("div", { class: "grp" }, g.title));
    const list = el("div", { class: "cmd-list" });
    for (const c of g.cmds) list.append(el("button", { class: "cmd-btn", onClick: () => { submit(c); input.focus(); } }, c));
    palette.append(list);
  }
  palette.append(el("div", { class: "grp" }, "Shell"));
  palette.append(el("div", { class: "cmd-list" },
    el("button", { class: "cmd-btn", onClick: () => { submit("tree"); } }, "tree"),
    el("button", { class: "cmd-btn", onClick: () => { buffer = welcome(); renderBuffer(); } }, "clear")));

  wrap.append(el("div", { class: "terminal-wrap" }, palette, term));
  renderBuffer();
  setTimeout(() => input.focus(), 30);
  return wrap;
}
