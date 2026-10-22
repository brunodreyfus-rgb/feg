import { requireMember } from "@/lib/auth";
import { getConversations } from "@/lib/conversations";
import ConvList from "./ConvList";
import MessagesHeader from "./Header";

export default async function MessagesPage() {
  const { supabase, me } = await requireMember();
  const convs = await getConversations(supabase, me.id);

  return (
    <div className="stack">
      <MessagesHeader />
      <div className="msg-layout">
        <ConvList convs={convs} />
        <div className="thread-panel" style={{ alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <p className="muted">Choisissez une conversation, ou écrivez un nouveau message à un ou plusieurs membres.</p>
        </div>
      </div>
    </div>
  );
}
