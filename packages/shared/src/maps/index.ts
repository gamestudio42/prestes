export * from './types';
export {
  activeMapRuntime,
  bakeMap,
  bridgePolygon,
  FERRY_CAPACITY,
  FERRY_CROSSING_TICKS,
  FERRY_PATH_PENALTY,
  FORD_DEPTH,
  HEIGHT_SPACING,
  isDeepWater,
  PATH_GRID,
  runtimeHeightAt,
  runtimeSurfaceAt,
  runtimeVegetationAt,
  runtimeWaterAt,
  SURFACES,
  VEGETATION_KINDS,
  setActiveMapRuntime,
  vegetationAt,
  waterAt,
  BRIDGE_RAMP,
  bridgeDeckHeight,
  bridgeLandings,
  bridgePoint,
  runtimeBridgeDeckAt,
  runtimeBridgeLandings,
  type MapRuntime,
} from './runtime';
export {
  concealmentDistance,
  cropBlocksLine,
  CROP_SIGHT_DEPTH,
  REVEAL_RADIUS,
  REVEAL_TICKS,
  RUNNING_FACTOR,
  VEGETATION,
} from './concealment';
export {
  authoredMapIds,
  loadAuthoredMap,
  battleMap,
  battleMaps,
  DEFAULT_BATTLE_MAP,
  hasBattleMap,
  registerBattleMap,
  setActiveMap,
  unregisterBattleMap,
} from './catalog';
export * from './sizes';
export * from './raster';
export * from './ground-materials';
export * from './catalog-objects';
export * from './document';
export * from './trench-lines';
export * from './water-outline';
export * from './tree-scatter';
export * from './cover-preview';
export * from './deployment-areas';
export { growableCell, growthMask, maskedVegetation, plantableAt } from './growth-mask';
export { distanceToPolyline, pointInPolygon, rectangle } from './geometry';
export { VILA_MILITAR } from './vila-militar';
export { FAZENDA } from './fazenda';
export { SERRA_RIO } from './serra-rio';
export { BAIRRO } from './bairro';
export { MIN_DEPLOYMENT_GAP, MIN_WALKABLE_AREA_SHARE, validateBattleMap, validateDeploymentAreas, walkableShare } from './validate';
export { sameCovers } from './cover-index';
export * from './validate-document';
