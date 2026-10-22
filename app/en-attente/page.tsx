import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("status, prenom").eq("id", user.id).single();
  if (me?.status === "approved") redirect("/");

  const rejected = me?.status === "rejected";
  return (
    <div className="auth-center">
      <div className="auth-card">
        <span className="logo">FEG</span>
        <h2 style={{ fontSize: 24 }}>{rejected ? "Accès non validé" : `Merci${me?.prenom ? " " + me.prenom : ""}, votre demande est en attente`}</h2>
        <p className="muted">
          {rejected
            ? "Votre demande n'a pas été acceptée. Si vous pensez que c'est une erreur, contactez un administrateur du groupe."
            : "Un administrateur du groupe va vérifier votre demande. Revenez sur cette page une fois prévenu : vous pourrez alors créer votre fiche."}
        </p>
        <div className="row">
          <Link href="/en-attente" className="btn btn-primary">Vérifier à nouveau</Link>
          <form action="/auth/signout" method="post">
            <button className="btn btn-secondary">Se déconnecter</button>
          </form>
        </div>
      </div>
    </div>
  );
}
