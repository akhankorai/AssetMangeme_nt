export function formatDate(value) {
  if (!value) {
    return "Pending schedule";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatQuantity(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return "0";
  }
  if (Math.abs(amount % 1) < 0.000001) {
    return String(Math.trunc(amount));
  }
  return amount.toFixed(2);
}

export function formatPersonDisplayName(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const isAllUpper = text === text.toUpperCase();
  if (!isAllUpper) {
    return text;
  }
  return text
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}


