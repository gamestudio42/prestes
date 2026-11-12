import { useEffect, useRef } from 'react';
import { compassAngle } from '@prestes/view3d';

export interface CompassProps {
  /** The map's true north, degrees clockwise from the grid's top edge. */
  north: number;
  /** The camera's yaw and tilt in radians, read every frame; absent = seen from straight above, square to the grid. */
  view?: () => { yaw: number; tilt: number } | null | undefined;
  /** The north letter, from the locale catalog. */
  letter: string;
  /** The accessible name, from the locale catalog. */
  label: string;
  /** add-map-compass: turn the view until north is up; absent = not a button. */
  onClick?: () => void;
  className?: string;
  testId: string;
}

/**
 * add-map-compass: a small compass rose whose north mark points to the map's
 * true north on screen (along the way north runs on the tilted view). With a
 * `view` source it turns with the camera every
 * frame (the battle HUD); without one it shows the map's north on a north-up
 * view (the editor). The angle is written straight to the DOM, so the rose
 * turns without re-rendering React.
 */
export function Compass({ north, view, letter, label, onClick, className, testId }: CompassProps) {
  const roseRef = useRef<SVGGElement>(null);
  const hostRef = useRef<HTMLElement | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    let frame = 0;
    let shown = Number.NaN;
    const paint = (): void => {
      const camera = viewRef.current?.();
      const angle = camera ? compassAngle(north, camera.yaw, camera.tilt) : compassAngle(north, 0);
      if (Number.isNaN(shown) || Math.abs(angle - shown) > 0.05) {
        shown = angle;
        roseRef.current?.setAttribute('transform', `rotate(${angle.toFixed(2)} 24 24)`);
        hostRef.current?.setAttribute('data-angle', angle.toFixed(1));
      }
      if (viewRef.current) frame = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(frame);
  }, [north, view !== undefined]);

  const rose = (
    <svg viewBox="0 0 48 48" width="52" height="52" aria-hidden="true" focusable="false">
      <circle className="compass-ring" cx="24" cy="24" r="21" />
      <g ref={roseRef}>
        <path className="compass-tick" d="M37 24 L24 21.5 L24 26.5 Z M11 24 L24 21.5 L24 26.5 Z" />
        <path className="compass-south" d="M24 37 L28 24 L20 24 Z" />
        <path className="compass-north" d="M24 13 L28 24 L20 24 Z" />
        <text className="compass-letter" x="24" y="11.5" textAnchor="middle">
          {letter}
        </text>
      </g>
      <circle className="compass-hub" cx="24" cy="24" r="2" />
    </svg>
  );

  const classes = `compass${className ? ` ${className}` : ''}`;
  if (onClick) {
    return (
      <button
        type="button"
        ref={(node) => {
          hostRef.current = node;
        }}
        className={classes}
        data-testid={testId}
        aria-label={label}
        title={label}
        onClick={onClick}
      >
        {rose}
      </button>
    );
  }
  return (
    <div
      ref={(node) => {
        hostRef.current = node;
      }}
      className={classes}
      data-testid={testId}
      role="img"
      aria-label={label}
      title={label}
    >
      {rose}
    </div>
  );
}
