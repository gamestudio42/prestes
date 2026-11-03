export const VISION_CONE_DEGREES = 65;
export const VISION_HALF_ANGLE = VISION_CONE_DEGREES / 2;

export interface VisionObserver {
  x: number;
  y: number;
  facingX: number;
  facingY: number;
}

export interface VisionPoint {
  x: number;
  y: number;
}

export function isPointInVision(
  observer: VisionObserver,
  point: VisionPoint,
  halfAngleDegrees = VISION_HALF_ANGLE,
): boolean {
  const dx = point.x - observer.x;
  const dy = point.y - observer.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 0.001) {
    return true;
  }
  const facingLength = Math.sqrt(
    observer.facingX * observer.facingX + observer.facingY * observer.facingY,
  );
  if (facingLength < 0.001) {
    return true;
  }
  const dot =
    (dx / distance) * (observer.facingX / facingLength) +
    (dy / distance) * (observer.facingY / facingLength);
  return dot >= Math.cos((halfAngleDegrees * Math.PI) / 180);
}
