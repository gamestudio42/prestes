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
  setActiveMapRuntime,
  vegetationAt,
  waterAt,
  type MapRuntime,
} from './runtime';
export {
  concealmentDistance,
  cropBlocksLine,
  CROP_SIGHT_DEPTH,
  REVEAL_TICKS,
  RUNNING_FACTOR,
  VEGETATION,
} from './concealment';
export { battleMap, battleMaps, DEFAULT_BATTLE_MAP, setActiveMap } from './catalog';
export { distanceToPolyline, pointInPolygon, rectangle } from './geometry';
export { VILA_MILITAR } from './vila-militar';
export { FAZENDA } from './fazenda';
export { SERRA_RIO } from './serra-rio';
export { BAIRRO } from './bairro';
export { MIN_DEPLOYMENT_GAP, validateBattleMap } from './validate';
export { sameCovers } from './cover-index';
