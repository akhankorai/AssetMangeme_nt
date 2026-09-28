import cleaningModule from "./cleaning";
import electricalToolsModule from "./electrical-tools";
import feedingModule from "./feeding";
import furnitureModule from "./furniture";
import informationTechnologyModule from "./information-technology";
import paintToolsModule from "./paint-tools";
import plumbingToolsModule from "./plumbing-tools";
import shedFansModule from "./shed-fans";
import vehicleAssetsModule from "./vehicle-assets";
import weldingToolsModule from "./welding-tools";

export const assetModules = [
  vehicleAssetsModule,
  informationTechnologyModule,
  feedingModule,
  cleaningModule,
  shedFansModule,
  electricalToolsModule,
  paintToolsModule,
  plumbingToolsModule,
  weldingToolsModule,
  furnitureModule,
];
export const systemModules = [
  { key: "system", label: "System Operations" },
];

export const defaultAssetModule = assetModules[0];

export function findAssetModule(moduleKey) {
  return assetModules.find((moduleDefinition) => moduleDefinition.key === moduleKey) ?? defaultAssetModule;
}
