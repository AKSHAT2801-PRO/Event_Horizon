"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(d: Date) {
  return `${d.getDate().toString().padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function CalendarMonth({
  year,
  month,
  range,
  hovered,
  onHover,
  onSelect,
}: {
  year: number;
  month: number;
  range: DateRange;
  hovered: Date | null;
  onHover: (d: Date | null) => void;
  onSelect: (d: Date) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(year, month, i + 1),
    ),
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const effectiveTo = range.from && !range.to && hovered ? hovered : range.to;

  const inRange = (d: Date) => {
    if (!range.from || !effectiveTo) return false;
    const [start, end] =
      range.from <= effectiveTo
        ? [range.from, effectiveTo]
        : [effectiveTo, range.from];
    return d > start && d < end;
  };

  const isFrom = (d: Date) => !!range.from && isSameDay(d, range.from);
  const isTo = (d: Date) => !!effectiveTo && isSameDay(d, effectiveTo);

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center font-mono text-[10px] tracking-widest text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Date grid */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const from = isFrom(date);
          const to = isTo(date);
          const mid = inRange(date);
          const selected = from || to;
          return (
            <button
              key={i}
              onClick={() => onSelect(date)}
              onMouseEnter={() => onHover(date)}
              onMouseLeave={() => onHover(null)}
              className={`
                relative h-8 w-full font-mono text-xs transition-colors
                ${selected ? "text-background font-bold z-10" : mid ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
              `}
            >
              {/* range fill */}
              {mid && (
                <span className="absolute inset-y-0 inset-x-0 bg-foreground/10 pointer-events-none" />
              )}
              {/* cap fills for start/end */}
              {from && !to && (
                <span className="absolute inset-y-0 right-0 left-1/2 bg-foreground/10 pointer-events-none" />
              )}
              {to && !from && (
                <span className="absolute inset-y-0 left-0 right-1/2 bg-foreground/10 pointer-events-none" />
              )}
              {from &&
                to &&
                isSameDay(date, range.from!) &&
                !isSameDay(range.from!, effectiveTo!) && (
                  <span className="absolute inset-y-0 right-0 left-1/2 bg-foreground/10 pointer-events-none" />
                )}
              {to && range.from && !isSameDay(range.from, effectiveTo!) && (
                <span className="absolute inset-y-0 left-0 right-1/2 bg-foreground/10 pointer-events-none" />
              )}
              {/* dot/circle for selected */}
              <span
                className={`
                  relative z-10 inline-flex items-center justify-center w-7 h-7 rounded-full
                  ${selected ? "bg-foreground text-background" : ""}
                `}
              >
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hovered, setHovered] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  // second calendar = next month
  const nextMonthVal = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYearVal = viewMonth === 11 ? viewYear + 1 : viewYear;

  const handleSelect = (date: Date) => {
    if (!value.from || (value.from && value.to)) {
      // start fresh selection
      onChange({ from: date, to: null });
    } else {
      // complete the range
      if (date < value.from) {
        onChange({ from: date, to: value.from });
      } else {
        onChange({ from: value.from, to: date });
      }
      setOpen(false);
    }
  };

  const clear = () => {
    onChange({ from: null, to: null });
    setOpen(false);
  };

  const hasValue = value.from || value.to;

  const triggerLabel = () => {
    if (!value.from && !value.to) return "SELECT DATE RANGE";
    if (value.from && !value.to) return `FROM ${formatDate(value.from)} →`;
    if (value.from && value.to)
      return `${formatDate(value.from)} — ${formatDate(value.to)}`;
    return "SELECT DATE RANGE";
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`
            font-mono text-xs tracking-widest px-4 py-2.5
            border transition-colors
            ${
              hasValue
                ? "border-foreground text-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }
          `}
        >
          {triggerLabel()}
        </button>
        {hasValue && (
          <button
            onClick={clear}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear date range"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="
              absolute top-full mt-2 left-0 z-50
              bg-background border border-border
              p-5 w-max
            "
          >
            {/* Nav header */}
            <div className="flex items-center justify-between mb-4 gap-8">
              <button
                onClick={prevMonth}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-8">
                <span className="font-mono text-xs tracking-widest">
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <span className="font-mono text-xs tracking-widest">
                  {MONTHS[nextMonthVal]} {nextYearVal}
                </span>
              </div>
              <button
                onClick={nextMonth}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Two-month grid */}
            <div className="flex gap-8">
              <CalendarMonth
                year={viewYear}
                month={viewMonth}
                range={value}
                hovered={hovered}
                onHover={setHovered}
                onSelect={handleSelect}
              />
              <div className="w-px bg-border" />
              <CalendarMonth
                year={nextYearVal}
                month={nextMonthVal}
                range={value}
                hovered={hovered}
                onHover={setHovered}
                onSelect={handleSelect}
              />
            </div>

            {/* Footer hint */}
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground mt-4 text-center">
              {!value.from
                ? "CLICK TO SET START DATE"
                : !value.to
                  ? "CLICK TO SET END DATE"
                  : `${formatDate(value.from)} — ${formatDate(value.to)}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
