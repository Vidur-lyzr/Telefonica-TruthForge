// Plain-text and Markdown renderers for governed exports. Both build from the
// same gated ExportDocumentModel the binary renderers use, so every governance
// decision (external stripping, confidentiality gates, citation set) is already
// applied before a single line is written here.

import type { ExportDocumentModel } from "../exportService";

function chartLines(model: ExportDocumentModel, md: boolean): string[] {
  const out: string[] = [];
  for (const chart of model.charts) {
    const title = `${chart.title}${chart.unit ? ` (${chart.unit})` : ""}`;
    out.push(md ? `**Chart — ${title}**` : `Chart — ${title}`);
    out.push(
      md
        ? `_Source: ${chart.source}${chart.citationId ? ` [${chart.citationId}]` : ""}_`
        : `Source: ${chart.source}${chart.citationId ? ` [${chart.citationId}]` : ""}`,
    );
    out.push("");
  }
  return out;
}

function tableLinesMd(model: ExportDocumentModel): string[] {
  const out: string[] = [];
  for (const table of model.tables) {
    out.push(`**${table.title}${table.unit ? ` (${table.unit})` : ""}**`);
    out.push("");
    out.push(`| ${table.columns.join(" | ")} |`);
    out.push(`| ${table.columns.map(() => "---").join(" | ")} |`);
    for (const row of table.rows) out.push(`| ${row.join(" | ")} |`);
    out.push(
      `_Source: ${table.source}${table.citationId ? ` [${table.citationId}]` : ""}_`,
    );
    out.push("");
  }
  return out;
}

function tableLinesTxt(model: ExportDocumentModel): string[] {
  const out: string[] = [];
  for (const table of model.tables) {
    out.push(`${table.title}${table.unit ? ` (${table.unit})` : ""}`);
    out.push(table.columns.join("  |  "));
    for (const row of table.rows) out.push(row.join("  |  "));
    out.push(
      `Source: ${table.source}${table.citationId ? ` [${table.citationId}]` : ""}`,
    );
    out.push("");
  }
  return out;
}

export function renderMd(model: ExportDocumentModel): Buffer {
  const lines: string[] = [];
  lines.push(`# ${model.title}`);
  lines.push("");
  if (model.subtitle) {
    lines.push(`> ${model.subtitle}`);
    lines.push("");
  }
  lines.push(
    `_${model.template.name} · ${model.audience} · ${model.confidentiality} · generated ${model.generatedAt}_`,
  );
  lines.push("");

  if (model.umbrella) {
    lines.push(`## Umbrella message`);
    lines.push("");
    lines.push(model.umbrella);
    lines.push("");
  }

  for (const section of model.sections) {
    if (section.isQa && model.qa.length > 0) continue;
    lines.push(
      `## ${section.heading}${section.internalOnly ? " (internal only)" : ""}`,
    );
    lines.push("");
    lines.push(section.body);
    lines.push("");
  }

  if (model.qa.length > 0) {
    lines.push(`## ${model.qaHeading ?? "Questions and approved answers"}`);
    lines.push("");
    for (const item of model.qa) {
      lines.push(`**Q: ${item.question}**`);
      lines.push("");
      lines.push(`A: ${item.answer}`);
      if (item.provenance.length > 0) {
        lines.push("");
        lines.push(
          `_Provenance: ${item.provenance
            .map((p) => `${p.docTitle} (${p.version}, ${p.owner}) [${p.citationId}]`)
            .join("; ")}_`,
        );
      }
      if (item.note) {
        lines.push("");
        lines.push(`_Internal note: ${item.note}_`);
      }
      lines.push("");
    }
  }

  if (model.spokesperson.length > 0) {
    lines.push(`## Spokesperson guidance (internal only)`);
    lines.push("");
    for (const item of model.spokesperson) {
      lines.push(`**If asked: ${item.question}**`);
      lines.push("");
      lines.push(item.guidance);
      if (item.doNotSay) lines.push(`Do not say: ${item.doNotSay}`);
      lines.push("");
    }
  }

  if (model.tables.length > 0) {
    lines.push(`## Data`);
    lines.push("");
    lines.push(...tableLinesMd(model));
  }

  if (model.charts.length > 0) {
    lines.push(`## Charts`);
    lines.push("");
    lines.push(...chartLines(model, true));
  }

  if (model.citations.length > 0) {
    lines.push(`## Evidence and citations`);
    lines.push("");
    for (const c of model.citations) {
      lines.push(
        `- **[${c.id}]** ${c.docTitle} — ${c.sourceLoc} (${c.version}, ${c.owner}, ${c.confidentiality})`,
      );
    }
    lines.push("");
  }

  if (model.disclaimers.length > 0) {
    lines.push(`## Disclaimers`);
    lines.push("");
    for (const d of model.disclaimers) lines.push(`- **${d.name}:** ${d.text}`);
    lines.push("");
  }

  return Buffer.from(lines.join("\n"), "utf8");
}

export function renderTxt(model: ExportDocumentModel): Buffer {
  const lines: string[] = [];
  const rule = (ch: string, text: string) => ch.repeat(Math.min(72, Math.max(8, text.length)));

  lines.push(model.title.toUpperCase());
  lines.push(rule("=", model.title));
  if (model.subtitle) lines.push(model.subtitle);
  lines.push(
    `${model.template.name} · ${model.audience} · ${model.confidentiality} · generated ${model.generatedAt}`,
  );
  lines.push("");

  const heading = (text: string) => {
    lines.push(text);
    lines.push(rule("-", text));
  };

  if (model.umbrella) {
    heading("Umbrella message");
    lines.push(model.umbrella);
    lines.push("");
  }

  for (const section of model.sections) {
    if (section.isQa && model.qa.length > 0) continue;
    heading(`${section.heading}${section.internalOnly ? " (internal only)" : ""}`);
    lines.push(section.body);
    lines.push("");
  }

  if (model.qa.length > 0) {
    heading(model.qaHeading ?? "Questions and approved answers");
    for (const item of model.qa) {
      lines.push(`Q: ${item.question}`);
      lines.push(`A: ${item.answer}`);
      if (item.provenance.length > 0) {
        lines.push(
          `Provenance: ${item.provenance
            .map((p) => `${p.docTitle} (${p.version}, ${p.owner}) [${p.citationId}]`)
            .join("; ")}`,
        );
      }
      if (item.note) lines.push(`Internal note: ${item.note}`);
      lines.push("");
    }
  }

  if (model.spokesperson.length > 0) {
    heading("Spokesperson guidance (internal only)");
    for (const item of model.spokesperson) {
      lines.push(`If asked: ${item.question}`);
      lines.push(item.guidance);
      if (item.doNotSay) lines.push(`Do not say: ${item.doNotSay}`);
      lines.push("");
    }
  }

  if (model.tables.length > 0) {
    heading("Data");
    lines.push(...tableLinesTxt(model));
  }

  if (model.charts.length > 0) {
    heading("Charts");
    lines.push(...chartLines(model, false));
  }

  if (model.citations.length > 0) {
    heading("Evidence and citations");
    for (const c of model.citations) {
      lines.push(
        `[${c.id}] ${c.docTitle} — ${c.sourceLoc} (${c.version}, ${c.owner}, ${c.confidentiality})`,
      );
    }
    lines.push("");
  }

  if (model.disclaimers.length > 0) {
    heading("Disclaimers");
    for (const d of model.disclaimers) lines.push(`${d.name}: ${d.text}`);
    lines.push("");
  }

  return Buffer.from(lines.join("\n"), "utf8");
}
