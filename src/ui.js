// ---------------------------------------------------------------------------
// Tiny DOM + component helpers. No framework.
// ---------------------------------------------------------------------------

// Create an element from a tag, props, and children.
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in node && k !== "list") { try { node[k] = v; } catch { node.setAttribute(k, v); } }
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

// Feather-style inline SVG icons (subset used across the app).
const ICONS = {
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  msg: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  bot: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  package: '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  play: '<polygon points="5 3 19 12 5 21 5 3"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
};

export function icon(name, cls = "ico") {
  const svg = `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
  const span = document.createElement("span");
  span.innerHTML = svg;
  return span.firstChild;
}

export function badge(text, tone = "gray", dot = false) {
  return el("span", { class: `badge badge-${tone}` }, dot ? el("span", { class: "dot" }) : null, text);
}

// Status → badge tone mapping used all over.
export function statusBadge(status) {
  const map = {
    running: ["green", "Running"], stopped: ["gray", "Stopped"], starting: ["amber", "Starting"],
    building: ["blue", "Building"], connected: ["green", "Connected"], disconnected: ["red", "Disconnected"],
    enforced: ["green", "Enforced"], draft: ["gray", "Draft"], permissive: ["amber", "Permissive"],
    active: ["green", "Active"], paused: ["gray", "Paused"], available: ["green", "Available"],
    pass: ["green", "Pass"], fail: ["red", "Fail"], done: ["green", "Done"],
    in_progress: ["blue", "In progress"], todo: ["gray", "To do"], completed: ["green", "Completed"],
  };
  const [tone, label] = map[status] || ["gray", status];
  return badge(label, tone, ["running", "connected", "active", "enforced"].includes(status));
}

export function cveChips(cves) {
  const { c = 0, h = 0, m = 0, l = 0 } = cves || {};
  const chip = (cls, n) => el("span", { class: cls + (n === 0 ? " zero" : "") }, `${n}${cls.toUpperCase()}`);
  return el("span", { class: "cve" }, chip("c", c), chip("h", h), chip("m", m), chip("l", l));
}

export function fmtDate(iso) {
  if (!iso || iso === "—") return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
export function timeAgo(iso) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ---------------- Toast ----------------
export function toast(msg, kind = "ok") {
  const root = document.getElementById("toast-root");
  const t = el("div", { class: `toast ${kind}` }, icon(kind === "ok" ? "check" : "x", "ico"), msg);
  root.append(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 2600);
  setTimeout(() => t.remove(), 2950);
}

// ---------------- Modal ----------------
// opts: { title, subtitle, body(node), wide, submitLabel, onSubmit()->bool|Promise, danger }
export function modal(opts) {
  const root = document.getElementById("modal-root");
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);

  const submitBtn = opts.submitLabel
    ? el("button", { class: "btn " + (opts.danger ? "btn-danger" : "btn-primary"), onClick: doSubmit }, opts.submitLabel)
    : null;

  async function doSubmit() {
    if (!opts.onSubmit) return close();
    const orig = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = ""; submitBtn.append(el("span", { class: "spin" })); }
    let ok = true;
    try { ok = await opts.onSubmit(); } catch (e) { ok = false; toast(e.message || "Something went wrong", "err"); }
    if (ok === false) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = orig; }
    } else close();
  }

  const modalBox = el("div", { class: "modal" + (opts.wide ? " wide" : "") },
    el("div", { class: "modal-head" },
      el("h2", {}, opts.title),
      opts.subtitle ? el("p", {}, opts.subtitle) : null),
    el("div", { class: "modal-body" }, opts.body),
    el("div", { class: "modal-foot" },
      el("button", { class: "btn", onClick: close }, opts.cancelLabel || "Cancel"),
      submitBtn),
  );
  const overlay = el("div", { class: "modal-overlay", onClick: (e) => { if (e.target === overlay) close(); } }, modalBox);
  root.append(overlay);
  const firstInput = modalBox.querySelector("input, textarea, select");
  if (firstInput) setTimeout(() => firstInput.focus(), 30);
  return { close, box: modalBox };
}

export function confirmDialog({ title, message, confirmLabel = "Confirm", danger = true, onConfirm }) {
  return modal({
    title, danger,
    body: el("p", { class: "muted" }, message),
    submitLabel: confirmLabel,
    onSubmit: async () => { await onConfirm(); return true; },
  });
}

// ---------------- Form field builders ----------------
export function field(label, control, hint) {
  return el("div", { class: "field" },
    el("label", {}, label),
    control,
    hint ? el("div", { class: "hint" }, hint) : null);
}
export function input(props = {}) { return el("input", { class: "input", ...props }); }
export function textarea(props = {}) { return el("textarea", { class: "textarea", ...props }); }
export function select(options, props = {}) {
  const s = el("select", { class: "select", ...props });
  for (const o of options) {
    const opt = typeof o === "string" ? { value: o, label: o } : o;
    s.append(el("option", { value: opt.value, selected: props.value === opt.value }, opt.label));
  }
  return s;
}

export function copyBtn(text) {
  return el("button", { class: "btn btn-sm btn-ghost", title: "Copy",
    onClick: () => { navigator.clipboard?.writeText(text); toast("Copied to clipboard"); } }, icon("copy", "ico"));
}

// section title helper
export function pageHead(title, desc, actions) {
  return el("div", { class: "page-head" },
    el("div", {}, el("h1", {}, title), desc ? el("p", {}, desc) : null),
    actions ? el("div", { class: "page-actions" }, actions) : null);
}
export function sectionTitle(t) { return el("div", { class: "section-title" }, t); }

export function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }
