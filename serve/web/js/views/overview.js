import { get } from "../api.js";
import { hydrograph } from "../hydro.js";
import { ROLES, setRole } from "../roles.js";
import { ago, h } from "../ui.js";

const STEPS = [
  ["Watch", "Reads 45 live river and rain sources across Europe, around the clock."],
  ["Investigate", "Builds a cause-and-effect answer, citing the data behind each claim."],
  ["Challenge", "A second agent tries to disprove it and drops what doesn't hold."],
  ["Judge", "A third checks every claim against its evidence and scores it."],
  ["Decide", "Nothing is sent until a person approves the proposed actions."],
];

export function overview(root, go) {
  const live = h("div", { class: "grid three", "aria-live": "polite" },
    stat("…", "sources watched live"), stat("…", "places above normal"), stat("…", "last checked"));

  root.append(
    h("section", { class: "hero" },
      hydrograph(),
      h("div", { class: "hero-in" },
        h("h1", {}, "Flood alerts.", h("br"), "Know before the water does."),
        h("p", { text: "AI agents read live river data, challenge their own answers and cite every number. A person makes the call." }),
        h("div", { class: "actions" },
          h("a", { class: "btn primary", href: "#/ask" }, "Ask the agents"),
          h("a", { class: "btn ghost", href: "#/watch" }, "See what's being watched")))),

    h("section", { class: "section card" }, live),

    h("section", { class: "section" },
      h("h2", { text: "How it works" }),
      h("ol", { class: "grid five", style: "list-style:none;padding:0;margin:0" },
        STEPS.map(([title, text], i) =>
          h("li", { class: "step card" }, h("span", { class: "n", text: String(i + 1) }), h("h3", { text: title }), h("p", { text }))))),

    h("section", { class: "section" },
      h("h2", { text: "Who it's for" }),
      h("div", { class: "grid three" },
        Object.entries(ROLES).map(([id, r]) =>
          h("button", { class: "card role-card", type: "button", onclick: () => { setRole(id); go(r.start); } },
            h("span", { class: "muted small", text: r.label }),
            h("h3", { text: r.asks }),
            h("p", { text: r.blurb }),
            h("div", { class: "go", text: r.startText }))))),
  );

  Promise.all([get("/watch/status"), get("/platform/status")])
    .then(([w, p]) => {
      live.replaceChildren(
        stat(String(p.live_sources ?? w.counts?.sources ?? "–"), "sources watched live"),
        stat(String(w.counts?.elevated ?? "–"), "places above normal"),
        stat(ago(w.last_cycle?.finished_at) || "–", "last checked"));
    })
    .catch(() => live.replaceChildren(h("p", { class: "muted", text: "Live numbers are unavailable right now." })));
}

function stat(value, label) {
  return h("div", { class: "stat" }, h("b", { text: value }), h("span", { text: label }));
}
