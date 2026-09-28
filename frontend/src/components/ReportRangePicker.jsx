import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange } from "lucide-react";
import { parseInputDate, buildMonthDays, addMonths, monthLabel, formatCompactDate } from "../utils/dateHelpers";

export default function ReportRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}) {
  const pickerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => parseInputDate(dateFrom) || new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectingEnd(false);
      return undefined;
    }

    function handlePointerDown(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    const nextCursor = parseInputDate(dateFrom);
    if (nextCursor) {
      setMonthCursor(new Date(nextCursor.getFullYear(), nextCursor.getMonth(), 1));
    }
  }, [dateFrom]);

  const days = useMemo(() => buildMonthDays(monthCursor), [monthCursor]);

  function handleSelect(dayValue) {
    if (!selectingEnd) {
      onDateFromChange(dayValue);
      onDateToChange(dayValue);
      setSelectingEnd(true);
      return;
    }

    if (dayValue < dateFrom) {
      onDateFromChange(dayValue);
      onDateToChange(dateFrom);
    } else {
      onDateToChange(dayValue);
    }

    setSelectingEnd(false);
    setOpen(false);
  }

  return (
    <div className="reportRangePicker" ref={pickerRef}>
      <button className="reportDateRangeButton" type="button" onClick={() => setOpen((current) => !current)}>
        <CalendarRange size={16} />
        <span>{formatCompactDate(dateFrom)} - {formatCompactDate(dateTo)}</span>
      </button>

      {open ? (
        <div className="reportCalendarPopover">
          <div className="reportCalendarHeader">
            <button type="button" onClick={() => setMonthCursor((current) => addMonths(current, -1))}>
              {"<"}
            </button>
            <strong>{monthLabel(monthCursor)}</strong>
            <button type="button" onClick={() => setMonthCursor((current) => addMonths(current, 1))}>
              {">"}
            </button>
          </div>
          <div className="reportCalendarWeekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="reportCalendarGrid">
            {days.map((day) => {
              const isStart = day.value === dateFrom;
              const isEnd = day.value === dateTo;
              const inRange = day.value >= dateFrom && day.value <= dateTo;
              return (
                <button
                  key={day.value}
                  className={[
                    "reportCalendarDay",
                    day.inMonth ? "" : "muted",
                    inRange ? "inRange" : "",
                    isStart ? "rangeStart" : "",
                    isEnd ? "rangeEnd" : "",
                  ].filter(Boolean).join(" ")}
                  type="button"
                  onClick={() => handleSelect(day.value)}
                >
                  {day.day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
