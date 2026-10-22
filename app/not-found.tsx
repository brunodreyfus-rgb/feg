import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth-center">
      <div className="auth-card">
        <h2 style={{ fontSize: 24 }}>Page introuvable</h2>
        <p className="muted">Cette page n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
        <Link href="/" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Retour à l&apos;annuaire</Link>
      </div>
    </div>
  );
}
