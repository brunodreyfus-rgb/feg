export type AiPerson = { id: string; name: string; titre: string | null; ville: string | null; avatar_url: string | null; reason: string; opener?: string };
export type AiGroup = { title: string; reason: string; action: string; people: AiPerson[] };
export type AiResult = { people?: AiPerson[]; answer?: string; groups?: AiGroup[]; generatedAt: string; cached?: boolean };
