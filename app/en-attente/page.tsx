import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestAccess } from "./actions";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("feg_profiles").select("status, prenom").eq("id", user.id).maybeSingle();
  if (me?.status === "approved") redirect("/");

  const signOut = (
    <form action="/auth/signout" method="post">
      <button className="btn btn-secondary">Se déconnecter</button>
    </form>
  );

  // Compte existant sans fiche FEG : on propose la demande d'accès
  if (!me) {
    return (
      <div className="auth-center">
        <form action={requestAccess} className="auth-card">
          <Logo size={72} />
          <h2 style={{ fontSize: 24 }}>Demander l&apos;accès à l&apos;annuaire</h2>
          <p className="muted">Connecté en tant que {user.email}. Complétez ces informations : un administrateur validera votre accès.</p>
          <div className="fields">
            <label className="field">Prénom<input className="input" name="prenom" required /></label>
            <label className="field">Nom<input className="input" name="nom" required /></label>
          </div>
          <label className="field">Téléphone WhatsApp<input className="input" name="tel" type="tel" placeholder="+972 5…" /></label>
          <label className="field">Qui vous a invité dans le groupe ?<input className="input" name="parrain" required /></label>
          <div className="row">
            <button className="btn btn-primary">Envoyer la demande</button>
          </div>
        </form>
      </div>
    );
  }

  const rejected = me.status === "rejected";
  return (
    <div className="auth-center">
      <div className="auth-card">
        <Logo size={72} />
        <h2 style={{ fontSize: 24 }}>{rejected ? "Accès non validé" : `Merci${me.prenom ? " " + me.prenom : ""}, votre demande est en attente`}</h2>
        <p className="muted">
          {rejected
            ? "Votre demande n'a pas été acceptée. Si vous pensez que c'est une erreur, contactez un administrateur du groupe."
            : "Un administrateur du groupe va vérifier votre demande. Revenez sur cette page une fois prévenu : vous pourrez alors créer votre fiche."}
        </p>
        <div className="row">
          {/* lien classique (rechargement complet) pour relire le statut à coup sûr */}
          <a href="/" className="btn btn-primary">Vérifier à nouveau</a>
          {signOut}
        </div>
      </div>
    </div>
  );
}
