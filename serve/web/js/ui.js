// Small DOM and formatting helpers. Text always goes in as text, never as HTML:
// agent output and web snippets are untrusted.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const SVG = "http://www.w3.org/2000/svg";
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children.flat(Infinity)) if (c) el.append(c);
  return el;
}

// Zetaris writes "2026-10-30 02:00:00.0", the API ISO; both are UTC.
export function when(value) {
  if (!value) return null;
  const t = Date.parse(String(value).replace(" ", "T").replace(/\.\d+$/, "").replace(/Z?$/, "Z"));
  return Number.isNaN(t) ? null : new Date(t);
}

export function clock(value) {
  const d = value instanceof Date ? value : when(value);
  return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}

export function ago(value) {
  const d = value instanceof Date ? value : when(value);
  if (!d) return "";
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  return hours < 48 ? `${hours} h ago` : d.toLocaleDateString();
}

export function num(v, digits = 0) {
  return typeof v === "number" && Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: digits }) : "–";
}

// A place's state: a three-step level and the word. Normal one step, Watch two, High three.
const LEVEL = { ok: 1, watch: 2, high: 3 };
export function status(word, tone) {
  const n = LEVEL[tone] || 0;
  return h("span", { class: `status ${tone}`.trim() },
    h("span", { class: "lv", "aria-hidden": "true" }, [1, 2, 3].map((i) => h("i", { class: i <= n ? "on" : null }))),
    word);
}

export function pill(text, tone = "") {
  return h("span", { class: `pill ${tone}`.trim(), text });
}

export function loading(text = "Loading…") {
  return h("p", { class: "muted", role: "status", text });
}

export function failure(error) {
  return h("p", { class: "err", role: "alert", text: `Could not load this right now. ${error?.message ?? ""}`.trim() });
}

export const WAVE = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 20c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M12 3v7"/><path d="M9 7l3 3 3-3"/></svg>`;

// replaceChildren that, like h(), flattens arrays and skips empty children.
export function fill(el, ...children) {
  el.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
}

// A 270-degree ring gauge: value out of max, the number in the middle.
export function ring({ value, max, text, label, tone = "water" }) {
  const R = 42, C = 2 * Math.PI * R, ARC = 0.75;
  const k = max > 0 && typeof value === "number" ? Math.max(0, Math.min(1, value / max)) : 0;
  const arc = (cls, len) => s("circle", { cx: 50, cy: 50, r: R, class: cls, "stroke-dasharray": `${len} ${C}`, transform: "rotate(135 50 50)" });
  return h("figure", { class: `ring ${tone}` },
    s("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" }, arc("track", C * ARC), arc("value", Math.max(0.001, C * ARC * k))),
    h("b", { class: "ring-num", text: text ?? num(value) }),
    h("figcaption", { text: label }));
}

// A level against its usual mark: 0 to twice usual, the usual line at the middle.
export function meter(ratio, tone, title) {
  const k = typeof ratio === "number" && Number.isFinite(ratio) ? Math.max(0.02, Math.min(1, ratio / 2)) : 0;
  return h("span", { class: `meter ${tone}`, title, role: "img", "aria-label": title },
    h("span", { class: "fill", style: `width:${(k * 100).toFixed(1)}%` }), h("span", { class: "usual" }));
}
