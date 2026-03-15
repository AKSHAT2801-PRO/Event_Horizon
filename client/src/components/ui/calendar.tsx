import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useDayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function YearMonthCaption({
  calendarMonth,
}: {
  calendarMonth: { date: Date };
}) {
  const { goToMonth } = useDayPicker();
  const month = calendarMonth.date;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 201 }, (_, i) => currentYear - 100 + i);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(e.target.value, 10));
    goToMonth(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(month);
    newDate.setMonth(parseInt(e.target.value, 10));
    goToMonth(newDate);
  };

  return (
    <div className="flex justify-center items-center gap-1 w-full pt-1">
      <select
        value={month.getMonth()}
        onChange={handleMonthChange}
        className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer hover:opacity-70 transition-opacity"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i}>
            {new Date(2000, i).toLocaleString("default", { month: "long" })}
          </option>
        ))}
      </select>
      <select
        value={month.getFullYear()}
        onChange={handleYearChange}
        className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer hover:opacity-70 transition-opacity"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        nav: "absolute right-1 top-1 flex items-center gap-1 z-99",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-secondary border-border p-0 opacity-100 hover:opacity-70 hover:bg-secondary cursor-pointer",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-secondary border-border p-0 opacity-100 hover:opacity-70 hover:bg-secondary cursor-pointer",
        ),
        caption_label: "text-sm font-medium",
        month_grid: "w-full border-collapse",
        weekdays: "flex justify-between w-full",
        weekday:
          "text-muted-foreground w-9 font-normal text-[0.8rem] text-center",
        weeks: "flex flex-col gap-1 mt-2",
        week: "flex justify-between w-full",
        day: "w-9 h-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        today: "",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) =>
          orientation === "left" ? (
            <ChevronLeft {...props} className="h-4 w-4" />
          ) : (
            <ChevronRight {...props} className="h-4 w-4" />
          ),
        MonthCaption: YearMonthCaption,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
