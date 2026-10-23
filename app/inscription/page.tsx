"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password.length < 8) return setError("Le mot de passe doit faire au moins 8 caractères.");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")).trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/en-attente`,
        data: {
          feg: true,
          prenom: String(fd.get("prenom")).trim(),
          nom: String(fd.get("nom")).trim(),
          tel: String(fd.get("tel")).trim(),
          parrain: String(fd.get("parrain")).trim(),
        },
      },
    });
    setLoading(false);
    if (error) return setError(/registered/i.test(error.message) ? "Un compte existe déjà avec cet email." : error.message);
    setDone(true);
  }

  if (done) {
    return (
      <div className="auth-center">
        <div className="auth-card">
          <h2 style={{ fontSize: 24 }}>Demande envoyée</h2>
          <p className="muted">
            1. Confirmez votre adresse en cliquant sur le lien reçu par email.<br />
            2. Un administrateur du groupe validera ensuite votre accès.
          </p>
          <Link href="/login" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>Retour à la connexion</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-center">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="row">
          <Logo size={56} />
          <h2 style={{ fontSize: 24 }}>Demander un accès</h2>
        </div>
        <p className="muted">Votre demande sera validée par un administrateur du groupe.</p>
        <p className="small muted">Vous avez déjà un compte avec cet email ? <Link href="/login">Connectez-vous</Link> directement : la demande d&apos;accès vous sera proposée.</p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="fields">
          <label className="field">Prénom<input className="input" name="prenom" required autoComplete="given-name" /></label>
          <label className="field">Nom<input className="input" name="nom" required autoComplete="family-name" /></label>
        </div>
        <label className="field">Email<input className="input" name="email" type="email" required autoComplete="email" /></label>
        <label className="field">Téléphone WhatsApp<input className="input" name="tel" type="tel" placeholder="+972 5…" autoComplete="tel" /></label>
        <label className="field">Mot de passe <span className="hint">8 caractères minimum</span>
          <input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <label className="field">Qui vous a invité dans le groupe ?<input className="input" name="parrain" required placeholder="Nom du membre parrain" /></label>
        <div className="row">
          <button className="btn btn-primary" disabled={loading}>{loading ? "Envoi…" : "Envoyer la demande"}</button>
          <Link href="/login" className="btn btn-secondary">Retour</Link>
        </div>
      </form>
    </div>
  );
}
