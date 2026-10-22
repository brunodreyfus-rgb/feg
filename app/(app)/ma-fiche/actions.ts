"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import type { Asso, Parcours } from "@/lib/types";
import { parseLines } from "@/lib/utils";

const MAX_IMAGE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const s = (fd: FormData, k: string, max = 300) => {
  const v = String(fd.get(k) ?? "").trim().slice(0, max);
  return v || null;
};

export async function saveProfile(formData: FormData) {
  const { supabase, me } = await requireMember();

  let avatar_url = me.avatar_url;
  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.includes(file.type)) redirect("/ma-fiche?err=format");
    if (file.size > MAX_IMAGE) redirect("/ma-fiche?err=taille");
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${me.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) redirect("/ma-fiche?err=upload");
    avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }
  if (formData.get("remove_avatar") === "on") avatar_url = null;

  const competences = String(formData.get("competences") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);

  const update = {
    prenom: s(formData, "prenom", 80) ?? "",
    nom: s(formData, "nom", 80) ?? "",
    ville: s(formData, "ville", 120),
    tel: s(formData, "tel", 40),
    show_tel: formData.get("show_tel") === "on",
    famille: s(formData, "famille", 200),
    langues: s(formData, "langues", 200),
    titre: s(formData, "titre", 200),
    entreprise: s(formData, "entreprise", 200),
    secteur: s(formData, "secteur", 80),
    linkedin_url: s(formData, "linkedin_url", 300),
    competences,
    parcours: parseLines<Parcours>(String(formData.get("parcours") ?? ""), ["poste", "org", "dates"]).slice(0, 30),
    assos: parseLines<Asso>(String(formData.get("assos") ?? ""), ["nom", "role"]).slice(0, 30),
    bio: s(formData, "bio", 4000),
    avatar_url,
  };

  const { error } = await supabase.from("profiles").update(update).eq("id", me.id);
  if (error) redirect("/ma-fiche?err=save");

  revalidatePath("/", "layout");
  redirect("/ma-fiche?ok=1");
}
