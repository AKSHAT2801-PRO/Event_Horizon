import { motion } from "framer-motion";
import type { MeteorEvent } from "@/data/meteorEvents";

const transition = { type: "spring" as const, stiffness: 300, damping: 30 };

interface MeteorCardProps {
  event: MeteorEvent;
  index: number;
  onSelect: (event: MeteorEvent) => void;
}

const MeteorCard = ({ event, index, onSelect }: MeteorCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition, delay: index * 0.05 }}
      className="meteor-card p-6 sm:p-8 flex flex-col justify-between"
      onClick={() => onSelect(event)}
    >
      <div>
        <span className="data-label">PEAK MAGNITUDE</span>
        <p className="text-5xl sm:text-6xl font-bold font-mono tabular-nums tracking-tighter text-primary mt-1">
          {event.peakMagnitude > 0 ? "+" : ""}{event.peakMagnitude.toFixed(1)}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <span className="data-label">EVENT</span>
          <p className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">{event.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="data-label">VELOCITY</span>
            <p className="text-lg font-mono tabular-nums">{event.velocity.toFixed(1)} KM/S</p>
          </div>
          <div>
            <span className="data-label">ALTITUDE</span>
            <p className="text-lg font-mono tabular-nums">{event.altitude.toFixed(1)} KM</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="data-label">REGION</span>
            <p className="text-sm font-semibold uppercase tracking-wide">{event.region}</p>
          </div>
          <div>
            <span className="data-label">DATE</span>
            <p className="text-sm font-mono tabular-nums">{event.date}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <span className="text-[10px] uppercase tracking-[0.15em] font-mono px-3 py-1 rounded-full border border-foreground/10">
            {event.shower}
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] font-mono px-3 py-1 rounded-full border border-foreground/10">
            {event.network}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default MeteorCard;
