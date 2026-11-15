export type {
  BattleEventState,
  BattlePhase,
  Command,
  CoverKind,
  CoverPoint,
  CommandEnvelope,
  Faction,
  FormationKind,
  AssaultSnapshot,
  Frame,
  GarrisonSnapshot,
  OrderKind,
  OrderPath,
  Outcome,
  DecidedBy,
  ObjectiveSnapshot,
  QueuedOrderSnapshot,
  MoraleState,
  Posture,
  FireControl,
  GunState,
  PortLike,
  RejectionReason,
  RosterRecord,
  SightObstacle,
  SimEvent,
  SoldierState,
  Stance,
  TacticalOrder,
  UnitKind,
  UnitOrder,
  UnitRole,
  UnitSnapshot,
  AreaFireDisc,
  TrainingPhaseSetup,
  WoundSeverity,
  Vec2,
  BattleRosters,
  WorkerRequest,
  WorkerResponse,
} from './protocol';
export { shotShown, DEFAULT_TIME_LIMIT, TIME_LIMITS } from './protocol';
export { ClientMirror, type InterpolatedFrame } from './mirror';

export {
  BATTLE_COVERS,
  BOOTCAMP_COVERS,
  COVER_POINTS,
  FIRE_RANGE,
  EYE_HEIGHTS,
  SIGHT_BLOCK_HEIGHT,
  TRAINING_SIGHT_OBSTACLES,
  BUILDINGS,
  buildingCover,
  type Building,
  type BuildingModel,
  eyeHeightForStance,
  firstSightBlocker,
  MAP_BOUNDS,
  MAX_HP,
  MAX_MORALE,
  closeQuartersFactor,
  coverAxes,
  coverAgainst,
  coverForStance,
  isLineBlocked,
  isPointBlockedByCovers,
  isLineBlockedForMovement,
  isLineOnWire,
  isPointInCover,
  isPointOnWire,
  WIRE_SPEED,
} from './world';

export { crossesDeepWater, findPath, isWalkable, nearestWalkable, WIRE_PATH_DETOUR } from './pathfinding';
export { nearestOpenPointOn, routeFor, sectionRoutes } from './section-routes';
export * from './maps';

export {
  DEFAULT_WEAPON_ID,
  WEAPONS,
  getWeapon,
  reloadMagazine,
  totalRounds,
  TRAINING_AMMUNITION,
  trainingLoad,
  validateWeapons,
  type BurstProfile,
  type FireMode,
  type HistoricalStatus,
  type TrainingLoad,
  type WeaponId,
  type WeaponKind,
  type WeaponProfile,
} from './weapons';

export {
  CRITICAL_MORALE,
  PANIC_MORALE,
  PINNED_MORALE,
  PINNED_SUPPRESSION,
  SUPPRESSED_MORALE,
  SUPPRESSION_DECAY,
  SUPPRESSION_THRESHOLD,
  moraleStateFor,
} from './morale';

export {
  RIDGE_COVER,
  SANDBOX_TERRAIN,
  activeTerrainFeatures,
  surfaceSpeed,
  setActiveTerrain,
  terrainCoverAgainst,
  groundHeightAt,
  terrainHeightAt,
  terrainSlopeAt,
  terrainSpeedFactor,
  terrainSurfaceAt,
  type TerrainFeature,
  type TerrainKind,
  type TerrainSurface,
} from './terrain';

export {
  DEFEND_REGION_RADIUS,
  DEFAULT_SPACING,
  MAX_SPACING,
  MIN_SPACING,
  SPACING_FULL_DRAG,
  clampSpacing,
  dragSpacing,
  PREVIEW_CONE_DEGREES,
  averageAim,
  averageFacing,
  nearestKnownEnemyAt,
  isPointNearCover,
  PREVIEW_CONE_RADIUS,
  clampToRegion,
  lineFacing,
  lineFormationSlots,
  planOrderPreview,
  planQueuedRoutes,
  framedAt,
  type PreviewCone,
  type PreviewPath,
  type PreviewPlan,
  type PreviewRequest,
} from './preview';


export { formationSlots } from './preview';

export {
  VISION_CONE_DEGREES,
  VISION_HALF_ANGLE,
  isPointInVision,
  type VisionObserver,
  type VisionPoint,
} from './vision';

export { nearestTargetGroups, spreadTargetGroups, type TargetableUnit } from './targeting';
export {
  allCoverSlots,
  cachedCoverSlots,
  coverSlotById,
  coverSlotsNear,
  SLOT_ROOM,
  coverAtPoint,
  coverSlotView,
  coverSlots,
  pickSlots,
  planCoverSlots,
  slotGuards,
  type CoverSlot,
  type CoverSlotPlan,
  type CoverSlotView,
  type SlotMarker,
  type SlotPickOptions,
} from './cover-slots';

export { normaliseRotation, rotateOffset, troopFormationOffsets } from './placement';
export { matchDestinations, minCostAssignment } from './assignment';
export {
  STATION_OFFSETS,
  TRAINING_BUILDINGS,
  TRAINING_FENCES,
  TRAINING_GROUND,
  TRAINING_PROPS,
  TRAINING_STATIONS,
  TRAINING_TERRAIN,
  TRAINING_TREES,
  stationPoint,
  trainingStation,
} from './training-ground';
export type {
  TrainingBuilding,
  TrainingBuildingModel,
  TrainingProp,
  TrainingPropKind,
  TrainingStation,
  TrainingStationId,
} from './training-ground';
export {
  BASE_UNIT_SPEED,
  CLIP_GAIT_SPEED,
  GAIT_ACCELERATION,
  GAIT_FATIGUE,
  GAIT_SPEED,
  ORDER_GAIT,
  POSTURE_PACE,
  STANCE_PACE,
  WINDED_FATIGUE,
  WOUND_PACE,
  WINDED_RECOVER,
} from './gait';
export type { Gait } from './gait';
export { FogView, GHOST_TICKS, MARKER_SHOW_TICKS } from './fog-view';
export type { FogExtras, FogGhost, FogMarker } from './fog-view';

export * from './sections';
export * from './bands';
export * from './armies';
export * from './deploy-roster';
export * from './artillery';
