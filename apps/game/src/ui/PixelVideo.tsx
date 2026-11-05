import { useEffect, useRef, useState } from 'react';

/** 4 x 4 Bayer matrix for ordered dithering, centred on zero. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
/** Colour steps per channel after posterising: few enough to read as pixel art. */
const LEVELS = 6;
const STEP = 255 / (LEVELS - 1);
const FPS = 12;

export interface PixelVideoProps {
  src: string;
  /** Width of the low-resolution drawing in pixels; height follows the video. */
  width?: number;
  className?: string;
  /** Called when the video cannot play, so the caller can show a fallback. */
  onError?: () => void;
}

/**
 * A looping, muted video drawn as pixel art: each frame is scaled down to
 * `width` pixels, posterised to a few levels per channel with ordered
 * dithering and shown scaled up with nearest-neighbour sampling. It redraws
 * at 12 frames a second, the cadence of pixel sprites, and holds the first
 * frame for reduced motion.
 */
export function PixelVideo({ src, width = 320, className, onError }: PixelVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let raf = 0;
    let last = 0;

    const draw = () => {
      if (video.readyState < 2 || video.videoWidth === 0) return;
      const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.imageSmoothingEnabled = true;
      context.drawImage(video, 0, 0, width, height);
      const frame = context.getImageData(0, 0, width, height);
      const data = frame.data;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          const bias = BAYER[(y & 3) * 4 + (x & 3)]! * STEP;
          for (let c = 0; c < 3; c += 1) {
            const v = data[i + c]! + bias;
            data[i + c] = Math.max(0, Math.min(255, Math.round(v / STEP) * STEP));
          }
        }
      }
      context.putImageData(frame, 0, 0);
    };

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (time - last < 1000 / FPS) return;
      last = time;
      draw();
    };

    const start = () => {
      if (still) {
        video.pause();
        draw();
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };

    video.addEventListener('loadeddata', start);
    if (!still) {
      void video.play().catch(() => {
        // Autoplay can be refused; the first frame still draws once data arrives.
      });
    }
    if (video.readyState >= 2) start();

    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener('loadeddata', start);
    };
  }, [width]);

  const fail = () => {
    setFailed(true);
    onError?.();
  };

  if (failed) return null;

  return (
    <>
      <video
        ref={videoRef}
        className="pixel-video-source"
        src={src}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-hidden="true"
        onError={fail}
      />
      <canvas ref={canvasRef} className={className} data-testid="menu-video" aria-hidden="true" />
    </>
  );
}
