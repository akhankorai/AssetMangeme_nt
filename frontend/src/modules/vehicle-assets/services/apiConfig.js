export const VEHICLE_ASSETS_MODULE_KEY = "vehicle-assets";

export const VEHICLE_ASSETS_API_BASE_URL =
  import.meta.env.VITE_VEHICLE_ASSETS_API_BASE_URL ?? "/external-vehicle-api";

export const VEHICLE_ASSETS_AUTH_ENDPOINT =
  import.meta.env.VITE_VEHICLE_ASSETS_AUTH_ENDPOINT ?? "/api/TokenAuth/Authenticate";

export const VEHICLE_ASSETS_API_BEARER_TOKEN =
  import.meta.env.VITE_VEHICLE_ASSETS_API_BEARER_TOKEN ?? "";

export const VEHICLE_ASSETS_API_USERNAME =
  import.meta.env.VITE_VEHICLE_ASSETS_API_USERNAME ?? "";

export const VEHICLE_ASSETS_API_PASSWORD =
  import.meta.env.VITE_VEHICLE_ASSETS_API_PASSWORD ?? "";

export const VEHICLE_ASSETS_ENDPOINTS = {
  listAssets: "/api/services/app/AssetRegistrations/GetAll",
};

export const VEHICLE_ASSETS_DEPARTMENT = "Vehicle Assets";
