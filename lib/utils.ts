import type { Profile } from "./types";

export function fullName(p: Pick<Profile, "prenom" | "nom">) {
  return `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || "Membre";
}

export function initials(p: Pick<Profile, "prenom" | "nom">) {
  return (((p.prenom || " ")[0] ?? "") + ((p.nom || " ")[0] ?? "")).trim().toUpperCase() || "?";
}

const PALETTE = ["#13298A", "#2F6B5A", "#8C3A2E", "#4B3F8C", "#7A5A12", "#2E5E8C", "#5C4A3A", "#3A6B2E"];
export function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Lien WhatsApp "click to chat". Les numéros commençant par 0 sont supposés israéliens (+972). */
export function waLink(tel: string | null | undefined, text?: string) {
  if (!tel) return null;
  let digits = tel.replace(/\D/g, "");
  if (tel.trim().startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = "972" + digits.slice(1);
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const POST_TYPES = {
  projet: { label: "Projet", bg: "#E8ECF8", fg: "#13298A" },
  realisation: { label: "Réalisation", bg: "#E3F1E8", fg: "#1B6E45" },
  recherche: { label: "Recherche partenaire", bg: "#F6EEDC", fg: "#7A5410" },
} as const;

export function formatDate(iso: string, withTime = false) {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    timeZone: "Asia/Jerusalem",
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
  });
}

export function parseLines<T>(text: string, keys: (keyof T)[]): T[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      // séparateurs acceptés : « | » ou « — » (le tiret court reste libre pour les dates : 2016 – 2020)
      const parts = l.split(/\s*[|—]\s*/).map((x) => x.trim());
      const o = {} as Record<string, string>;
      keys.forEach((k, i) => (o[k as string] = parts[i] ?? ""));
      return o as T;
    });
}

export function safeUrl(u: string | null | undefined) {
  if (!u) return null;
  const v = u.trim();
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const url = new URL(withProto);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
