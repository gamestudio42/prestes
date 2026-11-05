export type {
  Command,
  CoverKind,
  CoverPoint,
  CommandEnvelope,
  Faction,
  FormationKind,
  Frame,
  OrderKind,
  OrderPath,
  Outcome,
  MoraleState,
  Posture,
  FireControl,
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
  TrainingPhaseSetup,
  WoundSeverity,
  Vec2,
  WorkerRequest,
  WorkerResponse,
} from './protocol';
export { ClientMirror, type InterpolatedFrame } from './mirror';

export {
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
  coverAgainst,
  coverForStance,
  isLineBlocked,
  isPointBlockedByCovers,
  isLineBlockedForMovement,
  isPointInCover,
} from './world';

export { findPath } from './pathfinding';

export {
  DEFAULT_WEAPON_ID,
  WEAPONS,
  getWeapon,
  reloadMagazine,
  totalRounds,
  TRAINING_AMMUNITION,
  validateWeapons,
  type HistoricalStatus,
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
  SANDBOX_TERRAIN,
  activeTerrainFeatures,
  setActiveTerrain,
  terrainCoverAgainst,
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
  isPointNearCover,
  PREVIEW_CONE_RADIUS,
  clampToRegion,
  lineFacing,
  lineFormationSlots,
  planOrderPreview,
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
