"use client";
import { IconWhatsApp } from "./Icons";
import { waLink } from "@/lib/utils";

export type WaTarget = { id: string; name: string; prenom: string; tel: string };

/**
 * WhatsApp n'autorise pas l'envoi automatique : on prépare un lien par destinataire,
 * chacun ouvre WhatsApp avec le message déjà rempli.
 */
export default function WaPanel({
  targets,
  text,
  groupUrl,
  missing = 0,
  onClose,
}: {
  targets: WaTarget[];
  text: string;
  groupUrl?: string | null;
  missing?: number;
  onClose?: () => void;
}) {
  return (
    <div className="wa-panel" role="status">
      <div className="between" style={{ alignItems: "center" }}>
        <strong>Envoyer aussi par WhatsApp</strong>
        {onClose && <button type="button" className="link-btn small" onClick={onClose}>Fermer</button>}
      </div>
      <p className="small muted">
        Le message est envoyé dans l&apos;annuaire. Cliquez sur chaque nom pour l&apos;envoyer aussi sur WhatsApp (le texte est pré-rempli).
      </p>
      <div className="row">
        {targets.map((t) => {
          const href = waLink(t.tel, text);
          return href ? (
            <a key={t.id} href={href} target="_blank" rel="noopener noreferrer" className="btn btn-wa btn-sm">
              <IconWhatsApp /> {t.name}
            </a>
          ) : null;
        })}
        {groupUrl && (
          <a href={groupUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            Ouvrir le groupe WhatsApp FEG
          </a>
        )}
      </div>
      {missing > 0 && <p className="xs muted">{missing} destinataire(s) sans numéro visible.</p>}
    </div>
  );
}
