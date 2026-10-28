"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function ForgotPassword() {
  const router = useRouter();
  const params = useSearchParams();
  const linkError = params.get("erreur") === "lien";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/mot-de-passe/nouveau`,
    });
    setLoading(false);
    if (error) setError(/rate|seconds/i.test(error.message) ? "Trop de demandes rapprochées : patientez une minute puis réessayez." : error.message);
    else setSent(true);
  }

  async function useCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const token = String(fd.get("code")).replace(/\s/g, "");
    const password = String(fd.get("password"));
    if (password.length < 8) return setError("Le mot de passe doit faire au moins 8 caractères.");
    if (password !== String(fd.get("password2"))) return setError("Les deux mots de passe ne sont pas identiques.");
    setLoading(true);
    const supabase = createClient();
    const { error: e1 } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "recovery" });
    if (e1) {
      setLoading(false);
      return setError("Code incorrect ou expiré. Redemandez un email et utilisez le code le plus récent.");
    }
    const { error: e2 } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (e2) return setError(e2.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="auth-center">
      <div className="auth-card">
        <h2 style={{ fontSize: 24 }}>Mot de passe oublié</h2>

        {linkError && !sent && (
          <div className="alert alert-info">
            Ce lien n&apos;a pas pu être utilisé : il a expiré, a déjà servi, ou a été ouvert dans un autre navigateur que celui
            de la demande. Redemandez un email ci-dessous et utilisez de préférence le <strong>code</strong> qu&apos;il contient.
          </div>
        )}
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {!sent ? (
          <form onSubmit={sendEmail} className="stack-sm">
            <label className="field">Email
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <button className="btn btn-primary" disabled={loading}>{loading ? "Envoi…" : "Recevoir un email"}</button>
          </form>
        ) : (
          <>
            <div className="alert alert-ok">
              Email envoyé à <strong>{email}</strong> (pensez aux spams). Deux possibilités :
              <br />• cliquer sur le lien, <strong>dans ce même navigateur</strong> ;
              <br />• ou saisir ci-dessous le code reçu, depuis n&apos;importe quel appareil.
            </div>
            <form onSubmit={useCode} className="stack-sm">
              <label className="field">Code reçu par email
                <input className="input" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={10} placeholder="123456" />
              </label>
              <label className="field">Nouveau mot de passe <span className="hint">8 caractères minimum</span>
                <input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" />
              </label>
              <label className="field">Confirmer le mot de passe
                <input className="input" name="password2" type="password" required minLength={8} autoComplete="new-password" />
              </label>
              <button className="btn btn-primary" disabled={loading}>{loading ? "Vérification…" : "Changer mon mot de passe"}</button>
            </form>
            <button type="button" className="link-btn small" style={{ alignSelf: "flex-start" }} onClick={() => setSent(false)}>
              Renvoyer un email
            </button>
          </>
        )}
        <Link href="/login" className="small">Retour à la connexion</Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPassword />
    </Suspense>
  );
}
