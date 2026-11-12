/**
 * The editor's scale bar: an architectural (CAD) bar of alternating black and
 * white segments with tick labels in metres, drawn on a 2D canvas. The bar's
 * length follows the zoom, snapping to a round number of metres so it keeps a
 * sensible width on screen. The editor overlays it on the view and stamps it
 * on the thumbnail it saves.
 */

/** Round lengths (m) the bar snaps to, with the number of segments each splits into. */
const STEPS: readonly (readonly [length: number, segments: number])[] = [
  [5, 5],
  [10, 5],
  [25, 5],
  [50, 5],
  [100, 4],
  [200, 4],
  [500, 5],
  [1000, 4],
];

export interface ScaleBar {
  /** The bar's length in metres. */
  length: number;
  /** Alternating segments along it. */
  segments: number;
  /** The bar's width in canvas pixels. */
  pixels: number;
}

/** The longest round length whose bar fits in `maxPixels` (the shortest when none fits). */
export function chooseScaleBar(metresPerPixel: number, maxPixels: number): ScaleBar {
  let chosen = STEPS[0]!;
  for (const step of STEPS) {
    if (step[0] / metresPerPixel <= maxPixels) chosen = step;
  }
  return { length: chosen[0], segments: chosen[1], pixels: chosen[0] / metresPerPixel };
}

export interface ScaleBarText {
  /** The heading above the bar, e.g. "0 to 100 m". */
  heading: (length: number) => string;
  /** A tick label with its unit, for the last tick, e.g. "100 m". */
  metres: (value: number) => string;
}

export interface ScaleBarStyle {
  /** Size of one design pixel in canvas pixels (the device pixel ratio, or a thumbnail's scale). */
  unit: number;
  /** Bar height and heading/tick font sizes in design pixels. */
  barHeight: number;
  headingSize: number;
  tickSize: number;
}

export const EDITOR_SCALE_STYLE: ScaleBarStyle = { unit: 1, barHeight: 7, headingSize: 13, tickSize: 11 };
export const THUMBNAIL_SCALE_STYLE: ScaleBarStyle = { unit: 1, barHeight: 5, headingSize: 11, tickSize: 9 };

const INK = '#1d1710';
const PAPER = '#f4ead2';
const FONT = '"Pixelify Sans", system-ui, sans-serif';

/** A short tick number: whole metres, no unit. */
function tickNumber(value: number): string {
  return String(Math.round(value));
}

/** The box (canvas pixels) the bar with its heading and labels takes. */
export function scaleBarBox(bar: ScaleBar, style: ScaleBarStyle): { width: number; height: number } {
  const u = style.unit;
  const pad = 5 * u;
  // Room for the last label's unit past the bar's end.
  return {
    width: Math.ceil(bar.pixels + pad * 2 + style.tickSize * 2.2 * u),
    height: Math.ceil(pad * 2 + style.headingSize * u + 3 * u + style.barHeight * u + 2 * u + style.tickSize * u),
  };
}

/**
 * Draws the bar with its top-left corner at (x, y): a paper plate, the heading,
 * the bar (the first segment split finer, as on a CAD scale) and the ticks.
 */
export function drawScaleBar(context: CanvasRenderingContext2D, bar: ScaleBar, x: number, y: number, style: ScaleBarStyle, text: ScaleBarText): void {
  const u = style.unit;
  const pad = 5 * u;
  const box = scaleBarBox(bar, style);
  context.save();
  context.imageSmoothingEnabled = false;
  context.globalAlpha = 0.88;
  context.fillStyle = PAPER;
  context.fillRect(x, y, box.width, box.height);
  context.globalAlpha = 1;
  context.strokeStyle = INK;
  context.lineWidth = u;
  context.strokeRect(x + u / 2, y + u / 2, box.width - u, box.height - u);

  context.fillStyle = INK;
  context.textBaseline = 'top';
  context.font = `${style.headingSize * u}px ${FONT}`;
  context.textAlign = 'left';
  const left = Math.round(x + pad);
  context.fillText(text.heading(bar.length), left, y + pad);

  const barTop = Math.round(y + pad + style.headingSize * u + 3 * u);
  const barHeight = Math.round(style.barHeight * u);
  const segment = bar.pixels / bar.segments;
  for (let index = 0; index < bar.segments; index += 1) {
    const from = Math.round(left + segment * index);
    const to = Math.round(left + segment * (index + 1));
    if (index === 0 && segment >= 20 * u) {
      // The first segment in five finer alternating parts.
      for (let part = 0; part < 5; part += 1) {
        const a = Math.round(from + ((to - from) * part) / 5);
        const b = Math.round(from + ((to - from) * (part + 1)) / 5);
        context.fillStyle = part % 2 === 0 ? INK : PAPER;
        context.fillRect(a, barTop, b - a, Math.ceil(barHeight / 2));
        context.fillStyle = part % 2 === 0 ? PAPER : INK;
        context.fillRect(a, barTop + Math.ceil(barHeight / 2), b - a, barHeight - Math.ceil(barHeight / 2));
      }
    } else {
      context.fillStyle = index % 2 === 0 ? INK : '#ffffff';
      context.fillRect(from, barTop, to - from, barHeight);
    }
  }
  context.strokeStyle = INK;
  context.strokeRect(left + u / 2, barTop + u / 2, Math.round(bar.pixels) - u, barHeight - u);

  context.fillStyle = INK;
  context.font = `${style.tickSize * u}px ${FONT}`;
  const tickTop = barTop + barHeight + 2 * u;
  // Label every k-th tick so the numbers never run into each other; the last always.
  const widest = context.measureText(tickNumber(bar.length)).width + 4 * u;
  const every = Math.max(1, Math.ceil(widest / segment));
  for (let index = 0; index <= bar.segments; index += 1) {
    const last = index === bar.segments;
    if (!last && index !== 0 && (index % every !== 0 || bar.segments - index < every)) continue;
    const value = (bar.length * index) / bar.segments;
    const at = Math.round(left + segment * index);
    context.textAlign = index === 0 || last ? 'left' : 'center';
    const label = last ? text.metres(value) : tickNumber(value);
    // The last label starts half its number before the tick, so the unit trails past the bar.
    const shift = last ? context.measureText(tickNumber(value)).width / 2 : 0;
    context.fillText(label, at - shift, tickTop);
  }
  context.restore();
}
