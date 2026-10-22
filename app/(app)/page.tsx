import Link from "next/link";
import Avatar from "@/components/Avatar";
import { IconMessage, IconSearch } from "@/components/Icons";
import { requireMember } from "@/lib/auth";
import type { Profile } from "@/lib/types";
import { fullName } from "@/lib/utils";

export default async function AnnuairePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; secteur?: string }>;
}) {
  const { q = "", secteur = "" } = await searchParams;
  const { supabase } = await requireMember();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "approved")
    .order("prenom", { ascending: true });
  const all = (data ?? []) as Profile[];

  const needle = q.trim().toLowerCase();
  const list = all.filter((m) => {
    if (secteur && (m.secteur ?? "") !== secteur) return false;
    if (!needle) return true;
    const hay = [
      m.prenom, m.nom, m.titre, m.entreprise, m.ville, m.secteur, m.bio,
      ...(m.competences ?? []),
      ...(m.assos ?? []).map((a) => `${a.nom} ${a.role}`),
      ...(m.parcours ?? []).map((p) => `${p.poste} ${p.org}`),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });

  const secteurs = Array.from(new Set(all.map((m) => m.secteur).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "fr"));
  const chipHref = (s: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (s) p.set("secteur", s);
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
            {needle || secteur ? ` · ${list.length} résultat${list.length > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Link href="/messages/nouveau" className="btn btn-primary">
          <IconMessage /> Message groupé
        </Link>
      </div>

      <form action="/" method="get" role="search" style={{ position: "relative" }}>
        {secteur && <input type="hidden" name="secteur" value={secteur} />}
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
                {m.secteur && <span className="pill">{m.secteur}</span>}
                {(m.competences ?? []).slice(0, 2).map((c) => (
                  <span key={c} className="pill pill-neutral">{c}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
