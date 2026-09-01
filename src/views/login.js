import { el, icon, field, input, toast } from "../ui.js";
import { login } from "../store.js";
import { whale } from "../logo.js";

export function renderLogin(onDone) {
  const email = input({ type: "email", placeholder: "you@company.com", value: "ajeetraina@gmail.com" });
  const pass = input({ type: "password", placeholder: "••••••••", value: "demo" });

  const doLogin = (e) => {
    e?.preventDefault();
    const v = email.value.trim();
    if (!v || !v.includes("@")) { toast("Enter a valid email", "err"); return; }
    login(v);
    toast("Welcome to the Agentic Platform");
    onDone();
  };

  const sso = (label) => el("button", { class: "btn", type: "button", onClick: doLogin },
    icon("external", "ico"), "Continue with " + label);

  const form = el("form", { class: "login-card", onSubmit: doLogin },
    el("div", { class: "login-brand" }, whale(26), "Docker Agentic Platform"),
    el("h1", {}, "Sign in"),
    el("div", { class: "sub" }, "Cloud sandboxing with AI governance"),
    el("div", { class: "sso" }, sso("Docker Hub"), sso("Google"), sso("GitHub SSO")),
    el("div", { class: "divider" }, "or with email"),
    field("Email", email),
    field("Password", pass),
    el("button", { class: "btn btn-primary", type: "submit" }, "Sign in"),
    el("div", { class: "login-foot" }, "Simulation — any credentials work. Nothing leaves your browser."),
  );

  return el("div", { class: "login-wrap" }, form);
}
