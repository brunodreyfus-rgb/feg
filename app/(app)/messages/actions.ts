"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";

/** Ouvre (ou crée) la conversation privée avec un membre puis y redirige. */
export async function startDirect(formData: FormData) {
  const { supabase } = await requireMember();
  const other = String(formData.get("member_id"));
  const { data, error } = await supabase.rpc("feg_create_conversation", { p_member_ids: [other], p_title: null });
  if (error || !data) throw new Error(error?.message ?? "Impossible d'ouvrir la conversation");
  redirect(`/messages/${data}`);
}

export async function sendMessage(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { supabase, me } = await requireMember();
  const conversationId = String(formData.get("conversation_id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Message vide" };
  if (body.length > 5000) return { ok: false, error: "Message trop long (5000 caractères max.)" };

  const { error } = await supabase.from("feg_messages").insert({ conversation_id: conversationId, sender_id: me.id, body });
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("feg_conversation_members")
    .upsert({ conversation_id: conversationId, user_id: me.id, last_read_at: new Date().toISOString() });

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}

/** Message groupé : crée la conversation avec les destinataires choisis et envoie le premier message. */
export async function createGroupAndSend(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, me } = await requireMember();
  const ids = formData.getAll("members").map(String).filter((x) => x && x !== me.id);
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (ids.length === 0) return { ok: false, error: "Choisissez au moins un destinataire." };
  if (!body) return { ok: false, error: "Écrivez un message." };

  const { data: convId, error } = await supabase.rpc("feg_create_conversation", { p_member_ids: ids, p_title: title || null });
  if (error || !convId) return { ok: false, error: error?.message ?? "Erreur" };

  const { error: e2 } = await supabase.from("feg_messages").insert({ conversation_id: convId, sender_id: me.id, body });
  if (e2) return { ok: false, error: e2.message };
  await supabase
    .from("feg_conversation_members")
    .upsert({ conversation_id: convId, user_id: me.id, last_read_at: new Date().toISOString() });

  revalidatePath("/messages");
  return { ok: true, id: String(convId) };
}
