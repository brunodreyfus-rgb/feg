import { deleteRelation, saveRelation } from "@/app/(app)/membres/[id]/relation-actions";
import { LEVELS, type Relation } from "@/lib/relations";
import { formatDate } from "@/lib/utils";

/** Carte « Mon lien avec … » sur la fiche d'un membre. Visible uniquement par son auteur. */
export default function RelationCard({
  memberId,
  prenom,
  relation,
  status,
}: {
  memberId: string;
  prenom: string;
  relation: Relation | null;
  status?: string;
}) {
  return (
    <section id="mon-lien" className="card card-tight stack-sm relation-card">
      <div>
        <h2 style={{ fontSize: 18 }}>Mon lien avec {prenom}</h2>
        <p className="xs muted">Privé : visible uniquement par vous.</p>
      </div>

      {status === "ok" && <div className="alert alert-ok" role="status">Enregistré.</div>}
      {status === "err" && <div className="alert alert-error" role="alert">Impossible d&apos;enregistrer. Réessayez.</div>}

      <form action={saveRelation} className="stack-sm">
        <input type="hidden" name="member_id" value={memberId} />
        <fieldset style={{ border: 0, margin: 0, padding: 0 }} className="stack-sm">
          <legend className="small" style={{ fontWeight: 600, marginBottom: 4 }}>On se connaît ?</legend>
          {(Object.keys(LEVELS) as (keyof typeof LEVELS)[]).map((k) => (
            <label key={k} className="check" style={{ minHeight: 36 }}>
              <input type="radio" name="level" value={k} defaultChecked={(relation?.level ?? "croise") === k} />
              {LEVELS[k].label}
            </label>
          ))}
        </fieldset>
        <label className="field">
          Où / comment on s&apos;est connus
          <input
            className="input"
            name="context"
            maxLength={200}
            defaultValue={relation?.context ?? ""}
            placeholder="Ex. : réserve 2024, mariage de David, réunion FEG Netanya…"
          />
        </label>
        <label className="field">
          Mes notes
          <textarea
            className="input"
            name="note"
            rows={4}
            maxLength={4000}
            defaultValue={relation?.note ?? ""}
            placeholder="Ce qu'on s'est dit, ce que je peux lui apporter, à rappeler…"
          />
        </label>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-primary btn-sm">Enregistrer</button>
          {relation && <span className="xs muted">Mis à jour le {formatDate(relation.updated_at)}</span>}
        </div>
      </form>

      {relation && (
        <form action={deleteRelation}>
          <input type="hidden" name="member_id" value={memberId} />
          <button className="link-btn xs" style={{ color: "var(--danger)" }}>Effacer ma note</button>
        </form>
      )}
    </section>
  );
}
