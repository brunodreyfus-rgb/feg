import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import { IconBriefcase, IconMail, IconMessage, IconWhatsApp } from "@/components/Icons";
import { requireMember } from "@/lib/auth";
import type { Post, Profile } from "@/lib/types";
import { POST_TYPES, formatDate, fullName, safeUrl, waLink } from "@/lib/utils";
import { startDirect } from "../../messages/actions";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me } = await requireMember();

  const { data: p } = await supabase.from("feg_profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!p) notFound();

  const { data: posts } = await supabase
    .from("feg_posts")
    .select("*")
    .eq("author_id", id)
    .order("created_at", { ascending: false });

  const isMe = p.id === me.id;
  const tel = p.show_tel || isMe ? p.tel : null;
  const wa = waLink(tel, `Shalom ${p.prenom}, c'est ${me.prenom} (Frères en Guerre).`);
  const linkedin = safeUrl(p.linkedin_url);

  return (
    <div className="stack">
      <Link href="/" className="small" style={{ fontWeight: 600 }}>← Retour à l&apos;annuaire</Link>

      <section className="profile-hero">
        <div className="profile-cover" />
        <div className="profile-body">
          <div className="stack-sm">
            <Avatar p={p} size={112} className="profile-avatar" />
            <h1>{fullName(p)}</h1>
            {(p.titre || p.entreprise) && (
              <div style={{ fontSize: 17, color: "var(--ink-3)" }}>{[p.titre, p.entreprise].filter(Boolean).join(" · ")}</div>
            )}
            <div className="row small muted" style={{ gap: 8 }}>
              {p.ville && <span>{p.ville}</span>}
              <span>Membre depuis {new Date(p.created_at).getFullYear()}</span>
              {p.secteur && <span className="pill">{p.secteur}</span>}
            </div>
          </div>
          <div className="row">
            {isMe ? (
              <Link href="/ma-fiche" className="btn btn-primary">Modifier ma fiche</Link>
            ) : (
              <>
                <form action={startDirect}>
                  <input type="hidden" name="member_id" value={p.id} />
                  <button className="btn btn-primary"><IconMessage /> Message</button>
                </form>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-wa"><IconWhatsApp /> WhatsApp</a>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}`} className="btn btn-secondary"><IconMail /> Email</a>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <div className="two-col">
        <div className="main">
          {p.bio && (
            <section className="card">
              <h2 style={{ marginBottom: 10 }}>À propos</h2>
              <p className="pre" style={{ color: "var(--ink-2)" }}>{p.bio}</p>
            </section>
          )}

          <section className="card">
            <h2 style={{ marginBottom: 16 }}>Parcours professionnel</h2>
            {p.parcours?.length ? (
              <div className="stack" style={{ gap: 16 }}>
                {p.parcours.map((x, i) => (
                  <div key={i} className="timeline-item">
                    <span className="timeline-icon"><IconBriefcase /></span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{x.poste}</div>
                      {x.org && <div className="small" style={{ color: "var(--ink-3)" }}>{x.org}</div>}
                      {x.dates && <div className="xs muted">{x.dates}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Non renseigné.</p>
            )}
          </section>

          <section className="card">
            <h2 style={{ marginBottom: 16 }}>Engagement Israël &amp; communautaire</h2>
            {p.assos?.length ? (
              <div className="stack-sm">
                {p.assos.map((a, i) => (
                  <div key={i} className="asso">
                    <span style={{ fontWeight: 600 }}>{a.nom}</span>
                    {a.role && <span className="asso-role">{a.role}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Non renseigné.</p>
            )}
          </section>

          <section className="card">
            <h2 style={{ marginBottom: 16 }}>Réalisations &amp; projets</h2>
            {posts?.length ? (
              <div className="stack-sm">
                {(posts as Post[]).map((x) => (
                  <Link key={x.id} href={`/realisations#${x.id}`} className="member-card" style={{ padding: 14, gap: 6 }}>
                    <span className="pill" style={{ background: POST_TYPES[x.type].bg, color: POST_TYPES[x.type].fg, alignSelf: "flex-start" }}>
                      {POST_TYPES[x.type].label}
                    </span>
                    <span style={{ fontWeight: 700 }}>{x.title}</span>
                    <span className="xs muted">{formatDate(x.created_at)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">Aucune publication pour l&apos;instant.</p>
            )}
          </section>
        </div>

        <aside className="side">
          <section className="card card-tight">
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>Infos personnelles</h2>
            <dl className="info">
              {p.ville && (<div><dt>Ville</dt><dd>{p.ville}</dd></div>)}
              {p.famille && (<div><dt>Famille</dt><dd>{p.famille}</dd></div>)}
              {p.langues && (<div><dt>Langues</dt><dd>{p.langues}</dd></div>)}
              <div><dt>Téléphone / WhatsApp</dt><dd>{tel || "Non communiqué"}</dd></div>
              {p.email && (<div><dt>Email</dt><dd>{p.email}</dd></div>)}
              {linkedin && (<div><dt>LinkedIn</dt><dd><a href={linkedin} target="_blank" rel="noopener noreferrer">Voir le profil</a></dd></div>)}
            </dl>
          </section>
          {p.competences?.length ? (
            <section className="card card-tight">
              <h2 style={{ fontSize: 18, marginBottom: 14 }}>Compétences</h2>
              <div className="chips">
                {p.competences.map((c) => (
                  <span key={c} className="pill pill-neutral" style={{ fontSize: 13, padding: "5px 12px" }}>{c}</span>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
