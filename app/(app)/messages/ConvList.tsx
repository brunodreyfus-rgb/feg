import Link from "next/link";
import Avatar from "@/components/Avatar";
import type { ConvSummary } from "@/lib/conversations";

export function ConvAvatar({ c, size = 44 }: { c: ConvSummary; size?: number }) {
  if (c.avatar) return <Avatar p={c.avatar} size={size} />;
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: 13, background: c.isBroadcast ? "#15202B" : "#1E4D8C" }}>
      {c.isBroadcast ? "FEG" : c.members.length + 1}
    </span>
  );
}

export default function ConvList({ convs, activeId }: { convs: ConvSummary[]; activeId?: string }) {
  return (
    <nav className="conv-list" aria-label="Conversations">
      {convs.length === 0 && <p className="muted small" style={{ padding: 12 }}>Aucune conversation.</p>}
      {convs.map((c) => (
        <Link key={c.id} href={`/messages/${c.id}`} className="conv-item" aria-current={c.id === activeId ? "page" : undefined}>
          <ConvAvatar c={c} />
          <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
            <span className="conv-title">{c.title}</span>
            <span className="conv-last">{c.lastText ?? "Nouvelle conversation"}</span>
          </span>
          {c.unread && c.id !== activeId && <span className="dot" aria-label="Non lu" />}
        </Link>
      ))}
    </nav>
  );
}
