import { requireMember } from "@/lib/auth";
import { getConversations } from "@/lib/conversations";
import { fullName } from "@/lib/utils";
import ConvList from "../ConvList";
import MessagesHeader from "../Header";
import NewMessageForm from "./NewMessageForm";

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ to?: string; text?: string }> }) {
  const { to, text } = await searchParams;
  const { supabase, me } = await requireMember();
  const convs = await getConversations(supabase, me.id);
  const { data } = await supabase
    .from("feg_profiles")
    .select("id, prenom, nom, tel, show_tel, ville, secteur")
    .eq("status", "approved")
    .neq("id", me.id)
    .order("prenom");

  const members = (data ?? []).map((m) => ({
    id: m.id as string,
    name: fullName(m),
    prenom: m.prenom as string,
    tel: m.show_tel && m.tel ? (m.tel as string) : null,
    secteur: (m.secteur as string | null) ?? null,
  }));

  return (
    <div className="stack">
      <MessagesHeader />
      <div className="msg-layout">
        <ConvList convs={convs} />
        <section className="thread-panel" style={{ padding: 24 }}>
          <NewMessageForm members={members} preselected={to ? to.split(",") : []} initialText={text ? text.slice(0, 2000) : ""} />
        </section>
      </div>
    </div>
  );
}
