import Link from "next/link";
import Avatar from "@/components/Avatar";
import { requireMember } from "@/lib/auth";
import type { Post } from "@/lib/types";
import { POST_TYPES, formatDate, fullName } from "@/lib/utils";
import { startDirect } from "../messages/actions";
import { createPost, deletePost, toggleInterest } from "./actions";

const ERR: Record<string, string> = {
  titre: "Ajoutez un titre.",
  image: "Image non acceptée (JPG, PNG, WEBP, GIF · 5 Mo max.).",
  save: "La publication n'a pas pu être enregistrée.",
};

type Author = { id: string; prenom: string; nom: string; avatar_url: string | null; titre: string | null };

export default async function RealisationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; type?: string }>;
}) {
  const { ok, err, type } = await searchParams;
  const { supabase, me } = await requireMember();

  let query = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(100);
  if (type && type in POST_TYPES) query = query.eq("type", type);
  const { data } = await query;
  const posts = (data ?? []) as Post[];

  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const ids = posts.map((p) => p.id);
  const [{ data: authors }, { data: interests }] = await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("id, prenom, nom, avatar_url, titre").in("id", authorIds)
      : Promise.resolve({ data: [] as Author[] }),
    ids.length
      ? supabase.from("post_interests").select("post_id, user_id").in("post_id", ids)
      : Promise.resolve({ data: [] as { post_id: string; user_id: string }[] }),
  ]);
  const authorOf = new Map(((authors ?? []) as Author[]).map((a) => [a.id, a]));

  return (
    <div className="stack narrow">
      <div>
        <h1>Réalisations &amp; projets</h1>
        <p className="muted">Partagez ce que vous construisez, cherchez des partenaires, faites connaître vos réussites.</p>
      </div>

      {ok && <div className="alert alert-ok" role="status">Publication partagée avec le groupe.</div>}
      {err && <div className="alert alert-error" role="alert">{ERR[err] ?? "Erreur."}</div>}

      <form action={createPost} className="card stack-sm">
        <h2 style={{ fontSize: 18 }}>Nouvelle publication</h2>
        <div className="fields">
          <label className="field">Type
            <select name="type" className="input" defaultValue="projet">
              {Object.entries(POST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="field" style={{ flexGrow: 3 }}>Titre
            <input name="title" className="input" required maxLength={200} placeholder="Titre de votre projet ou réalisation" />
          </label>
          <label className="field full">Description
            <textarea name="body" className="input" rows={4} maxLength={5000} placeholder="Ce que vous avez accompli, ce que vous cherchez…" />
          </label>
          <label className="field">Lien <span className="hint">facultatif</span>
            <input name="link_url" className="input" placeholder="https://…" />
          </label>
          <label className="field">Image <span className="hint">facultatif · 5 Mo max.</span>
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
          </label>
        </div>
        <button className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Publier</button>
      </form>

      <div className="chips" aria-label="Filtrer par type">
        <Link href="/realisations" className="chip" aria-current={!type ? "true" : undefined}>Tout</Link>
        {Object.entries(POST_TYPES).map(([k, v]) => (
          <Link key={k} href={`/realisations?type=${k}`} className="chip" aria-current={type === k ? "true" : undefined}>{v.label}</Link>
        ))}
      </div>

      {posts.length === 0 && <div className="empty">Aucune publication pour l&apos;instant. Soyez le premier !</div>}

      {posts.map((p) => {
        const a = authorOf.get(p.author_id);
        const t = POST_TYPES[p.type];
        const list = (interests ?? []).filter((i) => i.post_id === p.id);
        const mine = list.some((i) => i.user_id === me.id);
        const canEdit = p.author_id === me.id || me.is_admin;
        return (
          <article key={p.id} id={p.id} className="card post">
            <div className="row" style={{ gap: 12 }}>
              {a && (
                <Link href={`/membres/${a.id}`} className="author-link">
                  <Avatar p={a} size={44} />
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600 }}>{fullName(a)}</span>
                    <span className="xs muted">{formatDate(p.created_at)}{a.titre ? ` · ${a.titre}` : ""}</span>
                  </span>
                </Link>
              )}
              <span className="pill" style={{ marginLeft: "auto", background: t.bg, color: t.fg }}>{t.label}</span>
            </div>
            <h2>{p.title}</h2>
            {p.body && <p className="pre" style={{ color: "var(--ink-2)" }}>{p.body}</p>}
            {p.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt="" className="post-img" />
            )}
            {p.link_url && (
              <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="small" style={{ wordBreak: "break-all" }}>{p.link_url}</a>
            )}
            <div className="row">
              <form action={toggleInterest}>
                <input type="hidden" name="post_id" value={p.id} />
                <input type="hidden" name="interested" value={mine ? "1" : "0"} />
                <button className="btn btn-secondary btn-sm" aria-pressed={mine} style={mine ? { background: "var(--accent-soft)", color: "var(--accent)" } : undefined}>
                  {mine ? "✓ Intéressé" : "Je suis intéressé"} · {list.length}
                </button>
              </form>
              {p.author_id !== me.id && (
                <form action={startDirect}>
                  <input type="hidden" name="member_id" value={p.author_id} />
                  <button className="btn btn-secondary btn-sm">Contacter l&apos;auteur</button>
                </form>
              )}
              {canEdit && (
                <form action={deletePost} style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="post_id" value={p.id} />
                  <button className="btn btn-danger btn-sm">Supprimer</button>
                </form>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
