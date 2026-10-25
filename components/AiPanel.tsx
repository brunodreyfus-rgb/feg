"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Avatar from "./Avatar";
import { IconMessage } from "./Icons";
import type { AiPerson, AiResult } from "@/lib/ai/types";

type Kind = "synergies" | "project" | "ask" | "admin";

async function runAi(payload: Record<string, unknown>): Promise<AiResult> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Erreur");
  return data as AiResult;
}

const sinceLabel = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { timeZone: "Asia/Jerusalem", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function Spark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </svg>
  );
}

function PersonRow({ p, withOpener }: { p: AiPerson; withOpener?: boolean }) {
  const href = `/messages/nouveau?to=${p.id}${withOpener && p.opener ? `&text=${encodeURIComponent(p.opener)}` : ""}`;
  return (
    <div className="ai-person">
      <Link href={`/membres/${p.id}`} className="author-link" style={{ minWidth: 0 }}>
        <Avatar p={{ id: p.id, prenom: p.name.split(" ")[0] ?? "", nom: p.name.split(" ").slice(1).join(" "), avatar_url: p.avatar_url }} size={44} />
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontWeight: 700 }}>{p.name}</span>
          {(p.titre || p.ville) && <span className="xs muted">{[p.titre, p.ville].filter(Boolean).join(" · ")}</span>}
        </span>
      </Link>
      {p.reason && <p className="small" style={{ color: "var(--ink-2)" }}>{p.reason}</p>}
      {withOpener && p.opener && <p className="xs muted" style={{ fontStyle: "italic" }}>Suggestion de message : « {p.opener} »</p>}
      <Link href={href} className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }}>
        <IconMessage /> Écrire
      </Link>
    </div>
  );
}

/** Bloc IA générique : "Mes synergies", "Qui peut aider ?" (projet) ou "Vue admin". */
export default function AiPanel({
  kind,
  postId,
  autoLoad = false,
  buttonLabel,
  compact = false,
}: {
  kind: Exclude<Kind, "ask">;
  postId?: string;
  autoLoad?: boolean;
  buttonLabel: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(!compact);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        setData(await runAi({ kind, postId, refresh }));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [kind, postId],
  );

  useEffect(() => {
    if (autoLoad) load(false);
  }, [autoLoad, load]);

  if (compact && !open) {
    return (
      <button type="button" className="btn btn-secondary btn-sm ai-btn" onClick={() => { setOpen(true); load(false); }}>
        <Spark /> {buttonLabel}
      </button>
    );
  }

  return (
    <div className="ai-box" aria-live="polite">
      {!data && !loading && !error && (
        <button type="button" className="btn btn-primary ai-btn" onClick={() => load(false)}>
          <Spark /> {buttonLabel}
        </button>
      )}
      {loading && <p className="small muted">L&apos;IA analyse les fiches et les échanges du groupe… (10 à 30 secondes)</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {data?.people && (
        data.people.length === 0 ? (
          <p className="small muted">Pas de suggestion solide pour l&apos;instant : plus les fiches sont complètes, meilleures sont les propositions.</p>
        ) : (
          <div className="ai-grid">
            {data.people.map((p) => <PersonRow key={p.id} p={p} withOpener={kind === "synergies"} />)}
          </div>
        )
      )}

      {data?.groups && (
        data.groups.length === 0 ? (
          <p className="small muted">Pas de synergie évidente pour l&apos;instant.</p>
        ) : (
          <div className="stack-sm">
            {data.groups.map((g, i) => (
              <div key={i} className="ai-person">
                <strong>{g.title}</strong>
                <div className="row" style={{ gap: 6 }}>
                  {g.people.map((p) => (
                    <Link key={p.id} href={`/membres/${p.id}`} className="chip">{p.name}</Link>
                  ))}
                </div>
                <p className="small" style={{ color: "var(--ink-2)" }}>{g.reason}</p>
                {g.action && <p className="small"><strong>À faire :</strong> {g.action}</p>}
                <Link href={`/messages/nouveau?to=${g.people.map((p) => p.id).join(",")}`} className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }}>
                  <IconMessage /> Les mettre en relation
                </Link>
              </div>
            ))}
          </div>
        )
      )}

      {data && (
        <div className="row xs muted" style={{ justifyContent: "space-between" }}>
          <span>Généré le {sinceLabel(data.generatedAt)}{data.cached ? " (mémorisé)" : ""}</span>
          <button type="button" className="link-btn xs" onClick={() => load(true)} disabled={loading}>Actualiser</button>
        </div>
      )}
    </div>
  );
}

/** Question libre à l'IA. */
export function AiAsk() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      setData(await runAi({ kind: "ask", question: q }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack-sm" aria-live="polite">
      <form onSubmit={submit} className="row" style={{ alignItems: "stretch" }}>
        <label htmlFor="ai-q" className="sr-only">Votre question</label>
        <input
          id="ai-q"
          className="input"
          style={{ flex: "1 1 280px" }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={500}
          placeholder="Ex. : qui peut m'aider sur un projet immobilier à Netanya ?"
        />
        <button className="btn btn-primary ai-btn" disabled={loading || q.trim().length < 3}>
          <Spark /> {loading ? "Recherche…" : "Demander"}
        </button>
      </form>
      {error && <div className="alert alert-error">{error}</div>}
      {data?.answer && <p className="pre" style={{ color: "var(--ink-2)" }}>{data.answer}</p>}
      {data?.people && data.people.length > 0 && (
        <div className="ai-grid">
          {data.people.map((p) => <PersonRow key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
