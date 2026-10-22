import type { SupabaseClient } from "@supabase/supabase-js";
import { fullName } from "./utils";

export type Person = { id: string; prenom: string; nom: string; avatar_url: string | null; tel: string | null; show_tel: boolean };

export type ConvSummary = {
  id: string;
  title: string;
  isGroup: boolean;
  isBroadcast: boolean;
  lastMessageAt: string;
  lastText: string | null;
  unread: boolean;
  members: Person[]; // autres membres (hors moi)
  avatar: Person | null; // pour une conversation privée
};

export async function getConversations(supabase: SupabaseClient, meId: string): Promise<ConvSummary[]> {
  const { data: convs } = await supabase
    .from("feg_conversations")
    .select("id, title, is_group, is_broadcast, last_message_at")
    .order("last_message_at", { ascending: false });
  if (!convs?.length) return [];
  const ids = convs.map((c) => c.id);

  const [{ data: members }, { data: recent }] = await Promise.all([
    supabase
      .from("feg_conversation_members")
      .select("conversation_id, user_id, last_read_at, profiles:feg_profiles(id, prenom, nom, avatar_url, tel, show_tel)")
      .in("conversation_id", ids),
    supabase
      .from("feg_messages")
      .select("conversation_id, body, sender_id, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const lastBy = new Map<string, { body: string; sender_id: string | null }>();
  for (const m of recent ?? []) if (!lastBy.has(m.conversation_id)) lastBy.set(m.conversation_id, m);

  return convs.map((c) => {
    const rows = (members ?? []).filter((m) => m.conversation_id === c.id);
    const mine = rows.find((r) => r.user_id === meId);
    const others = rows
      .filter((r) => r.user_id !== meId)
      .map((r) => r.profiles as unknown as Person)
      .filter(Boolean);
    const last = lastBy.get(c.id);
    let title = c.title as string | null;
    if (!title) {
      if (!c.is_group && others[0]) title = fullName(others[0]);
      else title = others.map((o) => o.prenom).slice(0, 3).join(", ") + (others.length > 3 ? ` +${others.length - 3}` : "");
    }
    const unread = mine
      ? new Date(c.last_message_at) > new Date(mine.last_read_at)
      : c.is_broadcast && !!last && last.sender_id !== meId;
    return {
      id: c.id,
      title: title || "Conversation",
      isGroup: c.is_group,
      isBroadcast: c.is_broadcast,
      lastMessageAt: c.last_message_at,
      lastText: last ? (last.sender_id === meId ? "Vous : " : "") + last.body : null,
      unread,
      members: others,
      avatar: !c.is_group ? others[0] ?? null : null,
    };
  });
}
