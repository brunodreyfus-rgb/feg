"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/mot-de-passe/nouveau`,
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="auth-center">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2 style={{ fontSize: 24 }}>Mot de passe oublié</h2>
        {sent ? (
          <div className="alert alert-ok">Si un compte existe pour cet email, un lien de réinitialisation vient d&apos;être envoyé.</div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            <label className="field">Email<input className="input" name="email" type="email" required /></label>
            <button className="btn btn-primary">Recevoir un lien</button>
          </>
        )}
        <Link href="/login" className="small">Retour à la connexion</Link>
      </form>
    </div>
  );
}
