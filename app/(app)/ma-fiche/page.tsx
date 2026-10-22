import Link from "next/link";
import Avatar from "@/components/Avatar";
import { requireMember } from "@/lib/auth";
import { saveProfile } from "./actions";

const ERRORS: Record<string, string> = {
  format: "Format de photo non accepté (JPG, PNG, WEBP ou GIF).",
  taille: "Photo trop lourde (5 Mo maximum).",
  upload: "La photo n'a pas pu être envoyée. Réessayez.",
  save: "La fiche n'a pas pu être enregistrée. Réessayez.",
};

const SECTEURS = [
  "Agriculture", "Art & Culture", "Commerce", "Conseil", "Éducation", "Entrepreneuriat", "Finance", "Immobilier",
  "Industrie", "Juridique", "Médias", "Santé", "Sécurité & Défense", "Social & Associatif", "Tech", "Tourisme", "Autre",
];

export default async function MaFichePage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const { me } = await requireMember();

  const parcours = (me.parcours ?? []).map((p) => [p.poste, p.org, p.dates].filter(Boolean).join(" | ")).join("\n");
  const assos = (me.assos ?? []).map((a) => [a.nom, a.role].filter(Boolean).join(" | ")).join("\n");

  return (
    <form action={saveProfile} className="stack narrow">
      <div className="between">
        <div>
          <h1>Ma fiche</h1>
          <p className="muted">Visible uniquement par les membres validés du groupe.</p>
        </div>
        <div className="row">
          <Link href={`/membres/${me.id}`} className="btn btn-secondary">Aperçu</Link>
          <button className="btn btn-primary">Enregistrer</button>
        </div>
      </div>

      {ok && <div className="alert alert-ok" role="status">Fiche enregistrée.</div>}
      {err && <div className="alert alert-error" role="alert">{ERRORS[err] ?? "Erreur."}</div>}

      <section className="card row" style={{ gap: 20 }}>
        <Avatar p={me} size={88} />
        <div className="stack-sm">
          <label className="field" style={{ flex: "none" }}>
            Photo de profil <span className="hint">JPG ou PNG, 5 Mo max.</span>
            <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp,image/gif" />
          </label>
          {me.avatar_url && (
            <label className="check"><input type="checkbox" name="remove_avatar" /> Retirer la photo</label>
          )}
        </div>
      </section>

      <section className="card stack">
        <div>
          <h2>Infos personnelles</h2>
          <p className="small muted">Pour qu&apos;on puisse vous situer et vous joindre.</p>
        </div>
        <div className="fields">
          <label className="field">Prénom<input className="input" name="prenom" defaultValue={me.prenom} required /></label>
          <label className="field">Nom<input className="input" name="nom" defaultValue={me.nom} required /></label>
          <label className="field">Ville<input className="input" name="ville" defaultValue={me.ville ?? ""} /></label>
          <label className="field">Téléphone / WhatsApp<input className="input" name="tel" type="tel" defaultValue={me.tel ?? ""} placeholder="+972 5…" /></label>
          <label className="field">Situation familiale<input className="input" name="famille" defaultValue={me.famille ?? ""} placeholder="Ex. : Marié, 3 enfants" /></label>
          <label className="field">Langues<input className="input" name="langues" defaultValue={me.langues ?? ""} placeholder="Français, Hébreu, Anglais" /></label>
        </div>
        <label className="check">
          <input type="checkbox" name="show_tel" defaultChecked={me.show_tel} /> Afficher mon téléphone / WhatsApp aux membres
        </label>
        <p className="xs muted">Email de connexion : {me.email}</p>
      </section>

      <section className="card stack">
        <div>
          <h2>Infos professionnelles</h2>
          <p className="small muted">Comme sur LinkedIn : votre poste actuel et votre parcours.</p>
        </div>
        <div className="fields">
          <label className="field">Poste actuel<input className="input" name="titre" defaultValue={me.titre ?? ""} /></label>
          <label className="field">Entreprise<input className="input" name="entreprise" defaultValue={me.entreprise ?? ""} /></label>
          <label className="field">Secteur
            <select className="input" name="secteur" defaultValue={me.secteur ?? ""}>
              <option value="">— Choisir —</option>
              {SECTEURS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="field">Profil LinkedIn<input className="input" name="linkedin_url" defaultValue={me.linkedin_url ?? ""} placeholder="linkedin.com/in/…" /></label>
          <label className="field full">Compétences <span className="hint">séparées par des virgules</span>
            <input className="input" name="competences" defaultValue={(me.competences ?? []).join(", ")} placeholder="Gestion de projet, Finance, Droit…" />
          </label>
          <label className="field full">Parcours <span className="hint">une ligne par poste : Poste | Entreprise | Dates</span>
            <textarea className="input" name="parcours" rows={4} defaultValue={parcours} placeholder={"Directeur commercial | Société X | 2019 – aujourd'hui\nIngénieur | Société Y | 2012 – 2019"} />
          </label>
        </div>
      </section>

      <section className="card stack">
        <div>
          <h2>Engagement Israël &amp; communautaire</h2>
          <p className="small muted">Associations, bénévolat, investissements communautaires.</p>
        </div>
        <label className="field full">Engagements <span className="hint">une ligne par association : Nom | Rôle</span>
          <textarea className="input" name="assos" rows={4} defaultValue={assos} placeholder={"Magen David Adom | Volontaire\nCommunauté de Netanya | Trésorier"} />
        </label>
      </section>

      <section className="card stack">
        <div>
          <h2>Texte libre</h2>
          <p className="small muted">Présentez-vous comme vous le souhaitez : qui vous êtes, ce que vous pouvez apporter au groupe.</p>
        </div>
        <label className="field full">
          <span className="sr-only">À propos de moi</span>
          <textarea className="input" name="bio" rows={6} defaultValue={me.bio ?? ""} maxLength={4000} />
        </label>
      </section>

      <div><button className="btn btn-primary">Enregistrer ma fiche</button></div>
    </form>
  );
}
