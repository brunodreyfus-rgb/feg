"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

async function setStatus(formData: FormData, status: "approved" | "rejected" | "pending") {
  const { supabase, me } = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === me.id) return;
  await supabase.from("profiles").update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function approve(fd: FormData) { await setStatus(fd, "approved"); }
export async function reject(fd: FormData) { await setStatus(fd, "rejected"); }
export async function revoke(fd: FormData) { await setStatus(fd, "rejected"); }

export async function toggleAdmin(formData: FormData) {
  const { supabase, me } = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === me.id) return;
  const makeAdmin = formData.get("make") === "1";
  await supabase.from("profiles").update({ is_admin: makeAdmin }).eq("id", id);
  revalidatePath("/admin");
}
