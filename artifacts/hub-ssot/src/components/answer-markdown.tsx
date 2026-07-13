import { Streamdown } from "streamdown";
import { skinVars } from "@telefonica/mistica";
import type { Citation } from "@workspace/api-client-react";

// Governed answers are markdown. Citation markers ([S1], [S1, S2]) are
// rewritten into #cite- hash links before rendering so Streamdown can hand
// them to a custom anchor that draws the familiar citation chip. Hash hrefs
// are required: rehype-harden blocks custom protocols like cite:S1.
export function AnswerMarkdown({
  text,
  citations,
  onOpenCitation,
}: {
  text: string;
  citations: Citation[];
  onOpenCitation: (c: Citation) => void;
}) {
  const byId = new Map(citations.map((c) => [c.id, c]));
  const processed = text.replace(/\[([^\]]*)\](?!\()/g, (full, inner: string) => {
    if (!/S\s*\d/i.test(inner)) return full;
    const ids = [...inner.matchAll(/S\s*(\d+)/gi)].map((x) => `S${x[1]}`);
    return ids.map((id) => `[${id}](#cite-${id})`).join(" ");
  });
  return (
    <div className="answer-markdown">
      <Streamdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("#cite-")) {
              const id = href.slice(6);
              const cit = byId.get(id);
              return (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => cit && onOpenCitation(cit)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && cit) {
                      e.preventDefault();
                      onOpenCitation(cit);
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    backgroundColor: skinVars.colors.brandLow,
                    color: skinVars.colors.brand,
                    borderRadius: skinVars.borderRadii.indicator,
                    padding: "1px 6px",
                    margin: "0 2px",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    verticalAlign: "baseline",
                  }}
                >
                  {id}
                </span>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {processed}
      </Streamdown>
    </div>
  );
}
