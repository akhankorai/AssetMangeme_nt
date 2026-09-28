export function todayInputValue() {
  return dateToInputValue(new Date());
}

export function monthInputValue(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

export function dateToInputValue(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseInputDate(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function formatCompactDate(value) {
  const parsed = parseInputDate(value);
  if (!parsed) {
    return "--/--/----";
  }

  return parsed.toLocaleDateString("en-GB");
}

export function addDaysDateKey(dateKey, days) {
  const parsed = parseInputDate(dateKey);
  if (!parsed) {
    return "";
  }
  parsed.setDate(parsed.getDate() + days);
  return dateToInputValue(parsed);
}

export function addDaysToDate(value, days) {
  if (!value || !Number.isFinite(days)) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString();
}

export function monthLabel(value) {
  return value.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function addMonths(value, months) {
  return new Date(value.getFullYear(), value.getMonth() + months, 1);
}

export function monthRange(value) {
  if (!value) {
    return { start: "", end: "" };
  }

  const [year, month] = String(value).split("-").map(Number);
  if (!year || !month) {
    return { start: "", end: "" };
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: dateToInputValue(start),
    end: dateToInputValue(end),
  };
}

export function buildMonthDays(value) {
  const firstDay = new Date(value.getFullYear(), value.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(value.getFullYear(), value.getMonth(), 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index);
    return {
      value: dateToInputValue(cellDate),
      day: cellDate.getDate(),
      inMonth: cellDate.getMonth() === value.getMonth(),
    };
  });
}

export function matchesReportPeriod(value, dateFrom, dateTo) {
  if (!dateFrom || !dateTo) {
    return true;
  }
  if (!value) {
    return true;
  }

  const parsedValue = parseInputDate(String(value).slice(0, 10)) || new Date(value);
  const parsedFrom = parseInputDate(dateFrom) || new Date(dateFrom);
  const parsedTo = parseInputDate(dateTo) || new Date(dateTo);
  if (Number.isNaN(parsedValue.getTime()) || Number.isNaN(parsedFrom.getTime()) || Number.isNaN(parsedTo.getTime())) {
    return false;
  }

  const valueText = dateToInputValue(parsedValue);
  const fromText = dateToInputValue(parsedFrom);
  const toText = dateToInputValue(parsedTo);
  return valueText >= fromText && valueText <= toText;
}
