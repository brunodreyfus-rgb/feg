import { colorFor, initials } from "@/lib/utils";

type P = { id: string; prenom: string; nom: string; avatar_url?: string | null };

export default function Avatar({ p, size = 56, className = "" }: { p: P; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.34) };
  if (p.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.avatar_url} alt="" className={`avatar ${className}`} style={style} />;
  }
  return (
    <span className={`avatar ${className}`} style={{ ...style, background: colorFor(p.id) }} aria-hidden="true">
      {initials(p)}
    </span>
  );
}
