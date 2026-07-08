// Shared lightweight text utilities for the local vector store.
//
// The corpus is multi-language (EN / ES / DE / PT-BR). Tokenisation is
// language-aware in two deterministic ways:
//  1. Stopword lists for all four languages, so filler words never carry
//     idf mass in any language.
//  2. A cross-language synonym table that normalises high-value domain terms
//     to a single canonical (English) token, so a question asked in one
//     language can match evidence written in another. The table is small,
//     hand-curated and honest — no machine translation is involved.

const STOPWORDS = new Set([
  // English
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
  "was", "were", "be", "been", "with", "as", "at", "by", "it", "its", "this",
  "that", "these", "those", "from", "what", "which", "who", "whom", "how",
  "when", "where", "why", "do", "does", "did", "has", "have", "had", "will",
  "would", "can", "could", "should", "about", "into", "over", "any", "all",
  "s", "our", "we", "you", "your", "their", "there", "here",
  // conversational filler — non-content words that would otherwise inflate the
  // query idf denominator and hurt coverage recall on chatty questions.
  "please", "tell", "give", "show", "let", "us", "me", "my", "want", "need",
  "know", "get", "current", "latest", "recent", "overall", "just", "kindly",
  "some", "much", "many", "explain", "regarding",
  // Spanish
  "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "de", "del",
  "al", "en", "por", "para", "con", "sin", "sobre", "es", "son", "fue", "que",
  "cual", "cuales", "como", "cuando", "donde", "quien", "cuanto", "cuanta",
  "esta", "este", "esto", "estas", "estos", "hay", "ha", "han", "ser", "su",
  "sus", "se", "lo", "le", "les", "mas", "muy", "ya", "si", "no", "nos",
  "nuestro", "nuestra", "dime", "dame", "cuentame", "explicame", "quiero",
  "necesito", "saber", "actual", "ultimo", "ultima",
  // German
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem",
  "einer", "und", "oder", "von", "zu", "im", "am", "um", "auf", "mit", "ohne",
  "uber", "unter", "ist", "sind", "war", "waren", "wird", "werden", "wurde",
  "hat", "haben", "hatte", "kann", "konnen", "soll", "sollte", "was", "wie",
  "wer", "wann", "wo", "warum", "welche", "welcher", "welches", "bitte",
  "zeig", "sag", "mir", "uns", "ich", "wir", "sie", "es", "auch", "noch",
  "nur", "sehr", "aktuell", "aktuelle", "neueste",
  // Portuguese (BR)
  "os", "as", "uma", "uns", "umas", "e", "ou", "do", "da", "dos", "das", "no",
  "na", "nos", "nas", "num", "numa", "ao", "aos", "pelo", "pela", "pelos",
  "pelas", "em", "com", "sem", "sao", "foi", "foram", "sera", "tem", "tinha",
  "pode", "deve", "qual", "quais", "quando", "onde", "quem", "quanto",
  "quanta", "isso", "isto", "essa", "esse", "estas", "estes", "me", "diga",
  "mostre", "quero", "preciso", "atual",
]);

// Cross-language canonicalisation of high-value domain terms. Keys and values
// are post-normalisation tokens (lowercase, accents stripped). Values are the
// canonical token the index will contain via the English corpus/topics.
const SYNONYMS: Record<string, string> = {
  // revenue / results
  ingresos: "revenue", facturacion: "revenue", receita: "revenue",
  umsatz: "revenue", ergebnisse: "results", resultados: "results",
  // brand
  marca: "brand", marke: "brand", markenstarke: "brand",
  notoriedad: "awareness", consideracion: "consideration",
  // customer
  clientes: "customer", cliente: "customer", kunden: "customer",
  satisfaccion: "satisfaction", satisfacao: "satisfaction",
  kundenzufriedenheit: "satisfaction",
  // market / share
  mercado: "market", markt: "market", cuota: "share", quota: "share",
  marktanteil: "share", competencia: "competitor", wettbewerb: "competitor",
  concorrencia: "competitor", competidor: "competitor",
  // network
  red: "network", redes: "network", netz: "network", rede: "network",
  fibra: "fibre", glasfaser: "fibre", cobertura: "coverage",
  abdeckung: "coverage", netzausbau: "deployment", despliegue: "deployment",
  // regulation / legislation
  regulacion: "regulation", regulierung: "regulation", regulacao: "regulation",
  legislacion: "legislation", gesetzgebung: "legislation",
  legislacao: "legislation", ley: "law", gesetz: "law", lei: "law",
  espectro: "spectrum", spektrum: "spectrum", espectros: "spectrum",
  // people / HR
  talento: "talent", empleados: "employees", mitarbeiter: "employees",
  funcionarios: "employees", formacion: "training", ausbildung: "training",
  treinamento: "training", personas: "people", cultura: "culture",
  // comms / listening
  menciones: "mentions", mencoes: "mentions", erwahnungen: "mentions",
  sentimiento: "sentiment", sentimento: "sentiment", prensa: "press",
  presse: "press", imprensa: "press", medios: "media", medien: "media",
  midia: "media", escuta: "listening", escucha: "listening",
  // strategy / planning
  estrategia: "strategy", strategie: "strategy", plan: "plan", plano: "plan",
  calendario: "calendar", kalender: "calendar", hitos: "milestones",
  meilensteine: "milestones", marcos: "milestones",
  campana: "campaign", kampagne: "campaign", campanha: "campaign",
  // finance
  beneficio: "profit", gewinn: "profit", lucro: "profit",
  dividendo: "dividend", dividende: "dividend",
  crecimiento: "growth", wachstum: "growth", crescimento: "growth",
  // sustainability
  sostenibilidad: "sustainability", nachhaltigkeit: "sustainability",
  sustentabilidade: "sustainability", emisiones: "emissions",
  emissionen: "emissions", emissoes: "emissions",
  // research
  estudio: "research", estudo: "research", studie: "research",
  investigacion: "research", encuesta: "survey", umfrage: "survey",
  pesquisa: "research",
  // misc governance
  confidencial: "confidential", vertraulich: "confidential",
  garantia: "guarantee", garantie: "guarantee",
  precio: "price", preis: "price", preco: "price", precios: "price",
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => SYNONYMS[t] ?? t)
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}
