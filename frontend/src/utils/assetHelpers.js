export function buildPriority(status) {
  if (status === "maintenance") {
    return "Critical";
  }

  if (status === "assigned") {
    return "Medium";
  }

  return "Low";
}

export function statusLabel(status) {
  if (!status) {
    return "All statuses";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function parseAssetNotes(notes) {
  const text = notes || "";
  const warrantyMatch = text.match(/Warranty Expiry:\s*([^|]+)/i);
  const meterMatch = text.match(/Meter Reading:\s*([^|]+)/i);
  return {
    warranty_expiry: warrantyMatch ? warrantyMatch[1].trim() : "",
    meter_reading: meterMatch ? meterMatch[1].trim() : "",
  };
}

export function buildCategoryPrefix(categoryName = "ASSET") {
  const categoryPrefixSource = String(categoryName || "ASSET").trim().toUpperCase();
  const categoryWords = categoryPrefixSource.split(/[^A-Z0-9]+/).filter(Boolean);

  return (
    (categoryWords.length > 1
      ? categoryWords
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
      : categoryPrefixSource.replace(/[^A-Z0-9]+/g, "").slice(0, 2)) || "AS"
  );
}

export function extractAssetIdentifierParts(name, categoryName = "") {
  const categoryWords = String(categoryName || "")
    .trim()
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  const nameParts = String(name || "")
    .toUpperCase()
    .split(/[\s|/_,]+/)
    .map((part) => part.replace(/[^A-Z0-9-]+/g, "").replace(/^-+|-+$/g, ""))
    .filter(Boolean);

  return Array.from(
    new Set(
      nameParts
        .filter((part) => /\d/.test(part))
        .filter((part) => !categoryWords.includes(part))
        .map((part) => part.slice(0, 12)),
    ),
  ).slice(0, 2);
}

export function buildAssetTagFromValues({ name = "", categoryName = "ASSET", existingTag = "" }) {
  const categoryPrefix = buildCategoryPrefix(categoryName);
  const vehicleIdentifiers = extractAssetIdentifierParts(name, categoryName);
  const fallbackName = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);
  const readableSegment = vehicleIdentifiers.join("-") || fallbackName || "ASSET";
  const preservedSuffixMatch = String(existingTag || "").toUpperCase().match(/-(\\d{4,})$/);
  const suffix = preservedSuffixMatch?.[1] || Date.now().toString().slice(-6);
  return `${categoryPrefix}-${readableSegment}-${suffix}`;
}

export function buildDraftFromAsset(asset) {
  const parsedNotes = parseAssetNotes(asset?.notes);
  return {
    id: asset?.id ?? null,
    name: asset?.name || "",
    category_name: "Tractor",
    location_name: asset?.location_name || "",
    purchase_date: asset?.purchase_date || "",
    warranty_expiry: parsedNotes.warranty_expiry,
    meter_reading: parsedNotes.meter_reading,
  };
}
