import AiPanel, { AiAsk, Spark } from "@/components/AiPanel";
import { requireMember } from "@/lib/auth";
import { redirect } from "next/navigation";
import { aiConfigured } from "@/lib/ai/provider";

export const maxDuration = 60;

export default async function SynergiesPage() {
  const { me } = await requireMember();
  if (!aiConfigured()) redirect("/");
  const ficheVide = !me.titre && !me.bio && !(me.competences ?? []).length;

  return (
    <div className="stack narrow">
      <div>
        <h1 className="row" style={{ gap: 10 }}><Spark /> Synergies IA</h1>
        <p className="muted">
          L&apos;assistant repère les membres avec qui créer des liens : métiers complémentaires, projets, engagements communs.
        </p>
        <p className="xs muted" style={{ marginTop: 6 }}>
          Il lit les fiches, les publications « Réalisations » et le fil « Tous ». Jamais vos conversations privées, ni les téléphones et emails.
        </p>
      </div>

      {ficheVide && (
        <div className="alert alert-info">
          Votre fiche est encore peu remplie : <a href="/ma-fiche">complétez-la</a> pour des suggestions plus pertinentes.
        </div>
      )}

      <section className="card stack-sm">
        <h2>Mes synergies</h2>
        <p className="small muted">3 à 5 membres à rencontrer, avec la raison et une idée de premier message.</p>
        <AiPanel kind="synergies" autoLoad={false} buttonLabel="Trouver mes synergies" />
      </section>

      <section className="card stack-sm">
        <h2>Demander à l&apos;IA</h2>
        <p className="small muted">Posez une question sur le réseau : un métier, une ville, un besoin…</p>
        <AiAsk />
      </section>

      {me.is_admin && (
        <section className="card stack-sm">
          <h2>Synergies du groupe <span className="pill" style={{ marginLeft: 6 }}>Admin</span></h2>
          <p className="small muted">Les mises en relation à provoquer dans tout le groupe, avec l&apos;action à mener.</p>
          <AiPanel kind="admin" buttonLabel="Analyser le groupe" />
        </section>
      )}
    </div>
  );
}
