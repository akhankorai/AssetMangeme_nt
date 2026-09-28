import { createVehicleAssetsApi } from "./services/vehicleAssetsApi";

const vehicleAssetsModule = {
  key: "vehicle-assets",
  label: "Vehicle Assets",
  api: createVehicleAssetsApi(),
};

export default vehicleAssetsModule;
