import { useEffect, useRef } from 'react';

/** Eight sepia tones from shadow to highlight, matching the pixel kit. */
const SEPIA: readonly (readonly [number, number, number])[] = [
  [18, 13, 8],
  [42, 31, 20],
  [68, 51, 33],
  [98, 76, 50],
  [133, 106, 72],
  [169, 140, 99],
  [205, 180, 136],
  [239, 226, 196],
];

/** 4 x 4 Bayer matrix for ordered dithering. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * Draws a photograph as pixel art: scaled down to `width` pixels, mapped to
 * the eight sepia tones with ordered dithering, and shown scaled up with
 * nearest-neighbour sampling. The source image is unchanged; only the drawing
 * is pixelated.
 */
export function PixelPhoto({ src, width = 320, className }: { src: string; width?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const image = new Image();
    image.decoding = 'async';
    let cancelled = false;
    image.onload = () => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas || image.naturalWidth === 0) return;
      const height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * width));
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.imageSmoothingEnabled = true;
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height);
      const data = pixels.data;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const luma = (0.299 * data[index]! + 0.587 * data[index + 1]! + 0.114 * data[index + 2]!) / 255;
          // Ordered dither: nudge the level by the Bayer threshold before rounding.
          const threshold = (BAYER[(y % 4) * 4 + (x % 4)]! + 0.5) / 16 - 0.5;
          const level = Math.max(0, Math.min(SEPIA.length - 1, Math.round(luma * (SEPIA.length - 1) + threshold)));
          const tone = SEPIA[level]!;
          data[index] = tone[0];
          data[index + 1] = tone[1];
          data[index + 2] = tone[2];
        }
      }
      context.putImageData(pixels, 0, 0);
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, width]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
