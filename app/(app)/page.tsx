import Link from "next/link";
import Avatar from "@/components/Avatar";
import { IconMessage, IconSearch } from "@/components/Icons";
import { aiConfigured } from "@/lib/ai/provider";
import { requireMember } from "@/lib/auth";
import { LEVELS, type Relation } from "@/lib/relations";
import type { Profile } from "@/lib/types";
import { fullName } from "@/lib/utils";

export default async function AnnuairePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; secteur?: string; liens?: string }>;
}) {
  const { q = "", secteur = "", liens = "" } = await searchParams;
  const { supabase, me } = await requireMember();
  const { data: relRows } = await supabase.from("feg_relations").select("member_id, level, context, note, updated_at").eq("owner_id", me.id);
  const rel = new Map(((relRows ?? []) as Relation[]).map((r) => [r.member_id, r]));

  const { data } = await supabase
    .from("feg_profiles")
    .select("*")
    .eq("status", "approved")
    .order("prenom", { ascending: true });
  const all = (data ?? []) as Profile[];

  const needle = q.trim().toLowerCase();
  const list = all.filter((m) => {
    if (secteur && (m.secteur ?? "") !== secteur) return false;
    const r = rel.get(m.id);
    if (liens === "connus" && !(r && r.level !== "pas_encore")) return false;
    if (liens === "a-rencontrer" && !(r && r.level === "pas_encore")) return false;
    if (!needle) return true;
    const hay = [
      m.prenom, m.nom, m.titre, m.entreprise, m.ville, m.secteur, m.bio,
      ...(m.competences ?? []),
      ...(m.assos ?? []).map((a) => `${a.nom} ${a.role}`),
      ...(m.parcours ?? []).map((p) => `${p.poste} ${p.org}`),
      r?.context, r?.note, // mes notes privées sont aussi cherchables (par moi seul)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });

  const secteurs = Array.from(new Set(all.map((m) => m.secteur).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "fr"));
  const chipHref = (s: string, l: string = liens) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (s) p.set("secteur", s);
    if (l) p.set("liens", l);
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h1>Annuaire</h1>
          <p className="muted">
            {all.length} membre{all.length > 1 ? "s" : ""}
            {needle || secteur || liens ? ` · ${list.length} résultat${list.length > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Link href="/messages/nouveau" className="btn btn-primary">
          <IconMessage /> Message groupé
        </Link>
      </div>

      {aiConfigured() && (
      <Link href="/synergies" className="ai-banner">
        <span>
          <strong>Synergies IA</strong>
          <span className="small muted" style={{ display: "block" }}>Découvrez avec qui créer des liens dans le groupe.</span>
        </span>
        <span className="btn btn-primary btn-sm">Voir mes synergies</span>
      </Link>
      )}

      <form action="/" method="get" role="search" style={{ position: "relative" }}>
        {secteur && <input type="hidden" name="secteur" value={secteur} />}
        {liens && <input type="hidden" name="liens" value={liens} />}
        <label htmlFor="q" className="sr-only">Rechercher un membre</label>
        <span style={{ position: "absolute", left: 14, top: 13, color: "var(--muted)" }}><IconSearch /></span>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          className="input"
          placeholder="Nom, métier, ville, association, compétence… puis Entrée"
          style={{ paddingLeft: 44, minHeight: 48 }}
        />
      </form>

      <div className="chips" aria-label="Filtrer par lien">
        <Link href={chipHref(secteur, "")} className="chip" aria-current={!liens ? "true" : undefined}>Tout le groupe</Link>
        <Link href={chipHref(secteur, "connus")} className="chip" aria-current={liens === "connus" ? "true" : undefined}>Ceux que je connais ({[...rel.values()].filter((r) => r.level !== "pas_encore").length})</Link>
        <Link href={chipHref(secteur, "a-rencontrer")} className="chip" aria-current={liens === "a-rencontrer" ? "true" : undefined}>À rencontrer ({[...rel.values()].filter((r) => r.level === "pas_encore").length})</Link>
      </div>

      {secteurs.length > 0 && (
        <div className="chips" aria-label="Filtrer par secteur">
          <Link href={chipHref("")} className="chip" aria-current={!secteur ? "true" : undefined}>Tous</Link>
          {secteurs.map((s) => (
            <Link key={s} href={chipHref(s)} className="chip" aria-current={secteur === s ? "true" : undefined}>{s}</Link>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">Aucun membre ne correspond à cette recherche.</div>
      ) : (
        <div className="grid-cards">
          {list.map((m) => (
            <Link key={m.id} href={`/membres/${m.id}`} className="member-card">
              <div className="member-head">
                <Avatar p={m} size={56} />
                <div style={{ minWidth: 0 }}>
                  <div className="member-name">{fullName(m)}</div>
                  {m.titre && <div className="small" style={{ color: "var(--ink-3)" }}>{m.titre}</div>}
                </div>
              </div>
              {(m.entreprise || m.ville) && (
                <div className="small muted">{[m.entreprise, m.ville].filter(Boolean).join(" · ")}</div>
              )}
              <div className="row" style={{ gap: 6 }}>
                {rel.get(m.id) && (
                  <span className="pill" style={{ background: LEVELS[rel.get(m.id)!.level].bg, color: LEVELS[rel.get(m.id)!.level].fg }}>
                    {LEVELS[rel.get(m.id)!.level].short}
                  </span>
                )}
                {m.secteur && <span className="pill">{m.secteur}</span>}
                {(m.competences ?? []).slice(0, 2).map((c) => (
                  <span key={c} className="pill pill-neutral">{c}</span>
                ))}
              </div>
              {rel.get(m.id)?.context && <div className="xs muted">Mon lien : {rel.get(m.id)!.context}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
