import { useEffect, useRef } from 'react';

/**
 * The main menu backdrop: a column marching along a road at dusk, drawn as
 * pixel art at 320 x 180 and scaled up without smoothing. Everything is drawn
 * in code (no image assets): a dithered sepia sky, two layers of hills, the
 * road, two ranks of soldiers with kepis and rifles at the shoulder, a flag
 * bearer and the dust they raise. It animates at 10 frames a second, the
 * cadence of pixel sprites, and holds still for reduced motion.
 */
const W = 320;
const H = 180;
const ROAD_Y = 150;
const FPS = 10;

const INK = '#1b140d';
const INK_BACK = '#2c2016';
const FLAG = '#8e3a2c';
const DUST = 'rgba(205, 180, 136, 0.55)';

// Sky bands from the top down, dithered into each other.
const SKY = ['#2a1f14', '#3f2e1d', '#5a4128', '#7a5634', '#a0703f', '#c58c4b', '#dca560'];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// A soldier facing right: kepi, rifle sloped over the shoulder, two leg frames.
const BODY = [
  '.#..........',
  '..#.........',
  '...#.###....',
  '....#####...',
  '.....###....',
  '.....##.....',
  '....####....',
  '...######...',
  '...######...',
  '...#####....',
  '....####....',
  '....####....',
];
const LEGS = [
  ['....#..#....', '...#....#...', '...#....#...', '..##....##..'],
  ['....####....', '.....##.....', '.....##.....', '.....###....'],
];

function drawSprite(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, color: string) {
  ctx.fillStyle = color;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i += 1) {
      if (row[i] === '#') ctx.fillRect(x + i, y + j, 1, 1);
    }
  });
}

function hills(seed: number, base: number, amplitude: number, width: number): number[] {
  const heights: number[] = [];
  for (let x = 0; x < width; x += 1) {
    const t = (x / width) * Math.PI * 2;
    heights.push(
      Math.round(
        base -
          amplitude * (0.55 * Math.sin(t * 2 + seed) + 0.3 * Math.sin(t * 5 + seed * 2) + 0.15 * Math.sin(t * 11 + seed * 3)),
      ),
    );
  }
  return heights;
}

const FAR = hills(1.3, 112, 14, W * 2);
const NEAR = hills(4.1, 130, 9, W * 2);

function drawSky(ctx: CanvasRenderingContext2D) {
  const image = ctx.createImageData(W, ROAD_Y);
  const rgb = SKY.map((hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)));
  for (let y = 0; y < ROAD_Y; y += 1) {
    const level = (y / ROAD_Y) * (SKY.length - 1);
    for (let x = 0; x < W; x += 1) {
      const threshold = (BAYER[(y % 4) * 4 + (x % 4)]! + 0.5) / 16;
      const band = Math.min(SKY.length - 1, Math.floor(level) + (level % 1 > threshold ? 1 : 0));
      const color = rgb[band]!;
      const index = (y * W + x) * 4;
      image.data[index] = color[0]!;
      image.data[index + 1] = color[1]!;
      image.data[index + 2] = color[2]!;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  // A low sun behind the hills.
  ctx.fillStyle = '#f0c97a';
  for (let y = -12; y <= 12; y += 1) {
    const half = Math.floor(Math.sqrt(144 - y * y));
    ctx.fillRect(232 - half, 100 + y, half * 2, 1);
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, sky: HTMLCanvasElement, tick: number) {
  ctx.drawImage(sky, 0, 0);

  // Hills scroll slowly backwards: the column advances against the land.
  const farShift = Math.floor(tick * 0.25) % (W * 2);
  const nearShift = Math.floor(tick * 0.6) % (W * 2);
  ctx.fillStyle = '#4a3522';
  for (let x = 0; x < W; x += 1) {
    const top = FAR[(x + farShift) % FAR.length]!;
    ctx.fillRect(x, top, 1, ROAD_Y - top);
  }
  ctx.fillStyle = '#33251a';
  for (let x = 0; x < W; x += 1) {
    const top = NEAR[(x + nearShift) % NEAR.length]!;
    ctx.fillRect(x, top, 1, ROAD_Y - top);
  }

  // Road and verge.
  ctx.fillStyle = '#5c4630';
  ctx.fillRect(0, ROAD_Y - 6, W, 8);
  ctx.fillStyle = '#7a5f40';
  for (let x = 0; x < W; x += 1) {
    if ((x + Math.floor(tick * 1.2)) % 9 === 0) ctx.fillRect(x, ROAD_Y - 3, 3, 1);
  }
  ctx.fillStyle = '#241a11';
  ctx.fillRect(0, ROAD_Y + 2, W, H - ROAD_Y - 2);
  ctx.fillStyle = '#3a2b1b';
  for (let x = 0; x < W; x += 5) {
    const h = 1 + ((x * 7 + 3) % 3);
    ctx.fillRect(x, ROAD_Y + 2, 1, h);
  }

  // The column: two ranks, soldiers 22 px apart, marching right and wrapping.
  const spacing = 22;
  const count = Math.ceil((W + 60) / spacing);
  const advance = tick * 1.5;
  for (const rank of [0, 1]) {
    for (let i = 0; i < count; i += 1) {
      const raw = i * spacing + advance + rank * 11;
      const x = Math.floor((raw % (W + 60)) - 40);
      const step = (i + Math.floor(tick / 2) + rank) % 2;
      const bob = step === 0 ? 0 : 1;
      const y = ROAD_Y - 18 - rank * 3 + bob;
      const color = rank === 0 ? INK_BACK : INK;
      drawSprite(ctx, BODY, x, y, color);
      drawSprite(ctx, LEGS[step]!, x, y + BODY.length, color);
      // Every seventh man of the front rank carries the flag.
      if (rank === 1 && i % 7 === 3) {
        ctx.fillStyle = INK;
        ctx.fillRect(x + 9, y - 12, 1, 16);
        ctx.fillStyle = FLAG;
        const wave = (tick + i) % 4 < 2 ? 0 : 1;
        for (let row = 0; row < 6; row += 1) {
          ctx.fillRect(x + 10, y - 12 + row + (row > 2 ? wave : 0), 8 - (row % 2), 1);
        }
      }
      // Dust kicked up behind the boots.
      if (rank === 1 && step === 0) {
        ctx.fillStyle = DUST;
        ctx.fillRect(x - 2, ROAD_Y - 2, 2, 1);
        ctx.fillRect(x - 4, ROAD_Y - 3, 1, 1);
      }
    }
  }
}

export function MarchingScene({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = W;
    canvas.height = H;
    const sky = document.createElement('canvas');
    sky.width = W;
    sky.height = ROAD_Y;
    const skyCtx = sky.getContext('2d');
    if (!skyCtx) return;
    drawSky(skyCtx);

    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let tick = 40;
    drawFrame(ctx, sky, tick);
    if (still) return;

    let handle = 0;
    let last = performance.now();
    const loop = (now: number) => {
      handle = requestAnimationFrame(loop);
      if (now - last < 1000 / FPS) return;
      last = now;
      tick += 1;
      drawFrame(ctx, sky, tick);
    };
    handle = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(handle);
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" data-testid="marching-scene" />;
}
