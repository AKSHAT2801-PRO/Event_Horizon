import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { MeteorEvent } from "@/data/meteorEvents";
import PrimaryButton from "./ui/primary-button";
import { useRouter } from "next/navigation";

interface EventDetailProps {
  event: MeteorEvent | null;
  onClose: () => void;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-baseline py-3 border-b border-foreground/5">
    <span className="data-label">{label}</span>
    <span className="text-lg font-mono tabular-nums">{value}</span>
  </div>
);

const EventDetail = ({ event, onClose }: EventDetailProps) => {
  const router = useRouter();
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "hsl(240 20% 6% / 0.85)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-2xl rounded-xl p-8 sm:p-10 relative"
            style={{
              background: "hsl(var(--surface))",
              outline: "1px solid hsl(0 0% 100% / 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 h-12 w-12 rounded-full border border-foreground/10 flex items-center justify-center hover:bg-foreground hover:text-background transition-all"
            >
              <X size={20} />
            </button>

            <span className="data-label">TELEMETRY OVERLAY</span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tighter mt-2 mb-8">
              {event.name}
            </h2>

            <div className="mb-6">
              <span className="data-label">PEAK MAGNITUDE</span>
              <p className="text-6xl sm:text-8xl font-bold font-mono tabular-nums tracking-tighter text-primary mt-1">
                {event.peakMagnitude > 0 ? "+" : ""}
                {event.peakMagnitude.toFixed(1)}
              </p>
            </div>

            <div className="space-y-0">
              <Row label="DATE" value={event.date} />
              <Row
                label="VELOCITY"
                value={`${event.velocity.toFixed(2)} KM/S`}
              />
              <Row label="ALTITUDE" value={`${event.altitude.toFixed(1)} KM`} />
              <Row label="DURATION" value={`${event.duration.toFixed(1)} S`} />
              <Row label="MASS" value={`${event.mass.toLocaleString()} G`} />
              <Row label="REGION" value={event.region.toUpperCase()} />
              <Row label="NETWORK" value={event.network.toUpperCase()} />
              <Row label="SHOWER" value={event.shower.toUpperCase()} />
              <Row
                label="COORDINATES"
                value={`${event.lat.toFixed(2)}° / ${event.lng.toFixed(2)}°`}
              />
            </div>
            <PrimaryButton
              onClick={() => router.push(`/playground?event=${event.id}`)}
            >
              Open in Playground
            </PrimaryButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EventDetail;
