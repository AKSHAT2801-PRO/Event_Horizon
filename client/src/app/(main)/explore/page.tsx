"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
import MeteorCard from "@/components/MeteorCard";
import EventDetail from "@/components/EventDetail";
import PlaygroundButton from "@/components/PlaygroundButton";
import { METEOR_EVENTS, FILTERS, type MeteorEvent } from "@/data/meteorEvents";
import CompareNavButton from "@/components/CompareNavButton";
import {
  getEventRegions,
  getEventShowers,
  getMeteorEvents,
} from "@/lib/api/meteor";
import { Popover } from "@radix-ui/react-popover";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

const ITEMS_PER_PAGE = 10; // adjust to match your backend's page size

const Index = () => {
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<MeteorEvent | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filteredData, setFilteredData] = useState<MeteorEvent[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({
    shower: "All",
    region: "All",
    network: "All",
  });
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [regions, setRegions] = useState<string[]>(["All"]);
  const [showers, setShowers] = useState<string[]>(["All"]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const FILTER_CATEGORIES = [
    { key: "shower", label: "SHOWER", options: showers },
    { key: "region", label: "REGION", options: regions },
  ] as const;

  const toggleFilter = (category: string, value: string) => {
    // Reset to page 1 whenever filters change
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, [category]: value }));
  };

  // Reset page when search or date filters change
  const handleSearchChange = (value: string) => {
    setCurrentPage(1);
    setSearch(value);
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setCurrentPage(1);
    setDateFrom(date);
  };

  const handleDateToChange = (date: Date | undefined) => {
    setCurrentPage(1);
    setDateTo(date);
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const result = await getMeteorEvents({
        page: currentPage,
        searchString: search,
        filters: {
          shower: filters.shower,
          region: filters.region,
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
        },
      });

      if (result) {
        setFilteredData(result);
        // If your API returns total count/pages, update totalPages here.
        // Example: setTotalPages(result.totalPages);
        // For now we derive it from result length vs page size:
        if (result.length < ITEMS_PER_PAGE && currentPage === 1) {
          setTotalPages(1);
        } else if (result.length < ITEMS_PER_PAGE) {
          setTotalPages(currentPage);
        } else {
          // There may be more pages; keep totalPages at least currentPage + 1
          setTotalPages((prev) => Math.max(prev, currentPage + 1));
        }
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [search, filters, dateFrom, dateTo, currentPage]);

  useEffect(() => {
    const loadRegions = async () => {
      const res = await getEventRegions();
      if (res) setRegions(["All", ...res]);
    };
    const loadShowers = async () => {
      const res = await getEventShowers();
      if (res) setShowers(["All", ...res]);
    };

    loadRegions();
    loadShowers();
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Build visible page numbers (show up to 5 around current)
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const delta = 2;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4"
        >
          <span className="data-label">TEAM - EVENT HORIZON</span>
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

        {/* Explore Button */}
        <div className="w-full my-4 flex justify-center items-center">
          <CompareNavButton />
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input pl-12"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <button
            onClick={() => setFiltersOpen((p) => !p)}
            className="data-label flex items-center gap-3 hover:opacity-70 transition text-3xl"
          >
            FILTERS
            <span className="font-mono text-xl">{filtersOpen ? "▲" : "▼"}</span>
          </button>

          <motion.div
            initial={false}
            animate={{
              height: filtersOpen ? "auto" : 0,
              opacity: filtersOpen ? 1 : 0,
            }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-6 space-y-6">
              {/* Chip filters */}
              {FILTER_CATEGORIES.map((cat) => (
                <div key={cat.key}>
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

              {/* Date Range Filter */}
              <div className="mb-6">
                <span className="data-label mb-3 block">DATE RANGE</span>
                <div className="flex flex-wrap gap-3 items-stretch">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-56 py-10 justify-center text-left font-mono text-sm border-border bg-card hover:bg-secondary px-4 pl-1",
                          !dateFrom && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "yyyy-MM-dd") : "FROM"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={handleDateFromChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                        defaultMonth={dateFrom ?? new Date()}
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-56 py-10 justify-center text-left font-mono text-sm border-border bg-card hover:bg-secondary px-4 pl-1",
                          !dateFrom && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "yyyy-MM-dd") : "TO"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={handleDateToChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                        defaultMonth={dateTo ?? new Date()}
                      />
                    </PopoverContent>
                  </Popover>

                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => {
                        handleDateFromChange(undefined);
                        handleDateToChange(undefined);
                      }}
                      className="filter-chip whitespace-nowrap text-xs"
                    >
                      CLEAR DATES
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Results count */}
        <div className="my-8 flex items-center justify-between">
          <span className="data-label">
            {filteredData.length} EVENT{filteredData.length !== 1 ? "S" : ""}{" "}
            DETECTED
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            PAGE {currentPage} / {totalPages}
          </span>
        </div>

        {/* Event Grid */}
        {filteredData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredData.map((event, i) => (
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

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-12 flex items-center justify-center gap-2 font-mono"
          >
            {/* Prev */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center justify-center w-10 h-10 border border-border bg-card hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((page, idx) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-10 h-10 flex items-center justify-center text-muted-foreground text-sm"
                >
                  …
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page as number)}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center border text-sm transition",
                    currentPage === page
                      ? "border-foreground bg-foreground text-background font-bold"
                      : "border-border bg-card hover:bg-secondary text-foreground",
                  )}
                  aria-label={`Page ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              ),
            )}

            {/* Next */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center w-10 h-10 border border-border bg-card hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
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
