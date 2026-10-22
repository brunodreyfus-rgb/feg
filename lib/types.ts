export type Parcours = { poste: string; org: string; dates: string };
export type Asso = { nom: string; role: string };

export type Profile = {
  id: string;
  email: string | null;
  prenom: string;
  nom: string;
  ville: string | null;
  tel: string | null;
  show_tel: boolean;
  famille: string | null;
  langues: string | null;
  titre: string | null;
  entreprise: string | null;
  secteur: string | null;
  linkedin_url: string | null;
  competences: string[];
  parcours: Parcours[];
  assos: Asso[];
  bio: string | null;
  avatar_url: string | null;
  parrain: string | null;
  status: "pending" | "approved" | "rejected";
  is_admin: boolean;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  type: "projet" | "realisation" | "recherche";
  title: string;
  body: string | null;
  link_url: string | null;
  image_url: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
};
