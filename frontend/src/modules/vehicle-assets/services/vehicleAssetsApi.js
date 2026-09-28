import { createModuleApi } from "../../shared/createModuleApi";
import { VEHICLE_ASSETS_ENDPOINTS, VEHICLE_ASSETS_MODULE_KEY } from "./apiConfig";

const moduleApi = createModuleApi(VEHICLE_ASSETS_MODULE_KEY);

export function createVehicleAssetsApi() {
  return {
    ...moduleApi,
    listAssets: (options) => moduleApi.listAssets(options),
    getAssets: (options) => moduleApi.listAssets(options),
    endpoints: VEHICLE_ASSETS_ENDPOINTS,
  };
}
