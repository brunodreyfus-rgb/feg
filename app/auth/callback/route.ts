import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("auth callback:", error.message);
  }

  // Lien expiré, déjà utilisé, ou ouvert dans un autre navigateur que celui de la demande
  if (next.startsWith("/mot-de-passe")) return NextResponse.redirect(`${origin}/mot-de-passe?erreur=lien`);
  return NextResponse.redirect(`${origin}/login?info=lien`);
}
