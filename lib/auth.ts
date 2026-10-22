import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** Renvoie le membre connecté et validé, sinon redirige. */
export async function requireMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!me || me.status !== "approved") redirect("/en-attente");

  return { supabase, user, me };
}

export async function requireAdmin() {
  const ctx = await requireMember();
  if (!ctx.me.is_admin) redirect("/");
  return ctx;
}
