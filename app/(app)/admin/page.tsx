import Link from "next/link";
import Avatar from "@/components/Avatar";
import { requireAdmin } from "@/lib/auth";
import type { Profile } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";
import { approve, reject, revoke, toggleAdmin } from "./actions";

export default async function AdminPage() {
  const { supabase, me } = await requireAdmin();
  const { data } = await supabase.from("feg_profiles").select("*").order("created_at", { ascending: false });
  const all = (data ?? []) as Profile[];
  const pending = all.filter((p) => p.status === "pending");
  const approved = all.filter((p) => p.status === "approved");
  const rejected = all.filter((p) => p.status === "rejected");
  const { count: postCount } = await supabase.from("feg_posts").select("id", { count: "exact", head: true });

  return (
    <div className="stack narrow">
      <div>
        <h1>Administration</h1>
        <p className="muted">Validez les demandes d&apos;accès et gérez les membres.</p>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <div className="card card-tight"><div className="small muted">Membres actifs</div><div className="stat">{approved.length}</div></div>
        <div className="card card-tight"><div className="small muted">En attente</div><div className="stat">{pending.length}</div></div>
        <div className="card card-tight"><div className="small muted">Publications</div><div className="stat">{postCount ?? 0}</div></div>
      </div>

      <section className="card" style={{ padding: 0 }}>
        <h2 style={{ padding: "20px 24px 12px" }}>Demandes d&apos;accès</h2>
        {pending.length === 0 && <p className="muted" style={{ padding: "0 24px 20px" }}>Aucune demande en attente.</p>}
        {pending.map((p) => (
          <div key={p.id} className="row" style={{ padding: "16px 24px", borderTop: "1px solid var(--line)", gap: 16 }}>
            <Avatar p={p} size={44} />
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{fullName(p)}</div>
              <div className="small muted" style={{ wordBreak: "break-all" }}>{[p.email, p.tel].filter(Boolean).join(" · ")}</div>
              <div className="xs" style={{ color: "var(--ink-3)" }}>
                Parrain : <strong>{p.parrain || "non indiqué"}</strong> · demandé le {formatDate(p.created_at, true)}
              </div>
            </div>
            <div className="row">
              <form action={approve}><input type="hidden" name="id" value={p.id} /><button className="btn btn-primary btn-sm">Valider</button></form>
              <form action={reject}><input type="hidden" name="id" value={p.id} /><button className="btn btn-secondary btn-sm">Refuser</button></form>
            </div>
          </div>
        ))}
      </section>

      <section className="card" style={{ padding: 0 }}>
        <h2 style={{ padding: "20px 24px 12px" }}>Membres ({approved.length})</h2>
        {approved.map((p) => (
          <div key={p.id} className="row" style={{ padding: "12px 24px", borderTop: "1px solid var(--line)", gap: 14 }}>
            <Avatar p={p} size={36} />
            <Link href={`/membres/${p.id}`} style={{ flex: "1 1 220px", fontWeight: 600, color: "var(--ink)" }}>
              {fullName(p)} {p.is_admin && <span className="pill" style={{ marginLeft: 6 }}>Admin</span>}
            </Link>
            {p.id !== me.id && (
              <div className="row">
                <form action={toggleAdmin}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="make" value={p.is_admin ? "0" : "1"} />
                  <button className="btn btn-secondary btn-sm">{p.is_admin ? "Retirer admin" : "Nommer admin"}</button>
                </form>
                <form action={revoke}><input type="hidden" name="id" value={p.id} /><button className="btn btn-danger btn-sm">Retirer l&apos;accès</button></form>
              </div>
            )}
          </div>
        ))}
      </section>

      {rejected.length > 0 && (
        <section className="card" style={{ padding: 0 }}>
          <h2 style={{ padding: "20px 24px 12px" }}>Refusés / retirés ({rejected.length})</h2>
          {rejected.map((p) => (
            <div key={p.id} className="row" style={{ padding: "12px 24px", borderTop: "1px solid var(--line)", gap: 14 }}>
              <span style={{ flex: "1 1 220px" }}>{fullName(p)} <span className="xs muted">{p.email}</span></span>
              <form action={approve}><input type="hidden" name="id" value={p.id} /><button className="btn btn-secondary btn-sm">Réactiver</button></form>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
