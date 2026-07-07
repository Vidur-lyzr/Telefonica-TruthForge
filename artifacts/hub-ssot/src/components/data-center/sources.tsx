import React, { useMemo, useState } from "react";
import { useListDataSources } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Server,
  Filter,
  Upload,
  Settings2,
  Radio,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataCenter, type UploadedDoc } from "./state";
import { sourceStatusClass, sourceStatusLabel } from "./helpers";

const SOURCE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  live: Radio,
  filtered: Filter,
  manual: Upload,
  to_configure: Settings2,
};

const AREAS = ["Comunicación", "Marca", "Gabinete"];
const CLEARANCES = ["public", "internal", "confidential", "restricted"];

const emptyUpload = {
  title: "",
  owner: "",
  country: "Group",
  brand: "Telefónica",
  confidentiality: "internal",
  area: "Comunicación",
};

export default function SourcesArea() {
  const { data: sources } = useListDataSources();
  const { uploads, addUpload } = useDataCenter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState({ ...emptyUpload });

  const sessionUploadCount = uploads.length;

  const sourcesWithSession = useMemo(() => {
    return (sources ?? []).map((s) =>
      s.id === "src-manual"
        ? { ...s, docCount: s.docCount + sessionUploadCount }
        : s,
    );
  }, [sources, sessionUploadCount]);

  const draftValid = draft.title.trim().length > 0 && draft.owner.trim().length > 0;

  function commitUpload() {
    const doc: UploadedDoc = {
      id: `upload-${Date.now()}`,
      title: draft.title,
      source: "Manual upload",
      owner: draft.owner,
      confidentiality: draft.confidentiality,
      country: draft.country,
      brand: draft.brand,
    };
    addUpload(doc);
    setDraft({ ...emptyUpload });
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="bg-tf-navy text-white">
          <CardTitle className="flex items-center space-x-2 text-white text-lg">
            <Server className="w-5 h-5 text-tf-blue-light" />
            <span>Sources feed the core before the model ever runs</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Quality starts here, not at the model. External sources are filtered before ingestion —
            by keywords, tracked competitors, named executives and priority topics — so only relevant
            mentions ever enter the knowledge core. Internal documents arrive with the sensitivity
            label that becomes their governed confidentiality tier.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sourcesWithSession.map((s) => {
          const Icon = SOURCE_ICON[s.status] ?? Server;
          return (
            <Card key={s.id} className="shadow-sm border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-tf-blue-tint rounded-lg text-tf-blue">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-tf-navy text-lg">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">{s.type}</p>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "uppercase text-[10px] tracking-eyebrow rounded-full font-bold shrink-0",
                      sourceStatusClass(s.status),
                    )}
                  >
                    {sourceStatusLabel(s.status)}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>

                {s.externalFilter && s.filterNote && (
                  <div className="flex items-start space-x-2 rounded-lg bg-tf-blue-tint/50 border border-border p-3">
                    <Filter className="w-4 h-4 text-tf-blue mt-0.5 shrink-0" />
                    <p className="text-xs text-tf-navy font-medium">{s.filterNote}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 pt-1 border-t border-border">
                  <div className="pt-3">
                    <p className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Documents
                    </p>
                    <p className="font-bold text-tf-navy mt-0.5">
                      {s.docCount.toLocaleString("en-GB")}
                    </p>
                  </div>
                  <div className="pt-3">
                    <p className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Cadence
                    </p>
                    <p className="font-medium text-tf-navy mt-0.5 text-sm">{s.cadence}</p>
                  </div>
                  <div className="pt-3">
                    <p className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Last sync
                    </p>
                    <p className="font-medium text-tf-navy mt-0.5 text-sm">{s.lastSync ?? "—"}</p>
                  </div>
                </div>

                {s.status === "manual" && (
                  <Button
                    onClick={() => setDialogOpen(true)}
                    size="sm"
                    className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Manual upload
                  </Button>
                )}
                {s.status === "to_configure" && (
                  <div className="flex items-center space-x-2 text-tf-warning text-sm font-medium">
                    <Settings2 className="w-4 h-4" />
                    <span>Connector planned — no documents ingested yet.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {uploads.length > 0 && (
        <Card className="shadow-sm border-border">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="flex items-center space-x-2 text-tf-navy text-lg">
              <CheckCircle2 className="w-5 h-5 text-tf-success" />
              <span>Added this session</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-2">
            {uploads.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-semibold text-tf-navy">{u.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.owner} · {u.country} · {u.brand}
                  </p>
                </div>
                <Badge className="uppercase text-[10px] tracking-eyebrow rounded-full font-bold bg-tf-blue-tint text-tf-blue">
                  Queued to intake
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-tf-navy">Manual upload</DialogTitle>
            <DialogDescription>
              Mandatory metadata is captured up front so the document never enters the pipeline
              underspecified. This is session-only for the demo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="up-title">Title</Label>
              <Input
                id="up-title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Document title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="up-owner">Owner</Label>
              <Input
                id="up-owner"
                value={draft.owner}
                onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}
                placeholder="Owning team"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="up-country">Country</Label>
                <Input
                  id="up-country"
                  value={draft.country}
                  onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="up-brand">Brand</Label>
                <Input
                  id="up-brand"
                  value={draft.brand}
                  onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Confidentiality</Label>
                <Select
                  value={draft.confidentiality}
                  onValueChange={(v) => setDraft((d) => ({ ...d, confidentiality: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLEARANCES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Area</Label>
                <Select
                  value={draft.area}
                  onValueChange={(v) => setDraft((d) => ({ ...d, area: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-pill font-semibold"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold"
              disabled={!draftValid}
              onClick={commitUpload}
            >
              Add to intake
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
