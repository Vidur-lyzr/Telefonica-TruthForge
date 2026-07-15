// AUTO-GENERATED demo seed for the generate store. Loaded when no
// .data/generate-store.json exists (e.g. a fresh deployment) so the Generate
// module — Review inbox, Scheduled, Versions — is populated out of the box.
// The .data directory is gitignored, so without this seed a fresh deploy would
// start completely empty. Regenerate by snapshotting a good .data store.

export const GENERATE_STORE_SEED = {
  "savedVersions": [
    {
      "title": "Q1 2026 financial highlights: revenue and net income",
      "shape": "report",
      "language": "en",
      "audience": "internal",
      "confidentiality": "internal",
      "savedBy": "Test User",
      "governance": {
        "confidentiality": "internal",
        "validity": "approved",
        "owner": "Communications Analyst"
      },
      "draft": {
        "id": "draft-rgkanis",
        "status": "drafted",
        "shape": "report",
        "templateId": "tmpl-multiformat",
        "title": "Q1 2026 financial highlights: revenue and net income",
        "language": "en",
        "audience": "internal",
        "confidentiality": "internal",
        "umbrella": "Telefónica delivered steady revenue growth in Q1 2026, with group revenue of €8,127M and a stable adjusted EBITDA margin of 32.1%, underpinned by convergent bundle momentum and reaffirmed full-year guidance. [S1]",
        "sections": [
          {
            "id": "sec-23no8gl",
            "kind": "summary",
            "heading": "Overview",
            "axisId": null,
            "body": "This report provides an internal summary of Telefónica's key financial results for the first quarter of 2026 (Q1 2026), covering group revenue and profitability. All figures are drawn from the governed sources reconciled with the audited management accounts and are the reference figures the company defends with analysts and investors [S5].",
            "citationIds": [
              "S5"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-iaoqzug",
            "kind": "financials",
            "heading": "Group revenue",
            "axisId": null,
            "body": "Group revenue for Q1 2026 reached €8,127M, representing an increase of 1.8% year on year [S3]. This is the defensible figure reported and defended externally for Q1 2026 [S5][S6]. Growth was led by convergent bundles in the core markets and by double-digit growth at Telefónica Tech [S3].\n\nFor reference, Q4 2025 group revenue was €7,982M [S1]; that figure has been superseded by the Q1 2026 results and should not be used as the current revenue reference [S1].",
            "citationIds": [
              "S3",
              "S5",
              "S6",
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-myfy9tg",
            "kind": "financials",
            "heading": "Profitability and cash generation",
            "axisId": null,
            "body": "Adjusted EBITDA margin was stable at 32.1% in Q1 2026 [S4][S2]. Free cash flow generation supports the Board's commitment to the dividend and to continued network investment [S4].\n\nNet financial debt stood at €26,140M at the end of Q1 2026 [S2].",
            "citationIds": [
              "S4",
              "S2"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-ndbshx9",
            "kind": "note",
            "heading": "Net income",
            "axisId": null,
            "body": "Note: a governed net income figure for Q1 2026 is not available in the sources provided for this document. The relevant finance team should be consulted to supply and validate this figure before it is used in any internal or external communication. No net income figure has been included here in order to avoid misrepresentation. [S1]",
            "citationIds": [],
            "internalOnly": false
          },
          {
            "id": "sec-goxba30",
            "kind": "outlook",
            "heading": "Full-year 2026 guidance",
            "axisId": null,
            "body": "The company reaffirmed its full-year 2026 guidance of low-single-digit revenue growth and stable-to-improving margins, consistent with the Transform and Grow plan [S2].",
            "citationIds": [
              "S2"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-i3nvf0o",
            "kind": "boilerplate",
            "heading": "About Telefónica",
            "axisId": null,
            "body": "Telefónica is one of the largest telecommunications companies in the world by number of customers, with a presence in Europe and Latin America. It provides connectivity and digital services to consumers and businesses. [S1]",
            "citationIds": [],
            "internalOnly": false
          }
        ],
        "spokesperson": [],
        "charts": [
          {
            "id": "chart-njkuyxf",
            "title": "Group revenue trend",
            "type": "line",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "points": [
              {
                "label": "Q2 2025",
                "value": 7910
              },
              {
                "label": "Q3 2025",
                "value": 7955
              },
              {
                "label": "Q4 2025",
                "value": 7982
              },
              {
                "label": "Q1 2026",
                "value": 8127
              }
            ]
          },
          {
            "id": "chart-e59wzpt",
            "title": "Total accesses",
            "type": "bar",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "points": [
              {
                "label": "Spain",
                "value": 38.2
              },
              {
                "label": "Germany",
                "value": 45.1
              },
              {
                "label": "Brazil",
                "value": 116.4
              },
              {
                "label": "United Kingdom",
                "value": 41.7
              }
            ]
          }
        ],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-q4-2025-results",
            "docTitle": "Q4 2025 Results — Financial Highlights",
            "sourceLoc": "Q4 2025 Results › Financial highlights › slide 4",
            "version": "Q4 2025",
            "owner": "Investor Relations",
            "validUntil": "2026-02-20",
            "confidence": 0.98,
            "confidentiality": "public",
            "validity": "superseded",
            "snippet": "Group revenue for the fourth quarter of 2025 was €7,982M. This figure has since been superseded by the Q1 2026 results and should not be used as the current revenue reference.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S2",
            "docId": "doc-q1-2026-results",
            "docTitle": "Q1 2026 Results — Financial Highlights",
            "sourceLoc": "Q1 2026 Results › Outlook › slide 12",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.96,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "The company reaffirmed its full-year 2026 guidance of low-single-digit revenue growth and stable-to-improving margins, consistent with the Transform & Grow plan.",
            "value": "8,127 €M",
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S3",
            "docId": "doc-q1-2026-results",
            "docTitle": "Q1 2026 Results — Financial Highlights",
            "sourceLoc": "Q1 2026 Results › Financial highlights › slide 4",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.95,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Group revenue reached €8,127M in the first quarter of 2026, an increase of 1.8% year on year. This is the defensible figure Telefónica reports and defends externally for Q1 2026. Growth was led by convergent bundles in the core markets and by double-digit growth at Telefónica Tech.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S4",
            "docId": "doc-q1-2026-results",
            "docTitle": "Q1 2026 Results — Financial Highlights",
            "sourceLoc": "Q1 2026 Results › Financial highlights › slide 6",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.92,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Adjusted EBITDA margin was stable at 32.1%. Free cash flow generation supports the Board's commitment to the dividend and to continued network investment.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S5",
            "docId": "doc-q1-2026-ir-factsheet",
            "docTitle": "Q1 2026 Investor Relations Factsheet",
            "sourceLoc": "Q1 2026 IR Factsheet › Key figures",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.85,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Q1 2026 group revenue: €8,127M. This defensible figure is reconciled with the audited management accounts and is the reference the company defends with analysts for Q1 2026.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S6",
            "docId": "doc-q1-2026-press-release",
            "docTitle": "Q1 2026 Results — Press Release",
            "sourceLoc": "Q1 2026 Press Release › Headline",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.84,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Telefónica today reported group revenue of €8,127M for the first quarter of 2026. This is the figure the company defends externally and is consistent with the results presentation for Q1 2026.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          }
        ],
        "disclaimers": [],
        "axisIds": [
          "ax-core",
          "ax-b2b"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": true,
        "historicNote": "This draft draws on a source marked \"superseded\". Treat the figures as historic and verify against the current release.",
        "createdAt": "2026-07-08T00:59:45.785Z",
        "params": {
          "shape": "report",
          "topic": "Q1 2026 financial highlights revenue and net income",
          "roleId": "role-analyst",
          "audience": "internal",
          "language": "en",
          "confidentiality": "internal",
          "format": "document",
          "axisIds": []
        },
        "origin": "manual",
        "reviewItemId": null,
        "approved": false
      },
      "id": "ver-mrbdhia9-1",
      "version": 1,
      "previousVersionId": null,
      "tags": [
        "shape:report",
        "language:en",
        "audience:internal",
        "confidentiality:internal",
        "format:document",
        "axis:ax-core",
        "axis:ax-b2b",
        "sources:6",
        "has-charts",
        "historic-sources",
        "guardian-passed",
        "origin:manual"
      ],
      "savedAt": "2026-07-08T01:01:52.977Z"
    },
    {
      "title": "Press release — Telefónica B2B enterprise growth: cyber and cloud revenue announcement",
      "shape": "press",
      "language": "en",
      "audience": "internal",
      "confidentiality": "public",
      "savedBy": "Communications Director",
      "governance": {
        "confidentiality": "public",
        "validity": "approved",
        "owner": "Communications Director"
      },
      "draft": {
        "id": "draft-7jspyqa",
        "status": "drafted",
        "shape": "press",
        "templateId": "tmpl-press",
        "title": "Press release — Telefónica B2B enterprise growth: cyber and cloud revenue announcement",
        "language": "en",
        "audience": "internal",
        "confidentiality": "public",
        "umbrella": null,
        "exclusions": [
          {
            "reason": "destination",
            "docTitle": "Telefónica Tech — B2B Growth Strategy",
            "confidentiality": "confidential",
            "note": "\"Telefónica Tech — B2B Growth Strategy\" (confidential) was excluded: it is above the destination confidentiality (\"public\")."
          }
        ],
        "sections": [
          {
            "id": "sec-78nryjf",
            "kind": "headline",
            "heading": "Headline",
            "axisId": null,
            "body": "Telefónica reports growth in B2B enterprise cyber and cloud revenue [S1]",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-wadyunq",
            "kind": "lead",
            "heading": "Standfirst",
            "axisId": null,
            "body": "Analyst commentary highlights rising momentum in Telefónica's B2B cyber segment, pointing to sustained enterprise demand for digital security and cloud services [S1]. The company is positioned to build on this trend as enterprise customers accelerate their digital transformation programmes.",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-831z137",
            "kind": "body",
            "heading": "Body",
            "axisId": null,
            "body": "Recent market intelligence, published in the week of 27 in 2026, identifies analyst commentary on B2B cyber growth as a rising theme in coverage of Telefónica [S1]. This reflects increasing enterprise demand for managed cyber security and cloud solutions across Telefónica's European and Latin American footprint.\n\nThe B2B enterprise segment has drawn particular attention from industry analysts, who have noted the trajectory of Telefónica's cyber and cloud portfolio as a focus area for the company's commercial strategy [S1].\n\nNote: Specific revenue figures, year-on-year growth percentages, and regional breakdowns for the B2B cyber and cloud business are not covered by the approved sources available at the time of publication (12 May 2026). These figures should be sourced from finance or investor relations teams before inclusion in any external version of this document.",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-gffsurf",
            "kind": "quote",
            "heading": "Executive quote — pending spokesperson approval",
            "axisId": null,
            "body": "",
            "citationIds": [],
            "internalOnly": false
          },
          {
            "id": "sec-9ddm60i",
            "kind": "boilerplate",
            "heading": "About Telefónica",
            "axisId": null,
            "body": "Telefónica is one of the largest telecommunications companies in the world by number of customers, with a presence in Europe and Latin America. It provides connectivity and digital services to consumers and businesses.",
            "citationIds": [],
            "internalOnly": false
          },
          {
            "id": "sec-aqjpug1",
            "kind": "qa",
            "heading": "Q&A",
            "axisId": null,
            "body": "Q1: What is driving growth in Telefónica's B2B cyber and cloud segment?\nA1: Analyst commentary indicates that enterprise demand for digital security and cloud services is a rising theme in coverage of Telefónica's business performance [S1]. Specific drivers beyond this observation are not covered by the approved sources available.\n\nQ2: Which markets are seeing the strongest B2B enterprise cyber demand?\nA2: The approved sources do not provide a market-by-market breakdown of B2B cyber demand. This point is not covered by approved material and should not be stated externally without additional sourcing from the relevant business unit.\n\nQ3: Can Telefónica share specific revenue or growth figures for the cyber and cloud business?\nA3: Specific revenue figures and growth percentages for the B2B cyber and cloud portfolio are not covered by approved material available at the time of publication (12 May 2026). These figures should not be quoted externally until finance or investor relations teams have cleared them.\n\nQ4: Is Telefónica expanding its cyber and cloud offer for enterprise customers?\nA4: Analyst commentary notes B2B cyber growth as a key area of focus for Telefónica [S1]. Details of specific product or service expansions are not covered by the approved sources available and should not be stated externally without further clearance.\n\nQ5: Are there any concerns about rural 5G coverage that could affect business customers?\nA5: Social listening data from week 27 of 2026 flags questions about rural 5G coverage in Germany as a negative theme in public commentary [S1]. The approved sources do not provide further detail on this point, and any external response should be coordinated with the relevant market communications team before publication.",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-4iorwaf",
            "kind": "contact",
            "heading": "Press contact",
            "axisId": null,
            "body": "Telefónica Group Communications — press.office@telefonica.com · +34 91 482 38 00 · telefonica.com/press",
            "citationIds": [],
            "internalOnly": false
          }
        ],
        "spokesperson": [
          {
            "question": "What should María García say if asked about the scale or specific figures behind Telefónica's B2B cyber and cloud growth?",
            "guidance": "No approved revenue figures or specific growth metrics are available in the cleared sources for this release. María García should avoid citing any numbers not formally cleared by finance or investor relations. She may acknowledge that analyst commentary has identified B2B cyber as a growth area [S1] and refer media to the investor relations team for financial detail. No internal guidance was available at drafter clearance level to supplement this note.",
            "doNotSay": "Do not cite specific revenue figures, growth percentages, or market-share claims that have not been approved by finance or investor relations. Do not reference the Movistar symmetric-fibre guarantee, as this USP is not yet approved for external use [S1]."
          },
          {
            "question": "What should María García say if asked about rural 5G coverage concerns in Germany?",
            "guidance": "Social listening data flags this as a negative theme in public commentary [S1]. María García should not dismiss the concern. She should acknowledge that Telefónica takes coverage quality seriously and direct detailed questions to the relevant market communications team. No further approved detail is available in the cleared sources.",
            "doNotSay": "Do not make unqualified claims about the quality or completeness of rural 5G coverage in Germany without cleared, approved supporting data. Do not use unapproved superlatives such as 'best network'."
          },
          {
            "question": "What should María García say if asked for an executive quote for media use?",
            "guidance": "No approved quote attributed to María García exists in the cleared sources for this release. She should not improvise a quotable statement for publication without prior clearance from communications. Any quote must go through the standard approval process before it is attributed and published.",
            "doNotSay": "Do not allow a quote to be published under María García's name that has not been formally approved and attributed in writing."
          }
        ],
        "charts": [
          {
            "id": "chart-lv1kwrp",
            "title": "Group revenue trend",
            "type": "line",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": null,
            "points": [
              {
                "label": "Q2 2025",
                "value": 7910
              },
              {
                "label": "Q3 2025",
                "value": 7955
              },
              {
                "label": "Q4 2025",
                "value": 7982
              },
              {
                "label": "Q1 2026",
                "value": 8127
              }
            ]
          }
        ],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-social-listening-w27",
            "docTitle": "Social Listening Digest — Week 27 2026",
            "sourceLoc": "Social Listening W27 › Themes",
            "version": "Q3 2026",
            "owner": "External Listening",
            "validUntil": "2026-07-14",
            "confidence": 0.98,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Rising themes: speculation about a Movistar symmetric-fibre guarantee in Spain (positive), questions about rural 5G coverage in Germany (negative flag), and analyst commentary on B2B cyber growth. The fibre-guarantee theme is flagged to Marca because the USP is not yet approved for external use.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          },
          {
            "id": "disc-no-offer",
            "name": "No offer",
            "text": "This document is for information only and does not constitute an offer or solicitation to buy or sell any securities."
          }
        ],
        "axisIds": [
          "ax-core",
          "ax-digital"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "createdAt": "2026-07-08T01:35:58.281Z",
        "params": {
          "shape": "press",
          "topic": "B2B enterprise growth cyber cloud revenue announcement",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "public",
          "format": "press_release",
          "axisIds": [],
          "spokesperson": "María García",
          "eventDate": "12 May 2026"
        },
        "origin": "manual",
        "reviewItemId": null,
        "approved": false
      },
      "id": "ver-mrbeqe7l-5",
      "version": 1,
      "previousVersionId": null,
      "tags": [
        "shape:press",
        "language:en",
        "audience:internal",
        "confidentiality:public",
        "format:press_release",
        "axis:ax-core",
        "axis:ax-digital",
        "sources:1",
        "has-charts",
        "has-spokesperson-notes",
        "guardian-passed",
        "origin:manual"
      ],
      "savedAt": "2026-07-08T01:36:47.217Z"
    },
    {
      "title": "Press release — Telefónica B2B enterprise growth: cyber and cloud revenue announcement",
      "shape": "press",
      "language": "en",
      "audience": "internal",
      "confidentiality": "public",
      "savedBy": "Brand Manager",
      "governance": {
        "confidentiality": "public",
        "validity": "approved",
        "owner": "Communications Director"
      },
      "draft": {
        "id": "draft-7jspyqa",
        "status": "drafted",
        "shape": "press",
        "templateId": "tmpl-press",
        "title": "Press release — Telefónica B2B enterprise growth: cyber and cloud revenue announcement",
        "language": "en",
        "audience": "internal",
        "confidentiality": "public",
        "umbrella": null,
        "exclusions": [
          {
            "reason": "destination",
            "docTitle": "Telefónica Tech — B2B Growth Strategy",
            "confidentiality": "confidential",
            "note": "\"Telefónica Tech — B2B Growth Strategy\" (confidential) was excluded: it is above the destination confidentiality (\"public\")."
          }
        ],
        "sections": [
          {
            "id": "sec-78nryjf",
            "kind": "headline",
            "heading": "Headline",
            "axisId": null,
            "body": "Telefónica reports growth in B2B enterprise cyber and cloud revenue [S1]",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-wadyunq",
            "kind": "lead",
            "heading": "Standfirst",
            "axisId": null,
            "body": "Analyst commentary highlights rising momentum in Telefónica's B2B cyber segment, pointing to sustained enterprise demand for digital security and cloud services [S1]. The company is positioned to build on this trend as enterprise customers accelerate their digital transformation programmes.",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-831z137",
            "kind": "body",
            "heading": "Body",
            "axisId": null,
            "body": "Recent market intelligence, published in the week of 27 in 2026, identifies analyst commentary on B2B cyber growth as a rising theme in coverage of Telefónica [S1]. This reflects increasing enterprise demand for managed cyber security and cloud solutions across Telefónica's European and Latin American footprint.\n\nThe B2B enterprise segment has drawn particular attention from industry analysts, who have noted the trajectory of Telefónica's cyber and cloud portfolio as a focus area for the company's commercial strategy [S1].\n\nNote: Specific revenue figures, year-on-year growth percentages, and regional breakdowns for the B2B cyber and cloud business are not covered by the approved sources available at the time of publication (12 May 2026). These figures should be sourced from finance or investor relations teams before inclusion in any external version of this document.",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-gffsurf",
            "kind": "quote",
            "heading": "Executive quote — pending spokesperson approval",
            "axisId": null,
            "body": "",
            "citationIds": [],
            "internalOnly": false
          },
          {
            "id": "sec-9ddm60i",
            "kind": "boilerplate",
            "heading": "About Telefónica",
            "axisId": null,
            "body": "Telefónica is one of the largest telecommunications companies in the world by number of customers, with a presence in Europe and Latin America. It provides connectivity and digital services to consumers and businesses.",
            "citationIds": [],
            "internalOnly": false
          },
          {
            "id": "sec-aqjpug1",
            "kind": "qa",
            "heading": "Q&A",
            "axisId": null,
            "body": "Q1: What is driving growth in Telefónica's B2B cyber and cloud segment?\nA1: Analyst commentary indicates that enterprise demand for digital security and cloud services is a rising theme in coverage of Telefónica's business performance [S1]. Specific drivers beyond this observation are not covered by the approved sources available.\n\nQ2: Which markets are seeing the strongest B2B enterprise cyber demand?\nA2: The approved sources do not provide a market-by-market breakdown of B2B cyber demand. This point is not covered by approved material and should not be stated externally without additional sourcing from the relevant business unit.\n\nQ3: Can Telefónica share specific revenue or growth figures for the cyber and cloud business?\nA3: Specific revenue figures and growth percentages for the B2B cyber and cloud portfolio are not covered by approved material available at the time of publication (12 May 2026). These figures should not be quoted externally until finance or investor relations teams have cleared them.\n\nQ4: Is Telefónica expanding its cyber and cloud offer for enterprise customers?\nA4: Analyst commentary notes B2B cyber growth as a key area of focus for Telefónica [S1]. Details of specific product or service expansions are not covered by the approved sources available and should not be stated externally without further clearance.\n\nQ5: Are there any concerns about rural 5G coverage that could affect business customers?\nA5: Social listening data from week 27 of 2026 flags questions about rural 5G coverage in Germany as a negative theme in public commentary [S1]. The approved sources do not provide further detail on this point, and any external response should be coordinated with the relevant market communications team before publication.",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-4iorwaf",
            "kind": "contact",
            "heading": "Press contact",
            "axisId": null,
            "body": "Telefónica Group Communications — press.office@telefonica.com · +34 91 482 38 00 · telefonica.com/press",
            "citationIds": [],
            "internalOnly": false
          }
        ],
        "spokesperson": [
          {
            "question": "What should María García say if asked about the scale or specific figures behind Telefónica's B2B cyber and cloud growth?",
            "guidance": "No approved revenue figures or specific growth metrics are available in the cleared sources for this release. María García should avoid citing any numbers not formally cleared by finance or investor relations. She may acknowledge that analyst commentary has identified B2B cyber as a growth area [S1] and refer media to the investor relations team for financial detail. No internal guidance was available at drafter clearance level to supplement this note.",
            "doNotSay": "Do not cite specific revenue figures, growth percentages, or market-share claims that have not been approved by finance or investor relations. Do not reference the Movistar symmetric-fibre guarantee, as this USP is not yet approved for external use [S1]."
          },
          {
            "question": "What should María García say if asked about rural 5G coverage concerns in Germany?",
            "guidance": "Social listening data flags this as a negative theme in public commentary [S1]. María García should not dismiss the concern. She should acknowledge that Telefónica takes coverage quality seriously and direct detailed questions to the relevant market communications team. No further approved detail is available in the cleared sources.",
            "doNotSay": "Do not make unqualified claims about the quality or completeness of rural 5G coverage in Germany without cleared, approved supporting data. Do not use unapproved superlatives such as 'best network'."
          },
          {
            "question": "What should María García say if asked for an executive quote for media use?",
            "guidance": "No approved quote attributed to María García exists in the cleared sources for this release. She should not improvise a quotable statement for publication without prior clearance from communications. Any quote must go through the standard approval process before it is attributed and published.",
            "doNotSay": "Do not allow a quote to be published under María García's name that has not been formally approved and attributed in writing."
          }
        ],
        "charts": [
          {
            "id": "chart-lv1kwrp",
            "title": "Group revenue trend",
            "type": "line",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": null,
            "points": [
              {
                "label": "Q2 2025",
                "value": 7910
              },
              {
                "label": "Q3 2025",
                "value": 7955
              },
              {
                "label": "Q4 2025",
                "value": 7982
              },
              {
                "label": "Q1 2026",
                "value": 8127
              }
            ]
          }
        ],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-social-listening-w27",
            "docTitle": "Social Listening Digest — Week 27 2026",
            "sourceLoc": "Social Listening W27 › Themes",
            "version": "Q3 2026",
            "owner": "External Listening",
            "validUntil": "2026-07-14",
            "confidence": 0.98,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Rising themes: speculation about a Movistar symmetric-fibre guarantee in Spain (positive), questions about rural 5G coverage in Germany (negative flag), and analyst commentary on B2B cyber growth. The fibre-guarantee theme is flagged to Marca because the USP is not yet approved for external use.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          },
          {
            "id": "disc-no-offer",
            "name": "No offer",
            "text": "This document is for information only and does not constitute an offer or solicitation to buy or sell any securities."
          }
        ],
        "axisIds": [
          "ax-core",
          "ax-digital"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "createdAt": "2026-07-08T01:35:58.281Z",
        "params": {
          "shape": "press",
          "topic": "B2B enterprise growth cyber cloud revenue announcement",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "public",
          "format": "press_release",
          "axisIds": [],
          "spokesperson": "María García",
          "eventDate": "12 May 2026"
        },
        "origin": "manual",
        "reviewItemId": null,
        "approved": false
      },
      "id": "ver-mrigvps9-24",
      "version": 2,
      "previousVersionId": "ver-mrbeqe7l-5",
      "tags": [
        "shape:press",
        "language:en",
        "audience:internal",
        "confidentiality:public",
        "format:press_release",
        "axis:ax-core",
        "axis:ax-digital",
        "sources:1",
        "has-charts",
        "has-spokesperson-notes",
        "guardian-passed",
        "origin:manual"
      ],
      "savedAt": "2026-07-13T00:11:17.961Z"
    },
    {
      "title": "Q1 2026 fibre network expansion — internal briefing",
      "shape": "multiformat",
      "language": "en",
      "audience": "internal",
      "confidentiality": "internal",
      "savedBy": "External / Press",
      "governance": {
        "confidentiality": "internal",
        "validity": "approved",
        "owner": "External / Press"
      },
      "draft": {
        "id": "draft-cd1q5ca",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-multiformat",
        "title": "Q1 2026 fibre network expansion — internal briefing",
        "language": "en",
        "audience": "internal",
        "confidentiality": "internal",
        "umbrella": "Telefónica is accelerating fibre deployment and managing its network infrastructure with dedicated resources, closing the first quarter of 2026 with 68.4M fibre premises passed and a clear commitment to extending reach and quality across its core markets. [S3][S4]",
        "exclusions": [
          {
            "reason": "clearance",
            "docTitle": null,
            "confidentiality": "private",
            "note": "A relevant source classified \"private\" was excluded: it is above your clearance (\"public\")."
          },
          {
            "reason": "clearance",
            "docTitle": null,
            "confidentiality": "private",
            "note": "A relevant source classified \"private\" was excluded: it is above your clearance (\"public\")."
          }
        ],
        "sections": [
          {
            "id": "sec-bda124l",
            "kind": "summary",
            "heading": "Executive summary",
            "axisId": null,
            "body": "Telefónica closed Q1 2026 with 68.4M fibre premises passed and 9.2M convergent customers, with investment continuing to prioritise fibre expansion alongside the progressive retirement of legacy copper infrastructure [S3]. To accelerate this rollout, the company has announced the creation of a new unit dedicated to managing fibre network expansion, focused on optimising installation and maintenance processes and identifying priority deployment areas [S1]. On the wholesale side, a new agreement with Digi will see Movistar's fibre network used to serve Digi's customers, with a focus on the main cities and a competitive positioning that does not rely on price reduction [S2]. At MWC Barcelona 2026, management reaffirmed the group's network quality and reach commitments and reiterated the 68.4M fibre premises passed figure [S4]. Taken together, these developments reflect a consistent strategic direction: broadening fibre coverage, monetising infrastructure through wholesale partnerships, and maintaining network quality as a core pillar.",
            "citationIds": [
              "S3",
              "S1",
              "S2",
              "S4"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-67tkgg7",
            "kind": "body",
            "heading": "Fibre deployment: scale and new operational structure",
            "axisId": "network-expansion-deployment",
            "body": "Telefónica ended Q1 2026 with 68.4M fibre premises passed across the group, with investment firmly directed at extending fibre coverage and retiring legacy copper [S3]. This scale was reiterated at MWC Barcelona 2026, where management highlighted network quality and energy efficiency as the guiding principles of the build programme, avoiding headline speed claims in favour of sustainable, long-term network value [S4].\n\nTo sustain and accelerate this momentum, Telefónica has announced the creation of a new dedicated unit to manage the expansion of its fibre network [S1]. The unit will concentrate on three areas: optimising installation and maintenance processes, improving deployment efficiency, and identifying which regions should be prioritised for rollout [S1]. This structural move signals that fibre expansion is being treated not merely as a capital programme but as a capability that requires its own governance and operational focus.",
            "citationIds": [
              "S3",
              "S4",
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-95nlijo",
            "kind": "body",
            "heading": "Wholesale infrastructure: the Digi agreement",
            "axisId": "wholesale-partnerships",
            "body": "A new wholesale agreement between Telefónica and Digi will allow Digi to offer fibre broadband services to its customers using Movistar's fibre network [S2]. The partnership concentrates initially on the main cities, and the stated commercial objective is for Digi to be competitive without competing on price alone [S2]. Digi brings direct experience from its existing fibre operations in Romania, which it intends to apply to this new line of business in Spain [S2].\n\nThis agreement illustrates how Telefónica's fibre infrastructure can generate wholesale value alongside its retail business. By opening the network to a virtual operator with an established track record, Telefónica extends the commercial reach of its fibre assets without cannibalising its own retail offer through price pressure.",
            "citationIds": [
              "S2"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-444k0b5",
            "kind": "body",
            "heading": "Convergent customers and the role of fibre in the customer relationship",
            "axisId": "convergence-customer-experience",
            "body": "Fibre is the foundation of Telefónica's convergent offer. At the end of Q1 2026, the group counted 9.2M convergent customers, a base that depends on reliable, high-quality fibre connectivity [S3]. Management has consistently positioned network quality and reach as central to the Build the best networks axis and to customer satisfaction in the core markets [S3].\n\nAt MWC Barcelona 2026, the group's leadership reinforced this message, emphasising energy efficiency and quality over raw speed metrics and setting out plans to extend 5G standalone coverage to a further set of mid-sized Spanish cities during 2026 [S4]. While 5G standalone and fibre are distinct programmes, both serve the same underlying goal: ensuring that Telefónica's network is the foundation customers and business partners choose for connectivity.",
            "citationIds": [
              "S3",
              "S4"
            ],
            "internalOnly": false
          }
        ],
        "spokesperson": [],
        "charts": [
          {
            "id": "chart-52acy0y",
            "title": "Total accesses",
            "type": "bar",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": null,
            "points": [
              {
                "label": "Spain",
                "value": 38.2
              },
              {
                "label": "Germany",
                "value": 45.1
              },
              {
                "label": "Brazil",
                "value": 116.4
              },
              {
                "label": "United Kingdom",
                "value": 41.7
              }
            ]
          }
        ],
        "tables": [
          {
            "id": "table-d7z81ta",
            "title": "Total accesses",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": null,
            "columns": [
              "Period",
              "Value (million)"
            ],
            "rows": [
              [
                "Spain",
                "38.2"
              ],
              [
                "Germany",
                "45.1"
              ],
              [
                "Brazil",
                "116.4"
              ],
              [
                "United Kingdom",
                "41.7"
              ]
            ]
          }
        ],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-live-telefonica-anuncia-la-creacion-de-una-nueva-unid",
            "docTitle": "Telefónica Anuncia la Creación de una Nueva Unidad para Gestionar la Expansión de su Red de Fibra",
            "sourceLoc": "cp4ingenieria.com > Live capture",
            "version": "Q3 2026",
            "owner": "Media monitoring",
            "validUntil": null,
            "confidence": 0.98,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Telefónica ha anunciado su plan para establecer una nueva unidad dedicada a la gestión de la expansión de su red de fibra óptica. Esta iniciativa busca acelerar el despliegue de infraestructura de fibra en diversas regiones, con el objetivo de proporcionar servicios de internet de alta velocidad a un número creciente de usuarios. La nueva unidad se enfocará en optimizar los procesos de instalación y mantenimiento de la red de fibra, así como en la identificación de áreas prioritarias para el despliegue. Source: https://www.cp4ingenieria.com/telefonica-anuncia-la-creacion-de-una-nueva-unidad-para-gestionar-la-expansion-de-su-red-de-fibra/",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": []
          },
          {
            "id": "S2",
            "docId": "doc-live-digi-cierra-un-acuerdo-con-telefonica-para-lleva",
            "docTitle": "Digi cierra un acuerdo con Telefónica para llevar fibra óptica a sus clientes",
            "sourceLoc": "comunidad.movistar.es > Live capture",
            "version": "Q3 2026",
            "owner": "Media monitoring",
            "validUntil": null,
            "confidence": 0.7,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Digi, uno de los líderes de la oferta de Operadores Móviles Virtuales, acaba de cerrar un acuerdo con Telefónica para utilizar la fibra óptica de Movistar. El objetivo de este nuevo producto es ser competitivos sin tirar los precios, y el foco estará en las principales ciudades. Digi ya ofrece fibra en Rumanía y utilizará su know how en esta nueva línea de negocio. Source: https://comunidad.movistar.es/discussions/8/digi-cierra-un-acuerdo-con-telef%C3%B3nica-para-llevar-fibra-%C3%B3ptica-a-sus-clientes/3429237",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": []
          },
          {
            "id": "S3",
            "docId": "doc-q1-2026-press-release",
            "docTitle": "Q1 2026 Results — Press Release",
            "sourceLoc": "Q1 2026 Press Release › Body › Networks",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.8,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "The group ended the first quarter of 2026 with 68.4M fibre premises passed and 9.2M convergent customers. Investment continued to focus on fibre expansion and 5G standalone coverage while legacy copper is progressively retired. Management reaffirmed that network quality and reach remain central to the Build the best networks axis and to customer satisfaction across the core markets.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S4",
            "docId": "doc-mwc-2026-keynote",
            "docTitle": "CEO Keynote — MWC Barcelona 2026",
            "sourceLoc": "MWC 2026 Keynote › Networks › 5G standalone",
            "version": "Q1 2026",
            "owner": "Executive Communications",
            "validUntil": null,
            "confidence": 0.73,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Cortés announced that 5G standalone now covers the major cities of Spain and Germany and set a target to add coverage in a further set of mid-sized Spanish cities during 2026. She emphasised network quality and energy efficiency over headline speed claims, and reiterated that the group had 68.4M fibre premises passed. The message avoided unpublished market-share forecasts, consistent with approved messaging discipline.",
            "value": null,
            "country": "Spain",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks",
              "ax-digital"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "qaNotes": [],
        "axisIds": [
          "network-expansion-deployment",
          "wholesale-partnerships",
          "convergence-customer-experience",
          "ax-core",
          "ax-networks",
          "ax-digital"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "createdAt": "2026-07-15T00:46:32.048Z",
        "params": {
          "shape": "multiformat",
          "topic": "Q1 2026 fiber network expansion",
          "roleId": "role-press",
          "audience": "internal",
          "language": "en",
          "confidentiality": "internal",
          "format": "document",
          "axisIds": [],
          "spokesperson": null,
          "eventDate": null
        },
        "origin": "manual",
        "reviewItemId": null,
        "approved": false,
        "askSignals": {
          "question": "Generate a press release document about the Q1 2026 fiber network expansion",
          "conflict": false,
          "lowConfidence": false,
          "historic": false,
          "note": null
        }
      },
      "id": "ver-mrld1f3g-25",
      "version": 1,
      "previousVersionId": null,
      "tags": [
        "shape:multiformat",
        "language:en",
        "audience:internal",
        "confidentiality:internal",
        "format:document",
        "axis:network-expansion-deployment",
        "axis:wholesale-partnerships",
        "axis:convergence-customer-experience",
        "axis:ax-core",
        "axis:ax-networks",
        "axis:ax-digital",
        "sources:4",
        "has-charts",
        "guardian-passed",
        "origin:manual"
      ],
      "savedAt": "2026-07-15T00:47:04.108Z"
    },
    {
      "title": "B2B momentum and enterprise pipeline — external messaging",
      "shape": "messaging",
      "language": "en",
      "audience": "external",
      "confidentiality": "public",
      "savedBy": "role-director",
      "governance": {
        "confidentiality": "public",
        "validity": "approved",
        "owner": "Communications Director"
      },
      "draft": {
        "id": "draft-u1bz9b3",
        "status": "drafted",
        "shape": "messaging",
        "templateId": "tmpl-messaging",
        "title": "B2B momentum and enterprise pipeline — external messaging",
        "language": "en",
        "audience": "external",
        "confidentiality": "public",
        "umbrella": "Telefónica is building durable momentum in the enterprise segment, with Telefónica Tech posting double-digit revenue growth in Q1 2026 and a strong pipeline heading into the second quarter. [S1]",
        "exclusions": [
          {
            "reason": "destination",
            "docTitle": "Talking Points — B2B & Telefónica Tech (v3)",
            "confidentiality": "private",
            "note": "\"Talking Points — B2B & Telefónica Tech (v3)\" (private) was excluded: an external destination may only carry public material."
          },
          {
            "reason": "destination",
            "docTitle": "Telefónica Tech — B2B Growth Strategy",
            "confidentiality": "confidential",
            "note": "\"Telefónica Tech — B2B Growth Strategy\" (confidential) was excluded: an external destination may only carry public material."
          },
          {
            "reason": "destination",
            "docTitle": "Customer Segment Scorecard — B2B & Consumer 2026",
            "confidentiality": "confidential",
            "note": "\"Customer Segment Scorecard — B2B & Consumer 2026\" (confidential) was excluded: an external destination may only carry public material."
          },
          {
            "reason": "destination",
            "docTitle": "5G & Fibre Deployment Plan",
            "confidentiality": "private",
            "note": "\"5G & Fibre Deployment Plan\" (private) was excluded: an external destination may only carry public material."
          },
          {
            "reason": "destination",
            "docTitle": "Talking Points — Q2 2026 Results (Approved)",
            "confidentiality": "private",
            "note": "\"Talking Points — Q2 2026 Results (Approved)\" (private) was excluded: an external destination may only carry public material."
          },
          {
            "reason": "destination",
            "docTitle": "Brazil (Vivo) Market Update",
            "confidentiality": "private",
            "note": "\"Brazil (Vivo) Market Update\" (private) was excluded: an external destination may only carry public material."
          },
          {
            "reason": "destination",
            "docTitle": "Talking Points — B2B & Telefónica Tech (v2)",
            "confidentiality": "private",
            "note": "\"Talking Points — B2B & Telefónica Tech (v2)\" (private) was excluded: an external destination may only carry public material."
          },
          {
            "reason": "destination",
            "docTitle": "Seguimiento de objetivos — Crecimiento B2B (Semana 28)",
            "confidentiality": "private",
            "note": "\"Seguimiento de objetivos — Crecimiento B2B (Semana 28)\" (private) was excluded: an external destination may only carry public material."
          }
        ],
        "sections": [
          {
            "id": "sec-r50576y",
            "kind": "umbrella",
            "heading": "Umbrella message",
            "axisId": null,
            "body": "Telefónica is building durable momentum in the enterprise segment, with Telefónica Tech posting double-digit revenue growth in Q1 2026 and a strong pipeline heading into the second quarter. [S1]",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-6dum899",
            "kind": "key_message",
            "heading": "Scale B2B and Tech",
            "axisId": "scale-b2b-tech",
            "body": "Demand from enterprise customers is translating directly into results. Telefónica Tech delivered double-digit revenue growth in the first quarter of 2026, driven by cyber-security, cloud and managed connectivity services. [S1]\n\n- The unit is scaling high-margin enterprise revenue in line with its B2B and Tech growth strategy. [S1]\n- The B2B pipeline remained strong as the business entered the second quarter, pointing to continued momentum ahead. [S1]\n- Growth is concentrated in services — cyber-security, cloud, and managed connectivity — that enterprise customers increasingly regard as essential rather than discretionary. [S1]",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          }
        ],
        "spokesperson": [
          {
            "question": "Can you share specific revenue figures for Telefónica Tech in Q1 2026?",
            "guidance": "The published source confirms double-digit revenue growth for Telefónica Tech in Q1 2026 and characterises the enterprise pipeline as strong entering Q2, but does not provide an absolute revenue figure. Stick to the percentage characterisation ('double-digit growth') and do not extrapolate or invent a number. If a precise figure is needed, refer the enquirer to the full Q1 2026 results press release.",
            "doNotSay": "Do not state or imply a specific euro or percentage figure beyond 'double-digit' as no such figure is available in the approved sources."
          },
          {
            "question": "What is driving the pipeline strength in B2B?",
            "guidance": "The approved source attributes enterprise demand to cyber-security, cloud and managed connectivity. Confine the answer to these three areas. Do not speculate about deals, customers or sectors not referenced in the source material.",
            "doNotSay": "Do not name specific customers, deals or pipeline values. Do not describe Telefónica Tech as a market leader, the largest, or number one in any category."
          },
          {
            "question": "Can you quote Diego Salvado on the pipeline outlook?",
            "guidance": "The source attributes a statement to Diego Salvado, Director Telefónica Tech, characterising the B2B pipeline as strong entering Q2 2026. No verbatim approved quote is available. Any direct quotation must be submitted for spokesperson approval before use. Paraphrase only until approval is granted.",
            "doNotSay": "Do not fabricate or reconstruct a verbatim quote. Do not use the paraphrase as if it were a direct quotation."
          }
        ],
        "charts": [],
        "tables": [],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-q1-2026-press-release",
            "docTitle": "Q1 2026 Results — Press Release",
            "sourceLoc": "Q1 2026 Press Release › Body › B2B and Tech",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.98,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Telefónica Tech delivered double-digit revenue growth in the first quarter, led by demand for cyber-security, cloud and managed connectivity among enterprise customers. Diego Salvado, Director Telefónica Tech, said the pipeline in the B2B segment remained strong entering the second quarter. The unit continues to scale high-margin enterprise revenue in line with the Scale B2B & Tech strategic axis.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "qaNotes": [],
        "axisIds": [
          "scale-b2b-tech",
          "ax-core"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "createdAt": "2026-07-15T01:13:21.279Z",
        "params": {
          "shape": "messaging",
          "topic": "B2B momentum and enterprise pipeline",
          "roleId": "role-director",
          "audience": "external",
          "language": "en",
          "confidentiality": "public",
          "format": "talking_points",
          "axisIds": [],
          "spokesperson": null,
          "eventDate": null
        },
        "origin": "manual",
        "reviewItemId": null,
        "approved": false,
        "askSignals": null
      },
      "id": "ver-mrle0j2s-26",
      "version": 1,
      "previousVersionId": null,
      "tags": [
        "shape:messaging",
        "language:en",
        "audience:external",
        "confidentiality:public",
        "format:talking_points",
        "axis:scale-b2b-tech",
        "axis:ax-core",
        "sources:1",
        "has-spokesperson-notes",
        "guardian-passed",
        "origin:manual"
      ],
      "savedAt": "2026-07-15T01:14:22.228Z"
    },
    {
      "title": "Telefónica completes sale of Chilean subsidiary",
      "shape": "press",
      "language": "en",
      "audience": "external",
      "confidentiality": "public",
      "savedBy": "Diego Fernández",
      "governance": {
        "confidentiality": "public",
        "validity": "approved",
        "owner": "Communications Director"
      },
      "draft": {
        "id": "draft-wbj4vcp",
        "status": "drafted",
        "shape": "press",
        "templateId": "tmpl-press",
        "title": "Telefónica completes sale of Chilean subsidiary",
        "language": "en",
        "audience": "external",
        "confidentiality": "public",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-1wwhv5c",
            "kind": "headline",
            "heading": "Headline",
            "axisId": null,
            "body": "Telefónica completes sale of Chilean subsidiary for enterprise value of 1,240 million euros, strengthening group balance sheet [S2] [S6]",
            "citationIds": [
              "S2",
              "S6"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-4z06gx7",
            "kind": "lead",
            "heading": "Standfirst",
            "axisId": null,
            "body": "Telefónica has completed the disposal of its Chilean subsidiary to a local infrastructure investor for an enterprise value of 1,240 million euros, sharpening the group's focus on its four core markets of Spain, Germany, Brazil and the United Kingdom [S6]. The transaction proceeds are being applied to strengthen the balance sheet in line with the group's stated financial priorities [S3].",
            "citationIds": [
              "S6",
              "S3"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-i4kl7vr",
            "kind": "body",
            "heading": "Transaction detail and strategic rationale",
            "axisId": null,
            "body": "MADRID, 20 July 2026 — Telefónica has agreed to sell its Chilean subsidiary to a local infrastructure investor for an enterprise value of 1,240 million euros [S2]. The completion of the transaction, which took effect on 10 February 2026, marked the most significant step so far in the reduction of the group's Spanish America footprint [S3]. Chile is no longer consolidated in the group's operating figures from that date [S3].\n\nThe disposal forms part of Telefónica's disciplined approach to portfolio management in Spanish America. The transaction proceeds are being applied in line with the group's stated priority of strengthening the balance sheet and support continued investment in fibre, 5G and Telefónica Tech across the core markets [S4]. The transaction concerns Spanish America only; Brazil, operated under the Vivo brand, remains a core market and is unaffected by this divestment programme [S4].\n\nKey points from the transaction:\n\n- Enterprise value of 1,240 million euros agreed with a local infrastructure investor [S2]\n- Chile is no longer consolidated in group operating figures following completion on 10 February 2026 [S3]\n- Transaction is consistent with the group's focus on its four core markets: Spain, Germany, Brazil and the United Kingdom [S2] [S6]\n- Proceeds applied to balance sheet strengthening in line with stated group priorities [S3] [S4]\n- The group's deleveraging path has been reiterated by management, with the balance sheet confirmed as remaining within its target range [S5]\n- Free cash flow generation in the quarter supported both the dividend commitment and continued network investment [S5]\n- Strong commitments have been secured to customers and employees under the new owner [S1]",
            "citationIds": [
              "S2",
              "S3",
              "S4",
              "S6",
              "S5",
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-z50gkq4",
            "kind": "quote",
            "heading": "Executive quote",
            "axisId": null,
            "body": "\"The agreement strengthens our balance sheet and sharpens our focus on the markets where we can lead.\" — Group Communications, on the Chile transaction [S1]",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-ebyd0a9",
            "kind": "boilerplate",
            "heading": "About Telefónica",
            "axisId": null,
            "body": "Telefónica is one of the largest telecommunications companies in the world by number of customers, with a presence in Europe and Latin America. It provides connectivity and digital services to consumers and businesses.",
            "citationIds": [],
            "internalOnly": false
          },
          {
            "id": "sec-gp0l1ec",
            "kind": "qa",
            "heading": "Q&A",
            "axisId": null,
            "body": "Q: What was the agreed enterprise value for the sale of Telefónica Chile?\nA: The agreed enterprise value for the sale of Telefónica's Chilean subsidiary was 1,240 million euros [S2].\n\nQ: Who is the buyer of Telefónica Chile?\nA: The buyer is described as a local infrastructure investor. No further identification of the buyer is covered by approved material available for this release [S2].\n\nQ: When did the transaction complete?\nA: The sale completed on 10 February 2026 [S3] [S6]. Chile ceased to be consolidated in the group's operating figures from that date [S3].\n\nQ: Why is Telefónica selling its Chilean operation?\nA: The disposal is part of Telefónica's disciplined reduction of its Spanish America footprint. The proceeds strengthen the balance sheet and support continued investment in fibre, 5G and Telefónica Tech across the group's core markets [S4].\n\nQ: Does this transaction affect Telefónica's operations in Brazil?\nA: No. The transaction concerns Spanish America only. Brazil, operated under the Vivo brand, remains a core market and is unaffected by this divestment programme [S4].\n\nQ: What are Telefónica's four core markets?\nA: Telefónica's four core markets are Spain, Germany, Brazil and the United Kingdom [S2] [S6].\n\nQ: How does this transaction affect Telefónica's balance sheet and deleveraging path?\nA: The transaction proceeds are being applied in line with the group's stated priority of strengthening the balance sheet [S3]. Management has reiterated its deleveraging path and confirmed that the balance sheet remains within its target range, benefiting from disciplined capital allocation and the proceeds of the completed Chile disposal [S5].\n\nQ: What commitments have been made to Chilean customers and employees?\nA: Strong commitments to customers and employees under the new owner have been secured [S1]. Further detail on the specific nature of those commitments is not covered by approved material available for this release.\n\nQ: What is the broader context of Telefónica's Spanish America strategy?\nA: The sale of the Chilean operation represents the most significant step so far in the reduction of the group's Spanish America footprint [S3]. The transaction is consistent with the group's focus on its four core markets and its disciplined approach to capital allocation [S2] [S4].",
            "citationIds": [
              "S1",
              "S2",
              "S3",
              "S6",
              "S4",
              "S5"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-3b5cxyn",
            "kind": "contact",
            "heading": "Press contact",
            "axisId": null,
            "body": "Telefónica Group Communications — press.office@telefonica.com · +34 91 482 38 00 · telefonica.com/press",
            "citationIds": [],
            "internalOnly": false
          }
        ],
        "spokesperson": [
          {
            "question": "What is the headline figure journalists are likely to lead with?",
            "guidance": "The enterprise value of 1,240 million euros is the primary figure you should be ready to confirm. It is governed and cited in the approved sources. Do not offer any other financial figures beyond those in approved material.",
            "doNotSay": null
          },
          {
            "question": "Will journalists ask who the buyer is?",
            "guidance": "Approved material describes the buyer only as 'a local infrastructure investor'. Do not name or speculate about the buyer's identity beyond this description. If pressed, confirm that further detail on the buyer is not something Telefónica is disclosing at this stage.",
            "doNotSay": "Do not name or imply the identity of the buyer."
          },
          {
            "question": "How should you handle questions about the impact on employees in Chile?",
            "guidance": "You can confirm that strong commitments to customers and employees under the new owner have been secured, as stated in approved material. Do not go further than this; detailed terms of any employment commitments are not covered by approved material.",
            "doNotSay": "Do not speculate on redundancy numbers, severance arrangements or any specific employment terms not covered by approved sources."
          },
          {
            "question": "Will journalists ask whether more Spanish America disposals are planned?",
            "guidance": "You can note that the disposal is part of a disciplined reduction of the group's Spanish America footprint and that the group's focus is on its four core markets. Do not confirm, deny or hint at specific future transactions; no approved material supports further detail on upcoming disposals.",
            "doNotSay": "Do not name any specific country or subsidiary as a future disposal candidate."
          },
          {
            "question": "What if journalists ask about the impact on group financials or the dividend?",
            "guidance": "You can confirm that free cash flow generation in the quarter supported both the dividend commitment and continued network investment, and that management has reiterated its deleveraging path with the balance sheet remaining within its target range. Do not quote specific leverage ratios or dividend figures that are not covered by approved sources.",
            "doNotSay": "Do not quote leverage ratios, specific dividend yield figures or any financial metrics not present in approved sources."
          }
        ],
        "charts": [],
        "tables": [],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-chile-sale",
            "docTitle": "Sale of Chilean Subsidiary — Announcement",
            "sourceLoc": "Chile Sale Announcement › Quote",
            "version": "Q1 2026",
            "owner": "Group Communications",
            "validUntil": "2026-12-31",
            "confidence": 0.98,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "The agreement strengthens our balance sheet and sharpens our focus on the markets where we can lead. Chile has a talented team and we have secured strong commitments to customers and employees under the new owner.",
            "value": "1,240 €M",
            "country": "Chile",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S2",
            "docId": "doc-chile-sale",
            "docTitle": "Sale of Chilean Subsidiary — Announcement",
            "sourceLoc": "Chile Sale Announcement › Transaction",
            "version": "Q1 2026",
            "owner": "Group Communications",
            "validUntil": "2026-12-31",
            "confidence": 0.88,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Telefónica has agreed to sell its Chilean subsidiary to a local infrastructure investor for an enterprise value of 1,240 million euros. The transaction is consistent with the group's focus on its four core markets.",
            "value": null,
            "country": "Chile",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S3",
            "docId": "doc-hispam-exit",
            "docTitle": "Hispam Footprint — Spanish America Exit Update",
            "sourceLoc": "Hispam Exit Update › Transactions › Chile",
            "version": "Q1 2026",
            "owner": "Corporate Development",
            "validUntil": "2026-12-31",
            "confidence": 0.82,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "The sale of Telefónica's Chile operation completed on 10 February 2026, marking the most significant step so far in the reduction of the group's Spanish America footprint. The transaction proceeds are being applied in line with the group's stated priority of strengthening the balance sheet. Chile is no longer consolidated in the group's operating figures from that date.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S4",
            "docId": "doc-chile-sale",
            "docTitle": "Sale of Chilean Subsidiary — Announcement",
            "sourceLoc": "Chile Sale Announcement › Body › Rationale",
            "version": "Q1 2026",
            "owner": "Group Communications",
            "validUntil": "2026-12-31",
            "confidence": 0.82,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "The disposal is part of Telefónica's disciplined reduction of its Spanish America footprint. Proceeds strengthen the balance sheet and support continued investment in fibre, 5G and Telefónica Tech across the core markets. The transaction concerns Spanish America only; Brazil, operated under the Vivo brand, remains a core market and is unaffected by this divestment programme.",
            "value": null,
            "country": "Chile",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S5",
            "docId": "doc-q1-2026-results",
            "docTitle": "Q1 2026 Results — Financial Highlights",
            "sourceLoc": "Q1 2026 Results › Financial highlights › slide 10",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.79,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Free cash flow generation in the quarter supported both the dividend commitment and continued network investment. Management reiterated its deleveraging path and confirmed that the balance sheet remains within its target range, benefiting from disciplined capital allocation and the proceeds of the completed Chile disposal.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S6",
            "docId": "doc-chile-sale",
            "docTitle": "Sale of Chilean Subsidiary — Announcement",
            "sourceLoc": "Chile Sale Announcement › Body › Lead paragraph",
            "version": "Q1 2026",
            "owner": "Group Communications",
            "validUntil": "2026-12-31",
            "confidence": 0.78,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "MADRID, 10 February 2026 — Telefónica today confirmed the completion of the sale of its Chilean subsidiary to a local infrastructure investor for an enterprise value of 1,240 million euros. The completion follows the agreement announced earlier in the quarter and marks a further step in the group's focus on its four core markets of Spain, Germany, Brazil and the United Kingdom.",
            "value": null,
            "country": "Chile",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          },
          {
            "id": "disc-no-offer",
            "name": "No offer",
            "text": "This document is for information only and does not constitute an offer or solicitation to buy or sell any securities."
          }
        ],
        "qaNotes": [
          {
            "question": "What was the agreed enterprise value for the sale of Telefónica Chile?",
            "note": "INTERNAL NOTE: if pressed on buyer identity, defer to the disclosure calendar."
          }
        ],
        "axisIds": [
          "ax-core",
          "ax-b2b"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "createdAt": "2026-07-15T01:29:52.887Z",
        "params": {
          "shape": "press",
          "topic": "Chile transaction: agreement to sell Telefonica Chile, balance sheet focus",
          "roleId": "role-director",
          "audience": "external",
          "language": "en",
          "confidentiality": "public",
          "format": "press_release",
          "axisIds": [],
          "spokesperson": "Group Communications",
          "eventDate": "2026-07-20"
        },
        "origin": "manual",
        "reviewItemId": null,
        "approved": false,
        "askSignals": null
      },
      "id": "ver-mrlelw67-29",
      "version": 1,
      "previousVersionId": null,
      "tags": [
        "shape:press",
        "language:en",
        "audience:external",
        "confidentiality:public",
        "format:press_release",
        "axis:ax-core",
        "axis:ax-b2b",
        "sources:6",
        "has-spokesperson-notes",
        "guardian-passed",
        "origin:manual"
      ],
      "savedAt": "2026-07-15T01:30:58.975Z"
    },
    {
      "title": "Q1 2026 results summary for leadership: revenue, fibre and 5G — internal briefing pack",
      "shape": "multiformat",
      "language": "en",
      "audience": "internal",
      "confidentiality": "private",
      "savedBy": "Diego Fernández",
      "governance": {
        "confidentiality": "private",
        "validity": "approved",
        "owner": "Communications Director"
      },
      "draft": {
        "id": "draft-ygx7f0l",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-multiformat",
        "title": "Q1 2026 results summary for leadership: revenue, fibre and 5G — internal briefing pack",
        "language": "en",
        "audience": "internal",
        "confidentiality": "private",
        "umbrella": "In Q1 2026, Telefónica delivered steady group revenue of €8,127 million and an adjusted EBITDA margin of 32.1%, underpinned by continued fibre and 5G network expansion and positive convergence momentum across core markets [S2].",
        "exclusions": [
          {
            "reason": "destination",
            "docTitle": "Telefónica Tech — B2B Growth Strategy",
            "confidentiality": "confidential",
            "note": "\"Telefónica Tech — B2B Growth Strategy\" (confidential) was excluded: it is above the destination confidentiality (\"private\")."
          },
          {
            "reason": "destination",
            "docTitle": "Transform & Grow — Strategic Plan 2026-2028",
            "confidentiality": "confidential",
            "note": "\"Transform & Grow — Strategic Plan 2026-2028\" (confidential) was excluded: it is above the destination confidentiality (\"private\")."
          }
        ],
        "sections": [
          {
            "id": "sec-2xfn5bs",
            "kind": "summary",
            "heading": "Executive summary",
            "axisId": null,
            "body": "Q1 2026 results confirm that the group is moving broadly in line with the Transform & Grow plan [S1]. Group revenue stood at €8,127 million, with an adjusted EBITDA margin of 32.1% [S2]. Net financial debt was €26,140 million at the end of the quarter [S2].\n\nThree themes define the quarter:\n\n- **Network progress:** The group reached 68.4 million fibre premises passed, while 5G standalone coverage continued to expand across core markets and legacy copper retirement in Spain advanced to plan [S2].\n- **Convergence and commercial momentum:** Fibre-led households show materially lower churn than copper-based lines, reinforcing the strategic logic of leading with network quality [S2]. Convergence momentum in the core markets and double-digit growth at Telefónica Tech were highlighted at the Spring 2026 Town Hall [S1].\n- **Responsible growth:** Net zero by 2040 remains the group commitment, with Q1 2026 progress on the trajectory disclosed in the 2025 Sustainability Report and decarbonisation milestones linked to executive remuneration [S4].\n\nLooking ahead, second-quarter 2026 results are scheduled for 24 July 2026, and the Capital Markets Day is set for 15 October 2026, where further detail on core-market convergence and the multi-year trajectory will be provided [S5].",
            "citationIds": [
              "S1",
              "S2",
              "S4",
              "S5"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-k4xkqxa",
            "kind": "body",
            "heading": "Revenue trajectory",
            "axisId": "revenue-trajectory",
            "body": "Group revenue for Q1 2026 was €8,127 million, with an adjusted EBITDA margin of 32.1% [S2]. These are the externally defensible figures published by Investor Relations, and any financial questions from employees or external contacts should be routed through the approved channels [S1].\n\nDouble-digit growth at Telefónica Tech was cited by leadership at the Spring 2026 Town Hall as a contributor to the group's overall commercial progress, sitting alongside convergence momentum in the core markets [S1]. Net financial debt closed the quarter at €26,140 million [S2].\n\nThe next scheduled opportunity for Investor Relations to update the market in full is the Q2 2026 results publication on 24 July 2026, followed by the Capital Markets Day on 15 October 2026 [S5]. Both events will address the multi-year Transform & Grow trajectory [S5].\n\n*Note: No additional granular revenue breakdown by market or business unit is available in the sources provided for this briefing. Teams requiring further detail should contact Investor Relations directly.*",
            "citationIds": [
              "S2",
              "S1",
              "S5"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-hvvjjtx",
            "kind": "body",
            "heading": "Fibre progress",
            "axisId": "fibre-progress",
            "body": "The group reached 68.4 million fibre premises passed in Q1 2026, a milestone that had been signalled as an ambition at the close of 2025 and was confirmed with the Q1 results [S2] [S3]. Legacy copper retirement in Spain continued to plan through Q4 2025 and into Q1 2026 [S2] [S3].\n\nManagement's strategic framing is clear: network quality is the foundation for convergence, not simply a capital expenditure line [S2]. Evidence supports this view — fibre-led households show materially lower churn than copper-based lines, which has direct implications for long-term revenue stability [S2].\n\nIn Spain specifically, Movistar holds a confirmed broadband leadership position at 35.1% according to the CNMC [S6]. The fibre-guarantee USP remains in legal review and must not be used in any external communications until clearance is confirmed [S6].\n\nThe continued build-out positions the group well for the convergence propositions that will be a central topic at the October 2026 Capital Markets Day [S5].",
            "citationIds": [
              "S2",
              "S3",
              "S6",
              "S5"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-csf4xyf",
            "kind": "body",
            "heading": "5G progress",
            "axisId": "5g-progress",
            "body": "The group continued to expand 5G standalone coverage across its core markets in Q1 2026, running in parallel with the fibre build and the copper retirement programme in Spain [S2]. Leadership positioned this dual investment — fibre and 5G — as the network foundation on which convergence offers are built [S2] [S1].\n\nThe Transform & Grow plan frames continued network investment as central to sustaining convergence momentum, and the Spring 2026 Town Hall confirmed that this remains a live strategic priority [S1].\n\n*Note: Specific 5G coverage percentages, standalone deployment timelines by market, or spectrum positions are not available in the sources provided for this briefing. Communications teams requiring these details for external use should work with the Networks and Investor Relations teams to identify governed, approved figures before publication.*",
            "citationIds": [
              "S2",
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-255ytu8",
            "kind": "body",
            "heading": "Responsible growth",
            "axisId": "responsible-growth",
            "body": "Responsible growth continues to be integrated into how the group allocates capital and structures executive accountability [S4]. Chief Sustainability Officer Marta Ibáñez confirmed that Q1 2026 progress on the net zero by 2040 commitment remains on the trajectory set out in the 2025 Sustainability Report [S4].\n\nKey points for leadership messaging:\n\n- The net zero target date is 2040 [S4].\n- A portion of executive remuneration is linked to decarbonisation milestones, reinforcing that this is a governed business commitment rather than a reputational posture [S4].\n- Responsible growth targets are integrated into capital-allocation decisions at group level [S4].\n\nExternal sentiment across monitored channels held at 68% positive or neutral in Week 27 2026, suggesting the group's public positioning is broadly stable [S6]. This figure is drawn from the SSoT Weekly Executive Brief and should be treated as an internal indicator rather than a publishable statistic.",
            "citationIds": [
              "S4",
              "S2040",
              "S6"
            ],
            "internalOnly": false
          }
        ],
        "spokesperson": [],
        "charts": [
          {
            "id": "chart-0iwrf7r",
            "title": "Group revenue trend",
            "type": "line",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "points": [
              {
                "label": "Q2 2025",
                "value": 7910
              },
              {
                "label": "Q3 2025",
                "value": 7955
              },
              {
                "label": "Q4 2025",
                "value": 7982
              },
              {
                "label": "Q1 2026",
                "value": 8127
              }
            ]
          },
          {
            "id": "chart-xuqtc8l",
            "title": "Total accesses",
            "type": "bar",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "points": [
              {
                "label": "Spain",
                "value": 38.2
              },
              {
                "label": "Germany",
                "value": 45.1
              },
              {
                "label": "Brazil",
                "value": 116.4
              },
              {
                "label": "United Kingdom",
                "value": 41.7
              }
            ]
          }
        ],
        "tables": [
          {
            "id": "table-ofwqgnd",
            "title": "Group revenue trend",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "columns": [
              "Period",
              "Value (€M)"
            ],
            "rows": [
              [
                "Q2 2025",
                "7910"
              ],
              [
                "Q3 2025",
                "7955"
              ],
              [
                "Q4 2025",
                "7982"
              ],
              [
                "Q1 2026",
                "8127"
              ]
            ]
          },
          {
            "id": "table-tbcy5qk",
            "title": "Total accesses",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "columns": [
              "Period",
              "Value (million)"
            ],
            "rows": [
              [
                "Spain",
                "38.2"
              ],
              [
                "Germany",
                "45.1"
              ],
              [
                "Brazil",
                "116.4"
              ],
              [
                "United Kingdom",
                "41.7"
              ]
            ]
          }
        ],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-townhall-2026",
            "docTitle": "Employee Town Hall — Spring 2026",
            "sourceLoc": "Town Hall Spring 2026 › Strategy › slide 3",
            "version": "Q1 2026",
            "owner": "Internal Communications",
            "validUntil": "2026-04-01",
            "confidence": 0.98,
            "confidentiality": "private",
            "validity": "historic",
            "snippet": "Leadership summarised progress against the Transform & Grow plan: convergence momentum in the core markets, double-digit growth at Telefónica Tech, and continued fibre and 5G investment. Cortés reminded teams that the externally defensible group revenue figure for the quarter is the one Investor Relations publishes, and asked everyone to route financial questions through the approved channels.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-digital"
            ]
          },
          {
            "id": "S2",
            "docId": "doc-q1-2026-results",
            "docTitle": "Q1 2026 Results — Financial Highlights",
            "sourceLoc": "Q1 2026 Results › Networks › slide 13",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.96,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "With 68.4 million fibre premises passed, the group continued to expand 5G standalone coverage across the core markets while retiring legacy copper in Spain. Management positioned network quality as the foundation for convergence, noting that fibre-led households show materially lower churn than copper-based lines.",
            "value": "8,127 €M",
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S3",
            "docId": "doc-q4-2025-results",
            "docTitle": "Q4 2025 Results — Financial Highlights",
            "sourceLoc": "Q4 2025 Results › Networks › slide 10",
            "version": "Q4 2025",
            "owner": "Investor Relations",
            "validUntil": "2026-02-20",
            "confidence": 0.94,
            "confidentiality": "public",
            "validity": "superseded",
            "snippet": "The group reiterated its fibre leadership across the core markets at the close of 2025, ahead of the 68.4M premises-passed milestone later confirmed with the Q1 2026 results. Legacy copper retirement in Spain continued to plan through the fourth quarter.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S4",
            "docId": "doc-q1-2026-ir-factsheet",
            "docTitle": "Q1 2026 Investor Relations Factsheet",
            "sourceLoc": "Q1 2026 IR Factsheet › 7. Responsible growth › 7.1 Net zero",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.92,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Telefónica maintains its commitment to net zero by 2040. Chief Sustainability Officer Marta Ibáñez confirmed that Q1 2026 progress remains on the trajectory disclosed in the 2025 Sustainability Report. Responsible growth targets are integrated into capital-allocation decisions, and the group continues to link a portion of executive remuneration to decarbonisation milestones.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S5",
            "docId": "doc-q1-2026-results",
            "docTitle": "Q1 2026 Results — Financial Highlights",
            "sourceLoc": "Q1 2026 Results › Outlook › slide 17",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.88,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Investor Relations flagged the key upcoming dates: second-quarter 2026 results will be published on 24 July 2026, and the Capital Markets Day is scheduled for 15 October 2026. Both events will provide further detail on core-market convergence and the multi-year Transform & Grow trajectory.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S6",
            "docId": "doc-ssot-weekly-brief-w27",
            "docTitle": "SSoT Weekly Executive Brief — Week 27 2026",
            "sourceLoc": "SSoT Weekly Brief W27 › Summary",
            "version": "Q3 2026",
            "owner": "Hub SSoT",
            "validUntil": "2026-07-14",
            "confidence": 0.87,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "Week 27 summary, generated by the Hub from governed sources: external sentiment held at 68% positive or neutral; the CNMC confirmed Movistar's broadband leadership at 35.1%; and the fibre-guarantee USP remains in legal review and must not be used externally. Every statement in this brief traces to a cited governed document.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "qaNotes": [],
        "axisIds": [
          "revenue-trajectory",
          "fibre-progress",
          "5g-progress",
          "responsible-growth",
          "ax-digital",
          "ax-core",
          "ax-b2b"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": true,
        "historicNote": "This draft draws on sources marked \"historic\" / \"superseded\". Treat the figures as historic and verify against the current release.",
        "createdAt": "2026-07-15T01:37:17.512Z",
        "params": {
          "shape": "multiformat",
          "topic": "Q1 2026 results summary for leadership: revenue trajectory, fibre and 5G progress",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "private",
          "format": "multichannel_pack",
          "axisIds": [],
          "spokesperson": null,
          "eventDate": null
        },
        "origin": "manual",
        "reviewItemId": null,
        "approved": false,
        "askSignals": null
      },
      "id": "ver-mrley3fx-30",
      "version": 1,
      "previousVersionId": null,
      "tags": [
        "shape:multiformat",
        "language:en",
        "audience:internal",
        "confidentiality:private",
        "format:multichannel_pack",
        "axis:revenue-trajectory",
        "axis:fibre-progress",
        "axis:5g-progress",
        "axis:responsible-growth",
        "axis:ax-digital",
        "axis:ax-core",
        "axis:ax-b2b",
        "sources:6",
        "has-charts",
        "historic-sources",
        "guardian-passed",
        "origin:manual"
      ],
      "savedAt": "2026-07-15T01:40:28.269Z"
    },
    {
      "title": "Q1 2026 results and network progress — weekly summary (Week 27)",
      "shape": "multiformat",
      "language": "en",
      "audience": "internal",
      "confidentiality": "private",
      "savedBy": "Diego Fernández",
      "governance": {
        "confidentiality": "private",
        "validity": "approved",
        "owner": "Communications Director"
      },
      "draft": {
        "id": "draft-oo4mkqt",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-multiformat",
        "title": "Q1 2026 results and network progress — weekly summary (Week 27)",
        "language": "en",
        "audience": "internal",
        "confidentiality": "private",
        "umbrella": "Telefónica's Q1 2026 results confirm a solid financial base, with network expansion and convergence progress supporting the strategic direction for the year ahead. [S2][S5]",
        "exclusions": [
          {
            "reason": "destination",
            "docTitle": "New USP Rollout Plan — 'Conexión que entiende' (Confidential)",
            "confidentiality": "confidential",
            "note": "\"New USP Rollout Plan — 'Conexión que entiende' (Confidential)\" (confidential) was excluded: it is above the destination confidentiality (\"private\")."
          }
        ],
        "sections": [
          {
            "id": "sec-vs9vc3m",
            "kind": "summary",
            "heading": "Executive summary",
            "axisId": null,
            "body": "This brief consolidates the key financial, network, customer experience and governance signals from Week 27 2026. Q1 2026 group revenue reached €8,127M, with an adjusted EBITDA margin of 32.1% and net financial debt of €26,140M [S2]. The regulated market showed Movistar holding a 35.1% broadband share as confirmed by the CNMC, and external sentiment held at 68% positive or neutral across monitored channels [S5]. Network progress continued, with 68.4 million fibre premises passed at the group level [S2]. On the governance side, one active data conflict requires immediate attention: a superseded messaging pack carries a top-line figure that disagrees with the published Q1 result and must not be used [S3]. The fibre-guarantee USP remains in legal review and cannot be used in any external channel [S5][S6]. The next fixed external milestone is the Q2 2026 results publication on 24 July 2026 [S1].",
            "citationIds": [
              "S2",
              "S5",
              "S3",
              "S6",
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-h6x2dyn",
            "kind": "body",
            "heading": "Financial performance — Q1 2026",
            "axisId": "financial-performance",
            "body": "Q1 2026 closed with group revenue of €8,127M and an adjusted EBITDA margin of 32.1% [S2]. Net financial debt stood at €26,140M at the end of the quarter [S2].\n\nManagement's positioning links financial resilience to the ongoing network transformation: fibre-led households are showing materially lower churn than copper-based lines, which management presents as evidence that network quality underpins convergence value [S2].\n\n**Governance alert — figures in circulation**\n\nA superseded Q1 messaging pack remains in circulation carrying a top-line figure of €7,982M, which conflicts with the published and governed result of €8,127M [S3]. The published figure is the only one that should be referenced. Any team member who encounters the older pack should flag it to the document owner and stop using it immediately [S3].",
            "citationIds": [
              "S2",
              "S3"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-8sn7ku9",
            "kind": "body",
            "heading": "Network expansion and infrastructure progress",
            "axisId": "network-expansion",
            "body": "The group reached 68.4 million fibre premises passed as of the Q1 2026 reporting period [S2]. 5G standalone coverage continued to expand across core markets, and the retirement of legacy copper infrastructure in Spain is progressing [S2]. Management has positioned network quality explicitly as the foundation for the group's convergence strategy [S2].\n\nTwo network-related items require internal attention this week:\n\n- The rural-fibre press note is still in review, pending sign-off on the underlying network figures. It should not be released externally until that sign-off is confirmed [S1].\n- The fibre-guarantee USP is in legal review and must be kept out of all external channels until clearance is granted [S5][S6].",
            "citationIds": [
              "S2",
              "S1",
              "S5",
              "S6"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-w2gun74",
            "kind": "body",
            "heading": "Customer experience and NPS",
            "axisId": "customer-experience",
            "body": "The current group NPS sits at 42, against a full-year objective of 45 [S4]. The three-point gap defines the near-term focus for the Customer Experience Office.\n\nRecommended actions tracked for the coming weeks are:\n\n- Accelerate the rollout of digital self-service to reduce demand on assisted channels [S4].\n- Reduce the volume of billing-related complaints, which are identified as a material drag on the score [S4].\n- Protect network quality during any planned infrastructure works, given the direct link between network experience and NPS movement [S4].\n\nEach action has a named owner in the CX Office, and progress is reviewed weekly and reflected in the next digest [S4].",
            "citationIds": [
              "S4"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-v58z622",
            "kind": "body",
            "heading": "Market position and competitive context",
            "axisId": "market-and-competitive-context",
            "body": "The CNMC confirmed Movistar's broadband market share at 35.1% in Spain [S5]. External sentiment held at 68% positive or neutral across monitored channels during Week 27 [S5].\n\nThe principal competitive pressure identified this week is MasOrange pricing activity in Spain. The recommended internal line is to maintain a value-and-convergence positioning rather than engage in direct price comparison [S6].\n\nTeams should not deploy the fibre-guarantee USP in response to competitive pressure until legal review is complete [S5][S6].",
            "citationIds": [
              "S5",
              "S6"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-o7ptqax",
            "kind": "body",
            "heading": "Governance, calendar and next steps",
            "axisId": "governance-and-calendar",
            "body": "**Upcoming milestones**\n\n- Q2 2026 results publication: 24 July 2026. The embargo window opens 48 hours prior, meaning preparations and message validation must be complete well ahead of that date [S1].\n- Capital Markets Day: 15 October 2026 [S1].\n- Q2 results briefing pack preparation is a recommended action for this week [S6].\n\n**Message validation**\n\nCarmen Ortiz coordinates final message validation for upcoming publications [S1]. Any team producing external material should ensure sign-off flows through the established process before release.\n\n**Active governance flags**\n\n- The superseded messaging pack carrying the €7,982M Q1 top-line must be withdrawn and replaced with material referencing the governed €8,127M figure [S3].\n- The rural-fibre press note remains on hold pending network-figure sign-off [S1].\n- The fibre-guarantee USP must remain out of external channels pending legal clearance [S5][S6].\n\nEvery statement in this brief traces to a cited governed source [S5].",
            "citationIds": [
              "S48",
              "S1",
              "S6",
              "S3",
              "S5"
            ],
            "internalOnly": false
          }
        ],
        "spokesperson": [],
        "charts": [
          {
            "id": "chart-3tepaeh",
            "title": "Total accesses",
            "type": "bar",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "points": [
              {
                "label": "Spain",
                "value": 38.2
              },
              {
                "label": "Germany",
                "value": 45.1
              },
              {
                "label": "Brazil",
                "value": 116.4
              },
              {
                "label": "United Kingdom",
                "value": 41.7
              }
            ]
          },
          {
            "id": "chart-xzrfc7o",
            "title": "Group revenue trend",
            "type": "line",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "points": [
              {
                "label": "Q2 2025",
                "value": 7910
              },
              {
                "label": "Q3 2025",
                "value": 7955
              },
              {
                "label": "Q4 2025",
                "value": 7982
              },
              {
                "label": "Q1 2026",
                "value": 8127
              }
            ]
          }
        ],
        "tables": [
          {
            "id": "table-eugabrc",
            "title": "Total accesses",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "columns": [
              "Period",
              "Value (million)"
            ],
            "rows": [
              [
                "Spain",
                "38.2"
              ],
              [
                "Germany",
                "45.1"
              ],
              [
                "Brazil",
                "116.4"
              ],
              [
                "United Kingdom",
                "41.7"
              ]
            ]
          },
          {
            "id": "table-keunk69",
            "title": "Group revenue trend",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "columns": [
              "Period",
              "Value (€M)"
            ],
            "rows": [
              [
                "Q2 2025",
                "7910"
              ],
              [
                "Q3 2025",
                "7955"
              ],
              [
                "Q4 2025",
                "7982"
              ],
              [
                "Q1 2026",
                "8127"
              ]
            ]
          }
        ],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-ssot-weekly-brief-w27",
            "docTitle": "SSoT Weekly Executive Brief — Week 27 2026",
            "sourceLoc": "SSoT Weekly Brief W27 › Calendar",
            "version": "Q3 2026",
            "owner": "Hub SSoT",
            "validUntil": "2026-07-14",
            "confidence": 0.98,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "The next fixed milestone is the Q2 2026 results publication on 24 July 2026, with the embargo window opening 48 hours prior; the Capital Markets Day follows on 15 October 2026. Carmen Ortiz coordinates final message validation. The rural-fibre press note remains in review pending network-figure sign-off.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          },
          {
            "id": "S2",
            "docId": "doc-q1-2026-results",
            "docTitle": "Q1 2026 Results — Financial Highlights",
            "sourceLoc": "Q1 2026 Results › Networks › slide 13",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.96,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "With 68.4 million fibre premises passed, the group continued to expand 5G standalone coverage across the core markets while retiring legacy copper in Spain. Management positioned network quality as the foundation for convergence, noting that fibre-led households show materially lower churn than copper-based lines.",
            "value": "8,127 €M",
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S3",
            "docId": "doc-ssot-weekly-brief-w27",
            "docTitle": "SSoT Weekly Executive Brief — Week 27 2026",
            "sourceLoc": "SSoT Weekly Brief W27 › Governance flags",
            "version": "Q3 2026",
            "owner": "Hub SSoT",
            "validUntil": "2026-07-14",
            "confidence": 0.95,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "One live conflict is flagged for awareness: a superseded Q1 messaging pack still carries a €7,982M top-line that disagrees with the published €8,127M Q1 2026 group revenue. The current results figure is the only defensible one. Spokespeople should draw exclusively from approved, current material.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          },
          {
            "id": "S4",
            "docId": "doc-e-kpi-nps-objective",
            "docTitle": "Objective Tracker — Customer Experience NPS (Week 28)",
            "sourceLoc": "Objective Tracker CX NPS › Actions",
            "version": "Q3 2026",
            "owner": "Comms Hub / SSoT",
            "validUntil": "2026-07-27",
            "confidence": 0.95,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "Recommended actions for the coming weeks are to accelerate digital self-service rollout, reduce billing-related complaints and protect network quality during planned works. Each action has a named owner in the CX Office. Progress is reviewed weekly and reflected in the next digest. Actions target the three-point gap between the current 42 and the full-year objective of 45.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          },
          {
            "id": "S5",
            "docId": "doc-ssot-weekly-brief-w27",
            "docTitle": "SSoT Weekly Executive Brief — Week 27 2026",
            "sourceLoc": "SSoT Weekly Brief W27 › Summary",
            "version": "Q3 2026",
            "owner": "Hub SSoT",
            "validUntil": "2026-07-14",
            "confidence": 0.94,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "Week 27 summary, generated by the Hub from governed sources: external sentiment held at 68% positive or neutral; the CNMC confirmed Movistar's broadband leadership at 35.1%; and the fibre-guarantee USP remains in legal review and must not be used externally. Every statement in this brief traces to a cited governed document.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          },
          {
            "id": "S6",
            "docId": "doc-ssot-weekly-brief-w27",
            "docTitle": "SSoT Weekly Executive Brief — Week 27 2026",
            "sourceLoc": "SSoT Weekly Brief W27 › Actions",
            "version": "Q3 2026",
            "owner": "Hub SSoT",
            "validUntil": "2026-07-14",
            "confidence": 0.94,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "Recommended actions this week: keep the fibre-guarantee USP out of external channels until legal clears it, prepare the Q2 results briefing pack, and maintain the value-and-convergence line against MasOrange pricing pressure in Spain. Each recommendation is derived from a cited governed source, not from open-web content.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "qaNotes": [],
        "axisIds": [
          "financial-performance",
          "network-expansion",
          "customer-experience",
          "market-and-competitive-context",
          "governance-and-calendar",
          "ax-core",
          "ax-digital",
          "ax-b2b"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "createdAt": "2026-07-15T01:46:27.834Z",
        "params": {
          "shape": "multiformat",
          "topic": "Weekly summary of Q1 2026 results and network progress",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "private",
          "format": "document",
          "axisIds": [],
          "spokesperson": null,
          "eventDate": null
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrlf6m5f-32",
        "approved": true,
        "askSignals": null
      },
      "id": "ver-mrlf83al-37",
      "version": 1,
      "previousVersionId": null,
      "tags": [
        "shape:multiformat",
        "language:en",
        "audience:internal",
        "confidentiality:private",
        "format:document",
        "axis:financial-performance",
        "axis:network-expansion",
        "axis:customer-experience",
        "axis:market-and-competitive-context",
        "axis:governance-and-calendar",
        "axis:ax-core",
        "axis:ax-digital",
        "axis:ax-b2b",
        "sources:6",
        "has-charts",
        "guardian-passed",
        "origin:scheduled"
      ],
      "savedAt": "2026-07-15T01:48:14.637Z"
    },
    {
      "title": "Comunicación KPI report — quarterly view",
      "shape": "multiformat",
      "language": "en",
      "audience": "internal",
      "confidentiality": "private",
      "savedBy": "Comms Director",
      "governance": {
        "confidentiality": "private",
        "validity": "approved",
        "owner": "Communications Director"
      },
      "draft": {
        "id": "draft-enxk9b2",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-multiformat",
        "title": "Comunicación KPI report — quarterly view",
        "language": "en",
        "audience": "internal",
        "confidentiality": "private",
        "umbrella": "Telefónica's communication performance in the current quarter is broadly positive, with four of seven KPIs on track and clear remediation priorities identified for Net Sentiment Brazil and Brand Consideration Movistar. [S1] [S4]",
        "exclusions": [
          {
            "reason": "clearance",
            "docTitle": null,
            "confidentiality": "off_the_record",
            "note": "A relevant source classified \"off_the_record\" was excluded: it is above your clearance (\"confidential\")."
          },
          {
            "reason": "destination",
            "docTitle": "Transform & Grow — Strategic Plan 2026-2028",
            "confidentiality": "confidential",
            "note": "\"Transform & Grow — Strategic Plan 2026-2028\" (confidential) was excluded: it is above the destination confidentiality (\"private\")."
          },
          {
            "reason": "destination",
            "docTitle": "Dossier ejecutivo de medios — Cobertura y sentimiento Q2 2026",
            "confidentiality": "confidential",
            "note": "\"Dossier ejecutivo de medios — Cobertura y sentimiento Q2 2026\" (confidential) was excluded: it is above the destination confidentiality (\"private\")."
          }
        ],
        "sections": [
          {
            "id": "sec-j5wuogc",
            "kind": "summary",
            "heading": "Executive summary",
            "axisId": null,
            "body": "This report covers seven KPIs tracked by Comunicación for the current quarterly cycle. Of the seven:\n\n- **4 on track:** Share of Voice (Group), Positive Media Coverage (Group), Brand Consistency Score (Group), Campaign Recall 'Mismo sitio' (Spain)\n- **2 at risk:** Brand Consideration Movistar (Spain), Employee Advocacy (Group)\n- **1 off track:** Net Sentiment Brazil\n\nAll KPI figures in this report are drawn from the governed KPI panel, recomputed by the calculation engine for this audience and destination.\n\nThe headline picture is encouraging: the Group's share of voice stands at 32% against a 31% target, and positive media coverage is running at 73% against a 70% target, reflecting a strong underlying media position [S1]. Brazil's sentiment index, however, is in decline and requires immediate attention from the Brazil Communications team. Brand Consideration Movistar is below target but the current trajectory suggests recovery is plausible before quarter-end.\n\nThe two focus areas developed in detail below are **Net Sentiment Brazil** and **Brand Consideration Movistar**, given their strategic weight and the divergent risk profiles they represent.",
            "citationIds": [
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-px1wxvp",
            "kind": "body",
            "heading": "Protect and grow corporate reputation — Net Sentiment Brazil",
            "axisId": "protect-grow-corporate-reputation",
            "body": "**Current position:** Net Sentiment Brazil stands at 6 points against a quarterly target of 20 points — **off track**. According to the governed KPI panel, the current rate of decline points to a quarter-end close of -10 points, a significant deviation from the 20-point target.\n\nThis is the single most urgent KPI across the portfolio. The gap between current performance and target is wide, and the trend is moving in the wrong direction.\n\nContext from the social listening stream helps explain the underlying dynamics. In Q1 2026, 49% of Vivo mentions were positive, 31% neutral, and 20% negative — with the positive share having grown four percentage points on the prior quarter [S4]. That improvement did not, however, fully translate into net sentiment at the levels the target requires, suggesting that negative volume or tone is exerting disproportionate pressure on the index.\n\nTopics that drove share of voice for Vivo in Q1 2026 included the Vivo Total launch, fibre reception, and 5G expansion [S2]. These are reputationally constructive themes, and their continued amplification — combined with proactive management of negative narratives — will be central to any recovery plan.\n\n**Recommended actions for Brazil Communications:**\n- Audit the negative mention cluster to identify whether sentiment pressure is concentrated in a specific topic, channel or time period\n- Assess whether the Vivo Total narrative and 5G expansion coverage [S2] can be accelerated or broadened to shift the positive-to-negative ratio\n- Set a mid-quarter checkpoint to determine whether the trajectory has reversed before considering escalation\n\n**Owner:** Brazil Communications\n**KPI definition:** v1",
            "citationIds": [
              "S4",
              "S2"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-0ftid3t",
            "kind": "body",
            "heading": "Strengthen brand equity and consistency — Brand Consideration Movistar",
            "axisId": "strengthen-brand-equity-consistency",
            "body": "**Current position:** Brand Consideration Movistar is at 43% against a 45% target — **at risk**. The governed KPI panel forecasts a quarter-end close of 48%, which would exceed the target if the current trend holds. The KPI is therefore recoverable, but it requires active stewardship to avoid slipping further.\n\nThe at-risk status sits within a broadly positive picture for brand equity overall. The Brand Consistency Score is at 93% against a 90% target, and Campaign Recall for 'Mismo sitio' is at 58% against a 55% target — both on track and trending upward, according to the governed KPI panel. Employee Advocacy is the second at-risk KPI in this axis, at 57% against a 60% target, though the panel forecasts it reaching 61% by quarter-end.\n\nNo external source in the current digest specifically addresses Movistar brand consideration in Spain for this period. The Spain share of voice figure — 34% in Q2 2026, compared to MasOrange at 26% — indicates a strong media presence [S1] [S3], which is a supportive condition for consideration growth but does not substitute for direct brand tracking evidence.\n\n**Recommended actions for Marca España:**\n- Review whether 'Mismo sitio' campaign messaging is reaching the consideration-stage audience effectively, given the strong recall numbers but the gap in consideration\n- Assess whether media presence [S3] is converting into brand preference signals or remaining at an awareness level\n- Monitor the mid-quarter read closely; the forecast trajectory is positive but the margin is narrow\n\n**Owner:** Marca España\n**KPI definition:** v1",
            "citationIds": [
              "S1",
              "S3"
            ],
            "internalOnly": false
          }
        ],
        "spokesperson": [],
        "charts": [
          {
            "id": "chart-znjxakk",
            "title": "Group social sentiment split",
            "type": "bar",
            "unit": "%",
            "source": "Social listening Group — Cross-market mention digest",
            "citationId": null,
            "points": [
              {
                "label": "Neutral",
                "value": 51
              },
              {
                "label": "Positive",
                "value": 26
              },
              {
                "label": "Negative",
                "value": 23
              }
            ]
          },
          {
            "id": "chart-ph6yhp1",
            "title": "Group revenue trend",
            "type": "line",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": null,
            "points": [
              {
                "label": "Q2 2025",
                "value": 7910
              },
              {
                "label": "Q3 2025",
                "value": 7955
              },
              {
                "label": "Q4 2025",
                "value": 7982
              },
              {
                "label": "Q1 2026",
                "value": 8127
              }
            ]
          }
        ],
        "tables": [
          {
            "id": "table-lk6gxeo",
            "title": "Group social sentiment split",
            "unit": "%",
            "source": "Social listening Group — Cross-market mention digest",
            "citationId": null,
            "columns": [
              "Period",
              "Value (%)"
            ],
            "rows": [
              [
                "Neutral",
                "51"
              ],
              [
                "Positive",
                "26"
              ],
              [
                "Negative",
                "23"
              ]
            ]
          },
          {
            "id": "table-xsuyhnz",
            "title": "Group revenue trend",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": null,
            "columns": [
              "Period",
              "Value (€M)"
            ],
            "rows": [
              [
                "Q2 2025",
                "7910"
              ],
              [
                "Q3 2025",
                "7955"
              ],
              [
                "Q4 2025",
                "7982"
              ],
              [
                "Q1 2026",
                "8127"
              ]
            ]
          }
        ],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-media-coverage-q2-2026",
            "docTitle": "Media Coverage Digest — Q2 2026",
            "sourceLoc": "Media Digest Q2 2026 › Share of voice",
            "version": "Q2 2026",
            "owner": "Media Relations",
            "validUntil": "2026-10-31",
            "confidence": 0.98,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Share of voice across the four core markets was 31% in Q2 2026, ahead of the nearest competitor at 27%. The relevance filter retained 1,240 articles out of 9,700 captured; retained coverage was predominantly factual, centred on the Q1 results and Telefónica Tech growth.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S2",
            "docId": "doc-den-pt-vivo-share-of-voice-2026",
            "docTitle": "Vivo — Share of Voice Q1 2026",
            "sourceLoc": "Share of Voice BR › Temas › Q1 2026",
            "version": "Q1 2026",
            "owner": "Social Media Team",
            "validUntil": "2026-06-30",
            "confidence": 0.98,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Os temas que mais impulsionaram o share of voice da Vivo no Q1 2026 foram o lançamento do Vivo Total, elogios à fibra e a expansão do 5G. Rafael Moreira, CEO da Vivo, foi citado favoravelmente em cobertura sobre rede. Menções irrelevantes são descartadas pelo filtro antes de qualquer análise.",
            "value": null,
            "country": "Brazil",
            "brand": "Vivo",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S3",
            "docId": "doc-media-coverage-q2-2026",
            "docTitle": "Media Coverage Digest — Q2 2026",
            "sourceLoc": "Media Digest Q2 2026 › Share of voice by market",
            "version": "Q2 2026",
            "owner": "Media Relations",
            "validUntil": "2026-10-31",
            "confidence": 0.96,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Group share of voice was 31% across the four core markets in Q2 2026, versus 27% for the nearest competitor.\n| Market | SoV Q2 2026 | Nearest competitor |\n| Spain | 34% | MasOrange 26% |\n| Germany | 28% | Deutsche Telekom 33% |\n| Brazil | 33% | Claro 30% |\n| UK | 26% | Vodafone 28% |",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S4",
            "docId": "doc-den-pt-vivo-share-of-voice-2026",
            "docTitle": "Vivo — Share of Voice Q1 2026",
            "sourceLoc": "Share of Voice BR › Sentimento › Q1 2026",
            "version": "Q1 2026",
            "owner": "Social Media Team",
            "validUntil": "2026-06-30",
            "confidence": 0.92,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "Das menções atribuídas à Vivo no Q1 2026, 49% foram positivas, 31% neutras e 20% negativas. O índice positivo cresceu quatro pontos percentuais frente ao trimestre anterior. Este relatório é público e vem do stream de escuta social.",
            "value": null,
            "country": "Brazil",
            "brand": "Vivo",
            "axisIds": [
              "ax-core"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "qaNotes": [],
        "axisIds": [
          "protect-grow-corporate-reputation",
          "strengthen-brand-equity-consistency",
          "ax-core",
          "ax-b2b"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "createdAt": "2026-07-15T02:05:55.735Z",
        "params": {
          "shape": "multiformat",
          "topic": "KPI report for Comunicación, quarterly view: 7 KPIs tracked, 4 on track, 2 at risk, 1 off track. Focus on Net Sentiment Brazil and Brand Consideration Movistar.",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "private",
          "format": "document",
          "axisIds": [],
          "spokesperson": null,
          "eventDate": null
        },
        "origin": "manual",
        "reviewItemId": null,
        "approved": false,
        "askSignals": null
      },
      "id": "ver-mrlfwuxp-44",
      "version": 1,
      "previousVersionId": null,
      "tags": [
        "shape:multiformat",
        "language:en",
        "audience:internal",
        "confidentiality:private",
        "format:document",
        "axis:protect-grow-corporate-reputation",
        "axis:strengthen-brand-equity-consistency",
        "axis:ax-core",
        "axis:ax-b2b",
        "sources:4",
        "has-charts",
        "guardian-passed",
        "origin:manual"
      ],
      "savedAt": "2026-07-15T02:07:30.205Z"
    },
    {
      "title": "10-day planning forecast — 7 Jul to 17 Jul",
      "shape": "multiformat",
      "language": "en",
      "audience": "internal",
      "confidentiality": "confidential",
      "savedBy": "Comms Director",
      "governance": {
        "confidentiality": "confidential",
        "validity": "approved",
        "owner": "Communications Director"
      },
      "draft": {
        "id": "draft-forecast-mrlgjfdp",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "confidential",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "The window opens with the MWC public keynote recap [S1] already live on 8 July, giving Media Relations an active newsroom asset at the start of the period. The following day, Group Communications runs the confidential crisis simulation drill [S2] on 9 July, rehearsing the network-outage playbook ahead of any live incident scenario. On 11 July, Investor Relations publishes the Q2 pre-close press note [S3], setting holding lines and signalling the start of the quiet period to press contacts.\n\nThe second half of the window carries the heavier publication load. The fibre network press briefing [S4] is scheduled on-the-record for 14 July, covering Movistar's rollout and copper retirement progress in Spain, followed the next day by the Group-level sustainability report launch [S5] on 15 July. Those two activities sit close together and between them span both a media briefing and a major public publication, so it may be worth confirming that resourcing across Media Relations and the Sustainability Office is sufficient to support both in quick succession.\n\nSeveral external timing signals are worth a brief look before the week of the 14th. The fibre briefing [S4] falls on the same day as competitor MoveCorp's Q2 results, and the sustainability report [S5] lands alongside both ClaroNet's fibre launch and those same MoveCorp results on 15 July, which could compress the available media space for both. Earlier in the window, it may also be useful to check whether the crisis simulation drill [S2] and the Q2 pre-close note [S3] place any overlapping demands on communications teams around the MWC follow-up industry summit on 10 July. None of these conflicts appear critical at this stage, but a short alignment check across owners would be prudent before the 14th.",
            "citationIds": [
              "S1",
              "S2",
              "S3",
              "S4",
              "S5"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 1. Detected timing conflicts: 0. Activities or signals flagged as at risk: 6.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "tables": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-mwc-public-recap",
            "docTitle": "MWC public keynote recap",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 8 Jul · Telefónica · Public-facing recap article of the MWC keynote published to the newsroom.",
            "value": null,
            "country": "Spain",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S2",
            "docId": "evt-crisis-drill",
            "docTitle": "Crisis simulation drill",
            "sourceLoc": "Asana · Group",
            "version": "read-only sync",
            "owner": "Group Communications",
            "validUntil": null,
            "confidence": 0.9,
            "confidentiality": "confidential",
            "validity": "approved",
            "snippet": "event · 9 Jul · Telefónica · Confidential tabletop exercise rehearsing the network-outage crisis playbook.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-digital"
            ]
          },
          {
            "id": "S3",
            "docId": "evt-q2-preclose",
            "docTitle": "Q2 pre-close press note",
            "sourceLoc": "Google Calendar · Group",
            "version": "read-only sync",
            "owner": "Investor Relations",
            "validUntil": null,
            "confidence": 0.85,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "publication · 11 Jul · Telefónica · Pre-close quiet-period reminder and holding lines for press enquiries.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S4",
            "docId": "evt-fibre-press-briefing",
            "docTitle": "Fibre network press briefing",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.8,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "event · 14 Jul · Movistar · On-the-record briefing on fibre rollout and copper retirement progress in Spain.",
            "value": null,
            "country": "Spain",
            "brand": "Movistar",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S5",
            "docId": "evt-sustainability-launch",
            "docTitle": "Sustainability report launch",
            "sourceLoc": "Excel · Group",
            "version": "read-only sync",
            "owner": "Sustainability Office",
            "validUntil": null,
            "confidence": 0.75,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 15 Jul · Telefónica · Public launch of the annual sustainability report and net-zero progress update.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-sustainability"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-networks",
          "ax-digital",
          "ax-core",
          "ax-sustainability"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the Comunicación area, generated for Communications Director.",
        "createdAt": "2026-07-15T02:24:52.299Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "confidential",
          "format": "planning-forecast",
          "axisIds": [
            "ax-networks",
            "ax-digital",
            "ax-core",
            "ax-sustainability"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrlgjfdp-49",
        "approved": true
      },
      "id": "ver-mrlgjfeq-52",
      "version": 1,
      "previousVersionId": null,
      "tags": [
        "shape:multiformat",
        "language:en",
        "audience:internal",
        "confidentiality:confidential",
        "format:planning-forecast",
        "axis:ax-networks",
        "axis:ax-digital",
        "axis:ax-core",
        "axis:ax-sustainability",
        "sources:5",
        "guardian-passed",
        "origin:scheduled"
      ],
      "savedAt": "2026-07-15T02:25:03.170Z"
    },
    {
      "title": "10-day planning forecast — 7 Jul to 17 Jul",
      "shape": "multiformat",
      "language": "en",
      "audience": "internal",
      "confidentiality": "confidential",
      "savedBy": "Brand Manager",
      "governance": {
        "confidentiality": "confidential",
        "validity": "approved",
        "owner": "Communications Director"
      },
      "draft": {
        "id": "draft-forecast-mrlgjfdp",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "confidential",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "The window opens with the MWC public keynote recap [S1] already live on 8 July, giving Media Relations an active newsroom asset at the start of the period. The following day, Group Communications runs the confidential crisis simulation drill [S2] on 9 July, rehearsing the network-outage playbook ahead of any live incident scenario. On 11 July, Investor Relations publishes the Q2 pre-close press note [S3], setting holding lines and signalling the start of the quiet period to press contacts.\n\nThe second half of the window carries the heavier publication load. The fibre network press briefing [S4] is scheduled on-the-record for 14 July, covering Movistar's rollout and copper retirement progress in Spain, followed the next day by the Group-level sustainability report launch [S5] on 15 July. Those two activities sit close together and between them span both a media briefing and a major public publication, so it may be worth confirming that resourcing across Media Relations and the Sustainability Office is sufficient to support both in quick succession.\n\nSeveral external timing signals are worth a brief look before the week of the 14th. The fibre briefing [S4] falls on the same day as competitor MoveCorp's Q2 results, and the sustainability report [S5] lands alongside both ClaroNet's fibre launch and those same MoveCorp results on 15 July, which could compress the available media space for both. Earlier in the window, it may also be useful to check whether the crisis simulation drill [S2] and the Q2 pre-close note [S3] place any overlapping demands on communications teams around the MWC follow-up industry summit on 10 July. None of these conflicts appear critical at this stage, but a short alignment check across owners would be prudent before the 14th.",
            "citationIds": [
              "S1",
              "S2",
              "S3",
              "S4",
              "S5"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 1. Detected timing conflicts: 0. Activities or signals flagged as at risk: 6.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "tables": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-mwc-public-recap",
            "docTitle": "MWC public keynote recap",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 8 Jul · Telefónica · Public-facing recap article of the MWC keynote published to the newsroom.",
            "value": null,
            "country": "Spain",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S2",
            "docId": "evt-crisis-drill",
            "docTitle": "Crisis simulation drill",
            "sourceLoc": "Asana · Group",
            "version": "read-only sync",
            "owner": "Group Communications",
            "validUntil": null,
            "confidence": 0.9,
            "confidentiality": "confidential",
            "validity": "approved",
            "snippet": "event · 9 Jul · Telefónica · Confidential tabletop exercise rehearsing the network-outage crisis playbook.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-digital"
            ]
          },
          {
            "id": "S3",
            "docId": "evt-q2-preclose",
            "docTitle": "Q2 pre-close press note",
            "sourceLoc": "Google Calendar · Group",
            "version": "read-only sync",
            "owner": "Investor Relations",
            "validUntil": null,
            "confidence": 0.85,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "publication · 11 Jul · Telefónica · Pre-close quiet-period reminder and holding lines for press enquiries.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S4",
            "docId": "evt-fibre-press-briefing",
            "docTitle": "Fibre network press briefing",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.8,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "event · 14 Jul · Movistar · On-the-record briefing on fibre rollout and copper retirement progress in Spain.",
            "value": null,
            "country": "Spain",
            "brand": "Movistar",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S5",
            "docId": "evt-sustainability-launch",
            "docTitle": "Sustainability report launch",
            "sourceLoc": "Excel · Group",
            "version": "read-only sync",
            "owner": "Sustainability Office",
            "validUntil": null,
            "confidence": 0.75,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 15 Jul · Telefónica · Public launch of the annual sustainability report and net-zero progress update.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-sustainability"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-networks",
          "ax-digital",
          "ax-core",
          "ax-sustainability"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the Comunicación area, generated for Communications Director.",
        "createdAt": "2026-07-15T02:24:52.299Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "confidential",
          "format": "planning-forecast",
          "axisIds": [
            "ax-networks",
            "ax-digital",
            "ax-core",
            "ax-sustainability"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrlgjfdp-49",
        "approved": true
      },
      "id": "ver-mrlo7dme-53",
      "version": 2,
      "previousVersionId": "ver-mrlgjfeq-52",
      "tags": [
        "shape:multiformat",
        "language:en",
        "audience:internal",
        "confidentiality:confidential",
        "format:planning-forecast",
        "axis:ax-networks",
        "axis:ax-digital",
        "axis:ax-core",
        "axis:ax-sustainability",
        "sources:5",
        "guardian-passed",
        "origin:scheduled"
      ],
      "savedAt": "2026-07-15T05:59:37.911Z"
    },
    {
      "title": "10-day planning forecast — 7 Jul to 17 Jul",
      "shape": "multiformat",
      "language": "en",
      "audience": "internal",
      "confidentiality": "confidential",
      "savedBy": "Brand Manager",
      "governance": {
        "confidentiality": "confidential",
        "validity": "approved",
        "owner": "Communications Director"
      },
      "draft": {
        "id": "draft-forecast-mrlgjfdp",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "confidential",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "The window opens with the MWC public keynote recap [S1] already live on 8 July, giving Media Relations an active newsroom asset at the start of the period. The following day, Group Communications runs the confidential crisis simulation drill [S2] on 9 July, rehearsing the network-outage playbook ahead of any live incident scenario. On 11 July, Investor Relations publishes the Q2 pre-close press note [S3], setting holding lines and signalling the start of the quiet period to press contacts.\n\nThe second half of the window carries the heavier publication load. The fibre network press briefing [S4] is scheduled on-the-record for 14 July, covering Movistar's rollout and copper retirement progress in Spain, followed the next day by the Group-level sustainability report launch [S5] on 15 July. Those two activities sit close together and between them span both a media briefing and a major public publication, so it may be worth confirming that resourcing across Media Relations and the Sustainability Office is sufficient to support both in quick succession.\n\nSeveral external timing signals are worth a brief look before the week of the 14th. The fibre briefing [S4] falls on the same day as competitor MoveCorp's Q2 results, and the sustainability report [S5] lands alongside both ClaroNet's fibre launch and those same MoveCorp results on 15 July, which could compress the available media space for both. Earlier in the window, it may also be useful to check whether the crisis simulation drill [S2] and the Q2 pre-close note [S3] place any overlapping demands on communications teams around the MWC follow-up industry summit on 10 July. None of these conflicts appear critical at this stage, but a short alignment check across owners would be prudent before the 14th.",
            "citationIds": [
              "S1",
              "S2",
              "S3",
              "S4",
              "S5"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 1. Detected timing conflicts: 0. Activities or signals flagged as at risk: 6.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "tables": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-mwc-public-recap",
            "docTitle": "MWC public keynote recap",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 8 Jul · Telefónica · Public-facing recap article of the MWC keynote published to the newsroom.",
            "value": null,
            "country": "Spain",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S2",
            "docId": "evt-crisis-drill",
            "docTitle": "Crisis simulation drill",
            "sourceLoc": "Asana · Group",
            "version": "read-only sync",
            "owner": "Group Communications",
            "validUntil": null,
            "confidence": 0.9,
            "confidentiality": "confidential",
            "validity": "approved",
            "snippet": "event · 9 Jul · Telefónica · Confidential tabletop exercise rehearsing the network-outage crisis playbook.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-digital"
            ]
          },
          {
            "id": "S3",
            "docId": "evt-q2-preclose",
            "docTitle": "Q2 pre-close press note",
            "sourceLoc": "Google Calendar · Group",
            "version": "read-only sync",
            "owner": "Investor Relations",
            "validUntil": null,
            "confidence": 0.85,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "publication · 11 Jul · Telefónica · Pre-close quiet-period reminder and holding lines for press enquiries.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S4",
            "docId": "evt-fibre-press-briefing",
            "docTitle": "Fibre network press briefing",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.8,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "event · 14 Jul · Movistar · On-the-record briefing on fibre rollout and copper retirement progress in Spain.",
            "value": null,
            "country": "Spain",
            "brand": "Movistar",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S5",
            "docId": "evt-sustainability-launch",
            "docTitle": "Sustainability report launch",
            "sourceLoc": "Excel · Group",
            "version": "read-only sync",
            "owner": "Sustainability Office",
            "validUntil": null,
            "confidence": 0.75,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 15 Jul · Telefónica · Public launch of the annual sustainability report and net-zero progress update.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-sustainability"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-networks",
          "ax-digital",
          "ax-core",
          "ax-sustainability"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the Comunicación area, generated for Communications Director.",
        "createdAt": "2026-07-15T02:24:52.299Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "confidential",
          "format": "planning-forecast",
          "axisIds": [
            "ax-networks",
            "ax-digital",
            "ax-core",
            "ax-sustainability"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrlgjfdp-49",
        "approved": true
      },
      "id": "ver-mrlpddl9-57",
      "version": 3,
      "previousVersionId": "ver-mrlo7dme-53",
      "tags": [
        "shape:multiformat",
        "language:en",
        "audience:internal",
        "confidentiality:confidential",
        "format:planning-forecast",
        "axis:ax-networks",
        "axis:ax-digital",
        "axis:ax-core",
        "axis:ax-sustainability",
        "sources:5",
        "guardian-passed",
        "origin:scheduled"
      ],
      "savedAt": "2026-07-15T06:32:17.421Z"
    }
  ],
  "schedules": [
    {
      "name": "Weekly results digest",
      "shape": "multiformat",
      "topic": "Weekly summary of Q1 2026 results and network progress",
      "queries": [
        "quarterly results",
        "fibre rollout"
      ],
      "axisIds": [],
      "language": "en",
      "audience": "internal",
      "confidentiality": "private",
      "frequency": "weekly",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "reviewFolder": "Communications Director review",
      "id": "sch-mrlf5smy-31",
      "createdAt": "2026-07-15T01:46:27.514Z",
      "lastRunAt": "2026-07-15T01:47:05.762Z",
      "nextRunAt": "2026-07-22T01:47:05.762Z",
      "timeOfDay": null
    },
    {
      "name": "Tamper proof digest",
      "shape": "multiformat",
      "topic": "Q1 2026 results summary",
      "queries": [
        "quarterly results"
      ],
      "axisIds": [],
      "language": "en",
      "audience": "internal",
      "confidentiality": "private",
      "frequency": "weekly",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "reviewFolder": "Communications Director review",
      "id": "sch-mrlfd4rg-38",
      "createdAt": "2026-07-15T01:52:09.820Z",
      "lastRunAt": "2026-07-15T01:52:53.459Z",
      "nextRunAt": "2026-07-22T01:52:53.459Z",
      "timeOfDay": null
    },
    {
      "name": "Recurring 10-day forecast (weekly)",
      "shape": "planning-forecast",
      "topic": "Comunicación",
      "queries": [],
      "axisIds": [],
      "language": "en",
      "audience": "internal",
      "confidentiality": "internal",
      "frequency": "weekly",
      "ownerRoleId": "role-brand",
      "ownerLabel": "Brand Manager",
      "reviewFolder": "Planning forecasts",
      "id": "sch-mrlp0s8p-54",
      "createdAt": "2026-07-15T06:22:29.881Z",
      "lastRunAt": "2026-07-15T06:22:29.892Z",
      "nextRunAt": "2026-07-22T06:22:29.892Z",
      "timeOfDay": null
    }
  ],
  "reviewInbox": [
    {
      "scheduleId": "planning-forecast",
      "scheduleName": "Planning forecast (10 days)",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-brand",
      "ownerLabel": "Brand Manager",
      "draft": {
        "id": "draft-forecast-mrbgmuf8",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "internal",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "Over the ten-day window from 7 to 17 July, there is one confirmed activity entering the picture. The Movistar summer pricing and loyalty campaign [S1] is scheduled to go live on 16 July, sitting at the very end of this outlook period. Owned by Marca España and currently at planned status, it runs through to 22 July and targets existing Movistar customers in Spain. No other calendar events are recorded for this window.\n\nOn timing, it may be worth a brief check on the proximity of [S1]'s launch date to 15 July, when MoveCorp is expected to release its Q2 results. A competitor earnings announcement the day before the campaign goes live could shift media and analyst attention in ways that affect the visibility or framing of the Movistar summer pricing message. Whether that warrants any adjustment to the 16 July date or to communications sequencing is something the Marca España team would be best placed to assess.\n\nOutside of that proximity note, the period from 7 to 15 July appears clear of recorded activity, which gives a relatively open runway ahead of [S1]. There are no overlapping campaigns or internal conflicts visible within the data provided.",
            "citationIds": [
              "S1"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 0. Detected timing conflicts: 0. Activities or signals flagged as at risk: 1.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-movistar-summer-pricing",
            "docTitle": "Movistar summer pricing launch",
            "sourceLoc": "Asana · Spain",
            "version": "read-only sync",
            "owner": "Marca España",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "internal",
            "validity": "approved",
            "snippet": "campaign · 16 Jul–22 Jul · Movistar · Summer pricing and loyalty campaign for existing Movistar customers in Spain.",
            "value": null,
            "country": "Spain",
            "brand": "Movistar",
            "axisIds": [
              "ax-core"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-core"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Deterministic forecast content over permitted calendar events; no claims outside the governed calendar.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the Marca area, generated for Brand Manager.",
        "createdAt": "2026-07-08T02:29:51.182Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-brand",
          "audience": "internal",
          "language": "en",
          "confidentiality": "internal",
          "format": "planning-forecast",
          "axisIds": [
            "ax-core"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrbgmuf8-6",
        "approved": false
      },
      "id": "rev-mrbgmuf8-6",
      "status": "pending",
      "createdAt": "2026-07-08T02:30:00.836Z",
      "approvedAt": null,
      "approvedHash": null
    },
    {
      "scheduleId": "planning-forecast",
      "scheduleName": "Planning forecast (10 days)",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-brand",
      "ownerLabel": "Brand Manager",
      "draft": {
        "id": "draft-forecast-mrbgn47h",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "internal",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "Between 7 and 16 July the pipeline is quiet, with no live activity in the calendar for this period. The single confirmed initiative entering the window is the Movistar summer pricing and loyalty campaign [S1], owned by Marca España and scheduled to go live on 16 July, running through to 22 July. It sits at planned status in Asana and covers existing Movistar customers in Spain.\n\nOn timing, it may be worth checking the proximity of the [S1] launch date to the MoveCorp Q2 results expected on 15 July. If that results announcement draws significant media or customer attention on the 15th, there is a possibility it could dilute visibility for the [S1] campaign going live the following day. The teams involved may want to consider whether the 16 July date still feels right in that context, or whether any adjustment to messaging sequencing would help.\n\nBeyond that single timing observation, the 10-day window looks straightforward. There are no overlapping owned campaigns and no further conflicts to flag within the calendar as provided.",
            "citationIds": [
              "S1"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 0. Detected timing conflicts: 0. Activities or signals flagged as at risk: 1.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-movistar-summer-pricing",
            "docTitle": "Movistar summer pricing launch",
            "sourceLoc": "Asana · Spain",
            "version": "read-only sync",
            "owner": "Marca España",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "internal",
            "validity": "approved",
            "snippet": "campaign · 16 Jul–22 Jul · Movistar · Summer pricing and loyalty campaign for existing Movistar customers in Spain.",
            "value": null,
            "country": "Spain",
            "brand": "Movistar",
            "axisIds": [
              "ax-core"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-core"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Deterministic forecast content over permitted calendar events; no claims outside the governed calendar.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the Marca area, generated for Brand Manager.",
        "createdAt": "2026-07-08T02:30:06.965Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-brand",
          "audience": "internal",
          "language": "en",
          "confidentiality": "internal",
          "format": "planning-forecast",
          "axisIds": [
            "ax-core"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrbgn47h-8",
        "approved": false
      },
      "id": "rev-mrbgn47h-8",
      "status": "pending",
      "createdAt": "2026-07-08T02:30:13.517Z",
      "approvedAt": null,
      "approvedHash": null
    },
    {
      "scheduleId": "sch-mre53tkp-10",
      "scheduleName": "Recurring 10-day forecast (weekly)",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-press",
      "ownerLabel": "External / Press",
      "draft": {
        "id": "draft-forecast-mre540vm",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "public",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "**10-day outlook: 7 – 17 July**\n\nOne activity is already live in this window. The MWC public keynote recap [S1] published on 8 July and is the immediate focus for Media Relations; any amplification or follow-up engagement with that piece would be timely now, while coverage interest is still fresh.\n\nLooking ahead, the sustainability report launch [S2] is the only other scheduled activity, planned for 15 July under the Sustainability Office. It is worth noting two external timing signals around that date: ClaroNet is expected to announce a fibre launch on 13 July, and MoveCorp is due to publish its Q2 results on the same day as the report, 15 July. Either event could draw significant media and analyst attention, potentially reducing the share of voice available to [S2]. It may be worth the Sustainability Office and Media Relations reviewing whether the 15 July date remains optimal, or whether a modest shift in either direction would give the report cleaner air.\n\nBeyond those two points, the calendar holds no further confirmed activities in this window. The gap between [S1] and [S2] is relatively long, which may be an opportunity to plan interim content, though nothing is currently scheduled and no assumptions have been made here about what that might involve.",
            "citationIds": [
              "S1",
              "S2"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 1. Detected timing conflicts: 0. Activities or signals flagged as at risk: 2.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-mwc-public-recap",
            "docTitle": "MWC public keynote recap",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 8 Jul · Telefónica · Public-facing recap article of the MWC keynote published to the newsroom.",
            "value": null,
            "country": "Spain",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S2",
            "docId": "evt-sustainability-launch",
            "docTitle": "Sustainability report launch",
            "sourceLoc": "Excel · Group",
            "version": "read-only sync",
            "owner": "Sustainability Office",
            "validUntil": null,
            "confidence": 0.9,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 15 Jul · Telefónica · Public launch of the annual sustainability report and net-zero progress update.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-sustainability"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-networks",
          "ax-sustainability"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Deterministic forecast content over permitted calendar events; no claims outside the governed calendar.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the communication area, generated for External / Press.",
        "createdAt": "2026-07-09T23:30:36.027Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-press",
          "audience": "internal",
          "language": "en",
          "confidentiality": "public",
          "format": "planning-forecast",
          "axisIds": [
            "ax-networks",
            "ax-sustainability"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mre540vm-11",
        "approved": false
      },
      "id": "rev-mre540vm-11",
      "status": "pending",
      "createdAt": "2026-07-09T23:30:45.490Z",
      "approvedAt": null,
      "approvedHash": null
    },
    {
      "scheduleId": "sch-mre54feq-13",
      "scheduleName": "Recurring 10-day forecast (weekly)",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "draft": {
        "id": "draft-forecast-mre54nlo",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "confidential",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "The window opens with one item already live: the MWC public keynote recap [S1] published on 8 July by Media Relations. The following day, Group Communications runs the confidential crisis simulation drill [S2] on 9 July, rehearsing the network-outage playbook. It may be worth checking how that internal exercise sits alongside the external MWC follow-up industry summit on 10 July, to ensure the two do not draw on the same people or attention simultaneously. On 11 July, Investor Relations publishes the Q2 pre-close press note [S3], issuing quiet-period guidance and holding lines for press; given its proximity to both the 10 July industry summit and the ClaroNet fibre launch expected on 13 July, it may be worth confirming the release timing allows sufficient clear air on either side.\n\nThe second half of the period carries three activities in close succession. The Movistar fibre network press briefing [S4] is scheduled on 14 July, one day before competitor MoveCorp is expected to publish its Q2 results on 15 July; it may be worth considering whether that briefing date still provides the right conditions for the fibre and copper retirement story to land without being overshadowed. On 15 July, the Sustainability Office publishes the annual sustainability report and net-zero update [S5], which sits alongside both the MoveCorp Q2 results and the earlier ClaroNet fibre launch on 13 July; teams may wish to review whether the report has adequate space to attract its own coverage.\n\nOverall, the period is well-structured with a clear editorial logic moving from external narrative (MWC recap) through internal resilience (crisis drill) into financial and infrastructure communications, and closing on the sustainability agenda. The main area to keep an eye on is the 13-to-15 July cluster, where two planned Telefónica activities [S4, S5] coincide with two competitor moments, and sequencing between them may benefit from a brief cross-team check.",
            "citationIds": [
              "S1",
              "S2",
              "S3",
              "S4",
              "S5"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 1. Detected timing conflicts: 0. Activities or signals flagged as at risk: 6.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-mwc-public-recap",
            "docTitle": "MWC public keynote recap",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 8 Jul · Telefónica · Public-facing recap article of the MWC keynote published to the newsroom.",
            "value": null,
            "country": "Spain",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S2",
            "docId": "evt-crisis-drill",
            "docTitle": "Crisis simulation drill",
            "sourceLoc": "Asana · Group",
            "version": "read-only sync",
            "owner": "Group Communications",
            "validUntil": null,
            "confidence": 0.9,
            "confidentiality": "confidential",
            "validity": "approved",
            "snippet": "event · 9 Jul · Telefónica · Confidential tabletop exercise rehearsing the network-outage crisis playbook.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-digital"
            ]
          },
          {
            "id": "S3",
            "docId": "evt-q2-preclose",
            "docTitle": "Q2 pre-close press note",
            "sourceLoc": "Google Calendar · Group",
            "version": "read-only sync",
            "owner": "Investor Relations",
            "validUntil": null,
            "confidence": 0.85,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "publication · 11 Jul · Telefónica · Pre-close quiet-period reminder and holding lines for press enquiries.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S4",
            "docId": "evt-fibre-press-briefing",
            "docTitle": "Fibre network press briefing",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.8,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "event · 14 Jul · Movistar · On-the-record briefing on fibre rollout and copper retirement progress in Spain.",
            "value": null,
            "country": "Spain",
            "brand": "Movistar",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S5",
            "docId": "evt-sustainability-launch",
            "docTitle": "Sustainability report launch",
            "sourceLoc": "Excel · Group",
            "version": "read-only sync",
            "owner": "Sustainability Office",
            "validUntil": null,
            "confidence": 0.75,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 15 Jul · Telefónica · Public launch of the annual sustainability report and net-zero progress update.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-sustainability"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-networks",
          "ax-digital",
          "ax-core",
          "ax-sustainability"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Deterministic forecast content over permitted calendar events; no claims outside the governed calendar.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the communication area, generated for Communications Director.",
        "createdAt": "2026-07-09T23:31:04.324Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "confidential",
          "format": "planning-forecast",
          "axisIds": [
            "ax-networks",
            "ax-digital",
            "ax-core",
            "ax-sustainability"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mre54nlo-14",
        "approved": false
      },
      "id": "rev-mre54nlo-14",
      "status": "pending",
      "createdAt": "2026-07-09T23:31:14.940Z",
      "approvedAt": null,
      "approvedHash": null
    },
    {
      "scheduleId": "sch-mre58pbj-16",
      "scheduleName": "Recurring 10-day forecast (weekly)",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "draft": {
        "id": "draft-forecast-mre58pbk",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "confidential",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "The window opens with the MWC public keynote recap [S1] already live on 8 July, giving the newsroom an active public-facing asset at the start of the period. The following day, Group Communications runs the confidential crisis simulation drill [S2] on 9 July, rehearsing the network-outage playbook internally. It may be worth checking whether that drill creates any scheduling pressure alongside the MWC follow-up industry summit on 10 July, as both fall in close succession and could draw on the same team capacity. The Q2 pre-close press note [S3], due on 11 July, also sits just after that summit, so it may be sensible to confirm that holding lines and quiet-period messaging are finalised ahead of time and are not competing for attention with external industry noise on the 10th.\n\nThe middle stretch of the window carries two external timing considerations worth keeping in mind. The fibre network press briefing [S4], scheduled on 14 July, lands the day before Competitor MoveCorp's Q2 results on 15 July; teams may wish to consider whether the briefing's coverage could be absorbed or partially overshadowed by that competitor moment. Separately, the Q2 pre-close press note [S3] on 11 July sits relatively close to the ClaroNet fibre launch on 13 July, which could draw press attention in the infrastructure space around the same time.\n\nThe period closes with the sustainability report launch [S5] on 15 July, which coincides with both the ClaroNet fibre launch on 13 July and Competitor MoveCorp's Q2 results on the same day. Given that both external events could generate significant media activity, it may be worth Sustainability Office and Media Relations checking whether the launch date offers sufficient clear air, or whether any pre-briefing arrangements could help secure coverage ahead of that noise. Overall the schedule is well sequenced, and the main suggestion is to keep an eye on the cluster of activity between 13 and 15 July.",
            "citationIds": [
              "S1",
              "S2",
              "S3",
              "S4",
              "S5"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 1. Detected timing conflicts: 0. Activities or signals flagged as at risk: 6.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-mwc-public-recap",
            "docTitle": "MWC public keynote recap",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 8 Jul · Telefónica · Public-facing recap article of the MWC keynote published to the newsroom.",
            "value": null,
            "country": "Spain",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S2",
            "docId": "evt-crisis-drill",
            "docTitle": "Crisis simulation drill",
            "sourceLoc": "Asana · Group",
            "version": "read-only sync",
            "owner": "Group Communications",
            "validUntil": null,
            "confidence": 0.9,
            "confidentiality": "confidential",
            "validity": "approved",
            "snippet": "event · 9 Jul · Telefónica · Confidential tabletop exercise rehearsing the network-outage crisis playbook.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-digital"
            ]
          },
          {
            "id": "S3",
            "docId": "evt-q2-preclose",
            "docTitle": "Q2 pre-close press note",
            "sourceLoc": "Google Calendar · Group",
            "version": "read-only sync",
            "owner": "Investor Relations",
            "validUntil": null,
            "confidence": 0.85,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "publication · 11 Jul · Telefónica · Pre-close quiet-period reminder and holding lines for press enquiries.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S4",
            "docId": "evt-fibre-press-briefing",
            "docTitle": "Fibre network press briefing",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.8,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "event · 14 Jul · Movistar · On-the-record briefing on fibre rollout and copper retirement progress in Spain.",
            "value": null,
            "country": "Spain",
            "brand": "Movistar",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S5",
            "docId": "evt-sustainability-launch",
            "docTitle": "Sustainability report launch",
            "sourceLoc": "Excel · Group",
            "version": "read-only sync",
            "owner": "Sustainability Office",
            "validUntil": null,
            "confidence": 0.75,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 15 Jul · Telefónica · Public launch of the annual sustainability report and net-zero progress update.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-sustainability"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-networks",
          "ax-digital",
          "ax-core",
          "ax-sustainability"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the communication area, generated for Communications Director.",
        "createdAt": "2026-07-09T23:34:11.870Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "confidential",
          "format": "planning-forecast",
          "axisIds": [
            "ax-networks",
            "ax-digital",
            "ax-core",
            "ax-sustainability"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mre58pbk-17",
        "approved": true
      },
      "id": "rev-mre58pbk-17",
      "status": "approved",
      "createdAt": "2026-07-09T23:34:23.792Z",
      "approvedAt": "2026-07-12T17:23:01.828Z",
      "approvedHash": "2f054e7d69680ee688060779e8c57a67f759459f85eab69cfb3b02be00d06954"
    },
    {
      "scheduleId": "sch-mrlf5smy-31",
      "scheduleName": "Weekly results digest",
      "reviewFolder": "Communications Director review",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "draft": {
        "id": "draft-oo4mkqt",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-multiformat",
        "title": "Q1 2026 results and network progress — weekly summary (Week 27)",
        "language": "en",
        "audience": "internal",
        "confidentiality": "private",
        "umbrella": "Telefónica's Q1 2026 results confirm a solid financial base, with network expansion and convergence progress supporting the strategic direction for the year ahead. [S2][S5]",
        "exclusions": [
          {
            "reason": "destination",
            "docTitle": "New USP Rollout Plan — 'Conexión que entiende' (Confidential)",
            "confidentiality": "confidential",
            "note": "\"New USP Rollout Plan — 'Conexión que entiende' (Confidential)\" (confidential) was excluded: it is above the destination confidentiality (\"private\")."
          }
        ],
        "sections": [
          {
            "id": "sec-vs9vc3m",
            "kind": "summary",
            "heading": "Executive summary",
            "axisId": null,
            "body": "This brief consolidates the key financial, network, customer experience and governance signals from Week 27 2026. Q1 2026 group revenue reached €8,127M, with an adjusted EBITDA margin of 32.1% and net financial debt of €26,140M [S2]. The regulated market showed Movistar holding a 35.1% broadband share as confirmed by the CNMC, and external sentiment held at 68% positive or neutral across monitored channels [S5]. Network progress continued, with 68.4 million fibre premises passed at the group level [S2]. On the governance side, one active data conflict requires immediate attention: a superseded messaging pack carries a top-line figure that disagrees with the published Q1 result and must not be used [S3]. The fibre-guarantee USP remains in legal review and cannot be used in any external channel [S5][S6]. The next fixed external milestone is the Q2 2026 results publication on 24 July 2026 [S1].",
            "citationIds": [
              "S2",
              "S5",
              "S3",
              "S6",
              "S1"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-h6x2dyn",
            "kind": "body",
            "heading": "Financial performance — Q1 2026",
            "axisId": "financial-performance",
            "body": "Q1 2026 closed with group revenue of €8,127M and an adjusted EBITDA margin of 32.1% [S2]. Net financial debt stood at €26,140M at the end of the quarter [S2].\n\nManagement's positioning links financial resilience to the ongoing network transformation: fibre-led households are showing materially lower churn than copper-based lines, which management presents as evidence that network quality underpins convergence value [S2].\n\n**Governance alert — figures in circulation**\n\nA superseded Q1 messaging pack remains in circulation carrying a top-line figure of €7,982M, which conflicts with the published and governed result of €8,127M [S3]. The published figure is the only one that should be referenced. Any team member who encounters the older pack should flag it to the document owner and stop using it immediately [S3].",
            "citationIds": [
              "S2",
              "S3"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-8sn7ku9",
            "kind": "body",
            "heading": "Network expansion and infrastructure progress",
            "axisId": "network-expansion",
            "body": "The group reached 68.4 million fibre premises passed as of the Q1 2026 reporting period [S2]. 5G standalone coverage continued to expand across core markets, and the retirement of legacy copper infrastructure in Spain is progressing [S2]. Management has positioned network quality explicitly as the foundation for the group's convergence strategy [S2].\n\nTwo network-related items require internal attention this week:\n\n- The rural-fibre press note is still in review, pending sign-off on the underlying network figures. It should not be released externally until that sign-off is confirmed [S1].\n- The fibre-guarantee USP is in legal review and must be kept out of all external channels until clearance is granted [S5][S6].",
            "citationIds": [
              "S2",
              "S1",
              "S5",
              "S6"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-w2gun74",
            "kind": "body",
            "heading": "Customer experience and NPS",
            "axisId": "customer-experience",
            "body": "The current group NPS sits at 42, against a full-year objective of 45 [S4]. The three-point gap defines the near-term focus for the Customer Experience Office.\n\nRecommended actions tracked for the coming weeks are:\n\n- Accelerate the rollout of digital self-service to reduce demand on assisted channels [S4].\n- Reduce the volume of billing-related complaints, which are identified as a material drag on the score [S4].\n- Protect network quality during any planned infrastructure works, given the direct link between network experience and NPS movement [S4].\n\nEach action has a named owner in the CX Office, and progress is reviewed weekly and reflected in the next digest [S4].",
            "citationIds": [
              "S4"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-v58z622",
            "kind": "body",
            "heading": "Market position and competitive context",
            "axisId": "market-and-competitive-context",
            "body": "The CNMC confirmed Movistar's broadband market share at 35.1% in Spain [S5]. External sentiment held at 68% positive or neutral across monitored channels during Week 27 [S5].\n\nThe principal competitive pressure identified this week is MasOrange pricing activity in Spain. The recommended internal line is to maintain a value-and-convergence positioning rather than engage in direct price comparison [S6].\n\nTeams should not deploy the fibre-guarantee USP in response to competitive pressure until legal review is complete [S5][S6].",
            "citationIds": [
              "S5",
              "S6"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-o7ptqax",
            "kind": "body",
            "heading": "Governance, calendar and next steps",
            "axisId": "governance-and-calendar",
            "body": "**Upcoming milestones**\n\n- Q2 2026 results publication: 24 July 2026. The embargo window opens 48 hours prior, meaning preparations and message validation must be complete well ahead of that date [S1].\n- Capital Markets Day: 15 October 2026 [S1].\n- Q2 results briefing pack preparation is a recommended action for this week [S6].\n\n**Message validation**\n\nCarmen Ortiz coordinates final message validation for upcoming publications [S1]. Any team producing external material should ensure sign-off flows through the established process before release.\n\n**Active governance flags**\n\n- The superseded messaging pack carrying the €7,982M Q1 top-line must be withdrawn and replaced with material referencing the governed €8,127M figure [S3].\n- The rural-fibre press note remains on hold pending network-figure sign-off [S1].\n- The fibre-guarantee USP must remain out of external channels pending legal clearance [S5][S6].\n\nEvery statement in this brief traces to a cited governed source [S5].",
            "citationIds": [
              "S48",
              "S1",
              "S6",
              "S3",
              "S5"
            ],
            "internalOnly": false
          }
        ],
        "spokesperson": [],
        "charts": [
          {
            "id": "chart-3tepaeh",
            "title": "Total accesses",
            "type": "bar",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "points": [
              {
                "label": "Spain",
                "value": 38.2
              },
              {
                "label": "Germany",
                "value": 45.1
              },
              {
                "label": "Brazil",
                "value": 116.4
              },
              {
                "label": "United Kingdom",
                "value": 41.7
              }
            ]
          },
          {
            "id": "chart-xzrfc7o",
            "title": "Group revenue trend",
            "type": "line",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "points": [
              {
                "label": "Q2 2025",
                "value": 7910
              },
              {
                "label": "Q3 2025",
                "value": 7955
              },
              {
                "label": "Q4 2025",
                "value": 7982
              },
              {
                "label": "Q1 2026",
                "value": 8127
              }
            ]
          }
        ],
        "tables": [
          {
            "id": "table-eugabrc",
            "title": "Total accesses",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "columns": [
              "Period",
              "Value (million)"
            ],
            "rows": [
              [
                "Spain",
                "38.2"
              ],
              [
                "Germany",
                "45.1"
              ],
              [
                "Brazil",
                "116.4"
              ],
              [
                "United Kingdom",
                "41.7"
              ]
            ]
          },
          {
            "id": "table-keunk69",
            "title": "Group revenue trend",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": "S2",
            "columns": [
              "Period",
              "Value (€M)"
            ],
            "rows": [
              [
                "Q2 2025",
                "7910"
              ],
              [
                "Q3 2025",
                "7955"
              ],
              [
                "Q4 2025",
                "7982"
              ],
              [
                "Q1 2026",
                "8127"
              ]
            ]
          }
        ],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-ssot-weekly-brief-w27",
            "docTitle": "SSoT Weekly Executive Brief — Week 27 2026",
            "sourceLoc": "SSoT Weekly Brief W27 › Calendar",
            "version": "Q3 2026",
            "owner": "Hub SSoT",
            "validUntil": "2026-07-14",
            "confidence": 0.98,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "The next fixed milestone is the Q2 2026 results publication on 24 July 2026, with the embargo window opening 48 hours prior; the Capital Markets Day follows on 15 October 2026. Carmen Ortiz coordinates final message validation. The rural-fibre press note remains in review pending network-figure sign-off.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          },
          {
            "id": "S2",
            "docId": "doc-q1-2026-results",
            "docTitle": "Q1 2026 Results — Financial Highlights",
            "sourceLoc": "Q1 2026 Results › Networks › slide 13",
            "version": "Q1 2026",
            "owner": "Investor Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.96,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "With 68.4 million fibre premises passed, the group continued to expand 5G standalone coverage across the core markets while retiring legacy copper in Spain. Management positioned network quality as the foundation for convergence, noting that fibre-led households show materially lower churn than copper-based lines.",
            "value": "8,127 €M",
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S3",
            "docId": "doc-ssot-weekly-brief-w27",
            "docTitle": "SSoT Weekly Executive Brief — Week 27 2026",
            "sourceLoc": "SSoT Weekly Brief W27 › Governance flags",
            "version": "Q3 2026",
            "owner": "Hub SSoT",
            "validUntil": "2026-07-14",
            "confidence": 0.95,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "One live conflict is flagged for awareness: a superseded Q1 messaging pack still carries a €7,982M top-line that disagrees with the published €8,127M Q1 2026 group revenue. The current results figure is the only defensible one. Spokespeople should draw exclusively from approved, current material.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          },
          {
            "id": "S4",
            "docId": "doc-e-kpi-nps-objective",
            "docTitle": "Objective Tracker — Customer Experience NPS (Week 28)",
            "sourceLoc": "Objective Tracker CX NPS › Actions",
            "version": "Q3 2026",
            "owner": "Comms Hub / SSoT",
            "validUntil": "2026-07-27",
            "confidence": 0.95,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "Recommended actions for the coming weeks are to accelerate digital self-service rollout, reduce billing-related complaints and protect network quality during planned works. Each action has a named owner in the CX Office. Progress is reviewed weekly and reflected in the next digest. Actions target the three-point gap between the current 42 and the full-year objective of 45.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          },
          {
            "id": "S5",
            "docId": "doc-ssot-weekly-brief-w27",
            "docTitle": "SSoT Weekly Executive Brief — Week 27 2026",
            "sourceLoc": "SSoT Weekly Brief W27 › Summary",
            "version": "Q3 2026",
            "owner": "Hub SSoT",
            "validUntil": "2026-07-14",
            "confidence": 0.94,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "Week 27 summary, generated by the Hub from governed sources: external sentiment held at 68% positive or neutral; the CNMC confirmed Movistar's broadband leadership at 35.1%; and the fibre-guarantee USP remains in legal review and must not be used externally. Every statement in this brief traces to a cited governed document.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          },
          {
            "id": "S6",
            "docId": "doc-ssot-weekly-brief-w27",
            "docTitle": "SSoT Weekly Executive Brief — Week 27 2026",
            "sourceLoc": "SSoT Weekly Brief W27 › Actions",
            "version": "Q3 2026",
            "owner": "Hub SSoT",
            "validUntil": "2026-07-14",
            "confidence": 0.94,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "Recommended actions this week: keep the fibre-guarantee USP out of external channels until legal clears it, prepare the Q2 results briefing pack, and maintain the value-and-convergence line against MasOrange pricing pressure in Spain. Each recommendation is derived from a cited governed source, not from open-web content.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "qaNotes": [],
        "axisIds": [
          "financial-performance",
          "network-expansion",
          "customer-experience",
          "market-and-competitive-context",
          "governance-and-calendar",
          "ax-core",
          "ax-digital",
          "ax-b2b"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "createdAt": "2026-07-15T01:46:27.834Z",
        "params": {
          "shape": "multiformat",
          "topic": "Weekly summary of Q1 2026 results and network progress",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "private",
          "format": "document",
          "axisIds": [],
          "spokesperson": null,
          "eventDate": null
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrlf6m5f-32",
        "approved": true,
        "askSignals": null
      },
      "id": "rev-mrlf6m5f-32",
      "status": "approved",
      "createdAt": "2026-07-15T01:47:05.763Z",
      "approvedAt": "2026-07-15T01:48:13.836Z",
      "approvedHash": "8ba50247e0607a6eddabab69c480142e9e40579976de00d6a1dcc41acba7bd81"
    },
    {
      "scheduleId": "sch-mrlfd4rg-38",
      "scheduleName": "Tamper proof digest",
      "reviewFolder": "Communications Director review",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "draft": {
        "id": "draft-nncrmty",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-multiformat",
        "title": "Q1 2026 results summary — internal briefing",
        "language": "en",
        "audience": "internal",
        "confidentiality": "private",
        "umbrella": "Telefónica delivered steady top-line growth in Q1 2026, supported by convergence and B2B momentum, consistent with the group's full-year guidance of low-single-digit revenue growth. [S6]",
        "exclusions": [
          {
            "reason": "destination",
            "docTitle": "Group Brand Value — Internal Finance Dashboard Q1 2026",
            "confidentiality": "confidential",
            "note": "\"Group Brand Value — Internal Finance Dashboard Q1 2026\" (confidential) was excluded: it is above the destination confidentiality (\"private\")."
          },
          {
            "reason": "destination",
            "docTitle": "Transform & Grow — Strategic Plan 2026-2028",
            "confidentiality": "confidential",
            "note": "\"Transform & Grow — Strategic Plan 2026-2028\" (confidential) was excluded: it is above the destination confidentiality (\"private\")."
          },
          {
            "reason": "destination",
            "docTitle": "Telefónica Tech — B2B Growth Strategy",
            "confidentiality": "confidential",
            "note": "\"Telefónica Tech — B2B Growth Strategy\" (confidential) was excluded: it is above the destination confidentiality (\"private\")."
          }
        ],
        "sections": [
          {
            "id": "sec-wamcp6e",
            "kind": "summary",
            "heading": "Executive summary",
            "axisId": null,
            "body": "This document provides an internal summary of the Q1 2026 results position for Communication and Brand teams. It draws on approved, current material held in the Hub SSoT and should be read alongside any Investor Relations publications for financial detail.\n\nThe group's published Q1 2026 revenue figure is **€8,127M**. Teams should note that a superseded messaging pack still in circulation carries an incorrect figure of €7,982M; that version is not defensible and must not be used [S3]. The results date for Q1 2026 was **25 February 2026**, in line with the fixed corporate calendar [S4].\n\nThe overarching narrative for results communication is another quarter of steady growth led by convergence and B2B, consistent with the full-year 2026 guidance of low-single-digit revenue growth [S6]. Specific unpublished quarterly detail should not be quoted publicly; any such requests must be referred to Investor Relations [S6].\n\nThree strategic axes are covered in the themed sections below, inferred from the available sources as the most relevant to Q1 2026: **financial results and guidance integrity**, **B2B and technology growth**, and **regulatory and compliance readiness**. A note on brand value is included where source material permits.",
            "citationIds": [
              "S3",
              "S4",
              "S6"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-x9sg4s9",
            "kind": "body",
            "heading": "Financial results and guidance integrity",
            "axisId": "financial-results-integrity",
            "body": "The single authoritative group revenue figure for Q1 2026 is **€8,127M** [S3]. This is the only figure that should appear in internal or external-facing materials. A superseded Q1 messaging pack carrying €7,982M remains in circulation and represents a live data conflict flagged by the SSoT governance process; teams must discard and replace any document containing that figure [S3].\n\nOn guidance framing, the approved line is that results reflect another quarter of steady growth led by convergence and B2B, in line with the full-year 2026 guidance of low-single-digit revenue growth [S6]. Spokespeople should reference only the published group figures and should not quote unpublished quarterly detail; any such enquiries are to be redirected to Investor Relations [S6].\n\nThe Q1 results were published on **25 February 2026**. The next scheduled results date is **13 May 2026**, with a quiet period beginning ten days prior, constraining proactive announcements from approximately 3 May [S4]. Teams should plan communications activity accordingly and ensure no material is released during the quiet window without prior clearance.",
            "citationIds": [
              "S3",
              "S6",
              "S4"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-zdqeubj",
            "kind": "body",
            "heading": "B2B and technology growth",
            "axisId": "b2b-and-technology-growth",
            "body": "B2B and Telefónica Tech continued to build momentum into 2026. Media coverage data for Q2 2026 shows Telefónica Tech and B2B accounted for **19% of retained media items**, making it the second-largest theme after quarterly results [S2]. Notably, the B2B theme grew fastest quarter on quarter, up **eight percentage points versus Q1** [S2], which is consistent with the Scale B2B and Tech strategic narrative [S2].\n\nThis trajectory validates the emphasis placed on convergence and B2B in results messaging. Communication teams should continue to amplify this narrative in media engagements, ensuring it is anchored to approved talking points and published figures rather than forward-looking specifics not yet cleared for release [S6].\n\nThe growth in B2B media salience also suggests increased journalist and analyst interest in this area. Teams should be prepared for more detailed questions on Telefónica Tech performance and should route any requests for unpublished segment data to Investor Relations [S6].",
            "citationIds": [
              "S2",
              "S6"
            ],
            "internalOnly": false
          },
          {
            "id": "sec-qv8oz4f",
            "kind": "body",
            "heading": "Regulatory and compliance readiness",
            "axisId": "regulatory-and-compliance-readiness",
            "body": "The EU AI Act and Digital Services Act remain active regulatory priorities for 2026. The current internal reference for both instruments is the EU Digital Services and AI Act Compliance Briefing, which is reviewed quarterly by Public Policy and whenever the European Commission issues implementing guidance [S1]. The next scheduled review of this briefing aligns with the Q2 2026 results cycle [S1].\n\nUntil that review is complete and a new version is issued, teams must continue to use the current briefing as the sole internal reference for AI Act and DSA handling [S1]. The public regulatory note — a separate, externally shareable summary — remains the only approved document for use outside the organisation [S1].\n\nRegulation accounted for **9% of retained media items** in Q2 2026 coverage [S2], indicating that the topic is present in public discourse. Communication and Brand teams should ensure any regulatory statements are consistent with the current briefing and cleared through Public Policy before publication.\n\n*Note on brand value:* One external source ingested by the SSoT — a Q1 2026 ranking from a consultancy called GlobalBrandRank — placed Telefónica among the top three European telecom brands, citing a brand value of €15.1bn [S5]. However, the internal dashboard value for the same period is €14.2bn, a discrepancy the SSoT digest flags explicitly [S5]. Teams should not cite the external ranking figure in any internal or external material until the conflict is resolved and a single approved figure is confirmed. The approved boilerplate should be used in place of any ranking or valuation claim: *Telefónica is one of the largest telecommunications companies in the world by number of customers, with a presence in Europe and Latin America. It provides connectivity and digital services to consumers and businesses.*",
            "citationIds": [
              "S1",
              "S2",
              "S5"
            ],
            "internalOnly": false
          }
        ],
        "spokesperson": [],
        "charts": [
          {
            "id": "chart-t1gglo8",
            "title": "Total accesses",
            "type": "bar",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": null,
            "points": [
              {
                "label": "Spain",
                "value": 38.2
              },
              {
                "label": "Germany",
                "value": 45.1
              },
              {
                "label": "Brazil",
                "value": 116.4
              },
              {
                "label": "United Kingdom",
                "value": 41.7
              }
            ]
          },
          {
            "id": "chart-6h1oroj",
            "title": "Group revenue trend",
            "type": "line",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": null,
            "points": [
              {
                "label": "Q2 2025",
                "value": 7910
              },
              {
                "label": "Q3 2025",
                "value": 7955
              },
              {
                "label": "Q4 2025",
                "value": 7982
              },
              {
                "label": "Q1 2026",
                "value": 8127
              }
            ]
          }
        ],
        "tables": [
          {
            "id": "table-1gkmfi9",
            "title": "Total accesses",
            "unit": "million",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": null,
            "columns": [
              "Period",
              "Value (million)"
            ],
            "rows": [
              [
                "Spain",
                "38.2"
              ],
              [
                "Germany",
                "45.1"
              ],
              [
                "Brazil",
                "116.4"
              ],
              [
                "United Kingdom",
                "41.7"
              ]
            ]
          },
          {
            "id": "table-squ085w",
            "title": "Group revenue trend",
            "unit": "€M",
            "source": "Q1 2026 Results — Financial Highlights",
            "citationId": null,
            "columns": [
              "Period",
              "Value (€M)"
            ],
            "rows": [
              [
                "Q2 2025",
                "7910"
              ],
              [
                "Q3 2025",
                "7955"
              ],
              [
                "Q4 2025",
                "7982"
              ],
              [
                "Q1 2026",
                "8127"
              ]
            ]
          }
        ],
        "citations": [
          {
            "id": "S1",
            "docId": "doc-eu-dsa-briefing",
            "docTitle": "EU Digital Services & AI Act — Compliance Briefing",
            "sourceLoc": "EU Legislation Briefing › Version notes",
            "version": "Q2 2026",
            "owner": "Public Policy",
            "validUntil": "2026-12-31",
            "confidence": 0.98,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "This briefing is reviewed quarterly by Public Policy and whenever the European Commission issues implementing guidance. The next scheduled review aligns with the second-quarter 2026 results cycle. Until superseded, this version is the internal reference for AI Act and DSA handling; the public regulatory note remains the externally shareable summary.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-sustainability",
              "ax-digital"
            ]
          },
          {
            "id": "S2",
            "docId": "doc-media-coverage-q2-2026",
            "docTitle": "Media Coverage Digest — Q2 2026",
            "sourceLoc": "Media Digest Q2 2026 › Top themes",
            "version": "Q2 2026",
            "owner": "Media Relations",
            "validUntil": "2026-10-31",
            "confidence": 0.89,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "The leading themes in Q2 2026 were quarterly results (31% of retained items), Telefónica Tech and B2B (19%), 5G and fibre networks (17%), sustainability (11%) and regulation (9%). The B2B theme grew fastest, up eight points versus Q1, consistent with the Scale B2B & Tech narrative.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-b2b"
            ]
          },
          {
            "id": "S3",
            "docId": "doc-ssot-weekly-brief-w27",
            "docTitle": "SSoT Weekly Executive Brief — Week 27 2026",
            "sourceLoc": "SSoT Weekly Brief W27 › Governance flags",
            "version": "Q3 2026",
            "owner": "Hub SSoT",
            "validUntil": "2026-07-14",
            "confidence": 0.89,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "One live conflict is flagged for awareness: a superseded Q1 messaging pack still carries a €7,982M top-line that disagrees with the published €8,127M Q1 2026 group revenue. The current results figure is the only defensible one. Spokespeople should draw exclusively from approved, current material.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          },
          {
            "id": "S4",
            "docId": "doc-comms-calendar-2026",
            "docTitle": "Communication Calendar & Milestones 2026",
            "sourceLoc": "Communication Calendar 2026 › Corporate milestones",
            "version": "FY 2026",
            "owner": "Group Communications",
            "validUntil": "2026-12-31",
            "confidence": 0.89,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "Fixed corporate milestones for 2026: quarterly results on 25 February, 13 May, 29 July and 4 November; the Annual General Meeting on 11 June in Madrid; and MWC Barcelona from 2 to 5 March. Quiet periods start ten days before each results date and constrain proactive announcements.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core",
              "ax-digital"
            ]
          },
          {
            "id": "S5",
            "docId": "doc-den-group-brand-value-press-2026",
            "docTitle": "Press Summary — Telefónica Group Brand Value Q1 2026",
            "sourceLoc": "Press Summary › GlobalBrandRank (fictional) › 22 Apr 2026 › Ranking",
            "version": "Q1 2026",
            "owner": "Media Relations",
            "validUntil": "2026-12-31",
            "confidence": 0.87,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "The fictional consultancy GlobalBrandRank placed Telefónica among the top three European telecom brands in its Q1 2026 update, citing a value of €15.1bn. The summary notes the ranking sits above the internal dashboard value of €14.2bn for the same period. This extract was ingested because it matched the brand-value and ranking filters.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S6",
            "docId": "doc-a-talking-points-results-q2-2026",
            "docTitle": "Talking Points — Q2 2026 Results (Approved)",
            "sourceLoc": "Talking Points Q2 2026 › Lines to take › page 2",
            "version": "Q2 2026",
            "owner": "Media Relations",
            "validUntil": "2026-09-30",
            "confidence": 0.85,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "On the group top line, spokespeople should reference only the published group figures and avoid quoting unpublished quarterly detail. The agreed framing is another quarter of steady growth led by convergence and B2B, consistent with the full-year 2026 guidance of low-single-digit revenue growth. Refer any request for specific unpublished numbers to Investor Relations.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "qaNotes": [],
        "axisIds": [
          "financial-results-integrity",
          "b2b-and-technology-growth",
          "regulatory-and-compliance-readiness",
          "ax-sustainability",
          "ax-digital",
          "ax-core",
          "ax-b2b"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "createdAt": "2026-07-15T01:52:10.067Z",
        "params": {
          "shape": "multiformat",
          "topic": "Q1 2026 results summary",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "private",
          "format": "document",
          "axisIds": [],
          "spokesperson": null,
          "eventDate": null
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrlfe2fp-39",
        "approved": true,
        "askSignals": null
      },
      "id": "rev-mrlfe2fp-39",
      "status": "approved",
      "createdAt": "2026-07-15T01:52:53.461Z",
      "approvedAt": "2026-07-15T01:52:53.875Z",
      "approvedHash": "1f6be7edf168d1d35167b646004678010383c3c1b9a703000599bc7b30e473a1"
    },
    {
      "scheduleId": "sch-mrlgcegs-45",
      "scheduleName": "Recurring 10-day forecast (weekly)",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "draft": {
        "id": "draft-forecast-mrlgcegv",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "confidential",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "The window opens with the MWC public keynote recap already live [S1], published on 8 July. The following day, 9 July, is the busiest single date in the period, with the crisis simulation drill [S2], the press test event [S3], and the Vivo winter campaign burst [S4] all scheduled simultaneously within Group. The known overlap between [S4] and [S2] on the same day in the same market is worth reviewing; it may be worth considering whether [S4] could move to 10 July or later to give each activity clear air and avoid dividing team attention during a confidential exercise. It is also worth noting that all three of these activities fall the day before the MWC follow-up industry summit on 10 July, so it may be useful to check whether any preparatory demands from that external event could further compress capacity on the 9th.\n\nThe middle of the window carries two planned publications. The Q2 pre-close press note [S5] is due on 11 July, close to both the MWC follow-up industry summit on 10 July and the competitor ClaroNet fibre launch on 13 July; it may be worth confirming that the quiet-period messaging holds its own in that brief but busy stretch. The fibre network press briefing for Movistar [S6] follows on 14 July, the day before competitor MoveCorp is expected to publish its Q2 results on 15 July; the briefing team may wish to consider whether that external results day affects journalist availability or angles.\n\nThe window closes with the sustainability report launch [S7] on 15 July, which lands on the same date as the MoveCorp Q2 results and two days after the ClaroNet fibre launch. With competitor news likely to be circulating across both the 13th and 15th, it may be worth checking whether the report has sufficient lead time built in for proactive media outreach before those stories dominate the news environment. No further activities are recorded in the calendar beyond 15 July within this window.",
            "citationIds": [
              "S1",
              "S2",
              "S3",
              "S4",
              "S5",
              "S6",
              "S7"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 1. Detected timing conflicts: 1. Activities or signals flagged as at risk: 8.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "tables": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-mwc-public-recap",
            "docTitle": "MWC public keynote recap",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 8 Jul · Telefónica · Public-facing recap article of the MWC keynote published to the newsroom.",
            "value": null,
            "country": "Spain",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S2",
            "docId": "evt-crisis-drill",
            "docTitle": "Crisis simulation drill",
            "sourceLoc": "Asana · Group",
            "version": "read-only sync",
            "owner": "Group Communications",
            "validUntil": null,
            "confidence": 0.9,
            "confidentiality": "confidential",
            "validity": "approved",
            "snippet": "event · 9 Jul · Telefónica · Confidential tabletop exercise rehearsing the network-outage crisis playbook.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-digital"
            ]
          },
          {
            "id": "S3",
            "docId": "evt-hub-mrlg9wau-1",
            "docTitle": "Press test event",
            "sourceLoc": "Asana · Group",
            "version": "read-only sync",
            "owner": "Press Office",
            "validUntil": null,
            "confidence": 0.85,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "campaign · 9 Jul · Telefónica · governance probe",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S4",
            "docId": "evt-hub-mrlg9wfj-3",
            "docTitle": "Vivo winter campaign burst",
            "sourceLoc": "Asana · Group",
            "version": "read-only sync",
            "owner": "Brand Campaigns",
            "validUntil": null,
            "confidence": 0.8,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "campaign · 9 Jul · Telefónica · Deliberate same-day same-market launch to probe conflict detection.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S5",
            "docId": "evt-q2-preclose",
            "docTitle": "Q2 pre-close press note",
            "sourceLoc": "Google Calendar · Group",
            "version": "read-only sync",
            "owner": "Investor Relations",
            "validUntil": null,
            "confidence": 0.75,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "publication · 11 Jul · Telefónica · Pre-close quiet-period reminder and holding lines for press enquiries.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S6",
            "docId": "evt-fibre-press-briefing",
            "docTitle": "Fibre network press briefing",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.7,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "event · 14 Jul · Movistar · On-the-record briefing on fibre rollout and copper retirement progress in Spain.",
            "value": null,
            "country": "Spain",
            "brand": "Movistar",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S7",
            "docId": "evt-sustainability-launch",
            "docTitle": "Sustainability report launch",
            "sourceLoc": "Excel · Group",
            "version": "read-only sync",
            "owner": "Sustainability Office",
            "validUntil": null,
            "confidence": 0.65,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 15 Jul · Telefónica · Public launch of the annual sustainability report and net-zero progress update.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-sustainability"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-networks",
          "ax-digital",
          "ax-core",
          "ax-sustainability"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Deterministic forecast content over permitted calendar events; no claims outside the governed calendar.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the Comunicación area, generated for Communications Director.",
        "createdAt": "2026-07-15T02:19:23.867Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "confidential",
          "format": "planning-forecast",
          "axisIds": [
            "ax-networks",
            "ax-digital",
            "ax-core",
            "ax-sustainability"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrlgcegv-46",
        "approved": false
      },
      "id": "rev-mrlgcegv-46",
      "status": "pending",
      "createdAt": "2026-07-15T02:19:35.359Z",
      "approvedAt": null,
      "approvedHash": null
    },
    {
      "scheduleId": "sch-mrlgjfdn-48",
      "scheduleName": "Recurring 10-day forecast (weekly)",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "draft": {
        "id": "draft-forecast-mrlgjfdp",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "confidential",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "The window opens with the MWC public keynote recap [S1] already live on 8 July, giving Media Relations an active newsroom asset at the start of the period. The following day, Group Communications runs the confidential crisis simulation drill [S2] on 9 July, rehearsing the network-outage playbook ahead of any live incident scenario. On 11 July, Investor Relations publishes the Q2 pre-close press note [S3], setting holding lines and signalling the start of the quiet period to press contacts.\n\nThe second half of the window carries the heavier publication load. The fibre network press briefing [S4] is scheduled on-the-record for 14 July, covering Movistar's rollout and copper retirement progress in Spain, followed the next day by the Group-level sustainability report launch [S5] on 15 July. Those two activities sit close together and between them span both a media briefing and a major public publication, so it may be worth confirming that resourcing across Media Relations and the Sustainability Office is sufficient to support both in quick succession.\n\nSeveral external timing signals are worth a brief look before the week of the 14th. The fibre briefing [S4] falls on the same day as competitor MoveCorp's Q2 results, and the sustainability report [S5] lands alongside both ClaroNet's fibre launch and those same MoveCorp results on 15 July, which could compress the available media space for both. Earlier in the window, it may also be useful to check whether the crisis simulation drill [S2] and the Q2 pre-close note [S3] place any overlapping demands on communications teams around the MWC follow-up industry summit on 10 July. None of these conflicts appear critical at this stage, but a short alignment check across owners would be prudent before the 14th.",
            "citationIds": [
              "S1",
              "S2",
              "S3",
              "S4",
              "S5"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 1. Detected timing conflicts: 0. Activities or signals flagged as at risk: 6.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "tables": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-mwc-public-recap",
            "docTitle": "MWC public keynote recap",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 8 Jul · Telefónica · Public-facing recap article of the MWC keynote published to the newsroom.",
            "value": null,
            "country": "Spain",
            "brand": "Telefónica",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S2",
            "docId": "evt-crisis-drill",
            "docTitle": "Crisis simulation drill",
            "sourceLoc": "Asana · Group",
            "version": "read-only sync",
            "owner": "Group Communications",
            "validUntil": null,
            "confidence": 0.9,
            "confidentiality": "confidential",
            "validity": "approved",
            "snippet": "event · 9 Jul · Telefónica · Confidential tabletop exercise rehearsing the network-outage crisis playbook.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-digital"
            ]
          },
          {
            "id": "S3",
            "docId": "evt-q2-preclose",
            "docTitle": "Q2 pre-close press note",
            "sourceLoc": "Google Calendar · Group",
            "version": "read-only sync",
            "owner": "Investor Relations",
            "validUntil": null,
            "confidence": 0.85,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "publication · 11 Jul · Telefónica · Pre-close quiet-period reminder and holding lines for press enquiries.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-core"
            ]
          },
          {
            "id": "S4",
            "docId": "evt-fibre-press-briefing",
            "docTitle": "Fibre network press briefing",
            "sourceLoc": "Google Calendar · Spain",
            "version": "read-only sync",
            "owner": "Media Relations",
            "validUntil": null,
            "confidence": 0.8,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "event · 14 Jul · Movistar · On-the-record briefing on fibre rollout and copper retirement progress in Spain.",
            "value": null,
            "country": "Spain",
            "brand": "Movistar",
            "axisIds": [
              "ax-networks"
            ]
          },
          {
            "id": "S5",
            "docId": "evt-sustainability-launch",
            "docTitle": "Sustainability report launch",
            "sourceLoc": "Excel · Group",
            "version": "read-only sync",
            "owner": "Sustainability Office",
            "validUntil": null,
            "confidence": 0.75,
            "confidentiality": "public",
            "validity": "approved",
            "snippet": "publication · 15 Jul · Telefónica · Public launch of the annual sustainability report and net-zero progress update.",
            "value": null,
            "country": "Group",
            "brand": "Telefónica",
            "axisIds": [
              "ax-sustainability"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-networks",
          "ax-digital",
          "ax-core",
          "ax-sustainability"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the Comunicación area, generated for Communications Director.",
        "createdAt": "2026-07-15T02:24:52.299Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-director",
          "audience": "internal",
          "language": "en",
          "confidentiality": "confidential",
          "format": "planning-forecast",
          "axisIds": [
            "ax-networks",
            "ax-digital",
            "ax-core",
            "ax-sustainability"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrlgjfdp-49",
        "approved": true
      },
      "id": "rev-mrlgjfdp-49",
      "status": "approved",
      "createdAt": "2026-07-15T02:25:03.133Z",
      "approvedAt": "2026-07-15T02:25:03.158Z",
      "approvedHash": "1daefaec0f9ddf04b4916d1b9b586f55f8a9301592daa2ba78b710bd014fa639"
    },
    {
      "scheduleId": "sch-mrlp0s8p-54",
      "scheduleName": "Recurring 10-day forecast (weekly)",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-brand",
      "ownerLabel": "Brand Manager",
      "draft": {
        "id": "draft-forecast-mrlp0s8r",
        "status": "drafted",
        "shape": "multiformat",
        "templateId": "tmpl-planning-forecast",
        "title": "10-day planning forecast — 7 Jul to 17 Jul",
        "language": "en",
        "audience": "internal",
        "confidentiality": "private",
        "umbrella": null,
        "exclusions": [],
        "sections": [
          {
            "id": "sec-forecast-summary",
            "kind": "summary",
            "heading": "Forecast summary (7 Jul to 17 Jul)",
            "axisId": null,
            "body": "**Hub SSoT 10-Day Outlook: 7 Jul – 17 Jul**\n\nWithin this window there is one confirmed activity moving into its live phase. The Movistar summer pricing and loyalty campaign [S1], owned by Marca España, is scheduled to go live on 14 Jul and runs through to 20 Jul, carrying a planned status sourced from Asana. No other calendar events fall within the 10-day period.\n\nLooking ahead to the opening days of the campaign, it may be worth checking the proximity of the [S1] launch date to 15 Jul, when external signals indicate MoveCorp is due to publish its Q2 results. Both fall within a 24-hour window, and it would be reasonable to consider whether that external moment affects the share of attention the Movistar summer pricing message receives in market, or influences how media and customers are engaged on that day.\n\nThere are no conflicts between internal activities in this period, and no other timing risks arise from the calendar as it stands. The days from 7 Jul to 13 Jul are clear of scheduled launches, which may offer a useful pre-live window for any final preparation or stakeholder alignment ahead of [S1] going live on the 14th.",
            "citationIds": [
              "S1"
            ],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-highlights",
            "kind": "body",
            "heading": "Window highlights",
            "axisId": null,
            "body": "Live or in-progress activities in the window: 0. Detected timing conflicts: 0. Activities or signals flagged as at risk: 1.",
            "citationIds": [],
            "internalOnly": true
          },
          {
            "id": "sec-forecast-method",
            "kind": "body",
            "heading": "Method note",
            "axisId": null,
            "body": "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
            "citationIds": [],
            "internalOnly": true
          }
        ],
        "spokesperson": [],
        "charts": [],
        "tables": [],
        "citations": [
          {
            "id": "S1",
            "docId": "evt-movistar-summer-pricing",
            "docTitle": "Movistar summer pricing launch",
            "sourceLoc": "Asana · Spain",
            "version": "read-only sync",
            "owner": "Marca España",
            "validUntil": null,
            "confidence": 0.95,
            "confidentiality": "private",
            "validity": "approved",
            "snippet": "campaign · 14 Jul–20 Jul · Movistar · Summer pricing and loyalty campaign for existing Movistar customers in Spain.",
            "value": null,
            "country": "Spain",
            "brand": "Movistar",
            "axisIds": [
              "ax-core"
            ]
          }
        ],
        "disclaimers": [
          {
            "id": "disc-forward-looking",
            "name": "Forward-looking statements",
            "text": "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release."
          }
        ],
        "axisIds": [
          "ax-core"
        ],
        "guardian": {
          "status": "pass",
          "summary": "Deterministic forecast content over permitted calendar events; no claims outside the governed calendar.",
          "findings": []
        },
        "historic": false,
        "historicNote": null,
        "permissionNote": null,
        "note": "Scheduled planning forecast for the Comunicación area, generated for Brand Manager.",
        "createdAt": "2026-07-15T06:22:21.348Z",
        "params": {
          "shape": "multiformat",
          "topic": "10-day planning forecast (7 Jul to 17 Jul)",
          "roleId": "role-brand",
          "audience": "internal",
          "language": "en",
          "confidentiality": "private",
          "format": "planning-forecast",
          "axisIds": [
            "ax-core"
          ]
        },
        "origin": "scheduled",
        "reviewItemId": "rev-mrlp0s8r-55",
        "approved": false
      },
      "id": "rev-mrlp0s8r-55",
      "status": "pending",
      "createdAt": "2026-07-15T06:22:29.883Z",
      "approvedAt": null,
      "approvedHash": null
    }
  ],
  "scheduledDraftIndex": {
    "draft-forecast-mrbgmuf8": "rev-mrbgmuf8-6",
    "af1f4cdf18524ea843eca145f8d318603e10d0b3bbe21f442fed95e2ab5cdc84": "rev-mrbgmuf8-6",
    "draft-forecast-mrbgn47h": "rev-mrbgn47h-8",
    "6c94ef9bd9eae9e7bb1cd26a4f24a1e5022d9adb1e3466ccdf538bc83a7800ce": "rev-mrbgn47h-8",
    "draft-forecast-mre540vm": "rev-mre540vm-11",
    "b1efe55f94c78d179b19cdcd1b9dc77a897d86957272b426a1f9b8913b19eba3": "rev-mre540vm-11",
    "draft-forecast-mre54nlo": "rev-mre54nlo-14",
    "413f97fac0e0e292a1895a5e0ff87942b2eabaff31e1be0a4c4bd2954a9c3381": "rev-mre54nlo-14",
    "draft-forecast-mre58pbk": "rev-mre58pbk-17",
    "2f054e7d69680ee688060779e8c57a67f759459f85eab69cfb3b02be00d06954": "rev-mre58pbk-17",
    "draft-oo4mkqt": "rev-mrlf6m5f-32",
    "8ba50247e0607a6eddabab69c480142e9e40579976de00d6a1dcc41acba7bd81": "rev-mrlf6m5f-32",
    "draft-nncrmty": "rev-mrlfe2fp-39",
    "1f6be7edf168d1d35167b646004678010383c3c1b9a703000599bc7b30e473a1": "rev-mrlfe2fp-39",
    "draft-forecast-mrlgcegv": "rev-mrlgcegv-46",
    "8fb11162089e96db4b114cf9b70f4c73e04ea93c1b87234a881f02acb47586f7": "rev-mrlgcegv-46",
    "draft-forecast-mrlgjfdp": "rev-mrlgjfdp-49",
    "1daefaec0f9ddf04b4916d1b9b586f55f8a9301592daa2ba78b710bd014fa639": "rev-mrlgjfdp-49",
    "draft-forecast-mrlp0s8r": "rev-mrlp0s8r-55",
    "6a5137efcec1a7b12d9d0a17e9f4c7fbdb6c0d571c3ace441dc6f1ae84e4962f": "rev-mrlp0s8r-55"
  },
  "editorialReviews": [
    {
      "id": "edrev-mrbe8tur-2",
      "contentHash": "de55d22d6b91dd00647e106d105dddcb9cdb00875e511b9c8975bdfec32bcd27",
      "draftId": "draft-1z5mwbx",
      "title": "Telefónica press release — fibre expansion and network investment — 15 September 2026",
      "reviewedBy": "Editorial desk",
      "reviewedAt": "2026-07-08T01:23:07.683Z"
    },
    {
      "id": "edrev-mrbeq4eu-4",
      "contentHash": "a160c5220dc8295e039d18055bea4390ad6db3088cb1565bac03bd59005da85a",
      "draftId": "draft-7jspyqa",
      "title": "Press release — Telefónica B2B enterprise growth: cyber and cloud revenue announcement",
      "reviewedBy": "Communications Director",
      "reviewedAt": "2026-07-08T01:36:34.518Z"
    },
    {
      "id": "edrev-mrlef7xt-27",
      "contentHash": "e348e1221807c1be020228f9cd1722acb557bed87b8907cf8883d448ecf667a3",
      "draftId": "draft-85y5kpy",
      "title": "Telefónica confirms completion of Chile disposal and balance sheet strengthening",
      "reviewedBy": "Elena Ruiz (Editorial)",
      "reviewedAt": "2026-07-15T01:25:47.633Z"
    },
    {
      "id": "edrev-mrlelk2p-28",
      "contentHash": "c5be711be0177743b2302ee5ea01658e681c48cff3797986c0a12c449b9ab0d8",
      "draftId": "draft-wbj4vcp",
      "title": "Telefónica completes sale of Chilean subsidiary",
      "reviewedBy": "Elena Ruiz (Editorial)",
      "reviewedAt": "2026-07-15T01:30:43.297Z"
    }
  ],
  "notifications": [
    {
      "kind": "scheduled_draft_ready",
      "reviewItemId": "rev-mrlp0s8r-55",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-brand",
      "ownerLabel": "Brand Manager",
      "message": "The 10-day planning forecast landed in \"Planning forecasts\" and is waiting for review.",
      "id": "notif-mrlp0s8y-56",
      "createdAt": "2026-07-15T06:22:29.890Z",
      "read": false
    },
    {
      "kind": "review_approved",
      "reviewItemId": "rev-mrlgjfdp-49",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "message": "\"10-day planning forecast — 7 Jul to 17 Jul\" was approved in \"Planning forecasts\" and can now be saved and exported.",
      "id": "notif-mrlgjfei-51",
      "createdAt": "2026-07-15T02:25:03.162Z",
      "read": false
    },
    {
      "kind": "scheduled_draft_ready",
      "reviewItemId": "rev-mrlgjfdp-49",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "message": "The 10-day planning forecast landed in \"Planning forecasts\" and is waiting for review.",
      "id": "notif-mrlgjfdw-50",
      "createdAt": "2026-07-15T02:25:03.140Z",
      "read": false
    },
    {
      "kind": "scheduled_draft_ready",
      "reviewItemId": "rev-mrlgcegv-46",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "message": "The 10-day planning forecast landed in \"Planning forecasts\" and is waiting for review.",
      "id": "notif-mrlgceh0-47",
      "createdAt": "2026-07-15T02:19:35.364Z",
      "read": false
    },
    {
      "kind": "review_approved",
      "reviewItemId": "rev-mrlfe2fp-39",
      "reviewFolder": "Communications Director review",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "message": "\"Q1 2026 results summary — internal briefing\" was approved in \"Communications Director review\" and can now be saved and exported.",
      "id": "notif-mrlfe2ra-43",
      "createdAt": "2026-07-15T01:52:53.878Z",
      "read": false
    },
    {
      "kind": "scheduled_draft_ready",
      "reviewItemId": "rev-mrlfe2fp-39",
      "reviewFolder": "Communications Director review",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "message": "\"Tamper proof digest\" produced a new draft in \"Communications Director review\" and is waiting for review.",
      "id": "notif-mrlfe2fs-40",
      "createdAt": "2026-07-15T01:52:53.464Z",
      "read": false
    },
    {
      "kind": "review_approved",
      "reviewItemId": "rev-mrlf6m5f-32",
      "reviewFolder": "Communications Director review",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "message": "\"Q1 2026 results and network progress — weekly summary (Week 27)\" was approved in \"Communications Director review\" and can now be saved and exported.",
      "id": "notif-mrlf82oe-36",
      "createdAt": "2026-07-15T01:48:13.839Z",
      "read": false
    },
    {
      "kind": "scheduled_draft_ready",
      "reviewItemId": "rev-mrlf6m5f-32",
      "reviewFolder": "Communications Director review",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "message": "\"Weekly results digest\" produced a new draft in \"Communications Director review\" and is waiting for review.",
      "id": "notif-mrlf6m5j-33",
      "createdAt": "2026-07-15T01:47:05.767Z",
      "read": false
    },
    {
      "kind": "review_approved",
      "reviewItemId": "rev-mre58pbk-17",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "message": "\"10-day planning forecast — 7 Jul to 17 Jul\" was approved in \"Planning forecasts\" and can now be saved and exported.",
      "id": "notif-mri2aois-19",
      "createdAt": "2026-07-12T17:23:01.924Z",
      "read": false
    },
    {
      "kind": "scheduled_draft_ready",
      "reviewItemId": "rev-mre58pbk-17",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "message": "The 10-day planning forecast landed in \"Planning forecasts\" and is waiting for review.",
      "id": "notif-mre58pbn-18",
      "createdAt": "2026-07-09T23:34:23.795Z",
      "read": false
    },
    {
      "kind": "scheduled_draft_ready",
      "reviewItemId": "rev-mre54nlo-14",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-director",
      "ownerLabel": "Communications Director",
      "message": "The 10-day planning forecast landed in \"Planning forecasts\" and is waiting for review.",
      "id": "notif-mre54nlq-15",
      "createdAt": "2026-07-09T23:31:14.942Z",
      "read": false
    },
    {
      "kind": "scheduled_draft_ready",
      "reviewItemId": "rev-mre540vm-11",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-press",
      "ownerLabel": "External / Press",
      "message": "The 10-day planning forecast landed in \"Planning forecasts\" and is waiting for review.",
      "id": "notif-mre540vo-12",
      "createdAt": "2026-07-09T23:30:45.492Z",
      "read": false
    },
    {
      "kind": "scheduled_draft_ready",
      "reviewItemId": "rev-mrbgn47h-8",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-brand",
      "ownerLabel": "Brand Manager",
      "message": "The 10-day planning forecast landed in \"Planning forecasts\" and is waiting for review.",
      "id": "notif-mrbgn47i-9",
      "createdAt": "2026-07-08T02:30:13.518Z",
      "read": false
    },
    {
      "kind": "scheduled_draft_ready",
      "reviewItemId": "rev-mrbgmuf8-6",
      "reviewFolder": "Planning forecasts",
      "ownerRoleId": "role-brand",
      "ownerLabel": "Brand Manager",
      "message": "The 10-day planning forecast landed in \"Planning forecasts\" and is waiting for review.",
      "id": "notif-mrbgmuf9-7",
      "createdAt": "2026-07-08T02:30:00.837Z",
      "read": false
    }
  ],
  "deliveries": [
    {
      "channel": "email",
      "recipientRoleId": "role-director",
      "recipientLabel": "Communications Director",
      "scheduleId": "sch-mrlfd4rg-38",
      "scheduleName": "Tamper proof digest",
      "reviewItemId": "rev-mrlfe2fp-39",
      "reviewFolder": "Communications Director review",
      "subject": "[Hub SSoT] Review requested — Tamper proof digest",
      "message": "A scheduled run of \"Tamper proof digest\" produced the draft \"Q1 2026 results summary — internal briefing\" in \"Communications Director review\". Open the review inbox to approve or edit it. Scheduled documents cannot be saved or exported until approved.",
      "id": "dlv-mrlfe2fu-42",
      "createdAt": "2026-07-15T01:52:53.466Z"
    },
    {
      "channel": "teams",
      "recipientRoleId": "role-director",
      "recipientLabel": "Communications Director",
      "scheduleId": "sch-mrlfd4rg-38",
      "scheduleName": "Tamper proof digest",
      "reviewItemId": "rev-mrlfe2fp-39",
      "reviewFolder": "Communications Director review",
      "subject": "Scheduled draft ready: Tamper proof digest",
      "message": "Hub SSoT: \"Tamper proof digest\" produced a new draft (\"Q1 2026 results summary — internal briefing\") and placed it in \"Communications Director review\". It is waiting for your review before it can be saved or exported.",
      "id": "dlv-mrlfe2ft-41",
      "createdAt": "2026-07-15T01:52:53.465Z"
    },
    {
      "channel": "email",
      "recipientRoleId": "role-director",
      "recipientLabel": "Communications Director",
      "scheduleId": "sch-mrlf5smy-31",
      "scheduleName": "Weekly results digest",
      "reviewItemId": "rev-mrlf6m5f-32",
      "reviewFolder": "Communications Director review",
      "subject": "[Hub SSoT] Review requested — Weekly results digest",
      "message": "A scheduled run of \"Weekly results digest\" produced the draft \"Q1 2026 results and network progress — weekly summary (Week 27)\" in \"Communications Director review\". Open the review inbox to approve or edit it. Scheduled documents cannot be saved or exported until approved.",
      "id": "dlv-mrlf6m5q-35",
      "createdAt": "2026-07-15T01:47:05.774Z"
    },
    {
      "channel": "teams",
      "recipientRoleId": "role-director",
      "recipientLabel": "Communications Director",
      "scheduleId": "sch-mrlf5smy-31",
      "scheduleName": "Weekly results digest",
      "reviewItemId": "rev-mrlf6m5f-32",
      "reviewFolder": "Communications Director review",
      "subject": "Scheduled draft ready: Weekly results digest",
      "message": "Hub SSoT: \"Weekly results digest\" produced a new draft (\"Q1 2026 results and network progress — weekly summary (Week 27)\") and placed it in \"Communications Director review\". It is waiting for your review before it can be saved or exported.",
      "id": "dlv-mrlf6m5p-34",
      "createdAt": "2026-07-15T01:47:05.773Z"
    }
  ],
  "publications": [
    {
      "reviewItemId": "rev-mre58pbk-17",
      "scheduleId": "sch-mre58pbj-16",
      "docId": "doc-live-pub-10-day-planning-forecast-7-jul-to-17-jul-v1",
      "version": 1,
      "contentHash": "2f054e7d69680ee688060779e8c57a67f759459f85eab69cfb3b02be00d06954",
      "id": "pub-20",
      "publishedAt": "2026-07-12T17:23:03.374Z"
    }
  ],
  "idCounter": 59
};
