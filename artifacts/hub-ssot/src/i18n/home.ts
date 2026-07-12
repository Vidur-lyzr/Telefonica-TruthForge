// Localized strings for the Home front door and the small shared pages
// (404 / not-found). The corpus, radar items and metric values come from the
// server; this dictionary covers every static piece of the front-door chrome.

import type { Lang } from "../components/app-provider";

export type AppKey = "generate" | "kpis" | "planning" | "ask";

export interface HomeStrings {
  apps: Record<AppKey, { title: string; blurb: string }>;
  radarKind: {
    external_signal: string;
    knowledge_event: string;
    your_queue: string;
  };
  hero: {
    placeholder: string;
    honesty: string;
    subtitle: string;
  };
  askAria: string;
  welcomeBack: string;
  radar: string;
  whatChanged: string;
  radarCalmTitle: string;
  radarCalmBody: string;
  knowledgeHealth: string;
  knowledgeHealthInfo: string;
  sourcesYouCanCite: string;
  documents: (n: number) => string;
  validated: string;
  validatedInfo: string;
  strategicAxis: string;
  languages: string;
  lastUpdated: string;
  quarantined: string;
  heldFromAnswers: (n: number) => string;
  browseCorpus: string;
  noSourcesTitle: string;
  noSourcesBody: string;
  connectFirstDocument: string;
  emptyValue: string;
  relTime: {
    justNow: string;
    minutes: (n: number) => string;
    hours: (n: number) => string;
    days: (n: number) => string;
  };
  notFound: {
    title: string;
    body: string;
  };
}

export const HOME_I18N: Record<Lang, HomeStrings> = {
  EN: {
    apps: {
      generate: {
        title: "Generate",
        blurb: "Draft governed communications with cited evidence.",
      },
      kpis: {
        title: "KPIs",
        blurb: "Track the metrics that back every corporate claim.",
      },
      planning: {
        title: "Planning",
        blurb: "See what is scheduled and where plans collide.",
      },
      ask: {
        title: "Ask",
        blurb: "Question the corpus and get cited, honest answers.",
      },
    },
    radarKind: {
      external_signal: "External signal",
      knowledge_event: "Knowledge event",
      your_queue: "Your queue",
    },
    hero: {
      placeholder: "Ask anything about Telefónica…",
      honesty: "Answers cite their source. If there's no evidence, I'll say so.",
      subtitle:
        "Ask a question and get an answer backed by cited, governed evidence — or an honest no-evidence, permission, or historic-source response.",
    },
    askAria: "Ask",
    welcomeBack: "Welcome back",
    radar: "Radar",
    whatChanged: "What changed for you",
    radarCalmTitle: "Your radar is calm",
    radarCalmBody:
      "Nothing needs your attention right now. Ask a question to explore the governed corpus.",
    knowledgeHealth: "Knowledge health",
    knowledgeHealthInfo:
      "Live status of the governed knowledge core: how many sources your persona can cite, how much of the corpus is validated, and how fresh it is.",
    sourcesYouCanCite: "Sources you can cite",
    documents: (n) => `${n} documents`,
    validated: "Validated",
    validatedInfo:
      "Share of governed documents approved by their owner. The rest is under review, historic or superseded — the Hub flags those states in every answer.",
    strategicAxis: "Strategic axis",
    languages: "Languages",
    lastUpdated: "Last updated",
    quarantined: "Quarantined",
    heldFromAnswers: (n) => `${n} held from answers`,
    browseCorpus: "Browse the governed corpus",
    noSourcesTitle: "No governed sources yet",
    noSourcesBody:
      "Hub SSoT answers only from a governed knowledge core. Connect your first document to start getting cited, permission-aware answers.",
    connectFirstDocument: "Connect the first document",
    emptyValue: "—",
    relTime: {
      justNow: "just now",
      minutes: (n) => `${n}m ago`,
      hours: (n) => `${n}h ago`,
      days: (n) => `${n}d ago`,
    },
    notFound: {
      title: "404 page not found",
      body: "Did you forget to add the page to the router?",
    },
  },
  ES: {
    apps: {
      generate: {
        title: "Generar",
        blurb: "Redacta comunicaciones gobernadas con evidencia citada.",
      },
      kpis: {
        title: "KPIs",
        blurb: "Sigue las métricas que respaldan cada afirmación corporativa.",
      },
      planning: {
        title: "Planificación",
        blurb: "Consulta qué está programado y dónde chocan los planes.",
      },
      ask: {
        title: "Preguntar",
        blurb: "Consulta el corpus y obtén respuestas citadas y honestas.",
      },
    },
    radarKind: {
      external_signal: "Señal externa",
      knowledge_event: "Evento de conocimiento",
      your_queue: "Tu cola",
    },
    hero: {
      placeholder: "Pregunta lo que quieras sobre Telefónica…",
      honesty: "Las respuestas citan su fuente. Si no hay evidencia, lo diré.",
      subtitle:
        "Haz una pregunta y obtén una respuesta respaldada por evidencia citada y gobernada — o una respuesta honesta de sin-evidencia, permiso o fuente histórica.",
    },
    askAria: "Preguntar",
    welcomeBack: "Bienvenido de nuevo",
    radar: "Radar",
    whatChanged: "Qué ha cambiado para ti",
    radarCalmTitle: "Tu radar está tranquilo",
    radarCalmBody:
      "Nada requiere tu atención en este momento. Haz una pregunta para explorar el corpus gobernado.",
    knowledgeHealth: "Salud del conocimiento",
    knowledgeHealthInfo:
      "Estado en vivo del núcleo de conocimiento gobernado: cuántas fuentes puede citar tu persona, qué parte del corpus está validada y qué tan reciente es.",
    sourcesYouCanCite: "Fuentes que puedes citar",
    documents: (n) => `${n} documentos`,
    validated: "Validado",
    validatedInfo:
      "Proporción de documentos gobernados aprobados por su responsable. El resto está en revisión, es histórico o ha sido reemplazado — el Hub señala esos estados en cada respuesta.",
    strategicAxis: "Eje estratégico",
    languages: "Idiomas",
    lastUpdated: "Última actualización",
    quarantined: "En cuarentena",
    heldFromAnswers: (n) => `${n} retenidos de las respuestas`,
    browseCorpus: "Explorar el corpus gobernado",
    noSourcesTitle: "Aún no hay fuentes gobernadas",
    noSourcesBody:
      "Hub SSoT solo responde desde un núcleo de conocimiento gobernado. Conecta tu primer documento para empezar a obtener respuestas citadas y conscientes de permisos.",
    connectFirstDocument: "Conectar el primer documento",
    emptyValue: "—",
    relTime: {
      justNow: "ahora mismo",
      minutes: (n) => `hace ${n} min`,
      hours: (n) => `hace ${n} h`,
      days: (n) => `hace ${n} d`,
    },
    notFound: {
      title: "404 página no encontrada",
      body: "¿Olvidaste añadir la página al enrutador?",
    },
  },
  DE: {
    apps: {
      generate: {
        title: "Erstellen",
        blurb: "Erstellen Sie kontrollierte Kommunikation mit zitierten Belegen.",
      },
      kpis: {
        title: "KPIs",
        blurb: "Verfolgen Sie die Kennzahlen, die jede Unternehmensaussage belegen.",
      },
      planning: {
        title: "Planung",
        blurb: "Sehen Sie, was geplant ist und wo Pläne kollidieren.",
      },
      ask: {
        title: "Fragen",
        blurb: "Befragen Sie den Korpus und erhalten Sie zitierte, ehrliche Antworten.",
      },
    },
    radarKind: {
      external_signal: "Externes Signal",
      knowledge_event: "Wissensereignis",
      your_queue: "Ihre Warteschlange",
    },
    hero: {
      placeholder: "Frag alles über Telefónica…",
      honesty: "Antworten nennen ihre Quelle. Ohne Beleg sage ich es ehrlich.",
      subtitle:
        "Stelle eine Frage und erhalte eine Antwort mit zitierten, geprüften Belegen — oder eine ehrliche Antwort ohne Beleg, mit Berechtigungshinweis oder historischer Quelle.",
    },
    askAria: "Fragen",
    welcomeBack: "Willkommen zurück",
    radar: "Radar",
    whatChanged: "Was sich für Sie geändert hat",
    radarCalmTitle: "Ihr Radar ist ruhig",
    radarCalmBody:
      "Im Moment erfordert nichts Ihre Aufmerksamkeit. Stellen Sie eine Frage, um den kontrollierten Korpus zu erkunden.",
    knowledgeHealth: "Wissensgesundheit",
    knowledgeHealthInfo:
      "Live-Status des kontrollierten Wissenskerns: wie viele Quellen Ihre Persona zitieren kann, wie viel des Korpus validiert ist und wie aktuell er ist.",
    sourcesYouCanCite: "Zitierbare Quellen",
    documents: (n) => `${n} Dokumente`,
    validated: "Validiert",
    validatedInfo:
      "Anteil der kontrollierten Dokumente, die von ihren Verantwortlichen freigegeben wurden. Der Rest ist in Prüfung, historisch oder überholt — der Hub kennzeichnet diese Zustände in jeder Antwort.",
    strategicAxis: "Strategische Achse",
    languages: "Sprachen",
    lastUpdated: "Zuletzt aktualisiert",
    quarantined: "In Quarantäne",
    heldFromAnswers: (n) => `${n} von Antworten zurückgehalten`,
    browseCorpus: "Kontrollierten Korpus durchsuchen",
    noSourcesTitle: "Noch keine kontrollierten Quellen",
    noSourcesBody:
      "Hub SSoT antwortet ausschließlich aus einem kontrollierten Wissenskern. Verbinden Sie Ihr erstes Dokument, um zitierte, berechtigungsbewusste Antworten zu erhalten.",
    connectFirstDocument: "Erstes Dokument verbinden",
    emptyValue: "—",
    relTime: {
      justNow: "gerade eben",
      minutes: (n) => `vor ${n} Min.`,
      hours: (n) => `vor ${n} Std.`,
      days: (n) => `vor ${n} T.`,
    },
    notFound: {
      title: "404 Seite nicht gefunden",
      body: "Haben Sie vergessen, die Seite zum Router hinzuzufügen?",
    },
  },
  PT: {
    apps: {
      generate: {
        title: "Gerar",
        blurb: "Redija comunicações governadas com evidência citada.",
      },
      kpis: {
        title: "KPIs",
        blurb: "Acompanhe as métricas que sustentam cada afirmação corporativa.",
      },
      planning: {
        title: "Planejamento",
        blurb: "Veja o que está agendado e onde os planos colidem.",
      },
      ask: {
        title: "Perguntar",
        blurb: "Consulte o corpus e obtenha respostas citadas e honestas.",
      },
    },
    radarKind: {
      external_signal: "Sinal externo",
      knowledge_event: "Evento de conhecimento",
      your_queue: "Sua fila",
    },
    hero: {
      placeholder: "Pergunte qualquer coisa sobre a Telefónica…",
      honesty: "As respostas citam a fonte. Se não houver evidência, eu direi.",
      subtitle:
        "Faça uma pergunta e receba uma resposta apoiada por evidência citada e governada — ou uma resposta honesta de sem-evidência, permissão ou fonte histórica.",
    },
    askAria: "Perguntar",
    welcomeBack: "Bem-vindo de volta",
    radar: "Radar",
    whatChanged: "O que mudou para você",
    radarCalmTitle: "Seu radar está tranquilo",
    radarCalmBody:
      "Nada precisa da sua atenção neste momento. Faça uma pergunta para explorar o corpus governado.",
    knowledgeHealth: "Saúde do conhecimento",
    knowledgeHealthInfo:
      "Estado ao vivo do núcleo de conhecimento governado: quantas fontes sua persona pode citar, quanto do corpus está validado e quão recente ele é.",
    sourcesYouCanCite: "Fontes que você pode citar",
    documents: (n) => `${n} documentos`,
    validated: "Validado",
    validatedInfo:
      "Parcela dos documentos governados aprovados por seu responsável. O restante está em revisão, é histórico ou foi substituído — o Hub sinaliza esses estados em cada resposta.",
    strategicAxis: "Eixo estratégico",
    languages: "Idiomas",
    lastUpdated: "Última atualização",
    quarantined: "Em quarentena",
    heldFromAnswers: (n) => `${n} retidos das respostas`,
    browseCorpus: "Explorar o corpus governado",
    noSourcesTitle: "Ainda não há fontes governadas",
    noSourcesBody:
      "O Hub SSoT responde apenas a partir de um núcleo de conhecimento governado. Conecte seu primeiro documento para começar a obter respostas citadas e cientes de permissões.",
    connectFirstDocument: "Conectar o primeiro documento",
    emptyValue: "—",
    relTime: {
      justNow: "agora mesmo",
      minutes: (n) => `há ${n} min`,
      hours: (n) => `há ${n} h`,
      days: (n) => `há ${n} d`,
    },
    notFound: {
      title: "404 página não encontrada",
      body: "Você esqueceu de adicionar a página ao roteador?",
    },
  },
};
