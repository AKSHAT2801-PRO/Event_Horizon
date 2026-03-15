import { useMemo } from "react";
import { motion } from "framer-motion";
import type { MeteorEvent } from "@/data/meteorEvents";
import { estimateRadiant } from "@/data/orbitalElements";
import { getEventColor } from "./EventSelector";

interface SkyMapProps {
  events: MeteorEvent[];
}

const SkyMap = ({ events }: SkyMapProps) => {
  const width = 600;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 170;

  const radiants = useMemo(
    () => events.map((e) => ({ ...estimateRadiant(e), event: e })),
    [events]
  );

  // Stereographic projection (centered at dec=0, ra=180)
  const project = (ra: number, dec: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const lambda = toRad(ra - 180);
    const phi = toRad(dec);
    const k = 1 / (1 + Math.cos(phi) * Math.cos(lambda));
    const x = cx + radius * k * Math.cos(phi) * Math.sin(lambda) * 0.8;
    const y = cy - radius * k * Math.sin(phi) * 0.8;
    return { x, y };
  };

  // Grid lines
  const raLines = Array.from({ length: 12 }, (_, i) => i * 30);
  const decLines = [-60, -30, 0, 30, 60];

  return (
    <div className="w-full">
      <span className="data-label mb-3 block">RADIANT SKY MAP — STEREOGRAPHIC PROJECTION</span>
      <div className="rounded-2xl bg-surface border border-border/50 p-4 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Background */}
          <circle cx={cx} cy={cy} r={radius + 20} fill="hsl(240, 20%, 4%)" />
          <circle cx={cx} cy={cy} r={radius + 20} fill="none" stroke="hsl(240, 10%, 15%)" strokeWidth={1} />

          {/* Dec grid circles */}
          {decLines.map((dec) => {
            const pts = raLines.map((ra) => project(ra, dec));
            const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
            return (
              <path key={`dec-${dec}`} d={d} fill="none" stroke="hsl(240, 10%, 14%)" strokeWidth={0.5} />
            );
          })}

          {/* RA grid lines */}
          {raLines.map((ra) => {
            const pts = [-80, -40, 0, 40, 80].map((dec) => project(ra, dec));
            const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
            return (
              <path key={`ra-${ra}`} d={d} fill="none" stroke="hsl(240, 10%, 14%)" strokeWidth={0.5} />
            );
          })}

          {/* Equator */}
          {(() => {
            const pts = Array.from({ length: 36 }, (_, i) => project(i * 10, 0));
            const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
            return <path d={d} fill="none" stroke="hsl(240, 10%, 22%)" strokeWidth={1} strokeDasharray="4 4" />;
          })()}

          {/* RA labels */}
          {[0, 90, 180, 270].map((ra) => {
            const p = project(ra, 5);
            return (
              <text key={`label-${ra}`} x={p.x} y={p.y} fill="hsl(240, 5%, 35%)" fontSize={9} fontFamily="monospace" textAnchor="middle">
                {ra}°
              </text>
            );
          })}

          {/* Event radiants */}
          {radiants.map(({ ra, dec, event }, i) => {
            const p = project(ra, dec);
            const color = getEventColor(i);
            return (
              <g key={event.id}>
                {/* Glow */}
                <motion.circle
                  cx={p.x} cy={p.y} r={18}
                  fill={color}
                  opacity={0.08}
                  initial={{ r: 8 }}
                  animate={{ r: 18 }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                />
                {/* Dot */}
                <motion.circle
                  cx={p.x} cy={p.y} r={6}
                  fill={color}
                  stroke="hsl(240, 20%, 4%)"
                  strokeWidth={2}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                />
                {/* Label */}
                <text
                  x={p.x + 10} y={p.y - 10}
                  fill={color}
                  fontSize={8}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {event.name.split(" ")[0]}
                </text>
                <text
                  x={p.x + 10} y={p.y + 2}
                  fill="hsl(240, 5%, 45%)"
                  fontSize={7}
                  fontFamily="monospace"
                >
                  α{ra.toFixed(0)}° δ{dec > 0 ? "+" : ""}{dec.toFixed(0)}°
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default SkyMap;
