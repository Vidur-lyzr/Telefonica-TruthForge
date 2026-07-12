import React, { createContext, useContext, useMemo, useState } from "react";
import type { ProposedMetadata } from "@workspace/api-client-react";
import { useApp } from "../app-provider";
import { DATA_I18N } from "../../i18n/data";

export type ValidationAction = "approved" | "edited" | "rejected";

export interface UploadedDoc {
  id: string;
  title: string;
  source: string;
  owner: string;
  confidentiality: string;
  country: string;
  brand: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  target: string;
  detail: string;
  timestamp: string;
}

interface DataCenterState {
  // Validation queue resolutions
  resolvedValidations: Record<string, ValidationAction>;
  resolveValidation: (
    id: string,
    action: ValidationAction,
    target: string,
    detail: string,
  ) => void;

  // Conflict resolutions (kept fresh, retained old as historic)
  resolvedConflicts: Record<string, boolean>;
  resolveConflict: (id: string, target: string, detail: string) => void;

  // Quarantine releases
  releasedQuarantine: Record<string, boolean>;
  releaseQuarantine: (id: string, target: string, detail: string) => void;

  // Manual uploads
  uploads: UploadedDoc[];
  addUpload: (doc: UploadedDoc) => void;

  // Taxonomy-as-configuration re-classification runs
  reclassifyRuns: number;
  runReclassification: (detail: string) => void;

  // Activity feed (frames what feeds the platform audit trail)
  activity: ActivityEntry[];
}

const Ctx = createContext<DataCenterState | undefined>(undefined);

function nowIso() {
  return new Date().toISOString();
}

export function DataCenterProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useApp();
  const a = DATA_I18N[lang].activity;
  const [resolvedValidations, setResolvedValidations] = useState<
    Record<string, ValidationAction>
  >({});
  const [resolvedConflicts, setResolvedConflicts] = useState<Record<string, boolean>>({});
  const [releasedQuarantine, setReleasedQuarantine] = useState<Record<string, boolean>>({});
  const [uploads, setUploads] = useState<UploadedDoc[]>([]);
  const [reclassifyRuns, setReclassifyRuns] = useState(0);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  function pushActivity(action: string, target: string, detail: string) {
    setActivity((prev) => [
      { id: `act-${Date.now()}-${prev.length}`, action, target, detail, timestamp: nowIso() },
      ...prev,
    ]);
  }

  const value = useMemo<DataCenterState>(
    () => ({
      resolvedValidations,
      resolveValidation: (id, action, target, detail) => {
        setResolvedValidations((prev) => ({ ...prev, [id]: action }));
        const label =
          action === "approved"
            ? a.validatedClassification
            : action === "edited"
              ? a.correctedClassification
              : a.rejectedClassification;
        pushActivity(label, target, detail);
      },
      resolvedConflicts,
      resolveConflict: (id, target, detail) => {
        setResolvedConflicts((prev) => ({ ...prev, [id]: true }));
        setResolvedValidations((prev) => ({ ...prev, [id]: "edited" }));
        pushActivity(a.resolvedConflict, target, detail);
      },
      releasedQuarantine,
      releaseQuarantine: (id, target, detail) => {
        setReleasedQuarantine((prev) => ({ ...prev, [id]: true }));
        pushActivity(a.releasedFromQuarantine, target, detail);
      },
      uploads,
      addUpload: (doc) => {
        setUploads((prev) => [...prev, doc]);
        pushActivity(a.manualUpload, doc.title, a.addedViaForm(doc.source));
      },
      reclassifyRuns,
      runReclassification: (detail) => {
        setReclassifyRuns((n) => n + 1);
        pushActivity(a.reclassifiedCorpus, a.taxonomyConfiguration, detail);
      },
      activity,
    }),
    [resolvedValidations, resolvedConflicts, releasedQuarantine, uploads, reclassifyRuns, activity, a],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDataCenter() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDataCenter must be used within a DataCenterProvider");
  return ctx;
}

export type { ProposedMetadata };
