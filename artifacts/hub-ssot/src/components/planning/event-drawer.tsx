import React from "react";
import { useGetPlanningEvent, type StrategicAxis } from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Lock, TriangleAlert, MapPin, User, Radio } from "lucide-react";
import { axisColor, axisName, formatDay, STATUS_STYLE, TYPE_LABEL } from "./utils";

export function EventDrawer({
  eventId,
  axes,
  onClose,
}: {
  eventId: string | null;
  axes: StrategicAxis[] | undefined;
  onClose: () => void;
}) {
  const { roleId } = useApp();
  const { data, isLoading } = useGetPlanningEvent(
    { id: eventId ?? "", roleId },
    {
      query: {
        enabled: !!eventId && !!roleId,
        queryKey: ["planning-event", eventId, roleId],
      },
    },
  );

  const ev = data?.event;

  return (
    <Drawer open={!!eventId} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-2xl px-6 pb-8 pt-4">
          {isLoading && (
            <div className="py-16 text-center text-muted-foreground">Loading event…</div>
          )}

          {ev && ev.restricted && (
            <>
              <DrawerHeader className="px-0">
                <div className="flex items-center space-x-2 text-tf-error mb-2">
                  <Lock className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-eyebrow font-bold">Restricted</span>
                </div>
                <DrawerTitle className="text-2xl font-bold text-tf-navy">
                  Blocked activity
                </DrawerTitle>
                <DrawerDescription className="text-base mt-1">
                  {formatDay(ev.startDate)}
                  {ev.endDate !== ev.startDate ? ` – ${formatDay(ev.endDate)}` : ""} · {ev.market}
                </DrawerDescription>
              </DrawerHeader>
              <div className="bg-tf-error-bg text-foreground p-6 rounded-xl leading-relaxed">
                There is activity in this slot, but it is classified{" "}
                <span className="font-bold">{ev.confidentiality}</span> — above your current
                clearance. The Hub shows the slot as busy without revealing its contents. Switch to a
                higher-clearance persona or request access.
              </div>
            </>
          )}

          {ev && !ev.restricted && (
            <>
              <DrawerHeader className="px-0">
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="text-white font-bold px-3 py-1 rounded-pill text-xs uppercase tracking-eyebrow"
                    style={{ backgroundColor: axisColor(axes, ev.axisId) }}
                  >
                    {TYPE_LABEL[ev.type] ?? ev.type}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      className={`uppercase tracking-eyebrow text-[10px] ${
                        STATUS_STYLE[ev.status]?.className ?? ""
                      }`}
                    >
                      {STATUS_STYLE[ev.status]?.label ?? ev.status}
                    </Badge>
                    <Badge
                      variant={ev.confidentiality === "public" ? "secondary" : "destructive"}
                      className="uppercase tracking-eyebrow text-[10px]"
                    >
                      {ev.confidentiality}
                    </Badge>
                  </div>
                </div>
                <DrawerTitle className="text-2xl font-bold text-tf-navy mt-2">
                  {ev.title}
                </DrawerTitle>
                <DrawerDescription className="text-base mt-1">
                  {formatDay(ev.startDate)}
                  {ev.endDate !== ev.startDate ? ` – ${formatDay(ev.endDate)}` : ""}
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-6 mt-4">
                <p className="text-foreground text-lg leading-relaxed">{ev.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Meta icon={MapPin} label="Market">
                    {ev.market}
                  </Meta>
                  <Meta icon={Radio} label="Brand">
                    {ev.brand}
                  </Meta>
                  <Meta icon={User} label="Owner">
                    {ev.owner}
                  </Meta>
                  <Meta label="Source">{ev.source}</Meta>
                  <Meta label="Area">{ev.area}</Meta>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Axis
                    </div>
                    <div className="flex items-center space-x-2 font-medium text-sm">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: axisColor(axes, ev.axisId) }}
                      />
                      <span>{axisName(axes, ev.axisId)}</span>
                    </div>
                  </div>
                </div>

                {data && data.conflictsWith.length > 0 && (
                  <div className="bg-tf-warning-bg border border-tf-warning/20 p-5 rounded-xl">
                    <div className="flex items-center space-x-2 text-tf-warning mb-3">
                      <TriangleAlert className="w-5 h-5" />
                      <span className="text-xs uppercase tracking-eyebrow font-bold">
                        Timing conflict
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-3">
                      This clashes in the same market and window with:
                    </p>
                    <ul className="space-y-2">
                      {data.conflictsWith.map((c) => (
                        <li key={c.id} className="text-sm font-medium text-foreground">
                          {c.title}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({c.brand} · {TYPE_LABEL[c.type] ?? c.type})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center space-x-1.5 font-medium text-sm">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        <span>{children}</span>
      </div>
    </div>
  );
}
