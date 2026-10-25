"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import WaPanel from "@/components/WaPanel";
import { createGroupAndSend } from "../actions";

type M = { id: string; name: string; prenom: string; tel: string | null; secteur: string | null };

export default function NewMessageForm({ members, preselected, initialText = "" }: { members: M[]; preselected: string[]; initialText?: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set(preselected));
  const [filter, setFilter] = useState("");
  const [wa, setWa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; text: string } | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? members.filter((m) => `${m.name} ${m.secteur ?? ""}`.toLowerCase().includes(f)) : members;
  }, [filter, members]);

  const allSelected = members.length > 0 && sel.size === members.length;
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const label = sel.size === 0 ? "aucun destinataire" : sel.size === 1 ? "1 membre" : `${sel.size} membres`;
  const chosen = members.filter((m) => sel.has(m.id));
  const waTargets = chosen.filter((m) => m.tel).map((m) => ({ id: m.id, name: m.name, prenom: m.prenom, tel: m.tel as string }));

  function submit(fd: FormData) {
    sel.forEach((id) => fd.append("members", id));
    const text = String(fd.get("body") ?? "").trim();
    start(async () => {
      const res = await createGroupAndSend(fd);
      if (!res.ok || !res.id) return setError(res.error ?? "Erreur");
      setError(null);
      setDone({ id: res.id, text });
    });
  }

  if (done) {
    return (
      <div className="stack">
        <div className="alert alert-ok">Message envoyé à {label} dans l&apos;annuaire.</div>
        {wa && waTargets.length > 0 && <WaPanel targets={waTargets} text={done.text} missing={chosen.length - waTargets.length} />}
        <Link href={`/messages/${done.id}`} className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
          Voir la conversation
        </Link>
      </div>
    );
  }

  return (
    <form action={submit} className="stack">
      <h2 style={{ fontSize: 22 }}>Nouveau message</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack-sm">
        <div className="between" style={{ alignItems: "center" }}>
          <legend style={{ fontWeight: 600, fontSize: 14 }}>Destinataires · {label}</legend>
          <button
            type="button"
            className="link-btn small"
            onClick={() => setSel(allSelected ? new Set() : new Set(members.map((m) => m.id)))}
          >
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
        </div>
        <label className="sr-only" htmlFor="filter">Filtrer les membres</label>
        <input id="filter" className="input" placeholder="Filtrer par nom ou secteur…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="chips" style={{ maxHeight: 220, overflowY: "auto" }}>
          {shown.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`chip ${sel.has(m.id) ? "on" : ""}`}
              aria-pressed={sel.has(m.id)}
              onClick={() => toggle(m.id)}
            >
              {m.name}
            </button>
          ))}
          {shown.length === 0 && <span className="small muted">Aucun membre.</span>}
        </div>
      </fieldset>

      {sel.size > 1 && (
        <label className="field full">
          Nom du groupe <span className="hint">facultatif — ex. : « Organisation réunion de décembre »</span>
          <input className="input" name="title" maxLength={120} />
        </label>
      )}

      <label className="field full">
        Message
        <textarea className="input" name="body" rows={6} required maxLength={5000} defaultValue={initialText} placeholder="Ex. : Réunion mensuelle jeudi 20h, merci de confirmer votre présence." />
      </label>

      <label className="check">
        <input type="checkbox" checked={wa} onChange={(e) => setWa(e.target.checked)} style={{ accentColor: "var(--wa)" }} />
        Préparer aussi l&apos;envoi WhatsApp individuel ({waTargets.length} avec numéro)
      </label>

      <button className="btn btn-primary" disabled={pending || sel.size === 0} style={{ alignSelf: "flex-start" }}>
        {pending ? "Envoi…" : `Envoyer à ${label}`}
      </button>
    </form>
  );
}
