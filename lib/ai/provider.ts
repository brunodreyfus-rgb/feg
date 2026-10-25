/**
 * Appel au modèle d'IA. Fournisseur choisi par variables d'environnement :
 *   AI_PROVIDER = "anthropic" (défaut) | "openai"
 *   ANTHROPIC_API_KEY ou OPENAI_API_KEY
 *   AI_MODEL    (facultatif) — défaut : claude-sonnet-5-5 pour Anthropic ; obligatoire pour OpenAI
 */

export class AiNotConfigured extends Error {}

export function aiConfigured() {
  const p = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (p === "mock") return true;
  if (p === "openai") return !!process.env.OPENAI_API_KEY && !!process.env.AI_MODEL;
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function callAI(system: string, user: string, maxTokens = 2000): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();

  if (provider === "mock") return mockAnswer(user);

  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY;
    const model = process.env.AI_MODEL;
    if (!key || !model) throw new AiNotConfigured("OPENAI_API_KEY et AI_MODEL sont requis");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiNotConfigured("ANTHROPIC_API_KEY manquante");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "claude-sonnet-5-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
}

/** Extrait le premier objet JSON d'une réponse texte. */
export function parseJson<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Réponse factice pour tester sans clé (AI_PROVIDER=mock). */
function mockAnswer(user: string) {
  const refs = Array.from(new Set(user.match(/\[M\d+\]/g) ?? [])).map((r) => r.slice(1, -1));
  const pick = refs.slice(0, 4);
  const items = pick.map((ref) => ({ ref, raison: `Profil complémentaire (${ref}).`, premier_message: "Shalom, on pourrait échanger ?" }));
  return JSON.stringify({
    suggestions: items,
    membres: items,
    reponse: "Réponse de test (mode mock).",
    synergies: pick.length >= 2 ? [{ titre: "Test", refs: pick.slice(0, 2), raison: "Test", action: "Les présenter" }] : [],
  });
}
