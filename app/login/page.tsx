"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

function translate(msg: string) {
  if (/invalid login/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/email not confirmed/i.test(msg)) return "Votre email n'est pas encore confirmé : cliquez sur le lien reçu par email.";
  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")).trim(),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) return setError(translate(error.message));
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="auth-split">
      <div className="auth-brand">
        <span className="brand-name" style={{ fontSize: 18, color: "#fff" }}>Frères en Guerre · FEG</span>
        <div className="stack" style={{ maxWidth: 520 }}>
          <Logo size={168} className="logo-hero" />
          <h1>L&apos;annuaire privé du groupe.</h1>
          <p style={{ fontSize: 18, color: "#C9CFD6" }}>
            Retrouver un frère, découvrir son parcours, lui écrire, partager nos projets. Accès réservé aux membres validés.
          </p>
        </div>
        <p className="xs" style={{ color: "#AEB6BF" }}>Espace privé · les fiches ne sont visibles que par les membres</p>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={onSubmit}>
          <h2 style={{ fontSize: 28 }}>Connexion</h2>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <label className="field">
            Email
            <input className="input" name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            Mot de passe
            <input className="input" name="password" type="password" required autoComplete="current-password" />
          </label>
          <button className="btn btn-primary" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button>
          <Link href="/mot-de-passe" className="small">Mot de passe oublié ?</Link>
          <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%", margin: 0 }} />
          <p className="small muted">
            Pas encore membre ? <Link href="/inscription">Demander un accès</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
