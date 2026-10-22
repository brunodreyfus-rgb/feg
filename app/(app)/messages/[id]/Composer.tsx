"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { IconSend } from "@/components/Icons";
import WaPanel, { type WaTarget } from "@/components/WaPanel";
import { sendMessage } from "../actions";

export default function Composer({
  conversationId,
  isBroadcast,
  waTargets,
  groupUrl,
}: {
  conversationId: string;
  isBroadcast: boolean;
  waTargets: WaTarget[];
  senderName: string;
  groupUrl: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [wa, setWa] = useState(false);
  const [sentText, setSentText] = useState<string | null>(null);

  function submit(fd: FormData) {
    const text = String(fd.get("body") ?? "").trim();
    if (!text) return;
    start(async () => {
      const res = await sendMessage(fd);
      if (!res.ok) return setError(res.error ?? "Erreur");
      setError(null);
      formRef.current?.reset();
      if (wa) setSentText(text);
      router.refresh();
    });
  }

  const canWa = isBroadcast ? !!groupUrl : waTargets.length > 0;

  return (
    <div className="composer">
      {sentText && (
        <WaPanel
          targets={isBroadcast ? [] : waTargets}
          text={sentText}
          groupUrl={isBroadcast ? groupUrl : null}
          onClose={() => setSentText(null)}
        />
      )}
      {error && <div className="alert alert-error">{error}</div>}
      <form ref={formRef} action={submit} className="stack-sm">
        <input type="hidden" name="conversation_id" value={conversationId} />
        <label htmlFor="body" className="sr-only">Votre message</label>
        <textarea
          id="body"
          name="body"
          className="input"
          rows={3}
          required
          maxLength={5000}
          placeholder="Écrire un message…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <div className="between" style={{ alignItems: "center" }}>
          {canWa ? (
            <label className="check">
              <input type="checkbox" checked={wa} onChange={(e) => setWa(e.target.checked)} style={{ accentColor: "var(--wa)" }} />
              {isBroadcast ? "Relayer aussi dans le groupe WhatsApp" : "Envoyer aussi par WhatsApp"}
            </label>
          ) : (
            <span className="xs muted">Ctrl + Entrée pour envoyer</span>
          )}
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Envoi…" : "Envoyer"} <IconSend />
          </button>
        </div>
      </form>
    </div>
  );
}
