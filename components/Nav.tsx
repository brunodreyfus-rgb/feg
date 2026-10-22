"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = { isAdmin: boolean; unread: number; pending: number };

export default function Nav({ isAdmin, unread, pending }: Props) {
  const path = usePathname();
  const tabs = [
    { href: "/", label: "Annuaire", active: path === "/" || path.startsWith("/membres") },
    { href: "/messages", label: "Messages", active: path.startsWith("/messages"), badge: unread },
    { href: "/realisations", label: "Réalisations", active: path.startsWith("/realisations") },
    { href: "/ma-fiche", label: "Ma fiche", active: path.startsWith("/ma-fiche") },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", active: path.startsWith("/admin"), badge: pending }] : []),
  ];
  return (
    <nav className="nav" aria-label="Navigation principale">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={t.active ? "page" : undefined}>
          {t.label}
          {t.badge ? <span className="badge">{t.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
