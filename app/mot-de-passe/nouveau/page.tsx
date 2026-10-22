"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NewPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    if (password.length < 8) return setError("8 caractères minimum.");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) return setError(error.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="auth-center">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2 style={{ fontSize: 24 }}>Nouveau mot de passe</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <label className="field">Nouveau mot de passe
          <input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <button className="btn btn-primary">Enregistrer</button>
      </form>
    </div>
  );
}
