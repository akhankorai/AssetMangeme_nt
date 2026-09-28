import { createModuleApi } from "../shared/createModuleApi";

const feedingModule = {
  key: "feeding",
  label: "Feeding",
  api: createModuleApi("feeding"),
};

export default feedingModule;
