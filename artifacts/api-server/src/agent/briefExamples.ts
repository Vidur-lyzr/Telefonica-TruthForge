// Curated example briefs for the Generate "suggest a set-up" input. Each
// candidate is anchored to a real corpus document family, and before an
// example is shown it is verified against retrieveGoverned at the requesting
// persona's clearance with the same coverage gate the generate agent applies —
// so a chip the user taps never leads straight into a no_evidence dead end,
// and a persona never sees an example whose backing material it may not read.

import { retrieveGoverned } from "../adapters/kb";
import type { Clearance } from "../data/corpus";

const COVERAGE_MIN = 0.33;
const MAX_EXAMPLES = 5;
// The corpus can grow at runtime (live ingest), so verification results are
// cached briefly per clearance+language rather than computed once at boot.
const CACHE_TTL_MS = 5 * 60_000;

export type ExampleLang = "en" | "es" | "de" | "pt";

export interface BriefExample {
  id: string;
  text: string;
}

interface Candidate {
  id: string;
  text: Record<ExampleLang, string>;
}

const CANDIDATES: Candidate[] = [
  {
    id: "q1-results",
    text: {
      en: "Talking points on the Q1 2026 financial results for internal briefings",
      es: "Argumentario sobre los resultados financieros del Q1 2026 para briefings internos",
      de: "Kernbotschaften zu den Finanzergebnissen Q1 2026 für interne Briefings",
      pt: "Mensagens-chave sobre os resultados financeiros do Q1 2026 para briefings internos",
    },
  },
  {
    id: "mwc-keynote",
    text: {
      en: "Internal summary of the CEO keynote at MWC Barcelona 2026",
      es: "Resumen interno del keynote del CEO en el MWC Barcelona 2026",
      de: "Interne Zusammenfassung der CEO-Keynote auf dem MWC Barcelona 2026",
      pt: "Resumo interno do keynote do CEO no MWC Barcelona 2026",
    },
  },
  {
    id: "fibre-5g",
    text: {
      en: "Update for employees on the 5G and fibre deployment plan",
      es: "Actualización para empleados sobre el plan de despliegue de 5G y fibra",
      de: "Update für Mitarbeitende zum 5G- und Glasfaser-Ausbauplan",
      pt: "Atualização para colaboradores sobre o plano de implantação de 5G e fibra",
    },
  },
  {
    id: "sustainability",
    text: {
      en: "Key messages from the Sustainability Report 2025",
      es: "Mensajes clave del Informe de Sostenibilidad 2025",
      de: "Kernbotschaften aus dem Nachhaltigkeitsbericht 2025",
      pt: "Mensagens principais do Relatório de Sustentabilidade 2025",
    },
  },
  {
    id: "eu-ai-act",
    text: {
      en: "Briefing on the EU AI Act obligations for Telefónica",
      es: "Briefing sobre las obligaciones de la Ley de IA de la UE para Telefónica",
      de: "Briefing zu den Pflichten des EU AI Act für Telefónica",
      pt: "Briefing sobre as obrigações do AI Act da UE para a Telefónica",
    },
  },
  {
    id: "tech-b2b",
    text: {
      en: "Overview of the Telefónica Tech B2B growth strategy",
      es: "Panorama de la estrategia de crecimiento B2B de Telefónica Tech",
      de: "Überblick über die B2B-Wachstumsstrategie von Telefónica Tech",
      pt: "Visão geral da estratégia de crescimento B2B da Telefónica Tech",
    },
  },
  {
    id: "movistar-campaign",
    text: {
      en: "Press note on the Movistar 'Mismo sitio, mismo precio' campaign",
      es: "Nota de prensa sobre la campaña de Movistar 'Mismo sitio, mismo precio'",
      de: "Pressenotiz zur Movistar-Kampagne 'Mismo sitio, mismo precio'",
      pt: "Nota de imprensa sobre a campanha da Movistar 'Mismo sitio, mismo precio'",
    },
  },
  {
    id: "brand-guidelines",
    text: {
      en: "Internal reminder of the Telefónica brand guidelines 2026",
      es: "Recordatorio interno de las directrices de marca de Telefónica 2026",
      de: "Interne Erinnerung an die Telefónica-Markenrichtlinien 2026",
      pt: "Lembrete interno das diretrizes de marca da Telefónica 2026",
    },
  },
];

interface Logger {
  warn: (obj: unknown, msg?: string) => void;
}

const cache = new Map<string, { at: number; examples: BriefExample[] }>();

async function verifies(
  text: string,
  clearance: Clearance,
  log: Logger,
): Promise<boolean> {
  try {
    const res = await retrieveGoverned({ question: text, clearance, topK: 4 }, log);
    return res.chunks.some((c) => c.accessible && c.coverage >= COVERAGE_MIN);
  } catch (err) {
    // Fail closed: an unverifiable example is simply not offered.
    log.warn({ err }, "briefExamples: verification retrieval failed");
    return false;
  }
}

export async function listBriefExamples(
  clearance: Clearance,
  lang: ExampleLang,
  log: Logger,
): Promise<BriefExample[]> {
  const key = `${clearance}:${lang}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.examples;

  const checks = await Promise.all(
    CANDIDATES.map(async (c) => ({
      candidate: c,
      ok: await verifies(c.text[lang], clearance, log),
    })),
  );
  const examples = checks
    .filter((c) => c.ok)
    .slice(0, MAX_EXAMPLES)
    .map((c) => ({ id: c.candidate.id, text: c.candidate.text[lang] }));

  cache.set(key, { at: Date.now(), examples });
  return examples;
}
