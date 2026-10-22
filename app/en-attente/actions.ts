"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Pour un compte qui existe déjà dans le projet Supabase (autre application) : crée la demande d'accès FEG. */
export async function requestAccess(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const v = (k: string, max = 120) => String(formData.get(k) ?? "").trim().slice(0, max);
  await supabase.from("feg_profiles").insert({
    id: user.id,
    email: user.email,
    prenom: v("prenom"),
    nom: v("nom"),
    tel: v("tel", 40) || null,
    parrain: v("parrain") || null,
    status: "pending",
    is_admin: false,
  });
  redirect("/en-attente");
}
