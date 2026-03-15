import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronDown } from "lucide-react";
import { METEOR_EVENTS, type MeteorEvent } from "@/data/meteorEvents";

const EVENT_COLORS = [
  "hsl(190, 60%, 55%)", // cyan
  "hsl(340, 80%, 60%)", // magenta
  "hsl(45, 90%, 55%)", // amber
  "hsl(140, 60%, 50%)", // green
  "hsl(270, 60%, 60%)", // purple
];

interface EventSelectorProps {
  selected: MeteorEvent[];
  onToggle: (event: MeteorEvent) => void;
  maxEvents?: number;
}

export function getEventColor(index: number): string {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

const EventSelector = ({
  selected,
  onToggle,
  maxEvents = 5,
}: EventSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Selected events */}
      <div className="flex flex-wrap gap-3">
        {selected.map((event, i) => (
          <motion.button
            key={event.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex items-center gap-3 px-5 py-3 rounded-full border-2 font-bold text-sm tracking-wide transition-colors"
            style={{
              borderColor: getEventColor(i),
              color: getEventColor(i),
              background: `${getEventColor(i)}15`,
            }}
            onClick={() => onToggle(event)}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: getEventColor(i) }}
            />
            {event.name}
            <X size={14} />
          </motion.button>
        ))}

        {selected.length < maxEvents && (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-5 py-3 rounded-full border-2 border-dashed border-muted-foreground/30 text-muted-foreground font-bold text-sm tracking-wide hover:border-primary hover:text-primary transition-colors"
          >
            <Plus size={16} />
            ADD EVENT
            <ChevronDown
              size={14}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 rounded-2xl bg-surface border border-border/50 max-h-[300px] overflow-y-auto">
              {METEOR_EVENTS.map((event) => {
                const isSelected = selected.some((s) => s.id === event.id);
                return (
                  <button
                    key={event.id}
                    onClick={() => {
                      onToggle(event);
                      if (!isSelected && selected.length + 1 >= maxEvents)
                        setOpen(false);
                    }}
                    disabled={isSelected}
                    className={`text-left p-4 rounded-xl transition-all ${
                      isSelected
                        ? "opacity-30 cursor-not-allowed"
                        : "hover:bg-surface-elevated cursor-pointer"
                    }`}
                  >
                    <p className="font-bold text-sm">{event.name}</p>
                    <p className="data-label mt-1">
                      {event.date} · {event.shower} · {event.velocity} KM/S
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventSelector;
