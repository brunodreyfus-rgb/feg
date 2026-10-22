"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { safeUrl } from "@/lib/utils";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function createPost(formData: FormData) {
  const { supabase, me } = await requireMember();
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000) || null;
  const typeRaw = String(formData.get("type") ?? "projet");
  const type = ["projet", "realisation", "recherche"].includes(typeRaw) ? typeRaw : "projet";
  const link_url = safeUrl(String(formData.get("link_url") ?? ""));
  if (!title) redirect("/realisations?err=titre");

  let image_url: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.includes(file.type) || file.size > 5 * 1024 * 1024) redirect("/realisations?err=image");
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${me.id}/post-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("feg-posts").upload(path, file, { contentType: file.type });
    if (error) redirect("/realisations?err=image");
    image_url = supabase.storage.from("feg-posts").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("feg_posts").insert({ author_id: me.id, type, title, body, link_url, image_url });
  if (error) redirect("/realisations?err=save");
  revalidatePath("/realisations");
  redirect("/realisations?ok=1");
}

export async function toggleInterest(formData: FormData) {
  const { supabase, me } = await requireMember();
  const postId = String(formData.get("post_id"));
  const interested = formData.get("interested") === "1";
  if (interested) {
    await supabase.from("feg_post_interests").delete().eq("post_id", postId).eq("user_id", me.id);
  } else {
    await supabase.from("feg_post_interests").insert({ post_id: postId, user_id: me.id });
  }
  revalidatePath("/realisations");
}

export async function deletePost(formData: FormData) {
  const { supabase } = await requireMember();
  await supabase.from("feg_posts").delete().eq("id", String(formData.get("post_id")));
  revalidatePath("/realisations");
}
