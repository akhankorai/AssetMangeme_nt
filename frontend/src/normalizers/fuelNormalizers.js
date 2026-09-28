export function normalizeFuelDemand(entry) {
  const previousMeterValue = entry.previousMeterReading ?? entry.previous_meter_reading;
  const distanceValue = entry.distanceTravelled ?? entry.distance_travelled;
  const averageValue = entry.averageDistancePerLiter ?? entry.average_distance_per_liter;
  return {
    id: entry.id,
    formatted_id: entry.formatted_id || "",
    assetTag: entry.assetTag || entry.asset_tag || "",
    assetName: entry.assetName || entry.asset_name || "",
    requestDate: entry.requestDate || entry.request_date || "",
    station: entry.station || "",
    fuelItemId: entry.fuelItemId ?? entry.fuel_item ?? null,
    fuelItemName: entry.fuelItemName || entry.fuel_item_name || "",
    liters: Number(entry.liters || 0),
    unitPrice: Number(entry.unitPrice || entry.unit_price || 0),
    totalCost: Number(entry.totalCost || entry.total_cost || 0),
    meterReading: Number(entry.meterReading || entry.meter_reading || 0),
    previousMeterReading: previousMeterValue == null ? null : Number(previousMeterValue),
    distanceTravelled: distanceValue == null ? null : Number(distanceValue),
    averageDistancePerLiter: averageValue == null ? null : Number(averageValue),
    status: entry.status || "requested",
    inspectionCompleted: Boolean(entry.inspectionCompleted ?? entry.inspection_completed ?? false),
    allocatedAt: entry.allocatedAt || entry.allocated_at || "",
    notes: entry.notes || "",
    createdAt: entry.createdAt || entry.created_at || "",
    updatedAt: entry.updatedAt || entry.updated_at || "",
  };
}
