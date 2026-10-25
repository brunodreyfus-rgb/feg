"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { LEVELS, type RelationLevel } from "@/lib/relations";

export async function saveRelation(formData: FormData) {
  const { supabase, me } = await requireMember();
  const memberId = String(formData.get("member_id"));
  if (!memberId || memberId === me.id) redirect("/");

  const levelRaw = String(formData.get("level") ?? "croise");
  const level: RelationLevel = levelRaw in LEVELS ? (levelRaw as RelationLevel) : "croise";
  const context = String(formData.get("context") ?? "").trim().slice(0, 200) || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 4000) || null;

  const { error } = await supabase.from("feg_relations").upsert({
    owner_id: me.id,
    member_id: memberId,
    level,
    context,
    note,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/");
  redirect(`/membres/${memberId}?lien=${error ? "err" : "ok"}#mon-lien`);
}

export async function deleteRelation(formData: FormData) {
  const { supabase, me } = await requireMember();
  const memberId = String(formData.get("member_id"));
  await supabase.from("feg_relations").delete().eq("owner_id", me.id).eq("member_id", memberId);
  revalidatePath("/");
  redirect(`/membres/${memberId}#mon-lien`);
}
