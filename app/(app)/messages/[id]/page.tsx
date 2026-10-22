import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getConversations } from "@/lib/conversations";
import type { Message } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";
import ConvList, { ConvAvatar } from "../ConvList";
import MessagesHeader from "../Header";
import Composer from "./Composer";
import Realtime from "./Realtime";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me } = await requireMember();

  const convs = await getConversations(supabase, me.id);
  const conv = convs.find((c) => c.id === id);
  if (!conv) notFound();

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  const messages = ((msgs ?? []) as Message[]).reverse();

  // Auteurs (utile pour la conversation "Tous")
  const senderIds = Array.from(new Set(messages.map((m) => m.sender_id).filter(Boolean))) as string[];
  const { data: senders } = senderIds.length
    ? await supabase.from("profiles").select("id, prenom, nom").in("id", senderIds)
    : { data: [] as { id: string; prenom: string; nom: string }[] };
  const nameOf = new Map((senders ?? []).map((s) => [s.id, fullName(s)]));

  // Marquer comme lu
  await supabase
    .from("conversation_members")
    .upsert({ conversation_id: id, user_id: me.id, last_read_at: new Date().toISOString() });

  const waTargets = conv.isBroadcast
    ? []
    : conv.members
        .filter((m) => m.show_tel && m.tel)
        .map((m) => ({ id: m.id, name: fullName(m), prenom: m.prenom, tel: m.tel as string }));

  const subtitle = conv.isBroadcast
    ? "Diffusion à tous les membres du groupe"
    : conv.isGroup
      ? conv.members.map((m) => fullName(m)).join(", ")
      : "Conversation privée";

  return (
    <div className="stack">
      <MessagesHeader />
      <div className="msg-layout">
        <ConvList convs={convs} activeId={id} />
        <section className="thread-panel" aria-label={`Conversation ${conv.title}`}>
          <div className="thread-head">
            <ConvAvatar c={conv} />
            <div style={{ minWidth: 0 }}>
              {conv.avatar ? (
                <Link href={`/membres/${conv.avatar.id}`} style={{ font: "700 17px var(--font-display)", color: "var(--ink)", textDecoration: "none" }}>
                  {conv.title}
                </Link>
              ) : (
                <div style={{ font: "700 17px var(--font-display)" }}>{conv.title}</div>
              )}
              <div className="xs muted">{subtitle}</div>
            </div>
          </div>
          <div className="thread" id="thread">
            {messages.length === 0 && <p className="muted small">Aucun message pour l&apos;instant.</p>}
            {messages.map((m) => {
              const mine = m.sender_id === me.id;
              return (
                <div key={m.id} className={`bubble-wrap ${mine ? "mine" : ""}`}>
                  <div className="bubble">
                    {!mine && conv.isGroup && <div className="bubble-author">{nameOf.get(m.sender_id ?? "") ?? "Ancien membre"}</div>}
                    {m.body}
                  </div>
                  <span className="bubble-time">{formatDate(m.created_at, true)}</span>
                </div>
              );
            })}
          </div>
          <Composer
            conversationId={id}
            isBroadcast={conv.isBroadcast}
            waTargets={waTargets}
            senderName={me.prenom}
            groupUrl={process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ?? null}
          />
        </section>
      </div>
      <Realtime conversationId={id} />
    </div>
  );
}
