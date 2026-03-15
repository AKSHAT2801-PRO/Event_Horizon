import { useMemo } from "react";
import { motion } from "framer-motion";
import type { MeteorEvent } from "@/data/meteorEvents";
import { generateVelocityProfile } from "@/data/orbitalElements";
import { getEventColor } from "./EventSelector";

interface VelocityChartProps {
  events: MeteorEvent[];
}

const VelocityChart = ({ events }: VelocityChartProps) => {
  const profiles = useMemo(
    () => events.map((e) => ({ event: e, data: generateVelocityProfile(e) })),
    [events]
  );

  const width = 600;
  const height = 350;
  const pad = { top: 30, right: 30, bottom: 50, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  // Find ranges
  const allVels = profiles.flatMap((p) => p.data.map((d) => d.velocity));
  const allAlts = profiles.flatMap((p) => p.data.map((d) => d.altitude));
  const minVel = 0;
  const maxVel = Math.ceil(Math.max(...allVels) / 10) * 10;
  const minAlt = Math.floor(Math.min(...allAlts) / 10) * 10;
  const maxAlt = Math.ceil(Math.max(...allAlts) / 10) * 10;

  const scaleX = (v: number) => pad.left + ((v - minVel) / (maxVel - minVel)) * plotW;
  const scaleY = (a: number) => pad.top + plotH - ((a - minAlt) / (maxAlt - minAlt)) * plotH;

  // Grid
  const xTicks = Array.from({ length: 6 }, (_, i) => minVel + (i * (maxVel - minVel)) / 5);
  const yTicks = Array.from({ length: 6 }, (_, i) => minAlt + (i * (maxAlt - minAlt)) / 5);

  return (
    <div className="w-full">
      <span className="data-label mb-3 block">VELOCITY PROFILES — ALTITUDE VS VELOCITY</span>
      <div className="rounded-2xl bg-surface border border-border/50 p-4 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid */}
          {xTicks.map((v) => (
            <g key={`x-${v}`}>
              <line x1={scaleX(v)} y1={pad.top} x2={scaleX(v)} y2={pad.top + plotH} stroke="hsl(240, 10%, 14%)" strokeWidth={0.5} />
              <text x={scaleX(v)} y={height - 10} fill="hsl(240, 5%, 35%)" fontSize={9} fontFamily="monospace" textAnchor="middle">
                {Math.round(v)}
              </text>
            </g>
          ))}
          {yTicks.map((a) => (
            <g key={`y-${a}`}>
              <line x1={pad.left} y1={scaleY(a)} x2={pad.left + plotW} y2={scaleY(a)} stroke="hsl(240, 10%, 14%)" strokeWidth={0.5} />
              <text x={pad.left - 8} y={scaleY(a) + 3} fill="hsl(240, 5%, 35%)" fontSize={9} fontFamily="monospace" textAnchor="end">
                {Math.round(a)}
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={width / 2} y={height - 0} fill="hsl(240, 5%, 40%)" fontSize={10} fontFamily="monospace" textAnchor="middle">
            VELOCITY (KM/S)
          </text>
          <text
            x={12} y={height / 2}
            fill="hsl(240, 5%, 40%)" fontSize={10} fontFamily="monospace"
            textAnchor="middle"
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            ALTITUDE (KM)
          </text>

          {/* Profiles */}
          {profiles.map(({ event, data }, i) => {
            const color = getEventColor(i);
            const d = data.map((p, j) => `${j === 0 ? "M" : "L"}${scaleX(p.velocity)},${scaleY(p.altitude)}`).join(" ");
            return (
              <g key={event.id}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, delay: i * 0.2 }}
                />
                {/* Start marker */}
                <circle cx={scaleX(data[0].velocity)} cy={scaleY(data[0].altitude)} r={4} fill={color} />
                {/* End marker */}
                <circle cx={scaleX(data[data.length - 1].velocity)} cy={scaleY(data[data.length - 1].altitude)} r={3} fill={color} opacity={0.5} />
                {/* Label at start */}
                <text
                  x={scaleX(data[0].velocity) + 6}
                  y={scaleY(data[0].altitude) - 8}
                  fill={color}
                  fontSize={8}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {event.name.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 px-2">
          {events.map((event, i) => (
            <div key={event.id} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: getEventColor(i) }} />
              <span className="text-[10px] font-mono tracking-wide" style={{ color: getEventColor(i) }}>
                {event.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VelocityChart;
