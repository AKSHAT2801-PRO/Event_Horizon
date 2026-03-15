import { motion } from "framer-motion";
import type { MeteorEvent } from "@/data/meteorEvents";
import { computeOrbitalElements } from "@/data/orbitalElements";
import { getEventColor } from "./EventSelector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrbitalTableProps {
  events: MeteorEvent[];
}

const ELEMENTS = [
  { key: "semiMajorAxis", label: "a (AU)", desc: "Semi-major axis" },
  { key: "eccentricity", label: "e", desc: "Eccentricity" },
  { key: "inclination", label: "i (°)", desc: "Inclination" },
  { key: "perihelion", label: "q (AU)", desc: "Perihelion" },
  { key: "aphelion", label: "Q (AU)", desc: "Aphelion" },
  { key: "argPerihelion", label: "ω (°)", desc: "Arg. perihelion" },
  { key: "longAscNode", label: "Ω (°)", desc: "Long. asc. node" },
] as const;

const OrbitalTable = ({ events }: OrbitalTableProps) => {
  const allElements = events.map((e) => computeOrbitalElements(e));

  return (
    <div className="w-full">
      <span className="data-label mb-3 block">KEPLERIAN ORBITAL ELEMENTS</span>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-surface border border-border/50 overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border/30">
              <TableHead className="font-mono text-[10px] tracking-widest text-muted-foreground w-40">
                ELEMENT
              </TableHead>
              {events.map((event, i) => (
                <TableHead
                  key={event.id}
                  className="font-mono text-[10px] tracking-widest"
                  style={{ color: getEventColor(i) }}
                >
                  {event.name.split(" ").slice(0, 2).join(" ").toUpperCase()}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ELEMENTS.map((el) => (
              <TableRow
                key={el.key}
                className="border-border/20 hover:bg-surface-elevated/50"
              >
                <TableCell className="py-3">
                  <span className="font-mono text-xs font-bold">
                    {el.label}
                  </span>
                  <span className="block data-label mt-0.5">{el.desc}</span>
                </TableCell>
                {allElements.map((oe, i) => (
                  <TableCell
                    key={events[i].id}
                    className="font-mono text-sm tabular-nums"
                    style={{ color: getEventColor(i) }}
                  >
                    {oe[el.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
};

export default OrbitalTable;
