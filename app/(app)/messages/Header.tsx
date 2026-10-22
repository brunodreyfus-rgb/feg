import Link from "next/link";
import { IconWhatsApp } from "@/components/Icons";

export default function MessagesHeader() {
  const group = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL;
  return (
    <div className="between">
      <h1>Messages</h1>
      <div className="row">
        {group && (
          <a href={group} target="_blank" rel="noopener noreferrer" className="btn btn-wa">
            <IconWhatsApp /> Groupe WhatsApp FEG
          </a>
        )}
        <Link href="/messages/nouveau" className="btn btn-primary">+ Nouveau message</Link>
      </div>
    </div>
  );
}
