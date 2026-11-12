/**
 * add-map-compass: where true north points on screen.
 *
 * The camera looks along the ground direction f = (-sin yaw, -cos yaw) from
 * `tilt` above the horizon, with screen right r = (cos yaw, -sin yaw). A
 * ground direction d shows on screen at (d·r, (d·f) sin tilt): the view
 * foreshortens what runs into the screen. True north is `north` degrees
 * clockwise from the grid's top edge, so d·f = cos(north + yaw) and
 * d·r = sin(north + yaw). Presentation only: no Three.js, no simulation state.
 *
 * Returns degrees clockwise from screen up, in [0, 360).
 */
export function compassAngle(north: number, yawRadians: number, tiltRadians = Math.PI / 2): number {
  const heading = (north * Math.PI) / 180 + yawRadians;
  const degrees = (Math.atan2(Math.sin(heading), Math.cos(heading) * Math.sin(tiltRadians)) * 180) / Math.PI;
  const wrapped = ((degrees % 360) + 360) % 360;
  return wrapped >= 360 - 1e-9 ? 0 : wrapped;
}
