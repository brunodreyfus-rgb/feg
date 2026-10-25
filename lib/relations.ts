export type RelationLevel = "proche" | "croise" | "pas_encore";

export type Relation = {
  member_id: string;
  level: RelationLevel;
  context: string | null;
  note: string | null;
  updated_at: string;
};

export const LEVELS: Record<RelationLevel, { label: string; short: string; bg: string; fg: string }> = {
  proche: { label: "Je le connais personnellement", short: "Je le connais", bg: "#E3F1E8", fg: "#145535" },
  croise: { label: "On s'est déjà croisés / parlé", short: "Déjà croisé", bg: "#E8ECF8", fg: "#13298A" },
  pas_encore: { label: "Pas encore rencontré", short: "À rencontrer", bg: "#F6EEDC", fg: "#7A5410" },
};
