import type { Vec2 } from '../protocol';

/** add-map-objectives: a circular objective area as a 16-gon, every 22.5 degrees, rounded to 0.1 m. */
export function objectiveCircle(centre: Vec2, radius: number): Vec2[] {
  return Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { x: Math.round((centre.x + Math.cos(angle) * radius) * 10) / 10, y: Math.round((centre.y + Math.sin(angle) * radius) * 10) / 10 };
  });
}
