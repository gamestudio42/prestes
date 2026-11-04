import { describe, expect, it } from 'vitest';
import {
  STATION_OFFSETS,
  TRAINING_GROUND,
  TRAINING_STATIONS,
  allCoverSlots,
  findPath,
  isPointBlockedByCovers,
  stationPoint,
} from '../src/index';
import { isInsidePathGrid } from '../src/pathfinding';

const covers = TRAINING_GROUND.covers;

describe('training ground', () => {
  it('lists the seven stations in course order', () => {
    expect(TRAINING_STATIONS.map((station) => station.id)).toEqual([
      'formation',
      'fire',
      'maneuver',
      'defense',
      'recon',
      'wounded',
      'final',
    ]);
  });

  it('keeps every cover and station point inside the path grid', () => {
    for (const cover of covers) {
      // Footprint plus the slot offset (rotations here are small).
      const reachX = cover.halfWidth + 1.5;
      const reachY = cover.halfDepth + 1.5;
      expect(isInsidePathGrid(cover.x - reachX, cover.y - reachY), `cover ${cover.id}`).toBe(true);
      expect(isInsidePathGrid(cover.x + reachX, cover.y + reachY), `cover ${cover.id}`).toBe(true);
    }
    for (const station of TRAINING_STATIONS) {
      for (const offset of Object.values(STATION_OFFSETS)) {
        const point = stationPoint(station.id, offset);
        expect(isInsidePathGrid(point.x, point.y), `${station.id} ${JSON.stringify(offset)}`).toBe(true);
      }
    }
  });

  it('opens every station entry and reaches its training line', () => {
    for (const station of TRAINING_STATIONS) {
      expect(isPointBlockedByCovers(station.entry.x, station.entry.y, covers, 0.8), station.id).toBe(false);
      const line = stationPoint(station.id, STATION_OFFSETS.line);
      expect(findPath(station.entry, line, covers).length, `${station.id} entry to line`).toBeGreaterThan(0);
    }
  });

  it('keeps the stations apart', () => {
    for (const [index, left] of TRAINING_STATIONS.entries()) {
      for (const right of TRAINING_STATIONS.slice(index + 1)) {
        const gap = Math.sqrt((left.entry.x - right.entry.x) ** 2 + (left.entry.y - right.entry.y) ** 2);
        expect(gap, `${left.id} / ${right.id}`).toBeGreaterThan(30);
      }
    }
  });

  it('offers cover slots on its walls, trenches and buildings', () => {
    expect(allCoverSlots(covers).length).toBeGreaterThan(100);
  });
});
