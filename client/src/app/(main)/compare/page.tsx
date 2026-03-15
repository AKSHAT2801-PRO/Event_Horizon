"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { MeteorEvent } from "@/data/meteorEvents";
import EventSelector from "./components/EventSelector";
import SkyMap from "./components/SkyMap";
import OrbitalTable from "./components/OrbitalTable";
import VelocityChart from "./components/VelocityChart";
import ShowerAssociation from "./components/ShowerAssociation";
import Link from "next/link";

const ComparePage = () => {
  const [selected, setSelected] = useState<MeteorEvent[]>([]);

  const toggleEvent = (event: MeteorEvent) => {
    setSelected((prev) =>
      prev.some((e) => e.id === event.id)
        ? prev.filter((e) => e.id !== event.id)
        : prev.length < 5
          ? [...prev, event]
          : prev,
    );
  };

  const hasEnough = selected.length >= 2;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        {/* Back */}
        <Link
          href={"/"}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="font-mono text-sm tracking-wide">
            BACK TO CATALOG
          </span>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-12"
        >
          <span className="data-label">TELEMETRY COMPARISON</span>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter uppercase mt-2">
            COMPARE EVENTS.
          </h1>
          <p className="text-sm sm:text-base font-mono text-muted-foreground mt-3">
            SELECT 2–5 EVENTS TO COMPARE ORBITAL PARAMETERS, RADIANT POSITIONS,
            AND VELOCITY PROFILES.
          </p>
        </motion.div>

        {/* Event Selector */}
        <div className="mb-12">
          <span className="data-label mb-4 block">SELECT EVENTS</span>
          <EventSelector selected={selected} onToggle={toggleEvent} />
        </div>

        {/* Comparison Panels */}
        {hasEnough ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Sky Map */}
            <SkyMap events={selected} />

            {/* Orbital Elements Table */}
            <OrbitalTable events={selected} />

            {/* Velocity Profile Chart */}
            <VelocityChart events={selected} />

            {/* Shower Association */}
            <ShowerAssociation events={selected} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32"
          >
            <p className="text-2xl sm:text-4xl font-bold tracking-tighter text-muted-foreground">
              {selected.length === 0
                ? "SELECT AT LEAST TWO EVENTS TO BEGIN."
                : "SELECT ONE MORE EVENT TO COMPARE."}
            </p>
            <p className="text-sm font-mono text-muted-foreground/60 mt-4">
              USE THE SELECTOR ABOVE TO ADD EVENTS FROM THE CATALOG.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ComparePage;
