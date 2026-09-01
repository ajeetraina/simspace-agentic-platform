import {
  el, icon, badge, statusBadge, toast, modal, confirmDialog, field, input, select,
  pageHead, sectionTitle, fmtDate,
} from "../ui.js";
import { getCol, find, add, update, remove, uid } from "../store.js";
import { navigate } from "../router.js";

export function renderMcp() {
  const servers = getCol("mcpServers");
  const wrap = el("div", {},
    pageHead(
      "MCP",
      "Model Context Protocol servers expose tools to your sandboxed agents. Register servers by URL and govern which tools they can invoke with Cedar policy.",
      el("button", { class: "btn btn-primary", onClick: openAddMcp }, icon("plus"), "Add MCP server"),
    ),
  );

  const rows = servers.map((m) => {
    const readCount = m.tools.filter((t) => t.kind === "read").length;
    const muteCount = m.tools.filter((t) => t.kind === "mutate").length;
    return el("tr", { class: "link", onClick: () => navigate("mcp/" + m.id) },
      el("td", {}, el("span", { class: "mono" }, m.name)),
      el("td", {}, badge(m.type, m.type === "remote" ? "indigo" : "gray")),
      el("td", {}, el("span", { class: "mono muted" }, m.url)),
      el("td", {}, `${m.tools.length} tools`, muteCount ? el("span", { class: "muted" }, ` · ${muteCount} mutating`) : ""),
      el("td", {}, badge(m.policy, "blue")),
      el("td", {}, statusBadge(m.status)),
    );
  });

  wrap.append(el("div", { class: "table-wrap" },
    el("table", { class: "table" },
      el("thead", {}, el("tr", {},
        el("th", {}, "Name"), el("th", {}, "Type"), el("th", {}, "URL"),
        el("th", {}, "Tools"), el("th", {}, "Policy"), el("th", {}, "Status"))),
      el("tbody", {}, ...rows))));
  return wrap;
}

export function openAddMcp() {
  const name = input({ placeholder: "remotedhi" });
  const url = input({ placeholder: "https://dhi.io/mcp" });
  const transport = select(["streamable-http", "sse", "stdio"], { value: "streamable-http" });
  const policies = getCol("policies").filter((p) => p.target === "MCP access");
  const policySel = select(policies.map((p) => p.name), { value: "dhi-readonly" });

  modal({
    title: "Add MCP server",
    subtitle: "Register a remote MCP server by URL. Its tools become available to sandboxed agents, governed by your policy.",
    body: el("div", {},
      field("Name", name),
      field("URL", url),
      field("Transport", transport),
      field("Governance policy", policySel),
    ),
    submitLabel: "Add server",
    onSubmit: () => {
      if (!name.value.trim() || !url.value.trim()) { toast("Name and URL required", "err"); return false; }
      add("mcpServers", {
        id: uid("mcp"), name: name.value.trim(), type: "remote", transport: transport.value,
        url: url.value.trim(), status: "connected", policy: policySel.value,
        added: new Date().toISOString(),
        tools: [
          { name: "example_query", kind: "read", desc: "Registered tool (discovered on connect)" },
        ],
      });
      toast(`Added MCP server '${name.value.trim()}' (remote)`);
      return true;
    },
  });
}

export function renderMcpDetail(id) {
  const m = find("mcpServers", id);
  if (!m) return el("div", {}, el("div", { class: "back", onClick: () => navigate("mcp") }, icon("back", "ico"), "MCP"),
    el("div", { class: "empty" }, "MCP server not found."));

  const policy = getCol("policies").find((p) => p.name === m.policy);
  const allowed = policy && policy.mode === "scoped";

  const wrap = el("div", {});
  wrap.append(el("div", { class: "back", onClick: () => navigate("mcp") }, icon("back", "ico"), "Back to MCP"));
  wrap.append(el("div", { class: "detail-head" }, icon("share", "ico"), el("h1", {}, m.name), statusBadge(m.status)));
  wrap.append(el("p", { class: "muted", style: "margin:0" }, `${m.type} server over ${m.transport}`));

  const info = el("div", { class: "panel", style: "padding:20px" },
    el("dl", { class: "kv" },
      el("dt", {}, "URL"), el("dd", {}, el("span", { class: "mono" }, m.url)),
      el("dt", {}, "Type"), el("dd", {}, m.type),
      el("dt", {}, "Transport"), el("dd", {}, m.transport),
      el("dt", {}, "Policy"), el("dd", {}, el("a", { href: policy ? "#/policies/" + policy.id : "#" }, m.policy)),
      el("dt", {}, "Added"), el("dd", {}, fmtDate(m.added)),
    ));

  const actions = el("div", { class: "panel", style: "padding:20px" },
    el("div", { class: "card-title", style: "margin-bottom:12px" }, "Actions"),
    el("div", { style: "display:flex;flex-direction:column;gap:8px" },
      el("button", { class: "btn", onClick: () => { toast("Reconnected — tools re-discovered"); update("mcpServers", id, { status: "connected" }); } }, icon("refresh", "ico"), "Reconnect"),
      el("button", { class: "btn", onClick: () => navigate("policies/" + (policy?.id || "")) }, icon("shield", "ico"), "Edit governance policy"),
      el("button", { class: "btn btn-danger", onClick: () => confirmDialog({
        title: "Remove MCP server", message: `Remove ${m.name}? Sandboxed agents will lose access to its tools.`,
        confirmLabel: "Remove", onConfirm: () => { remove("mcpServers", id); toast("MCP server removed"); navigate("mcp"); },
      }) }, icon("trash", "ico"), "Remove"),
    ));
  wrap.append(el("div", { class: "detail-grid" }, info, actions));

  // Tools
  wrap.append(sectionTitle("Exposed tools"));
  const muteCount = m.tools.filter((t) => t.kind === "mutate").length;
  const denyCount = allowed ? muteCount : 0;
  const allowCount = m.tools.length - denyCount;
  wrap.append(el("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:-4px 0 12px" },
    badge(`${allowCount} allowed`, "green", true),
    denyCount ? badge(`${denyCount} denied`, "red") : null,
    el("span", { class: "muted", style: "font-size:12.5px" },
      allowed
        ? el("span", {}, "Read-only queries allowed · mutators denied by ", el("b", {}, m.policy),
            " — even a hijacked agent can look, not touch.")
        : el("span", {}, "Governance is permissive — every tool is allowed. Scope it with a policy like ",
            el("b", {}, "dhi-readonly"), " to deny the mutators."))));
  const toolTable = el("table", { class: "table" },
    el("thead", {}, el("tr", {}, el("th", {}, "Tool"), el("th", {}, "Kind"), el("th", {}, "Description"), el("th", {}, "Policy"))),
    el("tbody", {},
      ...m.tools.map((t) => {
        const denied = allowed && t.kind === "mutate";
        return el("tr", {},
          el("td", {}, el("span", { class: "mono" }, `${m.name}__${t.name}`)),
          el("td", {}, badge(t.kind === "read" ? "read-only" : "mutating", t.kind === "read" ? "gray" : "amber")),
          el("td", { class: "muted" }, t.desc),
          el("td", {}, denied ? badge("denied", "red") : badge("allowed", "green")),
        );
      })));
  wrap.append(el("div", { class: "table-wrap" }, toolTable));
  return wrap;
}
