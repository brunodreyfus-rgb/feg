import Link from "next/link";
import Avatar from "@/components/Avatar";
import Nav from "@/components/Nav";
import { requireMember } from "@/lib/auth";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, me } = await requireMember();

  const { data: rows } = await supabase
    .from("feg_conversation_members")
    .select("last_read_at, conversations:feg_conversations(last_message_at)")
    .eq("user_id", me.id);
  const unread = (rows ?? []).filter((r) => {
    const c = r.conversations as unknown as { last_message_at: string } | null;
    return c && new Date(c.last_message_at) > new Date(r.last_read_at);
  }).length;

  let pending = 0;
  if (me.is_admin) {
    const { count } = await supabase.from("feg_profiles").select("id", { count: "exact", head: true }).eq("status", "pending");
    pending = count ?? 0;
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Frères en Guerre — accueil">
            <Logo size={42} />
            <span className="brand-name">Frères en Guerre</span>
          </Link>
          <Nav isAdmin={me.is_admin} unread={unread} pending={pending} />
          <div className="row">
            <Link href={`/membres/${me.id}`} aria-label="Voir ma fiche publique">
              <Avatar p={me} size={36} />
            </Link>
            <form action="/auth/signout" method="post">
              <button className="btn btn-secondary btn-sm">Déconnexion</button>
            </form>
          </div>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
