import type { CSSProperties, JSX } from 'react';
import sheetUrl from '../assets/icons.png';
import sheet from '../assets/icons.json';

/**
 * The original pixel icon set, exported from assets/icons/prestes-icons.aseprite
 * by `pnpm icons`. Each icon is a 16 x 16 slice of the sheet, drawn as an alpha
 * mask over the current text colour so it follows its control's state, and
 * scaled only by whole numbers.
 */
interface SliceBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SLICES = new Map<string, SliceBounds>(
  sheet.meta.slices.map((slice) => [slice.name, slice.keys[0]!.bounds]),
);
const SHEET_W = sheet.meta.size.w;
const SHEET_H = sheet.meta.size.h;

export function iconSliceNames(): string[] {
  return [...SLICES.keys()];
}

export interface PixelIconProps {
  /** Requested size in CSS pixels; drawn at 16 px, or 32 px from 24 up. */
  size?: number;
  className?: string;
  title?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  /** Accepted for compatibility with line icons; pixel icons ignore it. */
  strokeWidth?: number;
}

export type PixelIconComponent = ((props: PixelIconProps) => JSX.Element) & { slice: string };

export function pixelIcon(slice: string): PixelIconComponent {
  const bounds = SLICES.get(slice);
  if (!bounds) {
    throw new Error(`unknown pixel icon slice: ${slice}`);
  }
  const Icon = ({ size = 16, className, title, 'aria-hidden': ariaHidden = true }: PixelIconProps) => {
    const scale = size >= 24 ? 2 : 1;
    const style: CSSProperties = {
      width: bounds.w * scale,
      height: bounds.h * scale,
      maskImage: `url(${sheetUrl})`,
      WebkitMaskImage: `url(${sheetUrl})`,
      maskSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
      WebkitMaskSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
      maskPosition: `-${bounds.x * scale}px -${bounds.y * scale}px`,
      WebkitMaskPosition: `-${bounds.x * scale}px -${bounds.y * scale}px`,
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
    };
    return (
      <span
        className={className ? `pixel-icon ${className}` : 'pixel-icon'}
        data-icon={slice}
        style={style}
        aria-hidden={title ? undefined : ariaHidden}
        role={title ? 'img' : undefined}
        aria-label={title}
      />
    );
  };
  Icon.slice = slice;
  return Icon as PixelIconComponent;
}

// Interface icons, named for what they show.
export const Eye = pixelIcon('ui-eye');
export const EyeOff = pixelIcon('ui-eye-off');
export const Crosshair = pixelIcon('order-attack');
export const CoverIcon = pixelIcon('status-cover');
export const ChevronDown = pixelIcon('ui-chevron-down');
export const ChevronUp = pixelIcon('ui-chevron-up');
export const ChevronRight = pixelIcon('ui-chevron-right');
export const Close = pixelIcon('ui-close');
export const Soldier = pixelIcon('status-soldier');
export const Troop = pixelIcon('status-troop');
export const Camera = pixelIcon('ui-camera');
export const PostEffect = pixelIcon('ui-post');
export const Languages = pixelIcon('ui-language');
export const Pause = pixelIcon('ui-pause');
export const Play = pixelIcon('ui-play');
export const Step = pixelIcon('ui-step');
export const Restart = pixelIcon('ui-restart');
export const Health = pixelIcon('status-health');
export const Cohesion = pixelIcon('status-cohesion');
export const Suppression = pixelIcon('status-suppression');
export const More = pixelIcon('ui-more');
export const Settings = pixelIcon('ui-settings');
export const Crate = pixelIcon('status-crate');
export const Lab = pixelIcon('ui-lab');
export const Book = pixelIcon('ui-codex');
export const SoundOn = pixelIcon('ui-sound-on');
export const SoundOff = pixelIcon('ui-sound-off');
export const Check = pixelIcon('ui-check');
export const Target = pixelIcon('status-target');
export const Rifle = pixelIcon('status-rifle');
export const Helmet = pixelIcon('unit-helmet');
export const Minimize = pixelIcon('ui-minimize');
export const Restore = pixelIcon('ui-restore');
export const Grip = pixelIcon('ui-grip');
