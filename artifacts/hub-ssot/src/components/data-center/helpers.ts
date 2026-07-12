import type { Lang } from "../app-provider";

type TagType =
  | "promo"
  | "info"
  | "active"
  | "inactive"
  | "success"
  | "warning"
  | "error";

export function clearanceTagType(c: string): TagType {
  switch (c) {
    case "public":
      return "inactive";
    case "private":
      return "info";
    case "confidential":
      return "warning";
    case "off_the_record":
      return "error";
    default:
      return "inactive";
  }
}

const CLEARANCE_LABELS: Record<Lang, Record<string, string>> = {
  EN: {
    public: "Public",
    private: "Private",
    confidential: "Confidential",
    off_the_record: "Off the record",
  },
  ES: {
    public: "Público",
    private: "Privado",
    confidential: "Confidencial",
    off_the_record: "Extraoficial",
  },
  DE: {
    public: "Öffentlich",
    private: "Privat",
    confidential: "Vertraulich",
    off_the_record: "Streng vertraulich",
  },
  PT: {
    public: "Público",
    private: "Privado",
    confidential: "Confidencial",
    off_the_record: "Extraoficial",
  },
};

export function clearanceLabel(c: string, lang: Lang = "EN"): string {
  return CLEARANCE_LABELS[lang]?.[c] ?? c;
}

const VALIDITY_LABELS: Record<Lang, Record<string, string>> = {
  EN: {
    current: "Current",
    historic: "Historic",
    superseded: "Superseded",
    approved: "Approved",
    draft: "Draft",
    pending: "Pending",
  },
  ES: {
    current: "Actual",
    historic: "Histórico",
    superseded: "Sustituido",
    approved: "Aprobado",
    draft: "Borrador",
    pending: "Pendiente",
  },
  DE: {
    current: "Aktuell",
    historic: "Historisch",
    superseded: "Ersetzt",
    approved: "Freigegeben",
    draft: "Entwurf",
    pending: "Ausstehend",
  },
  PT: {
    current: "Atual",
    historic: "Histórico",
    superseded: "Substituído",
    approved: "Aprovado",
    draft: "Rascunho",
    pending: "Pendente",
  },
};

export function validityLabel(v: string, lang: Lang = "EN"): string {
  return VALIDITY_LABELS[lang]?.[v] ?? v;
}

export function sourceStatusTagType(s: string): TagType {
  switch (s) {
    case "live":
      return "success";
    case "filtered":
      return "info";
    case "manual":
      return "inactive";
    case "to_configure":
      return "warning";
    default:
      return "inactive";
  }
}

const SOURCE_STATUS_LABELS: Record<Lang, Record<string, string>> = {
  EN: {
    live: "Live",
    filtered: "Filtered · near real-time",
    manual: "On demand",
    to_configure: "To configure",
  },
  ES: {
    live: "En directo",
    filtered: "Filtrado · casi en tiempo real",
    manual: "Bajo demanda",
    to_configure: "Por configurar",
  },
  DE: {
    live: "Live",
    filtered: "Gefiltert · nahezu in Echtzeit",
    manual: "Auf Anfrage",
    to_configure: "Zu konfigurieren",
  },
  PT: {
    live: "Ao vivo",
    filtered: "Filtrado · quase em tempo real",
    manual: "Sob demanda",
    to_configure: "A configurar",
  },
};

export function sourceStatusLabel(s: string, lang: Lang = "EN") {
  return SOURCE_STATUS_LABELS[lang]?.[s] ?? s;
}

export function confidenceTagType(c: string): TagType {
  switch (c) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    case "low":
      return "error";
    default:
      return "inactive";
  }
}

const CONFIDENCE_LABELS: Record<Lang, Record<string, string>> = {
  EN: { high: "High", medium: "Medium", low: "Low" },
  ES: { high: "Alta", medium: "Media", low: "Baja" },
  DE: { high: "Hoch", medium: "Mittel", low: "Niedrig" },
  PT: { high: "Alta", medium: "Média", low: "Baixa" },
};

export function confidenceLabel(c: string, lang: Lang = "EN"): string {
  return CONFIDENCE_LABELS[lang]?.[c] ?? c;
}

const FIELD_LABELS: Record<Lang, Record<string, string>> = {
  EN: {
    confidentiality: "Confidentiality",
    owner: "Owner",
    country: "Country",
    validUntil: "Valid until",
    title: "Title",
    brand: "Brand",
  },
  ES: {
    confidentiality: "Confidencialidad",
    owner: "Responsable",
    country: "País",
    validUntil: "Válido hasta",
    title: "Título",
    brand: "Marca",
  },
  DE: {
    confidentiality: "Vertraulichkeit",
    owner: "Verantwortlich",
    country: "Land",
    validUntil: "Gültig bis",
    title: "Titel",
    brand: "Marke",
  },
  PT: {
    confidentiality: "Confidencialidade",
    owner: "Responsável",
    country: "País",
    validUntil: "Válido até",
    title: "Título",
    brand: "Marca",
  },
};

export function fieldLabel(field: string, lang: Lang = "EN") {
  return FIELD_LABELS[lang]?.[field] ?? field;
}

const LOCALE_FOR: Record<Lang, string> = {
  ES: "es-ES",
  EN: "en-GB",
  DE: "de-DE",
  PT: "pt-BR",
};

export function localeFor(lang: Lang): string {
  return LOCALE_FOR[lang] ?? "en-GB";
}

export function formatTimestamp(iso: string, lang: Lang = "EN") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(localeFor(lang), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string, lang: Lang = "EN") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(localeFor(lang), { day: "2-digit", month: "short", year: "numeric" });
}
