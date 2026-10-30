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
