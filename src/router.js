// Minimal hash router. Routes: #/name or #/name/id
const routes = new Map();
let notFound = () => document.createTextNode("Not found");
let onNavigate = () => {};

export function route(name, fn) { routes.set(name, fn); }
export function setNotFound(fn) { notFound = fn; }
export function setOnNavigate(fn) { onNavigate = fn; }

export function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const [name = "sandboxes", id] = h.split("/");
  return { name, id };
}

export function navigate(to) { location.hash = "#/" + to; }

export function render(mount) {
  const { name, id } = parseHash();
  const fn = routes.get(name) || notFound;
  const node = fn({ id, name });
  mount.replaceChildren(node instanceof Node ? node : document.createTextNode(""));
  onNavigate(name, id);
  window.scrollTo(0, 0);
}

export function start(mount) {
  const rerender = () => render(mount);
  window.addEventListener("hashchange", rerender);
  if (!location.hash) location.hash = "#/sandboxes";
  else rerender();
  return rerender;
}
