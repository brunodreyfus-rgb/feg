"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Choisir un nouveau mot de passe : après le lien de réinitialisation, ou depuis « Ma fiche » quand on est connecté. */
export default function NewPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [noSession, setNoSession] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password.length < 8) return setError("Le mot de passe doit faire au moins 8 caractères.");
    if (password !== String(fd.get("password2"))) return setError("Les deux mots de passe ne sont pas identiques.");
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      if (/session/i.test(error.message)) return setNoSession(true);
      if (/different from the old/i.test(error.message)) return setError("Choisissez un mot de passe différent de l'ancien.");
      return setError(error.message);
    }
    router.replace("/ma-fiche?mdp=ok");
    router.refresh();
  }

  return (
    <div className="auth-center">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2 style={{ fontSize: 24 }}>Nouveau mot de passe</h2>
        {noSession ? (
          <div className="alert alert-info">
            Votre session a expiré. <Link href="/mot-de-passe">Redemandez un email de réinitialisation</Link> et utilisez le code qu&apos;il contient.
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <label className="field">Nouveau mot de passe <span className="hint">8 caractères minimum</span>
              <input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <label className="field">Confirmer le mot de passe
              <input className="input" name="password2" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <button className="btn btn-primary" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer"}</button>
          </>
        )}
      </form>
    </div>
  );
}
