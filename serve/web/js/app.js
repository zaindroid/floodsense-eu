import { ROLES, role, setRole } from "./roles.js";
import { h, WAVE } from "./ui.js";
import { ask } from "./views/ask.js";
import { decide } from "./views/decide.js";
import { overview } from "./views/overview.js";
import { watch } from "./views/watch.js";

const VIEWS = { "": overview, watch, ask, decide, live: ask, jury: ask };
const main = document.getElementById("view");
let leave = null; // a view may return a cleanup for its timers and streams

document.getElementById("brand").insertAdjacentHTML("afterbegin", WAVE);

const go = (hash) => {
  if (location.hash === hash) render();
  else location.hash = hash;
};

function roles() {
  document.getElementById("roles").replaceChildren(...Object.entries(ROLES).map(([id, r]) =>
    h("button", { type: "button", "aria-pressed": String(id === role()), onclick: () => { setRole(id); roles(); render(); } }, r.label)));
}

function render() {
  const [name = "", arg] = location.hash.replace(/^#\/?/, "").split("/");
  const view = VIEWS[name] || overview;
  for (const a of document.querySelectorAll(".nav a")) {
    const own = a.getAttribute("href").replace(/^#\/?/, "");
    if (own === (VIEWS[name] ? name : "")) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  leave?.();
  main.replaceChildren();
  leave = view(main, go, arg ? decodeURIComponent(arg) : undefined) || null;
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", () => { render(); main.focus({ preventScroll: true }); });
roles();
render();
