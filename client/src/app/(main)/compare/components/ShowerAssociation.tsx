import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, AlertTriangle, HelpCircle } from "lucide-react";
import type { MeteorEvent } from "@/data/meteorEvents";
import { estimateRadiant } from "@/data/orbitalElements";
import { IAU_SHOWERS, angularDistance } from "@/data/iauShowers";
import { getEventColor } from "./EventSelector";

interface ShowerAssociationProps {
  events: MeteorEvent[];
}

interface Association {
  showerCode: string;
  showerName: string;
  angDist: number;
  velDiff: number;
  confidence: "high" | "medium" | "low";
  parentBody: string;
}

function findAssociations(event: MeteorEvent): Association[] {
  const radiant = estimateRadiant(event);
  const associations: Association[] = [];

  for (const shower of IAU_SHOWERS) {
    const dist = angularDistance(radiant.ra, radiant.dec, shower.ra, shower.dec);
    const velDiff = Math.abs(event.velocity - shower.vg);

    if (dist < 20 && velDiff < 15) {
      let confidence: Association["confidence"] = "low";
      if (dist < 5 && velDiff < 3) confidence = "high";
      else if (dist < 10 && velDiff < 8) confidence = "medium";

      associations.push({
        showerCode: shower.code,
        showerName: shower.name,
        angDist: Math.round(dist * 10) / 10,
        velDiff: Math.round(velDiff * 10) / 10,
        confidence,
        parentBody: shower.parentBody,
      });
    }
  }

  return associations.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}

const confidenceStyles = {
  high: { icon: Check, label: "HIGH", className: "text-green-400 border-green-400/30 bg-green-400/10" },
  medium: { icon: AlertTriangle, label: "MEDIUM", className: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  low: { icon: HelpCircle, label: "LOW", className: "text-muted-foreground border-muted-foreground/30 bg-muted/30" },
};

const ShowerAssociation = ({ events }: ShowerAssociationProps) => {
  const results = useMemo(
    () => events.map((e) => ({ event: e, associations: findAssociations(e) })),
    [events]
  );

  return (
    <div className="w-full">
      <span className="data-label mb-3 block">IAU SHOWER ASSOCIATION — AUTOMATIC MATCHING</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map(({ event, associations }, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl bg-surface border border-border/50 p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 rounded-full" style={{ background: getEventColor(i) }} />
              <span className="font-bold text-sm" style={{ color: getEventColor(i) }}>
                {event.name}
              </span>
              <span className="data-label ml-auto">{event.shower}</span>
            </div>

            {associations.length > 0 ? (
              <div className="space-y-3">
                {associations.map((assoc) => {
                  const style = confidenceStyles[assoc.confidence];
                  const Icon = style.icon;
                  return (
                    <div
                      key={assoc.showerCode}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${style.className}`}
                    >
                      <Icon size={16} className="mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{assoc.showerName}</span>
                          <span className="data-label">{style.label}</span>
                        </div>
                        <div className="flex gap-4 mt-1">
                          <span className="data-label">Δα,δ: {assoc.angDist}°</span>
                          <span className="data-label">Δv: {assoc.velDiff} km/s</span>
                        </div>
                        <span className="data-label block mt-1">PARENT: {assoc.parentBody}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-xs font-mono">NO IAU SHOWER MATCH — LIKELY SPORADIC</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ShowerAssociation;
