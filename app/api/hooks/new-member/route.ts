import { NextResponse, type NextRequest } from "next/server";

/**
 * Appelé par un "Database Webhook" Supabase à chaque INSERT dans feg_profiles.
 * Envoie un email aux administrateurs (via Resend) pour chaque nouvelle demande d'accès.
 *
 * Variables d'environnement (Vercel) :
 *   FEG_WEBHOOK_SECRET  secret partagé avec le webhook Supabase (en-tête x-feg-secret)
 *   RESEND_API_KEY      clé API Resend (re_...)
 *   FEG_ADMIN_EMAILS    destinataires, séparés par des virgules
 *   FEG_EMAIL_FROM      expéditeur (défaut : Frères en Guerre <noreply@feg.jooking.org>)
 *   FEG_SITE_URL        adresse du site (défaut : https://feg.jooking.org)
 */

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function POST(request: NextRequest) {
  const secret = process.env.FEG_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-feg-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const r = payload?.record;
  if (payload?.type !== "INSERT" || payload?.table !== "feg_profiles" || !r || r.status !== "pending") {
    return NextResponse.json({ skipped: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = (process.env.FEG_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!apiKey || to.length === 0) {
    return NextResponse.json({ error: "missing RESEND_API_KEY or FEG_ADMIN_EMAILS" }, { status: 500 });
  }

  const site = (process.env.FEG_SITE_URL ?? "https://feg.jooking.org").replace(/\/$/, "");
  const from = process.env.FEG_EMAIL_FROM ?? "Frères en Guerre <noreply@feg.jooking.org>";
  const name = `${r.prenom ?? ""} ${r.nom ?? ""}`.trim() || "Un nouveau membre";

  const rows: [string, unknown][] = [
    ["Nom", name],
    ["Email", r.email],
    ["Téléphone", r.tel || "—"],
    ["Parrain", r.parrain || "—"],
  ];

  const html = `
    <p>Bonjour,</p>
    <p><strong>${esc(name)}</strong> vient de demander l'accès à l'annuaire Frères en Guerre.</p>
    <table cellpadding="6" style="border-collapse:collapse">
      ${rows.map(([k, v]) => `<tr><td style="color:#5b6470">${k}</td><td><strong>${esc(v)}</strong></td></tr>`).join("")}
    </table>
    <p><a href="${site}/admin">Valider ou refuser la demande</a></p>
    <p style="color:#5b6470;font-size:13px">Vous recevez cet email car vous êtes administrateur de l'annuaire.</p>`;

  const text = `${name} vient de demander l'accès à l'annuaire Frères en Guerre.\n\n${rows
    .map(([k, v]) => `${k} : ${v ?? ""}`)
    .join("\n")}\n\nValider ou refuser : ${site}/admin`;

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `Nouvelle demande d'accès : ${name}`, html, text }),
    });
  } catch (e) {
    console.error("Resend unreachable", e);
    return NextResponse.json({ error: "resend unreachable" }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Resend error", res.status, detail);
    return NextResponse.json({ error: "resend", status: res.status }, { status: 502 });
  }
  return NextResponse.json({ sent: true });
}
