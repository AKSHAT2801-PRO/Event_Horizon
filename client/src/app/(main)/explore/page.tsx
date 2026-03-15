"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import MeteorCard from "@/components/MeteorCard";
import EventDetail from "@/components/EventDetail";
import PlaygroundButton from "@/components/PlaygroundButton";
import { METEOR_EVENTS, FILTERS, type MeteorEvent } from "@/data/meteorEvents";

const FILTER_CATEGORIES = [
  { key: "shower", label: "SHOWER", options: FILTERS.shower },
  { key: "region", label: "REGION", options: FILTERS.region },
  { key: "network", label: "NETWORK", options: FILTERS.network },
] as const;

const Index = () => {
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<MeteorEvent | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({
    shower: "All",
    region: "All",
    network: "All",
  });

  const toggleFilter = (category: string, value: string) => {
    setFilters((prev) => ({ ...prev, [category]: value }));
  };

  const filtered = useMemo(() => {
    return METEOR_EVENTS.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.region.toLowerCase().includes(q) ||
        e.shower.toLowerCase().includes(q) ||
        e.network.toLowerCase().includes(q) ||
        e.date.includes(q);

      const matchShower =
        filters.shower === "All" || e.shower === filters.shower;
      const matchRegion =
        filters.region === "All" || e.region === filters.region;
      const matchNetwork =
        filters.network === "All" || e.network === filters.network;

      return matchSearch && matchShower && matchRegion && matchNetwork;
    });
  }, [search, filters]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4"
        >
          <span className="data-label">BOLIDE CATALOG</span>
          <h1 className="text-5xl sm:text-7xl md:text-9xl font-bold tracking-tighter uppercase mt-2">
            BROWSE THE VOID.
          </h1>
          <p className="text-sm sm:text-base font-mono text-muted-foreground mt-3">
            {METEOR_EVENTS.length} EVENTS DETECTED. ALL SYSTEMS NOMINAL.
          </p>
        </motion.div>

        {/* Playground Button */}
        <div className="my-8 sm:my-12">
          <PlaygroundButton />
        </div>

        {/* Search */}
        <div className="min-h-[20vh] flex items-end mb-8 sm:mb-12">
          <div className="w-full relative">
            <Search
              className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={32}
            />
            <input
              type="text"
              placeholder="SEARCH EVENTS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input pl-12"
            />
          </div>
        </div>

        {/* Filters */}
        {FILTER_CATEGORIES.map((cat) => (
          <div key={cat.key} className="mb-6">
            <span className="data-label mb-3 block">{cat.label}</span>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {cat.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleFilter(cat.key, opt)}
                  className={`filter-chip whitespace-nowrap ${
                    filters[cat.key] === opt ? "active" : ""
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Results count */}
        <div className="my-8">
          <span className="data-label">
            {filtered.length} EVENT{filtered.length !== 1 ? "S" : ""} DETECTED
          </span>
        </div>

        {/* Event Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filtered.map((event, i) => (
              <MeteorCard
                key={event.id}
                event={event}
                index={i}
                onSelect={setSelectedEvent}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32"
          >
            <p className="text-2xl sm:text-4xl font-bold tracking-tighter text-muted-foreground">
              NO IMPACTS DETECTED IN THIS SECTOR.
            </p>
          </motion.div>
        )}
      </div>

      {/* Event Detail Overlay */}
      <EventDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};

export default Index;
